import { Router, type Request } from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createError, createResponse } from '../../helpers/response';
import { paginationSchema } from '../../validators/pagination';
import { Payment } from '../../models/Payment';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { ownershipService } from '../../services/ownershipService';
import { enrichStudentWithDisplay, studentPopulatePaths } from '../../utils/studentDisplay';
import { makePayment, previewSalaryPayment, reverseOrRefundPayment } from '../../services/makePayment.service';
import {
  buildMongoDateRange,
  buildPaginationMeta,
  buildTextSearchFilter,
  parseMultiQueryValue,
  parsePagination,
  resolveSort
} from '../../utils/listQuery';

const router = Router();

function serializePayment(payment: any) {
  const display = payment?.studentId?.studentDisplay ?? {};
  return {
    ...payment,
    studentName: display.fullName ?? [payment?.studentId?.firstName, payment?.studentId?.lastName].filter(Boolean).join(' ').trim(),
    studentRollNo: display.studentNumber ?? payment?.studentId?.rollNo ?? payment?.studentId?.studentId ?? '',
    className: display.className ?? '',
    subjectName: display.subjectName ?? '',
    teacherName: display.teacherName ?? '',
    guardianPhone: display.guardianPhone ?? payment?.studentId?.familyPhone ?? '',
    studentPhone: display.studentPhone ?? '',
    branchName: display.branchName ?? '',
    enrollmentStatus: display.enrollmentStatus ?? '',
    studentDisplay: display,
    paymentFor: payment?.paymentFor ?? 'student_fee',
    payeeName: payment?.payeeUserId?.name ?? '',
    payeeRole: payment?.payeeRole ?? '',
    grossAmount: Number(payment?.grossAmount ?? payment?.amount ?? 0),
    taxAmount: Number(payment?.taxAmount ?? 0),
    netAmount: Number(payment?.netAmount ?? payment?.amount ?? 0),
    invoiceNumber: payment?.invoiceNumber ?? '',
    remainingBalance: Number(payment?.studentId?.remainingBalance ?? 0),
    remainingSalaryBalance: Number(payment?.remainingSalaryBalance ?? 0)
  };
}

async function normalizePayment(payment: any) {
  if (!payment?.studentId) return serializePayment(payment);
  const student = await enrichStudentWithDisplay(payment.studentId);
  return serializePayment({ ...payment, studentId: student });
}

async function normalizePayments(payments: any[]) {
  return Promise.all(payments.map(normalizePayment));
}

const paymentSchema = Joi.object({
  body: Joi.object({
    paymentType: Joi.string().valid('student_fee', 'employee_salary', 'expense').optional(),
    paymentFor: Joi.string().valid('student_fee', 'teacher_salary', 'manager_salary', 'expense').optional(),
    studentId: Joi.string().hex().length(24).allow('', null).optional(),
    employeeId: Joi.string().hex().length(24).allow('', null).optional(),
    payeeUserId: Joi.string().hex().length(24).allow('', null).optional(),
    employeeRole: Joi.string().valid('teacher', 'manager').allow('', null).optional(),
    payeeRole: Joi.string().valid('teacher', 'manager').allow('', null).optional(),
    amount: Joi.number().positive().required(),
    grossSalary: Joi.number().min(0).optional(),
    salaryMonth: Joi.number().min(1).max(12).optional(),
    salaryYear: Joi.number().min(1300).max(1500).optional(),
    discount: Joi.number().min(0).optional(),
    method: Joi.string().valid('cash', 'bank_transfer', 'mobile_money', 'card').optional(),
    paymentDate: Joi.date().iso().optional(),
    referenceNumber: Joi.string().allow('', null).optional(),
    idempotencyKey: Joi.string().trim().max(120).allow('', null).optional(),
    notes: Joi.string().allow('', null).optional(),
    expenseTitle: Joi.string().trim().max(200).allow('', null).optional(),
    expenseCategory: Joi.string().trim().max(100).allow('', null).optional(),
    branchId: Joi.string().hex().length(24).optional()
  })
});

router.use(authenticate);

async function getScopedPaymentStudentIds(req: Request) {
  const role = req.user?.canonicalRole;
  if (!role || !req.user?.userId) {
    return null;
  }

  if (role === 'student') {
    const user = await User.findById(req.user.userId).select('studentId').lean<Record<string, any>>();
    if (!user?.studentId) {
      return [];
    }
    const student = await Student.findOne({ studentId: user.studentId, isDeleted: false }).select('_id').lean<Record<string, any>>();
    return student ? [student._id] : [];
  }

  if (role === 'parent') {
    const user = await User.findById(req.user.userId).select('familyId parentProfileId').lean<Record<string, any>>();
    const filter: Record<string, unknown> = { isDeleted: false };
    if (user?.familyId) {
      filter.familyId = user.familyId;
    } else if (user?.parentProfileId) {
      filter.parentProfileId = user.parentProfileId;
    } else {
      return [];
    }

    const students = await Student.find(filter).select('_id').lean();
    return students.map((student: any) => student._id);
  }

  return null;
}

router.get('/', authorize(['super_admin', 'admin', 'branch_manager', 'owner', 'student', 'parent']), validate(paginationSchema), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = { isDeleted: false };
    if (req.query.studentId) {
      filter.studentId = req.query.studentId;
    }

    const scopedStudentIds = await getScopedPaymentStudentIds(req);
    if (Array.isArray(scopedStudentIds)) {
      filter.studentId = { $in: scopedStudentIds };
    }

    if (req.user?.canonicalRole === 'branch_manager' && req.user.branchId) {
      filter.branchId = req.user.branchId;
    } else if (req.query.branchId && ['super_admin', 'admin', 'owner'].includes(String(req.user?.canonicalRole))) {
      filter.branchId = req.query.branchId;
    }

    const statuses = parseMultiQueryValue(req.query.status);
    if (statuses.length === 1) {
      filter.status = statuses[0];
    } else if (statuses.length > 1) {
      filter.status = { $in: statuses };
    }

    const paymentForValues = parseMultiQueryValue(req.query.paymentFor);
    if (paymentForValues.length === 1) {
      filter.paymentFor = paymentForValues[0];
    } else if (paymentForValues.length > 1) {
      filter.paymentFor = { $in: paymentForValues };
    }

    const methods = parseMultiQueryValue(req.query.method);
    if (methods.length === 1) {
      filter.method = methods[0];
    } else if (methods.length > 1) {
      filter.method = { $in: methods };
    }

    try {
      const dateRange = buildMongoDateRange({
        period: req.query.period as string,
        from: req.query.from,
        to: req.query.to
      });
      if (dateRange) {
        filter.paymentDate = dateRange;
      }
    } catch (error: any) {
      return res.status(error?.statusCode || 400).json(createError(error.message || 'Invalid date range'));
    }

    const searchFilter = buildTextSearchFilter(req.query.search, [
      'invoiceNumber',
      'referenceNumber',
      'notes',
      'payeeName'
    ]);
    if (searchFilter) {
      Object.assign(filter, searchFilter);
    }

    const sort = resolveSort(
      req.query as Record<string, unknown>,
      {
        date: 'paymentDate',
        paymentDate: 'paymentDate',
        amount: 'amount',
        netAmount: 'netAmount',
        grossAmount: 'grossAmount',
        status: 'status',
        createdAt: 'createdAt'
      },
      { paymentDate: -1 }
    );

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate({ path: 'studentId', populate: studentPopulatePaths, select: 'firstName lastName studentId rollNo remainingBalance classId subjectId teacherId branchId familyId parentProfileId familyPhone whatsapp status accountStatus' })
        .populate('payeeUserId', 'name email role')
        .lean()
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter)
    ]);

    res.json(createResponse(await normalizePayments(payments), '', buildPaginationMeta(page, limit, total)));
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize(['super_admin', 'admin', 'branch_manager', 'owner']), validate(paymentSchema), async (req, res, next) => {
  try {
    const requestedPaymentType = String(req.body.paymentType || '');
    const requestedRole = String(req.body.employeeRole || req.body.payeeRole || '');
    let paymentFor = String(req.body.paymentFor || 'student_fee') as 'student_fee' | 'teacher_salary' | 'manager_salary' | 'expense';

    if (requestedPaymentType === 'student_fee') paymentFor = 'student_fee';
    if (requestedPaymentType === 'employee_salary') {
      paymentFor = requestedRole === 'manager' ? 'manager_salary' : 'teacher_salary';
    }
    if (requestedPaymentType === 'expense') paymentFor = 'expense';

    const result = await makePayment({
      paymentFor,
      studentId: req.body.studentId,
      payeeUserId: req.body.employeeId || req.body.payeeUserId,
      payeeRole: (requestedRole || (paymentFor === 'teacher_salary' ? 'teacher' : paymentFor === 'manager_salary' ? 'manager' : undefined)) as
        | 'teacher'
        | 'manager'
        | undefined,
      amount: Number(req.body.amount || 0),
      grossSalary: req.body.grossSalary,
      salaryMonth: req.body.salaryMonth,
      salaryYear: req.body.salaryYear,
      discount: req.body.discount,
      method: req.body.method,
      paymentDate: req.body.paymentDate,
      referenceNumber: req.body.referenceNumber,
      idempotencyKey: req.body.idempotencyKey || req.get('idempotency-key') || req.get('x-idempotency-key'),
      notes: req.body.notes,
      expenseTitle: req.body.expenseTitle,
      expenseCategory: req.body.expenseCategory,
      branchId: req.body.branchId,
      actorUserId: req.user?.userId ?? null,
      actorRole: req.user?.canonicalRole ?? req.user?.role ?? null,
      actorBranchId: req.user?.branchId ?? null
    });

    res.status(result.idempotentReplay ? 200 : 201).json(
      createResponse(
        {
          ...result.payment,
          receipt: result.receipt,
          salarySlip: result.salarySlip,
          idempotentReplay: result.idempotentReplay
        },
        result.idempotentReplay ? 'Payment already recorded (idempotent replay)' : 'Payment recorded successfully'
      )
    );
  } catch (error: any) {
    if (String(error?.message ?? '') === 'Payment exceeds remaining balance') {
      return res.status(400).json(createError('Payment exceeds remaining balance'));
    }
    if (String(error?.message ?? '') === 'Salary payment exceeds unpaid net salary for this period') {
      return res.status(400).json(createError(error.message));
    }
    if (error?.statusCode) {
      return res.status(error.statusCode).json(createError(error.message));
    }
    const message = String(error?.message ?? '');
    if (message.includes('تنظیمات معاش') || message.includes('کاربر پیدا نشد') || message.includes('Salary record not found')) {
      return res.status(400).json(createError(message));
    }
    if (error?.code === 11000 && String(error?.message ?? '').includes('referenceNumber')) {
      return res.status(409).json(createError('Duplicate payment reference. Use a unique reference number.'));
    }
    if (error?.code === 11000 && String(error?.message ?? '').includes('invoiceNumber')) {
      return res.status(409).json(createError('Duplicate invoice number. Please retry.'));
    }
    if (error?.code === 11000 && String(error?.message ?? '').includes('idempotencyKey')) {
      return res.status(409).json(createError('Duplicate idempotency key.'));
    }
    next(error);
  }
});

router.get('/salary-preview', authorize(['super_admin', 'admin', 'branch_manager', 'owner']), async (req, res, next) => {
  try {
    const payeeUserId = String(req.query.payeeUserId || req.query.employeeId || '');
    const payeeRole = String(req.query.payeeRole || req.query.employeeRole || 'teacher') as 'teacher' | 'manager';
    const salaryMonth = Number(req.query.salaryMonth);
    const salaryYear = Number(req.query.salaryYear);
    if (!payeeUserId || !salaryMonth || !salaryYear) {
      return res.status(400).json(createError('payeeUserId, salaryMonth, and salaryYear are required'));
    }
    const preview = await previewSalaryPayment({
      payeeUserId,
      payeeRole,
      salaryMonth,
      salaryYear,
      requestedGross: req.query.grossSalary ? Number(req.query.grossSalary) : undefined,
      actorRole: req.user?.canonicalRole ?? req.user?.role ?? null
    });
    res.json(createResponse(preview));
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json(createError(error.message));
    const message = String(error?.message || 'Failed to preview salary');
    if (message.includes('تنظیمات معاش')) {
      return res.status(400).json(createError(message));
    }
    next(error);
  }
});

router.post('/:id/reverse', authorize(['super_admin', 'admin', 'owner']), async (req, res, next) => {
  try {
    const payment = await reverseOrRefundPayment({
      paymentId: req.params.id,
      action: 'reverse',
      actorUserId: req.user?.userId ?? null,
      reason: String(req.body?.reason || 'manual_reverse')
    });
    res.json(createResponse(payment, 'Payment reversed'));
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json(createError(error.message));
    next(error);
  }
});

router.post('/:id/refund', authorize(['super_admin', 'admin', 'owner']), async (req, res, next) => {
  try {
    const payment = await reverseOrRefundPayment({
      paymentId: req.params.id,
      action: 'refund',
      actorUserId: req.user?.userId ?? null,
      reason: String(req.body?.reason || 'manual_refund')
    });
    res.json(createResponse(payment, 'Payment refunded'));
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json(createError(error.message));
    next(error);
  }
});

router.get('/payees', authorize(['super_admin', 'admin', 'branch_manager', 'owner']), async (req, res, next) => {
  try {
    const role = String(req.query.role || 'all');
    const search = String(req.query.search || '').trim();
    const roleFilter =
      role === 'teacher'
        ? 'teacher'
        : role === 'branch_manager'
          ? 'branch_manager'
          : role === 'manager'
            ? { $in: ['admin', 'branch_manager', 'owner'] }
            : { $in: ['teacher', 'admin', 'branch_manager', 'owner'] };
    const filter: Record<string, any> = {
      isDeleted: false,
      active: { $ne: false },
      status: { $nin: ['inactive', 'blocked', 'expired'] },
      role: roleFilter
    };
    if (req.query.branchId) {
      filter.branchId = req.query.branchId;
    }
    if (req.user?.canonicalRole === 'branch_manager' && req.user?.branchId) {
      filter.branchId = req.user.branchId;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(filter)
      .select('name role branchId phone email salaryType fixedSalary percentageRate customPercentage')
      .limit(100)
      .lean<any[]>();
    const payload = users.map((user) => ({
      value: String(user._id),
      id: String(user._id),
      label: user.name,
      name: user.name,
      phone: user.phone || '',
      email: user.email || '',
      role: user.role === 'teacher' ? 'teacher' : user.role === 'branch_manager' ? 'branch_manager' : 'manager',
      systemRole: user.role,
      salaryType: user.salaryType,
      fixedSalary: Number(user.fixedSalary || 0),
      percentageRate: Number(user.customPercentage || user.percentageRate || 0),
      branchId: user.branchId ? String(user.branchId) : ''
    }));
    res.json(createResponse(payload));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/invoice', authorize(['super_admin', 'admin', 'branch_manager', 'owner', 'student', 'parent']), async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({ path: 'studentId', populate: studentPopulatePaths, select: 'firstName lastName studentId rollNo feeAmount paidAmount remainingBalance classId subjectId teacherId branchId familyId parentProfileId familyPhone whatsapp status accountStatus' })
      .populate('collectedBy', 'name email')
      .lean<any>();

    if (!payment || payment.isDeleted) {
      return res.status(404).json(createError('Payment invoice not found'));
    }

    const canAccess = await ownershipService.verifyPaymentOwnership(req, String(payment._id));
    if (!canAccess) {
      return res.status(403).json(createError('Access denied'));
    }

    const normalizedPayment = await normalizePayment(payment);
    res.json(createResponse({
      ...normalizedPayment,
      issuedAt: payment.paymentDate,
      collectedByName: (payment as any).collectedBy?.name ?? '',
      studentFeeAmount: Number((payment as any).studentId?.feeAmount ?? 0),
      totalPaidAmount: Number((payment as any).studentId?.paidAmount ?? 0)
    }));
  } catch (error) {
    next(error);
  }
});

export const paymentRouter = router;
