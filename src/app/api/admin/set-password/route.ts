import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';
import { authorizeAdmin } from '@/lib/admin-auth';
import { validatePassword } from '@/lib/password';

// Admin sets a password directly for a user
export async function POST(request: Request) {
  try {
    const admin = await authorizeAdmin(request);
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
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

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
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
        // Revokes every JWT issued before now, so an admin-forced reset
        // actually evicts an attacker who already holds a session.
        passwordChangedAt: new Date(),
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
