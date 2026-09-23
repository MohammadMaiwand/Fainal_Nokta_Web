import type { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { PermissionService } from '../services/permissionService';
import { redactSensitivePayload } from '../utils/requestSanitizer';

const auditService = new AuditService();
const permissionService = new PermissionService();

/** High-volume routine APIs — domain services already log meaningful events when needed. */
const NOISE_PATH_PATTERNS = [
  /\/attendance\b/i,
  /\/uploads?\b/i,
  /\/search\b/i,
  /\/notifications\b/i,
  /\/intelligence\b/i,
  /\/ai[-/]/i,
  /\/offline\b/i,
  /\/heartbeat\b/i,
  /\/health\b/i,
  /\/dashboard\b/i,
  /\/reports\/analytics\b/i,
  /\/payroll\/.*tax/i,
  /\/exams\/ai\b/i
];

/** Routes where middleware should still record successful mutations (auth/admin surface). */
const SECURITY_PATH_PATTERNS = [
  /\/auth\b/i,
  /\/users\b/i,
  /\/roles\b/i,
  /\/permissions\b/i,
  /\/audit\b/i,
  /\/branches\b/i,
  /\/settings\b/i
];

function pathMatches(url: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Global audit must stay narrow:
 * - destructive DELETE
 * - security/admin route mutations
 * Auth failures (401/403) are already recorded by auth middleware / authService.
 * Routine POST/PUT/PATCH are handled by domain AuditLog.create when important.
 */
function shouldRecordMiddlewareAudit(req: Request, res: Response): boolean {
  if (!req.user?.userId) {
    return false;
  }

  const status = res.statusCode;
  if (status < 200 || status >= 400) {
    // Skip all error responses here — domain/auth layers own failure audits.
    return false;
  }

  const url = req.originalUrl || req.url || '';
  const method = req.method.toUpperCase();

  if (pathMatches(url, NOISE_PATH_PATTERNS)) {
    return false;
  }

  if (method === 'DELETE') {
    return true;
  }

  if (pathMatches(url, SECURITY_PATH_PATTERNS)) {
    return true;
  }

  return false;
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!shouldAudit) {
    return next();
  }

  res.on('finish', () => {
    if (!shouldRecordMiddlewareAudit(req, res)) {
      return;
    }

    const policy = permissionService.getRoutePolicy(req.originalUrl, req.method);
    const status = res.statusCode;
    void auditService.recordAction({
      actorId: req.user!.userId,
      branchId: req.user!.branchId ?? null,
      action: policy?.auditAction ?? `${method} ${req.originalUrl}`,
      target: req.params.id ?? '',
      targetType: req.baseUrl || req.originalUrl,
      severity: status === 401 || status === 403 ? 'warning' : status >= 400 ? 'warning' : 'info',
      metadata: {
        method,
        url: req.originalUrl,
        statusCode: status,
        source: 'middleware',
        requestBody: redactSensitivePayload(req.body)
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? ''
    });
  });

  next();
}
