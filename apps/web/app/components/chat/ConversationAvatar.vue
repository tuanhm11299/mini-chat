<script setup lang="ts">
import type { ConversationDto } from '@mini-chat/shared';
import type { AvatarProps } from '@nuxt/ui';

const props = defineProps<{ conversation: ConversationDto; size?: AvatarProps['size'] }>();
const { otherMember, isOnline, title } = useConversationDisplay(() => props.conversation);
</script>

<template>
  <UserAvatar
    v-if="otherMember"
    :name="otherMember.displayName"
    :src="otherMember.avatarUrl"
    :online="isOnline"
    :size="props.size"
  />
  <UAvatar v-else icon="i-lucide-users" :alt="title" :size="props.size ?? 'md'" />
</template>
