/** Maximum accepted password length — bcrypt only reads the first 72 bytes. */
export const MAX_PASSWORD_LENGTH = 72;

/**
 * Shared password policy. Applied to both the self-service invite flow and
 * admin-provisioned passwords so neither becomes the weak link.
 *
 * Returns an error message, or null when the password is acceptable.
 */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') {
    return 'Password must be a string';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include uppercase, lowercase, and a number';
  }
  return null;
}
