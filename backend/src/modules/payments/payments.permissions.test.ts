/**
 * Payment route permission matrix (authorize role lists).
 * Mirrors backend/src/modules/payments/payments.routes.ts.
 */
import { authorize } from '../../middlewares/auth';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runAuthorize(allowedRoles: string[], role: string) {
  let status = 200;
  const req = {
    user: { role, userId: 'u1', branchId: null },
    originalUrl: '/api/payments',
    method: 'POST',
    ip: '127.0.0.1',
    get: () => ''
  } as any;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json() {
      return res;
    }
  } as any;
  let nextCalled = false;
  authorize(allowedRoles)(req, res, () => {
    nextCalled = true;
  });
  return { status, nextCalled };
}

const createRoles = ['super_admin', 'admin', 'branch_manager', 'owner'];
const reverseRefundRoles = ['super_admin', 'admin', 'owner'];
const previewRoles = ['super_admin', 'admin', 'branch_manager', 'owner'];

assert(runAuthorize(createRoles, 'admin').nextCalled, 'admin can create payments');
assert(runAuthorize(createRoles, 'owner').nextCalled, 'owner can create payments');
assert(runAuthorize(createRoles, 'branch_manager').nextCalled, 'branch_manager can create payments');
assert(!runAuthorize(createRoles, 'teacher').nextCalled, 'teacher cannot create payments');
assert(runAuthorize(createRoles, 'teacher').status === 403, 'teacher create gets 403');
assert(!runAuthorize(createRoles, 'student').nextCalled, 'student cannot create payments');

assert(runAuthorize(reverseRefundRoles, 'admin').nextCalled, 'admin can reverse/refund');
assert(runAuthorize(reverseRefundRoles, 'owner').nextCalled, 'owner can reverse/refund');
assert(!runAuthorize(reverseRefundRoles, 'branch_manager').nextCalled, 'branch_manager cannot reverse/refund');
assert(runAuthorize(reverseRefundRoles, 'branch_manager').status === 403, 'branch_manager reverse gets 403');
assert(!runAuthorize(reverseRefundRoles, 'teacher').nextCalled, 'teacher cannot reverse/refund');

assert(runAuthorize(previewRoles, 'owner').nextCalled, 'owner can preview salary');
assert(runAuthorize(previewRoles, 'branch_manager').nextCalled, 'branch_manager can preview salary');
assert(!runAuthorize(previewRoles, 'student').nextCalled, 'student cannot preview salary');

console.log('payment permissions matrix tests passed');
