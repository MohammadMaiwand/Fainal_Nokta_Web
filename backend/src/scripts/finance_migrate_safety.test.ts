/**
 * Assert finance migration defaults to dry-run and never applies without --apply.
 * Executable evidence that historical data is not mutated by default.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const scriptPath = path.join(__dirname, 'finance_migrate_balances.ts');
const source = fs.readFileSync(scriptPath, 'utf8');

assert.match(source, /apply:\s*argv\.includes\('--apply'\)/, 'migration apply flag must require --apply');
assert.match(source, /mode:\s*apply \? 'apply' : 'dry-run'/, 'migration reports dry-run vs apply');
assert.match(source, /Dry-run only/, 'migration prints dry-run guidance');
assert.ok(!source.includes('apply: true'), 'migration must not hardcode apply:true');

const reconcilePath = path.join(__dirname, 'finance_reconciliation_report.ts');
const reconcileSource = fs.readFileSync(reconcilePath, 'utf8');
assert.match(reconcileSource, /REPORT ONLY|report-only/i, 'reconciliation must be report-only');
assert.doesNotMatch(reconcileSource, /\.updateOne\(|\.save\(|findOneAndUpdate/, 'reconciliation must not mutate collections');

console.log('finance migration/reconcile safety tests passed');
