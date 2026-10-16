import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Run `pnpm generate:icons` after changing public/logo.svg to regenerate every app icon.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
});
