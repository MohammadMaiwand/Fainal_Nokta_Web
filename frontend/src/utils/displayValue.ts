export function displayText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return displayText(
      item.studentDisplay && typeof item.studentDisplay === 'object'
        ? (item.studentDisplay as Record<string, unknown>).fullName
        : ''
    ) || displayText(item.name)
      || displayText(item.fullName)
      || displayText(item.className)
      || displayText(item.title)
      || displayText(item.code)
      || displayText(item.email)
      || displayText(item.phone)
      || displayText(item.guardianPhone)
      || displayText(item.studentId)
      || displayText(item.rollNo);
  }
  return '';
}

export function valueOrFallback(value: unknown, fallback: string) {
  return displayText(value) || fallback;
}
