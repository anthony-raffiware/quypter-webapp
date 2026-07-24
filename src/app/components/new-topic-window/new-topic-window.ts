import { Component, inject } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {ErrorStateMatcher} from '@angular/material/core';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import { from, switchMap } from 'rxjs';

import { NewTopic } from '../../shared/models/topic.model';
import { SessionService } from '../../shared/services/session';
import { TopicService } from '../../shared/services/topic';

export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    //console.log(control)
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}


@Component({
  selector: 'app-new-topic-window',
  imports: [
    FormsModule, 
    MatButtonModule, 
    MatFormFieldModule, 
    MatInputModule, 
    ReactiveFormsModule
  ],
  templateUrl: './new-topic-window.html',
  styleUrl: './new-topic-window.scss',
})
export class NewTopicWindow {

    topicForm!: FormGroup;
    //topicFormControl = new FormControl('', [Validators.required]);
    matcher = new MyErrorStateMatcher();

    private sessionService = inject(SessionService);
    private topicService = inject(TopicService);


    constructor(
        private router: Router,
        private route: ActivatedRoute
    ) {

        this.topicForm = new FormBuilder().group({
          subject: ['', [Validators.required ] ],
          description: ['', [Validators.required ] ],
        });

    }

    get tf(): FormGroup { return this.topicForm; }

    onSubmit() {

        if (this.tf.invalid) {
           return;
        }

        const formVals = this.tf.value;
        const newTopic = new NewTopic();

        newTopic.data = {
           title: formVals.subject,
           description: formVals.description
        }

        this.sessionService.isSessionLoaded()
            .pipe(
                switchMap( (loaded) => {
                    console.log(loaded)
                    newTopic.session_id = this.sessionService.sessionId as string

                    return from(this.topicService.createTopic(newTopic))  
                        .pipe( switchMap( (s) => { return s }))
                })
            )
            .subscribe({
                next: (topic_resp) => {
                    console.log(topic_resp) 
                    this.router.navigate([ '..', topic_resp.data.id  ], { relativeTo: this.route })
                },
                error: (error) => {
                    console.error('Topics Request failed', error.error);
                }
            })

    }

}
