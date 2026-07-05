import { nanoid } from 'nanoid';
import type { CreateStationExpenseBody } from '../../shared/contracts/station-expenses';
import type { Repositories } from '../repositories/interfaces';
import { notFound } from '../utils/errors';
import { mapStationExpense } from './mappers';

export class StationExpensesService {
  constructor(private readonly repositories: Repositories) {}

  async listExpenses(query: { status?: string; stationId?: string; limit: number; offset: number }) {
    const rows = await this.repositories.stationExpenses.list(query);
    return await Promise.all(rows.map((row) => this.mapExpense(row.id)));
  }

  async createExpense(input: CreateStationExpenseBody) {
    const station = await this.repositories.references.getStation(input.stationId);
    if (!station) {
      throw notFound('Station', input.stationId);
    }

    if (input.flightOrderId) {
      const flight = await this.repositories.flights.getById(input.flightOrderId);
      if (!flight) {
        throw notFound('Flight order', input.flightOrderId);
      }
    }

    const created = await this.repositories.stationExpenses.create({
      id: nanoid(),
      ...input,
      flightOrderId: input.flightOrderId ?? null,
      receiptPath: input.receiptPath ?? null,
      status: 'draft'
    });

    return await this.mapExpense(created.id);
  }

  async submitExpense(id: string) {
    const updated = await this.repositories.stationExpenses.updateStatus(id, 'submitted');
    if (!updated) {
      throw notFound('Station expense', id);
    }

    await this.repositories.approvals.create({
      id: nanoid(),
      domainEntity: 'station_expense',
      entityId: id,
      requestedBy: updated.submittedBy,
      roleRequired: 'Director',
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      reason: null,
      createdAt: new Date().toISOString()
    });

    return await this.mapExpense(id);
  }

  async attachReceipt(id: string, receiptPath: string) {
    const updated = await this.repositories.stationExpenses.attachReceipt(id, receiptPath);
    if (!updated) {
      throw notFound('Station expense', id);
    }

    return await this.mapExpense(id);
  }

  private async mapExpense(id: string) {
    const expense = await this.repositories.stationExpenses.getById(id);
    if (!expense) {
      throw notFound('Station expense', id);
    }

    const [station, flight] = await Promise.all([
      this.repositories.references.getStation(expense.stationId),
      expense.flightOrderId ? this.repositories.flights.getById(expense.flightOrderId) : null
    ]);

    if (!station) {
      throw notFound('Station', expense.stationId);
    }

    return mapStationExpense(expense, station, flight);
  }
}
