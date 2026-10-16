/**
 * Socket.IO contract between the API and the web app.
 *
 * Messages are *sent* over REST (see POST /conversations/:id/messages);
 * the socket is only used to push changes to clients and for typing signals.
 */
import type { ConversationDto } from './types/conversation';
import type { MessageDto } from './types/message';

export const ServerEvents = {
  MessageNew: 'message:new',
  ConversationUpdated: 'conversation:updated',
  ReadUpdated: 'read:updated',
  PresenceSnapshot: 'presence:snapshot',
  PresenceUpdated: 'presence:updated',
  TypingUpdated: 'typing:updated',
} as const;

export const ClientEvents = {
  TypingStart: 'typing:start',
  TypingStop: 'typing:stop',
} as const;

export interface ReadUpdatedPayload {
  conversationId: string;
  userId: string;
  lastReadAt: string;
}

export interface PresenceSnapshotPayload {
  onlineUserIds: string[];
}

export interface PresenceUpdatedPayload {
  userId: string;
  online: boolean;
}

export interface TypingUpdatedPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface TypingPayload {
  conversationId: string;
}

/** Events the server emits. Used to type both the gateway and the client socket. */
export interface ServerToClientEvents {
  [ServerEvents.MessageNew]: (message: MessageDto) => void;
  [ServerEvents.ConversationUpdated]: (conversation: ConversationDto) => void;
  [ServerEvents.ReadUpdated]: (payload: ReadUpdatedPayload) => void;
  [ServerEvents.PresenceSnapshot]: (payload: PresenceSnapshotPayload) => void;
  [ServerEvents.PresenceUpdated]: (payload: PresenceUpdatedPayload) => void;
  [ServerEvents.TypingUpdated]: (payload: TypingUpdatedPayload) => void;
}

/** Events the client emits. */
export interface ClientToServerEvents {
  [ClientEvents.TypingStart]: (payload: TypingPayload) => void;
  [ClientEvents.TypingStop]: (payload: TypingPayload) => void;
}
