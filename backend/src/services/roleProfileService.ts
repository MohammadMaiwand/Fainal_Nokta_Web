import { enterprisePermissions, legacyRoleAliases, rolePermissionMatrix, type CanonicalRole, type PermissionKey } from '../config/systemMasterRules';
import { Role } from '../models/Role';
import { normalizeRole } from '../utils/roleHelpers';

const permissionLookup = new Set<string>(enterprisePermissions);

type CacheEntry = {
  value: PermissionKey[] | null;
  expiresAt: number;
};

const ROLE_PERMISSION_CACHE_TTL_MS = 60_000;
const rolePermissionCache = new Map<string, CacheEntry>();

export class RoleProfileService {
  getDefaultPermissionKeys(role: CanonicalRole): PermissionKey[] {
    const defaults = rolePermissionMatrix[role];
    if (defaults[0] === '*') {
      return [...enterprisePermissions];
    }

    return [...(defaults as PermissionKey[])];
  }

  normalizePermissionKeys(role: CanonicalRole, permissionKeys?: string[]) {
    if (role === 'super_admin') {
      return this.getDefaultPermissionKeys(role);
    }

    const normalized = Array.from(new Set((permissionKeys ?? []).filter((permission): permission is PermissionKey => permissionLookup.has(permission))));
    if (normalized.length) {
      return normalized;
    }

    return this.getDefaultPermissionKeys(role);
  }

  async getRoleProfile(role?: string | null) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      return null;
    }

    return Role.findOne({ slug: normalizedRole, isDeleted: false }).lean<Record<string, any>>();
  }

  async getRolePermissionOverride(role?: string | null) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole || normalizedRole === 'super_admin') {
      return null;
    }

    const cached = rolePermissionCache.get(normalizedRole);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const roleProfile = await this.getRoleProfile(normalizedRole);
    const value = roleProfile?.permissionKeys?.length
      ? this.normalizePermissionKeys(normalizedRole, roleProfile.permissionKeys)
      : null;

    rolePermissionCache.set(normalizedRole, {
      value,
      expiresAt: Date.now() + ROLE_PERMISSION_CACHE_TTL_MS
    });

    return value;
  }

  /** Call after role permission edits so auth middleware picks up changes quickly. */
  clearRolePermissionCache(role?: string | null) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      rolePermissionCache.clear();
      return;
    }
    rolePermissionCache.delete(normalizedRole);
  }

  getAcceptedRoles(role: CanonicalRole) {
    return [
      role,
      ...Object.entries(legacyRoleAliases)
        .filter(([, canonicalRole]) => canonicalRole === role)
        .map(([legacyRole]) => legacyRole)
    ];
  }
}
