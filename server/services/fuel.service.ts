import { nanoid } from 'nanoid';
import type {
  CreateFuelRequestBody,
  RecordFuelUpliftBody
} from '../../shared/contracts/fuel';
import type { Repositories } from '../repositories/interfaces';
import { DomainError, notFound } from '../utils/errors';
import { mapFuelRequest, mapFuelUplift } from './mappers';

export class FuelService {
  constructor(private readonly repositories: Repositories) {}

  async listRequests(query: { status?: string; limit: number; offset: number }) {
    const rows = await this.repositories.fuel.listRequests(query);
    return await Promise.all(rows.map((row) => this.mapRequest(row.id)));
  }

  async getRequest(id: string) {
    return await this.mapRequest(id);
  }

  async createRequest(input: CreateFuelRequestBody) {
    const [flight, station, aircraft] = await Promise.all([
      this.repositories.flights.getById(input.flightOrderId),
      this.repositories.references.getStation(input.stationId),
      this.repositories.references.getAircraft(input.aircraftId)
    ]);

    if (!flight) throw notFound('Flight order', input.flightOrderId);
    if (!station) throw notFound('Station', input.stationId);
    if (!aircraft) throw notFound('Aircraft', input.aircraftId);

    const created = await this.repositories.fuel.createRequest({
      id: nanoid(),
      ...input,
      status: 'requested',
      notes: input.notes ?? null
    });

    await this.repositories.approvals.create({
      id: nanoid(),
      domainEntity: 'fuel_request',
      entityId: created.id,
      requestedBy: input.requestedBy,
      roleRequired: 'Director',
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      reason: null,
      createdAt: new Date().toISOString()
    });

    return mapFuelRequest(created, flight, station, aircraft);
  }

  async approveRequest(id: string, decidedBy = 'Director') {
    const request = await this.repositories.fuel.updateRequestStatus(id, 'approved');
    if (!request) {
      throw notFound('Fuel request', id);
    }

    await this.repositories.alerts.create({
      id: nanoid(),
      severity: 'info',
      title: 'Fuel request approved',
      message: `${request.requestedLiters} liters approved for uplift`,
      entityType: 'fuel_request',
      entityId: id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    const approvals = await this.repositories.approvals.list({
      status: 'pending',
      limit: 100,
      offset: 0
    });
    const linkedApproval = approvals.find(
      (approval) => approval.domainEntity === 'fuel_request' && approval.entityId === id
    );
    if (linkedApproval) {
      await this.repositories.approvals.decide({
        id: linkedApproval.id,
        status: 'approved',
        decidedBy,
        decidedAt: new Date().toISOString(),
        reason: 'Approved through fuel action'
      });
    }

    return await this.mapRequest(id);
  }

  async recordUplift(id: string, input: RecordFuelUpliftBody) {
    const request = await this.repositories.fuel.getRequest(id);
    if (!request) {
      throw notFound('Fuel request', id);
    }
    if (!['approved', 'uplifted'].includes(request.status)) {
      throw new DomainError('FUEL_NOT_APPROVED', 'Fuel request must be approved before uplift', 409);
    }

    const created = await this.repositories.fuel.createUplift({
      id: nanoid(),
      fuelRequestId: id,
      supplier: input.supplier,
      liters: input.liters,
      unitPrice: input.unitPrice,
      total: input.liters * input.unitPrice,
      currency: input.currency,
      upliftedAt: input.upliftedAt,
      receiptPath: input.receiptPath ?? null
    });
    await this.repositories.fuel.updateRequestStatus(id, 'uplifted');

    return mapFuelUplift(created);
  }

  private async mapRequest(id: string) {
    const request = await this.repositories.fuel.getRequest(id);
    if (!request) {
      throw notFound('Fuel request', id);
    }

    const [flight, station, aircraft] = await Promise.all([
      this.repositories.flights.getById(request.flightOrderId),
      this.repositories.references.getStation(request.stationId),
      this.repositories.references.getAircraft(request.aircraftId)
    ]);

    if (!flight) throw notFound('Flight order', request.flightOrderId);
    if (!station) throw notFound('Station', request.stationId);
    if (!aircraft) throw notFound('Aircraft', request.aircraftId);

    return mapFuelRequest(request, flight, station, aircraft);
  }
}
