import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import {MatTabsModule, MatTabNavPanel} from '@angular/material/tabs';
import { TopicService } from '../../shared/services/topic';
import { Topic } from '../../shared/models/topic.model';

@Component({
  selector: 'app-side-nav',
  imports: [MatTabsModule, RouterLink, RouterLinkActive],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
})
export class SideNav {

    private readonly topicService = inject(TopicService)
    private readonly router       = inject(Router)

    readonly tabPanel = input.required<MatTabNavPanel>();
    readonly updatedTopics = computed(() => {
        return this.topicService.topicsWithUpdates().length
    });

}
