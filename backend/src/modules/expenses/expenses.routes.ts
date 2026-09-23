import { Router } from 'express';
import Joi from 'joi';
import { Expense } from '../../models/Expense';
import { Salary } from '../../models/Salary';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createResponse, createError } from '../../helpers/response';
import { paginationSchema } from '../../validators/pagination';
import {
  buildMongoDateRange,
  buildPaginationMeta,
  buildTextSearchFilter,
  parseMultiQueryValue,
  parsePagination,
  resolveSort
} from '../../utils/listQuery';

const router = Router();
const expenseSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().required(),
    amount: Joi.number().positive().required(),
    category: Joi.string().required(),
    date: Joi.date().optional(),
    branchId: Joi.string().hex().length(24).allow(null).optional(),
    notes: Joi.string().allow('', null)
  })
});

function buildExpenseFilter(req: any, extra: Record<string, unknown> = {}) {
  const filter: Record<string, unknown> = {
    isDeleted: false,
    category: { $ne: 'income' },
    ...extra
  };

  if (req.user?.canonicalRole === 'branch_manager' && req.user.branchId) {
    filter.branchId = req.user.branchId;
  } else if (req.query?.branchId) {
    filter.branchId = req.query.branchId;
  }

  return filter;
}

router.use(authenticate, authorize(['super_admin', 'admin', 'accountant', 'branch_manager', 'owner']));

router.post('/', validate(expenseSchema), async (req, res, next) => {
  try {
    if (String(req.body.category).toLowerCase() === 'income') {
      return res.status(400).json(createError('Income entries are not allowed in the expense module'));
    }

    const expense = await Expense.create({
      ...req.body,
      branchId: req.body.branchId ?? req.user?.branchId ?? null,
      createdBy: req.user?.userId ?? null
    });
    res.status(201).json(createResponse(expense, 'Expense recorded'));
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    const baseFilter = buildExpenseFilter(req);
    try {
      const dateRange = buildMongoDateRange({
        period: req.query.period as string,
        from: req.query.from,
        to: req.query.to
      });
      if (dateRange) baseFilter.date = dateRange;
    } catch (error: any) {
      return res.status(error?.statusCode || 400).json(createError(error.message || 'Invalid date range'));
    }

    const [expenseTotals, salaryTotals, monthlyExpenses, categoryBreakdown] = await Promise.all([
      Expense.aggregate([
        { $match: baseFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Salary.aggregate([
        { $match: { isDeleted: false, ...(baseFilter.branchId ? { branchId: baseFilter.branchId } : {}) } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Expense.aggregate([
        { $match: { ...baseFilter, date: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Expense.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
      ])
    ]);

    res.json(createResponse({
      totalExpenses: expenseTotals[0]?.total ?? 0,
      teacherSalaries: salaryTotals[0]?.total ?? 0,
      monthlyExpenses: monthlyExpenses.map((entry: any) => ({
        year: entry._id.year,
        month: entry._id.month,
        total: entry.total
      })),
      categories: categoryBreakdown.map((entry: any) => ({
        category: entry._id,
        total: entry.total
      }))
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/', validate(paginationSchema), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter = buildExpenseFilter(req);

    const categories = parseMultiQueryValue(req.query.category);
    if (categories.length === 1) {
      filter.category = categories[0];
    } else if (categories.length > 1) {
      filter.category = { $in: categories, $ne: 'income' };
    }

    try {
      const dateRange = buildMongoDateRange({
        period: req.query.period as string,
        from: req.query.from,
        to: req.query.to
      });
      if (dateRange) {
        filter.date = dateRange;
      }
    } catch (error: any) {
      return res.status(error?.statusCode || 400).json(createError(error.message || 'Invalid date range'));
    }

    const searchFilter = buildTextSearchFilter(req.query.search, ['title', 'category', 'notes']);
    if (searchFilter) {
      Object.assign(filter, searchFilter);
    }

    const sort = resolveSort(
      req.query as Record<string, unknown>,
      { date: 'date', amount: 'amount', category: 'category', title: 'title', createdAt: 'createdAt' },
      { date: -1 }
    );

    const [expenses, total] = await Promise.all([
      Expense.find(filter).lean().sort(sort).skip(skip).limit(limit),
      Expense.countDocuments(filter)
    ]);
    res.json(createResponse(expenses, '', buildPaginationMeta(page, limit, total)));
  } catch (error) {
    next(error);
  }
});

export const expenseRouter = router;
