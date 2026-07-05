import { z } from 'zod';
import { alertDtoSchema } from './alerts';
import { approvalDtoSchema } from './approvals';
import { flightSummaryDtoSchema } from './flights';
import { fuelRequestDtoSchema } from './fuel';
import { invoiceSummaryDtoSchema } from './invoices';
import { stationExpenseDtoSchema } from './station-expenses';

export const dashboardDtoSchema = z.object({
  kpis: z.object({
    activeFlights: z.number().int().nonnegative(),
    pendingApprovals: z.number().int().nonnegative(),
    openFuelRequests: z.number().int().nonnegative(),
    unpaidInvoices: z.number().int().nonnegative()
  }),
  flights: z.array(flightSummaryDtoSchema),
  fuelRequests: z.array(fuelRequestDtoSchema),
  stationExpenses: z.array(stationExpenseDtoSchema),
  invoices: z.array(invoiceSummaryDtoSchema),
  approvals: z.array(approvalDtoSchema),
  alerts: z.array(alertDtoSchema)
});

export type DashboardDto = z.infer<typeof dashboardDtoSchema>;
