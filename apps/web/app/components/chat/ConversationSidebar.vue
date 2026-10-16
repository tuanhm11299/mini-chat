<script setup lang="ts">
const auth = useAuthStore();
const newChatOpen = ref(false);
</script>

<template>
  <header
    class="flex shrink-0 items-center justify-between border-b border-default px-4 pt-[env(safe-area-inset-top)]"
  >
    <h1 class="py-3 text-lg font-semibold">Chats</h1>
    <div class="flex items-center gap-1">
      <UButton
        icon="i-lucide-square-pen"
        color="neutral"
        variant="ghost"
        aria-label="New chat"
        @click="newChatOpen = true"
      />
      <UButton to="/settings" color="neutral" variant="ghost" aria-label="Settings" class="p-1">
        <UserAvatar :name="auth.user?.displayName ?? ''" :src="auth.user?.avatarUrl" size="sm" />
      </UButton>
    </div>
  </header>

  <div class="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
    <ConversationList @new-chat="newChatOpen = true" />
  </div>

  <NewChatModal v-model:open="newChatOpen" />
</template>
