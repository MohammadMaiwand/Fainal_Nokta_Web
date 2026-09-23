import { Router, type Request, type Response } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { Notification } from '../../models/Notification';
import { ClassModel } from '../../models/Class';
import { Subject } from '../../models/Subject';
import { User } from '../../models/User';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createResponse, createError } from '../../helpers/response';

const router = Router();

const manageRoles = ['super_admin', 'admin', 'teacher', 'accountant', 'librarian', 'branch_manager', 'owner'] as const;
const deleteRoles = ['super_admin', 'admin', 'accountant', 'librarian', 'branch_manager', 'owner'] as const;
const readRoles = ['super_admin', 'admin', 'teacher', 'student', 'parent', 'owner', 'branch_manager', 'system_automation', 'family_student', 'accountant', 'librarian'] as const;
const roleSchema = Joi.string().valid(...readRoles);

const notificationCreateSchema = Joi.object({
  title: Joi.string().trim().required(),
  description: Joi.string().trim().allow('', null).optional(),
  message: Joi.string().trim().allow('', null).optional(),
  classId: Joi.string().hex().length(24).allow('', null).optional(),
  subjectId: Joi.string().hex().length(24).allow('', null).optional(),
  teacherId: Joi.string().hex().length(24).allow('', null).optional(),
  category: Joi.string().valid('general', 'holiday', 'emergency', 'class_notice', 'academic_reminder', 'event_update', 'exam_alert').optional(),
  publishDate: Joi.date().allow(null).optional(),
  expiresAt: Joi.date().allow(null).optional(),
  publishStatus: Joi.string().valid('draft', 'published').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  pinned: Joi.boolean().optional(),
  severity: Joi.string().valid('info', 'warning', 'critical').optional(),
  branchId: Joi.string().hex().length(24).allow('', null).optional(),
  recipientRoles: Joi.alternatives().try(
    Joi.array().items(roleSchema).optional(),
    roleSchema.optional()
  ),
  recipientIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().hex().length(24)).optional(),
    Joi.string().hex().length(24).optional()
  )
}).or('description', 'message');

const notificationUpdateSchema = Joi.object({
  title: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('', null).optional(),
  message: Joi.string().trim().allow('', null).optional(),
  classId: Joi.string().hex().length(24).allow('', null).optional(),
  subjectId: Joi.string().hex().length(24).allow('', null).optional(),
  teacherId: Joi.string().hex().length(24).allow('', null).optional(),
  category: Joi.string().valid('general', 'holiday', 'emergency', 'class_notice', 'academic_reminder', 'event_update', 'exam_alert').optional(),
  publishDate: Joi.date().allow(null).optional(),
  expiresAt: Joi.date().allow(null).optional(),
  publishStatus: Joi.string().valid('draft', 'published').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  pinned: Joi.boolean().optional(),
  severity: Joi.string().valid('info', 'warning', 'critical').optional(),
  branchId: Joi.string().hex().length(24).allow('', null).optional(),
  recipientRoles: Joi.alternatives().try(
    Joi.array().items(roleSchema).optional(),
    roleSchema.optional()
  ),
  recipientIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().hex().length(24)).optional(),
    Joi.string().hex().length(24).optional()
  )
}).min(1);

const idParamsSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  })
});

const notificationQuerySchema = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().allow('', null).optional()
  })
});

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // Fall back to comma splitting below.
      }
    }

    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function serializeNotification(notification: any) {
  const classRef = notification?.classId;
  const subjectRef = notification?.subjectId;
  const teacherRef = notification?.teacherId;

  return {
    ...notification,
    classId: classRef?._id ?? classRef ?? null,
    subjectId: subjectRef?._id ?? subjectRef ?? null,
    teacherId: teacherRef?._id ?? teacherRef ?? null,
    className: classRef?.className ?? classRef?.name ?? '',
    classCode: classRef?.classCode ?? '',
    subjectName: subjectRef?.title ?? '',
    teacherName: teacherRef?.name ?? '',
    description: notification?.description ?? notification?.message ?? '',
    message: notification?.description ?? notification?.message ?? '',
    publishDate: notification?.publishDate ?? notification?.createdAt ?? null,
    expiresAt: notification?.expiresAt ?? null,
    publishStatus: notification?.publishStatus ?? 'draft'
  };
}

function isManagementViewer(req: any) {
  const role = req.user?.canonicalRole ?? req.user?.role;
  return ['super_admin', 'admin', 'owner', 'branch_manager'].includes(role);
}

function buildManagementFilter(req: any) {
  const role = req.user?.canonicalRole ?? req.user?.role;
  const branchId = req.user?.branchId;

  if (role === 'super_admin' || !branchId) {
    return { isDeleted: false };
  }

  return {
    isDeleted: false,
    $or: [
      { branchId: new mongoose.Types.ObjectId(branchId) },
      { branchId: null }
    ]
  };
}

function buildAudienceFilter(req: any, publishedOnly = true) {
  const userId = req.user?.userId;
  const role = req.user?.role;
  const canonicalRole = req.user?.canonicalRole;
  const branchId = req.user?.branchId;
  const roleCandidates = [role, canonicalRole].filter(Boolean);
  const audienceClauses: any[] = [
    { recipientRoles: { $size: 0 }, recipientIds: { $size: 0 } }
  ];

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    audienceClauses.push({ recipientIds: new mongoose.Types.ObjectId(userId) });
  }

  if (roleCandidates.length) {
    audienceClauses.push({ recipientRoles: { $in: roleCandidates } });
  }

  if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
    audienceClauses.push({ branchId: new mongoose.Types.ObjectId(branchId) });
  }

  const filter: Record<string, unknown> = {
    isDeleted: false,
    $or: audienceClauses
  };

  if (publishedOnly) {
    filter.publishStatus = 'published';
    filter.$and = [
      ...(Array.isArray((filter as any).$and) ? (filter as any).$and : []),
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }
    ];
  }

  return filter;
}

function applySearch(filter: any, search: string) {
  if (!search) {
    return filter;
  }

  const searchFilter = {
    $or: [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } }
    ]
  };

  if (filter.$or) {
    const audienceFilter = { ...filter };
    delete audienceFilter.$or;
    return {
      ...audienceFilter,
      $and: [
        { $or: filter.$or },
        searchFilter
      ]
    };
  }

  return {
    ...filter,
    ...searchFilter
  };
}

async function assertNotificationTargets(payload: { classId?: unknown; subjectId?: unknown; teacherId?: unknown }) {
  const throwValidationError = (message: string) => {
    const error = new Error(message);
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  };

  const classId = payload.classId ? String(payload.classId) : '';
  const subjectId = payload.subjectId ? String(payload.subjectId) : '';
  const teacherId = payload.teacherId ? String(payload.teacherId) : '';

  if (!classId && !subjectId && !teacherId) {
    return;
  }

  const [klass, subject, teacher] = await Promise.all([
    classId ? ClassModel.findOne({ _id: classId, isDeleted: false }).lean<any>() : Promise.resolve(null),
    subjectId ? Subject.findOne({ _id: subjectId, isDeleted: false }).lean<any>() : Promise.resolve(null),
    teacherId ? User.findOne({ _id: teacherId, role: 'teacher', isDeleted: false }).lean<any>() : Promise.resolve(null)
  ]);

  if (classId && !klass) {
    throwValidationError('Selected class does not exist');
  }

  if (subjectId && !subject) {
    throwValidationError('Selected subject does not exist');
  }

  if (teacherId && !teacher) {
    throwValidationError('Selected teacher does not exist');
  }

  if (klass && subject && String(subject.classId) !== String(klass._id)) {
    throwValidationError('Selected subject does not belong to the chosen class');
  }

  if (subject && teacher) {
    const subjectTeacherId = subject.teacher ? String(subject.teacher) : '';
    const teacherSubjectIds = Array.isArray(teacher.assignedSubjects) ? teacher.assignedSubjects.map((item: any) => String(item)) : [];
    const teacherClassIds = Array.isArray(teacher.assignedClasses) ? teacher.assignedClasses.map((item: any) => String(item)) : [];
    const subjectClassId = String(subject.classId ?? classId ?? '');
    const teacherMatchesSubject =
      (subjectTeacherId && subjectTeacherId === String(teacher._id)) ||
      teacherSubjectIds.includes(String(subject._id)) ||
      teacherClassIds.includes(subjectClassId);

    if (!teacherMatchesSubject) {
      throwValidationError('Selected teacher is not assigned to the chosen subject');
    }
  }
}

function normalizeNotificationPayload(req: Request, validatedBody: Record<string, any>, existingNotification?: any) {
  const description = String(validatedBody.description ?? validatedBody.message ?? existingNotification?.description ?? existingNotification?.message ?? '').trim();
  const recipientRoles = normalizeStringArray(validatedBody.recipientRoles);
  const recipientIds = normalizeStringArray(validatedBody.recipientIds);
  const publishStatus = String(validatedBody.publishStatus ?? existingNotification?.publishStatus ?? 'draft');
  const publishDate = validatedBody.publishDate !== undefined
    ? (validatedBody.publishDate ? new Date(validatedBody.publishDate) : null)
    : publishStatus === 'published'
      ? existingNotification?.publishDate ?? new Date()
      : existingNotification?.publishDate ?? null;

  return {
    title: String(validatedBody.title ?? existingNotification?.title ?? '').trim(),
    description,
    message: description,
    classId: validatedBody.classId === '' ? null : (validatedBody.classId ?? existingNotification?.classId ?? null),
    subjectId: validatedBody.subjectId === '' ? null : (validatedBody.subjectId ?? existingNotification?.subjectId ?? null),
    teacherId: validatedBody.teacherId === '' ? null : (validatedBody.teacherId ?? existingNotification?.teacherId ?? null),
    publishDate,
    expiresAt: validatedBody.expiresAt !== undefined
      ? (validatedBody.expiresAt ? new Date(validatedBody.expiresAt) : null)
      : existingNotification?.expiresAt ?? null,
    publishStatus,
    category: validatedBody.category ?? existingNotification?.category ?? 'general',
    priority: validatedBody.priority ?? existingNotification?.priority ?? 'normal',
    pinned: validatedBody.pinned ?? existingNotification?.pinned ?? false,
    severity: validatedBody.severity ?? existingNotification?.severity ?? 'info',
    branchId: validatedBody.branchId === '' ? null : (validatedBody.branchId ?? existingNotification?.branchId ?? req.user?.branchId ?? null),
    recipientRoles,
    recipientIds
  };
}

router.get('/public', validate(notificationQuerySchema), async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 6);
    const search = String(req.query.search || '').trim();
    const baseFilter = applySearch({
      isDeleted: false,
      publishStatus: 'published',
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    }, search);

    const [notifications, total] = await Promise.all([
      Notification.find(baseFilter)
        .populate('classId', 'className name classCode')
        .populate('subjectId', 'title code')
        .populate('teacherId', 'name email')
        .lean()
        .sort({ pinned: -1, priority: -1, publishDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(baseFilter)
    ]);

    res.json(createResponse(notifications.map(serializeNotification), '', { page, limit, total }));
  } catch (error) {
    next(error);
  }
});

router.use(authenticate);

router.post('/', authorize([...manageRoles]), async (req, res, next) => {
  try {
    const { error, value } = notificationCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json(createError(error.details.map((detail) => detail.message).join(', ')));
    }

    const payload = normalizeNotificationPayload(req, value);
    await assertNotificationTargets(payload);
    const notification = await Notification.create(payload);

    res.status(201).json(createResponse(serializeNotification(notification.toObject()), 'Notification created successfully'));
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', authorize([...readRoles]), async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json(createError('Authentication required'));
    }

    const filter = {
      ...buildAudienceFilter(req, true),
      readBy: { $nin: [new mongoose.Types.ObjectId(req.user.userId)] }
    };

    const count = await Notification.countDocuments(filter);
    res.json(createResponse({ unreadCount: count }));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/read', authorize([...readRoles]), validate(idParamsSchema), async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json(createError('Authentication required'));
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      isDeleted: false,
      ...buildAudienceFilter(req, true)
    });

    if (!notification) {
      return res.status(404).json(createError('Notification not found'));
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const alreadyRead = (notification.readBy || []).some((id: mongoose.Types.ObjectId) => String(id) === String(userObjectId));
    if (!alreadyRead) {
      notification.readBy = [...(notification.readBy || []), userObjectId];
      await notification.save();
    }

    res.json(createResponse({
      _id: notification._id,
      read: true
    }, 'Notification marked as read'));
  } catch (error) {
    next(error);
  }
});

router.get('/', authorize([...readRoles]), validate(notificationQuerySchema), async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || '').trim();
    const filter = applySearch(
      isManagementViewer(req) ? buildManagementFilter(req) : buildAudienceFilter(req, true),
      search
    );

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('classId', 'className name classCode')
        .populate('subjectId', 'title code')
        .populate('teacherId', 'name email')
        .lean()
        .sort({ pinned: -1, priority: -1, publishDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter)
    ]);

    res.json(createResponse(notifications.map(serializeNotification), '', { page, limit, total }));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authorize([...readRoles]), validate(idParamsSchema), async (req, res, next) => {
  try {
    const filter = isManagementViewer(req)
      ? { ...buildManagementFilter(req), _id: req.params.id }
      : { ...buildAudienceFilter(req, true), _id: req.params.id };

    const notification = await Notification.findOne(filter).lean<any>();
    if (!notification) {
      return res.status(404).json(createError('Notification not found'));
    }

    const populatedNotification = await Notification.findById(notification._id)
      .populate('classId', 'className name classCode')
      .populate('subjectId', 'title code')
      .populate('teacherId', 'name email')
      .lean<any>();

    res.json(createResponse(serializeNotification(populatedNotification)));
  } catch (error) {
    next(error);
  }
});

const updateNotificationHandler = async (req: Request, res: Response, next: any) => {
  try {
    const { error, value } = notificationUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json(createError(error.details.map((detail) => detail.message).join(', ')));
    }

    const existingNotification = await Notification.findOne({
      ...buildManagementFilter(req),
      _id: req.params.id
    }).lean<any>();

    if (!existingNotification) {
      return res.status(404).json(createError('Notification not found'));
    }

    const payload = normalizeNotificationPayload(req, value, existingNotification);
    await assertNotificationTargets(payload);
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    )
      .populate('classId', 'className name classCode')
      .populate('subjectId', 'title code')
      .populate('teacherId', 'name email')
      .lean();

    res.json(createResponse(serializeNotification(notification), 'Notification updated successfully'));
  } catch (error) {
    next(error);
  }
};

router.put('/:id', authorize([...manageRoles]), validate(idParamsSchema), updateNotificationHandler);
router.patch('/:id', authorize([...manageRoles]), validate(idParamsSchema), updateNotificationHandler);

router.delete('/:id', authorize([...deleteRoles]), validate(idParamsSchema), async (req, res, next) => {
  try {
    const deletedAt = new Date();
    const notification = await Notification.findOneAndUpdate(
      {
        ...buildManagementFilter(req),
        _id: req.params.id
      },
      {
        $set: {
          isDeleted: true,
          deletedAt,
          deletedBy: req.user?.userId ?? null
        }
      },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json(createError('Notification not found'));
    }

    res.json(createResponse({}, 'Notification deleted successfully'));
  } catch (error) {
    next(error);
  }
});

export const notificationRouter = router;
