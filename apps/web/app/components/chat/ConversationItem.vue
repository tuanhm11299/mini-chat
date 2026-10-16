<script setup lang="ts">
import type { ConversationDto } from '@mini-chat/shared';

const props = defineProps<{ conversation: ConversationDto; active: boolean }>();
const { title, typingText, currentUserId } = useConversationDisplay(() => props.conversation);

const preview = computed(() => {
  const message = props.conversation.lastMessage;
  if (!message) return 'No messages yet';
  return message.senderId === currentUserId.value ? `You: ${message.body}` : message.body;
});
</script>

<template>
  <NuxtLink
    :to="`/chats/${props.conversation.id}`"
    class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
    :class="props.active ? 'bg-elevated' : 'hover:bg-elevated/50'"
  >
    <ConversationAvatar :conversation="props.conversation" size="lg" />

    <div class="min-w-0 flex-1">
      <div class="flex items-baseline justify-between gap-2">
        <span class="truncate font-medium">{{ title }}</span>
        <span class="shrink-0 text-xs text-muted">
          {{ formatListDate(props.conversation.lastMessageAt) }}
        </span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span v-if="typingText" class="truncate text-sm text-primary">{{ typingText }}</span>
        <span
          v-else
          class="truncate text-sm"
          :class="props.conversation.unreadCount ? 'font-medium text-highlighted' : 'text-muted'"
        >
          {{ preview }}
        </span>
        <UBadge
          v-if="props.conversation.unreadCount"
          :label="props.conversation.unreadCount > 99 ? '99+' : props.conversation.unreadCount"
          size="sm"
          class="shrink-0 rounded-full"
        />
      </div>
    </div>
  </NuxtLink>
</template>
