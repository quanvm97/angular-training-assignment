import { Component, input } from '@angular/core';

import { FamilyFinanceHeaderComponent } from './family-finance-header.component';
import { FamilyFinanceSidebarComponent, NavItem } from './family-finance-sidebar.component';

@Component({
  selector: 'app-family-finance-shell',
  imports: [FamilyFinanceHeaderComponent, FamilyFinanceSidebarComponent],
  templateUrl: './family-finance-shell.component.html',
  styleUrl: './family-finance-shell.component.css'
})
export class FamilyFinanceShellComponent {
  readonly activeItem = input.required<NavItem>();
  readonly context = input<string | null>(null);
  readonly expenseDate = input<string | null>(null);
}
