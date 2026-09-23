/**
 * Detect writing direction from question/option text.
 * Arabic-script (Dari/Pashto/Arabic) → rtl; Latin (English) → ltr.
 */
export function detectTextDirection(text: string | null | undefined): 'rtl' | 'ltr' {
  const sample = String(text || '');
  let rtl = 0;
  let ltr = 0;

  for (const char of sample) {
    const code = char.codePointAt(0);
    if (code == null) continue;

    if (
      (code >= 0x0600 && code <= 0x06ff)
      || (code >= 0x0750 && code <= 0x077f)
      || (code >= 0x08a0 && code <= 0x08ff)
      || (code >= 0xfb50 && code <= 0xfdff)
      || (code >= 0xfe70 && code <= 0xfeff)
    ) {
      rtl += 1;
      continue;
    }

    if (
      (code >= 0x0041 && code <= 0x005a)
      || (code >= 0x0061 && code <= 0x007a)
      || (code >= 0x00c0 && code <= 0x024f)
    ) {
      ltr += 1;
    }
  }

  if (rtl === 0 && ltr === 0) return 'rtl';
  return rtl >= ltr ? 'rtl' : 'ltr';
}

export function buildExamPrintSerial(examId: string, examCode?: string | null, referenceCode?: string | null) {
  const stamp = new Date();
  const y = stamp.getFullYear();
  const m = String(stamp.getMonth() + 1).padStart(2, '0');
  const d = String(stamp.getDate()).padStart(2, '0');
  const code = String(examCode || referenceCode || examId || 'EXAM')
    .replace(/[^a-zA-Z0-9\-_/]/g, '')
    .slice(-10)
    .toUpperCase();
  return `EXM-${code}-${y}${m}${d}`;
}
