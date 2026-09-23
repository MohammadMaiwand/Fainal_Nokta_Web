import bcrypt from 'bcryptjs';
import { config } from '../config/env';

export const PASSWORD_SALT_ROUNDS = Number(config.bcryptRounds || 12);
/** Soft upper bound only to avoid absurd payloads — no complexity rules. */
export const PASSWORD_MAX_LENGTH = 256;

export interface PasswordHistoryEntry {
  hash: string;
  changedAt: Date;
}

/**
 * Accept any non-empty password. No length/complexity (upper/lower/digit) rules.
 */
export function assertStrongPassword(password: string) {
  const normalizedPassword = String(password ?? '');
  if (!normalizedPassword.trim()) {
    throw new Error('Password is required.');
  }
  if (normalizedPassword.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
}

export async function hashPassword(password: string) {
  assertStrongPassword(password);
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function isPasswordReused(password: string, history: Array<PasswordHistoryEntry | null | undefined> = []) {
  for (const item of history) {
    if (item?.hash && await bcrypt.compare(password, item.hash)) {
      return true;
    }
  }

  return false;
}

export function pushPasswordHistory(history: Array<PasswordHistoryEntry | null | undefined> = [], hash: string) {
  return [{ hash, changedAt: new Date() }, ...history.filter(Boolean)].slice(0, 5);
}
