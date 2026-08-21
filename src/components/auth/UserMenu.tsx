'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-white/30">...</span>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const displayName = session.user.name || session.user.email?.split('@')[0] || 'User';

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs font-medium text-white/50 sm:inline">{displayName}</span>
      {/* YouTube API Services policies require the privacy policy to stay
          reachable at all times while the app is in use. */}
      <Link
        href="/privacy"
        className="hidden text-xs font-medium text-white/60 hover:text-white sm:inline"
      >
        Privacy
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );
}
