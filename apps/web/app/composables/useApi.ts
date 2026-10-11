type ApiOptions = NonNullable<Parameters<typeof $fetch>[1]>;

/**
 * Returns a `$fetch` wrapper for the API that:
 * - prefixes the API base URL (`/conversations` → `http://localhost:3001/api/conversations`);
 * - adds the access token;
 * - on a 401, refreshes the token once and retries, or sends the user to /login.
 */
export function useApi() {
  const auth = useAuthStore();
  const { apiUrl } = useRuntimeConfig().public;

  const send = <T>(path: string, options: ApiOptions) =>
    $fetch<T>(path, {
      ...options,
      baseURL: `${apiUrl}/api`,
      headers: auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
    });

  return async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
    try {
      return await send<T>(path, options);
    } catch (error) {
      if (getErrorStatus(error) !== 401) throw error;
      if (!(await auth.refresh())) {
        await navigateTo('/login');
        throw error;
      }
      return send<T>(path, options);
    }
  };
}
