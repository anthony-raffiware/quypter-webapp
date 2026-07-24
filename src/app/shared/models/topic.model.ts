import { 
    localizeDateTime, 
    eceDecrypt, 
    eceEncrypt, 
    genNonce, 
    getUtc,
    signTokens,
} from "../utils"
import { TopicReply } from "./topic-reply.model"
import base64url from "base64url";


export type TopicAttributes = {                       
  title?: string,
  description?: string,
}

export type SigData = {                       
  signature: string,
  date: string,
  nonce: string 
}


export class NewTopic {

    constructor(
       public session_id?: string,
       public topic_pub_key?: string,
       public topic_pub_key_sig?: string,
       public data?: TopicAttributes | string,
       public expires_ts?: string,
    ) {}


    public async encryptData(secret: string): Promise<void> {

        if ( typeof this.data !== 'object' ) {
           return
        }

        const serializedData = JSON.stringify(this.data)

        this.data = await eceEncrypt(serializedData , secret)
    }


    public async signTopicKey(privKey: CryptoKey) {

        if ( this.topic_pub_key === undefined ) {
            return         
        }

        const nowUtc = getUtc()
        const nonce  = genNonce() 
        const tokens = {
            sessionId: this.session_id as string,
            pubKey: this.topic_pub_key,
            date: nowUtc,
            nonce: nonce
        }
        const signature = await signTokens(tokens, privKey)

        const sigData: SigData = {                       
          signature: signature,
          date:  nowUtc,
          nonce: nonce 
        }

        this.topic_pub_key_sig = base64url.encode(JSON.stringify(sigData))
    }
}



export class Topic {

    public id!: string;
    public topic_pub_key!: string;
    public topic_pub_key_sig!: string;
    public created_ts!: string;
    public updated_ts!: string;
    public data!: TopicAttributes | string;
    public decryptedData?:  TopicAttributes;
    public expires_ts?: string;


    constructor(params: Partial<Topic> = {}) {
      Object.assign(this, params);
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

    public async decryptData(secret: string): Promise<TopicAttributes> {

        if ( typeof this.data === 'object' ) {
           console.log('already decrypted')
           return this.data
        }

        const data =  await eceDecrypt(this.data, secret)
   
        this.decryptedData = JSON.parse( data ) as TopicAttributes

        return this.decryptedData 
    }
}

export class TopicWithReplies extends Topic {

    public replies!: Array<TopicReply>;

    constructor(params: Partial<TopicWithReplies> = {}) {

        super(params); 

        this.replies = params.replies?.map((reply) => {
           return new TopicReply(reply)
        }) as TopicReply[];
    
    }


}
