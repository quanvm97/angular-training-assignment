import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, forkJoin, map, of, startWith, switchMap } from 'rxjs';

import { ApiFailure } from '../../core/api-failure';
import { BudgetPlanApiService } from '../../core/budget-plan-api.service';
import { MonthlyPlanResponse, SpendingByJarsResponse } from '../../core/budget.models';
import { CLOCK } from '../../core/clock';
import { allocationDonut, jarClass } from '../../core/jar-presentation';
import { formatVnd, subtractWholeVnd, sumWholeVnd, wholeVndShareLabel } from '../../core/money';
import {
  currentPeriod,
  firstOfMonth,
  greetingForHour,
  longDateLabel,
  parseRoutePeriod,
  periodLabel,
  toMonthInput,
  YearMonth
} from '../../core/period';
import { SpendingJarListComponent } from '../../shared/spending/spending-jar-list.component';
import { FamilyFinanceShellComponent } from '../../shared/shell/family-finance-shell.component';

type DashboardView =
  | { status: 'loading' }
  | {
      status: 'ready';
      plan: MonthlyPlanResponse;
      spending: SpendingByJarsResponse;
      spentVnd: string;
      availableVnd: string;
      shareLabel: string;
    }
  | { status: 'not-found'; message: string }
  | { status: 'invalid-data' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, FamilyFinanceShellComponent, SpendingJarListComponent],
  templateUrl: './dashboard-page.component.html'
})
export class DashboardPageComponent {
  private readonly api = inject(BudgetPlanApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clock = inject(CLOCK);
  private readonly reload = new Subject<void>();

  readonly formatVnd = formatVnd;
  readonly allocationDonut = allocationDonut;
  readonly jarClass = jarClass;
  readonly periodLabel = periodLabel;
  readonly view = signal<DashboardView>({ status: 'loading' });
  readonly todayLabel = longDateLabel(this.clock());
  readonly greeting = `${greetingForHour(this.clock().getHours())}, Family Name`;
  private selectedPeriod = currentPeriod(this.clock());

  constructor() {
    combineLatest([this.route.queryParamMap, this.reload.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          const requested = parseRoutePeriod(params.get('year'), params.get('month'));
          const period = requested ?? currentPeriod(this.clock());
          this.selectedPeriod = period;
          if ((params.get('year') || params.get('month')) && !requested) {
            return of<DashboardView>({ status: 'error', message: 'That month is not valid.' });
          }

          return this.load(period);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((view) => this.view.set(view));
  }

  monthValue(): string {
    return toMonthInput(this.selectedPeriod);
  }

  expenseDate(): string {
    return firstOfMonth(this.selectedPeriod);
  }

  changeMonth(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const [year, month] = value.split('-');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year, month: month ? String(Number(month)) : month }
    });
  }

  retry(): void {
    this.view.set({ status: 'loading' });
    this.reload.next();
  }

  private load(period: YearMonth) {
    return forkJoin({
      plan: this.api.getMonthlyPlan(period.year, period.month).pipe(
        map((plan) => ({ ok: true as const, plan })),
        catchError((failure: ApiFailure) => of({ ok: false as const, failure }))
      ),
      spending: this.api.getSpendingByJars(period.year, period.month).pipe(
        map((spending) => ({ ok: true as const, spending })),
        catchError((failure: ApiFailure) => of({ ok: false as const, failure }))
      )
    }).pipe(
      map((result): DashboardView => {
        if (!result.plan.ok) {
          return this.failureView(result.plan.failure);
        }

        if (!result.spending.ok) {
          return this.failureView(result.spending.failure);
        }

        const spentVnd = sumWholeVnd(result.spending.spending.jars.map((jar) => jar.spentBudgetVnd));
        const availableVnd = spentVnd === null ? null : subtractWholeVnd(result.plan.plan.monthlyIncomeVnd, spentVnd);
        const shareLabel = spentVnd === null ? null : wholeVndShareLabel(spentVnd, result.plan.plan.monthlyIncomeVnd);
        if (spentVnd === null || availableVnd === null || shareLabel === null) {
          return { status: 'invalid-data' };
        }

        return {
          status: 'ready',
          plan: result.plan.plan,
          spending: result.spending.spending,
          spentVnd,
          availableVnd,
          shareLabel
        };
      })
    );
  }

  private failureView(failure: ApiFailure): DashboardView {
    if (failure.kind === 'not-found') {
      return { status: 'not-found', message: failure.message };
    }

    if (failure.kind === 'invalid-data') {
      return { status: 'invalid-data' };
    }

    return { status: 'error', message: failure.message };
  }
}
