import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { ApiFailure } from '../../core/api-failure';
import { BudgetPlanApiService } from '../../core/budget-plan-api.service';
import { SpendingByJarsResponse } from '../../core/budget.models';
import { parseMonthInput, parseRoutePeriod, periodLabel, toMonthInput, YearMonth } from '../../core/period';
import { SpendingJarListComponent } from '../../shared/spending/spending-jar-list.component';
import { FamilyFinanceShellComponent } from '../../shared/shell/family-finance-shell.component';

type SpendingView =
  | { status: 'loading' }
  | { status: 'ready'; spending: SpendingByJarsResponse }
  | { status: 'not-found'; message: string }
  | { status: 'invalid-route' }
  | { status: 'invalid-data' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-spending-by-jar-page',
  imports: [RouterLink, FamilyFinanceShellComponent, SpendingJarListComponent],
  templateUrl: './spending-by-jar-page.component.html'
})
export class SpendingByJarPageComponent {
  private readonly api = inject(BudgetPlanApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();

  readonly periodLabel = periodLabel;
  readonly view = signal<SpendingView>({ status: 'loading' });
  private requestedPeriod: YearMonth | null = null;

  constructor() {
    combineLatest([this.route.paramMap, this.reload.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          const period = parseRoutePeriod(params.get('year'), params.get('month'));
          this.requestedPeriod = period;
          if (!period) {
            return of<SpendingView>({ status: 'invalid-route' });
          }

          return this.api.getSpendingByJars(period.year, period.month).pipe(
            map((spending): SpendingView => ({ status: 'ready', spending })),
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
      return toMonthInput(current.spending);
    }

    return this.requestedPeriod ? toMonthInput(this.requestedPeriod) : '';
  }

  changeMonth(event: Event): void {
    const period = parseMonthInput((event.target as HTMLInputElement).value);
    if (!period) {
      return;
    }

    void this.router.navigate(['/monthly-plans', period.year, period.month, 'spending']);
  }

  retry(): void {
    this.view.set({ status: 'loading' });
    this.reload.next();
  }

  backLink(): string[] {
    const period = this.requestedPeriod;
    return period ? ['/monthly-plans', `${period.year}`, `${period.month}`] : ['/monthly-planning'];
  }

  private failureView(failure: ApiFailure): SpendingView {
    if (failure.kind === 'not-found') {
      return { status: 'not-found', message: failure.message };
    }

    if (failure.kind === 'invalid-data') {
      return { status: 'invalid-data' };
    }

    return { status: 'error', message: failure.message };
  }
}
