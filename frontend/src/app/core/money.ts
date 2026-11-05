const DIGITS = /^\d+$/;
const GROUPED_DIGITS = /^\d{1,3}(,\d{3})*$/;

export interface NormalizedAmount {
  digits: string | null;
  invalidSymbols: boolean;
}

export function normalizeWholeVnd(value: string): NormalizedAmount {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { digits: null, invalidSymbols: false };
  }

  if (DIGITS.test(trimmed) || GROUPED_DIGITS.test(trimmed)) {
    return { digits: trimmed.replaceAll(',', ''), invalidSymbols: false };
  }

  return { digits: null, invalidSymbols: true };
}

export function canonicalWholeVnd(digits: string): string {
  const stripped = digits.replace(/^0+/, '');
  return stripped.length === 0 ? '0' : stripped;
}

export function isPositiveWholeVnd(digits: string): boolean {
  return DIGITS.test(digits) && canonicalWholeVnd(digits) !== '0';
}

export function isWholeVnd(value: string, allowNegative = false): boolean {
  return allowNegative ? /^-?\d+$/.test(value) : DIGITS.test(value);
}

export function formatGroupedAmount(value: string): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  if (!DIGITS.test(digits)) {
    return value;
  }

  const grouped = canonicalWholeVnd(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}`;
}

export function formatVnd(value: string): string {
  return `${formatGroupedAmount(value)} VND`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }

  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  const text = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(rounded);
  return `${text}%`;
}

export function sumWholeVnd(values: readonly string[]): string | null {
  if (values.some((value) => !DIGITS.test(value))) {
    return null;
  }

  return values.reduce((total, value) => total + BigInt(value), 0n).toString();
}

export function subtractWholeVnd(minuend: string, subtrahend: string): string | null {
  if (!DIGITS.test(minuend) || !DIGITS.test(subtrahend)) {
    return null;
  }

  return (BigInt(minuend) - BigInt(subtrahend)).toString();
}

export function wholeVndShareLabel(part: string, whole: string): string | null {
  if (!DIGITS.test(part) || !isPositiveWholeVnd(whole)) {
    return null;
  }

  const tenths = (BigInt(part) * 1000n) / BigInt(canonicalWholeVnd(whole));
  const units = tenths / 10n;
  const fraction = tenths % 10n;
  return `${units.toString()}.${fraction.toString()}% of income`;
}

export function isOverBudgetAmount(value: string): boolean {
  return value.startsWith('-') && value !== '-0';
}
