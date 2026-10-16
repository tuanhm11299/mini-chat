import { TYPING_TIMEOUT_MS, type TypingUpdatedPayload } from '@mini-chat/shared';

/** Who is online and who is typing where. Fed by the realtime plugin. */
export const usePresenceStore = defineStore('presence', () => {
  const onlineUserIds = ref(new Set<string>());
  /** conversationId → user ids currently typing there. */
  const typing = ref<Record<string, string[]>>({});
  const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function isOnline(userId: string) {
    return onlineUserIds.value.has(userId);
  }

  function markOnline(userIds: string[]) {
    userIds.forEach((id) => onlineUserIds.value.add(id));
  }

  function setOnline(userId: string, online: boolean) {
    if (online) onlineUserIds.value.add(userId);
    else onlineUserIds.value.delete(userId);
  }

  function setTyping({ conversationId, userId, isTyping }: TypingUpdatedPayload) {
    const key = `${conversationId}:${userId}`;
    clearTimeout(typingTimers.get(key));
    typingTimers.delete(key);

    const others = (typing.value[conversationId] ?? []).filter((id) => id !== userId);
    typing.value[conversationId] = isTyping ? [...others, userId] : others;

    if (isTyping) {
      // If the "stopped typing" signal is lost (closed tab, bad network), expire it ourselves.
      typingTimers.set(
        key,
        setTimeout(() => setTyping({ conversationId, userId, isTyping: false }), TYPING_TIMEOUT_MS),
      );
    }
  }

  function typingIn(conversationId: string): string[] {
    return typing.value[conversationId] ?? [];
  }

  /** Called when the socket drops: we no longer know who is online. */
  function reset() {
    onlineUserIds.value.clear();
    typing.value = {};
    typingTimers.forEach((timer) => clearTimeout(timer));
    typingTimers.clear();
  }

  return { onlineUserIds, isOnline, markOnline, setOnline, setTyping, typingIn, reset };
});
