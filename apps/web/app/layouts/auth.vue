<template>
  <div
    class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted px-4 py-[max(2rem,env(safe-area-inset-top))]"
  >
    <div class="flex items-center gap-2 text-xl font-semibold">
      <img src="/logo.svg" alt="" class="size-8" />
      Mini Chat
    </div>
    <div class="w-full max-w-sm">
      <slot />
    </div>
  </div>
</template>
