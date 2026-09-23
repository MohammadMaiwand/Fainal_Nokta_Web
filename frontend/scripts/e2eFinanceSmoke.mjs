/**
 * Finance E2E smoke without Playwright browser binary.
 * Covers: preview shell load, login page, finance locale/route-guard scripts.
 * Does NOT claim authenticated Make Payment UI complete.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const port = Number(process.env.PREVIEW_PORT || 4179);
const base = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // retry
    }
    await sleep(500);
  }
  return false;
}

function runNodeScript(scriptRel) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(frontendRoot, scriptRel)], {
      cwd: frontendRoot,
      shell: false
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

const failures = [];
let previewProcess = null;

try {
  const locale = await runNodeScript('scripts/validateFinanceLocales.mjs');
  if (locale.code !== 0) failures.push(`finance locales: ${locale.stderr || locale.stdout}`);

  const guards = await runNodeScript('scripts/validateFinanceRouteGuards.mjs');
  if (guards.code !== 0) failures.push(`finance route guards: ${guards.stderr || guards.stdout}`);

  previewProcess = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: frontendRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });
  let previewLog = '';
  previewProcess.stdout?.on('data', (chunk) => {
    previewLog += String(chunk);
  });
  previewProcess.stderr?.on('data', (chunk) => {
    previewLog += String(chunk);
  });

  const ready = await waitForUrl(`${base}/`);
  if (!ready) {
    failures.push(`preview server did not start (${previewLog.trim() || 'no vite output'})`);
  } else {
    for (const route of ['/login', '/home']) {
      const response = await fetch(`${base}${route}`);
      const html = await response.text();
      if (response.status !== 200) failures.push(`${route}: HTTP ${response.status}`);
      if (!html.includes('<html') && !html.includes('<!DOCTYPE html')) {
        failures.push(`${route}: missing html shell`);
      }
    }
  }
} catch (error) {
  failures.push(String(error));
} finally {
  if (previewProcess && !previewProcess.killed) {
    previewProcess.kill('SIGTERM');
  }
}

const report = {
  ok: failures.length === 0,
  mode: 'finance-smoke-no-browser',
  note: 'Unauthenticated smoke + locale/route guards. For full pay/reverse/refund evidence run backend npm run test:finance-live-e2e (API) and frontend playwright e2e/finance.spec.ts with SEED_SUPER_ADMIN_* + backend up.',
  failures,
  baseUrl: base
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = failures.length ? 1 : 0;
