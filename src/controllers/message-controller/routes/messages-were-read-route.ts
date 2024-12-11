import {TextMessageEntity} from "../../../domain/entity/text-message-entity";
import {MessagesService} from "../../../domain/services/messages-service";
import {AsklessServer} from "askless";
import {ErrorResponse} from "askless/route/ErrorResponse";


export class MessagesWereReadRoute {

    constructor(private readonly route:string) {}

    addCreateRoute (server:AsklessServer<number>, messagesService:MessagesService) {
        server.addRoute.forAuthenticatedUsers.create<{ /* entity --> */ readAt: Date }>({
            route: this.route,
            handleCreate: async (context) => {
                console.log("[CREATE}] \"/messages-were-read\" handler started");
                const loggedUserId:number = context.userId;
                const lastMessageId:string = context.body['lastMessageId'];
                const lastMessage = (await messagesService.getMessagesByIds([lastMessageId]))[0];

                if (lastMessage == null)
                    throw Error('message ' + lastMessageId + ' not found');

                const senderUserId:number = parseInt(context.body['senderUserId'] as any);

                const readAt = await messagesService.notifyMessagesWereRead(loggedUserId, senderUserId, lastMessage.sentAt);

                context.successCallback({ readAt: readAt });
            },
            toOutput: (entity) => {
                return {
                    readAtMsSinceEpoch: entity.readAt.getTime(),
                }
            },
        })
    }

    async getMessagesByIdsAndCheckIfLoggedUserIsTheReceiver (loggedUserId: number, messagesIds:string[], messagesService:MessagesService) : Promise<Array<TextMessageEntity>> {
        const messages:Array<TextMessageEntity> = await messagesService.getMessagesByIds(messagesIds);
        if(messages.find((message) => message.receiverUserId != loggedUserId)) {
            throw new ErrorResponse({code: "PERMISSION_DENIED", description: "You are not allowed to perform to a message that is not yours"});
        }
        return messages;
    }
}
