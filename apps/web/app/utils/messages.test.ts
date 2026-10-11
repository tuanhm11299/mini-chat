import { describe, expect, it } from 'vitest';
import { type ChatMessage, mergeMessages } from './messages';

const message = (id: string, createdAt: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  conversationId: 'c1',
  senderId: 'u1',
  body: id,
  createdAt,
  status: 'sent',
  ...extra,
});

describe('mergeMessages', () => {
  it('orders messages oldest first and ignores duplicates', () => {
    const current = [message('b', '2026-01-01T10:01:00Z')];
    const incoming = [message('a', '2026-01-01T10:00:00Z'), message('b', '2026-01-01T10:01:00Z')];
    expect(mergeMessages(current, incoming).map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('replaces an optimistic message with the saved one', () => {
    const pending = message('tmp', '2026-01-01T10:05:00Z', { clientId: 'x1', status: 'sending' });
    const saved = message('real', '2026-01-01T10:05:01Z', { clientId: 'x1' });

    const result = mergeMessages([pending], [saved]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'real', status: 'sent' });
  });

  it('keeps messages that are still sending at the bottom', () => {
    const pending = message('tmp', '2026-01-01T09:00:00Z', { clientId: 'x1', status: 'sending' });
    const newer = message('n', '2026-01-01T10:00:00Z');
    expect(mergeMessages([pending], [newer]).map((m) => m.id)).toEqual(['n', 'tmp']);
  });
});
