<script setup lang="ts">
// Small notices pinned to the top of the screen: offline, reconnecting, new version available.
const { $pwa, $realtime } = useNuxtApp();
const auth = useAuthStore();
const online = useOnline();

// Wait a moment before showing "Connecting…" so it doesn't flash on every page load.
const connected = computed(() => $realtime.connected.value);
const showReconnecting = refDebounced(
  computed(() => auth.isLoggedIn && online.value && !connected.value),
  1500,
);
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[max(0.5rem,env(safe-area-inset-top))]"
  >
    <div
      v-if="!online"
      class="flex items-center gap-2 rounded-full bg-inverted px-3 py-1.5 text-sm text-inverted shadow"
    >
      <UIcon name="i-lucide-wifi-off" class="size-4" />
      You are offline
    </div>
    <div
      v-else-if="showReconnecting"
      class="flex items-center gap-2 rounded-full bg-inverted px-3 py-1.5 text-sm text-inverted shadow"
    >
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
      Connecting…
    </div>

    <div
      v-if="$pwa?.needRefresh"
      class="pointer-events-auto flex items-center gap-3 rounded-lg bg-default py-2 pr-2 pl-4 text-sm shadow-lg ring ring-default"
    >
      A new version is available.
      <UButton size="sm" @click="$pwa.updateServiceWorker()">Reload</UButton>
    </div>
  </div>
</template>
