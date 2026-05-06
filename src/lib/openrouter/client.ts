import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { ApiError, parseOpenRouterError } from '@/lib/errors';
import { getCachedApiKey, setCachedApiKey } from '@/lib/cache';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export async function getOpenRouterApiKey(userId: string): Promise<string> {
  // Check cache first
  const cached = getCachedApiKey(userId, 'openrouter');
  if (cached) {
    return cached;
  }

  // Try to get from database for this user
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { userId_service: { userId, service: 'openrouter' } },
  });

  if (apiKeyRecord) {
    try {
      const decrypted = decrypt(apiKeyRecord.key);
      setCachedApiKey(userId, 'openrouter', decrypted);
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt OpenRouter API key:', error);
      throw new ApiError(
        'Invalid OpenRouter API key. Please re-enter it in Settings.',
        'OPENROUTER_KEY_INVALID',
        400
      );
    }
  }

  // Fallback to environment variable
  const envKey = process.env.OPENROUTER_API_KEY;
  if (envKey) {
    return envKey;
  }

  throw new ApiError('Add OpenRouter API key in Settings', 'OPENROUTER_NOT_CONFIGURED', 400);
}

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string; // Price per token as string
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

/**
 * Fetch all available models from OpenRouter
 * Note: This endpoint doesn't require authentication
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw parseOpenRouterError(response.status, errorText);
  }

  const data: OpenRouterModelsResponse = await response.json();
  return data.data;
}

export interface ChatCompletionOptions {
  userId: string;
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Make a chat completion request to OpenRouter
 */
export async function createChatCompletion({
  userId,
  model,
  messages,
  temperature = 0.7,
  max_tokens,
}: ChatCompletionOptions): Promise<ChatCompletionResponse> {
  const apiKey = await getOpenRouterApiKey(userId);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer':
        process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'Social Bro',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      ...(max_tokens && { max_tokens }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw parseOpenRouterError(response.status, errorText);
  }

  return response.json();
}
