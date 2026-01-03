/**
 * Date utility functions for consistent date handling across the application.
 */

/**
 * Convert a date string (YYYY-MM-DD) to UTC ISO string.
 * This avoids timezone and DST-related date shifts when sending dates to the API.
 * For example, "2026-01-03" in PST would otherwise become "2026-01-02" when
 * interpreted as midnight UTC.
 *
 * @param dateStr - Date string in YYYY-MM-DD format (may include time component which is ignored)
 * @returns UTC ISO string, or empty string if input is invalid
 */
export function toUTCISOString(dateStr: string): string {
  if (!dateStr) return '';

  // Allow optional time component (e.g., ISO string), but only use the date part
  const datePart = dateStr.split('T')[0];

  // Validate strict YYYY-MM-DD format
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) {
    return '';
  }

  const year = Number(match[1]);
  const month = Number(match[2]); // 1-12
  const day = Number(match[3]); // 1-31

  // Check for NaN values
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return '';
  }

  // Basic range validation
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  // Check if the date is valid
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  // Ensure the constructed date matches the input components
  // This catches invalid dates like 2024-02-31 or 2024-13-01
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  return date.toISOString();
}

/**
 * Format a date string (YYYY-MM-DD or ISO) to local display format.
 * Handles both HTML date input values and ISO date strings.
 *
 * @param dateStr - Date string in YYYY-MM-DD or ISO format
 * @returns Formatted date string (e.g., "Jan 3, 2026"), or empty string if invalid
 */
export function formatLocalDate(dateStr: string): string {
  if (!dateStr) return '';

  // Extract YYYY-MM-DD from ISO string if needed
  const datePart = dateStr.split('T')[0];

  // Validate strict YYYY-MM-DD format
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) {
    return '';
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Check for NaN values
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return '';
  }

  // Basic range validation
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }

  // Create date in local timezone
  const date = new Date(year, month - 1, day);

  // Check if the date is valid
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  // Ensure the constructed date matches the input components
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
