import type { ConversationDto } from '@mini-chat/shared';
import type { Message } from '../messages/entities/message.entity';
import { toMessageDto } from '../messages/messages.mapper';
import { toUserDto } from '../users/users.mapper';
import type { Conversation } from './entities/conversation.entity';

/** `conversation.members` and each `member.user` must be loaded. */
export function toConversationDto(
  conversation: Conversation,
  extras: { lastMessage: Message | null; unreadCount: number },
): ConversationDto {
  return {
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    members: conversation.members.map((member) => ({
      ...toUserDto(member.user),
      lastReadAt: member.lastReadAt.toISOString(),
    })),
    lastMessage: extras.lastMessage ? toMessageDto(extras.lastMessage) : null,
    unreadCount: extras.unreadCount,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
  };
}
