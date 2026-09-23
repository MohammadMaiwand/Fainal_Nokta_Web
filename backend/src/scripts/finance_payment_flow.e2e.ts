/**
 * Live finance payment flow E2E against running HTTP API.
 * Covers: captcha login → student fee pay → reverse → second pay → refund.
 *
 * Usage (backend must be listening):
 *   npm run test:finance-live-e2e
 *
 * Credentials (in order):
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD
 */
import assert from 'node:assert/strict';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.join(__dirname, '../../.env') });

const BASE = String(process.env.E2E_API_BASE || process.env.BASE_URL || 'http://127.0.0.1:8081')
  .replace(/\/$/, '')
  .replace('localhost', '127.0.0.1');
const email = String(process.env.E2E_ADMIN_EMAIL || process.env.SEED_SUPER_ADMIN_EMAIL || '').trim();
const password = String(process.env.E2E_ADMIN_PASSWORD || process.env.SEED_SUPER_ADMIN_PASSWORD || '').trim();

function extractCaptchaAnswerFromSvg(svg: string) {
  const matches = [...String(svg).matchAll(/<text\b[^>]*>([^<]*)<\/text>/gi)];
  const answer = matches.map((item) => item[1]).join('').replace(/\s+/g, '').toUpperCase();
  assert.ok(answer.length >= 4, 'CAPTCHA SVG did not expose enough glyphs for test solver');
  return answer;
}

async function request(method: string, urlPath: string, options?: { token?: string; body?: unknown; headers?: Record<string, string> }) {
  const response = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options?.headers || {})
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

async function login() {
  assert.ok(email && password, 'Set E2E_ADMIN_* or SEED_SUPER_ADMIN_* credentials');

  const captcha = await request('GET', '/api/auth/captcha');
  assert.equal(captcha.status, 200, `captcha HTTP ${captcha.status}`);
  const challengeId = captcha.json?.data?.challengeId || captcha.json?.challengeId;
  const svg = captcha.json?.data?.svg || captcha.json?.svg;
  assert.ok(challengeId && svg, 'captcha payload missing challengeId/svg');
  const captchaAnswer = extractCaptchaAnswerFromSvg(svg);

  const loginRes = await request('POST', '/api/auth/login', {
    body: {
      email,
      password,
      captchaChallengeId: challengeId,
      captchaAnswer
    }
  });

  if (loginRes.json?.data?.twoFactorRequired || loginRes.json?.twoFactorRequired) {
    const preview = loginRes.json?.data?.challenge?.codePreview || loginRes.json?.challenge?.codePreview;
    assert.ok(preview, '2FA required but codePreview missing (cannot complete automated E2E)');
    const verify = await request('POST', '/api/auth/login/2fa', {
      body: { email, code: String(preview) }
    });
    assert.equal(verify.status, 200, `2fa HTTP ${verify.status}: ${JSON.stringify(verify.json)}`);
    const token =
      verify.json?.data?.tokens?.accessToken ||
      verify.json?.data?.token ||
      verify.json?.token;
    assert.ok(token, '2FA login missing access token');
    return { token, user: verify.json?.data?.user || verify.json?.user };
  }

  assert.ok(loginRes.status === 200 || loginRes.status === 201, `login HTTP ${loginRes.status}: ${JSON.stringify(loginRes.json)}`);
  const token =
    loginRes.json?.data?.tokens?.accessToken ||
    loginRes.json?.data?.token ||
    loginRes.json?.token;
  assert.ok(token, `login missing access token: ${JSON.stringify(loginRes.json).slice(0, 400)}`);
  return { token, user: loginRes.json?.data?.user || loginRes.json?.user };
}

async function pickStudent(token: string) {
  const res = await request('GET', '/api/students?limit=100&status=active', { token });
  assert.equal(res.status, 200, `students HTTP ${res.status}`);
  const students = res.json?.data ?? [];
  const withBalance = students.find((s: any) => {
    const remaining = Number(s.remainingBalance ?? Math.max(0, Number(s.feeAmount || 0) - Number(s.paidAmount || 0)));
    return remaining > 1;
  });
  if (withBalance) return withBalance;

  // Fall back: any student with positive fee (partial/overpay edge); use 1 AFN if remaining is 0 by bumping via unpaid feeAmount
  const anyStudent = students.find((s: any) => Number(s.feeAmount || 0) > 0) || students[0];
  assert.ok(anyStudent, 'No students available for fee payment E2E');
  return anyStudent;
}

async function ensureStudentPayable(token: string, student: any) {
  const remaining = Number(
    student.remainingBalance ?? Math.max(0, Number(student.feeAmount || 0) - Number(student.paidAmount || 0))
  );
  if (remaining > 1) {
    return { student, amount: Math.min(50, remaining) };
  }

  // Increase feeAmount slightly so remainingBalance becomes payable without touching historical paid totals.
  // Prefer teacher salary path when students are fully paid.
  const payees = await request('GET', '/api/payments/payees?role=teacher', { token });
  assert.equal(payees.status, 200, `payees HTTP ${payees.status}`);
  const teacher = (payees.json?.data ?? [])[0];
  assert.ok(teacher?.value, 'No teacher payee for salary payment fallback E2E');
  return { student: null, teacher, amount: 0 };
}

async function waitForApi(retries = 30) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const health = await request('GET', '/health');
      if (health.status > 0 && health.status < 500) return;
      const alt = await request('GET', '/api/health');
      if (alt.status > 0 && alt.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.fail(`API not reachable at ${BASE}. Start backend first.`);
}

async function main() {
  await waitForApi();

  const { token, user } = await login();
  const picked = await pickStudent(token);
  const payable = await ensureStudentPayable(token, picked);

  let payBody1: Record<string, unknown>;
  let payBody2: Record<string, unknown>;
  let flow: 'student_fee' | 'teacher_salary' = 'student_fee';

  if (payable.student && payable.amount > 0) {
    const studentId = String(payable.student._id);
    const amount = payable.amount;
    payBody1 = {
      paymentType: 'student_fee',
      paymentFor: 'student_fee',
      studentId,
      amount,
      method: 'cash',
      notes: 'finance_live_e2e_pay1'
    };
    payBody2 = { ...payBody1, notes: 'finance_live_e2e_pay2' };
  } else {
    flow = 'teacher_salary';
    const teacherId = String(payable.teacher.value);
    const now = new Date();
    // Approximate current Jalali via API preview across recent months if needed
    let preview: any = null;
    let salaryMonth = 1;
    let salaryYear = 1405;
    for (const year of [1405, 1404]) {
      for (const month of [now.getMonth() + 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
        const res = await request(
          'GET',
          `/api/payments/salary-preview?payeeUserId=${teacherId}&payeeRole=teacher&salaryMonth=${month}&salaryYear=${year}`,
          { token }
        );
        if (res.status === 200 && Number(res.json?.data?.preview?.unpaidNetBalance ?? res.json?.data?.preview?.netSalary ?? 0) > 0) {
          preview = res.json.data;
          salaryMonth = month;
          salaryYear = year;
          break;
        }
      }
      if (preview) break;
    }
    assert.ok(preview, 'No unpaid teacher salary preview found for salary payment E2E');
    const unpaid = Number(preview.preview?.unpaidNetBalance ?? preview.preview?.netSalary ?? 0);
    assert.ok(unpaid > 0, 'Teacher unpaid net is 0');
    const amount = Math.min(100, unpaid);
    payBody1 = {
      paymentType: 'employee_salary',
      paymentFor: 'teacher_salary',
      employeeId: teacherId,
      payeeUserId: teacherId,
      employeeRole: 'teacher',
      payeeRole: 'teacher',
      amount,
      salaryMonth,
      salaryYear,
      method: 'cash',
      notes: 'finance_live_e2e_pay1'
    };
    payBody2 = { ...payBody1, notes: 'finance_live_e2e_pay2' };
  }

  const pay1Key = `e2e-pay1-${Date.now()}`;
  const pay1 = await request('POST', '/api/payments', {
    token,
    headers: { 'Idempotency-Key': pay1Key },
    body: { ...payBody1, idempotencyKey: pay1Key }
  });
  assert.ok(pay1.status === 200 || pay1.status === 201, `pay1 HTTP ${pay1.status}: ${JSON.stringify(pay1.json)}`);
  const payment1Id = String(pay1.json?.data?._id || pay1.json?.data?.id || '');
  assert.ok(payment1Id, 'pay1 missing payment id');

  const reverse = await request('POST', `/api/payments/${payment1Id}/reverse`, {
    token,
    body: { reason: 'finance_live_e2e_reverse' }
  });
  assert.equal(reverse.status, 200, `reverse HTTP ${reverse.status}: ${JSON.stringify(reverse.json)}`);
  assert.equal(String(reverse.json?.data?.status || '').toLowerCase(), 'reversed');

  const pay2Key = `e2e-pay2-${Date.now()}`;
  const pay2 = await request('POST', '/api/payments', {
    token,
    headers: { 'Idempotency-Key': pay2Key },
    body: { ...payBody2, idempotencyKey: pay2Key }
  });
  assert.ok(pay2.status === 200 || pay2.status === 201, `pay2 HTTP ${pay2.status}: ${JSON.stringify(pay2.json)}`);
  const payment2Id = String(pay2.json?.data?._id || pay2.json?.data?.id || '');
  assert.ok(payment2Id, 'pay2 missing payment id');

  const refund = await request('POST', `/api/payments/${payment2Id}/refund`, {
    token,
    body: { reason: 'finance_live_e2e_refund' }
  });
  assert.equal(refund.status, 200, `refund HTTP ${refund.status}: ${JSON.stringify(refund.json)}`);
  assert.equal(String(refund.json?.data?.status || '').toLowerCase(), 'refunded');

  const replay = await request('POST', '/api/payments', {
    token,
    headers: { 'Idempotency-Key': pay2Key },
    body: { ...payBody2, idempotencyKey: pay2Key }
  });
  assert.ok(replay.status === 200 || replay.status === 201, `idempotent replay HTTP ${replay.status}`);
  assert.equal(Boolean(replay.json?.data?.idempotentReplay), true, 'expected idempotentReplay=true');

  const report = {
    ok: true,
    base: BASE,
    flow,
    actor: { email, role: user?.role || user?.canonicalRole || null },
    payment1Id,
    payment2Id,
    reverseStatus: reverse.json?.data?.status,
    refundStatus: refund.json?.data?.status,
    idempotentReplay: true
  };
  console.log(JSON.stringify(report, null, 2));
  console.log('finance live payment E2E passed');
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }, null, 2));
  process.exit(1);
});
