import { nanoid } from 'nanoid';
import type {
  CloseWorkOrderBody,
  CreateWorkOrderBody
} from '../../shared/contracts/maintenance';
import type { Repositories } from '../repositories/interfaces';
import { notFound } from '../utils/errors';
import { mapMaintenanceWorkOrder } from './mappers';

export class MaintenanceService {
  constructor(private readonly repositories: Repositories) {}

  async listWorkOrders(query: { status?: string; aircraftId?: string; limit: number; offset: number }) {
    const rows = await this.repositories.maintenance.listWorkOrders(query);
    return await Promise.all(rows.map((row) => this.mapWorkOrder(row.id)));
  }

  async getWorkOrder(id: string) {
    return await this.mapWorkOrder(id);
  }

  async createWorkOrder(input: CreateWorkOrderBody) {
    const aircraft = await this.repositories.references.getAircraft(input.aircraftId);
    if (!aircraft) {
      throw notFound('Aircraft', input.aircraftId);
    }

    const created = await this.repositories.maintenance.createWorkOrder({
      id: nanoid(),
      aircraftId: input.aircraftId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: 'open',
      openedAt: new Date().toISOString(),
      closedAt: null,
      dueAt: input.dueAt
    });

    await this.repositories.alerts.create({
      id: nanoid(),
      severity: input.priority === 'aog' ? 'critical' : 'warning',
      title: 'Maintenance work order opened',
      message: `${created.title} opened for ${aircraft.tailNumber}`,
      entityType: 'maintenance_work_order',
      entityId: created.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return await this.mapWorkOrder(created.id);
  }

  async closeWorkOrder(id: string, input: CloseWorkOrderBody) {
    const updated = await this.repositories.maintenance.closeWorkOrder(
      id,
      input.closedAt,
      input.closingNotes
    );
    if (!updated) {
      throw notFound('Maintenance work order', id);
    }

    return await this.mapWorkOrder(id);
  }

  private async mapWorkOrder(id: string) {
    const workOrder = await this.repositories.maintenance.getWorkOrder(id);
    if (!workOrder) {
      throw notFound('Maintenance work order', id);
    }

    const [aircraft, parts] = await Promise.all([
      this.repositories.references.getAircraft(workOrder.aircraftId),
      this.repositories.maintenance.listPartsByWorkOrder(id)
    ]);

    if (!aircraft) {
      throw notFound('Aircraft', workOrder.aircraftId);
    }

    return mapMaintenanceWorkOrder(workOrder, aircraft, parts);
  }
}
