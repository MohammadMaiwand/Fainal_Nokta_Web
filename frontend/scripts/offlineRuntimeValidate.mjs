import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const distDir = path.join(frontendRoot, 'dist');
const srcDir = path.join(frontendRoot, 'src');

const failures = [];
const checks = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  if (!ok) {
    failures.push(detail ? `${name}: ${detail}` : name);
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, attempts = 30) {
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

async function startPreview(port) {
  const child = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: frontendRoot,
      stdio: 'ignore',
      shell: true,
      env: { ...process.env, VITE_DEV_API_PROXY: process.env.VITE_DEV_API_PROXY ?? 'http://127.0.0.1:8081' }
    }
  );

  const ready = await waitForUrl(`http://127.0.0.1:${port}/`);
  return { child, ready };
}

record('dist build exists', fileExists(distDir), distDir);
record('service worker generated', fileExists(path.join(distDir, 'sw.js')));
record('manifest generated', fileExists(path.join(distDir, 'manifest.webmanifest')));
record('index.html generated', fileExists(path.join(distDir, 'index.html')));

const sw = fileExists(path.join(distDir, 'sw.js')) ? read(path.join(distDir, 'sw.js')) : '';
record('workbox api cache present', sw.includes('nokta-api-get-cache'));
record('workbox precache present', sw.includes('precache') || sw.includes('self.__WB_MANIFEST'));

const offlineData = read(path.join(srcDir, 'services', 'offlineData.ts'));
record('offline home courses fallback', offlineData.includes('offlineHomeCourses'));
record('offline registration options fallback', offlineData.includes('offlineRegistrationOptions'));

const apiClient = read(path.join(srcDir, 'services', 'apiClient.ts'));
record('apiClient excludes 401 from cache', apiClient.includes('error.response?.status === 401'));
record('apiClient excludes 403 from cache', apiClient.includes('error.response?.status === 403'));

const offlineStatus = read(path.join(srcDir, 'components', 'OfflineStatus.tsx'));
record('OfflineStatus component exists', offlineStatus.includes('OfflineStatus'));
record('offline pill uses low z-index', offlineStatus.includes('z-20'));
record('offline pill is bottom positioned', offlineStatus.includes('bottom-4'));

const viteConfig = read(path.join(frontendRoot, 'vite.config.ts'));
record('vite PWA plugin configured', viteConfig.includes('VitePWA'));
record('vite navigate fallback configured', viteConfig.includes('navigateFallback'));
record('vite preview proxy configured', viteConfig.includes('preview:'));

const registerPage = read(path.join(srcDir, 'features', 'auth', 'pages', 'RegisterPage.tsx'));
record('register works with local server (no public-internet gate)', !registerPage.includes('isAppOffline'));

const loginPage = read(path.join(srcDir, 'features', 'auth', 'pages', 'LoginPage.tsx'));
record('login works offline via local API', !loginPage.includes('login_requires_online') || loginPage.includes('isPublicInternetOffline'));

const captchaField = read(path.join(srcDir, 'features', 'auth', 'components', 'CaptchaChallengeField.tsx'));
record('captcha does not require public internet', !captchaField.includes('isAppOffline'));

const homePage = read(path.join(srcDir, 'pages', 'HomePage.tsx'));
record('home contact handles offline', homePage.includes('submitPublicContact'));

const networkUtil = read(path.join(srcDir, 'utils', 'network.ts'));
record('network utility exists', networkUtil.includes('isAppOffline'));
record('network utility documents local-server policy', networkUtil.includes('Local LAN') || networkUtil.includes('local'));

const serveDist = read(path.join(frontendRoot, 'scripts', 'serve-dist.mjs'));
record('offline static server proxies /api', serveDist.includes('/api') && serveDist.includes('proxyToBackend'));

let previewResults = [];
if (fileExists(distDir) && process.env.SKIP_PREVIEW !== '1') {
  const previewPort = Number(process.env.PREVIEW_PORT || 4173);
  const base = `http://127.0.0.1:${previewPort}`;
  const routes = ['/', '/home', '/login', '/register', '/sw.js', '/manifest.webmanifest'];
  let previewProcess = null;

  try {
    const started = await startPreview(previewPort);
    previewProcess = started.child;
    record('preview server started', started.ready, started.ready ? '' : `port ${previewPort}`);

    for (const route of routes) {
      try {
        const response = await fetch(`${base}${route}`);
        const ok = response.status === 200;
        previewResults.push({ route, status: response.status, ok });
        record(`preview ${route} returns 200`, ok, String(response.status));
      } catch (error) {
        previewResults.push({ route, status: null, ok: false, error: String(error) });
        record(`preview ${route} returns 200`, false, String(error));
      }
    }
  } finally {
    if (previewProcess && !previewProcess.killed) {
      previewProcess.kill('SIGTERM');
    }
  }
}

const report = {
  ok: failures.length === 0,
  checks,
  failures,
  previewResults,
  distDir
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = failures.length ? 1 : 0;
