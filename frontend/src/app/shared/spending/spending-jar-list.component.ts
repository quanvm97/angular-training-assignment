import { Component, input } from '@angular/core';

import { SpendingByJar } from '../../core/budget.models';
import { isOverBudget, progressWidth } from '../../core/jar-presentation';
import { formatPercent, formatVnd } from '../../core/money';

@Component({
  selector: 'app-spending-jar-list',
  templateUrl: './spending-jar-list.component.html'
})
export class SpendingJarListComponent {
  readonly jars = input.required<SpendingByJar[]>();
  readonly formatVnd = formatVnd;
  readonly formatPercent = formatPercent;
  readonly progressWidth = progressWidth;
  readonly isOverBudget = isOverBudget;

  label(jar: SpendingByJar): string {
    const status = this.isOverBudget(jar.percentageUsed) ? 'Over budget. ' : '';
    return `${status}${jar.jarName}: spent ${formatVnd(jar.spentBudgetVnd)} of ${formatVnd(jar.plannedBudgetVnd)}, ${formatPercent(jar.percentageUsed)}`;
  }
}
