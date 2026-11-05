export const JAR_TYPES = [
  'livingExpenses',
  'food',
  'children',
  'emergencyFund',
  'savings',
  'investment',
  'entertainmentAndTravel'
] as const;

export type JarType = (typeof JAR_TYPES)[number];

export interface DefaultJar {
  jarType: JarType;
  name: string;
  percentage: number;
  suggestedLogic: string;
}

export interface DefaultJarsResponse {
  currency: 'VND';
  totalPercentage: 100;
  jars: DefaultJar[];
}

export interface CreateMonthlyPlanRequest {
  year: number;
  month: number;
  monthlyIncomeVnd: string;
}

export interface MonthlyPlanJar {
  jarType: JarType;
  name: string;
  percentage: number;
  budgetVnd: string;
}

export interface MonthlyPlanResponse {
  id: number;
  year: number;
  month: number;
  monthlyIncomeVnd: string;
  currency: 'VND';
  createdAtUtc: string;
  jars: MonthlyPlanJar[];
}

export interface ApiFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  errors: ApiFieldError[];
}

export interface CreateExpenseRequest {
  expenseDate: string;
  jarType: JarType;
  amountVnd: string;
  description: string;
}

export interface CreatedExpense {
  id: number;
  expenseDate: string;
  jarType: JarType;
  jarName: string;
  amountVnd: string;
  description: string;
  createdAtUtc: string;
}

export interface JarSpendingSummary {
  jarType: JarType;
  jarName: string;
  percentage: number;
  budgetVnd: string;
  spentVnd: string;
  remainingVnd: string;
}

export interface CreateExpenseResponse {
  expense: CreatedExpense;
  jarSummary: JarSpendingSummary;
}

export interface SpendingByJar {
  jarType: JarType;
  jarName: string;
  percentageUsed: number;
  plannedBudgetVnd: string;
  spentBudgetVnd: string;
}

export interface SpendingByJarsResponse {
  year: number;
  month: number;
  currency: 'VND';
  jars: SpendingByJar[];
}
