import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

describe('FuelService', () => {
  it('approves a fuel request and records an uplift', async () => {
    const { services, sqlite } = await createSeededTestServices();

    const approved = await services.fuel.approveRequest('fr-002', 'Director');
    expect(approved.status).toBe('approved');

    const uplift = await services.fuel.recordUplift('fr-002', {
      supplier: 'PT Demo Avtur Wamena',
      liters: 410,
      unitPrice: 19000,
      currency: 'IDR',
      upliftedAt: '2026-07-04T12:05:00.000+07:00',
      receiptPath: '/uploads/mock-receipts/test-uplift.txt'
    });

    expect(uplift.total).toBe(7790000);
    expect((await services.fuel.getRequest('fr-002')).status).toBe('uplifted');

    sqlite.close();
  });
});
