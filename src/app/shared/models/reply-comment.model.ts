import { 
    localizeDateTime, 
    eceDecrypt, 
    eceEncrypt, 
    genNonce, 
    getUtc,
    signTokens,
} from "../utils"
//import { TopicReply } from "./topic-reply.model"
import base64url from "base64url";

export type ReplyCommentData = {                       
  comment?: string,
  updated?: string
}

export class NewReplyComment {

    public session_key_id!: string;
    public topic_reply_id!: string;
    public data!: string;
    public decryptedData?:  ReplyCommentData;

    constructor(params: Partial<ReplyComment> = {}) {
      Object.assign(this, params);
    }


    public async encryptData(secret: string): Promise<void> {

        if ( typeof this.decryptedData !== 'object' ) {
           return
        }

        const serializedData = JSON.stringify(this.decryptedData);

        delete this.decryptedData;

        this.data = await eceEncrypt(serializedData, secret)
    }

}

export class ReplyComment {

    public id!: string;
    public topic_reply_id!: string;
    public session_key_id!: string;
    public created_ts!: string;
    public data!:  string;
    public decryptedData?:  ReplyCommentData;

    constructor(params: Partial<ReplyComment> = {}) {
      Object.assign(this, params);
    }

    get localCreatedDateTime() {
       return localizeDateTime(this.created_ts);
    }

    get localUpdatedDateTime() {
       return localizeDateTime(this.decryptedData?.updated);
    }


    public async decryptData(secret: string): Promise<ReplyCommentData> {

        if ( typeof this.decryptedData === 'object' ) {
           console.log('already decrypted')
           return this.decryptedData
        }

        const data =  await eceDecrypt(this.data, secret)
   
        this.decryptedData = JSON.parse( data ) as ReplyCommentData

        return this.decryptedData 
    }

}
