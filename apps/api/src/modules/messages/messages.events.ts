import type { MessageDto } from '@mini-chat/shared';

/** Emitted (via EventEmitter2) after a message is saved. RealtimeModule pushes it to clients. */
export class MessageCreatedEvent {
  static readonly event = 'message.created';

  constructor(public readonly message: MessageDto) {}
}
