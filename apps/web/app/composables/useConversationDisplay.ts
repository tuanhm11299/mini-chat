import type { ConversationDto } from '@mini-chat/shared';

/** Everything needed to show a conversation in the list or the header. */
export function useConversationDisplay(conversation: MaybeRefOrGetter<ConversationDto>) {
  const auth = useAuthStore();
  const presence = usePresenceStore();

  const currentUserId = computed(() => auth.user?.id ?? '');
  const isDirect = computed(() => toValue(conversation).type === 'direct');

  const title = computed(() => getConversationTitle(toValue(conversation), currentUserId.value));

  /** The other person in a direct chat (undefined for groups). */
  const otherMember = computed(() =>
    isDirect.value ? getOtherMember(toValue(conversation), currentUserId.value) : undefined,
  );

  const isOnline = computed(() => !!otherMember.value && presence.isOnline(otherMember.value.id));

  /** "typing…", "Bob is typing…" or "3 people are typing…"; empty when nobody types. */
  const typingText = computed(() => {
    const { id, members } = toValue(conversation);
    const names = presence
      .typingIn(id)
      .map((userId) => members.find((member) => member.id === userId)?.displayName)
      .filter(Boolean);
    if (names.length === 0) return '';
    if (isDirect.value) return 'typing…';
    return names.length === 1 ? `${names[0]} is typing…` : `${names.length} people are typing…`;
  });

  return { currentUserId, isDirect, title, otherMember, isOnline, typingText };
}
