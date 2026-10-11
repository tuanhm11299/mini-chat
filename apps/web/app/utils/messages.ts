import type { MessageDto } from '@mini-chat/shared';

/** A message as the UI shows it: either saved on the server, or still being sent. */
export interface ChatMessage extends MessageDto {
  status: 'sent' | 'sending' | 'failed';
}

export function toChatMessage(message: MessageDto): ChatMessage {
  return { ...message, status: 'sent' };
}

function compareMessages(a: MessageDto, b: MessageDto): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/**
 * Merges messages from the server into the list shown on screen:
 * - a message we already have (same id) is not added twice;
 * - our own optimistic message (same clientId) is replaced by the saved one;
 * - the result is ordered oldest → newest.
 */
export function mergeMessages(current: ChatMessage[], incoming: MessageDto[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  const pendingByClientId = new Map<string, ChatMessage>();
  for (const message of current) {
    if (message.status === 'sent') byId.set(message.id, message);
    else if (message.clientId) pendingByClientId.set(message.clientId, message);
  }
  for (const message of incoming) {
    byId.set(message.id, toChatMessage(message));
    if (message.clientId) pendingByClientId.delete(message.clientId);
  }

  const sent = [...byId.values()].sort(compareMessages);
  // Messages still being sent always stay at the bottom, in the order they were typed.
  return [...sent, ...pendingByClientId.values()];
}
