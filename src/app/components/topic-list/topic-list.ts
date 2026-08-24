import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { NgxJdenticonModule } from 'ngx-jdenticon';

import { TopicService } from '../../shared/services/topic';

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

    readonly updatedTopics = computed(() => this.topicService.topicsWithUpdates() );

    constructor() {
        this.topicService.topics.reload()
    }

}
