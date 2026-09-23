import { Payment } from '../models/Payment';

export function buildInvoiceNumber() {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  const entropy = `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  return `INV-${stamp}-${entropy}`;
}

export async function generateInvoiceNumber() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = buildInvoiceNumber();
    const exists = await Payment.findOne({ invoiceNumber: candidate }).select('_id').lean();
    if (!exists) return candidate;
  }
  throw new Error('Unable to generate invoice number');
}
