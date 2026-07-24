import { 
    Component, 
    ViewChild, 
    inject, 
    model, 
    signal, 
    Signal,
    computed ,
    Pipe, 
    PipeTransform
} from '@angular/core';
//import { NgBytesPipeModule } from 'angular-pipes';

import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
//import { NgBytesPipe } from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { ElementRef } from '@angular/core';
import { DomSanitizer, SafeValue } from '@angular/platform-browser';
import { ImageReply } from '../../shared/models/topic-reply.model';
import { ImageView } from '../image-view/image-view';

export interface DialogData {
  imageData: string;
  imageType: string;
}

//export type ImageReplyData = {
//    "name": string, 
//    "type": string, 
//    "data": string, 
//    "thumb":string,
//    "size": number 
//}

@Pipe({ name: 'bytesDisplay' })
export class byteDisplayPipe implements PipeTransform {
  transform(bytes: number): string {
    if (isNaN(bytes) || bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  }
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

    readonly dialogRef      = inject(MatDialogRef<AddReplyImage>);

    readonly data         = inject<DialogData>(MAT_DIALOG_DATA);
    readonly domSanitizer = inject(DomSanitizer);

    readonly imageData    = signal<string>('');
    readonly thumbData    = signal<string>('');
    readonly imageType    = signal<string>('');
    readonly imageName    = signal<string>('');
    readonly imageSize    = signal<number>(0);
    readonly imageCaption = model<string|null>(null);


    public loadingImage = signal<boolean>(false)
    public imageError   = signal<string>('')

    public safeImageData = computed(() => 
        this.domSanitizer.bypassSecurityTrustResourceUrl(this.thumbData())
    );

    public returnData: Signal<ImageReply> = computed(() => { 
        return { 
            "name": this.imageName(), 
            "type": this.imageType(), 
            "data": this.imageData(), 
            "thumb": this.thumbData(),
            "size": this.imageSize(),
            "caption": this.imageCaption()
        } as ImageReply 
    });

    constructor(
    ) {

       console.log('constructor', this.data )
    }

    // ngAfterViewInit() {
    //   // Access the native DOM element
    //     console.log(this.fileUploadRef?.nativeElement.value);
    //  
    //     this.fileUploadRef?.nativeElement.addEventListener('cancel', () => {
    //         console.log('User canceled the file selection or re-selected the same file.');
    //         this.loadingImage.set(false)
    //     });
    // }

    // ngOnInit(): void {
    //     console.log('ff', this.data); 
    // }

    onNoClick(): void {
      this.dialogRef.close();
    }

    onClick(fileUpload: HTMLInputElement): void {
       this.loadingImage.set(true)
       //console.log(this.loadingImage())
       fileUpload.click() 

    }

    onClearImage(): void {
        this.imageData.set('');
        this.thumbData.set('');
        this.imageName.set('');
        this.imageType.set('');
        this.imageSize.set(9);

    }

    onFileSelected($event: Event) {
        //console.log('select', $event)

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
              // e.target.result is the ArrayBuffer
              if ( e.target === null ) {
                 return
              }

              //comp.imageData.set( reader.result as string );
              const imageData = reader.result as string;

              comp.createThumbnail(imageData, file.type)
                   .then((thumbData) => {  
                        //console.log(thumbData)
                        // "data:image/png;base64,
                        comp.imageData.set(imageData);
                        comp.thumbData.set(thumbData as string);
                        comp.imageName.set(file.name);
                        comp.imageType.set(file.type);
                        comp.imageSize.set(file.size);

                        URL.revokeObjectURL(imageData); 
                   });

              //  const arrayBuffer = e.target.result as ArrayBuffer;
              
              //  // Convert to Uint8Array for easy byte access
              //  const byteArray = new Uint8Array(arrayBuffer);
              
              //  console.log('Binary data (bytes):', byteArray);
              //console.log('Hex string:', Array.from(byteArray).map(b => b.toString(16).padStart(2, '0')).join(' '));
            };

            reader.onerror = function() {
              console.error('Error reading file');
            };

            // Read the file as binary data
            //reader.readAsArrayBuffer(file);
            reader.readAsDataURL(file)

            //this.fileName = file.name;
        }

        this.loadingImage.set(false)
        ///console.log(this.loadingImage())

    }

    createThumbnail( 
        urlData: string, 
        fileType: string,
        maxHeight: number = 250, 
        maxWidth: number = 350
    ) {
        return new Promise((resolve, reject) => {

            const canvas = this.canvas.nativeElement;
            const ctx = canvas.getContext('2d');
            //const canvas = this.canvasRef.nativeElement;
            const img = new Image();

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * maxHeight / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL(fileType, 0.7));
            }

            img.src = urlData;
        })
    }

    onFileSelectCancel($event: Event) {
        this.loadingImage.set(false)
        //console.log(this.loadingImage())
    }
}
