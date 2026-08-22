import {
    Component,
    input,
    output,
    inject,
    signal,
    effect,
    computed,
    debounced,
    ViewChild,
    ElementRef,
    model,
} from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { switchMap, from } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';

import { NgxJdenticonModule } from 'ngx-jdenticon';

import { ImageReply } from '../../shared/models/topic-reply.model';
import { ImageView } from '../image-view/image-view';
import { TopicReply } from '../../shared/models/topic-reply.model';
import { ReplyComment, NewReplyComment } from '../../shared/models/reply-comment.model';
import { getUtc } from '../../shared/utils';
import { SessionService } from '../../shared/services/session';
import { TopicService } from '../../shared/services/topic';
import { QCErrorStateMatcher, safeImagePipe } from '../../shared/utils';
import { AppErrorService } from '../../shared/services/app-error/app-error.service';


@Component({
  selector: 'app-topic-reply-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatInputModule,
    NgxJdenticonModule,
    safeImagePipe
  ],
  templateUrl: './topic-reply-list.html',
  styleUrl: './topic-reply-list.scss',
})
export class TopicReplyList {

    private readonly dialog          = inject(MatDialog);
    private readonly sessionService  = inject(SessionService);
    private readonly topicService    = inject(TopicService);
    private readonly appErrorService = inject(AppErrorService);


    @ViewChild('scrollContainer') scrollContainer!: ElementRef;

    readonly decryptedReplies = model.required<Array<TopicReply>>();
    readonly loadingReplies   = input.required<boolean>();
    readonly showIdenticon    = input<boolean>(true);
    readonly commentAction    = input<boolean>(false);

    readonly endOfScrollOut = output<Event>();

    readonly sessionId     = computed(() => this.sessionService.session().id );
    readonly addingComment = signal<string|null>(null)

    private readonly endOfScroll   = signal<Event|null>(null)
    private readonly debouncedEndOfScroll = debounced(() => this.endOfScroll(), 500);

    readonly matcher = new QCErrorStateMatcher();
    readonly commentForm!: FormGroup;


    constructor() {

        this.commentForm = new FormBuilder().group({
            comment: ['', [Validators.required ] ],
        });

        effect( () => {
            const scrollEvent = this.debouncedEndOfScroll.value();

            if (scrollEvent !== null ) {
                this.endOfScrollOut.emit(scrollEvent)
            }
        })

    }

    get cf(): FormGroup { return this.commentForm; }

    openViewImageDialog(
        imageReply: ImageReply,
        event: Event
    ): void {

        const imageDialogRef = this.dialog.open(ImageView, {
            data: { imageData: imageReply.data },
            width: '100%',
            maxWidth: '100%',
            height: '90%',
            panelClass: 'custom-image-dialog-panel'
        });

    }

    onDivScroll(
        event: any
    ) {

        const element = event.target;

        if ( (element.scrollTop > 0 )
          && (element.offsetHeight + element.scrollTop >= element.scrollHeight)
        ) {
            this.endOfScroll.set(event)
      }
    }

    addComment(
        replyId: string
    ) {
        this.addingComment.set(replyId)
    }

    editComment(
        reply: TopicReply
    ) {
        this.cf.get('comment')?.setValue(reply.comment?.decryptedData?.comment);
        this.addingComment.set(reply.id)
    }

    cancelComment() {
        this.addingComment.set(null)
    }

    submitComment(
        reply: TopicReply
    ) {

        if (this.cf.invalid) {
           return;
        }

        const formVals = this.cf.value;
        const newComment = new NewReplyComment({
                              topic_reply_id: this.addingComment() as string
                           });

        newComment.decryptedData = {
            comment: formVals.comment,
            updated: getUtc()
        }

        this.sessionService.isSessionLoaded()
            .pipe(
                switchMap( (loaded) => {

                    return from(this.topicService.createReplyComment(newComment))
                        .pipe( switchMap( (s) => { return s }))
                })
            )
            .subscribe({
                next: (commentResp) => {

                    this.cf.markAsUntouched();
                    this.cf.setErrors(null);
                    this.cf.reset();
                    this.cf.get('comment')?.setErrors(null);
                    this.addingComment.set(null);
                    reply.comment = new ReplyComment(commentResp.data);
                    reply.comment.decryptedData = {
                        comment: formVals.comment,
                        updated: getUtc()
                    }

                    this.decryptedReplies.update(replies =>
                        replies.map(curReply =>
                          curReply.id === reply.id ? reply : curReply
                        )
                    );

                },
                error: (error) => {
                    this.appErrorService.setApiError(error)
                }
            })

    }
}
