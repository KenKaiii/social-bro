'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || 'Failed to create account');
          setIsLoading(false);
          return;
        }

        toast.success('Account created! Signing in...');
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid email or password');
        setIsLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'signup' && (
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-white/60 mb-2">
            Name (optional)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={isLoading}
              className={cn(
                'w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-3 pl-10 pr-4',
                'text-white placeholder:text-white/30',
                'focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10',
                'transition-colors duration-200',
                'disabled:opacity-50'
              )}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-xs font-medium text-white/60 mb-2">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            required
            className={cn(
              'w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-3 pl-10 pr-4',
              'text-white placeholder:text-white/30',
              'focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10',
              'transition-colors duration-200',
              'disabled:opacity-50'
            )}
          />
        </div>
      </div>

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
            placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'}
            disabled={isLoading}
            required
            className={cn(
              'w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-3 pl-10 pr-4',
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
        disabled={isLoading}
        className={cn(
          'w-full rounded-xl border border-white/20 bg-[#2a2a2a] py-3 px-4',
          'text-sm font-medium text-white',
          'hover:bg-[#3a3a3a] hover:border-white/30',
          'focus:outline-none focus:ring-2 focus:ring-white/20',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'flex items-center justify-center gap-2'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
          </>
        ) : mode === 'signup' ? (
          'Create account'
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
