import assert from 'assert';
import crypto from 'crypto';
import { CaptchaService, CaptchaValidationError } from './captchaService';

async function run() {
  const service = new CaptchaService();

  const sample = 'AB3K7';
  const svg = service.renderSvgForTests(sample);
  assert.ok(svg.includes('<svg'), 'SVG should be generated');
  assert.ok(svg.includes('A'), 'SVG should include captcha glyphs');
  assert.ok(svg.includes('#0f172a'), 'Dark theme SVG should use dark background');
  assert.ok(!svg.toLowerCase().includes('answer'), 'SVG must not embed answer metadata');

  const lightSvg = service.renderSvgForTests(sample, 'light');
  assert.ok(lightSvg.includes('#f8fafc'), 'Light theme SVG should use light background');
  assert.ok(lightSvg.includes('fill="#0f172a"'), 'Light theme glyphs should use dark text');

  const challengeId = crypto.randomUUID();
  const hashA = service.hashAnswerForTests(challengeId, 'ab3k7');
  const hashB = service.hashAnswerForTests(challengeId, 'AB3K7');
  const hashC = service.hashAnswerForTests(challengeId, 'WRONG');
  assert.strictEqual(hashA, hashB, 'CAPTCHA answers must be case-insensitive');
  assert.notStrictEqual(hashA, hashC, 'Different answers must hash differently');
  assert.strictEqual(service.normalizeAnswerForTests(' ab 3k7 '), 'AB3K7');

  await assert.rejects(
    () => service.consumeChallenge({ challengeId: '', answer: '' }),
    (error: unknown) => error instanceof CaptchaValidationError && error.message === 'Login failed'
  );

  await assert.rejects(
    () => service.consumeChallenge({ challengeId, answer: 'AB' }),
    (error: unknown) => error instanceof CaptchaValidationError && error.message === 'Login failed'
  );

  console.log('captchaService tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
