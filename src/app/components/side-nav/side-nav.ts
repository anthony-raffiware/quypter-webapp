import { Component, Input, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {MatTabsModule, MatTabNavPanel} from '@angular/material/tabs';

@Component({
  selector: 'app-side-nav',
  imports: [MatTabsModule, RouterLink, RouterLinkActive],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
})
export class SideNav {
   tabPanel = input.required<MatTabNavPanel>();
   testPath = 'new'
   //@Input() tabPanel!: MatTabNavPanel;
}
