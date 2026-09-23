import Joi from 'joi';

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(5000).default(20),
  pageSize: Joi.number().integer().min(1).max(5000).optional(),
  search: Joi.string().allow('', null),
  sortBy: Joi.string().trim().max(64).allow('', null),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  period: Joi.string()
    .valid(
      'all',
      'today',
      'yesterday',
      'last_7_days',
      'last_30_days',
      'this_week',
      'previous_week',
      'this_month',
      'previous_month',
      'this_quarter',
      'previous_quarter',
      'q1',
      'q2',
      'q3',
      'q4',
      'this_year',
      'previous_year',
      'custom'
    )
    .allow('', null),
  from: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
  to: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
  dateField: Joi.string().trim().max(64).allow('', null),
  status: Joi.alternatives().try(Joi.string().allow('', null), Joi.array().items(Joi.string())).optional(),
  branchId: Joi.string().hex().length(24).allow('', null),
  includeDeleted: Joi.boolean().truthy('true').falsy('false').optional()
});

export const objectIdSchema = Joi.string().hex().length(24);
