import type { ConversationDto, MessageDto, ReadUpdatedPayload } from '@mini-chat/shared';

export const useConversationsStore = defineStore('conversations', () => {
  const api = useApi();
  const auth = useAuthStore();

  /** Sorted most recently active first. */
  const items = ref<ConversationDto[]>([]);
  const loaded = ref(false);
  /** The conversation currently open on screen (set by pages/chats/[id].vue). */
  const activeId = ref<string | null>(null);

  const totalUnread = computed(() => items.value.reduce((sum, c) => sum + c.unreadCount, 0));

  function findById(id: string) {
    return items.value.find((conversation) => conversation.id === id);
  }

  function upsert(conversation: ConversationDto) {
    const others = items.value.filter((c) => c.id !== conversation.id);
    items.value = sortConversations([...others, conversation]);
  }

  async function fetchAll() {
    items.value = sortConversations(await api<ConversationDto[]>('/conversations'));
    loaded.value = true;
  }

  async function fetchOne(id: string) {
    const conversation = await api<ConversationDto>(`/conversations/${id}`);
    upsert(conversation);
    return conversation;
  }

  async function startDirect(userId: string) {
    const conversation = await api<ConversationDto>('/conversations/direct', {
      method: 'POST',
      body: { userId },
    });
    upsert(conversation);
    return conversation;
  }

  async function createGroup(title: string, memberIds: string[]) {
    const conversation = await api<ConversationDto>('/conversations/group', {
      method: 'POST',
      body: { title, memberIds },
    });
    upsert(conversation);
    return conversation;
  }

  /** Keeps the list preview, order and unread badge in sync with new messages. */
  function onMessage(message: MessageDto) {
    const conversation = findById(message.conversationId);
    if (!conversation) {
      // A conversation we haven't loaded yet (e.g. someone just added us).
      void fetchOne(message.conversationId);
      return;
    }
    if (conversation.lastMessage?.id === message.id) return;

    const isOwn = message.senderId === auth.user?.id;
    const isBeingRead =
      activeId.value === conversation.id && document.visibilityState === 'visible';
    upsert({
      ...conversation,
      lastMessage: message,
      lastMessageAt: message.createdAt,
      unreadCount: isOwn || isBeingRead ? conversation.unreadCount : conversation.unreadCount + 1,
    });
  }

  async function markAsRead(id: string) {
    const conversation = findById(id);
    if (conversation) conversation.unreadCount = 0;
    await api(`/conversations/${id}/read`, { method: 'POST' });
  }

  function onReadUpdated({ conversationId, userId, lastReadAt }: ReadUpdatedPayload) {
    const conversation = findById(conversationId);
    const member = conversation?.members.find((m) => m.id === userId);
    if (member) member.lastReadAt = lastReadAt;
    if (conversation && userId === auth.user?.id) conversation.unreadCount = 0;
  }

  return {
    items,
    loaded,
    activeId,
    totalUnread,
    findById,
    upsert,
    fetchAll,
    fetchOne,
    startDirect,
    createGroup,
    onMessage,
    markAsRead,
    onReadUpdated,
  };
});
