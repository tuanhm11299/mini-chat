import type { AuthResponse, CurrentUserDto } from '@mini-chat/shared';

/**
 * Who is signed in.
 *
 * The access token lives in memory only (never localStorage), so it can't be stolen by
 * injected scripts. On page load we get a fresh one from the httpOnly refresh cookie.
 */
export const useAuthStore = defineStore('auth', () => {
  const { apiUrl } = useRuntimeConfig().public;

  const user = ref<CurrentUserDto | null>(null);
  const accessToken = ref<string | null>(null);
  /** True once we have checked for an existing session on startup. */
  const initialized = ref(false);
  const isLoggedIn = computed(() => user.value !== null && accessToken.value !== null);

  let refreshing: Promise<boolean> | null = null;

  function postAuth<T>(path: string, body?: object) {
    return $fetch<T>(`/api/auth/${path}`, {
      baseURL: apiUrl,
      method: 'POST',
      body,
      credentials: 'include', // send/receive the refresh cookie
    });
  }

  function setSession(response: AuthResponse) {
    user.value = response.user;
    accessToken.value = response.accessToken;
  }

  async function login(email: string, password: string) {
    setSession(await postAuth<AuthResponse>('login', { email, password }));
  }

  async function register(email: string, displayName: string, password: string) {
    setSession(await postAuth<AuthResponse>('register', { email, displayName, password }));
  }

  /**
   * Swaps the refresh cookie for a new access token. Returns false if the session is gone.
   * Concurrent callers share one request, so a burst of 401s triggers a single refresh.
   */
  function refresh(): Promise<boolean> {
    refreshing ??= postAuth<AuthResponse>('refresh')
      .then((response) => {
        setSession(response);
        return true;
      })
      .catch((error: unknown) => {
        // Only a 401 means the session is over; a network error might be temporary.
        if (getErrorStatus(error) === 401) {
          user.value = null;
          accessToken.value = null;
        }
        return false;
      })
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  }

  async function restoreSession() {
    if (initialized.value) return;
    await refresh();
    initialized.value = true;
  }

  async function logout() {
    await postAuth('logout').catch(() => {});
    // A full reload is the simplest way to clear every store and close the socket.
    reloadNuxtApp({ path: '/login' });
  }

  function setUser(updated: CurrentUserDto) {
    user.value = updated;
  }

  return {
    user,
    accessToken,
    initialized,
    isLoggedIn,
    login,
    register,
    refresh,
    restoreSession,
    logout,
    setUser,
  };
});
