<script setup lang="ts">
import { MESSAGE_MAX_LENGTH } from '@mini-chat/shared';

const props = defineProps<{ conversationId: string }>();
const emit = defineEmits<{ send: [body: string] }>();

const { $realtime } = useNuxtApp();
const draft = ref('');
const canSend = computed(() => draft.value.trim().length > 0);

// On a desktop keyboard Enter sends (Shift+Enter = new line). On phones Enter adds a new line
// and the send button sends, which is what people expect from mobile chat apps.
const hasPhysicalKeyboard = useMediaQuery('(pointer: fine)');

// --- Typing indicator: "typing" at most every 2s while typing, "stopped" after 3s idle.
let typingSentAt = 0;
let stopTimer: ReturnType<typeof setTimeout> | undefined;

function onInput() {
  if (Date.now() - typingSentAt > 2000) {
    $realtime.sendTyping(props.conversationId, true);
    typingSentAt = Date.now();
  }
  clearTimeout(stopTimer);
  stopTimer = setTimeout(stopTyping, 3000);
}

function stopTyping() {
  clearTimeout(stopTimer);
  if (!typingSentAt) return;
  $realtime.sendTyping(props.conversationId, false);
  typingSentAt = 0;
}

function send() {
  const body = draft.value.trim();
  if (!body) return;
  emit('send', body);
  draft.value = '';
  stopTyping();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && hasPhysicalKeyboard.value) {
    event.preventDefault();
    send();
  }
}

// Switching conversations: tell the previous one we stopped typing and clear the box.
watch(
  () => props.conversationId,
  (_id, previousId) => {
    if (previousId && typingSentAt) $realtime.sendTyping(previousId, false);
    typingSentAt = 0;
    draft.value = '';
  },
);
onBeforeUnmount(stopTyping);
</script>

<template>
  <form
    class="flex shrink-0 items-end gap-2 border-t border-default px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    @submit.prevent="send"
  >
    <UTextarea
      v-model="draft"
      placeholder="Message"
      :rows="1"
      :maxrows="6"
      autoresize
      :maxlength="MESSAGE_MAX_LENGTH"
      enterkeyhint="send"
      class="flex-1"
      :ui="{ base: 'rounded-2xl' }"
      @input="onInput"
      @keydown="onKeydown"
      @blur="stopTyping"
    />
    <UButton
      type="submit"
      icon="i-lucide-send-horizontal"
      :disabled="!canSend"
      aria-label="Send"
      class="rounded-full"
      size="lg"
    />
  </form>
</template>
