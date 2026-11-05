import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { ApiFailure } from '../../core/api-failure';
import { BudgetPlanApiService } from '../../core/budget-plan-api.service';
import { MonthlyPlanResponse } from '../../core/budget.models';
import { allocationDonut, jarClass } from '../../core/jar-presentation';
import { formatVnd } from '../../core/money';
import { parseMonthInput, parseRoutePeriod, periodLabel, toMonthInput, YearMonth } from '../../core/period';
import { FamilyFinanceShellComponent } from '../../shared/shell/family-finance-shell.component';

type PlanView =
  | { status: 'loading' }
  | { status: 'ready'; plan: MonthlyPlanResponse }
  | { status: 'not-found'; message: string }
  | { status: 'invalid-route' }
  | { status: 'invalid-data' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-monthly-plan-page',
  imports: [RouterLink, FamilyFinanceShellComponent],
  templateUrl: './monthly-plan-page.component.html'
})
export class MonthlyPlanPageComponent {
  private readonly api = inject(BudgetPlanApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();

  readonly jarClass = jarClass;
  readonly formatVnd = formatVnd;
  readonly allocationDonut = allocationDonut;
  readonly periodLabel = periodLabel;
  readonly view = signal<PlanView>({ status: 'loading' });
  private requestedPeriod: YearMonth | null = null;

  constructor() {
    combineLatest([this.route.paramMap, this.reload.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          const period = parseRoutePeriod(params.get('year'), params.get('month'));
          this.requestedPeriod = period;
          if (!period) {
            return of<PlanView>({ status: 'invalid-route' });
          }

          return this.api.getMonthlyPlan(period.year, period.month).pipe(
            map((plan): PlanView => ({ status: 'ready', plan })),
            catchError((failure: ApiFailure) => of(this.failureView(failure)))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((view) => this.view.set(view));
  }

  monthValue(): string {
    const current = this.view();
    if (current.status === 'ready') {
      return toMonthInput(current.plan);
    }

    return this.requestedPeriod ? toMonthInput(this.requestedPeriod) : '';
  }

  changeMonth(event: Event): void {
    const period = parseMonthInput((event.target as HTMLInputElement).value);
    if (!period) {
      return;
    }

    void this.router.navigate(['/monthly-plans', period.year, period.month]);
  }

  retry(): void {
    this.view.set({ status: 'loading' });
    this.reload.next();
  }

  private failureView(failure: ApiFailure): PlanView {
    if (failure.kind === 'not-found') {
      return { status: 'not-found', message: failure.message };
    }

    if (failure.kind === 'invalid-data') {
      return { status: 'invalid-data' };
    }

    return { status: 'error', message: failure.message };
  }
}
