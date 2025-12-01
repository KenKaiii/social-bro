'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2, Lock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(!!token);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(!token ? 'No invite token provided' : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) return;

    // Verify token
    fetch(`/api/auth/set-password?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setIsValid(true);
          setEmail(data.email);
        } else {
          setError(data.error || 'Invalid invite link');
        }
      })
      .catch(() => setError('Failed to verify invite link'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to set password');
        setIsSubmitting(false);
        return;
      }

      toast.success('Password set! Signing in...');

      // Auto sign in
      const result = await signIn('credentials', {
        email: data.email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Password set but auto-login failed. Please login manually.');
        router.push('/login');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (error || !isValid) {
    return (
      <div className="text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-xl font-medium text-white mb-2">Invalid Invite</h2>
        <p className="text-white/50 mb-6">{error || 'This invite link is invalid or has expired.'}</p>
        <Link
          href="/login"
          className="text-white/70 hover:text-white underline"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
        <h1 className="font-[family-name:var(--font-doto)] text-3xl font-medium tracking-tight text-white mb-2">
          Set your password
        </h1>
        <p className="text-sm text-white/50">
          Welcome! Create a password for <span className="text-white">{email}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-white/60 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                disabled={isSubmitting}
                required
                className={cn(
                  'w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4',
                  'text-white placeholder:text-white/30',
                  'focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10',
                  'transition-colors duration-200',
                  'disabled:opacity-50'
                )}
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-white/60 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isSubmitting}
                required
                className={cn(
                  'w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4',
                  'text-white placeholder:text-white/30',
                  'focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10',
                  'transition-colors duration-200',
                  'disabled:opacity-50'
                )}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full rounded-xl border border-white/20 bg-white/10 py-3 px-4',
              'text-sm font-medium text-white',
              'hover:bg-white/20 hover:border-white/30',
              'focus:outline-none focus:ring-2 focus:ring-white/20',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting password...
              </>
            ) : (
              'Set password & sign in'
            )}
          </button>
        </form>
      </div>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          }
        >
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
