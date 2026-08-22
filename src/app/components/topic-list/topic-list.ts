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
        this.intervalId = setInterval(() => {
            this.checkTopicsUpdates()
        }, environment.topicPollInt * 1000 );
    }

    checkTopicsUpdates() {

        this.topicService.needsTopicsUpdate()
            .subscribe({
                next: (needsUpdate) => {
                    //console.log(needsUpdate)
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
