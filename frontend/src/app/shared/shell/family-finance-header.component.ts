import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-family-finance-header',
  imports: [RouterLink],
  templateUrl: './family-finance-header.component.html'
})
export class FamilyFinanceHeaderComponent {
  readonly context = input<string | null>(null);
}
