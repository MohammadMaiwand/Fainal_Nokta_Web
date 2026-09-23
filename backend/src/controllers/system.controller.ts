import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { config } from '../config/env';
import { getIntegrationsReadiness, integrationConfig } from '../config/integrations';
import { logger } from '../utils/logger';

function databaseStatus() {
  const readyState = mongoose.connection.readyState;
  return {
    up: readyState === 1,
    readyState
  };
}

function environmentSanity() {
  const requiredSecrets = [
    { name: 'JWT secret', value: config.jwtSecret },
    { name: 'Refresh secret', value: config.refreshSecret },
    { name: 'CSRF secret', value: config.csrfSecret }
  ];
  const weakSecrets = requiredSecrets
    .filter((item) => typeof item.value !== 'string' || item.value.length < 32)
    .map((item) => item.name);

  return {
    up: weakSecrets.length === 0,
    weakSecrets
  };
}

function providerConfigStatus() {
  const stripeEnabled = config.paymentProvider === 'stripe';
  const stripeConfigured = Boolean(config.stripeSecretKey && config.stripeWebhookSecret);
  return {
    paymentProvider: config.paymentProvider,
    up: !stripeEnabled || stripeConfigured
  };
}

function resolveAppVersion() {
  return process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';
}

export function healthCheck(_req: Request, res: Response) {
  const database = databaseStatus();
  const env = environmentSanity();
  const providers = providerConfigStatus();
  const uptimeSeconds = Math.floor(process.uptime());
  res.status(200).json({
    status: 'ok',
    service: 'nokta-academy-backend',
    version: resolveAppVersion(),
    port: config.port,
    environment: config.environment,
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    checks: {
      database: database.up ? 'up' : 'unknown',
      env: env.up ? 'up' : 'degraded',
      providers: providers.up ? 'up' : 'degraded'
    }
  });
}

function integrationsStatus() {
  const readiness = getIntegrationsReadiness();
  return {
    up: readiness.ok,
    ...readiness
  };
}

export function readinessCheck(_req: Request, res: Response) {
  const database = databaseStatus();
  const env = environmentSanity();
  const providers = providerConfigStatus();
  const integrations = integrationsStatus();
  const ready = database.up && env.up && providers.up && integrations.up;
  const memory = process.memoryUsage();

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    version: resolveAppVersion(),
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed
    },
    checks: {
      database: database.up ? 'up' : 'down',
      env: env.up ? 'up' : 'down',
      providers: providers.up ? 'up' : 'down',
      integrations: integrations.up ? 'up' : 'down'
    },
    integrations: {
      strict: integrationConfig.strictProduction,
      issues: integrations.issues,
      email: integrations.email,
      sms: integrations.sms,
      stripe: integrations.stripe,
      ai: integrations.ai
    }
  });
}

export function internalDiagnostics(req: Request, res: Response) {
  const database = databaseStatus();
  const env = environmentSanity();
  const providers = providerConfigStatus();
  const integrations = integrationsStatus();
  const memory = process.memoryUsage();

  logger.info('Internal diagnostics requested', {
    requestId: req.requestId ?? null,
    role: req.user?.canonicalRole ?? req.user?.role ?? null,
    userId: req.user?.userId ?? null
  });

  res.status(200).json({
    status: 'ok',
    service: 'nokta-academy-backend',
    environment: config.environment,
    version: resolveAppVersion(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      database,
      env,
      providers,
      integrations
    },
    runtime: {
      nodeVersion: process.version,
      pid: process.pid,
      memory
    }
  });
}

export function getOpenApiSpec(_req: Request, res: Response) {
  res.sendFile(path.join(__dirname, '../../openapi/openapi.json'));
}

export function getApiDocs(_req: Request, res: Response) {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nokta Academy API Docs</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; }
    main { max-width: 1100px; margin: 0 auto; padding: 32px 20px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .meta { margin-bottom: 24px; color: #475569; }
    .endpoint { margin: 10px 0; padding: 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; }
    .method { display: inline-block; min-width: 72px; font-weight: 700; text-transform: uppercase; color: #0369a1; }
    code { font-family: Consolas, monospace; }
    a { color: #0369a1; }
    @media (prefers-color-scheme: dark) {
      body { background: #020617; color: #e2e8f0; }
      .meta { color: #94a3b8; }
      .endpoint { border-color: #334155; background: #0f172a; }
      .method, a { color: #38bdf8; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Nokta Academy API Docs</h1>
    <p class="meta">Offline documentation generated from <a href="/openapi.json">/openapi.json</a>.</p>
    <section id="content">Loading local API spec...</section>
  </main>
  <script>
    fetch('/openapi.json')
      .then((response) => response.json())
      .then((spec) => {
        const content = document.getElementById('content');
        const title = spec.info && spec.info.title ? spec.info.title : 'API';
        const version = spec.info && spec.info.version ? spec.info.version : '';
        const paths = spec.paths || {};
        const rows = [];
        Object.keys(paths).sort().forEach((path) => {
          Object.keys(paths[path]).sort().forEach((method) => {
            const operation = paths[path][method] || {};
            rows.push(
              '<div class="endpoint">' +
              '<span class="method">' + method + '</span> ' +
              '<code>' + path + '</code>' +
              (operation.summary ? '<div>' + operation.summary + '</div>' : '') +
              '</div>'
            );
          });
        });
        content.innerHTML =
          '<p class="meta">' + title + (version ? ' v' + version : '') + '</p>' +
          (rows.length ? rows.join('') : '<p>No endpoints found.</p>');
      })
      .catch(() => {
        document.getElementById('content').textContent = 'Unable to load local OpenAPI spec.';
      });
  </script>
</body>
</html>`);
}

export function getApiOverview(req: Request, res: Response) {
  res.json({
    message: 'Nokta Academy Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      readiness: '/health/ready',
      openApi: '/openapi.json',
      docs: '/api-docs',
      auth: '/api/auth',
      users: '/api/users',
      branches: '/api/branches',
      students: '/api/students',
      teachers: '/api/teachers',
      classes: '/api/classes',
      subjects: '/api/subjects',
      attendance: '/api/attendance',
      exams: '/api/exams',
      results: '/api/results',
      payments: '/api/payments',
      finance: '/api/finance',
      expenses: '/api/expenses',
      families: '/api/families',
      books: '/api/books',
      audit: '/api/audit',
      notifications: '/api/notifications',
      roles: '/api/roles',
      permissions: '/api/permissions',
      dashboard: '/api/dashboard',
      reports: '/api/reports',
      languageSettings: '/api/language-settings',
      admin: '/api/admin'
    }
  });
}
