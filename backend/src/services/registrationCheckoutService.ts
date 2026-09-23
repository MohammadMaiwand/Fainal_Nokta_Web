import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { calculateEnrollmentFee } from '../utils/feeCalculator';

export type RegistrationCheckoutPayload = {
  email: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  classFee: number;
  subjectFee: number;
  totalFee: number;
  currency: 'AFN';
  paymentReference?: string;
};

const CHECKOUT_PURPOSE = 'student_registration_checkout';

export function createRegistrationCheckoutToken(payload: RegistrationCheckoutPayload) {
  return jwt.sign(
    {
      purpose: CHECKOUT_PURPOSE,
      ...payload
    },
    config.jwtSecret,
    { expiresIn: '45m' }
  );
}

export function verifyRegistrationCheckoutToken(token: string, expected: {
  email: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  totalFee: number;
  paymentReference?: string;
}) {
  const decoded = jwt.verify(token, config.jwtSecret) as RegistrationCheckoutPayload & { purpose?: string };
  if (decoded.purpose !== CHECKOUT_PURPOSE) {
    throw new Error('Invalid registration checkout token');
  }

  if (decoded.email !== expected.email.toLowerCase()) {
    throw new Error('Registration checkout token does not match email');
  }
  if (decoded.classId !== expected.classId || decoded.subjectId !== expected.subjectId || decoded.teacherId !== expected.teacherId) {
    throw new Error('Registration checkout token does not match selected class');
  }
  if (Number(decoded.totalFee) !== Number(expected.totalFee)) {
    throw new Error('Registration checkout token does not match server fee');
  }

  if (expected.paymentReference && decoded.paymentReference) {
    if (String(decoded.paymentReference).trim() !== String(expected.paymentReference).trim()) {
      throw new Error('Registration checkout token does not match payment reference');
    }
  }

  return decoded;
}

export function bindPaymentReferenceToCheckoutToken(token: string, paymentReference: string) {
  const decoded = jwt.verify(token, config.jwtSecret) as RegistrationCheckoutPayload & { purpose?: string };
  if (decoded.purpose !== CHECKOUT_PURPOSE) {
    throw new Error('Invalid registration checkout token');
  }

  return jwt.sign(
    {
      purpose: CHECKOUT_PURPOSE,
      ...decoded,
      paymentReference: String(paymentReference).trim()
    },
    config.jwtSecret,
    { expiresIn: '45m' }
  );
}

export function buildFeeBreakdown(klass: any, subject: any) {
  return calculateEnrollmentFee(klass?.feeAmount, subject?.feeAmount);
}
