import { fileURLToPath } from 'node:url';

const appName = 'Mini Chat';
const themeColor = '#10b981';

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',

  // A signed-in chat app has nothing to server-render or index, so it runs as a SPA.
  // This keeps auth simple (tokens live in the browser) and works well as a PWA.
  ssr: false,

  modules: ['@nuxt/ui', '@nuxt/eslint', '@pinia/nuxt', '@vueuse/nuxt', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  // Use components by file name (<MessageList>), whatever folder they are in.
  components: [{ path: '~/components', pathPrefix: false }],

  // Import the shared package straight from its TypeScript source (no build step needed).
  alias: {
    '@mini-chat/shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
  },

  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_API_URL.
      apiUrl: 'http://localhost:3001',
    },
  },

  app: {
    head: {
      title: appName,
      htmlAttrs: { lang: 'en' },
      meta: [
        // viewport-fit=cover lets the app draw under the notch (we pad with safe-area insets);
        // interactive-widget makes the on-screen keyboard shrink the page instead of covering it.
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
        },
        { name: 'description', content: 'A small realtime chat app.' },
        { name: 'theme-color', content: themeColor },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },

  pwa: {
    // Ask before activating a new version, so a message being typed is never lost.
    registerType: 'prompt',
    manifest: {
      name: appName,
      short_name: appName,
      description: 'A small realtime chat app.',
      theme_color: themeColor,
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/chats',
      scope: '/',
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      // Cache the app shell so it opens offline. API calls are never cached:
      // chat data must always be fresh.
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      // Error/fallback pages from `nuxt generate`; some static hosts can't serve them by clean URL,
      // which would make the service worker install fail.
      globIgnores: ['**/200.html', '**/404.html'],
      navigateFallback: '/',
    },
    client: { installPrompt: true },
    // Set to true to test the service worker with `pnpm dev`.
    devOptions: { enabled: false, type: 'module' },
  },

  icon: {
    // Bundle the icons we use so they also work offline.
    serverBundle: false,
    clientBundle: { scan: true },
  },

  devServer: { port: 3000 },
});
