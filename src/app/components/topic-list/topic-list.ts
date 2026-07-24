import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';
import { TopicService } from '../../shared/services/topic';
import { NgxJdenticonModule } from 'ngx-jdenticon';

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

    public topicService = inject(TopicService);

    constructor() {

        this.topicService.topics.reload()
    }

}
