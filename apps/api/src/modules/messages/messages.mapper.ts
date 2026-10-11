import type { MessageDto } from '@mini-chat/shared';
import type { Message } from './entities/message.entity';

export function toMessageDto(message: Message, clientId?: string): MessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    ...(clientId ? { clientId } : {}),
  };
}
