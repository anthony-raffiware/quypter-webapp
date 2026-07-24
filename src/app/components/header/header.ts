import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatDividerModule} from '@angular/material/divider';
import {MatButtonModule} from '@angular/material/button';
import { NgxJdenticonModule } from 'ngx-jdenticon';
import { SessionService } from '../../shared/services/session';


@Component({
  selector: 'app-header',
  imports: [
    RouterLink,  
    MatButtonModule, 
    MatDividerModule, 
    MatIconModule,
    NgxJdenticonModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {

    public sessionService = inject(SessionService);

    public sessionId = computed(() => this.sessionService.session().id );
    public sessionKeyId = computed(() => this.sessionService.session().key_id );

}
