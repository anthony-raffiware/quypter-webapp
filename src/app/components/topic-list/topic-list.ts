import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { NgxJdenticonModule } from 'ngx-jdenticon';

import { TopicService } from '../../shared/services/topic';
import { environment } from '../../../environments/environment';
import { AppErrorService } from '../../shared/services/app-error/app-error.service';
import { Topic } from '../../shared/models/topic.model';

@Component({
  selector: 'app-topic-list',
  imports: [
      RouterLink,
      RouterLinkActive,
      MatIconModule,
      MatListModule,
      NgxJdenticonModule
  ],
  templateUrl: './topic-list.html',
  styleUrl: './topic-list.scss',
})
export class TopicList {

    readonly topicService = inject(TopicService);
    private readonly appErrorService = inject(AppErrorService);

    private  intervalId: any;

    readonly updatedTopics = computed(() => this.topicService.topicsWithUpdates() );


    constructor() {
        this.topicService.topics.reload()
    }

    ngOnInit() {

        const pollSecs = this.getPollTimeMilSecs()

        this.intervalId =  setInterval(this.topicPoll.bind(this), pollSecs);
    }

    private topicPoll() {

        const pollSecs = this.getPollTimeMilSecs()

        this.checkTopicsUpdates()
        clearInterval(this.intervalId);

        this.intervalId = setInterval(this.topicPoll.bind(this), pollSecs);

    }

    private getPollTimeMilSecs() {

        const base = environment.topicPollInt;

        // Thundering Herd mitigation
        const min = 1;
        const max = base/5;
        const randomBuf = Math.floor(Math.random() * (max - min + 1)) + min;

        return (base + randomBuf) * 1000
    }

    private checkTopicsUpdates() {

        this.topicService.needsTopicsUpdate()
            .subscribe({
                next: (needsUpdate) => {

                    if (needsUpdate) {
                        this.topicService.topics.reload()
                    }
                },
                error: (error) => {
                    this.appErrorService.setApiError(error)
                }
            })
    }


    ngOnDestroy() {

        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
