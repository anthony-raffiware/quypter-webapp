import {
    Component,
    inject,
    signal,
    computed ,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';

import {MatButtonModule} from '@angular/material/button';
import {
    MAT_DIALOG_DATA,
    MatDialogContent,
    MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface ImageDialogData {
  imageData: string;
}

@Component({
  selector: 'app-image-view',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogContent,
    MatIconModule,
    MatButtonToggleModule,
  ],
  templateUrl: './image-view.html',
  styleUrl: './image-view.scss',
})
export class ImageView {

    private readonly dialogRef    = inject(MatDialogRef<ImageView>);
    private readonly data         = inject<ImageDialogData>(MAT_DIALOG_DATA);
    private readonly domSanitizer = inject(DomSanitizer);

    readonly imageData    = signal<string>(this.data.imageData);

    public safeImageData = computed(() =>
        this.domSanitizer.bypassSecurityTrustResourceUrl(this.imageData())
    );

}
