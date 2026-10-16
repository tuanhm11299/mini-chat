<script setup lang="ts">
const conversations = useConversationsStore();
defineEmits<{ newChat: [] }>();
</script>

<template>
  <div v-if="!conversations.loaded" class="space-y-2 p-3">
    <div v-for="n in 6" :key="n" class="flex items-center gap-3 px-3 py-2">
      <USkeleton class="size-10 rounded-full" />
      <div class="flex-1 space-y-2">
        <USkeleton class="h-4 w-1/2" />
        <USkeleton class="h-3 w-3/4" />
      </div>
    </div>
  </div>

  <UEmpty
    v-else-if="conversations.items.length === 0"
    icon="i-lucide-message-circle"
    title="No conversations yet"
    description="Start a chat with someone to see it here."
    :actions="[{ label: 'New chat', icon: 'i-lucide-square-pen', onClick: () => $emit('newChat') }]"
    class="m-4"
  />

  <nav v-else class="space-y-0.5 p-2">
    <ConversationItem
      v-for="conversation in conversations.items"
      :key="conversation.id"
      :conversation="conversation"
      :active="conversation.id === conversations.activeId"
    />
  </nav>
</template>
