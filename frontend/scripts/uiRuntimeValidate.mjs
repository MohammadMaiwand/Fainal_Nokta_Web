import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:4173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8081';
const CDP_PORT = Number(process.env.CDP_PORT || 9222);
const SCREENSHOT_DIR = path.resolve(process.cwd(), '.runtime-validation');
const USER_DATA_DIR = path.resolve(os.tmpdir(), 'nokta-academy-ui-runtime-browser');
const BROWSER_PATH = process.env.BROWSER_PATH || findBrowserPath();

const roleCandidates = {
  super_admin: [
    { email: 'admin@gmail.com', password: '12345678' }
  ],
  admin: [
    { email: 'admin1@nokta.com', password: 'Admin123!' }
  ],
  teacher: [
    { email: 'teacher1@nokta.com', password: 'Teacher123!' }
  ],
  student: [
    { email: 'student1@nokta.com', password: 'Student123!' }
  ],
  family_student: [
    { email: 'family1@nokta.com', password: 'Family123!' }
  ],
  accountant: [
    { email: 'accountant1@nokta.com', password: 'Accountant123!' }
  ],
  librarian: [
    { email: 'librarian1@nokta.com', password: 'Librarian123!' }
  ]
};

const roleExpectations = {
  super_admin: {
    responseRoles: ['super_admin'],
    dashboardRoute: '/dashboard/super-admin'
  },
  admin: {
    responseRoles: ['admin'],
    dashboardRoute: '/dashboard/admin'
  },
  teacher: {
    responseRoles: ['teacher'],
    dashboardRoute: '/dashboard/teacher'
  },
  student: {
    responseRoles: ['student'],
    dashboardRoute: '/dashboard/student'
  },
  family_student: {
    responseRoles: ['family_student', 'parent'],
    dashboardRoute: '/dashboard/family'
  },
  accountant: {
    responseRoles: ['accountant', 'admin'],
    dashboardRoute: '/dashboard/admin'
  },
  librarian: {
    responseRoles: ['librarian', 'branch_manager'],
    dashboardRoute: '/dashboard/branch-manager'
  }
};

const routeChecks = [
  '/dashboard/super-admin',
  '/dashboard/manage-users',
  '/users',
  '/students',
  '/teachers',
  '/classes',
  '/subjects',
  '/exams',
  '/results',
  '/finance',
  '/reports',
  '/expenses',
  '/books',
  '/families',
  '/issue-books',
  '/return-books',
  '/audit',
  '/roles',
  '/notifications',
  '/profile',
  '/analytics',
  '/ecommerce',
  '/settings',
  '/messages'
];

const publicRoutes = ['/home', '/login', '/register', '/forbidden', '/missing-route'];
const publicApiChecks = [
  '/health',
  '/api/courses/public/home',
  '/api/classes/public/home'
];
const sessionCache = new Map();
const authTimestamps = [];

function findBrowserPath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  const browser = candidates.find((candidate) => existsSync(candidate));
  if (!browser) {
    throw new Error('No supported browser executable was found for runtime validation.');
  }

  return browser;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${url} -> ${response.status} ${text}`);
  }
  return response.json();
}

async function waitForAuthSlot() {
  while (true) {
    const now = Date.now();
    while (authTimestamps.length && now - authTimestamps[0] >= 60_000) {
      authTimestamps.shift();
    }

    if (authTimestamps.length < 5) {
      authTimestamps.push(now);
      return;
    }

    const waitMs = 60_000 - (now - authTimestamps[0]) + 1_500;
    await sleep(waitMs);
  }
}

class CDPClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.webSocketUrl);
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
      this.ws.addEventListener('message', (event) => this.onMessage(event));
      this.ws.addEventListener('close', () => {
        for (const pending of this.pending.values()) {
          pending.reject(new Error('CDP connection closed'));
        }
        this.pending.clear();
      });
    });
  }

  on(method, handler) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(handler);
    this.listeners.set(method, listeners);
  }

  onMessage(event) {
    const payload = JSON.parse(event.data);
    if (payload.id) {
      const pending = this.pending.get(payload.id);
      if (!pending) return;
      this.pending.delete(payload.id);
      if (payload.error) {
        pending.reject(new Error(payload.error.message));
      } else {
        pending.resolve(payload.result);
      }
      return;
    }

    const listeners = this.listeners.get(payload.method) ?? [];
    for (const listener of listeners) {
      listener(payload.params);
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (!this.ws) return;
    this.ws.close();
    await sleep(100);
  }
}

async function launchBrowser() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  await fs.rm(USER_DATA_DIR, { recursive: true, force: true });

  const browser = spawn(
    BROWSER_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--disable-features=Translate,OptimizationHints,AutomationControlled',
      '--allow-insecure-localhost',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${USER_DATA_DIR}`,
      'about:blank'
    ],
    {
      stdio: 'ignore',
      detached: false
    }
  );

  const versionUrl = `http://127.0.0.1:${CDP_PORT}/json/list`;
  let targets = null;
  for (let index = 0; index < 40; index += 1) {
    try {
      targets = await fetchJson(versionUrl);
      if (Array.isArray(targets) && targets.length > 0) {
        break;
      }
    } catch {}
    await sleep(250);
  }

  if (!targets || !targets.length) {
    browser.kill('SIGKILL');
    throw new Error('Browser DevTools endpoint did not become ready.');
  }

  const pageTarget = targets.find((target) => target.type === 'page') ?? targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Page.setLifecycleEventsEnabled', { enabled: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false
  });

  return { browser, cdp };
}

function parseRemoteObjectValue(result) {
  if (!result) return null;
  if (Object.prototype.hasOwnProperty.call(result, 'value')) {
    return result.value;
  }
  return null;
}

async function evaluate(cdp, expression) {
  const payload = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });

  if (payload.exceptionDetails) {
    throw new Error(payload.exceptionDetails.text || 'Runtime evaluation failed');
  }

  return parseRemoteObjectValue(payload.result);
}

async function waitFor(cdp, expression, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await evaluate(cdp, expression);
    if (value) {
      return value;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for condition: ${expression}`);
}

async function waitForContent(cdp, minimumLength = 250, timeoutMs = 20000) {
  try {
    await waitFor(cdp, `document.body.innerText.trim().length >= ${minimumLength}`, timeoutMs);
  } catch {}
}

async function navigate(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await waitFor(cdp, 'document.readyState === "complete"', 15000);
  await sleep(500);
}

async function clickSelector(cdp, selector) {
  const success = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.click();
    return true;
  })()`);
  if (!success) {
    throw new Error(`Unable to click selector: ${selector}`);
  }
  await sleep(400);
}

async function clickText(cdp, text) {
  const success = await evaluate(cdp, `(() => {
    const normalized = ${JSON.stringify(text)};
    const elements = Array.from(document.querySelectorAll('button, a, summary, [role="button"]'));
    const target = elements.find((element) => element.innerText.trim() === normalized);
    if (!target) return false;
    target.click();
    return true;
  })()`);
  if (!success) {
    throw new Error(`Unable to click text: ${text}`);
  }
  await sleep(500);
}

async function clickLanguage(cdp, languageCode) {
  await clickSelector(cdp, `[data-language="${languageCode}"]`);
  await waitFor(cdp, `document.documentElement.lang === ${JSON.stringify(languageCode)}`);
}

async function setInputValue(cdp, selector, value) {
  const success = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.focus();
    element.value = ${JSON.stringify(value)};
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!success) {
    throw new Error(`Unable to set input: ${selector}`);
  }
}

async function captureScreenshot(cdp, filename) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const outputPath = path.join(SCREENSHOT_DIR, filename);
  await fs.writeFile(outputPath, Buffer.from(data, 'base64'));
  return outputPath;
}

async function getDomSnapshot(cdp) {
  return evaluate(cdp, `(() => {
    const firstTableHeader = document.querySelector('table th');
    const sidebarCandidates = Array.from(document.querySelectorAll('aside'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          display: style.display,
          visibility: style.visibility
        };
      })
      .filter((candidate) => candidate.width > 120 && candidate.height > 300 && candidate.display !== 'none' && candidate.visibility !== 'hidden')
      .sort((a, b) => b.width - a.width);
    const sidebar = sidebarCandidates[0] || null;
    const route = window.location.pathname;
    const bodyText = document.body.innerText;
    const rawKeyMatches = bodyText.match(/(?:common|dashboard|students|classes|subjects|auth|errors|finance|reports|notifications|audit|roles)\\.[A-Za-z0-9_]+/g) || [];
    const suspiciousEnglish = bodyText.match(/\\b(?:Dashboard|Users|Students|Teachers|Classes|Subjects|Notifications|Settings|Logout|Manage Users)\\b/g) || [];
    const cards = Array.from(document.querySelectorAll('main section > div, main .grid > div'))
      .map((element) => element.innerText.replace(/\\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 12);
    return {
      route,
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      navigationCount: performance.getEntriesByType('navigation').length,
      title: document.title,
      bodyLength: bodyText.trim().length,
      bodyText,
      rawKeyMatches,
      suspiciousEnglish,
      h1: document.querySelector('h1')?.innerText.trim() || '',
      headingText: Array.from(document.querySelectorAll('h1, h2, h3')).map((element) => element.innerText.trim()).filter(Boolean).slice(0, 12),
      buttonText: Array.from(document.querySelectorAll('button, a')).map((element) => element.innerText.trim()).filter(Boolean).slice(0, 30),
      tableRowCount: document.querySelectorAll('table tbody tr').length,
      svgCount: document.querySelectorAll('svg').length,
      noDataVisible: /No records found|No data available|رکوردی یافت نشد|هیڅ ریکارډ ونه موندل شو/.test(bodyText),
      viewportWidth: window.innerWidth,
      sidebarRect: sidebar ? { left: sidebar.left, right: sidebar.right, width: sidebar.width } : null,
      tableTextAlign: firstTableHeader ? getComputedStyle(firstTableHeader).textAlign : null,
      cards
    };
  })()`);
}

async function loginApi(role) {
  if (sessionCache.has(role)) {
    return sessionCache.get(role);
  }

  const expectation = roleExpectations[role] || { responseRoles: [role], dashboardRoute: '/dashboard' };

  for (const credentials of roleCandidates[role]) {
    while (true) {
      try {
        await waitForAuthSlot();

        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });

        if (response.status === 429) {
          await sleep(65_000);
          continue;
        }

        if (!response.ok) {
          break;
        }

        const payload = await response.json();
        if (payload?.success && payload?.token && expectation.responseRoles.includes(payload?.user?.role)) {
          const session = { ...credentials, ...payload };
          sessionCache.set(role, session);
          return session;
        }
        break;
      } catch {
        break;
      }
    }
  }

  throw new Error(`Unable to authenticate role: ${role}`);
}

async function setSession(cdp, session) {
  await navigate(cdp, `${FRONTEND_URL}/login`);
  await evaluate(cdp, `(() => {
    localStorage.setItem('accessToken', ${JSON.stringify(session.token)});
    localStorage.setItem('user', JSON.stringify(${JSON.stringify(session.user)}));
    localStorage.removeItem('refreshToken');
    return true;
  })()`);
}

async function clearSession(cdp) {
  await navigate(cdp, `${FRONTEND_URL}/login`);
  await evaluate(cdp, `(() => {
    localStorage.clear();
    sessionStorage.clear();
    return true;
  })()`);
}

function createIssueTracker(cdp) {
  const tracker = {
    consoleErrors: [],
    consoleWarnings: [],
    runtimeExceptions: [],
    networkFailures: [],
    httpFailures: []
  };

  cdp.on('Runtime.consoleAPICalled', (params) => {
    const message = params.args?.map((arg) => arg.value ?? arg.description ?? '').join(' ').trim();
    if (params.type === 'error') {
      tracker.consoleErrors.push({ message, url: params.stackTrace?.callFrames?.[0]?.url || '' });
    }
    if (params.type === 'warning') {
      tracker.consoleWarnings.push({ message, url: params.stackTrace?.callFrames?.[0]?.url || '' });
    }
  });

  cdp.on('Runtime.exceptionThrown', (params) => {
    tracker.runtimeExceptions.push({
      text: params.exceptionDetails?.text || '',
      url: params.exceptionDetails?.url || ''
    });
  });

  const requestUrls = new Map();

  cdp.on('Network.requestWillBeSent', (params) => {
    requestUrls.set(params.requestId, params.request?.url || '');
  });

  cdp.on('Network.loadingFailed', (params) => {
    if (!params.canceled) {
      tracker.networkFailures.push({
        url: requestUrls.get(params.requestId) || params.requestId,
        errorText: params.errorText,
        type: params.type
      });
    }
  });

  cdp.on('Network.responseReceived', (params) => {
    if (params.response?.status >= 400) {
      tracker.httpFailures.push({
        url: params.response.url,
        status: params.response.status
      });
    }
  });

  return tracker;
}

function evaluateAlignment(snapshot, expectedDirection) {
  const sidebar = snapshot.sidebarRect;
  if (!sidebar) return false;
  if (expectedDirection === 'ltr') {
    return sidebar.left <= 20;
  }
  return Math.abs((snapshot.viewportWidth ?? 0) - sidebar.right) <= 20;
}

async function verifyLanguageSwitch(cdp, route, languageCode, expectedLang, expectedDirection, screenshotName) {
  await clickLanguage(cdp, languageCode);
  await waitFor(cdp, `document.documentElement.lang === ${JSON.stringify(expectedLang)} && document.documentElement.dir === ${JSON.stringify(expectedDirection)}`);
  const snapshot = await getDomSnapshot(cdp);
  const screenshot = await captureScreenshot(cdp, screenshotName);
  return {
    route,
    lang: snapshot.lang,
    dir: snapshot.dir,
    aligned: evaluateAlignment(snapshot, expectedDirection),
    rawKeyCount: snapshot.rawKeyMatches.length,
    suspiciousEnglish: snapshot.suspiciousEnglish.slice(0, 12),
    navigationCount: snapshot.navigationCount,
    tableTextAlign: snapshot.tableTextAlign,
    screenshot
  };
}

async function runApiSmoke(report) {
  for (const path of publicApiChecks) {
    const url = path.startsWith('/api') ? `${BACKEND_URL}${path}` : `${BACKEND_URL}${path}`;
    try {
      const response = await fetch(url);
      report.apiChecks.push({ path, status: response.status, ok: response.ok });
    } catch (error) {
      report.apiChecks.push({ path, status: null, ok: false, error: String(error) });
    }
  }

  try {
    const studentSession = await loginApi('student');
    const studentFinance = await fetch(`${BACKEND_URL}/api/finance/summary`, {
      headers: { Authorization: `Bearer ${studentSession.token}` }
    });
    report.apiChecks.push({
      path: '/api/finance/summary as student',
      status: studentFinance.status,
      ok: studentFinance.status === 403
    });

    const studentAdminMessages = await fetch(`${BACKEND_URL}/api/messages/admin/inbox`, {
      headers: { Authorization: `Bearer ${studentSession.token}` }
    });
    report.apiChecks.push({
      path: '/api/messages/admin/inbox as student',
      status: studentAdminMessages.status,
      ok: studentAdminMessages.status === 403
    });
  } catch (error) {
    report.apiChecks.push({ path: 'student-rbac-smoke', status: null, ok: false, error: String(error) });
  }
}

async function run() {
  const { browser, cdp } = await launchBrowser();
  const issues = createIssueTracker(cdp);

  try {
    const report = {
      frontendUrl: FRONTEND_URL,
      backendUrl: BACKEND_URL,
      browserPath: BROWSER_PATH,
      screenshots: [],
      publicRoutes: [],
      apiChecks: [],
      protectedRoutes: {},
      dashboards: {},
      translations: [],
      routeChecks: [],
      issues
    };

    await runApiSmoke(report);

    for (const route of publicRoutes) {
      await navigate(cdp, `${FRONTEND_URL}${route}`);
      const snapshot = await getDomSnapshot(cdp);
      report.publicRoutes.push({
        route,
        title: snapshot.title,
        bodyLength: snapshot.bodyLength,
        rawKeyCount: snapshot.rawKeyMatches.length
      });
    }

    const superAdmin = await loginApi('super_admin');
    await setSession(cdp, superAdmin);
    await navigate(cdp, `${FRONTEND_URL}/dashboard/super-admin`);
    await waitForContent(cdp, 500);
    await waitFor(cdp, 'window.location.pathname.includes("/dashboard")');
    report.screenshots.push(await captureScreenshot(cdp, 'dashboard-super-admin-en.png'));

    const superAdminSnapshot = await getDomSnapshot(cdp);
    report.dashboards.super_admin = {
      route: superAdminSnapshot.route,
      h1: superAdminSnapshot.h1,
      cards: superAdminSnapshot.cards,
      svgCount: superAdminSnapshot.svgCount,
      allVisibleCardValuesZero: !/\b[1-9][0-9,]*\b/.test(superAdminSnapshot.cards.join(' ')),
      manageUsersVisible: superAdminSnapshot.buttonText.includes('Manage Users')
    };

    await navigate(cdp, `${FRONTEND_URL}/students`);
    report.screenshots.push(await captureScreenshot(cdp, 'students-en.png'));
    report.translations.push(await verifyLanguageSwitch(cdp, '/students', 'fa', 'fa', 'rtl', 'students-fa.png'));
    report.translations.push(await verifyLanguageSwitch(cdp, '/students', 'ps', 'ps', 'rtl', 'students-ps.png'));
    report.translations.push(await verifyLanguageSwitch(cdp, '/students', 'en', 'en', 'ltr', 'students-en-restored.png'));

    for (const route of routeChecks) {
      await navigate(cdp, `${FRONTEND_URL}${route}`);
      const snapshot = await getDomSnapshot(cdp);
      report.routeChecks.push({
        route,
        finalRoute: snapshot.route,
        bodyLength: snapshot.bodyLength,
        tableRowCount: snapshot.tableRowCount,
        noDataVisible: snapshot.noDataVisible,
        rawKeyCount: snapshot.rawKeyMatches.length,
        blank: snapshot.bodyLength < 30
      });
    }

    for (const role of Object.keys(roleCandidates)) {
      const session = await loginApi(role);
      await setSession(cdp, session);
      const targetRoute = roleExpectations[role]?.dashboardRoute || '/dashboard';
      await navigate(cdp, `${FRONTEND_URL}${targetRoute}`);
      await waitForContent(cdp, role === 'accountant' ? 400 : 250);
      const snapshot = await getDomSnapshot(cdp);
      const screenshot = await captureScreenshot(cdp, `dashboard-${role}.png`);
      report.screenshots.push(screenshot);
      report.dashboards[role] = {
        route: snapshot.route,
        h1: snapshot.h1,
        cards: snapshot.cards,
        svgCount: snapshot.svgCount,
        allVisibleCardValuesZero: !/\b[1-9][0-9,]*\b/.test(snapshot.cards.join(' ')),
        rawKeyCount: snapshot.rawKeyMatches.length
      };

      if (role === 'admin') {
        await navigate(cdp, `${FRONTEND_URL}/campaign`);
        const adminCampaignSnapshot = await getDomSnapshot(cdp);
        report.routeChecks.push({
          route: '/campaign',
          finalRoute: adminCampaignSnapshot.route,
          bodyLength: adminCampaignSnapshot.bodyLength,
          tableRowCount: adminCampaignSnapshot.tableRowCount,
          noDataVisible: adminCampaignSnapshot.noDataVisible,
          rawKeyCount: adminCampaignSnapshot.rawKeyMatches.length,
          blank: adminCampaignSnapshot.bodyLength < 30
        });
      }
    }

    const teacherSession = await loginApi('teacher');
    await setSession(cdp, teacherSession);
    await navigate(cdp, `${FRONTEND_URL}/dashboard/manage-users`);
    const teacherRestricted = await getDomSnapshot(cdp);
    report.protectedRoutes.teacherManageUsers = {
      finalRoute: teacherRestricted.route,
      bodyText: teacherRestricted.bodyText.slice(0, 300)
    };

    await clearSession(cdp);
    await navigate(cdp, `${FRONTEND_URL}/dashboard`);
    const anonymousProtected = await getDomSnapshot(cdp);
    report.protectedRoutes.anonymousDashboard = {
      finalRoute: anonymousProtected.route,
      title: anonymousProtected.title
    };

    const reportPath = path.join(SCREENSHOT_DIR, 'report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ reportPath, screenshotDir: SCREENSHOT_DIR }, null, 2));
  } finally {
    await cdp.close();
    browser.kill('SIGKILL');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
