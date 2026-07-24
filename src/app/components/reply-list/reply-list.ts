import { Component, inject, effect } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';

import { SessionService } from '../../shared/services/session';
import { TopicService } from '../../shared/services/topic';
import { NgxJdenticonModule } from 'ngx-jdenticon';


@Component({
  selector: 'app-reply-list',
  imports: [
    RouterLink, 
    RouterLinkActive, 
    MatIconModule, 
    MatListModule,
    NgxJdenticonModule
  ],
  templateUrl: './reply-list.html',
  styleUrl: './reply-list.scss',
})
export class ReplyList {

    private sessionService = inject(SessionService);
    public topicService = inject(TopicService);

    constructor() {

        this.topicService.replies.reload()
    }

}
