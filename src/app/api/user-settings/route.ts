import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId, requireValidUser } from '@/lib/auth-utils';

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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
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
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
