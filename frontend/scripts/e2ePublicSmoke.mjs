import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const port = Number(process.env.PREVIEW_PORT || 4173);
const base = `http://127.0.0.1:${port}`;

const routes = [
  { path: '/home', name: 'home page' },
  { path: '/login', name: 'login page' },
  { path: '/privacy', name: 'privacy page' },
  { path: '/terms', name: 'terms page' }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, attempts = 40) {
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

async function startPreview() {
  const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: frontendRoot,
    stdio: 'ignore',
    shell: true,
    env: { ...process.env, VITE_DEV_API_PROXY: process.env.VITE_DEV_API_PROXY ?? 'http://127.0.0.1:8081' }
  });
  const ready = await waitForUrl(`${base}/`);
  return { child, ready };
}

const failures = [];

let previewProcess = null;
try {
  const started = await startPreview();
  previewProcess = started.child;
  if (!started.ready) {
    failures.push('preview server did not start');
  } else {
    for (const route of routes) {
      try {
        const response = await fetch(`${base}${route.path}`);
        const html = await response.text();
        if (response.status !== 200) {
          failures.push(`${route.name}: HTTP ${response.status}`);
          continue;
        }
        if (!html.includes('<!DOCTYPE html') && !html.includes('<html')) {
          failures.push(`${route.name}: missing html shell`);
        }
      } catch (error) {
        failures.push(`${route.name}: ${String(error)}`);
      }
    }
  }
} finally {
  if (previewProcess && !previewProcess.killed) {
    previewProcess.kill('SIGTERM');
  }
}

const report = { ok: failures.length === 0, failures, baseUrl: base };
console.log(JSON.stringify(report, null, 2));
process.exitCode = failures.length ? 1 : 0;
