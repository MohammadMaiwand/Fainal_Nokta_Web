import { Router } from 'express';
import { Request } from 'express';
import Joi from 'joi';
import { User } from '../../models/User';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createResponse, createError } from '../../helpers/response';
import { paginationSchema } from '../../validators/pagination';
import { listRecordFilter } from '../../utils/recordVisibility';
import { hashPassword } from '../../utils/password';
import { buildUserAccountPayload } from '../../utils/accountNormalization';
import { collectUserPermissions, hasPermission, normalizeRole, permissionFromLegacy, roleMatches } from '../../utils/roleHelpers';
import { enterprisePermissions, type PermissionKey } from '../../config/systemMasterRules';
import { afghanPhoneField, personNameField } from '../../validators/fieldSchemas';
import { withSignedProfileImage } from '../../utils/signedUploadUrl';
import {
  buildPaginationMeta,
  buildTextSearchFilter,
  parseMultiQueryValue,
  parsePagination,
  resolveSort
} from '../../utils/listQuery';

const router = Router();

const createSchema = Joi.object({
  body: Joi.object({
    name: personNameField(false),
    fullName: personNameField(false),
    email: Joi.string().email().max(160).required(),
    password: Joi.string().min(1).max(256).required(),
    phone: afghanPhoneField(false),
    profileImage: Joi.string().allow('', null).optional(),
    branchId: Joi.string().hex().length(24).required(),
    status: Joi.string().valid('active', 'inactive', 'blocked').optional(),
    role: Joi.string().valid('super_admin', 'admin', 'teacher', 'student', 'parent', 'owner', 'branch_manager', 'system_automation', 'family_student', 'accountant', 'librarian').required()
  }).or('name', 'fullName')
});

const updateSchema = Joi.object({
  body: Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    password: Joi.string().min(1).max(256).optional(),
    profileImage: Joi.string().allow('', null).optional(),
    branchId: Joi.string().hex().length(24).allow('', null).optional(),
    role: Joi.string().valid('super_admin', 'admin', 'teacher', 'student', 'parent', 'owner', 'branch_manager', 'system_automation', 'family_student', 'accountant', 'librarian'),
    active: Joi.boolean()
  }),
  params: Joi.object({ id: Joi.string().hex().length(24).required() })
});

const permissionsSchema = Joi.object({
  body: Joi.object({
    permissions: Joi.object().pattern(
      Joi.string(),
      Joi.array().items(Joi.string().trim().min(1)).unique()
    ).required()
  }),
  params: Joi.object({ id: Joi.string().hex().length(24).required() })
});

const idParamsSchema = Joi.object({
  params: Joi.object({ id: Joi.string().hex().length(24).required() })
});

router.use(authenticate, authorize(['super_admin', 'admin']));

function requireAccess(req: any, res: any, permission: PermissionKey) {
  if (normalizeRole(req.user?.role) !== 'super_admin' && !hasPermission(req.user, permission)) {
    res.status(403).json(createError('Forbidden'));
    return false;
  }
  return true;
}

const ELEVATED_ASSIGNABLE_ROLES = new Set(['super_admin', 'system_automation']);

function assertRoleChangeAllowed(req: Request, role?: string) {
  const actorRole = normalizeRole(req.user?.role);
  if (!role) return null;
  if (actorRole !== 'super_admin') {
    return createError('Only super_admin can change user roles');
  }
  if (ELEVATED_ASSIGNABLE_ROLES.has(role) && actorRole !== 'super_admin') {
    return createError('Cannot assign privileged role');
  }
  return null;
}

function normalizeEmail(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function permissionKeyToLegacy(permission: string) {
  const parts = permission.toLowerCase().split('_');
  const action = parts.pop() ?? 'view';
  return { module: parts.join('_'), action };
}

function permissionKeysToMap(permissionKeys: string[]) {
  return permissionKeys.reduce<Record<string, string[]>>((acc, permission) => {
    const { module, action } = permissionKeyToLegacy(permission);
    acc[module] = Array.from(new Set([...(acc[module] ?? []), action])).sort();
    return acc;
  }, {});
}

function normalizePermissionMap(permissions: Record<string, string[]>) {
  return Object.entries(permissions ?? {}).reduce<Record<string, string[]>>((acc, [moduleKey, actions]) => {
    const validActions = (Array.isArray(actions) ? actions : [])
      .map((action) => String(action).trim().toLowerCase())
      .filter((action) => permissionFromLegacy(moduleKey, action));

    if (validActions.length) {
      acc[moduleKey] = Array.from(new Set(validActions)).sort();
    }

    return acc;
  }, {});
}

function permissionMapToKeys(permissions: Record<string, string[]>) {
  const keys = Object.entries(permissions).flatMap(([moduleKey, actions]) => (
    actions
      .map((action) => permissionFromLegacy(moduleKey, action))
      .filter((permission): permission is PermissionKey => Boolean(permission))
  ));

  return Array.from(new Set(keys));
}

function serializeUser(user: any) {
  const effectivePermissions = collectUserPermissions(user);
  const effectivePermissionKeys = effectivePermissions[0] === '*' ? [...enterprisePermissions] : effectivePermissions;
  const branchRef = user?.branchId;
  return {
    ...user,
    profileImage: withSignedProfileImage(user?.profileImage ?? ''),
    branchId: branchRef?._id ?? branchRef ?? null,
    branchName: branchRef?.name ?? branchRef?.code ?? '',
    phone: user?.phone ?? user?.whatsapp ?? '',
    permissions: permissionKeysToMap(effectivePermissionKeys),
    permissionKeys: Array.isArray(user.permissionKeys) ? user.permissionKeys : [],
    revokedPermissionKeys: Array.isArray(user.revokedPermissionKeys) ? user.revokedPermissionKeys : [],
    effectivePermissionKeys
  };
}

router.post('/', validate(createSchema), async (req: Request, res, next) => {
  try {
    if (!requireAccess(req, res, 'USER_CREATE')) return;
    const roleError = assertRoleChangeAllowed(req, req.body.role);
    if (roleError) return res.status(403).json(roleError);
    const account = buildUserAccountPayload(req.body);
    const normalizedEmail = normalizeEmail(account.email);
    const exists = await User.findOne({ email: normalizedEmail, isDeleted: false }).lean();
    if (exists) return res.status(409).json(createError('Email already exists'));
    const hashed = await hashPassword(req.body.password);
    const user = await User.create({
      name: account.name,
      email: normalizedEmail,
      phone: account.phone,
      password: hashed,
      role: account.role || req.body.role,
      profileImage: account.profileImage,
      branchId: account.branchId || null,
      status: account.status,
      active: account.active
    });
    res.status(201).json(createResponse({ id: user._id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage }, 'User created'));
  } catch (error) {
    next(error);
  }
});

router.get('/', validate(paginationSchema), async (req, res, next) => {
  try {
    if (!requireAccess(req, res, 'USER_VIEW')) return;
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const visibilityFilter = listRecordFilter(req.user);
    const filter: Record<string, unknown> = { ...visibilityFilter };

    const roles = parseMultiQueryValue(req.query.role);
    if (roles.length === 1) {
      filter.role = roles[0];
    } else if (roles.length > 1) {
      filter.role = { $in: roles };
    }

    const statuses = parseMultiQueryValue(req.query.status);
    if (statuses.includes('active')) {
      filter.active = { $ne: false };
      filter.status = { $nin: ['inactive', 'blocked'] };
    } else if (statuses.length === 1) {
      filter.status = statuses[0];
    } else if (statuses.length > 1) {
      filter.status = { $in: statuses };
    }

    if (req.query.branchId) {
      filter.branchId = req.query.branchId;
    }

    const searchFilter = buildTextSearchFilter(req.query.search, ['name', 'email', 'phone']);
    if (searchFilter) {
      Object.assign(filter, searchFilter);
    }

    const sort = resolveSort(
      req.query as Record<string, unknown>,
      { name: 'name', email: 'email', role: 'role', createdAt: 'createdAt' },
      { createdAt: -1 }
    );

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').populate('branchId', 'name code city').lean().sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);
    res.json(createResponse(users.map(serializeUser), '', buildPaginationMeta(page, limit, total)));
  } catch (error) {
    next(error);
  }
});

router.get('/count', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json(createError('Authentication required'));
    if (!roleMatches(req.user.role, ['super_admin', 'admin'])) {
      return res.status(403).json(createError('Access denied'));
    }
    const count = await User.countDocuments();
    res.json(createResponse({ count }));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validate(idParamsSchema), async (req, res, next) => {
  try {
    if (!requireAccess(req, res, 'USER_VIEW')) return;
    const user: any = await User.findOne({ _id: req.params.id, isDeleted: false }).select('-password').populate('branchId', 'name code city').lean();
    if (!user) return res.status(404).json(createError('User not found'));
    res.json(createResponse(serializeUser(user)));
  } catch (error) {
    next(error);
  }
});

const updateUserHandler = async (req: Request, res: any, next: any) => {
  try {
    if (!requireAccess(req, res, 'USER_UPDATE')) return;
    const roleError = assertRoleChangeAllowed(req, req.body.role);
    if (roleError) return res.status(403).json(roleError);
    if (req.body.email) {
      const normalizedEmail = normalizeEmail(req.body.email);
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.params.id }, isDeleted: false }).lean();
      if (existingUser) {
        return res.status(409).json(createError('Email already exists'));
      }
      req.body.email = normalizedEmail;
    }
    const updatePayload = { ...req.body };
    if (updatePayload.password) {
      updatePayload.password = await hashPassword(updatePayload.password);
    } else {
      delete updatePayload.password;
    }

    const user: any = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updatePayload,
      { new: true, runValidators: true }
    ).select('-password').populate('branchId', 'name code city').lean();
    if (!user) return res.status(404).json(createError('User not found'));
    res.json(createResponse(serializeUser(user), 'User updated'));
  } catch (error) {
    next(error);
  }
};

router.patch('/:id', validate(updateSchema), updateUserHandler);
router.put('/:id', validate(updateSchema), updateUserHandler);

router.put('/:id/permissions', validate(permissionsSchema), async (req, res, next) => {
  try {
    if (!requireAccess(req, res, 'PERMISSION_MANAGE')) return;
    const permissions = normalizePermissionMap(req.body.permissions);
    const selectedPermissionKeys = permissionMapToKeys(permissions);
    const user = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) return res.status(404).json(createError('User not found'));
    user.permissions = permissions;
    user.permissionKeys = selectedPermissionKeys;
    await user.save();
    const current = await User.findOne({ _id: req.params.id, isDeleted: false }).select('-password').lean();
    res.json(createResponse(serializeUser(current), 'User permissions updated'));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', validate(idParamsSchema), async (req, res, next) => {
  try {
    if (!requireAccess(req, res, 'USER_DELETE')) return;
    const user = await User.findByIdAndDelete(req.params.id).lean();
    if (!user) return res.status(404).json(createError('User not found'));
    res.json(createResponse({}, 'User deleted'));
  } catch (error) {
    next(error);
  }
});

export const userRouter = router;
