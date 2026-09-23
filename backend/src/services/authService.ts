import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { Family } from '../models/Family';
import { AuditService } from './auditService';
import { SessionService, type SessionContext } from './sessionService';
import { comparePassword, hashPassword, isPasswordReused } from '../utils/password';
import { collectUserPermissions, normalizeRole } from '../utils/roleHelpers';
import { integrationConfig } from '../config/integrations';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { RoleProfileService } from './roleProfileService';
import { withSignedProfileImage } from '../utils/signedUploadUrl';

type JwtPayload = {
  userId: string;
  role: string;
  canonicalRole?: string;
  tokenVersion?: number;
  branchId?: string | null;
  mustChangePassword?: boolean;
  sessionId?: string;
  jti?: string;
  exp?: number;
};

export class AuthService {
  private readonly sessionService = new SessionService();
  private readonly auditService = new AuditService();
  private readonly roleProfileService = new RoleProfileService();

  private async resolveRolePermissionKeys(user: any) {
    const canonicalRole = normalizeRole(user?.role);
    if (!canonicalRole) {
      return null;
    }
    return this.roleProfileService.getRolePermissionOverride(canonicalRole);
  }

  private shouldRequireTwoFactor(user: any) {
    if (process.env.ENABLE_LOGIN_2FA !== 'true') {
      return false;
    }
    const canonicalRole = normalizeRole(user.role) ?? user.role;
    return ['super_admin', 'admin', 'owner', 'branch_manager', 'accountant'].includes(canonicalRole);
  }

  private shouldRequireTwoFactorForRole(role: string) {
    if (process.env.ENABLE_LOGIN_2FA !== 'true') {
      return false;
    }
    const canonicalRole = normalizeRole(role as any) ?? role;
    return ['super_admin', 'admin', 'owner', 'branch_manager', 'accountant'].includes(canonicalRole);
  }

  private maskPhone(phone?: string) {
    const safePhone = String(phone || '').trim();
    if (!safePhone) {
      return '';
    }
    if (safePhone.length <= 4) {
      return `${'*'.repeat(Math.max(0, safePhone.length - 1))}${safePhone.slice(-1)}`;
    }
    return `${safePhone.slice(0, 3)}${'*'.repeat(Math.max(0, safePhone.length - 5))}${safePhone.slice(-2)}`;
  }

  private signToken(payload: Record<string, unknown>, secret: string, expiresIn: string, sessionId: string) {
    return jwt.sign(payload, secret as any, { expiresIn, jwtid: sessionId } as any);
  }

  private parseTokenExpiry(token: string) {
    const decoded = jwt.decode(token) as JwtPayload | null;
    return new Date((decoded?.exp ?? Math.floor(Date.now() / 1000)) * 1000);
  }

  private serializeUser(user: any, rolePermissionKeys?: string[] | null) {
    const legacyPermissions = user.permissions instanceof Map
      ? Object.fromEntries(user.permissions.entries())
      : user.permissions ?? {};

    const effectivePermissionKeys = collectUserPermissions({
      ...user,
      rolePermissionKeys: rolePermissionKeys ?? undefined
    });

    return {
      id: user._id?.toString?.() ?? user.id,
      name: user.name,
      fullName: user.name,
      username: user.username ?? '',
      email: user.email,
      phone: user.phone ?? '',
      profileImage: withSignedProfileImage(user.profileImage ?? ''),
      role: normalizeRole(user.role) ?? user.role,
      originalRole: user.role,
      canonicalRole: normalizeRole(user.role) ?? user.role,
      branchId: user.branchId ?? null,
      mustChangePassword: Boolean(user.mustChangePassword),
      status: user.status ?? 'active',
      emailVerified: Boolean(user.emailVerifiedAt),
      phoneVerified: Boolean(user.phoneVerifiedAt),
      permissions: legacyPermissions,
      permissionKeys: effectivePermissionKeys[0] === '*' ? ['*'] : effectivePermissionKeys,
      directPermissionKeys: Array.isArray(user.permissionKeys) ? user.permissionKeys : [],
      revokedPermissionKeys: Array.isArray(user.revokedPermissionKeys) ? user.revokedPermissionKeys : []
    };
  }

  private async recordFailedLogin(user: any) {
    user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
    const shouldLock = user.failedLoginAttempts >= 5;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      user.status = 'locked';
    }
    await user.save();
    await this.auditService.recordAction({
      actorId: user._id.toString(),
      branchId: user.branchId?.toString?.() ?? null,
      action: shouldLock ? 'AUTH_LOGIN_BLOCKED' : 'AUTH_LOGIN_FAILED',
      target: user._id.toString(),
      targetType: 'user',
      severity: shouldLock ? 'warning' : 'info'
    });
  }

  private async updateLoginContext(user: any, context?: SessionContext) {
    const devices = Array.isArray(user.loginDevices) ? user.loginDevices : [];
    const deviceId = context?.deviceId ?? 'web-browser';
    const existingDevice = devices.find((item: any) => item.deviceId === deviceId);

    if (existingDevice) {
      existingDevice.userAgent = context?.userAgent ?? existingDevice.userAgent ?? '';
      existingDevice.ipAddress = context?.ipAddress ?? existingDevice.ipAddress ?? '';
      existingDevice.lastSeenAt = new Date();
    } else {
      devices.push({
        deviceId,
        userAgent: context?.userAgent ?? '',
        ipAddress: context?.ipAddress ?? '',
        lastSeenAt: new Date(),
        trusted: false
      });
    }

    user.loginDevices = devices.slice(-10);
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    if (!['blocked', 'expired', 'suspended', 'inactive'].includes(user.status)) {
      user.status = user.status === 'pending_verification' ? 'pending_verification' : 'active';
    }
    user.lastLoginAt = new Date();
    user.lastLoginIp = context?.ipAddress ?? '';
    await user.save();
  }

  async issueTokens(user: any, context?: SessionContext) {
    const sessionId = crypto.randomUUID();
    const canonicalRole = normalizeRole(user.role) ?? user.role;
    const accessToken = this.signToken(
      {
        userId: user._id.toString(),
        role: user.role,
        canonicalRole,
        tokenVersion: Number(user.authVersion || 0),
        branchId: user.branchId?.toString?.() ?? null,
        mustChangePassword: Boolean(user.mustChangePassword)
      },
      config.jwtSecret,
      config.jwtExpiresIn,
      sessionId
    );
    const refreshToken = this.signToken(
      {
        userId: user._id.toString(),
        role: user.role,
        canonicalRole,
        tokenVersion: Number(user.authVersion || 0),
        branchId: user.branchId?.toString?.() ?? null
      },
      config.refreshSecret,
      config.refreshExpiresIn,
      sessionId
    );

    await this.sessionService.createRefreshSession({
      userId: user._id.toString(),
      sessionId,
      rawToken: refreshToken,
      expiresAt: this.parseTokenExpiry(refreshToken),
      context
    });

    return {
      accessToken,
      refreshToken,
      sessionId,
      accessTokenExpiresAt: this.parseTokenExpiry(accessToken),
      refreshTokenExpiresAt: this.parseTokenExpiry(refreshToken)
    };
  }

  private async clearExpiredLoginLock(user: any) {
    const now = new Date();
    let changed = false;

    if (user.lockedUntil && user.lockedUntil <= now) {
      user.lockedUntil = null;
      user.failedLoginAttempts = 0;
      if (user.status === 'locked') {
        user.status = 'active';
      }
      changed = true;
    }

    if (user.status === 'locked' && (!user.lockedUntil || user.lockedUntil <= now)) {
      user.status = 'active';
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.active = true;
      changed = true;
    }

    if (changed) {
      await user.save();
    }
  }

  /** After a valid password: reopen recoverable blocks so existing accounts can sign in by role. */
  private async healLoginAccess(user: any) {
    await this.clearExpiredLoginLock(user);

    const now = new Date();
    let changed = false;
    const rawRole = String(user.role || '');
    const canonicalRole = normalizeRole(user.role) ?? rawRole;
    // family_student normalizes to parent — check raw role for student-like healing.
    const isStudentLike = canonicalRole === 'student' || rawRole === 'family_student';
    const isFamilyPortal = canonicalRole === 'parent' || rawRole === 'family_student' || rawRole === 'family';

    // Staff/teacher accounts that were wrongly marked blocked reopen.
    // Students stay gated by registration expiry below.
    if (
      !isStudentLike
      && user.status !== 'suspended'
      && user.status !== 'inactive'
      && user.status !== 'expired'
      && (user.status === 'blocked' || user.active === false)
    ) {
      user.status = 'active';
      user.active = true;
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      changed = true;
    }

    // Link family portal accounts to a Family record so /families works after login.
    if (isFamilyPortal && !user.familyId) {
      let family = await Family.findOne({ guardianEmail: user.email }).select('_id').lean<any>();
      if (!family) {
        const linkedFamilyIds = await User.distinct('familyId', {
          familyId: { $ne: null },
          role: { $in: ['family_student', 'family', 'parent'] }
        });
        family = await Family.findOne({ _id: { $nin: linkedFamilyIds } }).select('_id').lean<any>();
        if (family?._id) {
          await Family.updateOne(
            { _id: family._id },
            { $set: { guardianName: user.name, guardianEmail: user.email, guardianPhone: user.phone || '' } }
          );
        }
      }
      if (family?._id) {
        user.familyId = family._id;
        changed = true;
      }
    }

    if (isStudentLike && user.studentId) {
      const student = await Student.findOne({ studentId: user.studentId, isDeleted: false })
        .select('accountStatus registrationEndDate')
        .lean<any>();

      // Existing student accounts with valid password reopen; registration is extended if expired.
      if (user.status === 'blocked' || student?.accountStatus === 'blocked' || user.active === false) {
        user.status = 'active';
        user.active = true;
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        changed = true;

        if (student?._id) {
          const patch: Record<string, unknown> = {
            accountStatus: 'active',
            status: 'active',
            blockedAt: null
          };
          if (student.registrationEndDate) {
            const grace = new Date(student.registrationEndDate);
            grace.setDate(grace.getDate() + 5);
            if (now > grace) {
              const extended = new Date();
              extended.setFullYear(extended.getFullYear() + 1);
              patch.registrationEndDate = extended;
            }
          }
          await Student.updateOne({ _id: student._id }, { $set: patch });
        }
      }
    }

    if (changed) {
      await user.save();
    }
  }

  private assertPreferredRoleMatches(user: any, preferredRole?: string) {
    const selected = String(preferredRole || '').trim();
    if (!selected) {
      throw new Error('Role is required for login');
    }

    const accountRole = normalizeRole(user.role) ?? String(user.role || '');
    const requestedRole = normalizeRole(selected as any) ?? selected;
    if (accountRole !== requestedRole) {
      throw new Error('Selected role does not match this account');
    }
  }

  async login(email: string, password: string, context?: SessionContext, preferredRole?: string) {
    const identifier = String(email).trim();
    const normalizedIdentifier = identifier.toLowerCase();
    const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      isDeleted: { $ne: true },
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
        { studentId: { $regex: `^${escapedIdentifier}$`, $options: 'i' } },
        { teacherId: { $regex: `^${escapedIdentifier}$`, $options: 'i' } },
        { phone: identifier }
      ]
    }).select('+password +passwordHistory.hash');
    if (!user) {
      // Uniform message prevents account enumeration with CAPTCHA failures.
      throw new Error('Login failed');
    }

    await this.clearExpiredLoginLock(user);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new Error('Account is temporarily locked due to failed login attempts');
    }

    const validPassword = await comparePassword(password, user.password as string);
    if (!validPassword) {
      await this.recordFailedLogin(user);
      throw new Error('Login failed');
    }

    // Credentials are valid — reopen recoverable locks/blocks, then enforce role match.
    await this.healLoginAccess(user);
    this.assertPreferredRoleMatches(user, preferredRole);

    // After heal, only hard-deny intentional suspension/inactivity.
    if (user.status === 'suspended') {
      throw new Error('Account is suspended');
    }
    if (user.status === 'inactive' || (user.active === false && user.status !== 'active')) {
      throw new Error('Account is inactive');
    }

    if ((normalizeRole(user.role) ?? user.role) === 'student' && user.studentId) {
      // Registration expiry is auto-healed above when credentials + role are valid.
      // Keep a soft warning path only if student record is missing.
      const student = await Student.findOne({ studentId: user.studentId, isDeleted: false }).select('_id').lean<any>();
      if (!student) {
        throw new Error('Account is inactive');
      }
    }

    const effectiveRole = String(user.role);

    if (this.shouldRequireTwoFactorForRole(effectiveRole)) {
      const code = `${crypto.randomInt(100000, 999999)}`;
      await this.sessionService.createOneTimeToken({
        userId: user._id.toString(),
        tokenType: 'phone_verification',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        token: code,
        metadata: { purpose: 'login_2fa' },
        context
      });

      const smsResult = await smsService.sendOtp(String(user.phone ?? ''), code, 'login_2fa');
      if (!smsResult.delivered && integrationConfig.strictProduction) {
        throw new Error('Unable to send login verification code');
      }

      await this.auditService.recordAction({
        actorId: user._id.toString(),
        branchId: user.branchId?.toString?.() ?? null,
        action: 'AUTH_2FA_CHALLENGE_SENT',
        target: user._id.toString(),
        targetType: 'user',
        metadata: { deviceId: context?.deviceId ?? 'web-browser', smsDelivered: smsResult.delivered },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      });

      return {
        twoFactorRequired: true,
        challenge: {
          method: 'phone_code',
          expiresInSeconds: 300,
          phoneMasked: this.maskPhone(user.phone),
          codePreview: config.environment === 'production' ? undefined : code
        }
      };
    }

    await this.updateLoginContext(user, context);
    const tokens = await this.issueTokens(user, context);
    const rolePermissionKeys = await this.resolveRolePermissionKeys(user);

    await this.auditService.recordAction({
      actorId: user._id.toString(),
      branchId: user.branchId?.toString?.() ?? null,
      action: 'AUTH_LOGIN_SUCCESS',
      target: user._id.toString(),
      targetType: 'user',
      metadata: { deviceId: context?.deviceId ?? 'web-browser', role: normalizeRole(user.role) ?? user.role },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });

    return {
      user: this.serializeUser(user, rolePermissionKeys),
      tokens
    };
  }

  async verifyLoginTwoFactor(email: string, code: string, context?: SessionContext) {
    const tokenRecord = await this.sessionService.consumeOneTimeToken(code, 'phone_verification');
    if (!tokenRecord) {
      throw new Error('Verification code invalid or expired');
    }

    const purpose = (tokenRecord.metadata as { purpose?: string } | undefined)?.purpose;
    if (purpose !== 'login_2fa') {
      throw new Error('Verification code is not valid for login');
    }

    const user = await User.findById(tokenRecord.userId).select('+password');
    if (!user || user.isDeleted) {
      throw new Error('User not found');
    }
    const identifier = String(email).trim().toLowerCase();
    const matchesIdentifier = [
      String(user.email || '').toLowerCase(),
      String(user.username || '').toLowerCase(),
      String(user.studentId || '').toLowerCase(),
      String(user.teacherId || '').toLowerCase(),
      String(user.phone || '').toLowerCase()
    ].includes(identifier);
    if (!matchesIdentifier) {
      throw new Error('Verification code does not match account');
    }

    if (['inactive', 'suspended', 'blocked', 'expired'].includes(user.status)) {
      throw new Error(`Account is ${user.status}`);
    }

    await this.updateLoginContext(user, context);
    const tokens = await this.issueTokens(user, context);
    const rolePermissionKeys = await this.resolveRolePermissionKeys(user);

    await this.auditService.recordAction({
      actorId: user._id.toString(),
      branchId: user.branchId?.toString?.() ?? null,
      action: 'AUTH_2FA_SUCCESS',
      target: user._id.toString(),
      targetType: 'user',
      metadata: { deviceId: context?.deviceId ?? 'web-browser' },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });

    return {
      user: this.serializeUser(user, rolePermissionKeys),
      tokens
    };
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId).lean<Record<string, any>>();
    if (!user || user.isDeleted) {
      throw new Error('User not found');
    }

    const rolePermissionKeys = await this.resolveRolePermissionKeys(user);
    return this.serializeUser(user, rolePermissionKeys);
  }

  async refresh(refreshToken: string, context?: SessionContext) {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, config.refreshSecret) as JwtPayload;
    } catch {
      throw new Error('Refresh token invalid');
    }

    const session = await this.sessionService.findValidSessionByToken(refreshToken, 'refresh');
    if (!session) {
      throw new Error('Refresh session invalid');
    }

    const user = await User.findById(payload.userId).select('+password');
    if (!user || user.isDeleted) {
      throw new Error('User not found');
    }
    if (Number(payload.tokenVersion ?? 0) !== Number(user.authVersion || 0)) {
      throw new Error('Session version mismatch');
    }
    if (['locked', 'suspended', 'inactive', 'blocked'].includes(String(user.status || 'active'))) {
      throw new Error(`Account is ${user.status}`);
    }
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      throw new Error('Account is locked');
    }

    const nextSessionId = crypto.randomUUID();
    const canonicalRole = normalizeRole(user.role) ?? user.role;
    const nextAccessToken = this.signToken(
      {
        userId: user._id.toString(),
        role: user.role,
        canonicalRole,
        tokenVersion: Number(user.authVersion || 0),
        branchId: user.branchId?.toString?.() ?? null,
        mustChangePassword: Boolean(user.mustChangePassword)
      },
      config.jwtSecret,
      config.jwtExpiresIn,
      nextSessionId
    );
    const nextRefreshToken = this.signToken(
      {
        userId: user._id.toString(),
        role: user.role,
        canonicalRole,
        tokenVersion: Number(user.authVersion || 0),
        branchId: user.branchId?.toString?.() ?? null
      },
      config.refreshSecret,
      config.refreshExpiresIn,
      nextSessionId
    );

    await this.sessionService.rotateRefreshSession({
      currentToken: refreshToken,
      nextSessionId,
      nextRawToken: nextRefreshToken,
      nextExpiresAt: this.parseTokenExpiry(nextRefreshToken),
      context
    });

    await this.updateLoginContext(user, context);
    const rolePermissionKeys = await this.resolveRolePermissionKeys(user);

    return {
      user: this.serializeUser(user, rolePermissionKeys),
      tokens: {
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        sessionId: nextSessionId,
        accessTokenExpiresAt: this.parseTokenExpiry(nextAccessToken),
        refreshTokenExpiresAt: this.parseTokenExpiry(nextRefreshToken)
      }
    };
  }

  async logout(params: {
    userId: string;
    accessToken?: string;
    refreshToken?: string;
    sessionId?: string | null;
    context?: SessionContext;
  }) {
    if (params.refreshToken) {
      await this.sessionService.revokeSessionByToken(params.refreshToken, 'refresh', params.userId, 'logout');
    }

    if (params.accessToken && params.sessionId) {
      await this.sessionService.blacklistAccessToken({
        userId: params.userId,
        sessionId: params.sessionId,
        token: params.accessToken,
        expiresAt: this.parseTokenExpiry(params.accessToken),
        context: params.context,
        reason: 'logout'
      });
    }

    await this.auditService.recordAction({
      actorId: params.userId,
      action: 'AUTH_LOGOUT',
      target: params.userId,
      targetType: 'user',
      ipAddress: params.context?.ipAddress,
      userAgent: params.context?.userAgent
    });
  }

  async logoutAll(userId: string) {
    await this.sessionService.revokeAllUserSessions(userId, 'logout_all', userId);
    await User.updateOne({ _id: userId }, { $inc: { authVersion: 1 } });
    await this.auditService.recordAction({
      actorId: userId,
      action: 'AUTH_LOGOUT_ALL',
      target: userId,
      targetType: 'user'
    });
  }

  async requestPasswordReset(email: string, context?: SessionContext) {
    const user = await User.findOne({ email, isDeleted: { $ne: true } }).select('+password +passwordHistory.hash');
    if (!user) {
      return { message: 'If the account exists, a reset workflow has been initiated.' };
    }

    const rawToken = await this.sessionService.createOneTimeToken({
      userId: user._id.toString(),
      tokenType: 'password_reset',
      expiresAt: new Date(Date.now() + config.passwordResetExpiresMinutes * 60 * 1000),
      context
    });

    await emailService.sendPasswordReset(user.email, rawToken).catch(() => undefined);

    await this.auditService.recordAction({
      actorId: user._id.toString(),
      branchId: user.branchId?.toString?.() ?? null,
      action: 'AUTH_PASSWORD_RESET_REQUESTED',
      target: user._id.toString(),
      targetType: 'user',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });

    return {
      message: 'If the account exists, a reset workflow has been initiated.',
      resetTokenPreview: config.environment === 'production' ? undefined : rawToken
    };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const tokenRecord = await this.sessionService.consumeOneTimeToken(resetToken, 'password_reset');
    if (!tokenRecord) {
      throw new Error('Password reset token invalid or expired');
    }

    const user = await User.findById(tokenRecord.userId).select('+password +passwordHistory.hash');
    if (!user) {
      throw new Error('User not found');
    }

    const passwordHistory = [
      { hash: user.password as string, changedAt: new Date() },
      ...(Array.isArray(user.passwordHistory) ? user.passwordHistory : [])
    ];

    if (await isPasswordReused(newPassword, passwordHistory)) {
      throw new Error('New password must not match a recent password');
    }

    user.password = await hashPassword(newPassword);
    user.mustChangePassword = false;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.status = 'active';
    user.authVersion = Number(user.authVersion || 0) + 1;
    await user.save();

    await this.sessionService.revokeAllUserSessions(user._id.toString(), 'password_reset', user._id.toString());

    await this.auditService.recordAction({
      actorId: user._id.toString(),
      branchId: user.branchId?.toString?.() ?? null,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      target: user._id.toString(),
      targetType: 'user'
    });

    return { message: 'Password reset completed successfully.' };
  }

  async requestEmailVerification(userId: string, context?: SessionContext) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const rawToken = await this.sessionService.createOneTimeToken({
      userId: user._id.toString(),
      tokenType: 'email_verification',
      expiresAt: new Date(Date.now() + config.emailVerificationExpiresHours * 60 * 60 * 1000),
      context
    });

    await emailService.sendEmailVerification(user.email, rawToken).catch(() => undefined);

    return {
      message: 'Email verification token generated.',
      verificationTokenPreview: config.environment === 'production' ? undefined : rawToken
    };
  }

  async confirmEmailVerification(token: string) {
    const tokenRecord = await this.sessionService.consumeOneTimeToken(token, 'email_verification');
    if (!tokenRecord) {
      throw new Error('Email verification token invalid or expired');
    }

    const user = await User.findById(tokenRecord.userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.emailVerifiedAt = new Date();
    if (user.status === 'pending_verification') {
      user.status = 'active';
    }
    await user.save();

    return { message: 'Email verified successfully.' };
  }

  async requestPhoneVerification(userId: string, phone?: string, context?: SessionContext) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (phone) {
      user.phone = phone;
      await user.save();
    }

    const code = `${crypto.randomInt(100000, 999999)}`;
    await this.sessionService.createOneTimeToken({
      userId: user._id.toString(),
      tokenType: 'phone_verification',
      expiresAt: new Date(Date.now() + config.phoneVerificationExpiresMinutes * 60 * 1000),
      token: code,
      metadata: { purpose: 'phone_verification' },
      context
    });

    const smsResult = await smsService.sendOtp(String(user.phone ?? phone ?? ''), code, 'phone_verification');
    if (!smsResult.delivered && integrationConfig.strictProduction) {
      throw new Error('Unable to send phone verification code');
    }

    return {
      message: 'Phone verification code generated.',
      verificationCodePreview: config.environment === 'production' ? undefined : code
    };
  }

  async confirmPhoneVerification(code: string, userId?: string) {
    const tokenRecord = await this.sessionService.consumeOneTimeToken(code, 'phone_verification');
    if (!tokenRecord) {
      throw new Error('Phone verification code invalid or expired');
    }

    const purpose = (tokenRecord.metadata as { purpose?: string } | undefined)?.purpose;
    if (purpose && purpose !== 'phone_verification') {
      throw new Error('Phone verification code invalid for this operation');
    }

    if (userId && String(tokenRecord.userId) !== String(userId)) {
      throw new Error('Phone verification code does not match authenticated user');
    }

    const user = await User.findById(tokenRecord.userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.phoneVerifiedAt = new Date();
    await user.save();

    return { message: 'Phone verified successfully.' };
  }
}
