import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { connectDatabase } from './database/connect';
import { config } from './config/env';
import { integrationConfig } from './config/integrations';
import { isOriginAllowed } from './constants/allowedOrigins';
import './models';
import { startAutomationJobs } from './jobs';
import { authenticate } from './middlewares/auth';
import { auditMiddleware } from './middlewares/audit';
import { branchMiddleware } from './middlewares/branch';
import { apiReadLimiter, apiWriteLimiter } from './middlewares/rateLimiter';
import { ownershipMiddleware } from './middlewares/ownership';
import { routePermissionMiddleware } from './middlewares/permission';
import { csrfProtectionMiddleware, requestContextMiddleware, requestSanitizationMiddleware } from './middlewares/security';
import { errorHandler } from './middlewares/errorHandler';
import { registerFrontendStatic } from './middlewares/serveFrontend';
import { apiRouter } from './routes';
import { systemRouter } from './routes/system.routes';
import { PermissionService } from './services/permissionService';
import { ensureDefaultTaxPercentageSetting } from './services/afghanistanAcademyTaxService';
import { ensureDefaultTaxRules } from './services/afghanistanSalaryTaxService';
import { logger } from './utils/logger';
import { verifyUploadSignature } from './utils/signedUploadUrl';

const app = express();
const permissionService = new PermissionService();

app.set('trust proxy', integrationConfig.tls.trustProxy ? 1 : 0);

if (integrationConfig.tls.forceHttps) {
  app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/health/ready') {
      return next();
    }
    const forwarded = req.header('x-forwarded-proto');
    if (req.secure || forwarded === 'https') {
      return next();
    }
    const host = req.get('host');
    if (!host) {
      return next();
    }
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  });
}

const corsOptions = {
  origin: (origin: string | undefined | null, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }
    if (isOriginAllowed(origin, config.environment)) {
      return callback(null, true);
    }
    logger.warn('Blocked CORS origin', { origin });
    return callback(new Error(`CORS blocked: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    config.csrfHeaderName,
    'x-device-id',
    'x-device-name',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    // Payment / loan idempotency (required for browser preflight when calling API cross-origin)
    'Idempotency-Key',
    'X-Idempotency-Key',
    'idempotency-key',
    'x-idempotency-key'
  ],
  exposedHeaders: ['Authorization', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  ...(integrationConfig.tls.forceHttps
    ? { hsts: { maxAge: integrationConfig.tls.hstsMaxAge, includeSubDomains: true } }
    : {})
}));

app.use(requestContextMiddleware);
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
app.use(requestSanitizationMiddleware);
app.use(csrfProtectionMiddleware);
app.use(compression());

app.use('/uploads/profiles', (req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin, config.environment)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'private, max-age=3600');
  res.header('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  const pathname = `/uploads/profiles${req.path.startsWith('/') ? req.path : `/${req.path}`}`;
  const hasValidSignature = verifyUploadSignature(
    pathname,
    req.query.exp as string | undefined,
    req.query.sig as string | undefined
  );
  const authHeader = req.headers.authorization;
  if (!hasValidSignature && !authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Upload access requires a signed URL or authentication' });
  }

  if (hasValidSignature) {
    return next();
  }

  return authenticate(req, res, next);
}, express.static(path.join(__dirname, '../uploads/profiles'), {
  index: false,
  redirect: false,
  fallthrough: false
}));

if (config.environment !== 'test') {
  app.use((req, res, next) => {
    if (config.environment !== 'development') {
      return next();
    }
    const url = String(req.url || '');
    // Health polls flood logs and slow the console I/O — skip them.
    if (url.startsWith('/health') || url === '/' || url.startsWith('/favicon')) {
      return next();
    }
    logger.info('Request', { method: req.method, url, requestId: req.requestId ?? null });
    next();
  });
}

if (process.env.SERVE_FRONTEND === 'true') {
  registerFrontendStatic(app);
}

app.use(systemRouter);
app.use('/api', (req, res, next) => (
  permissionService.isPublicRoute(req.originalUrl, req.method)
    ? next()
    : authenticate(req, res, next)
));
app.use('/api', apiReadLimiter, apiWriteLimiter, routePermissionMiddleware, branchMiddleware, ownershipMiddleware, auditMiddleware, apiRouter);

if (process.env.SERVE_FRONTEND !== 'true') {
  registerFrontendStatic(app);
}

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

export default app;

export async function createApp() {
  await connectDatabase();
  await Promise.all([
    ensureDefaultTaxPercentageSetting().catch((error) => {
      logger.warn('Could not ensure default academy tax percentage setting', { error });
    }),
    ensureDefaultTaxRules().catch((error) => {
      logger.warn('Could not ensure default salary tax rules', { error });
    })
  ]);
  startAutomationJobs();
  return app;
}
