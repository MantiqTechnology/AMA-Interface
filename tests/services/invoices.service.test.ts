import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

describe('InvoicesService', () => {
  it('marks an invoice paid once payments cover the total', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = await services.invoices.getInvoiceDetail('inv-001');

    await services.invoices.recordPayment('inv-001', {
      amount: before.total,
      currency: before.currency,
      paidAt: '2026-07-04T13:00:00.000+07:00',
      method: 'bank_transfer',
      reference: 'TEST-PAID-001'
    });

    const after = await services.invoices.getInvoiceDetail('inv-001');
    expect(after.status).toBe('paid');
    expect(after.balanceDue).toBe(0);

    sqlite.close();
  });
});
