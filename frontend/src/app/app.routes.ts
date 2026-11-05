import { Routes } from '@angular/router';

import { AddExpensePageComponent } from './features/expenses/add-expense-page.component';
import { MonthlyPlanPageComponent } from './features/monthly-plan/monthly-plan-page.component';
import { MonthlyPlanningPageComponent } from './features/monthly-planning/monthly-planning-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'monthly-planning' },
  { path: 'monthly-planning', component: MonthlyPlanningPageComponent },
  { path: 'monthly-plans/:year/:month', component: MonthlyPlanPageComponent },
  { path: 'expenses/new', component: AddExpensePageComponent },
  { path: '**', redirectTo: 'monthly-planning' }
];
