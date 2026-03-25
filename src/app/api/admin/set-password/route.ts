import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function validateAdminSecret() {
  if (!ADMIN_SECRET) {
    throw new Error('ADMIN_SECRET environment variable must be configured');
  }
  return ADMIN_SECRET;
}

// Admin sets a password directly for a user
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
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json({ error: 'userId and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        inviteToken: null,
        createdAt: user.createdAt || new Date(),
      },
    });

    return NextResponse.json({
      email: user.email,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    console.error('Admin set password error:', error);
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}
