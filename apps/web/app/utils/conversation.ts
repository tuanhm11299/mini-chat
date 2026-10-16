import type { ConversationDto, ConversationMemberDto } from '@mini-chat/shared';

/** In a direct chat, the person you are talking to. */
export function getOtherMember(
  conversation: ConversationDto,
  currentUserId: string,
): ConversationMemberDto | undefined {
  return conversation.members.find((member) => member.id !== currentUserId);
}

/** Group title, or the other person's name for direct chats. */
export function getConversationTitle(conversation: ConversationDto, currentUserId: string): string {
  if (conversation.type === 'group') return conversation.title ?? 'Group';
  return getOtherMember(conversation, currentUserId)?.displayName ?? 'Unknown user';
}

/** Most recently active first. */
export function sortConversations(conversations: ConversationDto[]): ConversationDto[] {
  return [...conversations].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}
