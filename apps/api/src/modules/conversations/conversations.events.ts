import type { ConversationDto } from '@mini-chat/shared';

/** Emitted after a new conversation is created. */
export class ConversationCreatedEvent {
  static readonly event = 'conversation.created';

  constructor(public readonly conversation: ConversationDto) {}
}

/** Emitted when a member marks a conversation as read. */
export class ConversationReadEvent {
  static readonly event = 'conversation.read';

  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly lastReadAt: Date,
  ) {}
}
