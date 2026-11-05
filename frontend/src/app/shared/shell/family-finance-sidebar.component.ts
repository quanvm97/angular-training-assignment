import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type NavItem = 'dashboard' | 'planning' | 'expenses';

@Component({
  selector: 'app-family-finance-sidebar',
  imports: [RouterLink],
  templateUrl: './family-finance-sidebar.component.html'
})
export class FamilyFinanceSidebarComponent {
  readonly activeItem = input.required<NavItem>();
  readonly expenseDate = input<string | null>(null);
}
