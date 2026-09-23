import { Router } from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createError, createResponse } from '../../helpers/response';
import { paginationSchema } from '../../validators/pagination';
import { Loan } from '../../models/Loan';
import { LoanRepayment } from '../../models/LoanRepayment';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import {
  approveLoan,
  cancelLoan,
  createLoan,
  getLoansSummary,
  getPersonLoanContext,
  recordLoanRepayment
} from '../../services/loanService';
import {
  buildMongoDateRange,
  buildPaginationMeta,
  buildTextSearchFilter,
  parseMultiQueryValue,
  parsePagination,
  resolveSort
} from '../../utils/listQuery';

const router = Router();
const staffRoles = ['super_admin', 'admin', 'branch_manager', 'owner', 'accountant'] as const;

const createLoanSchema = Joi.object({
  body: Joi.object({
    personType: Joi.string().valid('student', 'teacher', 'manager', 'employee').required(),
    personId: Joi.string().hex().length(24).required(),
    loanType: Joi.string().valid('CASH_LOAN', 'SALARY_ADVANCE', 'STUDENT_FEE_DEBT', 'EMERGENCY_LOAN', 'OTHER').required(),
    purpose: Joi.string().allow('', null),
    originalAmount: Joi.number().positive().required(),
    loanDate: Joi.date().iso().optional(),
    dueDate: Joi.date().iso().allow(null).optional(),
    notes: Joi.string().allow('', null),
    branchId: Joi.string().hex().length(24).allow('', null),
    payrollDeductionEnabled: Joi.boolean().optional(),
    payrollDeductionAmount: Joi.number().min(0).optional(),
    installmentEnabled: Joi.boolean().optional(),
    installmentAmount: Joi.number().min(0).optional(),
    repaymentMethodDefault: Joi.string()
      .valid('cash', 'bank_transfer', 'mobile_money', 'card', 'payroll_deduction', 'student_payment_adjustment', 'other')
      .optional(),
    classId: Joi.string().hex().length(24).allow('', null),
    subjectId: Joi.string().hex().length(24).allow('', null),
    courseId: Joi.string().hex().length(24).allow('', null),
    idempotencyKey: Joi.string().trim().max(120).allow('', null),
    autoApprove: Joi.boolean().optional()
  })
});

const repaymentSchema = Joi.object({
  body: Joi.object({
    amount: Joi.number().positive().required(),
    repaymentMethod: Joi.string()
      .valid('cash', 'bank_transfer', 'mobile_money', 'card', 'payroll_deduction', 'student_payment_adjustment', 'other')
      .optional(),
    repaymentDate: Joi.date().iso().optional(),
    note: Joi.string().allow('', null),
    idempotencyKey: Joi.string().trim().max(120).allow('', null)
  })
});

router.use(authenticate, authorize([...staffRoles]));

router.get('/summary', async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.user?.canonicalRole === 'branch_manager' && req.user.branchId) {
      filter.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      filter.branchId = req.query.branchId;
    }
    const summary = await getLoansSummary(filter);
    res.json(createResponse(summary));
  } catch (error) {
    next(error);
  }
});

router.get('/person-options', async (req, res, next) => {
  try {
    const personType = String(req.query.personType || 'student');
    const search = String(req.query.search || '').trim();
    const branchId =
      req.user?.canonicalRole === 'branch_manager' && req.user.branchId
        ? String(req.user.branchId)
        : String(req.query.branchId || '');

    if (personType === 'student') {
      const filter: Record<string, any> = { isDeleted: false, status: 'active' };
      if (branchId) filter.branchId = branchId;
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { fatherName: { $regex: search, $options: 'i' } },
          { studentId: { $regex: search, $options: 'i' } },
          { rollNo: { $regex: search, $options: 'i' } }
        ];
      }
      const students = await Student.find(filter)
        .select('firstName lastName fatherName studentId rollNo familyPhone branchId')
        .limit(50)
        .lean<any[]>();
      return res.json(
        createResponse(
          students.map((student) => ({
            value: String(student._id),
            label: [student.firstName, student.lastName].filter(Boolean).join(' '),
            fatherName: student.fatherName || '',
            phone: student.familyPhone || '',
            uniqueId: student.studentId || student.rollNo || String(student._id).slice(-6),
            branchId: student.branchId ? String(student.branchId) : ''
          }))
        )
      );
    }

    const roleFilter =
      personType === 'teacher'
        ? 'teacher'
        : personType === 'manager'
          ? { $in: ['admin', 'branch_manager', 'owner'] }
          : { $in: ['accountant', 'librarian', 'system_automation', 'user'] };

    const filter: Record<string, any> = {
      isDeleted: false,
      active: { $ne: false },
      role: roleFilter
    };
    if (branchId) filter.branchId = branchId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(filter).select('name fatherName phone role branchId').limit(50).lean<any[]>();
    res.json(
      createResponse(
        users.map((user) => ({
          value: String(user._id),
          label: user.name,
          fatherName: user.fatherName || '',
          phone: user.phone || '',
          uniqueId: String(user._id).slice(-6),
          role: user.role,
          branchId: user.branchId ? String(user.branchId) : ''
        }))
      )
    );
  } catch (error) {
    next(error);
  }
});

router.get('/persons/:type/:id/context', async (req, res, next) => {
  try {
    const personType = String(req.params.type) as 'student' | 'teacher' | 'manager' | 'employee';
    if (!['student', 'teacher', 'manager', 'employee'].includes(personType)) {
      return res.status(400).json(createError('Invalid person type'));
    }
    const context = await getPersonLoanContext(personType, req.params.id);
    res.json(createResponse(context));
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json(createError(error.message));
    next(error);
  }
});

router.get('/', validate(paginationSchema), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = { isDeleted: false };

    if (req.user?.canonicalRole === 'branch_manager' && req.user.branchId) {
      filter.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      filter.branchId = req.query.branchId;
    }

    const personTypes = parseMultiQueryValue(req.query.personType);
    if (personTypes.length === 1) filter.personType = personTypes[0];
    else if (personTypes.length > 1) filter.personType = { $in: personTypes };

    const statuses = parseMultiQueryValue(req.query.status);
    if (statuses.length === 1) filter.status = statuses[0];
    else if (statuses.length > 1) filter.status = { $in: statuses };

    const loanTypes = parseMultiQueryValue(req.query.loanType);
    if (loanTypes.length === 1) filter.loanType = loanTypes[0];
    else if (loanTypes.length > 1) filter.loanType = { $in: loanTypes };

    if (String(req.query.outstandingOnly) === 'true') {
      filter.remainingAmount = { $gt: 0 };
      filter.status = { $in: ['active', 'partially_repaid', 'overdue', 'approved'] };
    }

    try {
      const dateRange = buildMongoDateRange({
        period: req.query.period as string,
        from: req.query.from,
        to: req.query.to
      });
      if (dateRange) filter.loanDate = dateRange;
    } catch (error: any) {
      return res.status(error?.statusCode || 400).json(createError(error.message || 'Invalid date range'));
    }

    const searchFilter = buildTextSearchFilter(req.query.search, [
      'loanNumber',
      'personName',
      'fatherName',
      'personPhone',
      'notes'
    ]);
    if (searchFilter) Object.assign(filter, searchFilter);

    const sort = resolveSort(
      req.query as Record<string, unknown>,
      {
        date: 'loanDate',
        loanDate: 'loanDate',
        dueDate: 'dueDate',
        amount: 'originalAmount',
        originalAmount: 'originalAmount',
        remainingAmount: 'remainingAmount',
        repaidAmount: 'repaidAmount',
        status: 'status',
        name: 'personName',
        createdAt: 'createdAt'
      },
      { loanDate: -1 }
    );

    const [items, total] = await Promise.all([
      Loan.find(filter).lean().sort(sort).skip(skip).limit(limit),
      Loan.countDocuments(filter)
    ]);

    res.json(createResponse(items, '', buildPaginationMeta(page, limit, total)));
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(createLoanSchema), async (req, res, next) => {
  try {
    const result = await createLoan({
      ...req.body,
      actorUserId: req.user?.userId ?? null,
      autoApprove: req.body.autoApprove !== false
    });
    res.status(result.idempotentReplay ? 200 : 201).json(createResponse(result, result.idempotentReplay ? 'Loan already recorded' : 'Loan created'));
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json(createError(error.message));
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, isDeleted: false }).lean<any>();
    if (!loan) return res.status(404).json(createError('Loan not found'));
    if (req.user?.canonicalRole === 'branch_manager' && req.user.branchId && String(loan.branchId || '') !== String(req.user.branchId)) {
      return res.status(403).json(createError('Access denied'));
    }
    const repayments = await LoanRepayment.find({ loanId: loan._id, isDeleted: false }).sort({ repaymentDate: -1 }).lean();
    res.json(createResponse({ ...loan, repayments }));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/approve', authorize(['super_admin', 'admin', 'owner']), async (req, res, next) => {
  try {
    const loan = await approveLoan(req.params.id, req.user?.userId ?? null);
    res.json(createResponse(loan, 'Loan approved'));
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json(createError(error.message));
    next(error);
  }
});

router.post('/:id/cancel', authorize(['super_admin', 'admin', 'owner']), async (req, res, next) => {
  try {
    const loan = await cancelLoan(req.params.id, String(req.body?.reason || 'cancelled'), req.user?.userId ?? null);
    res.json(createResponse(loan, 'Loan cancelled'));
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json(createError(error.message));
    next(error);
  }
});

router.get('/:id/repayments', async (req, res, next) => {
  try {
    const repayments = await LoanRepayment.find({ loanId: req.params.id, isDeleted: false }).sort({ repaymentDate: -1 }).lean();
    res.json(createResponse(repayments));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/repayments', validate(repaymentSchema), async (req, res, next) => {
  try {
    const result = await recordLoanRepayment({
      loanId: req.params.id,
      amount: Number(req.body.amount),
      repaymentMethod: req.body.repaymentMethod,
      repaymentDate: req.body.repaymentDate,
      note: req.body.note,
      actorUserId: req.user?.userId ?? null,
      idempotencyKey: req.body.idempotencyKey || req.headers['idempotency-key']?.toString()
    });
    res.status(result.idempotentReplay ? 200 : 201).json(createResponse(result, result.idempotentReplay ? 'Repayment already recorded' : 'Repayment recorded'));
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json(createError(error.message));
    next(error);
  }
});

export const loanRouter = router;
