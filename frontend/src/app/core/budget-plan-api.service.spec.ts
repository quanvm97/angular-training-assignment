import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { defaultJarsFixture, planFixture, spendingFixture } from '../testing/budget-fixtures';
import { ApiFailure } from './api-failure';
import { BudgetPlanApiService } from './budget-plan-api.service';

describe('BudgetPlanApiService', () => {
  beforeEach(() => TestBed.resetTestingModule());
  it('loads, creates, and rejects contracts through the typed endpoints', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const api = TestBed.inject(BudgetPlanApiService);
    const http = TestBed.inject(HttpTestingController);

    const defaults = firstValueFrom(api.getDefaultJars());
    http.expectOne((request) => request.url.endsWith('/default-jars')).flush(defaultJarsFixture);
    await expect(defaults).resolves.toEqual(defaultJarsFixture);

    const created = firstValueFrom(api.createMonthlyPlan({ year: 2026, month: 11, monthlyIncomeVnd: '10000' }));
    const post = http.expectOne((request) => request.method === 'POST' && request.url.endsWith('/budget-plans'));
    expect(post.request.body).toEqual({ year: 2026, month: 11, monthlyIncomeVnd: '10000' });
    post.flush(planFixture);
    await expect(created).resolves.toMatchObject({ id: 7 });

    const loaded = firstValueFrom(api.getMonthlyPlan(2026, 11));
    http.expectOne((request) => request.url.endsWith('/budget-plans/2026/11')).flush(planFixture);
    await expect(loaded).resolves.toMatchObject({ month: 11 });

    const malformed = firstValueFrom(api.getSpendingByJars(2026, 11));
    http.expectOne((request) => request.url.endsWith('/spending-by-jars')).flush({ currency: 'VND', jars: [] });
    await expect(malformed).rejects.toMatchObject({ kind: 'invalid-data' } satisfies Partial<ApiFailure>);

    const missing = firstValueFrom(api.getMonthlyPlan(2026, 1));
    http
      .expectOne((request) => request.url.endsWith('/budget-plans/2026/1'))
      .flush(
        { code: 'MONTHLY_PLAN_NOT_FOUND', message: 'No monthly plan exists for this month.', errors: [] },
        { status: 404, statusText: 'Not Found' }
      );
    await expect(missing).rejects.toMatchObject({ kind: 'not-found' });

    http.verify();
  });

  it('posts one expense and keeps the returned jar summary', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const api = TestBed.inject(BudgetPlanApiService);
    const http = TestBed.inject(HttpTestingController);
    const saved = firstValueFrom(
      api.createExpense({ expenseDate: '2026-11-02', jarType: 'food', amountVnd: '1500', description: 'Market' })
    );
    const request = http.expectOne((call) => call.method === 'POST' && call.url.endsWith('/expenses'));
    request.flush({
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
        spentVnd: '1500',
        remainingVnd: '500'
      }
    });
    await expect(saved).resolves.toMatchObject({ jarSummary: { spentVnd: '1500' } });
    expect(spendingFixture.jars).toHaveLength(7);
    http.verify();
  });
});
