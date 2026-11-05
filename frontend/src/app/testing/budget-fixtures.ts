import { DefaultJarsResponse, MonthlyPlanResponse, SpendingByJarsResponse } from '../core/budget.models';

export const defaultJarsFixture: DefaultJarsResponse = {
  currency: 'VND',
  totalPercentage: 100,
  jars: [
    { jarType: 'livingExpenses', name: 'Living Expenses', percentage: 35, suggestedLogic: 'Rent and utilities' },
    { jarType: 'food', name: 'Food', percentage: 20, suggestedLogic: 'Groceries' },
    { jarType: 'children', name: 'Children', percentage: 10, suggestedLogic: 'School' },
    { jarType: 'emergencyFund', name: 'Emergency Fund', percentage: 10, suggestedLogic: 'Reserve' },
    { jarType: 'savings', name: 'Savings', percentage: 10, suggestedLogic: 'Long-term savings' },
    { jarType: 'investment', name: 'Investment', percentage: 10, suggestedLogic: 'Investments' },
    { jarType: 'entertainmentAndTravel', name: 'Entertainment & Travel', percentage: 5, suggestedLogic: 'Leisure' }
  ]
};

export const planFixture: MonthlyPlanResponse = {
  id: 7,
  year: 2026,
  month: 11,
  monthlyIncomeVnd: '10000',
  currency: 'VND',
  createdAtUtc: '2026-11-01T00:00:00Z',
  jars: defaultJarsFixture.jars.map((jar) => ({
    jarType: jar.jarType,
    name: jar.name,
    percentage: jar.percentage,
    budgetVnd: String((10000 * jar.percentage) / 100)
  }))
};

export const spendingFixture: SpendingByJarsResponse = {
  year: 2026,
  month: 11,
  currency: 'VND',
  jars: planFixture.jars.map((jar, index) => ({
    jarType: jar.jarType,
    jarName: jar.name,
    percentageUsed: index === 0 ? 102.86 : 0,
    plannedBudgetVnd: jar.budgetVnd,
    spentBudgetVnd: index === 0 ? '4000' : '0'
  }))
};

export const apiError = (code: string, message: string, field?: string) => ({
  code,
  message,
  errors: field ? [{ field, code: 'INVALID', message }] : []
});
