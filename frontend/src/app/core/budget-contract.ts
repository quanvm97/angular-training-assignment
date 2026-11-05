import {
  CreateExpenseResponse,
  DefaultJar,
  DefaultJarsResponse,
  JarType,
  JAR_TYPES,
  MonthlyPlanJar,
  MonthlyPlanResponse,
  SpendingByJar,
  SpendingByJarsResponse
} from './budget.models';
import { isWholeVnd } from './money';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isJarType(value: unknown): value is JarType {
  return typeof value === 'string' && (JAR_TYPES as readonly string[]).includes(value);
}

function isIntegerPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
}

function hasSevenUniqueJars<T extends { jarType: JarType }>(jars: T[]): boolean {
  return jars.length === JAR_TYPES.length && new Set(jars.map((jar) => jar.jarType)).size === JAR_TYPES.length;
}

function percentagesTotal100(jars: readonly { percentage: number }[]): boolean {
  return jars.reduce((total, jar) => total + jar.percentage, 0) === 100;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function readJarList(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    return null;
  }

  return value;
}

export function parseDefaultJars(value: unknown): DefaultJarsResponse | null {
  if (!isRecord(value) || value['currency'] !== 'VND' || value['totalPercentage'] !== 100) {
    return null;
  }

  const rawJars = readJarList(value['jars']);
  if (!rawJars) {
    return null;
  }

  const jars: DefaultJar[] = [];
  for (const jar of rawJars) {
    const jarType = jar['jarType'];
    const name = readString(jar, 'name');
    const suggestedLogic = readString(jar, 'suggestedLogic');
    if (!isJarType(jarType) || !name || suggestedLogic === null || !isIntegerPercent(jar['percentage'])) {
      return null;
    }

    jars.push({ jarType, name, percentage: jar['percentage'], suggestedLogic });
  }

  if (!hasSevenUniqueJars(jars) || !percentagesTotal100(jars)) {
    return null;
  }

  return { currency: 'VND', totalPercentage: 100, jars };
}

export function parseMonthlyPlan(value: unknown): MonthlyPlanResponse | null {
  if (!isRecord(value) || value['currency'] !== 'VND') {
    return null;
  }

  const id = value['id'];
  const year = value['year'];
  const month = value['month'];
  const monthlyIncomeVnd = readString(value, 'monthlyIncomeVnd');
  const createdAtUtc = readString(value, 'createdAtUtc');
  const rawJars = readJarList(value['jars']);
  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    typeof year !== 'number' ||
    !Number.isInteger(year) ||
    typeof month !== 'number' ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !monthlyIncomeVnd ||
    !isWholeVnd(monthlyIncomeVnd) ||
    !createdAtUtc ||
    !rawJars
  ) {
    return null;
  }

  const jars: MonthlyPlanJar[] = [];
  for (const jar of rawJars) {
    const jarType = jar['jarType'];
    const name = readString(jar, 'name');
    const budgetVnd = readString(jar, 'budgetVnd');
    if (!isJarType(jarType) || !name || !budgetVnd || !isWholeVnd(budgetVnd) || !isIntegerPercent(jar['percentage'])) {
      return null;
    }

    jars.push({ jarType, name, percentage: jar['percentage'], budgetVnd });
  }

  if (!hasSevenUniqueJars(jars) || !percentagesTotal100(jars)) {
    return null;
  }

  return {
    id,
    year,
    month,
    monthlyIncomeVnd,
    currency: 'VND',
    createdAtUtc,
    jars
  };
}

export function parseCreateExpenseResponse(value: unknown): CreateExpenseResponse | null {
  if (!isRecord(value) || !isRecord(value['expense']) || !isRecord(value['jarSummary'])) {
    return null;
  }

  const expense = value['expense'];
  const summary = value['jarSummary'];
  const jarType = expense['jarType'];
  const summaryJarType = summary['jarType'];
  const amountVnd = readString(expense, 'amountVnd');
  const description = readString(expense, 'description');
  const expenseDate = readString(expense, 'expenseDate');
  const jarName = readString(expense, 'jarName');
  const createdAtUtc = readString(expense, 'createdAtUtc');
  const summaryName = readString(summary, 'jarName');
  const budgetVnd = readString(summary, 'budgetVnd');
  const spentVnd = readString(summary, 'spentVnd');
  const remainingVnd = readString(summary, 'remainingVnd');

  if (
    typeof expense['id'] !== 'number' ||
    !isJarType(jarType) ||
    jarType !== summaryJarType ||
    !amountVnd ||
    !isWholeVnd(amountVnd) ||
    !description ||
    !expenseDate ||
    !jarName ||
    !createdAtUtc ||
    !summaryName ||
    !budgetVnd ||
    !isWholeVnd(budgetVnd) ||
    !spentVnd ||
    !isWholeVnd(spentVnd) ||
    !remainingVnd ||
    !isWholeVnd(remainingVnd, true) ||
    !isIntegerPercent(summary['percentage'])
  ) {
    return null;
  }

  return {
    expense: {
      id: expense['id'],
      expenseDate,
      jarType,
      jarName,
      amountVnd,
      description,
      createdAtUtc
    },
    jarSummary: {
      jarType,
      jarName: summaryName,
      percentage: summary['percentage'],
      budgetVnd,
      spentVnd,
      remainingVnd
    }
  };
}

export function parseSpendingByJars(value: unknown): SpendingByJarsResponse | null {
  if (!isRecord(value) || value['currency'] !== 'VND') {
    return null;
  }

  const year = value['year'];
  const month = value['month'];
  const rawJars = readJarList(value['jars']);
  if (
    typeof year !== 'number' ||
    !Number.isInteger(year) ||
    typeof month !== 'number' ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !rawJars
  ) {
    return null;
  }

  const jars: SpendingByJar[] = [];
  for (const jar of rawJars) {
    const jarType = jar['jarType'];
    const jarName = readString(jar, 'jarName');
    const plannedBudgetVnd = readString(jar, 'plannedBudgetVnd');
    const spentBudgetVnd = readString(jar, 'spentBudgetVnd');
    const percentageUsed = jar['percentageUsed'];
    if (
      !isJarType(jarType) ||
      !jarName ||
      !plannedBudgetVnd ||
      !isWholeVnd(plannedBudgetVnd) ||
      !spentBudgetVnd ||
      !isWholeVnd(spentBudgetVnd) ||
      typeof percentageUsed !== 'number' ||
      !Number.isFinite(percentageUsed) ||
      percentageUsed < 0
    ) {
      return null;
    }

    jars.push({ jarType, jarName, percentageUsed, plannedBudgetVnd, spentBudgetVnd });
  }

  if (!hasSevenUniqueJars(jars)) {
    return null;
  }

  return { year, month, currency: 'VND', jars };
}
