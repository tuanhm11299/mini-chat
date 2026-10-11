const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const longDateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
}

/** "14:05" */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** Short label for the conversation list: "14:05", "Mon" or "3 Oct". */
export function formatListDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = daysAgo(date, now);
  if (days === 0) return timeFormat.format(date);
  if (days < 7) return weekdayFormat.format(date);
  return dateFormat.format(date);
}

/** Divider label between days in a conversation: "Today", "Yesterday" or a full date. */
export function formatDayDivider(iso: string, now = new Date()): string {
  const days = daysAgo(new Date(iso), now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return longDateFormat.format(new Date(iso));
}

export function isSameDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}
