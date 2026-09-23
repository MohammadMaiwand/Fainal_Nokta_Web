import { ClassModel } from '../models/Class';
import { Subject } from '../models/Subject';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { Family } from '../models/Family';
import { Enrollment } from '../models/Enrollment';
import { Payment } from '../models/Payment';
import { teacherCompensationService } from './teacherCompensationService';
import { Notification } from '../models/Notification';
import { hashPassword } from '../utils/password';
import { BusinessRuleService } from './businessRuleService';
import {
  bindPaymentReferenceToCheckoutToken,
  buildFeeBreakdown,
  createRegistrationCheckoutToken,
  verifyRegistrationCheckoutToken
} from './registrationCheckoutService';
import { paymentProviderService } from './paymentProviderService';
import { sanitizePlainText } from '../utils/inputSecurity';
import { subjectBelongsToClass, teacherCanTeachClassSubject } from './timetableValidationService';
import { generateInvoiceNumber } from '../utils/paymentInvoice';

const businessRuleService = new BusinessRuleService();

function generateStudentId() {
  return `S${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

async function generateStudentRollNo() {
  const count = await Student.countDocuments();
  return `STD-${count + 1}`;
}

export class PublicRegistrationService {
  async quote(input: { classId: string; subjectId: string; teacherId: string }) {
    const [klass, subject, teacher] = await Promise.all([
      ClassModel.findOne({ _id: input.classId, active: true, isDeleted: false, registrationOpen: { $ne: false } }).lean<any>(),
      Subject.findOne({ _id: input.subjectId, activeStatus: true, isDeleted: false }).lean<any>(),
      User.findOne({ _id: input.teacherId, role: 'teacher', isDeleted: false }).lean<any>()
    ]);

    if (!klass) throw new Error('Selected class is not open for registration');
    if (!subject) throw new Error('Selected subject is not available');
    if (!teacher) throw new Error('Selected teacher is not available');
    if (!subjectBelongsToClass(subject, klass)) {
      throw new Error('Selected subject does not belong to the chosen class');
    }
    if (!teacherCanTeachClassSubject(teacher, klass, subject)) {
      throw new Error('Selected teacher is not assigned to the chosen class and subject');
    }

    const pricing = buildFeeBreakdown(klass, subject);
    return {
      className: klass.className ?? klass.name,
      subjectName: subject.title,
      teacherName: teacher.name,
      pricing
    };
  }

  async createCheckout(input: {
    email: string;
    classId: string;
    subjectId: string;
    teacherId: string;
  }) {
    const pricing = (await this.quote(input)).pricing;
    const checkoutToken = createRegistrationCheckoutToken({
      email: input.email.toLowerCase(),
      classId: input.classId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      ...pricing
    });

    const paymentConfig = paymentProviderService.getStatus();
    return {
      checkoutToken,
      pricing,
      paymentRequired: pricing.totalFee > 0,
      paymentProvider: paymentConfig.provider,
      paymentMode: paymentConfig.mode,
      liveReady: paymentConfig.liveReady
    };
  }

  async confirmCheckoutPayment(input: {
    checkoutToken: string;
    paymentReference: string;
    paymentMethod?: string;
    email: string;
    classId: string;
    subjectId: string;
    teacherId: string;
  }) {
    const selection = await this.quote({
      classId: input.classId,
      subjectId: input.subjectId,
      teacherId: input.teacherId
    });
    const fee = selection.pricing;

    verifyRegistrationCheckoutToken(input.checkoutToken, {
      email: input.email.toLowerCase(),
      classId: input.classId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      totalFee: fee.totalFee
    });

    const verification = await paymentProviderService.verifyRegistrationPayment({
      paymentReference: input.paymentReference,
      paymentMethod: input.paymentMethod,
      amount: fee.totalFee,
      currency: 'AFN',
      email: input.email.toLowerCase(),
      checkoutToken: input.checkoutToken
    });

    if (!verification.verified) {
      throw new Error(verification.message || 'Payment could not be verified');
    }

    const boundToken = bindPaymentReferenceToCheckoutToken(input.checkoutToken, input.paymentReference);
    return {
      checkoutToken: boundToken,
      verification,
      pricing: fee
    };
  }

  async registerStudent(input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsapp?: string;
    password: string;
    gender: 'male' | 'female' | 'other';
    classId: string;
    subjectId: string;
    teacherId: string;
    profileImage?: string;
    checkoutToken?: string;
    paymentReference?: string;
    paymentMethod?: string;
  }) {
    const email = input.email.toLowerCase();
    const [existingEmail, klass, subject, teacher] = await Promise.all([
      User.findOne({ email, isDeleted: false }).lean(),
      ClassModel.findOne({ _id: input.classId, active: true, isDeleted: false, registrationOpen: { $ne: false } }).lean<any>(),
      Subject.findOne({ _id: input.subjectId, activeStatus: true, isDeleted: false }).lean<any>(),
      User.findOne({ _id: input.teacherId, role: 'teacher', isDeleted: false }).lean<any>()
    ]);

    if (existingEmail) throw new Error('Email already exists');
    if (!klass) throw new Error('Selected class does not exist');
    if (!subject) throw new Error('Selected subject does not exist');
    if (!teacher) throw new Error('Selected teacher does not exist');
    if (!subjectBelongsToClass(subject, klass)) {
      throw new Error('Selected subject does not belong to the chosen class');
    }
    if (!teacherCanTeachClassSubject(teacher, klass, subject)) {
      throw new Error('Selected teacher is not assigned to the chosen class and subject');
    }

    await businessRuleService.assertStudentGenderMatchesClass(input.gender, input.classId);
    await businessRuleService.assertTeacherGenderMatchesClass(input.teacherId, input.classId);

    const pricing = buildFeeBreakdown(klass, subject);
    if (pricing.totalFee > 0) {
      if (!input.checkoutToken) {
        throw new Error('Payment confirmation is required before account activation');
      }
      const paymentReference = sanitizePlainText(input.paymentReference, 120);
      if (!paymentReference) {
        throw new Error('Payment reference is required');
      }

      verifyRegistrationCheckoutToken(input.checkoutToken, {
        email,
        classId: input.classId,
        subjectId: input.subjectId,
        teacherId: input.teacherId,
        totalFee: pricing.totalFee,
        paymentReference
      });

      const verification = await paymentProviderService.verifyRegistrationPayment({
        paymentReference,
        paymentMethod: input.paymentMethod,
        amount: pricing.totalFee,
        currency: 'AFN',
        email,
        checkoutToken: input.checkoutToken
      });

      if (!verification.verified) {
        throw new Error(verification.message || 'Payment could not be verified');
      }
    }

    const family = await Family.create({
      guardianName: `${input.firstName} ${input.lastName}`.trim(),
      guardianEmail: email,
      guardianPhone: input.phone,
      students: []
    });

    const studentId = generateStudentId();
    const paidAmount = pricing.totalFee > 0 ? pricing.totalFee : 0;
    const student = await Student.create({
      rollNo: await generateStudentRollNo(),
      studentId,
      branchId: klass.branchId ?? subject.branchId ?? teacher.branchId ?? null,
      firstName: sanitizePlainText(input.firstName, 80),
      lastName: sanitizePlainText(input.lastName, 80),
      fatherName: `${input.firstName} ${input.lastName}`.trim(),
      familyPhone: input.phone,
      familyEmail: email,
      gender: input.gender,
      classId: input.classId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      profileImage: sanitizePlainText(input.profileImage, 500),
      feeAmount: pricing.totalFee,
      paidAmount,
      remainingBalance: Math.max(0, pricing.totalFee - paidAmount),
      accountStatus: pricing.totalFee > 0 ? 'active' : 'active',
      familyId: family._id
    });

    family.students = [student._id];
    await family.save();

    const user = await User.create({
      name: `${input.firstName} ${input.lastName}`.trim(),
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: input.phone,
      whatsapp: input.whatsapp || input.phone,
      password: await hashPassword(input.password),
      role: 'student',
      studentId,
      profileImage: sanitizePlainText(input.profileImage, 500),
      classId: input.classId,
      subjectId: input.subjectId,
      assignedTeacherId: input.teacherId,
      branchId: klass.branchId ?? subject.branchId ?? teacher.branchId ?? null,
      familyId: family._id,
      feeAmount: pricing.totalFee,
      paidAmount,
      remainingBalance: Math.max(0, pricing.totalFee - paidAmount),
      fatherName: `${input.firstName} ${input.lastName}`.trim(),
      gender: input.gender,
      mustChangePassword: false,
      status: 'active',
      active: true
    });

    const registrationDate = new Date();
    const enrollment = await Enrollment.create({
      studentId: student._id,
      classId: input.classId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      branchId: klass.branchId ?? null,
      academicYear: `${registrationDate.getFullYear()}`,
      status: 'active',
      enrolledAt: registrationDate
    });

    if (paidAmount > 0) {
      const registrationPayment = await Payment.create({
        paymentFor: 'student_fee',
        studentId: student._id,
        branchId: klass.branchId ?? null,
        enrollmentId: enrollment._id,
        classId: klass._id,
        subjectId: subject._id,
        teacherId: input.teacherId,
        amount: paidAmount,
        grossAmount: paidAmount,
        netAmount: paidAmount,
        status: 'completed',
        currency: 'AFN',
        method: (input.paymentMethod as any) || 'mobile_money',
        invoiceNumber: await generateInvoiceNumber(),
        referenceNumber: sanitizePlainText(input.paymentReference, 120),
        idempotencyKey: `public-reg-${String(student._id)}-${paidAmount}`,
        notes: 'Public online registration payment',
        collectedBy: null,
        paymentDate: registrationDate
      });

      await teacherCompensationService.recordPaymentCommission({
        payment: registrationPayment,
        student,
        teacher,
        createdBy: null
      });

      await User.findByIdAndUpdate(input.teacherId, {
        $inc: { totalStudents: 1 }
      });
    }

    await Notification.create({
      title: 'Student registration completed',
      description: `${user.name} registered for ${klass.className ?? klass.name}`,
      message: `${user.name} completed online registration.`,
      recipientRoles: ['super_admin', 'admin', 'branch_manager'],
      publishDate: new Date(),
      active: true
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId,
      pricing
    };
  }
}
