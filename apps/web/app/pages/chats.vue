<script setup lang="ts">
// Parent of /chats and /chats/:id. On wide screens the list and the open chat sit side by side;
// on phones only one of them is visible at a time.
const route = useRoute();
const conversations = useConversationsStore();
const toast = useToast();

const isChatOpen = computed(() => route.name === 'chats-id');

onMounted(async () => {
  if (conversations.loaded) return;
  try {
    await conversations.fetchAll();
  } catch (error) {
    toast.add({ title: getErrorMessage(error, 'Could not load your chats'), color: 'error' });
  }
});

useHead({
  titleTemplate: () => (conversations.totalUnread ? `(${conversations.totalUnread}) %s` : '%s'),
});
</script>

<template>
  <div class="flex h-full">
    <aside
      class="w-full flex-col md:flex md:w-80 md:border-r md:border-default lg:w-96"
      :class="isChatOpen ? 'hidden' : 'flex'"
    >
      <ConversationSidebar />
    </aside>
    <main class="min-w-0 flex-1 flex-col md:flex" :class="isChatOpen ? 'flex' : 'hidden'">
      <NuxtPage />
    </main>
  </div>
</template>
