export interface YearMonth {
  year: number;
  month: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function yearMonthFromIso(value: string): YearMonth | null {
  if (!isIsoDate(value)) {
    return null;
  }

  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
}

export function parseMonthInput(value: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1 || year > 9999 || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export function toMonthInput(period: YearMonth): string {
  return `${period.year.toString().padStart(4, '0')}-${period.month.toString().padStart(2, '0')}`;
}

export function parseRoutePeriod(yearValue: string | null, monthValue: string | null): YearMonth | null {
  if (!yearValue || !monthValue || !/^\d+$/.test(yearValue) || !/^\d+$/.test(monthValue)) {
    return null;
  }

  const year = Number(yearValue);
  const month = Number(monthValue);
  if (!Number.isInteger(year) || !Number.isInteger(month) || year < 1 || year > 9999 || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

export function periodLabel(period: YearMonth): string {
  return `${monthName(period.month)} ${period.year}`;
}

export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentPeriod(date: Date): YearMonth {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function firstOfMonth(period: YearMonth): string {
  return `${toMonthInput(period)}-01`;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

export function longDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

export function codePointLength(value: string): number {
  return [...value].length;
}
