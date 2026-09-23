/**
 * Executable evidence: reverse/refund/cancelled payments must be excluded from finance totals.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  NON_REVENUE_PAYMENT_STATUSES,
  isTerminalReversalStatus,
  paymentStatusExcludedFromTotals
} from '../../services/financialCalculationEngine';

assert.deepEqual([...NON_REVENUE_PAYMENT_STATUSES].sort(), ['cancelled', 'refunded', 'reversed'].sort());
assert.equal(paymentStatusExcludedFromTotals('reversed'), true);
assert.equal(paymentStatusExcludedFromTotals('refunded'), true);
assert.equal(paymentStatusExcludedFromTotals('cancelled'), true);
assert.equal(paymentStatusExcludedFromTotals('paid'), false);
assert.equal(isTerminalReversalStatus('reversed'), true);

const financeRoutes = fs.readFileSync(path.join(__dirname, 'finance.routes.ts'), 'utf8');
assert.match(financeRoutes, /\$nin:\s*\[[^\]]*reversed[^\]]*\]/, 'finance list must exclude reversed');

const afrRoutes = fs.readFileSync(path.join(__dirname, '../academy-financial-report/academy-financial-report.routes.ts'), 'utf8');
assert.match(afrRoutes, /\$nin:\s*\[[^\]]*reversed[^\]]*\]/, 'academy financial report must exclude reversed');

const paymentRoutes = fs.readFileSync(path.join(__dirname, '../payments/payments.routes.ts'), 'utf8');
assert.match(paymentRoutes, /\/:id\/reverse/, 'reverse route registered');
assert.match(paymentRoutes, /\/:id\/refund/, 'refund route registered');
assert.match(paymentRoutes, /authorize\(\['super_admin',\s*'admin',\s*'owner'\]\)/, 'reverse/refund restricted roles');

console.log('finance report exclusion + reverse/refund route tests passed');

