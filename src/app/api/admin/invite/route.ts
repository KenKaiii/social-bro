import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

// Simple admin secret for now - you can use this via curl or a script
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name } = await request.json();

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
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
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

// List all invited users (for admin)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
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
      users: users.map((u) => ({
        ...u,
        status: u.createdAt ? 'active' : 'pending',
      })),
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
