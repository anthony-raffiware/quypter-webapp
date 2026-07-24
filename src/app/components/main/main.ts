import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNav } from '../side-nav/side-nav';
import {MatTabsModule} from '@angular/material/tabs';
import { ApiService } from '../../shared/services/api';
import { SessionService } from '../../shared/services/session';

@Component({
  selector: 'app-main',
  imports: [RouterOutlet, SideNav, MatTabsModule],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main {

    private apiService = inject(ApiService);
    private sessionService = inject(SessionService);

}
