import { Router } from 'express';
import { Request } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { UserService } from '../../services/userService';
import { TeacherProfile } from '../../models/Teacher';
import { User } from '../../models/User';
import { Student } from '../../models/Student';
import { Subject } from '../../models/Subject';
import { ClassModel } from '../../models/Class';
import { authenticate, authorize } from '../../middlewares/auth';
import { requireAdmin } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { teacherCreateLimiter } from '../../middlewares/rateLimiter';
import { createError, createResponse } from '../../helpers/response';
import { listRecordFilter } from '../../utils/recordVisibility';
import { afghanPhoneField, personNameField } from '../../validators/fieldSchemas';
import { syncSalarySettingFromEmployee } from '../../services/payrollCalculation.service';

const router = Router();
const userService = new UserService();

const createTeacherSchema = Joi.object({
  body: Joi.object({
    name: personNameField(false),
    firstName: personNameField(false),
    lastName: personNameField(false),
    email: Joi.string().email().required(),
    password: Joi.string().min(1).max(256).required(),
    phone: afghanPhoneField(false),
    profileImage: Joi.string().allow('', null).optional(),
    whatsapp: afghanPhoneField(false),
    address: Joi.string().optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    branchId: Joi.string().hex().length(24).optional(),
    salaryType: Joi.string().valid('fixed', 'percentage', 'fixed_plus_percentage').required(),
    salaryValue: Joi.number().min(0).optional(),
    fixedSalary: Joi.number().min(0).optional(),
    percentageRate: Joi.number().min(0).max(100).optional(),
    customPercentage: Joi.number().min(0).max(100).optional(),
    assignedSubjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
    assignedClasses: Joi.array().items(Joi.string().hex().length(24)).optional()
  }).or('name', 'firstName')
});

const idParamsSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  })
});

const updateTeacherSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  }),
  body: Joi.object({
    name: personNameField(false),
    firstName: personNameField(false),
    lastName: personNameField(false),
    email: Joi.string().email().optional(),
    password: Joi.string().min(1).max(256).allow('', null).optional(),
    phone: afghanPhoneField(false),
    profileImage: Joi.string().allow('', null).optional(),
    whatsapp: afghanPhoneField(false),
    address: Joi.string().allow('', null).optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    branchId: Joi.string().hex().length(24).allow('', null).optional(),
    salaryType: Joi.string().valid('fixed', 'percentage', 'fixed_plus_percentage').optional(),
    salaryValue: Joi.number().min(0).optional(),
    fixedSalary: Joi.number().min(0).optional(),
    percentageRate: Joi.number().min(0).max(100).optional(),
    customPercentage: Joi.number().min(0).max(100).optional(),
    assignedSubjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
    assignedClasses: Joi.array().items(Joi.string().hex().length(24)).optional(),
    active: Joi.boolean().optional(),
    status: Joi.string().valid('active', 'inactive', 'locked', 'suspended', 'pending_verification').optional()
  }).min(1)
});

const teacherQuerySchema = Joi.object({
  query: Joi.object({
    classId: Joi.string().hex().length(24).optional(),
    subjectId: Joi.string().hex().length(24).optional()
  })
});

router.use(authenticate);

function buildTeacherPayload(body: Record<string, any>, isCreate = false) {
  let firstName = body.firstName;
  let lastName = body.lastName;

  if (body.name && !firstName && !lastName) {
    const nameParts = String(body.name).trim().split(/\s+/);
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  }

  const teacherData: Record<string, any> = {
    ...body,
    firstName,
    lastName,
    name: body.name || `${firstName ?? ''} ${lastName ?? ''}`.trim(),
    role: 'teacher'
  };

  if (body.salaryValue !== undefined && body.salaryValue !== null && body.salaryValue !== '') {
    const salaryType = body.salaryType ?? teacherData.salaryType;
    if (salaryType === 'fixed') {
      teacherData.fixedSalary = Number(body.salaryValue);
      teacherData.percentageRate = 0;
      teacherData.customPercentage = 0;
    } else if (salaryType === 'percentage') {
      teacherData.percentageRate = Number(body.salaryValue);
      teacherData.customPercentage = Number(body.salaryValue);
      teacherData.fixedSalary = 0;
    } else if (salaryType === 'fixed_plus_percentage') {
      // salaryValue = percentage; fixedSalary may come as separate field or same value for hybrid setups
      teacherData.percentageRate = Number(body.salaryValue);
      teacherData.customPercentage = Number(body.salaryValue);
      if (body.fixedSalary !== undefined && body.fixedSalary !== null && body.fixedSalary !== '') {
        teacherData.fixedSalary = Number(body.fixedSalary);
      }
    }
    delete teacherData.salaryValue;
  }

  if (!teacherData.password) {
    delete teacherData.password;
  }

  if (!isCreate && !teacherData.name && (firstName || lastName)) {
    teacherData.name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  }

  return teacherData;
}

function serializeTeacher(teacher: any) {
  const assignedSubjects = Array.isArray(teacher?.assignedSubjects) ? teacher.assignedSubjects : [];
  const assignedClasses = Array.isArray(teacher?.assignedClasses) ? teacher.assignedClasses : [];
  const branchRef = teacher?.branchId;
  return {
    ...teacher,
    branchId: branchRef?._id ?? branchRef ?? null,
    branchName: branchRef?.name ?? branchRef?.code ?? '',
    assignedSubjects: assignedSubjects.map((subject: any) => subject?._id ?? subject).filter(Boolean),
    assignedSubjectNames: assignedSubjects.map((subject: any) => subject?.title ?? subject).filter(Boolean).join(', '),
    assignedClasses: assignedClasses.map((klass: any) => klass?._id ?? klass).filter(Boolean),
    assignedClassNames: assignedClasses.map((klass: any) => klass?.className ?? klass?.name ?? klass).filter(Boolean).join(', '),
    displaySubject: assignedSubjects.length ? (assignedSubjects[0]?.title ?? assignedSubjects[0]) : '',
    phone: teacher?.phone ?? teacher?.whatsapp ?? '',
    salaryValue: teacher?.salaryType === 'percentage' || teacher?.salaryType === 'fixed_plus_percentage'
      ? Number(teacher?.percentageRate ?? teacher?.customPercentage ?? 0)
      : Number(teacher?.fixedSalary ?? 0)
  };
}

function sanitizeTeacherForRole(teacher: any, role?: string) {
  const allowedFinanceRoles = new Set(['super_admin', 'admin', 'owner', 'branch_manager']);
  if (allowedFinanceRoles.has(String(role ?? ''))) return teacher;
  const { salaryType, salaryValue, fixedSalary, percentageRate, customPercentage, ...safeTeacher } = teacher ?? {};
  return safeTeacher;
}

async function syncTeacherProfile(teacher: any, payload: Record<string, any>) {
  await TeacherProfile.findOneAndUpdate(
    { userId: teacher._id },
    {
      userId: teacher._id,
      branchId: teacher.branchId ?? payload.branchId ?? null,
      teacherCode: teacher.teacherId,
      gender: teacher.gender ?? payload.gender ?? 'other',
      salaryType: teacher.salaryType,
      fixedSalary: teacher.fixedSalary,
      percentageRate: teacher.percentageRate,
      assignedSubjectIds: teacher.assignedSubjects ?? [],
      assignedClassIds: teacher.assignedClasses ?? [],
      active: teacher.active !== false
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
}

// Get teachers with optional class/subject filtering.
router.get('/', authorize(['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner']), validate(teacherQuerySchema), async (req, res) => {
  try {
    const filter: Record<string, any> = { role: 'teacher', ...listRecordFilter(req.user) };
    const classId = req.query.classId ? String(req.query.classId) : '';
    const subjectId = req.query.subjectId ? String(req.query.subjectId) : '';

    if (classId || subjectId) {
      const [klass, subject, enrolledTeacherIds] = await Promise.all([
        classId ? ClassModel.findOne({ _id: classId, isDeleted: false }).select('assignedTeachers teacherId').lean<any>() : null,
        subjectId ? Subject.findOne({ _id: subjectId, isDeleted: false }).select('teacher classId classIds').lean<any>() : null,
        classId
          ? Student.find({
              classId,
              ...(subjectId ? { subjectId } : {}),
              isDeleted: false
            }).distinct('teacherId')
          : Promise.resolve([])
      ]);

      const teacherIds = new Set<string>();
      const relationFilters: Record<string, any>[] = [];

      if (classId) {
        relationFilters.push({ assignedClasses: classId });
        (klass?.assignedTeachers ?? []).forEach((id: any) => teacherIds.add(String(id?._id ?? id)));
        if (klass?.teacherId) teacherIds.add(String(klass.teacherId));
        enrolledTeacherIds.forEach((id: any) => {
          if (id) teacherIds.add(String(id));
        });
      }

      if (subjectId) {
        relationFilters.push({ assignedSubjects: subjectId });
        if (subject?.teacher) teacherIds.add(String(subject.teacher));
      }

      if (classId && !subjectId) {
        const classSubjects = await Subject.find({
          isDeleted: false,
          activeStatus: true,
          $or: [{ classId }, { classIds: classId }]
        }).select('teacher').lean<any[]>();
        classSubjects.forEach((item) => {
          if (item.teacher) teacherIds.add(String(item.teacher));
        });
      }

      if (teacherIds.size) {
        relationFilters.push({ _id: { $in: Array.from(teacherIds) } });
      }

      if (classId && subjectId) {
        const subjectClassIds = [
          subject?.classId ? String(subject.classId) : '',
          ...(Array.isArray(subject?.classIds) ? subject.classIds.map((id: any) => String(id)) : [])
        ].filter(Boolean);
        const subjectBelongsToClass = !subject || subjectClassIds.includes(classId);
        // Exams/students accept a teacher linked either through the selected
        // class, the selected subject, or the subject's direct teacher field.
        // Requiring every relation hid valid teachers from dependent selects.
        filter.$or = subjectBelongsToClass
          ? (relationFilters.length ? relationFilters : [{ _id: { $in: [] } }])
          : [{ _id: { $in: [] } }];
      } else {
        filter.$or = relationFilters.length ? relationFilters : [{ _id: { $in: [] } }];
      }
    }
    if (['admin', 'branch_manager'].includes(req.user?.canonicalRole ?? '') && req.user?.branchId) {
      filter.branchId = req.user.branchId;
    }
    if (req.user?.canonicalRole === 'teacher') {
      filter._id = req.user.userId;
    }

    if (req.user?.canonicalRole === 'student') {
      const currentUser = await User.findById(req.user.userId).select('assignedTeacherId').lean<Record<string, any>>();
      filter._id = currentUser?.assignedTeacherId ?? { $in: [] };
    }

    if (req.user?.canonicalRole === 'parent' || req.user?.role === 'family_student') {
      const currentUser = await User.findById(req.user.userId).select('familyId parentProfileId').lean<Record<string, any>>();
      const familyStudents = await Student.find({
        isDeleted: false,
        ...(currentUser?.familyId ? { familyId: currentUser.familyId } : {}),
        ...(!currentUser?.familyId && currentUser?.parentProfileId ? { parentProfileId: currentUser.parentProfileId } : {})
      }).select('teacherId').lean();
      filter._id = { $in: familyStudents.map((student: any) => student.teacherId).filter(Boolean) };
    }

    let teachers = await User.find(filter)
      .populate('assignedSubjects', 'title')
      .populate('assignedClasses', 'className name')
      .populate('branchId', 'name code city')
      .lean();

    // Legacy classes/subjects can be missing assignment arrays. Return teachers
    // in the same visible scope so an admin can choose one; the exam endpoint
    // then persists the chosen teacher-to-class/subject relationship.
    if (!teachers.length && classId && subjectId && req.user?.canonicalRole !== 'teacher') {
      const fallbackFilter: Record<string, any> = {
        role: 'teacher',
        isDeleted: false,
        active: { $ne: false },
        status: { $nin: ['inactive', 'blocked', 'expired'] }
      };
      if (['admin', 'branch_manager'].includes(req.user?.canonicalRole ?? '') && req.user?.branchId) {
        fallbackFilter.branchId = req.user.branchId;
      }
      teachers = await User.find(fallbackFilter)
        .populate('assignedSubjects', 'title')
        .populate('assignedClasses', 'className name')
        .populate('branchId', 'name code city')
        .lean();
    }

    const role = req.user?.canonicalRole ?? req.user?.role;
    res.json(createResponse(teachers.map((teacher) => sanitizeTeacherForRole(serializeTeacher(teacher), role))));
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json(createResponse(null, 'Failed to fetch teachers'));
  }
});

// Create teacher - admin only
router.post('/', teacherCreateLimiter, requireAdmin, validate(createTeacherSchema), async (req: Request, res) => {
  try {
    const existingEmail = await User.findOne({ email: req.body.email.toLowerCase(), isDeleted: false }).lean();
    if (existingEmail) {
      return res.status(409).json(createError('Email already exists'));
    }

    const teacherData = buildTeacherPayload(req.body, true);
    const teacher = await userService.createUser(teacherData);
    await syncTeacherProfile(teacher, teacherData);
    await syncSalarySettingFromEmployee({
      user: teacher,
      actorId: req.user?.userId ?? null
    });

    const savedTeacher = await User.findById(teacher._id)
      .populate('assignedSubjects', 'title')
      .populate('assignedClasses', 'className name')
      .populate('branchId', 'name code city')
      .lean();

    res.status(201).json(createResponse(serializeTeacher(savedTeacher), 'Teacher created successfully'));
  } catch (error: any) {
    console.error('Teacher creation error:', error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json(createError(error.message));
    }
    if (typeof error?.message === 'string') {
      if (/duplicate key/i.test(error.message) || /already exists/i.test(error.message)) {
        return res.status(409).json(createError('Teacher already exists'));
      }
      return res.status(400).json(createError(error.message));
    }
    res.status(500).json(createError('Failed to create teacher'));
  }
});

// Get teacher by ID
router.get('/:id', authorize(['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'family_student', 'parent']), validate(idParamsSchema), async (req, res) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher', isDeleted: false })
      .populate('assignedSubjects', 'title')
      .populate('assignedClasses', 'className name')
      .populate('branchId', 'name code city')
      .lean<Record<string, any>>();
    if (!teacher) {
      return res.status(404).json(createResponse(null, 'Teacher not found'));
    }

    const role = req.user?.canonicalRole ?? req.user?.role;
    if (role === 'teacher' && String(req.user?.userId) !== String(teacher._id)) {
      return res.status(403).json(createError('Access denied'));
    }
    if (role === 'student') {
      const currentUser = await User.findById(req.user?.userId).select('assignedTeacherId studentId').lean<Record<string, any>>();
      const linkedStudent = currentUser?.studentId
        ? await Student.findOne({ studentId: currentUser.studentId, isDeleted: false }).select('teacherId').lean<Record<string, any>>()
        : null;
      const teacherId = linkedStudent?.teacherId ?? currentUser?.assignedTeacherId;
      if (String(teacherId ?? '') !== String(teacher._id)) {
        return res.status(403).json(createError('Access denied'));
      }
    }
    if (role === 'parent' || req.user?.role === 'family_student') {
      const currentUser = await User.findById(req.user?.userId).select('familyId parentProfileId').lean<Record<string, any>>();
      const familyStudents = await Student.find({
        isDeleted: false,
        ...(currentUser?.familyId ? { familyId: currentUser.familyId } : {}),
        ...(!currentUser?.familyId && currentUser?.parentProfileId ? { parentProfileId: currentUser.parentProfileId } : {})
      }).select('teacherId').lean();
      const allowedTeacherIds = familyStudents.map((student: any) => String(student.teacherId)).filter(Boolean);
      if (!allowedTeacherIds.includes(String(teacher._id))) {
        return res.status(403).json(createError('Access denied'));
      }
    }

    res.json(createResponse(sanitizeTeacherForRole(serializeTeacher(teacher), role)));
  } catch (error) {
    res.status(500).json(createResponse(null, 'Failed to fetch teacher'));
  }
});

// Update teacher
router.put('/:id', requireAdmin, validate(updateTeacherSchema), async (req: Request, res) => {
  try {
    const existingTeacher = await User.findOne({ _id: req.params.id, role: 'teacher', isDeleted: false }).lean();
    if (!existingTeacher) {
      return res.status(404).json(createError('Teacher not found'));
    }

    if (req.body.email) {
      const duplicateEmail = await User.findOne({
        email: req.body.email.toLowerCase(),
        _id: { $ne: req.params.id },
        isDeleted: false
      }).lean();
      if (duplicateEmail) {
        return res.status(409).json(createError('Email already exists'));
      }
    }

    const teacherPayload = buildTeacherPayload(req.body);
    const teacher = await userService.updateUser(req.params.id, teacherPayload);
    await syncTeacherProfile(teacher, teacherPayload);
    await syncSalarySettingFromEmployee({
      user: teacher,
      actorId: req.user?.userId ?? null
    });

    const savedTeacher = await User.findById(req.params.id)
      .populate('assignedSubjects', 'title')
      .populate('assignedClasses', 'className name')
      .populate('branchId', 'name code city')
      .lean();

    res.json(createResponse(serializeTeacher(savedTeacher), 'Teacher updated successfully'));
  } catch (error: any) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json(createError(error.message));
    }
    res.status(400).json(createError(String(error?.message || 'Failed to update teacher')));
  }
});

// Delete teacher
router.delete('/:id', requireAdmin, validate(idParamsSchema), async (req, res) => {
  try {
    const deletedAt = new Date();
    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'teacher', isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt,
          deletedBy: req.user?.userId ?? null,
          active: false,
          status: 'inactive'
        }
      },
      { new: true }
    ).lean();

    if (!teacher) return res.status(404).json(createError('Teacher not found'));

    await TeacherProfile.findOneAndUpdate(
      { userId: req.params.id },
      {
        $set: {
          isDeleted: true,
          deletedAt,
          deletedBy: req.user?.userId ?? null,
          active: false
        }
      }
    );

    res.json(createResponse({}, 'Teacher deleted successfully'));
  } catch (error) {
    res.status(500).json(createError('Failed to delete teacher'));
  }
});

export const teacherRouter = router;
