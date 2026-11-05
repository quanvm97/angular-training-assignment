const DIGITS = /^\d+$/;

export interface NormalizedAmount {
  digits: string | null;
  invalidSymbols: boolean;
}

export function normalizeWholeVnd(value: string): NormalizedAmount {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { digits: null, invalidSymbols: false };
  }

  const withoutCommas = trimmed.replaceAll(',', '');
  if (DIGITS.test(withoutCommas)) {
    return { digits: withoutCommas, invalidSymbols: false };
  }

  return { digits: null, invalidSymbols: true };
}

const AMOUNT_EDIT_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End'
]);

export function rejectNonDigitAmountKey(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1 || AMOUNT_EDIT_KEYS.has(event.key)) {
    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
}

export function applyGroupedAmount(event: Event, write: (value: string) => void): void {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const raw = input.value;
  const selectionStart = input.selectionStart ?? raw.length;
  const next = formatAmountInputValue(raw, selectionStart);
  if (!next || next.value === raw) {
    return;
  }

  write(next.value);
  input.value = next.value;
  input.setSelectionRange(next.selection, next.selection);
  queueMicrotask(() => {
    if (input.value === next.value) {
      return;
    }

    write(next.value);
    input.value = next.value;
    input.setSelectionRange(next.selection, next.selection);
  });
}

export function formatAmountInputValue(raw: string, selectionStart: number): { value: string; selection: number } | null {
  const digits = raw.replaceAll(/\D/g, '');
  if (digits.length === 0) {
    return raw.length === 0 ? null : { value: '', selection: 0 };
  }

  const value = formatGroupedAmount(digits);
  return { value, selection: indexAfterDigits(value, digitsBeforeIndex(raw, selectionStart)) };
}

function digitsBeforeIndex(value: string, index: number): number {
  return value.slice(0, Math.max(0, index)).replaceAll(/\D/g, '').length;
}

function indexAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) {
    return 0;
  }

  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    const code = formatted.charCodeAt(index);
    if (code >= 48 && code <= 57) {
      seen += 1;
      if (seen === digitCount) {
        return index + 1;
      }
    }
  }

  return formatted.length;
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
