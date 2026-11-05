import { canonicalWholeVnd, isPositiveWholeVnd, normalizeWholeVnd } from './money';
import { codePointLength, isIsoDate, parseMonthInput } from './period';

export interface PlanningFieldErrors {
  period?: string;
  monthlyIncomeVnd?: string;
}

export interface ExpenseFieldErrors {
  expenseDate?: string;
  jarType?: string;
  amountVnd?: string;
  description?: string;
}

export function validatePlanning(period: string, income: string): PlanningFieldErrors {
  const errors: PlanningFieldErrors = {};
  if (!parseMonthInput(period)) {
    errors.period = 'Select a month for this plan.';
  }

  const amount = normalizeWholeVnd(income);
  if (amount.invalidSymbols || amount.digits === null || !isPositiveWholeVnd(amount.digits)) {
    errors.monthlyIncomeVnd = 'Income must be a positive whole-VND amount.';
  }

  return errors;
}

export function planningIncomeDigits(income: string): string | null {
  const amount = normalizeWholeVnd(income);
  if (amount.invalidSymbols || amount.digits === null || !isPositiveWholeVnd(amount.digits)) {
    return null;
  }

  return canonicalWholeVnd(amount.digits);
}

export function validateExpense(date: string, jarType: string, amount: string, description: string): ExpenseFieldErrors {
  const errors: ExpenseFieldErrors = {};
  if (!isIsoDate(date)) {
    errors.expenseDate = 'Enter a valid expense date.';
  }

  if (jarType.trim().length === 0) {
    errors.jarType = 'Please select a jar.';
  }

  const normalized = normalizeWholeVnd(amount);
  if (normalized.invalidSymbols || normalized.digits === null || !isPositiveWholeVnd(normalized.digits)) {
    errors.amountVnd = 'Amount must be greater than zero.';
  }

  const trimmed = description.trim();
  if (trimmed.length === 0) {
    errors.description = 'Description is required.';
  } else if (codePointLength(trimmed) > 500) {
    errors.description = 'Description must not exceed 500 characters.';
  }

  return errors;
}

export function expenseAmountDigits(amount: string): string | null {
  const normalized = normalizeWholeVnd(amount);
  if (normalized.invalidSymbols || normalized.digits === null || !isPositiveWholeVnd(normalized.digits)) {
    return null;
  }

  return canonicalWholeVnd(normalized.digits);
}

export function hasFieldErrors(errors: object): boolean {
  return Object.values(errors).some((value) => typeof value === 'string' && value.length > 0);
}
