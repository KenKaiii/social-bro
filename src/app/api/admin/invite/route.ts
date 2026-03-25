import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

// Admin secret - must be configured in production
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function validateAdminSecret() {
  if (!ADMIN_SECRET) {
    throw new Error('ADMIN_SECRET environment variable must be configured');
  }
  return ADMIN_SECRET;
}

export async function POST(request: Request) {
  try {
    const adminSecret = validateAdminSecret();
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate invite token
    const inviteToken = randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        inviteToken,
      },
    });

    // Build the invite URL
    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      throw new Error('NEXTAUTH_URL environment variable must be configured');
    }
    const inviteUrl = `${baseUrl}/set-password?token=${inviteToken}`;

    return NextResponse.json({
      id: user.id,
      email: user.email,
      inviteUrl,
      message: 'User invited. Share the invite URL with them.',
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 });
  }
}

// Reset password for an existing user (generates new invite token)
export async function PATCH(request: Request) {
  try {
    const adminSecret = validateAdminSecret();
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate a new invite token and clear password
    const inviteToken = randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: userId },
      data: {
        inviteToken,
        password: null,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      throw new Error('NEXTAUTH_URL environment variable must be configured');
    }
    const resetUrl = `${baseUrl}/set-password?token=${inviteToken}`;

    return NextResponse.json({
      email: user.email,
      resetUrl,
      message: 'Password reset. Share the reset URL with the user.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

// List all invited users (for admin)
export async function GET(request: Request) {
  try {
    const adminSecret = validateAdminSecret();
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        invitedAt: true,
        createdAt: true, // null if not yet activated
      },
      orderBy: { invitedAt: 'desc' },
    });

    return NextResponse.json({
      users: users.map((u: (typeof users)[number]) => ({
        ...u,
        status: u.createdAt ? 'active' : 'pending',
      })),
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
