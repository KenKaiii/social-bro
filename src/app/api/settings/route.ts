import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';
import { requireUserId, requireValidUser } from '@/lib/auth-utils';
import { invalidateCachedApiKey } from '@/lib/cache';

export type ApiKeyService = 'youtube' | 'rapidapi' | 'openrouter';

interface ApiKeyResponse {
  service: ApiKeyService;
  maskedKey: string | null;
  hasKey: boolean;
}

// GET - Fetch all API keys (masked) for current user
export async function GET() {
  try {
    const userId = await requireUserId();

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
    });

    const services: ApiKeyService[] = ['youtube', 'rapidapi', 'openrouter'];
    const response: ApiKeyResponse[] = services.map((service) => {
      const found = apiKeys.find((k: (typeof apiKeys)[number]) => k.service === service);
      if (found) {
        try {
          const decrypted = decrypt(found.key);
          return {
            service,
            maskedKey: maskApiKey(decrypted),
            hasKey: true,
          };
        } catch {
          // Key exists but can't be decrypted (wrong encryption secret)
          // Treat as if no key exists - user will need to re-enter
          console.warn(`Failed to decrypt ${service} API key - encryption secret may have changed`);
          return {
            service,
            maskedKey: null,
            hasKey: false,
          };
        }
      }
      return {
        service,
        maskedKey: null,
        hasKey: false,
      };
    });

    // Cache for 5 minutes - user-specific data
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

// POST - Save or update an API key for current user
export async function POST(request: Request) {
  try {
    const userId = await requireValidUser();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { service, key } = body as { service: ApiKeyService; key: string };

    if (!service || !key) {
      return NextResponse.json({ error: 'Service and key are required' }, { status: 400 });
    }

    const validServices: ApiKeyService[] = ['youtube', 'rapidapi', 'openrouter'];
    if (!validServices.includes(service)) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    const encryptedKey = encrypt(key);

    await prisma.apiKey.upsert({
      where: {
        userId_service: { userId, service },
      },
      update: { key: encryptedKey },
      create: { userId, service, key: encryptedKey },
    });

    // Invalidate cached key so next request fetches fresh data
    invalidateCachedApiKey(userId, service);

    return NextResponse.json({
      success: true,
      service,
      maskedKey: maskApiKey(key),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'InvalidSession') {
        return NextResponse.json(
          { error: 'Session invalid. Please log out and log in again.' },
          { status: 401 }
        );
      }
    }
    console.error('Failed to save API key:', error);
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
  }
}

// DELETE - Remove an API key for current user
export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');

    if (!service) {
      return NextResponse.json({ error: 'Service is required' }, { status: 400 });
    }

    const validServices: ApiKeyService[] = ['youtube', 'rapidapi', 'openrouter'];
    if (!validServices.includes(service as ApiKeyService)) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    // Check if the key exists before deleting
    const existing = await prisma.apiKey.findUnique({
      where: {
        userId_service: { userId, service },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: {
        userId_service: { userId, service },
      },
    });

    // Invalidate cached key
    invalidateCachedApiKey(userId, service);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to delete API key:', error);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
