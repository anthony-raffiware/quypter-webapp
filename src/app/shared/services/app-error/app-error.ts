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

    private readonly appErrorService = inject(AppErrorService);
    private readonly dialog          = inject(MatDialog);

    readonly appError = computed(() => this.appErrorService.appError() );

    constructor() {

        effect( () => {

            const error = this.appError();

            if ( error ) {

                const dialogRef = this.dialog.open(AppErrorDialog, {
                    data: {error: error},
                });

                dialogRef.afterClosed().subscribe(result => {
                    this.appErrorService.clearError()
                });
            }
        })

    }

}

@Component({
  selector: 'app-app-error-dialog',
  templateUrl: 'app-app-error-dialog.html',
  styleUrl: './app-error.scss',
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