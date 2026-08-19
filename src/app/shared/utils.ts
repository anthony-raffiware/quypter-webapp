import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import base64url from "base64url";
import { Buffer } from 'buffer';
import { encodings, encrypt, decrypt } from '@apeleghq/rfc8188';
import {ErrorStateMatcher} from '@angular/material/core';
import { FormControl, FormGroupDirective, NgForm, } from '@angular/forms';


dayjs.extend(timezone);
dayjs.extend(utc)

const AES_GCM_KEY_LENGTH    = 128;
const SECRET_KEY_BIT_LENGTH = 256;
const SUBTLE = crypto.subtle;

/**
 *·
 * @returns {CryptoKeyPair} - Ed25519 Keys.
 */
export async function createEd25519Keys() {

    return SUBTLE.generateKey(
        {
          name: "Ed25519",
        },
        true,
        ["sign", "verify"],
    );
}


/**
 *·
 * @returns {CryptoKeyPair}  - X25519 Keys.
 */
export async function createX25519Keys() {

    return SUBTLE.generateKey(
        {
          name: "X25519",
        },
        true,
        ["deriveKey", "deriveBits"],
    );
}


/**
 * @param {CryptoKey}  pk     X25519 CryptoKey containing private key.
 * @param {CryptoKey}  pubPk  X25519 CryptoKey containing public key.
 *·
 * @returns {ArrayBuffer}
 */
export async function deriveSecret(
    pk:    CryptoKey,
    pubPk: CryptoKey,
) {

    const secret = await SUBTLE.deriveBits(
        {
          name: "X25519",
          public: pubPk,
        },
        pk,
        SECRET_KEY_BIT_LENGTH
    );

    return bufToBase64Url(Buffer.from(secret));
}


/**
 * @param {string}           privKey
 * @param {string}           [algorithm=Ed25519]
 * @param {"pkcs8" | "raw"}  [format=pkc8]
 *·
 * @returns {CryptoKey}
 */
export async function loadPrivateKey(
    privKey:   string,
    algorithm: string          = "Ed25519",
    format:    "pkcs8" | "raw" = 'pkcs8'
) {

    const keyBuf = base64UrlToBuf(privKey)

    const pk = await SUBTLE.importKey(
        format,
        keyBuf,
        algorithm,
        true,
        ( algorithm.toLowerCase() === "ed25519" ) ? ['sign'] :
        ( algorithm.toLowerCase() === "x25519" )  ? ["deriveKey", "deriveBits"] :
        []
    );

    return pk;
}


/**
 * @param {string}  pubKey
 * @param {string}  [algorithm=Ed25519]
 *·
 * @returns {CryptoKey}
 */
export async function loadPublicKey(
    pubKey:    string,
    algorithm: string = "Ed25519"
) {

    const keyBuf = base64UrlToBuf(pubKey)
    const pk = await SUBTLE.importKey(
        "spki",
        keyBuf,
        algorithm,
        true,
        ( algorithm.toLowerCase() === "ed25519" ) ? ['verify'] :
        ( algorithm.toLowerCase() === "x25519" )  ? [] :
        [],
    );

    return pk;
}


/**
 * RFC8188 encryption function using @apeleghq/rfc8188.
 *·
 * @param {string}  data  Data to be encrypted
 * @param {string}  secret Base64Url encoded secret key
 *·
 * @returns {string} Base64Url encoded cipher.
 */
export async function eceEncrypt(
    data:   string,
    secret: string
) {

    const secretBuf = Buffer.from(base64UrlToBuf(secret));
    const dataBuf   = Buffer.from(data);
    const salt      = crypto.getRandomValues(new Uint8Array(16));

    const secretKey = await SUBTLE.importKey(
        "raw",
        secretBuf,
        { name: "HKDF" },
        false,
        ["deriveBits"]
    );

    const derivedSecret = await SUBTLE.deriveBits(
        { name: "HKDF",
          hash: "SHA-256",
          salt: Buffer.from(''),
          info: buildInfoBuf("Content-Encoding: aes128gcm")
        },
        secretKey,
        AES_GCM_KEY_LENGTH
    );

    const dataStreamToEncrypt = bufferToStream(dataBuf);

    const keyId      = new ArrayBuffer(0);
    const recordSize = 512;
    const encryptedDataStream = await encrypt(
        encodings.aes128gcm,
        dataStreamToEncrypt,
        recordSize,
        keyId,
        derivedSecret,
        salt
    );

    const result = await streamToBuf(encryptedDataStream);

    return bufToBase64Url(result);
}


/**
 * RFC8188 decryption function.
 *·
 * @param {string}  cipher  Base64Url encoded cipher
 * @param {string}  secret  Base64Url encoded secret key.
 *·
 * @returns {string} plain text
 */
export async function eceDecrypt(
    cipher: string,
    secret: string
) {

    const secretBuf = Buffer.from(base64UrlToBuf(secret));

    const secretKey = await SUBTLE.importKey(
        "raw",
        secretBuf,
        { name: "HKDF" },
        false,
        ["deriveBits"]
    );

    const derivedSecret = await SUBTLE.deriveBits(
        { name: "HKDF",
          hash: "SHA-256",
          salt: Buffer.from(''),
          info: buildInfoBuf("Content-Encoding: aes128gcm")
        },
        secretKey,
        AES_GCM_KEY_LENGTH
    );

    const cipherBuf           = Buffer.from(base64UrlToBuf(cipher));
    const dataStreamToDecrypt = bufferToStream(cipherBuf);

    const decryptedDataSteam = decrypt(
        encodings.aes128gcm,
        dataStreamToDecrypt,
        async () => { return Buffer.from(derivedSecret) },
    );

    const result = await streamToBuf(decryptedDataSteam);

    return result.toString()
}


async function streamToBuf(
    s: ReadableStream<ArrayBufferLike|BufferSource>
) {

    const result = await new Response( ArrayBufferToUint8ArrayStream(s) )
                             .arrayBuffer();

    return Buffer.from(result)
}

/* Borrowed from @apeleghq/rfc8188 tests */
const ArrayBufferToUint8ArrayStream = (
    s: ReadableStream<ArrayBufferLike|BufferSource>
) => s.pipeThrough(
    new TransformStream<ArrayBufferLike, Uint8Array>({
        start() {},
        transform(chunk, controller) {
            if (ArrayBuffer.isView(chunk)) {
                controller.enqueue(
                    new Uint8Array(
                        chunk.buffer,
                        chunk.byteOffset,
                        chunk.byteLength,
                    ),
                );
            } else {
                controller.enqueue(new Uint8Array(chunk));
            }
        },
    }),
);


function bufferToStream(
    buf: Uint8Array
) {
    let pos = 0;
    return new ReadableStream({
        pull(controller) {
            if (pos === buf.byteLength) {
               controller.close();
               return;
            }
            const chunkSize =
               1 + (((0, Math.random)() * (buf.byteLength - pos)) | 0);
            controller.enqueue(buf.subarray(pos, pos + chunkSize));
            pos += chunkSize;
        },
    });
}


function buildInfoBuf(
    infoText: string
) {

    const enc     = new TextEncoder();
    const textBuf = enc.encode(infoText);
    const infoBuf = new Uint8Array(textBuf.length + 1 );

    infoBuf.set( textBuf, 0 );
    infoBuf.set( [0x00], textBuf.length );

    return infoBuf;
}


function bufToBase64Url(
    buf: Buffer<ArrayBufferLike>
) {

    const encoder = base64url;

    return encoder.encode(buf, 'binary');
}


function base64UrlToBuf(
    str: string
) {

    const encoder = base64url;

    return str2ab(encoder.decode(str, 'binary'));
}


function str2ab(
    str: string
) {

    const buf     = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);

    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }

    return buf;
}

/**
 *·
 * @returns {string} Base64Url encoded AES key
 */
export async function generateAesKey() {

    const key = await crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256, // Can be 128, 192, or 256
        },
        true,
        ["encrypt", "decrypt"]
    );

    const rawKey: ArrayBuffer = await crypto.subtle.exportKey("raw", key);
    const rawKeyBuf: Buffer<ArrayBufferLike> = Buffer.from(rawKey);

    return bufToBase64Url(rawKeyBuf);
}


type Tokens = {
    [key: string] : string | number | Uint8Array
}

/**
 * @param {Tokens}     tokens  Token data
 * @param {CryptoKey}  pk      Private Signing Key
 *·
 * @returns {string} Base64Url encoded signature
 */
export async function signTokens(
    tokens: Tokens,
    pk:     CryptoKey
) {

    const msg = generateMsgFromTokens(tokens);

    const signature = await SUBTLE.sign(
        "Ed25519",
        pk,
        msg
    );

    return bufToBase64Url( Buffer.from(signature) );
}


/**
 * @param {Tokens} tokens  Token data
 *·
 * @returns {string} Flat ordered and encoded token data
 */
export function generateMsgFromTokens(
    tokens: Tokens
) {

    const enc       = new TextEncoder();
    const tokenKeys = Object.keys(tokens);
    const comma_enc = enc.encode(',');

    const allValues: Array<Uint8Array> = [];

    tokenKeys.sort().map( (t,i) => {
        const tVal = tokens[t];

        /* Don't put already encoded binary data through·
         * a utf-8 text encoder */
        if ( tVal instanceof Uint8Array && tVal.length > 0 )  {
          allValues.push( tVal as Uint8Array )
        }
        else if ( tVal !== undefined || tVal !== '' ) {
          allValues.push( enc.encode( tVal as string ) )
        }
        else {
          return
        }

        /* Sorted values are joined on commas */
        if ( i < tokenKeys.length - 1 ) {
          allValues.push( comma_enc )
        }
    });

    /* Flatten all our Uint8Array's into one */
    let length = 0;
    allValues.forEach(item => {
        length += item.length;
    });

    const mergedArray = new Uint8Array(length);
    let offset      = 0;

    allValues.forEach(item => {
        mergedArray.set(item, offset);
        offset += item.length;
    });

    return mergedArray;
}


/**
 * Generate 32bit nonce value
 *·
 * @returns {string}
 */
export function genNonce() {

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);

    return btoa(String.fromCharCode(...array));
}


/**
 * @param {CryptoKey} key
 *·
 * @returns {string} Base64Url encoded key data
 */
export async function exportKeyEncoded(
    key: CryptoKey
) {

    const exportedKey = await exportKey( key ) as ArrayBuffer;
    const exportedKeyBuf: Buffer<ArrayBufferLike> =  Buffer.from(exportedKey);

    return bufToBase64Url(exportedKeyBuf);
}


/**
 * @param {CryptoKey} key
 *·
 * @returns {ArrayBuffer} Exported key data
 */
export async function exportKey(
    key: CryptoKey
) {

    if (!key.extractable) {
        throw new Error('Key is not extractable');
    }

    const type = key.type;

    if ( type === 'private' ) {
        return SUBTLE.exportKey("pkcs8", key);
    }
    else if ( type === 'public' ) {
        return SUBTLE.exportKey("spki", key);
    }

    return undefined
}


/**
 * @param {string} [iso_8601_dt]  ISO8601 datetime stamp
 *·
 * @returns {string}  localized ISO8601 datetime stamp or
 *                    'Not Set' if no iso_8601_dt is set.
 */
export function localizeDateTime(
    iso_8601_dt?: string
) {

    if ( iso_8601_dt ) {
        const day = dayjs(iso_8601_dt);

        return day.format('YYYY-MM-DD HH:mm:ss');
    }
    else {
        return 'Not Set'
    }
}


/**
 * @param {string} dateStr datetime stamp.
 *·
 * @returns {boolean} true if datetime stamp was valid
 */
export function validDate(
    dateStr: string
) {

    return dayjs(dateStr).isValid();
}


/**
 * @param {string} [dateStr]  datetime stamp
 *·
 * @returns {string}  ISO8601 datetime stamp with UTC offset
 */
export function getUtc(
    dateStr?: string
) {

    if ( dateStr !== undefined ) {
        return dayjs(dateStr).utc().format('YYYY-MM-DD HH:mm:ss Z');
    }

    return dayjs().utc().format('YYYY-MM-DD HH:mm:ss Z');
}


export class QCErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;

    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

