import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {MatTabsModule} from '@angular/material/tabs';

import { SideNav } from '../side-nav/side-nav';
import { AppError } from '../../shared/services/app-error/app-error';
import { TopicService } from '../../shared/services/topic';
import { AppErrorService } from '../../shared/services/app-error/app-error.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-main',
  imports: [RouterOutlet, SideNav, MatTabsModule, AppError],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main {

    readonly topicService = inject(TopicService);

    private readonly appErrorService = inject(AppErrorService);

    private  intervalId: any;


    ngOnInit() {

        const pollSecs = this.getPollTimeMilSecs()

        this.intervalId = setInterval(this.topicPoll.bind(this), pollSecs);
    }

    private topicPoll() {

        const pollSecs = this.getPollTimeMilSecs()

        this.checkTopicsUpdates()
        clearInterval(this.intervalId);

        this.intervalId = setInterval(this.topicPoll.bind(this), pollSecs);

    }

    private getPollTimeMilSecs() {

        const base = environment.topicPollInt;

        // Thundering Herd mitigation.
        const min = 1;
        const max = base/3;
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
