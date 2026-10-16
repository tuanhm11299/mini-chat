<script setup lang="ts">
// Android/desktop Chrome fire `beforeinstallprompt`, which @vite-pwa/nuxt exposes as
// `$pwa.showInstallPrompt`. iOS Safari has no such event, so we show instructions instead.
const { $pwa } = useNuxtApp();

const isStandalone = useMediaQuery('(display-mode: standalone)');
const isIos = computed(() => /iphone|ipad|ipod/i.test(navigator.userAgent));
const canPrompt = computed(() => !!$pwa?.showInstallPrompt && !$pwa.isPWAInstalled);
</script>

<template>
  <UCard v-if="!isStandalone && (canPrompt || isIos)">
    <div class="flex items-center gap-3">
      <UIcon name="i-lucide-smartphone" class="size-6 shrink-0 text-primary" />
      <div class="flex-1 text-sm">
        <p class="font-medium">Install Mini Chat</p>
        <p v-if="canPrompt" class="text-muted">Add it to your home screen like a native app.</p>
        <p v-else class="text-muted">
          Tap <UIcon name="i-lucide-share" class="inline size-4 align-text-bottom" /> Share, then
          “Add to Home Screen”.
        </p>
      </div>
      <UButton v-if="canPrompt" size="sm" @click="$pwa?.install()">Install</UButton>
    </div>
  </UCard>
</template>
