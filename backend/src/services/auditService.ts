import { AuditLog } from '../models/AuditLog';

/** Actions that represent real security / access-control events (for dashboards & reports). */
export const SECURITY_AUDIT_ACTION_REGEX =
  /AUTH_|PERMISSION_|SECURITY_|PASSWORD_|LOGIN_|LOGOUT_|2FA_|ROLE_|USER_DELETE|USER_CREATE|ACCESS_DENIED|ACCOUNT_AUTO_BLOCKED|REGISTRATION_EXPIRED/i;

export function buildSecurityAuditFilter(extra: Record<string, unknown> = {}) {
  return {
    isDeleted: false,
    // Only real security signals — not every HTTP 4xx that old middleware marked as warning.
    $or: [
      { severity: 'critical' },
      { action: { $regex: SECURITY_AUDIT_ACTION_REGEX } }
    ],
    ...extra
  };
}

export class AuditService {
  async recordAction(params: {
    actorId: string;
    branchId?: string | null;
    action: string;
    target?: string;
    targetType?: string;
    severity?: 'info' | 'warning' | 'critical';
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return AuditLog.create({
      actor: params.actorId,
      branchId: params.branchId ?? null,
      action: params.action,
      target: params.target ?? '',
      targetType: params.targetType ?? '',
      severity: params.severity ?? 'info',
      metadata: params.metadata ?? {},
      ipAddress: params.ipAddress ?? '',
      userAgent: params.userAgent ?? ''
    });
  }

  /** Soft-delete routine/middleware noise so security totals stay meaningful. */
  async softDeleteNoisyLogs() {
    const noisyActionRegex =
      /(^PAYROLL_WRITE$)|(^PAYROLL_ACCESS$)|(_ACCESS$)|(^ATTENDANCE_)|(^UPLOAD_)|(^SEARCH_)|(^PAYROLL_TAX)|(^PAYROLL_SELF)|(^INTELLIGENCE_)|(^AI_RESULTS_)|(^AI_EXAM_)|(^REPORT_ACCESS$)|(^ENTERPRISE_ROUTE)|(^NOTIFICATION)|(^CLASS_SUBJECTS_SYNCED$)|(^TIMETABLE_CREATE$)|(^TIMETABLE_UPDATE$)|(^TIMETABLE_DELETE$)|(^MESSAGE_CREATE$)|(^MESSAGE_REPLY$)|(^POST\s)|(^PUT\s)|(^PATCH\s)|(^DELETE\s)/i;

    const result = await AuditLog.updateMany(
      {
        isDeleted: false,
        // Old middleware marked many 4xx business failures as warning — clean those too.
        severity: { $in: ['info', 'warning'] },
        $and: [
          { action: { $regex: noisyActionRegex } },
          { action: { $not: { $regex: SECURITY_AUDIT_ACTION_REGEX } } }
        ]
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      }
    );
    return result.modifiedCount ?? 0;
  }

  /**
   * Retention:
   * - routine info noise → 90 days
   * - soft-deleted security events → 365 days
   */
  async purgeOldLogs(infoRetentionDays = 90, securityRetentionDays = 365) {
    const now = Date.now();
    const infoCutoff = new Date(now - infoRetentionDays * 24 * 60 * 60 * 1000);
    const securityCutoff = new Date(now - securityRetentionDays * 24 * 60 * 60 * 1000);

    const [infoDeleted, securityDeleted] = await Promise.all([
      AuditLog.deleteMany({
        severity: 'info',
        action: { $not: SECURITY_AUDIT_ACTION_REGEX },
        createdAt: { $lt: infoCutoff }
      }),
      AuditLog.deleteMany({
        isDeleted: true,
        $or: [
          { severity: { $in: ['warning', 'critical'] } },
          { action: { $regex: SECURITY_AUDIT_ACTION_REGEX } }
        ],
        createdAt: { $lt: securityCutoff }
      })
    ]);

    return {
      infoPurged: infoDeleted.deletedCount ?? 0,
      securityPurged: securityDeleted.deletedCount ?? 0
    };
  }
}
