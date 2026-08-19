import { Component, inject, computed, effect } from '@angular/core';
import { AppErrorService } from './app-error.service';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';


@Component({
  selector: 'app-app-error',
  imports: [],
  templateUrl: './app-error.html',
  styleUrl: './app-error.scss',
})
export class AppError {

    public appErrorService = inject(AppErrorService);
    public dialog          = inject(MatDialog);

    public appError = computed(() => this.appErrorService.appError() );

    constructor() {

        effect( () => {

            const error = this.appError();

            if ( error ) {
                console.log('Got Error', error)
                this.dialog.open(AppErrorDialog);
            }
        })

    }

}

@Component({
  selector: 'app-app-error-dialog',
  templateUrl: 'app-app-error-dialog.html',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
})
export class AppErrorDialog {}