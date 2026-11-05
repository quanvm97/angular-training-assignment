import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { fieldMessage, ApiFailure } from '../../core/api-failure';
import { BudgetPlanApiService } from '../../core/budget-plan-api.service';
import { DefaultJar } from '../../core/budget.models';
import { hasFieldErrors, planningIncomeDigits, PlanningFieldErrors, validatePlanning } from '../../core/form-rules';
import { jarClass } from '../../core/jar-presentation';
import { applyGroupedAmount, rejectNonDigitAmountKey } from '../../core/money';
import { parseMonthInput } from '../../core/period';
import { FamilyFinanceShellComponent } from '../../shared/shell/family-finance-shell.component';

type DefaultsState = 'loading' | 'ready' | 'error' | 'invalid-data';

@Component({
  selector: 'app-monthly-planning-page',
  imports: [ReactiveFormsModule, RouterLink, FamilyFinanceShellComponent],
  templateUrl: './monthly-planning-page.component.html'
})
export class MonthlyPlanningPageComponent {
  private readonly api = inject(BudgetPlanApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly jarClass = jarClass;
  readonly form = this.formBuilder.nonNullable.group({
    period: '',
    monthlyIncomeVnd: ''
  });

  readonly defaultsState = signal<DefaultsState>('loading');
  readonly jars = signal<DefaultJar[]>([]);
  readonly totalPercentage = signal<number | null>(null);
  readonly submitting = signal(false);
  readonly fieldErrors = signal<PlanningFieldErrors>({});
  readonly statusMessage = signal('Loading the seven default jars.');
  readonly statusTone = signal<'info' | 'error'>('info');

  constructor() {
    this.loadDefaults();
  }

  loadDefaults(): void {
    this.defaultsState.set('loading');
    this.statusTone.set('info');
    this.statusMessage.set('Loading the seven default jars.');
    this.api
      .getDefaultJars()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.jars.set(response.jars);
          this.totalPercentage.set(response.totalPercentage);
          this.defaultsState.set('ready');
          this.statusMessage.set('Rates are fixed. Select a month and enter income to create one plan.');
        },
        error: (failure: ApiFailure) => {
          this.defaultsState.set(failure.kind === 'invalid-data' ? 'invalid-data' : 'error');
          this.statusTone.set('error');
          this.statusMessage.set(failure.message);
        }
      });
  }

  readonly rejectNonDigitAmountKey = rejectNonDigitAmountKey;

  onIncomeInput(event: Event): void {
    applyGroupedAmount(event, (value) => this.form.controls.monthlyIncomeVnd.setValue(value, { emitEvent: false }));
  }

  submit(): void {
    if (this.submitting() || this.defaultsState() !== 'ready') {
      return;
    }

    const period = this.form.controls.period.value;
    const income = this.form.controls.monthlyIncomeVnd.value;
    const errors = validatePlanning(period, income);
    this.fieldErrors.set(errors);
    if (hasFieldErrors(errors)) {
      this.statusTone.set('error');
      this.statusMessage.set('Please select a month and enter a positive whole-VND income.');
      this.focus(errors.period ? 'period' : 'monthly-income');
      return;
    }

    const parsed = parseMonthInput(period);
    const monthlyIncomeVnd = planningIncomeDigits(income);
    if (!parsed || !monthlyIncomeVnd) {
      return;
    }

    this.submitting.set(true);
    this.statusTone.set('info');
    this.statusMessage.set('Creating the monthly plan.');
    this.api
      .createMonthlyPlan({ year: parsed.year, month: parsed.month, monthlyIncomeVnd })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => {
          this.submitting.set(false);
          void this.router.navigate(['/monthly-plans', plan.year, plan.month]);
        },
        error: (failure: ApiFailure) => {
          this.submitting.set(false);
          this.statusTone.set('error');
          const periodMessage = fieldMessage(failure, 'year') ?? fieldMessage(failure, 'month');
          const incomeMessage = fieldMessage(failure, 'monthlyIncomeVnd');
          this.fieldErrors.set({
            period: periodMessage ?? undefined,
            monthlyIncomeVnd: incomeMessage ?? undefined
          });
          this.statusMessage.set(failure.message);
          if (periodMessage) {
            this.focus('period');
          } else if (incomeMessage) {
            this.focus('monthly-income');
          }
        }
      });
  }

  private focus(id: string): void {
    queueMicrotask(() => document.getElementById(id)?.focus());
  }
}
