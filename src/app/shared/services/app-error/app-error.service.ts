import { Service, inject, signal, effect } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { QCApiResponse } from '../api';


export type QCAppError = {
    msg: string,
    code?: number,
    requestId?: string,
    header?: string
}


@Service()
export class AppErrorService {

    public appError = signal<QCAppError | null>(null);

    public setApiError(
        error: HttpErrorResponse
    ) {

        // client error
        if (error.error instanceof ErrorEvent) {

            console.error('client', error);

            const appError: QCAppError = {
                code: error.status,
                msg: error.error.message,
                header: 'Client Error'
            }

            this.appError.set(appError)

        // server error
        } else {
            console.error('server', error);

            const apiError = error.error as QCApiResponse<string>;

            const appError: QCAppError = {
                code: error.status,
                msg: apiError.data,
                requestId: apiError.meta.request_id,
                header: 'API Error'
            }

            this.appError.set(appError)
        }
    }


    public setError(
        msg: string,
        header: string = 'Error'
    ) {

        const appError: QCAppError = {
            msg: msg,
            header: header
        }

        this.appError.set(appError)
    }


    public clearError() {
        this.appError.set(null)
    }

}
