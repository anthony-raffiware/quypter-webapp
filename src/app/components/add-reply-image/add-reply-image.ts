import {
    Component,
    ViewChild,
    inject,
    model,
    signal,
    Signal,
    computed ,
} from '@angular/core';
import { ElementRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { ImageReply } from '../../shared/models/topic-reply.model';
import { byteDisplayPipe } from '../../shared/utils';


export interface DialogData {
    imageData: string;
    imageType: string;
}


@Component({
    selector: 'app-add-reply-image',
    imports: [
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        MatButtonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        MatIconModule,
        MatButtonToggleModule,
        byteDisplayPipe
    ],
    templateUrl: './add-reply-image.html',
    styleUrl: './add-reply-image.scss',
})
export class AddReplyImage {

    @ViewChild('canvasContainer') canvas!: ElementRef<HTMLCanvasElement>;

    readonly dialogRef    = inject(MatDialogRef<AddReplyImage>);
    readonly data         = inject<DialogData>(MAT_DIALOG_DATA);
    readonly domSanitizer = inject(DomSanitizer);

    readonly imageData    = signal<string>('');
    readonly thumbData    = signal<string>('');
    readonly imageType    = signal<string>('');
    readonly imageName    = signal<string>('');
    readonly imageSize    = signal<number>(0);
    readonly imageCaption = model<string|undefined>(undefined);


    public loadingImage  = signal<boolean>(false)
    public imageError    = signal<string>('')
    public safeImageData = computed(() =>
        this.domSanitizer.bypassSecurityTrustResourceUrl(this.thumbData())
    );
    public returnData: Signal<ImageReply> = computed(() => {
        return {
            "name":    this.imageName(),
            "type":    this.imageType(),
            "data":    this.imageData(),
            "thumb":   this.thumbData(),
            "size":    this.imageSize(),
            "caption": this.imageCaption()
        };
    });


    onNoClick(): void {
        this.dialogRef.close();
    }


    onClick(
        fileUpload: HTMLInputElement
    ): void {
        this.loadingImage.set(true)

        fileUpload.click()
    }


    onClearImage(): void {
        this.imageData.set('');
        this.thumbData.set('');
        this.imageName.set('');
        this.imageType.set('');
        this.imageSize.set(9);
    }


    onFileSelected(
        $event: Event
    ) {

        const target = $event.target as HTMLInputElement;

        const files:FileList|null = target.files;

        if (files) {

            this.imageError.set('')

            const file = files[0];

            if ( file.size > 5000000 ) {

                this.imageError.set('Image To Large')
                this.loadingImage.set(false)

                return
            }

            if ( !file.type.startsWith('image/') ) {

                this.imageError.set('Invalid Image')
                this.loadingImage.set(false)

                return
            }

            const reader = new FileReader();
            const comp   = this;

            reader.onload = function(e) {

              if ( e.target === null ) {
                 return
              }

              const imageData = reader.result as string;

              comp.createThumbnail(imageData, file.type)
                   .then((thumbData) => {

                        comp.imageData.set(imageData);
                        comp.thumbData.set(thumbData as string);
                        comp.imageName.set(file.name);
                        comp.imageType.set(file.type);
                        comp.imageSize.set(file.size);

                        URL.revokeObjectURL(imageData);
                   });

            };

            reader.onerror = function() {
              console.error('Error reading file');
            };

            reader.readAsDataURL(file)

        }

        this.loadingImage.set(false)

    }


    createThumbnail(
        urlData: string,
        fileType: string,
        maxHeight: number = 250,
        maxWidth: number = 350
    ) {

        return new Promise((resolve, reject) => {

            const canvas = this.canvas.nativeElement;
            const ctx    = canvas.getContext('2d');
            const img    = new Image();

            img.onload = () => {

                let width = img.width;
                let height = img.height;

                if (width > height) {

                    if (width > maxWidth) {
                        height = Math.round(height * maxWidth / width);
                        width  = maxWidth;
                    }
                } else {

                    if (height > maxHeight) {
                        width  = Math.round(width * maxHeight / height);
                        height = maxHeight;
                    }
                }

                canvas.width  = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL(fileType, 0.7));
            }

            img.src = urlData;
        })
    }


    onFileSelectCancel(
        $event: Event
    ) {
        this.loadingImage.set(false)
    }


    disableSendButton() {
        return (!this.imageData() || this.loadingImage() || !!this.imageError())
    }
}
