<script setup lang="ts">
import type { ChatMessage } from '~/utils/messages';

const props = defineProps<{
  message: ChatMessage;
  isOwn: boolean;
  /** Shown above the bubble in group chats. */
  senderName?: string;
  /** e.g. "Seen" or "Seen by Bob, Carol", shown under the bubble. */
  seenLabel?: string;
}>();
defineEmits<{ retry: [message: ChatMessage] }>();
</script>

<template>
  <div class="flex flex-col" :class="props.isOwn ? 'items-end' : 'items-start'">
    <span v-if="props.senderName" class="mb-0.5 px-3 text-xs text-muted">
      {{ props.senderName }}
    </span>

    <div
      class="max-w-[80%] rounded-2xl px-3 py-1.5 break-words whitespace-pre-wrap md:max-w-[65%]"
      :class="[
        props.isOwn ? 'rounded-br-md bg-primary text-inverted' : 'rounded-bl-md bg-elevated',
        { 'opacity-60': props.message.status === 'sending' },
      ]"
    >
      {{ props.message.body }}
      <span class="float-right mt-1.5 ml-2 text-[10px] leading-none opacity-70">
        {{ formatTime(props.message.createdAt) }}
      </span>
    </div>

    <button
      v-if="props.message.status === 'failed'"
      type="button"
      class="mt-0.5 flex items-center gap-1 px-1 text-xs text-error"
      @click="$emit('retry', props.message)"
    >
      <UIcon name="i-lucide-circle-alert" class="size-3.5" />
      Not sent. Tap to retry
    </button>
    <span v-else-if="props.seenLabel" class="mt-0.5 px-1 text-xs text-muted">
      {{ props.seenLabel }}
    </span>
  </div>
</template>
