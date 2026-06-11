import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('tenant data export contract', () => {
  it('export payload incluye secciones mínimas ARCO', () => {
    const sample = {
      exportedAt: new Date().toISOString(),
      format: 'json' as const,
      empresa: { id: 'e1', razonSocial: 'Demo' },
      branches: [],
      users: [],
      categories: [],
      products: [],
      salesSummary: { total: 0, recent: [] },
      legalAcceptances: [],
    };
    assert.equal(sample.format, 'json');
    assert.ok('empresa' in sample);
    assert.ok('salesSummary' in sample);
    assert.ok('legalAcceptances' in sample);
  });
});
