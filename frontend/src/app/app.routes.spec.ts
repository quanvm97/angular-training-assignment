import { describe, expect, it } from 'vitest';

import { routes } from './app.routes';

describe('routes', () => {
  it('defines the application navigation routes', () => {
    expect(routes).toEqual([
      expect.objectContaining({ path: '', redirectTo: 'monthly-planning' }),
      expect.objectContaining({ path: 'monthly-planning' }),
      expect.objectContaining({ path: '**', redirectTo: 'monthly-planning' })
    ]);
  });
});
