import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { ContractError, fieldMessage, isApiError, toApiFailure } from './api-failure';
import { parseCreateExpenseResponse, parseDefaultJars, parseMonthlyPlan, parseSpendingByJars } from './budget-contract';
import { expenseAmountDigits, planningIncomeDigits, validateExpense, validatePlanning } from './form-rules';
import { allocationDonut, isOverBudget, jarClass, progressWidth } from './jar-presentation';
import {
  canonicalWholeVnd,
  formatAmountInputValue,
  formatGroupedAmount,
  formatPercent,
  formatVnd,
  isOverBudgetAmount,
  normalizeWholeVnd,
  subtractWholeVnd,
  sumWholeVnd,
  wholeVndShareLabel
} from './money';
import { greetingForHour, isIsoDate, monthName, parseMonthInput, parseRoutePeriod, periodLabel } from './period';
import { defaultJarsFixture, planFixture, spendingFixture } from '../testing/budget-fixtures';

describe('money formatting', () => {
  it('normalizes grouped whole-VND amounts and rejects other symbols', () => {
    expect(normalizeWholeVnd(' 30,000,000 ')).toEqual({ digits: '30000000', invalidSymbols: false });
    expect(normalizeWholeVnd('3,0000')).toEqual({ digits: '30000', invalidSymbols: false });
    expect(normalizeWholeVnd('')).toEqual({ digits: null, invalidSymbols: false });
    expect(normalizeWholeVnd('30.000').invalidSymbols).toBe(true);
    expect(formatAmountInputValue('30000', 5)).toEqual({ value: '30,000', selection: 6 });
    expect(formatAmountInputValue('3,0000', 6)).toEqual({ value: '30,000', selection: 6 });
    expect(formatAmountInputValue('12a', 3)).toEqual({ value: '12', selection: 2 });
    expect(formatAmountInputValue('30.000', 6)).toEqual({ value: '30,000', selection: 6 });
    expect(formatAmountInputValue('abc', 3)).toEqual({ value: '', selection: 0 });
    expect(canonicalWholeVnd('00010')).toBe('10');
    expect(canonicalWholeVnd('000')).toBe('0');
    expect(planningIncomeDigits('10,000')).toBe('10000');
    expect(planningIncomeDigits('0')).toBeNull();
    expect(expenseAmountDigits('12a')).toBeNull();
  });

  it('formats display amounts without using the wire value as a number', () => {
    expect(formatGroupedAmount('10000')).toBe('10,000');
    expect(formatGroupedAmount('-2500')).toBe('-2,500');
    expect(formatVnd('0')).toBe('0 VND');
    expect(formatPercent(102.86)).toBe('102.86%');
    expect(formatPercent(64)).toBe('64%');
    expect(formatPercent(Number.NaN)).toBe('');
    expect(isOverBudgetAmount('-1')).toBe(true);
    expect(isOverBudgetAmount('0')).toBe(false);
  });

  it('adds and subtracts digit strings exactly', () => {
    expect(sumWholeVnd(['3500', '0', '20'])).toBe('3520');
    expect(sumWholeVnd(['12a'])).toBeNull();
    expect(subtractWholeVnd('10000', '4000')).toBe('6000');
    expect(subtractWholeVnd('1000', '2500')).toBe('-1500');
    expect(subtractWholeVnd('10', 'x')).toBeNull();
    expect(wholeVndShareLabel('0', '10000')).toBe('0.0% of income');
    expect(wholeVndShareLabel('2500', '10000')).toBe('25.0% of income');
    expect(wholeVndShareLabel('1', '0')).toBeNull();
  });
});

describe('budget contract', () => {
  it('accepts the seven-jar responses', () => {
    expect(parseDefaultJars(defaultJarsFixture)?.jars).toHaveLength(7);
    expect(parseMonthlyPlan(planFixture)?.monthlyIncomeVnd).toBe('10000');
    expect(parseSpendingByJars(spendingFixture)?.jars[0].percentageUsed).toBe(102.86);
    expect(
      parseCreateExpenseResponse({
        expense: {
          id: 3,
          expenseDate: '2026-11-02',
          jarType: 'food',
          jarName: 'Food',
          amountVnd: '1500',
          description: 'Market',
          createdAtUtc: '2026-11-02T00:00:00Z'
        },
        jarSummary: {
          jarType: 'food',
          jarName: 'Food',
          percentage: 20,
          budgetVnd: '2000',
          spentVnd: '3500',
          remainingVnd: '-1500'
        }
      })?.jarSummary.remainingVnd
    ).toBe('-1500');
  });

  it('rejects malformed contracts', () => {
    expect(parseDefaultJars({ currency: 'USD' })).toBeNull();
    expect(parseDefaultJars({ ...defaultJarsFixture, jars: defaultJarsFixture.jars.slice(0, 6) })).toBeNull();
    expect(parseMonthlyPlan({ ...planFixture, monthlyIncomeVnd: '10.5' })).toBeNull();
    expect(parseMonthlyPlan(null)).toBeNull();
    expect(parseSpendingByJars({ ...spendingFixture, jars: [] })).toBeNull();
    expect(parseSpendingByJars({ ...spendingFixture, currency: 'USD' })).toBeNull();
    expect(parseCreateExpenseResponse({ expense: {}, jarSummary: {} })).toBeNull();
    expect(parseCreateExpenseResponse(null)).toBeNull();
  });
});

describe('api failures', () => {
  it('maps status codes and preserves field messages', () => {
    const conflict = toApiFailure(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'MONTHLY_PLAN_ALREADY_EXISTS', message: 'A monthly plan already exists for this month.', errors: [] }
      })
    );
    expect(conflict.kind).toBe('conflict');

    const validation = toApiFailure(
      new HttpErrorResponse({
        status: 400,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'One or more fields are invalid.',
          errors: [{ field: 'amountVnd', code: 'MUST_BE_POSITIVE', message: 'Expense amount must be greater than zero.' }]
        }
      })
    );
    expect(fieldMessage(validation, 'amountVnd')).toContain('greater than zero');
    expect(isApiError(validation.error)).toBe(true);

    expect(toApiFailure(new HttpErrorResponse({ status: 0 })).kind).toBe('network');
    expect(
      toApiFailure(new HttpErrorResponse({ status: 404, error: { code: 'MONTHLY_PLAN_NOT_FOUND', message: 'Missing', errors: [] } })).kind
    ).toBe('not-found');
    expect(
      toApiFailure(
        new HttpErrorResponse({ status: 400, error: { code: 'JAR_NOT_IN_MONTHLY_PLAN', message: 'Missing jar', errors: [] } })
      ).kind
    ).toBe('jar-not-in-plan');
    expect(toApiFailure(new HttpErrorResponse({ status: 500, error: { code: 'INTERNAL_ERROR', message: 'Boom', errors: [] } })).message).not.toContain(
      'Boom'
    );
    expect(toApiFailure(new ContractError()).kind).toBe('invalid-data');
    expect(toApiFailure(new Error('x')).kind).toBe('server');
    expect(isApiError({ code: 'X' })).toBe(false);
  });
});

describe('form and period rules', () => {
  it('validates planning and expense input', () => {
    expect(validatePlanning('', '')).toEqual({
      period: 'Select a month for this plan.',
      monthlyIncomeVnd: 'Income must be a positive whole-VND amount.'
    });
    expect(validatePlanning('2026-11', '10,000')).toEqual({});
    expect(validateExpense('2026-02-31', '', '0', '   ').expenseDate).toBeTruthy();
    expect(validateExpense('2026-11-02', 'food', '1,500', 'Market')).toEqual({});
    expect(validateExpense('2026-11-02', 'food', '1500', 'x'.repeat(501)).description).toContain('500');
  });

  it('parses months and labels them', () => {
    expect(parseMonthInput('2026-11')).toEqual({ year: 2026, month: 11 });
    expect(parseMonthInput('2026-13')).toBeNull();
    expect(parseRoutePeriod('2026', '11')).toEqual({ year: 2026, month: 11 });
    expect(parseRoutePeriod('nope', '1')).toBeNull();
    expect(parseRoutePeriod('0', '1')).toBeNull();
    expect(isIsoDate('2026-11-02')).toBe(true);
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(periodLabel({ year: 2026, month: 11 })).toBe('November 2026');
    expect(monthName(13)).toBe('');
    expect(greetingForHour(8)).toBe('Good morning');
    expect(greetingForHour(13)).toBe('Good afternoon');
    expect(greetingForHour(20)).toBe('Good evening');
  });

  it('builds jar presentation from percentages only', () => {
    expect(jarClass('food')).toBe('food');
    expect(allocationDonut(planFixture.jars)).toContain('35%');
    expect(progressWidth(102.86)).toBe(100);
    expect(progressWidth(0)).toBe(0);
    expect(progressWidth(Number.NaN)).toBe(0);
    expect(isOverBudget(102.86)).toBe(true);
    expect(isOverBudget(100)).toBe(false);
  });
});
