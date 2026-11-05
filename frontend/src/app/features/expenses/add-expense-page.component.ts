import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, map, of, switchMap } from 'rxjs';

import { ApiFailure, fieldMessage } from '../../core/api-failure';
import { BudgetPlanApiService } from '../../core/budget-plan-api.service';
import { JarSpendingSummary, JarType, MonthlyPlanJar, MonthlyPlanResponse } from '../../core/budget.models';
import { isJarType } from '../../core/budget-contract';
import { CLOCK } from '../../core/clock';
import { expenseAmountDigits, ExpenseFieldErrors, hasFieldErrors, validateExpense } from '../../core/form-rules';
import { applyGroupedAmount, formatVnd, isOverBudgetAmount, rejectNonDigitAmountKey } from '../../core/money';
import { isIsoDate, periodLabel, yearMonthFromIso } from '../../core/period';
import { FamilyFinanceShellComponent } from '../../shared/shell/family-finance-shell.component';

type PlanLoad =
  | { status: 'loading' }
  | { status: 'ready'; plan: MonthlyPlanResponse }
  | { status: 'not-found'; message: string }
  | { status: 'invalid-date' }
  | { status: 'invalid-data' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-add-expense-page',
  imports: [ReactiveFormsModule, RouterLink, FamilyFinanceShellComponent],
  templateUrl: './add-expense-page.component.html'
})
export class AddExpensePageComponent {
  private readonly api = inject(BudgetPlanApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly clock = inject(CLOCK);
  private readonly dateLoads = new Subject<string>();

  readonly form = this.formBuilder.nonNullable.group({
    expenseDate: '',
    jarType: '',
    amountVnd: '',
    description: ''
  });

  readonly planState = signal<PlanLoad>({ status: 'loading' });
  readonly fieldErrors = signal<ExpenseFieldErrors>({});
  readonly submitting = signal(false);
  readonly statusMessage = signal('Choose a date to load that month\'s jars.');
  readonly statusTone = signal<'info' | 'error' | 'success'>('info');
  readonly savedSummary = signal<JarSpendingSummary | null>(null);
  readonly formatVnd = formatVnd;
  readonly periodLabel = periodLabel;
  readonly isOverBudgetAmount = isOverBudgetAmount;
  private requestedJar: JarType | null = null;

  constructor() {
    const expenseDate = this.route.snapshot.queryParamMap.get('expenseDate');
    const jarType = this.route.snapshot.queryParamMap.get('jarType');
    this.requestedJar = isJarType(jarType) ? jarType : null;
    const initialDate = expenseDate && isIsoDate(expenseDate) ? expenseDate : this.today();
    this.form.controls.expenseDate.setValue(initialDate);

    this.dateLoads
      .pipe(
        switchMap((date) => this.loadPlan(date)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((state) => {
        this.planState.set(state);
        if (state.status === 'ready') {
          this.keepValidJar(state.plan.jars);
        }
      });

    this.form.controls.expenseDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((date) => {
      this.savedSummary.set(null);
      this.dateLoads.next(date);
    });

    this.dateLoads.next(initialDate);
  }

  dateReload(): void {
    this.dateLoads.next(this.form.controls.expenseDate.value);
  }

  selectedJar(): MonthlyPlanJar | null {
    const state = this.planState();
    const jarType = this.form.controls.jarType.value;
    if (state.status !== 'ready' || !isJarType(jarType)) {
      return null;
    }

    return state.plan.jars.find((jar) => jar.jarType === jarType) ?? null;
  }

  readonly rejectNonDigitAmountKey = rejectNonDigitAmountKey;

  onAmountInput(event: Event): void {
    applyGroupedAmount(event, (value) => this.form.controls.amountVnd.setValue(value, { emitEvent: false }));
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    const state = this.planState();
    if (state.status !== 'ready') {
      this.statusTone.set('error');
      this.statusMessage.set(
        state.status === 'not-found'
          ? 'Create a monthly plan before adding an expense.'
          : 'Load a monthly plan before saving an expense.'
      );
      return;
    }

    const value = this.form.getRawValue();
    const errors = validateExpense(value.expenseDate, value.jarType, value.amountVnd, value.description);
    if (!errors.jarType && !state.plan.jars.some((jar) => jar.jarType === value.jarType)) {
      errors.jarType = 'Please select a jar from this month.';
    }

    this.fieldErrors.set(errors);
    if (hasFieldErrors(errors)) {
      this.statusTone.set('error');
      this.statusMessage.set('Please complete the required expense details.');
      this.focus(this.firstInvalid(errors));
      return;
    }

    const amountVnd = expenseAmountDigits(value.amountVnd);
    if (!amountVnd || !isJarType(value.jarType)) {
      return;
    }

    this.submitting.set(true);
    this.statusTone.set('info');
    this.statusMessage.set('Saving the expense.');
    this.api
      .createExpense({
        expenseDate: value.expenseDate,
        jarType: value.jarType,
        amountVnd,
        description: value.description.trim()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.savedSummary.set(response.jarSummary);
          this.fieldErrors.set({});
          this.statusTone.set('success');
          this.statusMessage.set('Expense saved. Jar spending totals were refreshed from the server.');
        },
        error: (failure: ApiFailure) => this.handleSaveError(failure, state.plan)
      });
  }

  private loadPlan(date: string) {
    if (!isIsoDate(date)) {
      return of<PlanLoad>({ status: 'invalid-date' });
    }

    const period = yearMonthFromIso(date);
    if (!period) {
      return of<PlanLoad>({ status: 'invalid-date' });
    }

    this.planState.set({ status: 'loading' });
    return this.api.getMonthlyPlan(period.year, period.month).pipe(
      map((plan): PlanLoad => ({ status: 'ready', plan })),
      catchError((failure: ApiFailure) => of(this.planFailure(failure)))
    );
  }

  private handleSaveError(failure: ApiFailure, plan: MonthlyPlanResponse): void {
    this.submitting.set(false);
    this.statusTone.set('error');
    this.fieldErrors.set({
      expenseDate: fieldMessage(failure, 'expenseDate') ?? undefined,
      jarType: fieldMessage(failure, 'jarType') ?? undefined,
      amountVnd: fieldMessage(failure, 'amountVnd') ?? undefined,
      description: fieldMessage(failure, 'description') ?? undefined
    });
    this.statusMessage.set(failure.message);
    if (failure.kind === 'jar-not-in-plan' || failure.kind === 'not-found') {
      this.dateLoads.next(this.form.controls.expenseDate.value);
    }

    const errors = this.fieldErrors();
    const target = this.firstInvalid(errors);
    if (target) {
      this.focus(target);
    }

    void plan;
  }

  private planFailure(failure: ApiFailure): PlanLoad {
    if (failure.kind === 'not-found') {
      return { status: 'not-found', message: failure.message };
    }

    if (failure.kind === 'invalid-data') {
      return { status: 'invalid-data' };
    }

    return { status: 'error', message: failure.message };
  }

  private keepValidJar(jars: MonthlyPlanJar[]): void {
    const current = this.form.controls.jarType.value;
    if (isJarType(current) && jars.some((jar) => jar.jarType === current)) {
      return;
    }

    if (this.requestedJar && jars.some((jar) => jar.jarType === this.requestedJar)) {
      this.form.controls.jarType.setValue(this.requestedJar);
      this.requestedJar = null;
      return;
    }

    this.form.controls.jarType.setValue('');
  }

  private firstInvalid(errors: ExpenseFieldErrors): string | null {
    if (errors.expenseDate) {
      return 'expense-date';
    }

    if (errors.jarType) {
      return 'jar-type';
    }

    if (errors.amountVnd) {
      return 'amount';
    }

    if (errors.description) {
      return 'description';
    }

    return null;
  }

  private focus(id: string | null): void {
    if (!id) {
      return;
    }

    queueMicrotask(() => document.getElementById(id)?.focus());
  }

  private today(): string {
    const date = this.clock();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
