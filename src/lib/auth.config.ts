import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Publicly reachable by necessity: you cannot be signed in yet.
      // `/admin` is deliberately NOT here — it must require a session, even
      // though its API calls are additionally gated by ADMIN_SECRET.
      // Privacy policy and terms must also be reachable without a session:
      // YouTube's API Services policies require them to be prominently
      // displayed and accessible at all times, and a user has to be able to
      // read them before agreeing to them.
      const isPublicAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/set-password') ||
        nextUrl.pathname.startsWith('/privacy') ||
        nextUrl.pathname.startsWith('/terms');

      if (isPublicAuthPage) {
        // Redirect logged-in users away from the login page only
        if (isLoggedIn && nextUrl.pathname.startsWith('/login')) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // Providers added in auth.ts
};
