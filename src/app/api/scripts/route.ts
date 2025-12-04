import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId, requireValidUser } from '@/lib/auth-utils';

// GET - Fetch all scripts for current user
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const offset = Number(searchParams.get('offset')) || 0;
    const status = searchParams.get('status'); // optional filter

    const scripts = await prisma.script.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Transform to match frontend types
    const transformed = scripts.map((script) => ({
      id: script.id,
      title: script.title,
      caption: script.caption,
      script: script.script,
      repurposedScript: script.repurposedScript,
      hooks: script.hooks,
      notes: script.notes,
      status: script.status,
      createdAt: script.createdAt.toISOString(),
      updatedAt: script.updatedAt.toISOString(),
    }));

    return NextResponse.json({ scripts: transformed });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching scripts:', error);
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 });
  }
}

// POST - Create a new script
export async function POST(request: NextRequest) {
  try {
    const userId = await requireValidUser();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { title, caption, script, notes, status } = body as {
      title: string;
      caption?: string;
      script: string;
      notes?: string;
      status?: string;
    };

    if (!title || !script) {
      return NextResponse.json({ error: 'Title and script are required' }, { status: 400 });
    }

    const newScript = await prisma.script.create({
      data: {
        userId,
        title,
        caption: caption || null,
        script,
        notes: notes || null,
        status: status || 'draft',
      },
    });

    return NextResponse.json({
      success: true,
      script: {
        id: newScript.id,
        title: newScript.title,
        caption: newScript.caption,
        script: newScript.script,
        notes: newScript.notes,
        status: newScript.status,
        createdAt: newScript.createdAt.toISOString(),
        updatedAt: newScript.updatedAt.toISOString(),
      },
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
    console.error('Error creating script:', error);
    return NextResponse.json({ error: 'Failed to create script' }, { status: 500 });
  }
}

// PUT - Update an existing script
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireValidUser();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { id, title, caption, script, notes, status } = body as {
      id: string;
      title?: string;
      caption?: string;
      script?: string;
      notes?: string;
      status?: string;
    };

    if (!id) {
      return NextResponse.json({ error: 'Script ID is required' }, { status: 400 });
    }

    // Make sure the script belongs to this user
    const existing = await prisma.script.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    const updated = await prisma.script.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(caption !== undefined ? { caption } : {}),
        ...(script !== undefined ? { script } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      script: {
        id: updated.id,
        title: updated.title,
        caption: updated.caption,
        script: updated.script,
        notes: updated.notes,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
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
    console.error('Error updating script:', error);
    return NextResponse.json({ error: 'Failed to update script' }, { status: 500 });
  }
}

// DELETE - Remove a script
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing script ID' }, { status: 400 });
    }

    // Make sure the script belongs to this user
    const existing = await prisma.script.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    await prisma.script.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting script:', error);
    return NextResponse.json({ error: 'Failed to delete script' }, { status: 500 });
  }
}
