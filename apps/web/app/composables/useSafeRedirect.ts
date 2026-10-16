/** The `?redirect=` target after login, restricted to paths inside this app. */
export function useSafeRedirect(fallback = '/chats') {
  const route = useRoute();
  return computed(() => {
    const target = route.query.redirect;
    // "//evil.com" would leave the app, so only accept single-slash paths.
    return typeof target === 'string' && /^\/(?!\/)/.test(target) ? target : fallback;
  });
}
