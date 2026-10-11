import type { CursorPage, MessageDto } from '@mini-chat/shared';
import type { ChatMessage } from '~/utils/messages';

interface ConversationMessages {
  /** Oldest → newest, including messages still being sent. */
  items: ChatMessage[];
  /** Cursor for the next older page; null when the beginning has been reached. */
  nextCursor: string | null;
  loaded: boolean;
  loadingOlder: boolean;
}

/** Message history per conversation, loaded lazily when a conversation is opened. */
export const useMessagesStore = defineStore('messages', () => {
  const api = useApi();
  const auth = useAuthStore();
  const conversations = useConversationsStore();

  const byConversation = ref<Record<string, ConversationMessages>>({});

  function stateFor(conversationId: string): ConversationMessages {
    byConversation.value[conversationId] ??= {
      items: [],
      nextCursor: null,
      loaded: false,
      loadingOlder: false,
    };
    return byConversation.value[conversationId];
  }

  function fetchPage(conversationId: string, before?: string) {
    return api<CursorPage<MessageDto>>(`/conversations/${conversationId}/messages`, {
      query: before ? { before } : {},
    });
  }

  /** Loads the newest page. Also used after reconnecting, to catch up on missed messages. */
  async function loadLatest(conversationId: string) {
    const page = await fetchPage(conversationId);
    const state = stateFor(conversationId);
    const unsent = state.items.filter((message) => message.status !== 'sent');
    state.items = mergeMessages(unsent, page.items);
    state.nextCursor = page.nextCursor;
    state.loaded = true;
  }

  async function loadOlder(conversationId: string) {
    const state = stateFor(conversationId);
    if (!state.nextCursor || state.loadingOlder) return;
    state.loadingOlder = true;
    try {
      const page = await fetchPage(conversationId, state.nextCursor);
      state.items = mergeMessages(state.items, page.items);
      state.nextCursor = page.nextCursor;
    } finally {
      state.loadingOlder = false;
    }
  }

  /** Shows the message immediately, then replaces it with the saved one (or marks it failed). */
  async function send(
    conversationId: string,
    body: string,
    clientId: string = crypto.randomUUID(),
  ) {
    const state = stateFor(conversationId);
    const pending: ChatMessage = {
      id: clientId,
      clientId,
      conversationId,
      senderId: auth.user!.id,
      body,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    state.items = [...state.items.filter((m) => m.clientId !== clientId), pending];

    try {
      const saved = await api<MessageDto>(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { body, clientId },
      });
      receive(saved);
    } catch {
      const failed = state.items.find((m) => m.clientId === clientId && m.status === 'sending');
      if (failed) failed.status = 'failed';
    }
  }

  function retry(message: ChatMessage) {
    return send(message.conversationId, message.body, message.clientId);
  }

  /** A message from the server (our own POST response or a socket push). Safe to call twice. */
  function receive(message: MessageDto) {
    const state = byConversation.value[message.conversationId];
    if (state?.loaded) state.items = mergeMessages(state.items, [message]);
    conversations.onMessage(message);
  }

  return { byConversation, stateFor, loadLatest, loadOlder, send, retry, receive };
});
