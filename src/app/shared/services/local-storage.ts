import { Service } from '@angular/core';

@Service()
export class LocalStorageService {

    constructor() { }

    public saveData(key: string, value: string ): void {
        localStorage.setItem(key, value);
    }

    public getData(key: string): string | null {
        return localStorage.getItem(key)
    }

    public saveSerializedData(key: string, value: Object | Array<any> ): void {

        const serializedValue = JSON.stringify(value)

        localStorage.setItem(key, serializedValue);
    }

    public getSerializedData(key: string): Object | Array<any> | null {

        const serializedValue = localStorage.getItem(key) as string;

        if ( serializedValue !== undefined ) {
           return JSON.parse( serializedValue );
        }

        return null;
    }


    public removeData(key: string): void {
        localStorage.removeItem(key);
    }

    public clearData(): void {
        localStorage.clear();
    }

}
