'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.15em] text-white/30">
        <div className="h-4 w-4 animate-pulse rounded-full bg-white/10" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const displayName = session.user.name || session.user.email?.split('@')[0] || 'User';

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-white/50">
        <User className="h-4 w-4" />
        <span>{displayName}</span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-white/50 transition-colors hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  );
}
