<script setup lang="ts">
import type { ConversationDto } from '@mini-chat/shared';
import type { ChatMessage } from '~/utils/messages';

const props = defineProps<{
  conversation: ConversationDto;
  messages: ChatMessage[];
  currentUserId: string;
  hasMore: boolean;
  loadingOlder: boolean;
}>();
const emit = defineEmits<{ loadOlder: []; retry: [message: ChatMessage] }>();

const scroller = useTemplateRef<HTMLElement>('scroller');

/** Each message plus what to draw around it (day divider, sender name, "Seen"). */
const rows = computed(() => {
  const isGroup = props.conversation.type === 'group';
  const lastOwnSent = props.messages.findLast(
    (m) => m.senderId === props.currentUserId && m.status === 'sent',
  );

  return props.messages.map((message, index) => {
    const previous = props.messages[index - 1];
    const isOwn = message.senderId === props.currentUserId;
    const newDay = !previous || !isSameDay(previous.createdAt, message.createdAt);
    const showSender = isGroup && !isOwn && (newDay || previous?.senderId !== message.senderId);
    return {
      message,
      isOwn,
      dayLabel: newDay ? formatDayDivider(message.createdAt) : undefined,
      senderName: showSender ? memberName(message.senderId) : undefined,
      seenLabel: message === lastOwnSent ? seenLabel(message) : undefined,
    };
  });
});

function memberName(userId: string) {
  return props.conversation.members.find((m) => m.id === userId)?.displayName ?? 'Unknown';
}

function seenLabel(message: ChatMessage): string | undefined {
  const readers = props.conversation.members.filter(
    (m) => m.id !== props.currentUserId && m.lastReadAt >= message.createdAt,
  );
  if (readers.length === 0) return undefined;
  if (props.conversation.type === 'direct') return 'Seen';
  return `Seen by ${readers.map((m) => m.displayName).join(', ')}`;
}

// --- Scrolling -------------------------------------------------------------

function isNearBottom() {
  const el = scroller.value;
  return !!el && el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

function scrollToBottom() {
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight });
}

// New message at the bottom: follow it if we were already at the bottom or sent it ourselves.
watch(
  () => props.messages.at(-1)?.id,
  async () => {
    const last = props.messages.at(-1);
    const follow = isNearBottom() || last?.senderId === props.currentUserId;
    await nextTick();
    if (follow) scrollToBottom();
  },
);

// Older messages added at the top: keep the messages on screen where they were.
watch(
  () => props.messages[0]?.id,
  async (_newFirst, oldFirst) => {
    const el = scroller.value;
    if (!el || !oldFirst) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop;
    await nextTick();
    el.scrollTop = el.scrollHeight - distanceFromBottom;
  },
);

function onScroll() {
  const el = scroller.value;
  if (el && el.scrollTop < 200 && props.hasMore && !props.loadingOlder) emit('loadOlder');
}

onMounted(scrollToBottom);
</script>

<template>
  <div ref="scroller" class="flex-1 overflow-y-auto px-3 py-4 md:px-6" @scroll.passive="onScroll">
    <div v-if="props.loadingOlder" class="flex justify-center pb-3">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
    </div>
    <p
      v-else-if="!props.hasMore && props.messages.length"
      class="pb-3 text-center text-xs text-dimmed"
    >
      This is the beginning of the conversation.
    </p>

    <div class="space-y-1.5">
      <template v-for="row in rows" :key="row.message.clientId ?? row.message.id">
        <div v-if="row.dayLabel" class="py-2 text-center">
          <span class="rounded-full bg-elevated px-3 py-1 text-xs text-muted">{{
            row.dayLabel
          }}</span>
        </div>
        <MessageBubble
          :message="row.message"
          :is-own="row.isOwn"
          :sender-name="row.senderName"
          :seen-label="row.seenLabel"
          @retry="emit('retry', $event)"
        />
      </template>
    </div>

    <UEmpty
      v-if="props.messages.length === 0"
      icon="i-lucide-hand"
      title="Say hello!"
      description="Send the first message to start the conversation."
      variant="naked"
      class="h-full"
    />
  </div>
</template>
