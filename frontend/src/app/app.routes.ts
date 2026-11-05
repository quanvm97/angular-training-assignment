import { Routes } from '@angular/router';

import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { AddExpensePageComponent } from './features/expenses/add-expense-page.component';
import { MonthlyPlanPageComponent } from './features/monthly-plan/monthly-plan-page.component';
import { MonthlyPlanningPageComponent } from './features/monthly-planning/monthly-planning-page.component';
import { SpendingByJarPageComponent } from './features/spending/spending-by-jar-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPageComponent },
  { path: 'monthly-planning', component: MonthlyPlanningPageComponent },
  { path: 'monthly-plans/:year/:month/spending', component: SpendingByJarPageComponent },
  { path: 'monthly-plans/:year/:month', component: MonthlyPlanPageComponent },
  { path: 'expenses/new', component: AddExpensePageComponent },
  { path: '**', redirectTo: 'monthly-planning' }
];
