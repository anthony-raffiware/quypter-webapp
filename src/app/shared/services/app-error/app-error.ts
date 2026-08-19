import { Component, inject, computed, effect, signal } from '@angular/core';
import { AppErrorService, QCAppError } from './app-error.service';
import { MatButtonModule } from '@angular/material/button';
import {
    MatDialog,
    MatDialogRef,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MAT_DIALOG_DATA,
} from '@angular/material/dialog';

export interface DialogData {
  error: QCAppError;
}

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
                this.dialog.open(AppErrorDialog, {
                    data: {error: error},
                });
            }
        })

    }

}

@Component({
  selector: 'app-app-error-dialog',
  templateUrl: 'app-app-error-dialog.html',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
  ],
})
export class AppErrorDialog {

  readonly dialogRef = inject(MatDialogRef<AppErrorDialog>);
  readonly data      = inject<DialogData>(MAT_DIALOG_DATA);
  readonly error     = signal(this.data.error);


}