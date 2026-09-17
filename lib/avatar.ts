/**
 * Profile photos come from Google, and only Google.
 *
 * Mirrors the profiles_avatar_google constraint in
 * 0016_security_hardening.sql. Any other address would let a member collect
 * the IP address of everyone whose browser renders their photo.
 */
const GOOGLE_AVATAR = /^https:\/\/lh[0-9]\.googleusercontent\.com\//;

export function safeAvatarUrl(value: unknown): string | null {
  return typeof value === 'string' && GOOGLE_AVATAR.test(value) ? value : null;
}
