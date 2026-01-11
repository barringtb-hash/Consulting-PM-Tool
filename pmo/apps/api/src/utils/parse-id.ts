/**
 * ID Parsing Utility
 *
 * Shared utility for parsing route parameter IDs consistently across the API.
 */

import { Response } from 'express';

/**
 * Parse a route parameter ID to a number.
 *
 * @param id - The ID string from route params
 * @returns The parsed number, or null if invalid
 *
 * @example
 * const id = parseId(req.params.id);
 * if (id === null) {
 *   return res.status(400).json({ error: 'Invalid ID' });
 * }
 */
export function parseId(id: string | undefined): number | null {
  if (!id) return null;
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

/**
 * Parse and validate an ID from route params, sending an error response if invalid.
 *
 * @param id - The ID string from route params
 * @param res - Express response object
 * @param entityName - Name of the entity for error message (e.g., 'Account')
 * @returns The parsed ID, or null if invalid (response already sent)
 *
 * @example
 * const id = parseIdOrFail(req.params.id, res, 'Account');
 * if (!id) return; // Response already sent
 */
export function parseIdOrFail(
  id: string | undefined,
  res: Response,
  entityName = 'resource',
): number | null {
  const parsed = parseId(id);
  if (parsed === null) {
    res.status(400).json({
      error: `Invalid ${entityName} ID`,
      details: 'ID must be a positive integer',
    });
    return null;
  }
  return parsed;
}

/**
 * Parse multiple IDs from a comma-separated string.
 *
 * @param ids - Comma-separated ID string
 * @returns Array of valid parsed IDs (invalid ones are filtered out)
 *
 * @example
 * const ids = parseIds('1,2,invalid,3'); // Returns [1, 2, 3]
 */
export function parseIds(ids: string | undefined): number[] {
  if (!ids) return [];
  return ids
    .split(',')
    .map((id) => parseId(id.trim()))
    .filter((id): id is number => id !== null);
}
