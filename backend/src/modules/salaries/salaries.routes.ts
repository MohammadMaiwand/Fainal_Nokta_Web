import { Router } from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createError, createResponse } from '../../helpers/response';
import { Salary } from '../../models/Salary';
import { User } from '../../models/User';
import { AuditService } from '../../services/auditService';
import { FinanceAggregationService } from '../../services/financeAggregationService';
import { getHijriYearMonth } from '../../services/afghanistanSalaryTaxService';
import { makePayment } from '../../services/makePayment.service';

const router = Router();
const auditService = new AuditService();
const financeAggregationService = new FinanceAggregationService();

const payoutSchema = Joi.object({
  body: Joi.object({
    teacherId: Joi.string().hex().length(24).required(),
    monthKey: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
    amount: Joi.number().positive().required(),
    notes: Joi.string().allow('', null).optional()
  })
});

router.use(authenticate);

router.get('/', authorize(['super_admin', 'admin', 'branch_manager', 'owner']), async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = { isDeleted: false };
    if (req.query.teacherId) filter.employeeId = req.query.teacherId;
    if (req.query.status) filter.status = req.query.status;
    if (req.user?.canonicalRole === 'branch_manager' && req.user.branchId) {
      filter.branchId = req.user.branchId;
    }

    const records = await Salary.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(createResponse(records));
  } catch (error) {
    next(error);
  }
});

router.get('/overview', authorize(['super_admin', 'admin', 'branch_manager', 'owner']), async (req, res, next) => {
  try {
    const scopedBranchId = req.user?.canonicalRole === 'branch_manager' ? req.user.branchId : undefined;
    const teachers = await financeAggregationService.getTeacherOverview(
      {
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        branchId: req.query.branchId ? String(req.query.branchId) : undefined,
        teacherId: req.query.teacherId ? String(req.query.teacherId) : undefined,
        classId: req.query.classId ? String(req.query.classId) : undefined,
        subjectId: req.query.subjectId ? String(req.query.subjectId) : undefined,
        status: req.query.status ? (String(req.query.status) as 'paid' | 'unpaid' | 'pending') : undefined
      },
      scopedBranchId
    );
    res.json(createResponse(teachers));
  } catch (error) {
    next(error);
  }
});

/**
 * Legacy salary payout endpoint — delegates to unified makePayment (SalaryRecord + Payment).
 * Also mirrors paid amount onto the legacy Salary collection for older finance screens.
 */
router.post('/payout', authorize(['super_admin', 'admin', 'owner', 'branch_manager']), validate(payoutSchema), async (req, res, next) => {
  try {
    const teacher = await User.findOne({ _id: req.body.teacherId, role: 'teacher', isDeleted: false }).lean<any>();
    if (!teacher) {
      return res.status(404).json(createError('Teacher not found'));
    }
    if (req.user?.canonicalRole === 'branch_manager' && req.user.branchId) {
      if (String(teacher.branchId ?? '') !== String(req.user.branchId)) {
        return res.status(403).json(createError('Branch access denied'));
      }
    }

    const payoutAmount = Number(req.body.amount);
    const [gregYear, gregMonth] = req.body.monthKey.split('-').map(Number);
    const periodDate = new Date(gregYear, gregMonth - 1, 15);
    const { year: hijriYear, month: hijriMonth } = getHijriYearMonth(periodDate);
    const idempotencyKey = `legacy-salary-payout-${String(teacher._id)}-${req.body.monthKey}-${payoutAmount.toFixed(2)}`;

    const result = await makePayment({
      paymentFor: 'teacher_salary',
      payeeUserId: String(teacher._id),
      payeeRole: 'teacher',
      amount: payoutAmount,
      salaryMonth: hijriMonth,
      salaryYear: hijriYear,
      notes: req.body.notes ?? '',
      branchId: teacher.branchId ?? null,
      idempotencyKey,
      actorUserId: req.user?.userId ?? null,
      actorRole: req.user?.canonicalRole ?? req.user?.role ?? null,
      actorBranchId: req.user?.branchId ?? null
    });

    const appliedAmount = Number(result.payment?.amount ?? payoutAmount);
    const legacy = await Salary.findOneAndUpdate(
      { employeeId: teacher._id, monthKey: req.body.monthKey, isDeleted: false },
      {
        $setOnInsert: {
          employeeId: teacher._id,
          branchId: teacher.branchId ?? null,
          monthKey: req.body.monthKey,
          baseAmount: Number(result.payment?.grossAmount ?? appliedAmount),
          deductions: Number(result.payment?.taxAmount ?? 0),
          netAmount: Number(result.salarySlip?.periodNetSalary ?? result.payment?.netAmount ?? appliedAmount),
          currency: 'AFN'
        },
        $inc: { paidAmount: result.idempotentReplay ? 0 : appliedAmount },
        $set: {
          status: Number(result.payment?.remainingSalaryBalance ?? 0) <= 0.01 ? 'paid' : 'pending',
          paidAt: new Date(),
          paidBy: req.user?.userId ?? null,
          approvedBy: req.user?.userId ?? null
        },
        $push: {
          auditHistory: {
            action: 'salary_payout',
            actorId: req.user?.userId ?? null,
            notes: req.body.notes ?? '',
            amount: appliedAmount,
            paymentId: String(result.payment?._id ?? ''),
            at: new Date()
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await auditService.recordAction({
      actorId: req.user!.userId,
      branchId: teacher.branchId?.toString?.() ?? null,
      action: 'SALARY_PAYOUT',
      target: String(teacher._id),
      targetType: 'teacher',
      metadata: {
        monthKey: req.body.monthKey,
        amount: appliedAmount,
        salaryId: String(legacy._id),
        paymentId: String(result.payment?._id ?? ''),
        hijriYear,
        hijriMonth,
        idempotentReplay: result.idempotentReplay,
        notes: req.body.notes ?? ''
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? ''
    });

    res.status(result.idempotentReplay ? 200 : 201).json(
      createResponse(
        {
          ...legacy.toObject?.() ?? legacy,
          payment: result.payment,
          receipt: result.receipt,
          salarySlip: result.salarySlip,
          idempotentReplay: result.idempotentReplay
        },
        result.idempotentReplay ? 'Salary payout already recorded (idempotent replay)' : 'Salary payout recorded successfully'
      )
    );
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json(createError(error.message));
    }
    if (error?.code === 11000) {
      return res.status(409).json(createError('Duplicate salary payout blocked for this teacher and month'));
    }
    next(error);
  }
});

export const salariesRouter = router;
