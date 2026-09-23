import Joi from 'joi';
import { AFGHAN_PHONE_REGEX, PERSON_NAME_REGEX } from '../utils/fieldValidation';

const afghanPhoneMessage = 'Phone must be a 10-digit Afghan mobile number starting with 070, 078, 079, 072, 077, or 074.';
const personNameMessage = 'Name must contain only letters and cannot include numbers.';

export function afghanPhoneField(required = false) {
  const schema = Joi.string()
    .trim()
    .pattern(AFGHAN_PHONE_REGEX)
    .messages({ 'string.pattern.base': afghanPhoneMessage });

  return required ? schema.required() : schema.allow('', null).optional();
}

export function personNameField(required = true) {
  const schema = Joi.string()
    .trim()
    .min(2)
    .max(120)
    .pattern(PERSON_NAME_REGEX)
    .messages({
      'string.pattern.base': personNameMessage,
      'string.min': personNameMessage
    });

  return required ? schema.required() : schema.optional();
}
