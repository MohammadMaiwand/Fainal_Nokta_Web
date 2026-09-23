import { Router } from 'express';
import Joi from 'joi';
import { Family } from '../../models/Family';
import { User } from '../../models/User';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createResponse, createError } from '../../helpers/response';
import { paginationSchema } from '../../validators/pagination';
import { afghanPhoneField, personNameField } from '../../validators/fieldSchemas';
import { hashPassword } from '../../utils/password';
import { collectUserPermissions, normalizeRole } from '../../utils/roleHelpers';
import type { PermissionKey } from '../../config/systemMasterRules';

const router = Router();

const FAMILY_PORTAL_ROLES = ['family_student', 'family', 'parent'] as const;

/** Toggleable sidebar sections for family/parent portal accounts */
export const FAMILY_PORTAL_SECTIONS: Array<{
  key: string;
  labelKey: string;
  permissions: PermissionKey[];
  defaultEnabled: boolean;
}> = [
  { key: 'dashboard', labelKey: 'common.dashboard', permissions: ['DASHBOARD_VIEW'], defaultEnabled: true },
  { key: 'families', labelKey: 'common.families', permissions: ['FAMILY_LINK_VIEW'], defaultEnabled: true },
  { key: 'students', labelKey: 'common.students', permissions: ['STUDENT_VIEW'], defaultEnabled: true },
  { key: 'teachers', labelKey: 'common.teachers', permissions: ['TEACHER_VIEW'], defaultEnabled: true },
  { key: 'classes', labelKey: 'common.classes', permissions: ['CLASS_VIEW'], defaultEnabled: true },
  { key: 'timetable', labelKey: 'common.timetable', permissions: ['CLASS_VIEW'], defaultEnabled: true },
  { key: 'subjects', labelKey: 'common.subjects', permissions: ['SUBJECT_VIEW'], defaultEnabled: true },
  { key: 'payments', labelKey: 'common.payments', permissions: ['PAYMENT_VIEW'], defaultEnabled: true },
  { key: 'messages', labelKey: 'messages.title', permissions: ['MESSAGE_VIEW', 'MESSAGE_CREATE'], defaultEnabled: false },
  { key: 'notifications', labelKey: 'common.notifications', permissions: ['NOTIFICATION_VIEW'], defaultEnabled: false },
  { key: 'attendance', labelKey: 'common.attendance', permissions: ['ATTENDANCE_VIEW'], defaultEnabled: false },
  { key: 'results', labelKey: 'common.results', permissions: ['RESULT_VIEW'], defaultEnabled: false }
];

const familySchema = Joi.object({
  body: Joi.object({
    guardianName: personNameField(true),
    guardianEmail: Joi.string().email().required(),
    guardianPhone: afghanPhoneField(true),
    students: Joi.array().items(Joi.string().hex().length(24)).default([]),
    notes: Joi.string().allow('', null)
  })
});

const portalAccountUpdateSchema = Joi.object({
  body: Joi.object({
    name: personNameField(false),
    email: Joi.string().email().max(160),
    password: Joi.string().min(6).max(256).allow('', null),
    phone: afghanPhoneField(false),
    active: Joi.boolean(),
    sections: Joi.array().items(Joi.string().trim().min(1)).unique()
  }).min(1),
  params: Joi.object({ id: Joi.string().hex().length(24).required() })
});

const idParamsSchema = Joi.object({
  params: Joi.object({ id: Joi.string().hex().length(24).required() })
});

router.use(authenticate);

function normalizeEmail(value?: string) {
  return String(value || '').trim().toLowerCase();
}

async function findPortalUserForFamily(familyId: string, guardianEmail?: string, includePassword = false) {
  const query = includePassword
    ? User.findOne({
        familyId,
        role: { $in: [...FAMILY_PORTAL_ROLES] },
        isDeleted: { $ne: true }
      }).select('+password')
    : User.findOne({
        familyId,
        role: { $in: [...FAMILY_PORTAL_ROLES] },
        isDeleted: { $ne: true }
      });

  let portalUser = await query;

  if (!portalUser && guardianEmail) {
    const emailQuery = includePassword
      ? User.findOne({
          email: normalizeEmail(guardianEmail),
          role: { $in: [...FAMILY_PORTAL_ROLES] },
          isDeleted: { $ne: true }
        }).select('+password')
      : User.findOne({
          email: normalizeEmail(guardianEmail),
          role: { $in: [...FAMILY_PORTAL_ROLES] },
          isDeleted: { $ne: true }
        });
    portalUser = await emailQuery;
  }

  return portalUser;
}

function buildSectionsState(user: any) {
  const effective = new Set<string>(collectUserPermissions(user) as string[]);
  return FAMILY_PORTAL_SECTIONS.map((section) => ({
    key: section.key,
    labelKey: section.labelKey,
    defaultEnabled: section.defaultEnabled,
    enabled: section.permissions.every((permission) => effective.has(permission))
  }));
}

function applySectionsToUser(user: any, selectedSectionKeys: string[]) {
  const selected = new Set(selectedSectionKeys);
  const grantedExtras = new Set<string>(Array.isArray(user.permissionKeys) ? user.permissionKeys : []);
  const revoked = new Set<string>(Array.isArray(user.revokedPermissionKeys) ? user.revokedPermissionKeys : []);

  // Group by permission so shared keys (e.g. CLASS_VIEW for classes+timetable) stay consistent.
  const permissionOwners = new Map<string, typeof FAMILY_PORTAL_SECTIONS>();
  for (const section of FAMILY_PORTAL_SECTIONS) {
    for (const permission of section.permissions) {
      const list = permissionOwners.get(permission) ?? [];
      list.push(section);
      permissionOwners.set(permission, list);
    }
  }

  for (const [permission, owners] of permissionOwners.entries()) {
    const anyEnabled = owners.some((section) => selected.has(section.key));
    const anyDefault = owners.some((section) => section.defaultEnabled);

    if (anyEnabled) {
      revoked.delete(permission);
      if (!anyDefault) {
        grantedExtras.add(permission);
      }
    } else {
      grantedExtras.delete(permission);
      if (anyDefault) {
        revoked.add(permission);
      }
    }
  }

  user.permissionKeys = Array.from(grantedExtras);
  user.revokedPermissionKeys = Array.from(revoked);
}

function serializePortalAccount(family: any, user: any | null) {
  return {
    familyId: String(family._id),
    guardianName: family.guardianName,
    guardianEmail: family.guardianEmail,
    guardianPhone: family.guardianPhone,
    portalUser: user
      ? {
          id: String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          active: user.active !== false && user.status !== 'blocked' && user.status !== 'inactive',
          status: user.status || 'active',
          sections: buildSectionsState(user)
        }
      : null,
    availableSections: FAMILY_PORTAL_SECTIONS.map((section) => ({
      key: section.key,
      labelKey: section.labelKey,
      defaultEnabled: section.defaultEnabled
    }))
  };
}

router.post('/', authorize(['super_admin', 'admin', 'branch_manager', 'teacher']), validate(familySchema), async (req, res, next) => {
  try {
    const family = await Family.create(req.body);
    res.status(201).json(createResponse(family, 'Family created'));
  } catch (error) {
    next(error);
  }
});

router.get('/', authorize(['super_admin', 'admin', 'branch_manager', 'teacher', 'family_student', 'parent', 'owner']), validate(paginationSchema), async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || '').trim();
    const filter: any = {};
    if (search) filter.guardianName = { $regex: search, $options: 'i' };

    if (req.user?.canonicalRole === 'parent' || req.user?.role === 'family_student') {
      const currentUser = await User.findById(req.user.userId).lean();
      const familyId = (currentUser as any)?.familyId;
      if (familyId) {
        filter._id = familyId;
      } else if ((currentUser as any)?.email) {
        filter.guardianEmail = (currentUser as any).email;
      } else {
        return res.json(createResponse([], '', { page, limit, total: 0 }));
      }
    }

    const [families, total] = await Promise.all([
      Family.find(filter).lean().skip((page - 1) * limit).limit(limit),
      Family.countDocuments(filter)
    ]);

    const actorRole = normalizeRole(req.user?.role);
    const canManagePortal = actorRole === 'super_admin' || actorRole === 'admin';

    if (!canManagePortal || families.length === 0) {
      return res.json(createResponse(families, '', { page, limit, total }));
    }

    const familyIds = families.map((family: any) => family._id);
    const portalUsers = await User.find({
      familyId: { $in: familyIds },
      role: { $in: [...FAMILY_PORTAL_ROLES] },
      isDeleted: { $ne: true }
    })
      .select('name email phone role active status familyId')
      .lean();

    const portalByFamilyId = new Map(portalUsers.map((user: any) => [String(user.familyId), user]));

    const enriched = families.map((family: any) => {
      const portal = portalByFamilyId.get(String(family._id));
      return {
        ...family,
        portalAccount: portal
          ? {
              id: String(portal._id),
              name: portal.name,
              email: portal.email,
              phone: portal.phone || '',
              role: portal.role,
              active: portal.active !== false
            }
          : null
      };
    });

    res.json(createResponse(enriched, '', { page, limit, total }));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/portal-account', authorize(['super_admin', 'admin']), validate(idParamsSchema), async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id).lean();
    if (!family) return res.status(404).json(createError('Family not found'));

    const portalUser = await findPortalUserForFamily(String((family as any)._id), (family as any).guardianEmail);
    res.json(createResponse(serializePortalAccount(family, portalUser)));
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/portal-account', authorize(['super_admin', 'admin']), validate(portalAccountUpdateSchema), async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) return res.status(404).json(createError('Family not found'));

    let portalUser = await findPortalUserForFamily(String(family._id), family.guardianEmail, true);
    const nextEmail = req.body.email ? normalizeEmail(req.body.email) : undefined;
    const nextPassword = String(req.body.password || '').trim();
    const nextName = String(req.body.name || '').trim();
    const nextPhone = String(req.body.phone || '').trim();

    if (nextEmail) {
      const emailTaken = await User.findOne({
        email: nextEmail,
        isDeleted: { $ne: true },
        ...(portalUser ? { _id: { $ne: portalUser._id } } : {})
      }).lean();
      if (emailTaken) {
        return res.status(409).json(createError('Email already exists'));
      }
    }

    if (!portalUser) {
      if (!nextEmail && !family.guardianEmail) {
        return res.status(400).json(createError('Email is required to create family portal account'));
      }
      if (!nextPassword) {
        return res.status(400).json(createError('Password is required to create family portal account'));
      }

      portalUser = await User.create({
        name: nextName || family.guardianName,
        email: nextEmail || normalizeEmail(family.guardianEmail),
        phone: nextPhone || family.guardianPhone || '',
        password: await hashPassword(nextPassword),
        role: 'family_student',
        familyId: family._id,
        status: 'active',
        active: true,
        permissionKeys: [],
        revokedPermissionKeys: []
      });
    } else {
      if (nextName) portalUser.name = nextName;
      if (nextEmail) portalUser.email = nextEmail;
      if (nextPhone) portalUser.phone = nextPhone;
      if (nextPassword) {
        portalUser.password = await hashPassword(nextPassword);
        portalUser.mustChangePassword = false;
      }
      if (typeof req.body.active === 'boolean') {
        portalUser.active = req.body.active;
        portalUser.status = req.body.active ? 'active' : 'inactive';
      }
      if (!portalUser.familyId) {
        portalUser.familyId = family._id;
      }
    }

    if (Array.isArray(req.body.sections)) {
      applySectionsToUser(portalUser, req.body.sections.map((key: string) => String(key)));
    }

    await portalUser.save();

    // Keep Family contact fields in sync with portal login identity.
    if (nextName) family.guardianName = nextName;
    if (nextEmail) family.guardianEmail = nextEmail;
    if (nextPhone) family.guardianPhone = nextPhone;
    await family.save();

    const freshUser = await User.findById(portalUser._id).select('-password').lean();
    res.json(createResponse(serializePortalAccount(family.toObject(), freshUser), 'Family portal account updated'));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authorize(['super_admin', 'admin', 'branch_manager', 'teacher', 'family_student', 'parent', 'owner']), async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id).lean();
    if (!family) return res.status(404).json(createError('Family not found'));
    if (req.user?.canonicalRole === 'parent' || req.user?.role === 'family_student') {
      const currentUser = await User.findById(req.user.userId).lean();
      if (!(currentUser as any)?.familyId?.toString() || (family as any)._id.toString() !== (currentUser as any).familyId.toString()) {
        return res.status(403).json(createError('Access denied'));
      }
    }
    res.json(createResponse(family));
  } catch (error) {
    next(error);
  }
});

export const familyRouter = router;
