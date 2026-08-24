import {
    Component,
    input,
    effect,
    signal,
    inject,
    computed,
    DOCUMENT
} from '@angular/core';
import { HttpErrorResponse, } from '@angular/common/http';

import { rxResource } from '@angular/core/rxjs-interop';
import { Clipboard } from '@angular/cdk/clipboard';

import { of, catchError, tap,  Observable, throwError } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { sprintf } from 'sprintf-js';

import { TopicService } from '../../shared/services/topic';
import { SessionService } from '../../shared/services/session';
import { Topic } from '../../shared/models/topic.model';
import { TopicReplyList } from '../topic-reply-list/topic-reply-list';
import { TopicReply } from '../../shared/models/topic-reply.model';
import { environment } from '../../../environments/environment';
import { AppErrorService } from '../../shared/services/app-error/app-error.service';


@Component({
  selector: 'app-topic-window',
  imports: [
      MatInputModule,
      MatIconModule,
      MatButtonModule,
      TopicReplyList,
      MatTooltipModule
  ],
  templateUrl: './topic-window.html',
  styleUrl: './topic-window.scss',
})
export class TopicWindow {

    private readonly topicService     = inject(TopicService);
    private readonly sessionService   = inject(SessionService);
    private readonly clipBoardService = inject(Clipboard);
    private readonly document         = inject(DOCUMENT);
    private readonly appErrorService  = inject(AppErrorService);

    readonly topicUuid = input.required<string>();

    readonly topicListPos     = signal<number|null>(null)
    readonly topic            = signal<Topic|null>(null);
    readonly replyUrl         = signal<string|null>(null);
    readonly decryptedReplies = signal<Array<TopicReply>>([]);
    readonly loadingReplies   = signal<boolean>(false)

    private readonly replyLimit  = signal<number>(5);
    private readonly replyLastId = signal<string|null>(null);
    private readonly replyLastTs = signal<string|null>(null);

    readonly sessionId     = computed(() => this.sessionService.session().id );
    readonly updatedTopics = computed(() => this.topicService.topicsWithUpdates() );
    readonly hasNewReplies = computed(() => {

        const topicId = this.topic()?.id as string

        if (!topicId) {
            return false
        }

        return this.topicService.topicsWithUpdates().includes(topicId)
    });

    private urlBase!: string;
    private urlCopied: boolean = false;

    topicResource = rxResource({
        params: () => ({
            sessionId: this.sessionId() as string,
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

            return this.topicService.fetchTopicWithRecvReplies(
                   params.sessionId,
                   params.topicId,
                   options
                )
                .pipe(
                    catchError( (error: HttpErrorResponse): Observable<any> => {

                        this.appErrorService.setApiError(error)
                        this.loadingReplies.set(false)

                        return throwError( () => error )

                    }),
                    tap ( () => {
                        this.loadingReplies.set(false)
                    })
                )

        }
    });


    constructor() {

        const proto = this.document.location.protocol;
        const host  = this.document.location.host;
        const base  = environment.base;

        this.urlBase = sprintf('%s//%s%s', proto, host, base)

        effect( () => {

            const topic = this.topicService.topicMap()[this.topicUuid()]

            if ( topic !== undefined ) {

                if ( this.topic() && ( this.topicUuid() != this.topic()?.id ) ) {

                    this.clearCursorResults()
                }

                this.topic.set(topic)
                this.replyUrl.set(sprintf('%sreply/%s(select-list:reply-list)', this.urlBase, topic.id))
            }
        })

        effect( () => {

            const topicReplies = this.topicResource.value()?.data.replies as Array<TopicReply>;

            if ( topicReplies !== undefined ) {

                const promises = topicReplies.map( async (topicReply) => {
                    return this.topicService.decryptRecvTopicReply(topicReply)
                })

                Promise.all(promises as Promise<TopicReply>[] ).then((decrypted) => {

                    this.decryptedReplies.update( results => {
                       return [...results, ...decrypted];
                    })
                })
            }

        })


        effect( () => {

            if ( this.topic() == null ) {
                return
            }

            if ( this.topicListPos() == 0 ) {

                if ( this.hasNewReplies() ) {

                    const topicId = this.topic()?.id as string

                    this.clearCursorResults()
                    this.topicResource.reload()
                    this.topicService.updateTopicLastLoaded(topicId)
                }

            }
        })

    }


    handleEndOfScroll(
        event: Event
    ): void {

        const last = this.decryptedReplies().at(-1);

        if ( last !== undefined ) {
            this.replyLimit.set(3)
            this.replyLastId.set(last.id)
            this.replyLastTs.set(last.created_ts)
        }
    }


    handleTopOfScroll(
        event: Event
    ): void {

        if ( this.hasNewReplies() ) {

            this.clearCursorResults()
            this.topicResource.reload()
        }

    }


    copyText() {
        // sloppy debounce
        if (this.urlCopied) {
            return
        }

        const replyUrl = this.replyUrl();

        if (replyUrl) {
            const result = this.clipBoardService.copy(replyUrl);

            if (result) {
                this.urlCopied = true;
                setTimeout(() => this.urlCopied = false, 2000);
            }

        }
    }


    private clearCursorResults() {
        this.decryptedReplies.set([])
        this.replyLimit.set(5)
        this.replyLastId.set(null)
        this.replyLastTs.set(null)
    }

}
