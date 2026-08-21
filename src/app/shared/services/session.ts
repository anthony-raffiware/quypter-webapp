import { Service, inject, signal, Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { ApiService, QCApiResponse } from './api';
import { LocalStorageService } from './local-storage';
import { sprintf } from 'sprintf-js';
import {
    from,
    switchMap,
    pipe,
    Observable,
    BehaviorSubject,
    filter,
    first,
    catchError,
    throwError
} from 'rxjs';

import { NewSession, Session } from '../models/session.model';
import {
    createEd25519Keys,
    exportKeyEncoded,
    loadPrivateKey,
    signTokens,
    getUtc,
    genNonce
} from '../utils';
import { AppErrorService } from './app-error/app-error.service';


export type SessionData = {
  id?: string,
  key_id?: string,
  session_priv_key?: string,
  session_pub_key?:  string,
  created_ts?: string,
}


@Service()
export class SessionDataService {

    private readonly storageService  = inject(LocalStorageService);

    public loadLocalSessionData(): SessionData | undefined {

        return this.storageService.getSerializedData('session_data') as SessionData
    }


    public saveLocalSessionData(sessionData: SessionData): void {
        this.storageService.saveSerializedData('session_data', sessionData)
    }


    public clearLocalSessionData(): void {
        this.storageService.removeData('session_data')
    }
}

@Service()
export class SessionService {

    private readonly apiService      = inject(ApiService);
    //private readonly storageService  = inject(LocalStorageService);
    private readonly dataService     = inject(SessionDataService);
    private readonly appErrorService = inject(AppErrorService);

    private sessionData:  SessionData = {};

    readonly sessionLoaded$: BehaviorSubject<boolean> ;
    readonly session$: BehaviorSubject<SessionData>;
    readonly session: Signal<SessionData>;


    constructor() {

        this.sessionLoaded$ = new BehaviorSubject<boolean>(false);
        this.session$       = new BehaviorSubject<SessionData>({});

        this.session = toSignal(this.session$, {
            requireSync: true
        });

        this.loadOrCreateSession()
    }

    public loadOrCreateSession(): void {

        const sessionData: SessionData | undefined = this.loadLocalSessionData()

        if ( sessionData ) {

            this.checkSession( sessionData.id as string )
                .subscribe({
                    next: (response) => {

                        console.log('found session')

                        this.sessionData = sessionData;

                        this.sessionLoaded$.next(true);
                        this.session$.next(sessionData);
                    },
                    error: (error: HttpErrorResponse) => {
                        this.appErrorService.setApiError(error)
                    }
                })

            return
        }

        return this.createAndSetSession()
    }

    public isSessionLoaded() {
      // Don't emit until we have a true value.
       return this.sessionLoaded$.pipe( filter( loaded => loaded ), first() );
    }


    get sessionId() {
         return this.sessionData.id as string
    }

    get sessionKeyId() {
         return this.sessionData.key_id as string
    }

    get sessionPubKey(): string {
         return this.sessionData.session_pub_key as string
    }

    get sessionPrivKey(): string {
         return this.sessionData.session_priv_key as string
    }

    private createAndSetSession(): void {

        from( this.createSession() )
            .pipe(
                switchMap( (responseOb) => {
                   return responseOb
                })
            )
            .subscribe({
                next:  (response) => {
                    this.sessionData.id = response.data.id
                    this.sessionData.key_id = response.data.key_id
                    this.sessionData.created_ts = response.data.key_id

                    this.sessionLoaded$.next(true);
                    this.session$.next(this.sessionData)

                    this.saveLocalSessionData()
                },
                error: (error) => {
                    this.appErrorService.setApiError(error)
                }
            });

    }


    private async createSession(): Promise<Observable<QCApiResponse<Session>>> {

        const { publicKey, privateKey } = await createEd25519Keys();

        this.sessionData.session_priv_key = await exportKeyEncoded(privateKey)
        this.sessionData.session_pub_key  = await exportKeyEncoded(publicKey)

        const newSession: NewSession = {
           pub_key: this.sessionData.session_pub_key
        }

        return this.apiService.post<Session>('/session/new', newSession )
    }


    private checkSession(
        sessionId: string
    ): Observable<QCApiResponse<Session>> {

        return this.apiService.get<Session>(sprintf('/session/%s', sessionId ))
            .pipe(
              catchError((error: HttpErrorResponse) => {

                 if (error.status === 404) {
                   console.error('Session not found');
                   this.clearLocalSessionData()
                   this.createAndSetSession()
                 }

                 return throwError(() => error );
              })
            );
    }

    private loadLocalSessionData(): SessionData | undefined {

        //return this.ses
        return this.dataService.loadLocalSessionData()
        //return this.storageService.getSerializedData('session_data') as SessionData
    }


    private saveLocalSessionData(): void {
        this.dataService.saveLocalSessionData(this.sessionData)
        //this.storageService.saveSerializedData('session_data', this.sessionData)
    }


    private clearLocalSessionData(): void {
        this.dataService.clearLocalSessionData()
        //this.storageService.removeData('session_data')
        this.sessionData = {}
    }

}
