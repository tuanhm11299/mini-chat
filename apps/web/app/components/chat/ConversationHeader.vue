<script setup lang="ts">
import type { ConversationDto } from '@mini-chat/shared';

const props = defineProps<{ conversation: ConversationDto }>();
const { title, isDirect, isOnline, typingText } = useConversationDisplay(() => props.conversation);

const subtitle = computed(() => {
  if (typingText.value) return typingText.value;
  if (isDirect.value) return isOnline.value ? 'Online' : 'Offline';
  return `${props.conversation.members.length} members`;
});
</script>

<template>
  <header
    class="flex shrink-0 items-center gap-2 border-b border-default px-2 pt-[env(safe-area-inset-top)] md:px-4"
  >
    <!-- On phones the list and the chat are separate screens, so we need a way back. -->
    <UButton
      to="/chats"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      aria-label="Back to chats"
      class="md:hidden"
    />
    <div class="flex min-w-0 items-center gap-3 py-2">
      <ConversationAvatar :conversation="props.conversation" />
      <div class="min-w-0">
        <h2 class="truncate font-semibold">{{ title }}</h2>
        <p class="truncate text-xs" :class="typingText ? 'text-primary' : 'text-muted'">
          {{ subtitle }}
        </p>
      </div>
    </div>
  </header>
</template>
