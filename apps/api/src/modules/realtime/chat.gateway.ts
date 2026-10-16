import {
  ClientEvents,
  type ClientToServerEvents,
  ServerEvents,
  type ServerToClientEvents,
  type TypingPayload,
} from '@mini-chat/shared';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TokensService } from '../auth/tokens.service';
import {
  ConversationCreatedEvent,
  ConversationReadEvent,
} from '../conversations/conversations.events';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageCreatedEvent } from '../messages/messages.events';
import { PresenceService } from './presence.service';

interface SocketData {
  userId: string;
}

type ChatServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type ChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

/** Each user has a personal room; each conversation has a room for its members. */
const userRoom = (userId: string) => `user:${userId}`;
const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;

/**
 * The only place that talks to sockets.
 *
 * - Clients connect with `auth: { token: <access token> }`.
 * - Domain events from other modules (`@OnEvent`) are pushed to the right rooms.
 * - Typing signals are relayed between members of a conversation.
 */
@WebSocketGateway()
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: ChatServer;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly tokensService: TokensService,
    private readonly conversationsService: ConversationsService,
    private readonly presenceService: PresenceService,
  ) {}

  afterInit(server: ChatServer): void {
    // Reject the connection before it is established if the token is missing or invalid.
    // The client sees a `connect_error`, refreshes its token and reconnects.
    server.use((socket, next) => {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== 'string') return next(new Error('Unauthorized'));
      this.tokensService
        .verifyAccessToken(token)
        .then((user) => {
          socket.data.userId = user.id;
          next();
        })
        .catch(() => next(new Error('Unauthorized')));
    });
  }

  async handleConnection(socket: ChatSocket): Promise<void> {
    const { userId } = socket.data;
    // Count the socket before any await, so a quick disconnect can't be processed first.
    const cameOnline = this.presenceService.connect(userId);

    try {
      const [conversationIds, contactIds] = await Promise.all([
        this.conversationsService.findConversationIds(userId),
        this.conversationsService.findContactIds(userId),
      ]);
      await socket.join([userRoom(userId), ...conversationIds.map(conversationRoom)]);

      socket.emit(ServerEvents.PresenceSnapshot, {
        onlineUserIds: this.presenceService.filterOnline(contactIds),
      });
      if (cameOnline) {
        this.emitToUsers(contactIds, ServerEvents.PresenceUpdated, { userId, online: true });
      }
    } catch (error) {
      this.logger.error(`Could not set up socket for user ${userId}`, error);
      socket.disconnect(); // the client reconnects and tries again
    }
  }

  async handleDisconnect(socket: ChatSocket): Promise<void> {
    const { userId } = socket.data;
    // Sockets rejected by the auth middleware never got a user id.
    if (!userId || !this.presenceService.disconnect(userId)) return;

    try {
      const contactIds = await this.conversationsService.findContactIds(userId);
      this.emitToUsers(contactIds, ServerEvents.PresenceUpdated, { userId, online: false });
    } catch (error) {
      // e.g. the app is shutting down and the database is already closed.
      this.logger.warn(`Could not announce that user ${userId} went offline: ${String(error)}`);
    }
  }

  @SubscribeMessage(ClientEvents.TypingStart)
  onTypingStart(@ConnectedSocket() socket: ChatSocket, @MessageBody() payload: TypingPayload) {
    this.relayTyping(socket, payload, true);
  }

  @SubscribeMessage(ClientEvents.TypingStop)
  onTypingStop(@ConnectedSocket() socket: ChatSocket, @MessageBody() payload: TypingPayload) {
    this.relayTyping(socket, payload, false);
  }

  @OnEvent(MessageCreatedEvent.event)
  onMessageCreated({ message }: MessageCreatedEvent): void {
    this.server.to(conversationRoom(message.conversationId)).emit(ServerEvents.MessageNew, message);
  }

  @OnEvent(ConversationCreatedEvent.event)
  onConversationCreated({ conversation }: ConversationCreatedEvent): void {
    const memberIds = conversation.members.map((member) => member.id);
    const room = conversationRoom(conversation.id);
    // Put every open socket of every member into the new room, then tell them about it.
    this.server.in(memberIds.map(userRoom)).socketsJoin(room);
    this.emitToUsers(memberIds, ServerEvents.ConversationUpdated, conversation);
    this.server.to(room).emit(ServerEvents.PresenceSnapshot, {
      onlineUserIds: this.presenceService.filterOnline(memberIds),
    });
  }

  @OnEvent(ConversationReadEvent.event)
  onConversationRead({ conversationId, userId, lastReadAt }: ConversationReadEvent): void {
    this.server.to(conversationRoom(conversationId)).emit(ServerEvents.ReadUpdated, {
      conversationId,
      userId,
      lastReadAt: lastReadAt.toISOString(),
    });
  }

  private relayTyping(socket: ChatSocket, payload: TypingPayload, isTyping: boolean): void {
    const room = conversationRoom(String(payload?.conversationId));
    // Sockets are only in the rooms of conversations their user belongs to.
    if (!socket.rooms.has(room)) {
      this.logger.debug(`Ignored typing signal for ${room} from user ${socket.data.userId}`);
      return;
    }
    socket.to(room).emit(ServerEvents.TypingUpdated, {
      conversationId: payload.conversationId,
      userId: socket.data.userId,
      isTyping,
    });
  }

  private emitToUsers<E extends keyof ServerToClientEvents>(
    userIds: string[],
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void {
    if (userIds.length === 0) return;
    this.server.to(userIds.map(userRoom)).emit(event, ...args);
  }
}
