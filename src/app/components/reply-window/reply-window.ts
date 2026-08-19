import { Component, input, effect, signal, inject, computed, model } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatDialog } from '@angular/material/dialog';

import { toSignal, toObservable, rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { filter, first, switchMap, forkJoin, of, from } from 'rxjs';
import { TopicService } from '../../shared/services/topic';
import { SessionService } from '../../shared/services/session';
import { Topic, TopicWithReplies } from '../../shared/models/topic.model';
import { TopicReply, NewTopicReply } from '../../shared/models/topic-reply.model';
import { QCErrorStateMatcher } from '../../shared/utils';
import { TopicReplyData, ImageReply } from '../../shared/models/topic-reply.model';
import { AddReplyImage } from '../add-reply-image/add-reply-image';
import { ImageView } from '../image-view/image-view';
import { TopicReplyList } from '../topic-reply-list/topic-reply-list';
import { AppErrorService } from '../../shared/services/app-error/app-error.service';

export type TopicReplies = Array<TopicReplyData>


@Component({
  selector: 'app-reply-window',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatCardModule,
    TopicReplyList
  ],
  templateUrl: './reply-window.html',
  styleUrl: './reply-window.scss',
})
export class ReplyWindow {

    public sessionService  = inject(SessionService);
    public topicService    = inject(TopicService);
    public topicUuid       = input.required<string>();
    public dialog          = inject(MatDialog);
    public appErrorService = inject(AppErrorService);

    public sessionId        = computed(() => this.sessionService.session().id );
    public topic            = signal<TopicWithReplies|null>(null);
    public decryptedReplies = signal<Array<TopicReply>>([]);
    public loadingReplies   = signal<boolean>(false)

    public imageData = signal<string>('');
    public imageType = model<string>();


    messageReplyForm!: FormGroup;
    matcher = new QCErrorStateMatcher();

    private replyLimit  = signal<number>(5);
    private replyLastId = signal<string|null>(null);
    private replyLastTs = signal<string|null>(null);

    topicResource = rxResource({
        params: () => ({
            sessionId: this.sessionId(),
            topicId: this.topicUuid(),
            replyLimit: this.replyLimit(),
            replyLastId: this.replyLastId(),
            replyLastTs: this.replyLastTs()
        }),
        stream: ({ params }) => {

            if (!params.sessionId) {
                return of(undefined);
            }

            this.loadingReplies.set(true)

            const hasCursor = params.replyLastId && params.replyLastTs;

            const options = {
                params: {
                    limit: params.replyLimit,
                    ...(hasCursor && {
                    key_id: params.replyLastId as string,
                    key_ts: params.replyLastTs as string
                    })
                }
            }

            return this.topicService.fetchTopicWithSentReplies(
                params.sessionId,
                params.topicId,
                options
            )
        }
    });

    get mrf(): FormGroup { return this.messageReplyForm; }


    constructor(
        private route: ActivatedRoute,
        private router: Router
    ) {

        this.messageReplyForm = new FormBuilder().group({
            messageData: ['', [Validators.required]],
        });

        effect( () => {

            const topic = this.topic();

            if ( this.topic() && ( this.topicUuid() != this.topic()?.id ) ) {
                this.decryptedReplies.set([])
                this.replyLimit.set(5)
                this.replyLastId.set(null)
                this.replyLastTs.set(null)
            }
        })

        effect( () => {

            const topicReplies = this.topicResource.value();

            if ( topicReplies !== undefined ) {

                this.topic.set(topicReplies.data as TopicWithReplies)

                const replies = this.topic()?.replies as Array<TopicReply>

                if (  replies.length < this.replyLimit() ) {
                    this.loadingReplies.set(false)
                }

                const promises = this.topic()?.replies.map( async (topicReply) => {
                    return this.topicService.decryptSentTopicReply(topicReply)
                })

                Promise.all(promises as Promise<TopicReply>[] ).then((decrypted) => {

                    this.decryptedReplies.update( results => {
                       return [...results, ...decrypted];
                    })
                })
            }
        })

    }

    handleEndOfScroll(event: Event ): void {

        const last = this.decryptedReplies().at(-1);

        if ( last !== undefined ) {
            this.replyLimit.set(3)
            this.replyLastId.set(last.id)
            this.replyLastTs.set(last.created_ts)
        }

    }

    openAddImageDialog(event: Event ): void {

        event.preventDefault();

        const dialogRef = this.dialog.open(AddReplyImage, {
          data: { imageData: this.imageData(), imageType: this.imageType() },
        });

        dialogRef.afterClosed().subscribe(result => {

            if (result !== undefined) {
                this.addReplyImage(result)
            }
        });
    }

    openViewImageDialog( imageReply: ImageReply, event: Event): void {

        const imageDialogRef = this.dialog.open(ImageView, {
            data: { imageData: imageReply.data },
            width: '100%',
            maxWidth: '100%'
        });

    }

    onMessageSubmit() {

        if (this.mrf.invalid || this.topic() === null ) {
            return;
        }

        const formVals = this.mrf.value;
        const topic: Topic = this.topic() as Topic;
        const replyData: TopicReplyData = {
            type: 'text',
            data: {
              message: formVals.messageData
            }
        }

        this.addTopicReply(replyData);
    }

    addReplyImage( replyImage: ImageReply ) {

        const replyData: TopicReplyData = {
            type: 'image',
            data: replyImage
        }

        this.addTopicReply(replyData);
    }

    addTopicReply(replyData: TopicReplyData) {

        const newTopicReply = new NewTopicReply();
        newTopicReply.data = replyData;

        console.log('reply', this.sessionService.sessionLoaded$.value)

        this.sessionService.isSessionLoaded()
            .pipe(
                switchMap( (loaded) => {

                    const topic = this.topic() as Topic;

                    newTopicReply.session_key_id = this.sessionService.sessionKeyId as string

                    return from(this.topicService.createTopicReply(topic, newTopicReply))
                        .pipe( switchMap( (s) => { return s }))
                })
            )
            .subscribe({
                next: (replyResp) => {

                    this.mrf.markAsUntouched();
                    this.mrf.setErrors(null);
                    this.mrf.reset()
                    this.mrf.get('messageData')?.setErrors(null);
                    this.decryptedReplies.set([])
                    this.replyLastId.set(null)
                    this.replyLastTs.set(null)
                    this.topicResource.reload()
                },
                error: (error) => {
                    this.appErrorService.setApiError(error)
                }
            })

    }

}
