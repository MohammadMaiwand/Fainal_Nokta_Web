import { isValidJalaliDateInput } from './jalaliDateInput';

export const AFGHAN_MOBILE_PREFIXES = ['070', '078', '079', '072', '077', '074'] as const;

export const AFGHAN_PHONE_REGEX = /^(070|078|079|072|077|074)\d{7}$/;

export const PERSON_NAME_REGEX = /^[\p{L}\s'.-]+$/u;

const PERSON_NAME_FIELDS = new Set([
  'firstName',
  'lastName',
  'fatherName',
  'name',
  'guardianName'
]);

const EXCLUDED_NAME_FIELDS = new Set([
  'className',
  'subjectName',
  'teacherName',
  'branchName',
  'userName',
  'loginEmail'
]);

const DATE_FIELD_NAMES = /date$/i;

export function digitsOnly(value?: string | null): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function sanitizeAfghanPhoneInput(value?: string | null): string {
  let digits = digitsOnly(value).slice(0, 10);
  if (!digits) return '';

  if (digits[0] !== '0') return '';
  if (digits.length >= 2 && digits[1] !== '7') return digits.slice(0, 1);
  if (digits.length >= 3 && !['0', '2', '4', '7', '8', '9'].includes(digits[2])) {
    return digits.slice(0, 2);
  }

  return digits;
}

export function isValidAfghanPhone(value?: string | null): boolean {
  return AFGHAN_PHONE_REGEX.test(sanitizeAfghanPhoneInput(value));
}

export function sanitizePersonNameInput(value?: string | null): string {
  return String(value ?? '')
    .replace(/[0-9]/g, '')
    .replace(/[^\p{L}\s'.-]/gu, '')
    .replace(/\s{2,}/g, ' ');
}

export function isValidPersonName(value?: string | null): boolean {
  const raw = String(value ?? '').trim();
  if (/\d/.test(raw)) return false;
  const text = sanitizePersonNameInput(raw).trim();
  if (text.length < 2) return false;
  return PERSON_NAME_REGEX.test(text);
}

export function isPhoneLikeFieldName(fieldName?: string): boolean {
  if (!fieldName) return false;
  return /phone|whatsapp|mobile|tel/i.test(fieldName);
}

export function isPersonNameFieldName(fieldName?: string): boolean {
  if (!fieldName || EXCLUDED_NAME_FIELDS.has(fieldName)) return false;
  if (PERSON_NAME_FIELDS.has(fieldName)) return true;
  return fieldName.endsWith('Name') && !EXCLUDED_NAME_FIELDS.has(fieldName);
}

export function isJalaliDateFieldName(fieldName?: string, fieldType?: string): boolean {
  return fieldType === 'date' || Boolean(fieldName && DATE_FIELD_NAMES.test(fieldName));
}

export function validateFieldValue(params: {
  fieldName: string;
  fieldType?: string;
  value: unknown;
  required?: boolean;
  messages: {
    required: string;
    invalidPhone: string;
    invalidName: string;
    invalidDate: string;
  };
}): string | null {
  const { fieldName, fieldType, value, required, messages } = params;

  if (Array.isArray(value)) {
    const items = value.map((item) => String(item ?? '').trim()).filter(Boolean);
    if (required && items.length === 0) {
      return messages.required;
    }
    if (fieldType === 'subjectList' && required && items.length === 0) {
      return messages.required;
    }
    return null;
  }

  const text = String(value ?? '').trim();

  if (required && !text) {
    return messages.required;
  }

  if (!text) {
    return null;
  }

  if (isPhoneLikeFieldName(fieldName) && !isValidAfghanPhone(text)) {
    return messages.invalidPhone;
  }

  if (isPersonNameFieldName(fieldName) && !isValidPersonName(text)) {
    return messages.invalidName;
  }

  if (isJalaliDateFieldName(fieldName, fieldType) && !isValidJalaliDateInput(text)) {
    return messages.invalidDate;
  }

  return null;
}
