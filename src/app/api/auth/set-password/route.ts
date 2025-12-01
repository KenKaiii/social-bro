import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find user by invite token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 400 });
    }

    if (user.password) {
      return NextResponse.json({ error: 'Password already set. Please login.' }, { status: 400 });
    }

    // Hash password and update user
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        inviteToken: null, // Clear the token
        createdAt: new Date(), // Mark as activated
      },
    });

    return NextResponse.json({
      success: true,
      email: user.email,
      message: 'Password set successfully. You can now login.',
    });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}

// Check if token is valid
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: { email: true, name: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired invite link' });
    }

    if (user.password) {
      return NextResponse.json({ valid: false, error: 'Password already set' });
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Check token error:', error);
    return NextResponse.json({ error: 'Failed to check token' }, { status: 500 });
  }
}
