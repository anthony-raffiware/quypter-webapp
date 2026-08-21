import { Service, inject, signal, effect } from '@angular/core';
import { HttpClientCommonOptions } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { sprintf } from 'sprintf-js';
import { first, switchMap, Observable, tap, concatMap } from 'rxjs';

import { ApiService, QCApiResponse, QCApiCollectionObj } from './api';
import { LocalStorageService } from './local-storage';
import {
    loadPrivateKey,
    loadPublicKey,
    createEd25519Keys,
    createX25519Keys,
    deriveSecret,
    exportKeyEncoded,
    generateAesKey
} from '../utils';
import { Topic, NewTopic, TopicWithReplies } from '../models/topic.model';
import { TopicReply, NewTopicReply } from '../models/topic-reply.model';
import { SessionService } from './session';
import { ReplyComment, NewReplyComment } from '../models/reply-comment.model';


export type TopicStorageData = {
    privKey: string,
    secretKey: string
}

export type TopicsStorageData = {
  [name: string ]: TopicStorageData
}

export type TopicReplySecretData = {
    topicId: string,
    privKey: string,
    sharedSecretKey: string
}

export type TopicRepliesSecretData = {
  [name: string ]: TopicReplySecretData
}


@Service()
export class TopicService {

    private readonly apiService     = inject(ApiService);
    private readonly storageService = inject(LocalStorageService);
    private readonly sessionService = inject(SessionService);

    readonly decryptedTopics = signal<Array<Topic> | null>(null);
    readonly topicMap        = signal<{ [name:string]: Topic}>({})

    readonly topics = rxResource({
        stream: () => {
            return this.sessionService.isSessionLoaded()
                .pipe(
                    concatMap( (loaded) => {

                       const sessionId = this.sessionService.sessionId as string

                       return this.fetchTopics(sessionId)

                    }),
                    first()
                )
        }
    });

    readonly replies = rxResource({
        stream: () => {
            return this.sessionService.isSessionLoaded()
                .pipe(
                    concatMap( (loaded) => {

                       const sessionId = this.sessionService.sessionId as string

                       return this.fetchReplies(sessionId)

                    }),
                    first()
                )
        }
    });


    constructor() {

        const topicsData = this.storageService.getSerializedData('topic_data')

        if ( topicsData === null ) {
            this.storageService.saveSerializedData('topic_data', {})
        }

        const topicRepliesData = this.storageService.getSerializedData('topic_reply_data')

        if ( topicRepliesData === null ) {
            this.storageService.saveSerializedData('topic_reply_data', {})
        }

        effect( () => {

            const resp = this.topics.value()

            if ( resp !== undefined ) {

                const promises = resp.data.collection.map( async (topic) => {
                    return this.decryptTopic(topic)
                })

                Promise.all(promises).then((decrypted) => {

                    const topicMap: { [name:string]: Topic } = {}

                    decrypted.map((topic) => { topicMap[topic.id] = topic } )

                    this.decryptedTopics.set(decrypted);
                    this.topicMap.set(topicMap)
                });
            }

        });

    }


    public async createTopic(
        newTopic: NewTopic
    ): Promise<Observable<QCApiResponse<Topic>>> {

        const { publicKey, privateKey } = await createX25519Keys();
        const aesSecret      = await generateAesKey();
        const topicPrivKey   = await exportKeyEncoded(privateKey)
        const topicPubKey    = await exportKeyEncoded(publicKey)
        const sessionPrivKey = await loadPrivateKey(this.sessionService.sessionPrivKey)
        const path = sprintf('/session/%s/new_topic', newTopic.session_id )

        newTopic.topic_pub_key = topicPubKey

        await newTopic.encryptData(aesSecret)
        await newTopic.signTopicKey(sessionPrivKey)

        return this.apiService.post<Topic>(path, newTopic )
            .pipe(
                tap( (topic) => {

                    const topicData: TopicStorageData = {
                       privKey: topicPrivKey,
                       secretKey: aesSecret
                    }

                    this.topics.reload()

                    this.addTopicData(topic.data.id, topicData )
                })
            )
    }


    public async decryptTopicCollection(
        resp: QCApiResponse<QCApiCollectionObj<Topic>>
    ): Promise<QCApiResponse<QCApiCollectionObj<Topic>>> {

        const promises = resp.data.collection.map( async (topic) => {
            this.decryptTopic(topic)
        })

        await Promise.all(promises);

        return resp
    }

    public async decryptTopic(
        topic: Topic,
    ): Promise<Topic> { //Promise<void> {

        const topicData = this.getTopicData(topic.id)
        const secret = topicData?.secretKey

        await topic.decryptData(secret as string)

        return topic
    }


    public fetchTopics(
       sessionId: string
    ): Observable<QCApiResponse<QCApiCollectionObj<Topic>>> {

       const path = sprintf('/session/%s/topics', sessionId )

       return this.apiService.getCollection(Topic,path)
    }

    public getTopicData(
        topicId: string,
    ): TopicStorageData | undefined {

        let topicsData = this.loadTopicsData()

        return topicsData[topicId]
    }


    private addTopicData(
        topicId: string,
        topicData: TopicStorageData
    ) {

        let topicsData = this.loadTopicsData()

        topicsData[topicId] = topicData

        this.saveTopicsData(topicsData)
    }

    private loadTopicsData(): TopicsStorageData {
        return this.storageService.getSerializedData('topic_data') as TopicsStorageData
    }

    private saveTopicsData(
        topicsData: TopicsStorageData
    ): void {
        this.storageService.saveSerializedData('topic_data', topicsData)
    }

    public fetchReplies(
        sessionId: string
    ): Observable<QCApiResponse<QCApiCollectionObj<Topic>>> {

        const path = sprintf('/session/%s/replies', sessionId )

        return this.apiService.getCollection(Topic,path)
    }

    public fetchTopicWithRecvReplies(
        sessionId: string ,
        topicId: string ,
        options?: HttpClientCommonOptions
    ): Observable<QCApiResponse<TopicWithReplies>> {

        const path = sprintf('/session/%s/topics/%s', sessionId, topicId )

        return this.apiService.getObject(TopicWithReplies, path, options )
    }

    public async decryptRecvTopicReply(
        topicReply: TopicReply,
    ): Promise<TopicReply> {

        const topicData    = this.getTopicData(topicReply.topic_id)
        const privKeyData  = topicData?.privKey as string;
        const pubKeyData   = topicReply.topic_reply_pub_key;
        const topicPrivKey = await loadPrivateKey(privKeyData, "x25519");
        const topicPubKey  = await loadPublicKey(pubKeyData, "x25519");
        const sharedSecret = await deriveSecret( topicPrivKey, topicPubKey );

        await topicReply.decryptData(sharedSecret)

        const topicReplyData: TopicReplySecretData = {
            topicId: topicReply.topic_id,
            privKey: topicData?.privKey as string,
            sharedSecretKey: sharedSecret
        }

        this.addTopicReplyData(topicReply.id, topicReplyData )

        return topicReply
    }

    public fetchTopicWithSentReplies(
        sessionId: string ,
        topicId: string ,
        options?: HttpClientCommonOptions
    ): Observable<QCApiResponse<TopicWithReplies>> {

        const path = sprintf('/session/%s/replies/%s', sessionId, topicId )

        return this.apiService.getObject(TopicWithReplies, path, options)
    }


    public async decryptSentTopicReply(
        topicReply: TopicReply,
    ): Promise<TopicReply> {

        const topicReplyData = this.getTopicReplyData(topicReply.id)
        const secret         = topicReplyData?.sharedSecretKey

        await topicReply.decryptData(secret as string)

        return topicReply
    }


    public async createTopicReply(
        topic: Topic,
        newTopicReply: NewTopicReply
    ): Promise<Observable<QCApiResponse<TopicReply>>> {

        const sessionId      = this.sessionService.sessionId;
        const sessionPrivKey = await loadPrivateKey(this.sessionService.sessionPrivKey)

        const { publicKey, privateKey } = await createX25519Keys();
        const topicPubKey          = await loadPublicKey(topic.topic_pub_key, "x25519");
        const sharedSecret         = await deriveSecret( privateKey, topicPubKey );
        const topic_reply_priv_key = await exportKeyEncoded(privateKey);
        const topic_reply_pub_key  = await exportKeyEncoded(publicKey);
        const path = sprintf('/topic/%s/send_reply/%s', topic.id, sessionId );

        newTopicReply.topic_reply_pub_key = topic_reply_pub_key

        await newTopicReply.encryptData(sharedSecret)
        await newTopicReply.signReplyKey(sessionId, sessionPrivKey)

        return this.apiService.post<TopicReply>(path, newTopicReply )
            .pipe(
                tap( (topicReply) => {

                    const topicReplyData: TopicReplySecretData = {
                        topicId: topic.id,
                        privKey: topic_reply_priv_key,
                        sharedSecretKey: sharedSecret
                    }

                    this.replies.reload()

                    this.addTopicReplyData(topicReply.data.id, topicReplyData )
               })
            )
    }

    private addTopicReplyData(
        topicReplyId: string,
        topicReplyData: TopicReplySecretData
    ) {

        const topicRepliesData = this.loadTopicRepliesData()

        topicRepliesData[topicReplyId] = topicReplyData

        this.saveTopicRepliesData(topicRepliesData)
    }


    public getTopicReplyData(
        topicReplyId: string,
    ): TopicReplySecretData | undefined {

        let topicsData = this.loadTopicRepliesData()

        return topicsData[topicReplyId]
    }


    private loadTopicRepliesData(): TopicRepliesSecretData {
        return this.storageService.getSerializedData('topic_reply_data') as TopicRepliesSecretData
    }

    private saveTopicRepliesData(
        topicRepliesData: TopicRepliesSecretData
    ): void {
        this.storageService.saveSerializedData('topic_reply_data', topicRepliesData)
    }


    public async createReplyComment(
        newReplyComment: NewReplyComment
    ): Promise<Observable<QCApiResponse<ReplyComment>>> {

        const sessionId      = this.sessionService.sessionId;
        const topicReplyData = this.getTopicReplyData(newReplyComment.topic_reply_id)
        const topicId        = topicReplyData?.topicId as string;
        const sharedSecret   = topicReplyData?.sharedSecretKey as string;

        const path = sprintf('/session/%s/topics/%s/add_comment', sessionId, topicId );

        try {
            await newReplyComment.encryptData(sharedSecret)
        }
        catch (error: unknown) {
            console.error(error);

            throw error
        }

        return this.apiService.post<ReplyComment>(path, newReplyComment )
    }

}