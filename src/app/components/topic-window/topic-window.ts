import {
    Component,
    input,
    effect,
    signal,
    inject,
    computed,
    DOCUMENT
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Clipboard } from '@angular/cdk/clipboard';

import { of } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

import { sprintf } from 'sprintf-js';

import { TopicService } from '../../shared/services/topic';
import { SessionService } from '../../shared/services/session';
import { Topic } from '../../shared/models/topic.model';
import { TopicReplyList } from '../topic-reply-list/topic-reply-list';
import { TopicReply } from '../../shared/models/topic-reply.model';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-topic-window',
  imports: [
      MatInputModule,
      MatIconModule,
      MatButtonModule,
      TopicReplyList
  ],
  templateUrl: './topic-window.html',
  styleUrl: './topic-window.scss',
})
export class TopicWindow {

    public topicService     = inject(TopicService);
    public sessionService   = inject(SessionService);
    public clipBoardService = inject(Clipboard);
    public document         = inject(DOCUMENT);

    public topicUuid = input.required<string>();

    public sessionId        = computed(() => this.sessionService.session().id );
    public topic            = signal<Topic|null>(null);
    public replyUrl         = signal<string|null>(null);
    public decryptedReplies = signal<Array<TopicReply>>([]);
    public loadingReplies   = signal<boolean>(false)

    private replyLimit      = signal<number>(5);
    private replyLastId     = signal<string|null>(null);
    private replyLastTs     = signal<string|null>(null);

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
                    this.decryptedReplies.set([])
                    this.replyLimit.set(5)
                    this.replyLastId.set(null)
                    this.replyLastTs.set(null)
                }

                this.topic.set(topic)
                this.replyUrl.set(sprintf('%sreply/%s(select-list:reply-list)', this.urlBase, topic.id))
            }
        })

        effect( () => {

            const topicReplies = this.topicResource.value()?.data.replies as Array<TopicReply>;

            if ( topicReplies !== undefined && this.loadingReplies() ) {

                if ( topicReplies.length < this.replyLimit() ) {
                    this.loadingReplies.set(false)
                }

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

}
