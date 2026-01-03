/**
 * Date Utilities Tests
 *
 * Tests for date parsing and formatting utilities that handle
 * timezone-safe date conversions.
 */

import { describe, it, expect } from 'vitest';
import { toUTCISOString, formatLocalDate } from './dateUtils';

describe('toUTCISOString', () => {
  describe('valid inputs', () => {
    it('converts YYYY-MM-DD to UTC ISO string', () => {
      const result = toUTCISOString('2026-01-03');
      expect(result).toBe('2026-01-03T00:00:00.000Z');
    });

    it('handles first day of month', () => {
      const result = toUTCISOString('2024-03-01');
      expect(result).toBe('2024-03-01T00:00:00.000Z');
    });

    it('handles last day of month', () => {
      const result = toUTCISOString('2024-01-31');
      expect(result).toBe('2024-01-31T00:00:00.000Z');
    });

    it('handles leap year Feb 29', () => {
      const result = toUTCISOString('2024-02-29');
      expect(result).toBe('2024-02-29T00:00:00.000Z');
    });

    it('extracts date part from ISO string with time', () => {
      const result = toUTCISOString('2026-01-03T15:30:00.000Z');
      expect(result).toBe('2026-01-03T00:00:00.000Z');
    });

    it('handles year boundaries', () => {
      expect(toUTCISOString('2024-12-31')).toBe('2024-12-31T00:00:00.000Z');
      expect(toUTCISOString('2025-01-01')).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('invalid inputs', () => {
    it('returns empty string for empty input', () => {
      expect(toUTCISOString('')).toBe('');
    });

    it('returns empty string for null-like input', () => {
      expect(toUTCISOString(null as unknown as string)).toBe('');
      expect(toUTCISOString(undefined as unknown as string)).toBe('');
    });

    it('returns empty string for invalid format', () => {
      expect(toUTCISOString('01-03-2026')).toBe(''); // MM-DD-YYYY
      expect(toUTCISOString('03/01/2026')).toBe(''); // MM/DD/YYYY
      expect(toUTCISOString('2026/01/03')).toBe(''); // YYYY/MM/DD
      expect(toUTCISOString('Jan 3, 2026')).toBe(''); // text format
      expect(toUTCISOString('20260103')).toBe(''); // no separators
    });

    it('returns empty string for incomplete date', () => {
      expect(toUTCISOString('2026-01')).toBe('');
      expect(toUTCISOString('2026')).toBe('');
      expect(toUTCISOString('2026-1-3')).toBe(''); // missing leading zeros
    });

    it('returns empty string for invalid month', () => {
      expect(toUTCISOString('2026-00-15')).toBe(''); // month 0
      expect(toUTCISOString('2026-13-15')).toBe(''); // month 13
    });

    it('returns empty string for invalid day', () => {
      expect(toUTCISOString('2026-01-00')).toBe(''); // day 0
      expect(toUTCISOString('2026-01-32')).toBe(''); // day 32
    });

    it('returns empty string for impossible dates', () => {
      expect(toUTCISOString('2024-02-31')).toBe(''); // Feb 31
      expect(toUTCISOString('2023-02-29')).toBe(''); // Feb 29 non-leap year
      expect(toUTCISOString('2024-04-31')).toBe(''); // Apr 31
      expect(toUTCISOString('2024-06-31')).toBe(''); // Jun 31
      expect(toUTCISOString('2024-09-31')).toBe(''); // Sep 31
      expect(toUTCISOString('2024-11-31')).toBe(''); // Nov 31
    });

    it('returns empty string for random strings', () => {
      expect(toUTCISOString('hello')).toBe('');
      expect(toUTCISOString('not-a-date')).toBe('');
      expect(toUTCISOString('2026-XX-YY')).toBe('');
    });
  });
});

describe('formatLocalDate', () => {
  describe('valid inputs', () => {
    it('formats YYYY-MM-DD to readable format', () => {
      const result = formatLocalDate('2026-01-03');
      expect(result).toBe('Jan 3, 2026');
    });

    it('formats different months correctly', () => {
      expect(formatLocalDate('2024-02-15')).toBe('Feb 15, 2024');
      expect(formatLocalDate('2024-06-20')).toBe('Jun 20, 2024');
      expect(formatLocalDate('2024-12-25')).toBe('Dec 25, 2024');
    });

    it('extracts date part from ISO string with time', () => {
      const result = formatLocalDate('2026-01-03T15:30:00.000Z');
      expect(result).toBe('Jan 3, 2026');
    });

    it('handles leap year Feb 29', () => {
      const result = formatLocalDate('2024-02-29');
      expect(result).toBe('Feb 29, 2024');
    });
  });

  describe('invalid inputs', () => {
    it('returns empty string for empty input', () => {
      expect(formatLocalDate('')).toBe('');
    });

    it('returns empty string for null-like input', () => {
      expect(formatLocalDate(null as unknown as string)).toBe('');
      expect(formatLocalDate(undefined as unknown as string)).toBe('');
    });

    it('returns empty string for invalid format', () => {
      expect(formatLocalDate('01-03-2026')).toBe('');
      expect(formatLocalDate('not-a-date')).toBe('');
    });

    it('returns empty string for impossible dates', () => {
      expect(formatLocalDate('2024-02-31')).toBe('');
      expect(formatLocalDate('2023-02-29')).toBe('');
    });

    it('returns empty string for invalid month/day', () => {
      expect(formatLocalDate('2026-00-15')).toBe('');
      expect(formatLocalDate('2026-13-15')).toBe('');
      expect(formatLocalDate('2026-01-00')).toBe('');
      expect(formatLocalDate('2026-01-32')).toBe('');
    });
  });
});
