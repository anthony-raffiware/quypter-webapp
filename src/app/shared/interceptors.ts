import {
    inject
} from '@angular/core';

import {
    HttpRequest,
    HttpHandlerFn,
    HttpEvent
} from '@angular/common/http';
import {
    Observable,
    from,
    lastValueFrom
} from 'rxjs';

import {
    loadPrivateKey,
    signTokens,
    getUtc,
    genNonce
} from './utils';


//import { SessionService } from './services/session';
import { LocalStorageService } from './services/local-storage';
import { SessionDataService, SessionData } from './services/session';


export function requestSigningInterceptor(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<any>> {

    const sessionData = inject(SessionDataService).loadLocalSessionData();

    //return next(req)

    if (!sessionData?.id) {
        return next(req)
    }

    return from(signRequest(req, next, sessionData as SessionData ))
}

async function signRequest(
    request: HttpRequest<unknown>,
    next: HttpHandlerFn,
    sessionData: SessionData
): Promise<HttpEvent<unknown>> {

    const privKeyEnc = sessionData.session_priv_key as string
    const privKey    = await loadPrivateKey(privKeyEnc);

    const uuid   = sessionData.id as string;
    const nowUtc = getUtc()
    const nonce  = genNonce()
    const tokens = {
        sessionUuid: uuid,
        date: nowUtc,
        nonce: nonce
    }
    const signature = await signTokens(tokens, privKey)

    const newRequest = request.clone({
        //headers: req.headers.append('X-Authentication-Token', authToken),
    });

    console.log('In Interceptor')

    return lastValueFrom(next(newRequest));
}

