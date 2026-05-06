import { NextResponse } from 'next/server';
import { getErrorMessage, isApiError } from './errors';

/**
 * Standard API route error handler. Maps known auth errors, `ApiError`
 * instances, and unknown failures into a clean JSON response carrying a
 * human-readable message safe to display to end users.
 *
 * Server-only — relies on `next/server`. Use as:
 *
 * ```ts
 * } catch (error) {
 *   return handleApiError(error, 'Failed to do thing');
 * }
 * ```
 */
export function handleApiError(error: unknown, fallback = 'Request failed'): NextResponse {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 });
    }
    if (error.message === 'InvalidSession') {
      return NextResponse.json(
        { error: 'Your session has expired. Please sign in again.' },
        { status: 401 }
      );
    }
  }

  if (isApiError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json({ error: getErrorMessage(error, fallback) }, { status: 500 });
}
