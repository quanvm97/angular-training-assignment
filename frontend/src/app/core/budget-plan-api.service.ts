import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { BUDGET_PLAN_ENDPOINTS } from '../constants/api-endpoints';
import { ContractError, toApiFailure } from './api-failure';
import { parseCreateExpenseResponse, parseDefaultJars, parseMonthlyPlan, parseSpendingByJars } from './budget-contract';
import {
  CreateExpenseRequest,
  CreateExpenseResponse,
  CreateMonthlyPlanRequest,
  DefaultJarsResponse,
  MonthlyPlanResponse,
  SpendingByJarsResponse
} from './budget.models';

@Injectable({ providedIn: 'root' })
export class BudgetPlanApiService {
  private readonly http = inject(HttpClient);

  getDefaultJars(): Observable<DefaultJarsResponse> {
    return this.http.get<unknown>(BUDGET_PLAN_ENDPOINTS.DEFAULT_JARS).pipe(
      map((body) => this.read(parseDefaultJars(body))),
      catchError((error: unknown) => throwError(() => toApiFailure(error)))
    );
  }

  createMonthlyPlan(request: CreateMonthlyPlanRequest): Observable<MonthlyPlanResponse> {
    return this.http.post<unknown>(BUDGET_PLAN_ENDPOINTS.PLANS, request).pipe(
      map((body) => this.read(parseMonthlyPlan(body))),
      catchError((error: unknown) => throwError(() => toApiFailure(error)))
    );
  }

  getMonthlyPlan(year: number, month: number): Observable<MonthlyPlanResponse> {
    return this.http.get<unknown>(BUDGET_PLAN_ENDPOINTS.BY_PERIOD(year, month)).pipe(
      map((body) => this.read(parseMonthlyPlan(body))),
      catchError((error: unknown) => throwError(() => toApiFailure(error)))
    );
  }

  createExpense(request: CreateExpenseRequest): Observable<CreateExpenseResponse> {
    return this.http.post<unknown>(BUDGET_PLAN_ENDPOINTS.EXPENSES, request).pipe(
      map((body) => this.read(parseCreateExpenseResponse(body))),
      catchError((error: unknown) => throwError(() => toApiFailure(error)))
    );
  }

  getSpendingByJars(year: number, month: number): Observable<SpendingByJarsResponse> {
    return this.http.get<unknown>(BUDGET_PLAN_ENDPOINTS.SPENDING_BY_JARS(year, month)).pipe(
      map((body) => this.read(parseSpendingByJars(body))),
      catchError((error: unknown) => throwError(() => toApiFailure(error)))
    );
  }

  private read<T>(value: T | null): T {
    if (value === null) {
      throw new ContractError();
    }

    return value;
  }
}
