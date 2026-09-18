import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { STRAVA_TOKEN_KEY } from '@/lib/env';

/**
 * Strava tokens are encrypted before they reach the database.
 *
 * `strava_connections` is already unreachable through the API (RLS on, no
 * policies), but anyone holding a database dump, a backup, or the service
 * role key could read live bearer tokens for every connected member. The key
 * for this lives only in the app's environment (STRAVA_TOKEN_KEY), never in
 * Supabase, so the database alone gives away nothing usable.
 *
 * AES-256-GCM, a fresh 12-byte IV per value, and the member's id bound in as
 * associated data: a token copied into another member's row fails to decrypt
 * rather than acting as them.
 *
 * Stored form: "v1:" + base64(iv | tag | ciphertext). Rows written before
 * encryption are plain tokens without the prefix; openToken() still reads
 * them, and getValidAccessToken() re-saves them sealed.
 */

const PREFIX = 'v1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer {
  const bytes = Buffer.from(STRAVA_TOKEN_KEY, 'base64');
  if (bytes.length !== 32) throw new Error('STRAVA_NOT_CONFIGURED');
  return bytes;
}

export function isSealed(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

export function sealToken(token: string, userId: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(userId, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

export function openToken(stored: string, userId: string): string {
  if (!isSealed(stored)) return stored;

  const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, IV_BYTES));
    decipher.setAAD(Buffer.from(userId, 'utf8'));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([
      decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key (rotated, or a different environment) or a tampered row.
    // Either way the only fix is for the member to connect again.
    throw new Error('STRAVA_UNAUTHORIZED');
  }
}
