import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Unit tests for plain TypeScript helpers in app/utils (no Nuxt runtime needed). */
export default defineConfig({
  resolve: {
    alias: {
      '@mini-chat/shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
    },
  },
  test: {
    include: ['app/**/*.test.ts'],
  },
});
