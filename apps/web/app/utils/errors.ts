/** HTTP status of a failed `$fetch` call, or undefined for network errors. */
export function getErrorStatus(error: unknown): number | undefined {
  return (error as { statusCode?: number } | null)?.statusCode;
}

/** A human-readable message from an API error (NestJS sends `message` as a string or list). */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const message = (error as { data?: { message?: string | string[] } } | null)?.data?.message;
  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string') return message;
  if (getErrorStatus(error) === undefined) return 'Cannot reach the server. Check your connection.';
  return fallback;
}
