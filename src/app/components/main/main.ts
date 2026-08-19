import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {MatTabsModule} from '@angular/material/tabs';

import { SideNav } from '../side-nav/side-nav';
import { AppError } from '../../shared/services/app-error/app-error';

@Component({
  selector: 'app-main',
  imports: [RouterOutlet, SideNav, MatTabsModule, AppError],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main {}
