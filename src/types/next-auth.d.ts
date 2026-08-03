import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    /** Epoch ms of the last password change; 0 when never changed. */
    passwordChangedAt?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    /** Epoch ms of the last password change, as of token issue. */
    passwordChangedAt?: number;
    /** Epoch ms when the token was last revalidated against the database. */
    checkedAt?: number;
  }
}
