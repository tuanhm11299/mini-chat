<script setup lang="ts">
import type { AvatarProps } from '@nuxt/ui';

const props = defineProps<{
  name: string;
  src?: string | null;
  online?: boolean;
  size?: AvatarProps['size'];
}>();
</script>

<template>
  <!-- With no image, UAvatar shows the initials taken from `alt`. -->
  <UAvatar
    :src="props.src ?? undefined"
    :alt="props.name"
    :size="props.size ?? 'md'"
    :chip="props.online ? { color: 'success', position: 'bottom-right', inset: true } : false"
  />
</template>
