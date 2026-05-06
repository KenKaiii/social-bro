/**
 * Custom API error class with user-friendly messages
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Parse RapidAPI error response and return user-friendly message
 */
export function parseRapidApiError(status: number, responseText: string): ApiError {
  // Try to parse JSON error
  let errorMessage = '';
  try {
    const json = JSON.parse(responseText);
    errorMessage = json.message || json.error || json.detail || '';
  } catch {
    errorMessage = responseText;
  }

  switch (status) {
    case 401:
      return new ApiError('Invalid RapidAPI key', 'RAPIDAPI_INVALID_KEY', 401);
    case 403:
      if (errorMessage.toLowerCase().includes('not subscribed')) {
        return new ApiError('Not subscribed to this API', 'RAPIDAPI_NOT_SUBSCRIBED', 403);
      }
      return new ApiError('API access forbidden', 'RAPIDAPI_FORBIDDEN', 403);
    case 404:
      return new ApiError('API endpoint not found', 'RAPIDAPI_NOT_FOUND', 404);
    case 429:
      return new ApiError('Rate limit exceeded', 'RAPIDAPI_RATE_LIMIT', 429);
    case 500:
    case 502:
    case 503:
      return new ApiError('API temporarily unavailable', 'RAPIDAPI_SERVER_ERROR', status);
    default:
      // Return a shortened version of the error
      const shortMsg = errorMessage.slice(0, 100) || 'Request failed';
      return new ApiError(shortMsg, 'RAPIDAPI_ERROR', status);
  }
}

/**
 * Parse YouTube API error and return user-friendly message
 */
export function parseYouTubeError(error: unknown): ApiError {
  // Handle googleapis GaxiosError structure
  const gaxiosError = error as {
    response?: {
      status?: number;
      data?: {
        error?: {
          code?: number;
          message?: string;
          errors?: Array<{
            reason?: string;
            message?: string;
          }>;
        };
      };
    };
    message?: string;
    code?: string | number;
  };

  const status = gaxiosError.response?.status || 500;
  const apiError = gaxiosError.response?.data?.error;
  const reason = apiError?.errors?.[0]?.reason || '';
  const message = apiError?.message || gaxiosError.message || '';

  // Map common YouTube API errors to user-friendly messages
  switch (reason) {
    case 'keyInvalid':
      return new ApiError('Invalid YouTube API key', 'YOUTUBE_INVALID_KEY', 401);
    case 'quotaExceeded':
    case 'dailyLimitExceeded':
      return new ApiError('YouTube API quota exceeded', 'YOUTUBE_QUOTA_EXCEEDED', 429);
    case 'rateLimitExceeded':
      return new ApiError('YouTube rate limit exceeded', 'YOUTUBE_RATE_LIMIT', 429);
    case 'forbidden':
      return new ApiError('YouTube API access forbidden', 'YOUTUBE_FORBIDDEN', 403);
    case 'notFound':
    case 'channelNotFound':
    case 'videoNotFound':
      return new ApiError('Channel or video not found', 'YOUTUBE_NOT_FOUND', 404);
    case 'accessNotConfigured':
      return new ApiError('YouTube API not enabled for this key', 'YOUTUBE_NOT_ENABLED', 403);
    case 'playlistNotFound':
      return new ApiError('Playlist not found', 'YOUTUBE_NOT_FOUND', 404);
    default:
      break;
  }

  // Fallback based on status code
  switch (status) {
    case 400:
      return new ApiError('Invalid request', 'YOUTUBE_BAD_REQUEST', 400);
    case 401:
      return new ApiError('Invalid YouTube API key', 'YOUTUBE_INVALID_KEY', 401);
    case 403:
      if (message.toLowerCase().includes('quota')) {
        return new ApiError('YouTube API quota exceeded', 'YOUTUBE_QUOTA_EXCEEDED', 429);
      }
      return new ApiError('YouTube API access forbidden', 'YOUTUBE_FORBIDDEN', 403);
    case 404:
      return new ApiError('Not found', 'YOUTUBE_NOT_FOUND', 404);
    case 429:
      return new ApiError('YouTube rate limit exceeded', 'YOUTUBE_RATE_LIMIT', 429);
    default:
      // Return shortened error
      const shortMsg = message.slice(0, 100) || 'YouTube request failed';
      return new ApiError(shortMsg, 'YOUTUBE_ERROR', status);
  }
}

/**
 * Parse OpenRouter error response and return user-friendly message.
 * OpenRouter returns errors as `{ error: { message, code } }`.
 */
export function parseOpenRouterError(status: number, responseText: string): ApiError {
  let upstreamMessage = '';
  try {
    const json = JSON.parse(responseText);
    upstreamMessage = json?.error?.message || json?.message || '';
  } catch {
    upstreamMessage = responseText;
  }

  const lower = upstreamMessage.toLowerCase();

  switch (status) {
    case 401:
      return new ApiError(
        'Invalid OpenRouter API key. Update it in Settings.',
        'OPENROUTER_INVALID_KEY',
        401
      );
    case 402:
      return new ApiError(
        'OpenRouter credits exhausted. Top up at openrouter.ai/settings/credits.',
        'OPENROUTER_INSUFFICIENT_CREDITS',
        402
      );
    case 403:
      return new ApiError(
        'OpenRouter access forbidden — your key may lack permission for this model.',
        'OPENROUTER_FORBIDDEN',
        403
      );
    case 404:
      return new ApiError(
        'Selected model is unavailable. Pick a different model in Settings.',
        'OPENROUTER_MODEL_NOT_FOUND',
        404
      );
    case 408:
    case 504:
      return new ApiError(
        'OpenRouter request timed out. Please try again.',
        'OPENROUTER_TIMEOUT',
        status
      );
    case 429:
      if (lower.includes('credit') || lower.includes('insufficient')) {
        return new ApiError(
          'OpenRouter credits exhausted. Top up at openrouter.ai/settings/credits.',
          'OPENROUTER_INSUFFICIENT_CREDITS',
          402
        );
      }
      return new ApiError(
        'OpenRouter rate limit hit. Please try again in a moment.',
        'OPENROUTER_RATE_LIMIT',
        429
      );
    case 502:
    case 503:
      return new ApiError(
        'OpenRouter is temporarily unavailable. Try again shortly.',
        'OPENROUTER_UNAVAILABLE',
        status
      );
    default: {
      if (lower.includes('insufficient') && lower.includes('credit')) {
        return new ApiError(
          'OpenRouter credits exhausted. Top up at openrouter.ai/settings/credits.',
          'OPENROUTER_INSUFFICIENT_CREDITS',
          402
        );
      }
      const shortMsg = upstreamMessage.slice(0, 140) || 'OpenRouter request failed';
      return new ApiError(shortMsg, 'OPENROUTER_ERROR', status);
    }
  }
}

/**
 * Check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Strip noisy patterns out of an upstream error message so it's safe to
 * surface to a user (no raw JSON, no provider prefixes, sensible length).
 */
function sanitizeMessage(raw: string): string {
  let msg = raw.trim();

  // Pattern: "OpenRouter API error: {\"error\":{...}}" → extract inner message.
  const jsonStart = msg.indexOf('{');
  if (jsonStart >= 0 && msg.lastIndexOf('}') > jsonStart) {
    const candidate = msg.slice(jsonStart);
    try {
      const parsed = JSON.parse(candidate);
      const inner =
        parsed?.error?.message ||
        parsed?.message ||
        parsed?.error ||
        parsed?.detail ||
        '';
      if (typeof inner === 'string' && inner.trim()) {
        msg = inner.trim();
      } else {
        // JSON but no obvious message — drop the JSON blob
        msg = msg.slice(0, jsonStart).trim().replace(/[:\-\s]+$/, '');
      }
    } catch {
      // Not valid JSON — drop everything from the brace onwards
      msg = msg.slice(0, jsonStart).trim().replace(/[:\-\s]+$/, '');
    }
  }

  // Strip common provider prefixes like "OpenRouter API error: foo"
  msg = msg.replace(/^[A-Za-z][\w\s]*?\s*API\s*error\s*:\s*/i, '');

  // Collapse whitespace
  msg = msg.replace(/\s+/g, ' ').trim();

  if (!msg) return 'An unexpected error occurred';

  // Keep it to one sentence-ish (first 160 chars, snap to sentence end)
  if (msg.length > 160) {
    const truncated = msg.slice(0, 160);
    const lastStop = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('! '),
      truncated.lastIndexOf('? ')
    );
    msg = lastStop > 60 ? truncated.slice(0, lastStop + 1) : truncated + '\u2026';
  }

  return msg;
}

/**
 * Get user-friendly error message from any error.
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return sanitizeMessage(error.message) || fallback;
  }
  if (typeof error === 'string') {
    return sanitizeMessage(error) || fallback;
  }
  return fallback;
}


