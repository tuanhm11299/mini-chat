/** Sends signed-out visitors to /login, and signed-in users away from login/register. */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();
  await auth.restoreSession();

  if (!auth.isLoggedIn && !to.meta.public) {
    return navigateTo({
      path: '/login',
      query: to.fullPath !== '/' ? { redirect: to.fullPath } : {},
    });
  }
  if (auth.isLoggedIn && to.meta.public) {
    return navigateTo('/chats');
  }
});
