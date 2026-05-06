import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId, requireValidUser } from '@/lib/auth-utils';
import { handleApiError } from '@/lib/api-error';

// GET - Fetch user settings
export async function GET() {
  try {
    const userId = await requireUserId();

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Cache for 5 minutes - user-specific data
    return NextResponse.json(
      { selectedModelId: settings?.selectedModelId || null },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      }
    );
  } catch (error) {
    return handleApiError(error, 'Failed to fetch settings');
  }
}

// POST - Update user settings
export async function POST(request: NextRequest) {
  try {
    const userId = await requireValidUser();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { selectedModelId } = body as { selectedModelId?: string | null };

    await prisma.userSettings.upsert({
      where: { userId },
      update: { selectedModelId },
      create: { userId, selectedModelId },
    });

    return NextResponse.json({ success: true, selectedModelId });
  } catch (error) {
    return handleApiError(error, 'Failed to update settings');
  }
}
