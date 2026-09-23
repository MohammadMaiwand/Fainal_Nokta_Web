import type { Request } from 'express';
import type { RoutePolicy } from '../config/systemMasterRules';
import { Payment } from '../models/Payment';
import { SalaryRecord } from '../models/SalaryRecord';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { normalizeRole } from '../utils/roleHelpers';
import { ClassModel } from '../models/Class';
import { Course } from '../models/Course';
import { Curriculum } from '../models/Curriculum';
import { Exam } from '../models/Exam';
import { Subject } from '../models/Subject';

const ELEVATED_ROLES = new Set(['super_admin', 'admin', 'owner', 'branch_manager', 'system_automation']);

function extractResourceId(req: Request) {
  const candidate =
    req.params.id
    || req.params.userId
    || req.query.userId
    || req.body?.userId
    || req.body?.studentId
    || req.body?.teacherId;

  return candidate ? String(candidate) : null;
}

export class OwnershipService {
  isElevatedRole(role?: string | null) {
    return ELEVATED_ROLES.has(normalizeRole(role) ?? '');
  }

  async getScopedStudentIds(req: Request, role: string) {
    if (!req.user?.userId) {
      return [] as string[];
    }

    if (role === 'student') {
      const user = await User.findById(req.user.userId).select('studentId').lean<Record<string, any>>();
      if (!user?.studentId) {
        return [];
      }
      const student = await Student.findOne({ studentId: user.studentId, isDeleted: false }).select('_id').lean<Record<string, any>>();
      return student ? [String(student._id)] : [];
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
      return students.map((student: any) => String(student._id));
    }

    return [];
  }

  async verifyPaymentOwnership(req: Request, paymentId: string) {
    const role = normalizeRole(req.user?.role) ?? req.user?.canonicalRole ?? '';
    const payment = await Payment.findById(paymentId).select('studentId branchId payeeUserId isDeleted').lean<any>();
    if (!payment || payment.isDeleted) {
      return false;
    }

    if (role === 'branch_manager' && req.user?.branchId) {
      if (payment.branchId && String(payment.branchId) !== String(req.user.branchId)) {
        return false;
      }
      return true;
    }

    if (['super_admin', 'admin', 'owner'].includes(role)) {
      return true;
    }

    if (role === 'student' || role === 'parent') {
      if (!payment.studentId) {
        return false;
      }
      const scopedStudentIds = await this.getScopedStudentIds(req, role);
      return scopedStudentIds.includes(String(payment.studentId));
    }

    if (role === 'teacher' && payment.payeeUserId) {
      return String(payment.payeeUserId) === String(req.user?.userId);
    }

    return false;
  }

  async verifySalaryRecordBranchAccess(req: Request, recordId: string) {
    const role = normalizeRole(req.user?.role) ?? req.user?.canonicalRole ?? '';
    if (!['branch_manager'].includes(role) || !req.user?.branchId) {
      return true;
    }

    const record = await SalaryRecord.findById(recordId).select('branchId isDeleted').lean<any>();
    if (!record || record.isDeleted) {
      return false;
    }

    if (!record.branchId) {
      return false;
    }

    return String(record.branchId) === String(req.user.branchId);
  }

  async verifyBranchScopedResource(req: Request, resourceId: string) {
    const role = normalizeRole(req.user?.role) ?? req.user?.canonicalRole ?? '';
    if (role !== 'branch_manager' || !req.user?.branchId) {
      return true;
    }

    const url = req.originalUrl;
    const userBranchId = String(req.user.branchId);
    const matchesBranch = (branchId: unknown) => Boolean(branchId) && String(branchId) === userBranchId;

    if (url.includes('/classes')) {
      const doc = await ClassModel.findById(resourceId).select('branchId isDeleted').lean<any>();
      return Boolean(doc && !doc.isDeleted && matchesBranch(doc.branchId));
    }
    if (url.includes('/courses')) {
      const doc = await Course.findById(resourceId).select('branchId isDeleted').lean<any>();
      return Boolean(doc && !doc.isDeleted && matchesBranch(doc.branchId));
    }
    if (url.includes('/curriculum')) {
      const doc = await Curriculum.findById(resourceId).select('branchId isDeleted').lean<any>();
      return Boolean(doc && !doc.isDeleted && matchesBranch(doc.branchId));
    }
    if (url.includes('/subjects')) {
      const doc = await Subject.findById(resourceId).select('branchId isDeleted').lean<any>();
      return Boolean(doc && !doc.isDeleted && matchesBranch(doc.branchId));
    }
    if (url.includes('/exams')) {
      const doc = await Exam.findById(resourceId).select('branchId isDeleted').lean<any>();
      return Boolean(doc && !doc.isDeleted && matchesBranch(doc.branchId));
    }

    return true;
  }

  async verifyAssignedStudentAccess(req: Request, studentId: string, role: string) {
    if (role === 'teacher') {
      const student = await Student.findOne({ _id: studentId, teacherId: req.user?.userId, isDeleted: false }).select('_id').lean();
      return Boolean(student);
    }

    if (role === 'student' || role === 'parent') {
      const scopedStudentIds = await this.getScopedStudentIds(req, role);
      return scopedStudentIds.includes(String(studentId));
    }

    return false;
  }

  async verifyAssignedTeacherAccess(req: Request, teacherId: string, role: string) {
    if (role === 'teacher') {
      return String(teacherId) === String(req.user?.userId);
    }

    if (role === 'student') {
      const user = await User.findById(req.user?.userId).select('studentId assignedTeacherId').lean<Record<string, any>>();
      const student = user?.studentId
        ? await Student.findOne({ studentId: user.studentId, isDeleted: false }).select('teacherId').lean<Record<string, any>>()
        : null;
      const candidates = [student?.teacherId, user?.assignedTeacherId]
        .filter(Boolean)
        .map((id) => String(id));
      return candidates.includes(String(teacherId));
    }

    if (role === 'parent') {
      const user = await User.findById(req.user?.userId).select('familyId parentProfileId').lean<Record<string, any>>();
      const filter: Record<string, unknown> = { isDeleted: false };
      if (user?.familyId) {
        filter.familyId = user.familyId;
      } else if (user?.parentProfileId) {
        filter.parentProfileId = user.parentProfileId;
      } else {
        return false;
      }

      const students = await Student.find(filter).select('teacherId').lean();
      return students.some((student: any) => String(student.teacherId ?? '') === String(teacherId));
    }

    return false;
  }

  async verifyRouteOwnership(req: Request, policy: RoutePolicy) {
    if (!policy.ownership || !req.user?.userId) {
      return true;
    }

    const role = normalizeRole(req.user.role) ?? req.user.canonicalRole ?? '';
    const resourceId = extractResourceId(req);

    if (policy.ownership === 'governance') {
      return this.isElevatedRole(role);
    }

    if (this.isElevatedRole(role)) {
      if (role === 'branch_manager' && resourceId) {
        if (req.originalUrl.includes('/payments')) {
          return this.verifyPaymentOwnership(req, resourceId);
        }
        if (req.originalUrl.includes('/payroll/records')) {
          return this.verifySalaryRecordBranchAccess(req, resourceId);
        }
        if (policy.ownership === 'assigned_or_branch') {
          return this.verifyBranchScopedResource(req, resourceId);
        }
      }
      return true;
    }

    if (policy.ownership === 'self') {
      return !resourceId || resourceId === String(req.user.userId);
    }

    if (policy.ownership === 'branch_or_self') {
      if (!resourceId) {
        return true;
      }
      if (req.originalUrl.includes('/payments')) {
        return this.verifyPaymentOwnership(req, resourceId);
      }
      return !resourceId || resourceId === String(req.user.userId);
    }

    if (policy.ownership === 'assigned_or_self') {
      if (!resourceId) {
        return true;
      }
      if (role === 'student' || role === 'parent') {
        const scopedStudentIds = await this.getScopedStudentIds(req, role);
        if (req.originalUrl.includes('/students')) {
          return scopedStudentIds.includes(resourceId);
        }
        if (req.originalUrl.includes('/teachers')) {
          return this.verifyAssignedTeacherAccess(req, resourceId, role);
        }
        if (req.originalUrl.includes('/payments')) {
          return this.verifyPaymentOwnership(req, resourceId);
        }
      }
      if (role === 'teacher') {
        if (req.originalUrl.includes('/students')) {
          return this.verifyAssignedStudentAccess(req, resourceId, role);
        }
        if (req.originalUrl.includes('/teachers')) {
          return this.verifyAssignedTeacherAccess(req, resourceId, role);
        }
        return resourceId === String(req.user.userId);
      }
      return resourceId === String(req.user.userId);
    }

    if (policy.ownership === 'assigned_or_branch') {
      if (!resourceId) {
        return true;
      }
      if (role === 'branch_manager') {
        return this.verifyBranchScopedResource(req, resourceId);
      }
      if (role === 'student' || role === 'parent') {
        if (req.originalUrl.includes('/students')) {
          return (await this.getScopedStudentIds(req, role)).includes(resourceId);
        }
        if (req.originalUrl.includes('/teachers')) {
          return this.verifyAssignedTeacherAccess(req, resourceId, role);
        }
        if (req.originalUrl.includes('/payments')) {
          return this.verifyPaymentOwnership(req, resourceId);
        }
      }
      if (role === 'teacher') {
        if (req.originalUrl.includes('/students')) {
          return this.verifyAssignedStudentAccess(req, resourceId, role);
        }
        if (req.originalUrl.includes('/teachers')) {
          return this.verifyAssignedTeacherAccess(req, resourceId, role);
        }
        return resourceId === String(req.user.userId);
      }
      return false;
    }

    return true;
  }
}

export const ownershipService = new OwnershipService();
