import {
    localizeDateTime,
    eceDecrypt,
    eceEncrypt,
    genNonce,
    getUtc,
    signTokens,
} from "../utils"
import base64url from "base64url";
import { ReplyComment } from "./reply-comment.model";


export type TopicReplyData = {
    type: string,
    data: MessageReply | ImageReply
}

export type MessageReply = {
    message: string
}

enum ImageFormats {
    jpeg,
    png,
    gif
}

export type ImageReply = {
    name:     string,
    type:     string,
    data:     string,
    thumb:    string,
    caption?: string,
    size:     number
}

export type SigData = {
  signature: string,
  date:      string,
  nonce:     string
}

export class NewTopicReply {

    public session_key_id!: string;
    public topic_reply_pub_key!: string;
    public topic_reply_pub_key_sig!: string;
    public data!: TopicReplyData | string;


    constructor(
        params: Partial<TopicReply> = {}
    ) {
        Object.assign(this, params);
    }


    public async encryptData(
        secret: string
    ): Promise<void> {

        if ( typeof this.data !== 'object' ) {
           return
        }

        const serializedData = JSON.stringify(this.data)

        this.data = await eceEncrypt(serializedData , secret)
    }


    public async signReplyKey(
        sessionId: string,
        privKey: CryptoKey
    ) {

        if ( this.topic_reply_pub_key === undefined ) {
            return
        }

        const nowUtc = getUtc()
        const nonce  = genNonce()
        const tokens = {
            sessionId: sessionId,
            pubKey: this.topic_reply_pub_key,
            date: nowUtc,
            nonce: nonce
        }
        const signature = await signTokens(tokens, privKey)

        const sigData: SigData = {
            signature: signature,
            date:  nowUtc,
            nonce: nonce
        }

        this.topic_reply_pub_key_sig = base64url.encode(JSON.stringify(sigData))
    }

}

export class TopicReply {

    public id!: string;
    public topic_id!: string;
    public session_key_id!: string;
    public topic_reply_pub_key!: string;
    public topic_reply_pub_key_sig!: string;
    public created_ts!: string;
    public data!:  string;
    public decryptedData?:  TopicReplyData;
    public expires_ts?: string;
    public comment: ReplyComment | undefined;

    constructor(
        params: Partial<TopicReply> = {}
    ) {

        Object.assign(this, params);

        if (this.comment) {
            this.comment = new ReplyComment(this.comment)
        }
    }

    get localCreatedDateTime() {
        return localizeDateTime(this.created_ts);
    }

    get localUpdatedDateTime() {
        return localizeDateTime(this.created_ts);
    }

    get localExpiresDateTime() {
        return localizeDateTime(this.created_ts);
    }

    public getMessageData(): MessageReply {
        return this.decryptedData?.data as MessageReply
    }

    public getImageData(): ImageReply {
        return this.decryptedData?.data as ImageReply
    }

    public async decryptData(
        secret: string
    ): Promise<TopicReplyData> {

        if ( typeof this.data === 'object' ) {
           console.log('already decrypted')
           return this.data
        }

        const data =  await eceDecrypt(this.data, secret)

        this.decryptedData = JSON.parse( data ) as TopicReplyData

        if (this.comment) {
            await this.comment.decryptData(secret)
        }

        return this.decryptedData
    }

}
