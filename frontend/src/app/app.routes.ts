import { Routes } from '@angular/router';

import { MonthlyPlanningPageComponent } from './features/monthly-planning/monthly-planning-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'monthly-planning' },
  { path: 'monthly-planning', component: MonthlyPlanningPageComponent },
  { path: '**', redirectTo: 'monthly-planning' }
];
