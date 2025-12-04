'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, UserPlus, Copy, Check, Users, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string | null;
  status: 'active' | 'pending';
  invitedAt: string;
  createdAt: string | null;
}

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchUsers = useCallback(async (secret: string) => {
    if (!secret) return false;

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/invite', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        return true;
      } else {
        toast.error(data.error || 'Invalid admin secret');
        return false;
      }
    } catch {
      toast.error('Failed to verify admin secret');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret) return;

    setIsVerifying(true);
    const success = await fetchUsers(adminSecret);
    setIsVerified(success);
    setIsVerifying(false);
  };

  const handleRefresh = () => {
    fetchUsers(adminSecret);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !adminSecret) return;

    setIsSubmitting(true);
    setInviteLink('');

    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to invite user');
        return;
      }

      toast.success('User invited!');
      setInviteLink(data.inviteUrl);
      setEmail('');
      fetchUsers(adminSecret);
    } catch {
      toast.error('Failed to invite user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-[family-name:var(--font-doto)] text-3xl font-medium tracking-tight text-white mb-2">
            Admin Panel
          </h1>
          <p className="text-sm text-white/50">Invite users to the platform</p>
        </div>

        {/* Admin Secret Input */}
        {!isVerified && (
          <form
            onSubmit={handleVerify}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
          >
            <label className="block text-xs font-medium text-white/60 mb-2">Admin Secret</label>
            <div className="flex gap-3">
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Enter admin secret to continue"
                disabled={isVerifying}
                className={cn(
                  'flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 px-4',
                  'text-white placeholder:text-white/30',
                  'focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10',
                  'disabled:opacity-50'
                )}
              />
              <button
                type="submit"
                disabled={isVerifying || !adminSecret}
                className={cn(
                  'rounded-xl border border-white/20 bg-white/10 py-3 px-6',
                  'text-sm font-medium text-white',
                  'hover:bg-white/20 hover:border-white/30',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </button>
            </div>
          </form>
        )}

        {isVerified && (
          <>
            {/* Invite Form */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite New User
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    disabled={isSubmitting}
                    required
                    className={cn(
                      'w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 px-4',
                      'text-white placeholder:text-white/30',
                      'focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10',
                      'disabled:opacity-50'
                    )}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full rounded-xl border border-white/20 bg-white/10 py-3 px-4',
                    'text-sm font-medium text-white',
                    'hover:bg-white/20 hover:border-white/30',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Send Invite
                    </>
                  )}
                </button>
              </form>

              {inviteLink && (
                <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-2">Invite link created:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm text-white/80 bg-black/20 p-2 rounded overflow-x-auto">
                      {inviteLink}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-white/60" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Users List */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users ({users.length})
                </h2>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className={cn(
                    'p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  title="Refresh users"
                >
                  <RefreshCw className={cn('h-4 w-4 text-white/60', isLoading && 'animate-spin')} />
                </button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-white/40 text-center py-8">No users yet</p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5"
                    >
                      <div>
                        <p className="text-white">{user.email}</p>
                        {user.name && <p className="text-xs text-white/40">{user.name}</p>}
                      </div>
                      <span
                        className={cn(
                          'text-xs px-2 py-1 rounded-full',
                          user.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        )}
                      >
                        {user.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
