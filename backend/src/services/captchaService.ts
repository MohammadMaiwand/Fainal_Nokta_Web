import crypto from 'crypto';
import { CaptchaChallenge } from '../models/CaptchaChallenge';
import { config } from '../config/env';

/** Ambiguous characters excluded: 0 O 1 I l */
const CAPTCHA_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CAPTCHA_LENGTH = 5;
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 3;

export class CaptchaValidationError extends Error {
  constructor(message = 'Login failed') {
    super(message);
    this.name = 'CaptchaValidationError';
  }
}

function captchaPepper() {
  return config.csrfSecret || config.jwtSecret;
}

function normalizeAnswer(answer: string) {
  return String(answer ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function hashAnswer(challengeId: string, answer: string) {
  return crypto.createHash('sha256').update(`${captchaPepper()}:${challengeId}:${normalizeAnswer(answer)}`).digest('hex');
}

function randomCaptchaText(length = CAPTCHA_LENGTH) {
  let text = '';
  for (let index = 0; index < length; index += 1) {
    text += CAPTCHA_CHARSET[crypto.randomInt(0, CAPTCHA_CHARSET.length)];
  }
  return text;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderCaptchaSvg(text: string, theme: 'light' | 'dark' = 'dark') {
  const width = 220;
  const height = 72;
  const chars = text.split('');
  const charGap = width / (chars.length + 1);
  const isLight = theme === 'light';

  const palette = isLight
    ? {
        background: '#f8fafc',
        border: 'rgba(14,165,233,0.45)',
        text: '#0f172a',
        line: '14,165,233',
        dot: 'rgba(100,116,139,0.4)'
      }
    : {
        background: '#0f172a',
        border: 'rgba(56,189,248,0.35)',
        text: '#e2e8f0',
        line: '14,165,233',
        dot: 'rgba(148,163,184,0.45)'
      };

  const noiseLines = Array.from({ length: 6 }, () => {
    const x1 = crypto.randomInt(0, width);
    const y1 = crypto.randomInt(0, height);
    const x2 = crypto.randomInt(0, width);
    const y2 = crypto.randomInt(0, height);
    const opacity = (20 + crypto.randomInt(0, 35)) / 100;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(${palette.line},${opacity})" stroke-width="1.5" />`;
  }).join('');

  const noiseDots = Array.from({ length: 28 }, () => {
    const cx = crypto.randomInt(4, width - 4);
    const cy = crypto.randomInt(4, height - 4);
    const r = crypto.randomInt(1, 2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${palette.dot}" />`;
  }).join('');

  const glyphs = chars
    .map((char, index) => {
      const x = Math.round(charGap * (index + 1) + crypto.randomInt(-4, 5));
      const y = 42 + crypto.randomInt(-8, 9);
      const rotate = crypto.randomInt(-28, 29);
      const fontSize = 28 + crypto.randomInt(0, 6);
      return `<text x="${x}" y="${y}" fill="${palette.text}" font-family="Segoe UI, Tahoma, sans-serif" font-size="${fontSize}" font-weight="700" transform="rotate(${rotate} ${x} ${y})">${escapeXml(char)}</text>`;
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="CAPTCHA">`,
    `<rect width="100%" height="100%" rx="12" fill="${palette.background}" />`,
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="11" fill="none" stroke="${palette.border}" />`,
    noiseLines,
    noiseDots,
    glyphs,
    `</svg>`
  ].join('');
}

export class CaptchaService {
  async createChallenge(context?: { ipAddress?: string; userAgent?: string; theme?: 'light' | 'dark' }) {
    const challengeId = crypto.randomUUID();
    const answer = randomCaptchaText();
    const expiresAt = new Date(Date.now() + CAPTCHA_TTL_MS);
    const theme = context?.theme === 'light' ? 'light' : 'dark';

    await CaptchaChallenge.create({
      challengeId,
      answerHash: hashAnswer(challengeId, answer),
      expiresAt,
      ipAddress: context?.ipAddress ?? '',
      userAgent: context?.userAgent ?? ''
    });

    return {
      challengeId,
      svg: renderCaptchaSvg(answer, theme),
      expiresInSeconds: Math.floor(CAPTCHA_TTL_MS / 1000)
    };
  }

  /**
   * Validates and consumes a CAPTCHA. Always single-use on success.
   * Failed attempts invalidate the challenge after MAX_VERIFY_ATTEMPTS.
   * Does not reveal whether the challenge was missing, expired, or wrong.
   */
  async consumeChallenge(params: {
    challengeId?: string;
    answer?: string;
    ipAddress?: string;
  }) {
    const challengeId = String(params.challengeId ?? '').trim();
    const answer = normalizeAnswer(String(params.answer ?? ''));

    if (!challengeId || !answer || answer.length < CAPTCHA_LENGTH) {
      throw new CaptchaValidationError('Login failed');
    }

    const challenge = await CaptchaChallenge.findOne({ challengeId }).select('+answerHash');
    if (!challenge) {
      throw new CaptchaValidationError('Login failed');
    }

    if (challenge.consumedAt) {
      throw new CaptchaValidationError('Login failed');
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      challenge.consumedAt = new Date();
      await challenge.save();
      throw new CaptchaValidationError('Login failed');
    }

    const expected = String(challenge.answerHash ?? '');
    const provided = hashAnswer(challengeId, answer);
    const matches =
      expected.length === provided.length &&
      crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(provided, 'utf8'));

    if (!matches) {
      challenge.failedAttempts = Number(challenge.failedAttempts || 0) + 1;
      if (challenge.failedAttempts >= MAX_VERIFY_ATTEMPTS) {
        challenge.consumedAt = new Date();
      }
      await challenge.save();
      throw new CaptchaValidationError('Login failed');
    }

    challenge.consumedAt = new Date();
    await challenge.save();
    return true;
  }

  /** Test helpers — never expose answers via HTTP */
  hashAnswerForTests(challengeId: string, answer: string) {
    return hashAnswer(challengeId, answer);
  }

  normalizeAnswerForTests(answer: string) {
    return normalizeAnswer(answer);
  }

  renderSvgForTests(text: string, theme: 'light' | 'dark' = 'dark') {
    return renderCaptchaSvg(text, theme);
  }
}

export const captchaService = new CaptchaService();
