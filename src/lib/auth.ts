import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { authConfig } from './auth.config';

/**
 * A real bcrypt hash (of a random value) compared against when the account
 * does not exist, so that login timing does not reveal whether an email is
 * registered. Must be cost-12 to match the hashes we store.
 */
const DUMMY_HASH = '$2b$12$5bm.bxSF4OPNnHq.tNrI3.1qM4kZCvsV5jiySZjDhZz8Avyx.G6Sy';

/** How often to re-check the DB for password-change/account-deletion revocation. */
const REVALIDATE_INTERVAL_MS = 60_000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Throttle online guessing. Auth.js runs outside the middleware
        // matcher, so this is the only brute-force control on the login path.
        const rateLimitKey = `login:${email.toLowerCase()}`;
        const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.auth);
        if (!rateLimit.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        // Always run a compare, even for unknown accounts, so response time
        // does not distinguish "no such user" from "wrong password".
        const passwordMatch = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

        if (!user || !user.password || !passwordMatch) {
          return null;
        }

        // Successful login: clear the counter so only failures count toward
        // the lockout and a legitimate user is never locked out of their own
        // account by signing in.
        await resetRateLimit(rateLimitKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordChangedAt: user.passwordChangedAt?.getTime() ?? 0,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    // Cap session lifetime at 7 days instead of the 30-day default, to bound
    // the window on a stolen token beyond the revocation check below.
    maxAge: 60 * 60 * 24 * 7,
  },
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Stamps the account's `passwordChangedAt` into the token at sign-in, then
     * re-checks it against the database periodically. If the password has since
     * changed (or the account was deleted) we return null, which invalidates the
     * session — this is what makes a password reset actually evict live JWTs.
     *
     * The check is throttled to one query per session per
     * REVALIDATE_INTERVAL_MS so it costs at most 1 query/min/session rather
     * than one on every request.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.passwordChangedAt = (user as { passwordChangedAt?: number }).passwordChangedAt ?? 0;
        token.checkedAt = Date.now();
        return token;
      }

      const checkedAt = typeof token.checkedAt === 'number' ? token.checkedAt : 0;
      if (Date.now() - checkedAt < REVALIDATE_INTERVAL_MS) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { passwordChangedAt: true },
      });

      // Account deleted since the token was issued.
      if (!dbUser) {
        return null;
      }

      const current = dbUser.passwordChangedAt?.getTime() ?? 0;
      if (current !== token.passwordChangedAt) {
        return null;
      }

      token.checkedAt = Date.now();
      return token;
    },
  },
});
