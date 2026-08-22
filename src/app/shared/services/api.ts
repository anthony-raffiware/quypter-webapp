import { Service, inject  } from '@angular/core';
import {
    HttpClient,
    HttpClientCommonOptions,
    HttpErrorResponse,
    HttpRequest,
    HttpHandlerFn,
    HttpEvent
} from '@angular/common/http';
import {
    Observable,
    tap,
    catchError,
    throwError,
    first,
    switchMap,
    of,
    from,
    lastValueFrom
} from 'rxjs';
import { sprintf } from 'sprintf-js';
import { environment } from '../../../environments/environment';

type QCRequestFuncNoData<T> = (
    url:     string,
    ...rest: any[]
) => Observable<T>

type QCRequestFuncData<T> = (
    url:     string,
    body:    any,
    ...rest: any[]
) => Observable<T>

type QCRequestFunc<T> = QCRequestFuncNoData<T> | QCRequestFuncData<T>

type QCApiResponseMeta = {
    error: boolean,
    data_type: string,
    request_id: string
}

type QCApiValidationErrorData =  {
   loc: {
     path: string
   }
   msg: string,
   type: string
}

export type QCApiErrorData = Array<QCApiValidationErrorData> | string

export type QCApiResponse<T=any> = {
    data: T,
    meta: QCApiResponseMeta
}

export type QCApiCollection<T=any> = {
    collection: Array<T>,
    count: number,
    page: number,
    limit: number
}

export class QCApiCollectionObj<T=any> {

    public collection!: Array<T>;
    public count!: number;
    public page!: number;
    public limit!: number;

    constructor(
        objectClass:  new (...args: any[]) => T,
        data: QCApiCollection<T>
    ) {

        this.collection = data.collection;
        this.count = data.count;
        this.page = data.page;
        this.limit = data.limit;

        this.collection = this.collection.map( (object) => {
            return new objectClass({...object})
        })

    }
}


@Service()
export class ApiService {

    private readonly apiURL = environment.apiUrl;
    private readonly http = inject(HttpClient);


    public getObject<T>(
      type: new (...args: any[]) => T,
      path: string,
      options?: HttpClientCommonOptions
    ): Observable<QCApiResponse<T>>  {

        return this.get<T>(path, options )
            .pipe(
                switchMap(  resp => {

                   resp.data = new type(resp.data);

                   return of(resp)
                }),
                first(),
            )
    }


    public getCollection<T>(
        type: new (...args: any[]) => T,
        path: string,
        options?: HttpClientCommonOptions
    ): Observable<QCApiResponse<QCApiCollectionObj<T>>>  {

        return this.get<QCApiCollectionObj<T>>(path, options )
            .pipe(
                switchMap(  resp => {
                   resp.data = Object.assign(new QCApiCollectionObj<T>(type,resp.data) )

                   return of(resp)
                }),
                first(),
            )
    }


    get<T>(
        path: string,
        options?: HttpClientCommonOptions
    ): Observable<QCApiResponse<T>> {

        return this.request( this.http.get<QCApiResponse<T>>, path, options )
    }


    post<T>(
        path: string,
        body: any,
        options?: HttpClientCommonOptions
    ): Observable<QCApiResponse<T>> {

        return this.request( this.http.post<QCApiResponse<T>>, path, body, options )
    }


    put<T>(
        path: string,
        body: any,
        options?: HttpClientCommonOptions
    ): Observable<QCApiResponse<T>> {

        return this.request( this.http.put<QCApiResponse<T>>, path, body, options )
    }


    delete<T>(
        path: string,
        options?: HttpClientCommonOptions
    ): Observable<QCApiResponse<T>> {

        return this.request( this.http.delete<QCApiResponse<T>>, path, options )
    }


    request<T>(
        requestFunc: QCRequestFunc<T>,
        path: string,
        ...args: any[]
    ): Observable<T> {

        const url = sprintf('%s%s', this.apiURL, path )

        return requestFunc.bind(this.http)(url, args[0], ...args.slice(1, args.length ) )
            .pipe(
                catchError( (error: HttpErrorResponse): Observable<T> => {

                    console.error('request url', url)
                    console.error('request args', args)

                    if (error.error instanceof ErrorEvent) {
                        console.error('Client-side error:', error.error.message);
                    } else {
                        console.error(`Backend returned code ${error.status}, body was: ${error.error}`);
                    }

                    return throwError( () => error )
                }),
                first(),
                tap( (response) => {

                    if (!environment.production)  {
                        console.log('request url', url)
                        console.log('request args', args)
                        console.log('response data', response)
                    }
                })
            )

    }
}



