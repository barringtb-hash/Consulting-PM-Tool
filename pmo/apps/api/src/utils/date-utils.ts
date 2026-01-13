/**
 * Date Utility Functions
 *
 * Safe date parsing and validation utilities for API endpoints.
 */

/**
 * Safely parse a date string. Returns undefined if the input is empty or invalid.
 * @param dateString - The date string to parse
 * @returns A valid Date object or undefined
 */
export function parseDateSafe(
  dateString: string | undefined,
): Date | undefined {
  if (!dateString || typeof dateString !== 'string') {
    return undefined;
  }

  const parsed = new Date(dateString);

  // Check if the date is valid
  if (isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

/**
 * Parse a date string and throw an error if invalid.
 * @param dateString - The date string to parse
 * @param fieldName - The field name for error messages
 * @returns A valid Date object
 * @throws Error if the date is invalid
 */
export function parseDateStrict(
  dateString: string,
  fieldName: string = 'date',
): Date {
  const parsed = new Date(dateString);

  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${dateString}`);
  }

  return parsed;
}

/**
 * Validate that a Date object is valid.
 * @param date - The Date object to validate
 * @returns true if valid, false otherwise
 */
export function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

/**
 * Get a default date range (last 30 days)
 * @returns An object with start and end dates
 */
export function getDefaultDateRange(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end };
}
