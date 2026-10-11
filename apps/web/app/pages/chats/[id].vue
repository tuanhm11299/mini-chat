<script setup lang="ts">
import type { ChatMessage } from '~/utils/messages';

const route = useRoute();
const auth = useAuthStore();
const conversations = useConversationsStore();
const messages = useMessagesStore();
const toast = useToast();

const conversationId = computed(() => String(route.params.id));
const conversation = computed(() => conversations.findById(conversationId.value));
const history = computed(() => messages.byConversation[conversationId.value]);
const loadError = ref('');

useHead({
  title: () =>
    conversation.value ? getConversationTitle(conversation.value, auth.user!.id) : 'Chat',
});

watch(
  conversationId,
  async (id) => {
    conversations.activeId = id;
    loadError.value = '';
    try {
      if (!conversations.findById(id)) await conversations.fetchOne(id);
      await messages.loadLatest(id);
    } catch (error) {
      loadError.value = getErrorMessage(error, 'Could not open this conversation');
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  conversations.activeId = null;
});

// --- Read state: tell the server whenever we have seen new messages from others.
const myLastReadAt = computed(
  () => conversation.value?.members.find((m) => m.id === auth.user?.id)?.lastReadAt ?? '',
);
const markAsRead = useDebounceFn(() => {
  const latest = history.value?.items.findLast((m) => m.senderId !== auth.user?.id);
  const hasUnseen =
    (conversation.value?.unreadCount ?? 0) > 0 ||
    (!!latest && latest.status === 'sent' && latest.createdAt > myLastReadAt.value);
  if (hasUnseen && document.visibilityState === 'visible') {
    conversations.markAsRead(conversationId.value).catch(() => {});
  }
}, 300);
watch(() => [history.value?.items.at(-1)?.id, myLastReadAt.value], markAsRead, { immediate: true });
useEventListener(document, 'visibilitychange', markAsRead);

function send(body: string) {
  void messages.send(conversationId.value, body);
}

function retry(message: ChatMessage) {
  void messages.retry(message);
}

async function loadOlder() {
  try {
    await messages.loadOlder(conversationId.value);
  } catch (error) {
    toast.add({ title: getErrorMessage(error, 'Could not load older messages'), color: 'error' });
  }
}
</script>

<template>
  <UEmpty
    v-if="loadError"
    icon="i-lucide-circle-alert"
    :title="loadError"
    :actions="[{ label: 'Back to chats', to: '/chats', color: 'neutral', variant: 'subtle' }]"
    variant="naked"
    class="h-full"
  />

  <div v-else-if="conversation" class="flex h-full min-h-0 flex-col">
    <ConversationHeader :conversation="conversation" />
    <MessageList
      v-if="history?.loaded"
      :key="conversation.id"
      :conversation="conversation"
      :messages="history.items"
      :current-user-id="auth.user!.id"
      :has-more="history.nextCursor !== null"
      :loading-older="history.loadingOlder"
      @load-older="loadOlder"
      @retry="retry"
    />
    <div v-else class="flex flex-1 items-center justify-center">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
    </div>
    <MessageComposer :conversation-id="conversation.id" @send="send" />
  </div>

  <div v-else class="flex h-full items-center justify-center">
    <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
  </div>
</template>
