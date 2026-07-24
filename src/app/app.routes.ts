import { Routes } from '@angular/router';
import { Main } from './components/main/main';
import { TopicList } from './components/topic-list/topic-list';
import { ReplyList } from './components/reply-list/reply-list';
import { TopicWindow } from './components/topic-window/topic-window';
import { ReplyWindow } from './components/reply-window/reply-window';
import { NewTopicWindow } from './components/new-topic-window/new-topic-window';

export const routes: Routes = [
  {
    path: '',
    component: Main,
    title: 'Quick Crypt',
    children: [
      { path: '',  redirectTo: '/topic/new(select-list:topic-list)', pathMatch: 'full' },
      { path: 'topic/new', component: NewTopicWindow },
      { path: 'topic/:topicUuid', component: TopicWindow },
      { path: 'topic-list', outlet: 'select-list', component: TopicList },
      { path: 'reply/:topicUuid', 
        component: ReplyWindow 
      },
      { path: 'reply-list', outlet: 'select-list', component: ReplyList },
      { path: '**',  redirectTo: '/topic/new(select-list:topic-list)', pathMatch: 'full' },
    ]
  },

];
