import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CLOCK } from '../core/clock';
import { routes } from '../app.routes';
import { apiError, defaultJarsFixture, planFixture, spendingFixture } from '../testing/budget-fixtures';
import { DashboardPageComponent } from './dashboard/dashboard-page.component';
import { AddExpensePageComponent } from './expenses/add-expense-page.component';
import { MonthlyPlanPageComponent } from './monthly-plan/monthly-plan-page.component';
import { MonthlyPlanningPageComponent } from './monthly-planning/monthly-planning-page.component';
import { SpendingByJarPageComponent } from './spending/spending-by-jar-page.component';

function textOf(fixture: ComponentFixture<unknown> | RouterTestingHarness): string {
  return fixture instanceof RouterTestingHarness
    ? (fixture.routeNativeElement?.textContent ?? '')
    : (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('monthly planning page', () => {
  beforeEach(() => TestBed.resetTestingModule());
  async function setup(): Promise<{ fixture: ComponentFixture<MonthlyPlanningPageComponent>; http: HttpTestingController }> {
    await TestBed.configureTestingModule({
      imports: [MonthlyPlanningPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)]
    }).compileComponents();
    const fixture = TestBed.createComponent(MonthlyPlanningPageComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, http };
  }

  it('shows server jars and creates one plan', async () => {
    const { fixture, http } = await setup();
    http.expectOne((request) => request.url.includes('/default-jars')).flush(defaultJarsFixture);
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Living Expenses');
    expect(textOf(fixture)).toContain('100% allocated');

    fixture.componentInstance.form.setValue({ period: '2026-11', monthlyIncomeVnd: '10,000' });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    const post = http.expectOne((request) => request.method === 'POST');
    expect(post.request.body).toEqual({ year: 2026, month: 11, monthlyIncomeVnd: '10000' });
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    fixture.componentInstance.submit();
    http.expectNone((request) => request.method === 'POST');
    post.flush(planFixture, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/monthly-plans/2026/11');
    http.match((request) => request.url.includes('/budget-plans/2026/11')).forEach((request) => request.flush(planFixture));
    http.verify();
  });

  it('keeps values and explains duplicate, invalid, and unavailable states', async () => {
    const { fixture, http } = await setup();
    const defaults = http.expectOne((request) => request.url.includes('/default-jars'));
    defaults.flush(defaultJarsFixture);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await Promise.resolve();
    expect(textOf(fixture)).toContain('Select a month');
    expect(document.activeElement?.id).toBe('period');

    fixture.componentInstance.form.setValue({ period: '2026-11', monthlyIncomeVnd: '10,000' });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    http
      .expectOne((request) => request.method === 'POST')
      .flush(apiError('MONTHLY_PLAN_ALREADY_EXISTS', 'A monthly plan already exists for this month.'), {
        status: 409,
        statusText: 'Conflict'
      });
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('already exists');
    expect(fixture.componentInstance.form.controls.monthlyIncomeVnd.value).toBe('10,000');

    fixture.componentInstance.loadDefaults();
    http.expectOne((request) => request.url.includes('/default-jars')).flush({ currency: 'USD' });
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('cannot display');

    fixture.componentInstance.loadDefaults();
    http.expectOne((request) => request.url.includes('/default-jars')).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('could not be reached');
    http.verify();
  });
});

describe('monthly plan and spending pages', () => {
  beforeEach(() => TestBed.resetTestingModule());
  it('renders backend budgets and spending, including missing and retry states', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)]
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/monthly-plans/2026/11', MonthlyPlanPageComponent);
    http.expectOne((request) => request.url.endsWith('/budget-plans/2026/11')).flush(planFixture);
    harness.detectChanges();
    expect(textOf(harness)).toContain('10,000 VND');
    expect(textOf(harness)).not.toContain('43,209,876');

    const month = harness.routeNativeElement?.querySelector('#plan-month') as HTMLInputElement;
    month.value = '2026-12';
    month.dispatchEvent(new Event('change'));
    await harness.navigateByUrl('/monthly-plans/2026/12', MonthlyPlanPageComponent);
    http
      .expectOne((request) => request.url.endsWith('/budget-plans/2026/12'))
      .flush(apiError('MONTHLY_PLAN_NOT_FOUND', 'No monthly plan exists for this month.'), { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(textOf(harness)).toContain('No monthly plan exists');
    expect(textOf(harness)).not.toContain('0 VND');

    const spending = await harness.navigateByUrl('/monthly-plans/2026/11/spending', SpendingByJarPageComponent);
    http.expectOne((request) => request.url.endsWith('/spending-by-jars')).flush(spendingFixture);
    harness.detectChanges();
    expect(textOf(harness)).toContain('102.86%');
    expect(textOf(harness)).toContain('Over budget');
    expect(textOf(harness)).toContain('4,000 VND');

    spending.retry();
    http.expectOne((request) => request.url.includes('/spending-by-jars')).flush({ currency: 'VND', jars: [] });
    harness.detectChanges();
    expect(textOf(harness)).toContain('exactly seven jars');

    await harness.navigateByUrl('/monthly-plans/nope/11', MonthlyPlanPageComponent);
    harness.detectChanges();
    expect(textOf(harness)).toContain('not valid');
    http.verify();
  });
});

describe('add expense page', () => {
  beforeEach(() => TestBed.resetTestingModule());
  it('saves one expense and shows the returned over-budget remaining amount', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: CLOCK, useValue: () => new Date(2026, 10, 5) }
      ]
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/expenses/new?expenseDate=2026-11-02&jarType=food', AddExpensePageComponent);
    http.expectOne((request) => request.url.endsWith('/budget-plans/2026/11')).flush(planFixture);
    harness.detectChanges();
    expect(component.form.controls.jarType.value).toBe('food');
    component.form.controls.amountVnd.setValue('1,500');
    component.form.controls.description.setValue('Market');
    harness.routeNativeElement?.querySelector('form')?.dispatchEvent(new Event('submit'));
    const post = http.expectOne((request) => request.method === 'POST' && request.url.endsWith('/expenses'));
    expect(post.request.body).toEqual({
      expenseDate: '2026-11-02',
      jarType: 'food',
      amountVnd: '1500',
      description: 'Market'
    });
    post.flush({
      expense: {
        id: 9,
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
    });
    harness.detectChanges();
    expect(textOf(harness)).toContain('Expense saved');
    expect(textOf(harness)).toContain('-1,500 VND');
    expect(textOf(harness)).toContain('Over budget');
    http.verify();
  });

  it('blocks an incomplete expense and a month without a plan', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes), { provide: CLOCK, useValue: () => new Date(2026, 10, 5) }]
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/expenses/new', AddExpensePageComponent);
    http
      .expectOne((request) => request.url.endsWith('/budget-plans/2026/11'))
      .flush(apiError('MONTHLY_PLAN_NOT_FOUND', 'No monthly plan exists for this month.'), { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(textOf(harness)).toContain('Create a monthly plan before adding an expense');
    harness.routeNativeElement?.querySelector('form')?.dispatchEvent(new Event('submit'));
    http.expectNone((request) => request.method === 'POST');
    component.form.controls.expenseDate.setValue('2026-12-01');
    http.expectOne((request) => request.url.endsWith('/budget-plans/2026/12')).flush(planFixture);
    harness.detectChanges();
    harness.routeNativeElement?.querySelector('form')?.dispatchEvent(new Event('submit'));
    harness.detectChanges();
    expect(textOf(harness)).toContain('Please select a jar.');
    http.verify();
  });
});

describe('dashboard page', () => {
  beforeEach(() => TestBed.resetTestingModule());
  it('shows income from the plan and spending from the jar API', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: CLOCK, useValue: () => new Date(2026, 10, 5) }
      ]
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    const dashboard = await harness.navigateByUrl('/dashboard?year=2026&month=11', DashboardPageComponent);
    http.expectOne((request) => request.url.endsWith('/budget-plans/2026/11')).flush(planFixture);
    http.expectOne((request) => request.url.endsWith('/spending-by-jars')).flush(spendingFixture);
    harness.detectChanges();
    const text = textOf(harness);
    expect(text).toContain('10,000 VND');
    expect(text).toContain('4,000 VND');
    expect(text).toContain('6,000 VND');
    expect(text).toContain('40.0% of income');
    expect(text).toContain('102.86%');
    expect(text).not.toContain('Grocery shopping');

    dashboard.retry();
    http
      .expectOne((request) => request.url.endsWith('/budget-plans/2026/11'))
      .flush(apiError('MONTHLY_PLAN_NOT_FOUND', 'No monthly plan exists for this month.'), { status: 404, statusText: 'Not Found' });
    http
      .expectOne((request) => request.url.endsWith('/spending-by-jars'))
      .flush(apiError('MONTHLY_PLAN_NOT_FOUND', 'Create a monthly plan before viewing spending by jar.'), {
        status: 404,
        statusText: 'Not Found'
      });
    harness.detectChanges();
    expect(textOf(harness)).toContain('No monthly plan exists');
    http.verify();
  });
});
