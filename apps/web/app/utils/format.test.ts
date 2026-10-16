import { describe, expect, it } from 'vitest';
import { formatDayDivider, isSameDay } from './format';

describe('formatDayDivider', () => {
  const now = new Date(2026, 9, 11, 15, 0);

  it('uses relative labels for today and yesterday', () => {
    expect(formatDayDivider(new Date(2026, 9, 11, 8, 0).toISOString(), now)).toBe('Today');
    expect(formatDayDivider(new Date(2026, 9, 10, 23, 59).toISOString(), now)).toBe('Yesterday');
  });

  it('uses a full date for older days', () => {
    expect(formatDayDivider(new Date(2026, 9, 1).toISOString(), now)).toContain('2026');
  });
});

describe('isSameDay', () => {
  it('compares calendar days in local time', () => {
    const morning = new Date(2026, 9, 11, 0, 1).toISOString();
    const night = new Date(2026, 9, 11, 23, 59).toISOString();
    const nextDay = new Date(2026, 9, 12, 0, 1).toISOString();
    expect(isSameDay(morning, night)).toBe(true);
    expect(isSameDay(night, nextDay)).toBe(false);
  });
});
