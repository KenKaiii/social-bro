import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { ApiError, parseRapidApiError } from '@/lib/errors';
import { getCachedApiKey, setCachedApiKey } from '@/lib/cache';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Retryable status codes (transient errors)
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getRapidApiKey(userId: string): Promise<string> {
  // Check cache first
  const cached = getCachedApiKey(userId, 'rapidapi');
  if (cached) {
    return cached;
  }

  // Try to get from database for this user
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { userId_service: { userId, service: 'rapidapi' } },
  });

  if (apiKeyRecord) {
    try {
      const decrypted = decrypt(apiKeyRecord.key);
      setCachedApiKey(userId, 'rapidapi', decrypted);
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt RapidAPI key:', error);
      throw new ApiError(
        'Invalid RapidAPI key. Please re-enter it in Settings.',
        'RAPIDAPI_KEY_INVALID',
        400
      );
    }
  }

  // Fallback to environment variable
  const envKey = process.env.RAPIDAPI_KEY;
  if (envKey) {
    return envKey;
  }

  throw new ApiError('Add RapidAPI key in Settings', 'RAPIDAPI_NOT_CONFIGURED', 400);
}

export interface RapidApiRequestOptions {
  host: string;
  endpoint: string;
  params?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
}

export async function rapidApiFetch<T>(
  userId: string,
  options: RapidApiRequestOptions
): Promise<T> {
  const apiKey = await getRapidApiKey(userId);
  const { host, endpoint, params, method = 'GET', body } = options;

  const url = new URL(`https://${host}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': host,
          ...(body && { 'Content-Type': 'application/json' }),
        },
        ...(body && { body: JSON.stringify(body) }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = parseRapidApiError(response.status, errorText);

        // Only retry on transient errors
        if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
          console.warn(
            `RapidAPI request failed with ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
          );
          await sleep(delay);
          continue;
        }

        throw lastError;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      // Network errors (fetch failures)
      if (!(error instanceof ApiError)) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `RapidAPI network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
          );
          await sleep(delay);
          continue;
        }
        throw new ApiError('Network error. Please check your connection.', 'NETWORK_ERROR', 503);
      }
      throw error;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new ApiError('Request failed after retries', 'RAPIDAPI_ERROR', 500);
}
