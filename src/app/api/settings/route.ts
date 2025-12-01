import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';
import { requireUserId, requireValidUser } from '@/lib/auth-utils';

export type ApiKeyService = 'youtube' | 'rapidapi';

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

    const services: ApiKeyService[] = ['youtube', 'rapidapi'];
    const response: ApiKeyResponse[] = services.map((service) => {
      const found = apiKeys.find((k) => k.service === service);
      if (found) {
        const decrypted = decrypt(found.key);
        return {
          service,
          maskedKey: maskApiKey(decrypted),
          hasKey: true,
        };
      }
      return {
        service,
        maskedKey: null,
        hasKey: false,
      };
    });

    return NextResponse.json(response);
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

    const body = await request.json();
    const { service, key } = body as { service: ApiKeyService; key: string };

    if (!service || !key) {
      return NextResponse.json({ error: 'Service and key are required' }, { status: 400 });
    }

    const validServices: ApiKeyService[] = ['youtube', 'rapidapi'];
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

    const validServices: ApiKeyService[] = ['youtube', 'rapidapi'];
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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to delete API key:', error);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
