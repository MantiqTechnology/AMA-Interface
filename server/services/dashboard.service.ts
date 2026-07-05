import type { DashboardDto } from '../../shared/contracts/dashboard';
import type { Repositories } from '../repositories/interfaces';
import { mapAlert, mapApproval } from './mappers';
import type { FlightsService } from './flights.service';
import type { FuelService } from './fuel.service';
import type { InvoicesService } from './invoices.service';
import type { StationExpensesService } from './station-expenses.service';

export class DashboardService {
  constructor(
    private readonly repositories: Repositories,
    private readonly flights: FlightsService,
    private readonly fuel: FuelService,
    private readonly stationExpenses: StationExpensesService,
    private readonly invoices: InvoicesService
  ) {}

  async getDashboard(): Promise<DashboardDto> {
    const [flights, fuelRequests, stationExpenses, invoices, approvals, alerts] = await Promise.all([
      this.flights.listFlights({ limit: 5, offset: 0 }),
      this.fuel.listRequests({ status: 'requested', limit: 5, offset: 0 }),
      this.stationExpenses.listExpenses({ status: 'submitted', limit: 5, offset: 0 }),
      this.invoices.listInvoices({ limit: 5, offset: 0 }),
      this.repositories.approvals.list({ status: 'pending', limit: 5, offset: 0 }),
      this.repositories.alerts.listRecent(5)
    ]);

    return {
      kpis: {
        activeFlights: flights.filter((flight) =>
          ['scheduled', 'ready', 'dispatched'].includes(flight.status)
        ).length,
        pendingApprovals: approvals.length,
        openFuelRequests: fuelRequests.length,
        unpaidInvoices: invoices.filter((invoice) => invoice.status !== 'paid').length
      },
      flights,
      fuelRequests,
      stationExpenses,
      invoices,
      approvals: approvals.map(mapApproval),
      alerts: alerts.map(mapAlert)
    };
  }
}
