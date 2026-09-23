import crypto from 'crypto';
import { config } from '../config/env';

const DEFAULT_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function signingSecret() {
  return config.csrfSecret || config.jwtSecret;
}

export function stripUploadSignature(url?: string | null) {
  const value = String(url ?? '').trim();
  if (!value) return '';
  try {
    const parsed = new URL(value, 'http://localhost');
    parsed.searchParams.delete('exp');
    parsed.searchParams.delete('sig');
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || value.split('?')[0];
  } catch {
    return value.split('?')[0];
  }
}

export function signUploadPath(pathname: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const cleanPath = stripUploadSignature(pathname);
  if (!cleanPath.startsWith('/uploads/')) {
    return cleanPath;
  }

  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${cleanPath}.${exp}`;
  const sig = crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');
  return `${cleanPath}?exp=${exp}&sig=${sig}`;
}

export function verifyUploadSignature(pathname: string, expRaw?: string | string[], sigRaw?: string | string[]) {
  const exp = Number(Array.isArray(expRaw) ? expRaw[0] : expRaw);
  const sig = String(Array.isArray(sigRaw) ? sigRaw[0] : sigRaw || '');
  if (!Number.isFinite(exp) || !sig || exp * 1000 < Date.now()) {
    return false;
  }

  const cleanPath = stripUploadSignature(pathname);
  const payload = `${cleanPath}.${exp}`;
  const expected = crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export function withSignedProfileImage(profileImage?: string | null) {
  const raw = stripUploadSignature(profileImage);
  if (!raw) return '';
  if (!raw.startsWith('/uploads/')) return raw;
  return signUploadPath(raw);
}
