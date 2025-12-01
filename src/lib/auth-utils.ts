import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

/**
 * Gets the user ID and validates that the user exists in the database.
 * Use this for operations that write to tables with userId foreign keys.
 * Throws 'Unauthorized' if no session, 'InvalidSession' if user doesn't exist.
 */
export async function requireValidUser(): Promise<string> {
  const userId = await requireUserId();

  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userExists) {
    throw new Error('InvalidSession');
  }

  return userId;
}
