import type { MessageDto } from './message';
import type { UserDto } from './user';

export type ConversationType = 'direct' | 'group';

export interface ConversationMemberDto extends UserDto {
  /** ISO date string. Everything sent at or before this time has been read by the member. */
  lastReadAt: string;
}

export interface ConversationDto {
  id: string;
  type: ConversationType;
  /** Only groups have a title. Direct chats are named after the other person. */
  title: string | null;
  members: ConversationMemberDto[];
  lastMessage: MessageDto | null;
  /** Messages from other members newer than the current user's lastReadAt. */
  unreadCount: number;
  /** ISO date string. Used to sort the conversation list. */
  lastMessageAt: string;
  createdAt: string;
}
