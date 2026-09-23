import assert from 'node:assert/strict';
import {
  buildMongoDateRange,
  buildPaginationMeta,
  buildTextSearchFilter,
  parseMultiQueryValue,
  parsePagination,
  resolveQuickDatePeriod,
  resolveSort
} from './listQuery';

function testPeriods() {
  const now = new Date(2026, 6, 16, 15, 30, 0); // Jul 16, 2026
  const today = resolveQuickDatePeriod('today', now);
  assert.equal(today?.start?.getDate(), 16);
  assert.equal(today?.end?.getHours(), 23);

  const month = resolveQuickDatePeriod('this_month', now);
  assert.equal(month?.start?.getMonth(), 6);
  assert.equal(month?.start?.getDate(), 1);

  const q3 = resolveQuickDatePeriod('q3', now);
  assert.equal(q3?.start?.getMonth(), 6);
  assert.equal(q3?.end?.getMonth(), 8);

  const all = resolveQuickDatePeriod('all', now);
  assert.equal(all, null);
}

function testCustomRange() {
  const range = buildMongoDateRange({ from: '2026-07-01', to: '2026-07-31' });
  assert.ok(range?.$gte);
  assert.ok(range?.$lte);
  assert.throws(() => buildMongoDateRange({ from: '2026-08-01', to: '2026-07-01' }));
}

function testMultiAndPagination() {
  assert.deepEqual(parseMultiQueryValue(['paid', 'pending']), ['paid', 'pending']);
  assert.deepEqual(parseMultiQueryValue('paid,pending'), ['paid', 'pending']);
  const page = parsePagination({ page: '2', limit: '50' });
  assert.equal(page.page, 2);
  assert.equal(page.limit, 50);
  assert.equal(page.skip, 50);
  const capped = parsePagination({ limit: '999' }, { maxLimit: 100 });
  assert.equal(capped.limit, 100);
  const meta = buildPaginationMeta(2, 25, 240);
  assert.equal(meta.totalPages, 10);
  assert.equal(meta.hasNextPage, true);
}

function testSortAndSearch() {
  const sort = resolveSort({ sortBy: 'amount', sortOrder: 'asc' }, { amount: 'amount', date: 'paymentDate' }, { paymentDate: -1 });
  assert.deepEqual(sort, { amount: 1 });
  const fallback = resolveSort({ sortBy: 'hack' }, { amount: 'amount' }, { paymentDate: -1 });
  assert.deepEqual(fallback, { paymentDate: -1 });
  const search = buildTextSearchFilter('Ahmad', ['name', 'email']);
  assert.ok(search?.$or?.length === 2);
}

function run() {
  testPeriods();
  testCustomRange();
  testMultiAndPagination();
  testSortAndSearch();
  console.log('listQuery tests passed');
}

run();
