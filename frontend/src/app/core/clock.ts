import { InjectionToken } from '@angular/core';

export const CLOCK = new InjectionToken<() => Date>('CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date()
});
