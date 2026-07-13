import { and, desc, eq, or, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { DemoRole } from '../../shared/types/roles';
import type { ApprovalStatus } from '../../shared/contracts/approvals';
import type { FlightStatus, RouteDto } from '../../shared/contracts/flights';
import type { AppDatabase } from '../db/client';
import {
  aircraft,
  alerts,
  approvals,
  customers,
  flightOrders,
  fuelRequests,
  fuelUplifts,
  invoices,
  maintenanceWorkOrders,
  manifests,
  payments,
  routes,
  serializedParts,
  stationExpenses,
  stations
} from '../db/schema';
import type {
  AlertRepository,
  ApprovalRepository,
  FlightJoinedRecord,
  FlightRepository,
  FuelRepository,
  InvoiceRepository,
  MaintenanceRepository,
  MasterDataLookupRepository,
  Repositories,
  StationExpenseRepository
} from './interfaces';

const originStation = alias(stations, 'origin_station');
const destinationStation = alias(stations, 'destination_station');

function applyAnd(conditions: SQL[]) {
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export class SqliteMasterDataLookupRepository implements MasterDataLookupRepository {
  constructor(private readonly db: AppDatabase) {}

  async getAircraft(id: string) {
    const row = await this.db.select().from(aircraft).where(eq(aircraft.id, id)).get();
    return row ?? null;
  }

  async listAircraft() {
    return await this.db.select().from(aircraft).orderBy(aircraft.registrationNumber);
  }

  async getStation(id: string) {
    const row = await this.db.select().from(stations).where(eq(stations.id, id)).get();
    return row ?? null;
  }

  async listStations() {
    return await this.db.select().from(stations).orderBy(stations.stationCode);
  }

  async getCustomer(id: string) {
    const row = await this.db.select().from(customers).where(eq(customers.id, id)).get();
    return row ?? null;
  }

  async getRoute(id: string) {
    const row = await this.db.select().from(routes).where(eq(routes.id, id)).get();
    return row ?? null;
  }

  async getRouteDto(id: string): Promise<RouteDto | null> {
    const row = await this.db
      .select({
        route: routes,
        origin: originStation,
        destination: destinationStation
      })
      .from(routes)
      .innerJoin(originStation, eq(routes.originStationId, originStation.id))
      .innerJoin(destinationStation, eq(routes.destinationStationId, destinationStation.id))
      .where(eq(routes.id, id))
      .get();

    if (!row) {
      return null;
    }

    return {
      id: row.route.id,
      origin: {
        id: row.origin.id,
        code: row.origin.stationCode,
        name: row.origin.stationName,
        province: row.origin.province,
        isActive: row.origin.isActive
      },
      destination: {
        id: row.destination.id,
        code: row.destination.stationCode,
        name: row.destination.stationName,
        province: row.destination.province,
        isActive: row.destination.isActive
      },
      distanceNm: Math.max(1, Math.round(row.route.distanceKm * 0.539957)),
      estimatedBlockMinutes: row.route.estimatedDurationMinutes
    };
  }
}

export class SqliteFlightRepository implements FlightRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(params: {
    status?: FlightStatus;
    station?: string;
    limit: number;
    offset: number;
  }): Promise<FlightJoinedRecord[]> {
    const conditions: SQL[] = [];

    if (params.status) {
      conditions.push(eq(flightOrders.status, params.status));
    }

    if (params.station) {
      const stationCode = params.station.toUpperCase();
      conditions.push(
        or(
          eq(originStation.stationCode, stationCode),
          eq(destinationStation.stationCode, stationCode)
        )!
      );
    }

    const where = applyAnd(conditions);
    const query = this.db
      .select({
        flight: flightOrders,
        customer: customers,
        aircraft,
        route: routes,
        origin: originStation,
        destination: destinationStation,
        manifestCount: sql<number>`(
          SELECT COUNT(*) FROM manifests WHERE manifests.flight_order_id = ${flightOrders.id}
        )`
      })
      .from(flightOrders)
      .innerJoin(customers, eq(flightOrders.customerId, customers.id))
      .innerJoin(aircraft, eq(flightOrders.aircraftId, aircraft.id))
      .innerJoin(routes, eq(flightOrders.routeId, routes.id))
      .innerJoin(originStation, eq(routes.originStationId, originStation.id))
      .innerJoin(destinationStation, eq(routes.destinationStationId, destinationStation.id));

    const rows = where
      ? await query
          .where(where)
          .orderBy(desc(flightOrders.scheduledDeparture))
          .limit(params.limit)
          .offset(params.offset)
      : await query
          .orderBy(desc(flightOrders.scheduledDeparture))
          .limit(params.limit)
          .offset(params.offset);

    return rows.map((row) => ({
      ...row,
      manifestCount: Number(row.manifestCount)
    }));
  }

  async getById(id: string): Promise<FlightJoinedRecord | null> {
    const row = await this.db
      .select({
        flight: flightOrders,
        customer: customers,
        aircraft,
        route: routes,
        origin: originStation,
        destination: destinationStation,
        manifestCount: sql<number>`(
          SELECT COUNT(*) FROM manifests WHERE manifests.flight_order_id = ${flightOrders.id}
        )`
      })
      .from(flightOrders)
      .innerJoin(customers, eq(flightOrders.customerId, customers.id))
      .innerJoin(aircraft, eq(flightOrders.aircraftId, aircraft.id))
      .innerJoin(routes, eq(flightOrders.routeId, routes.id))
      .innerJoin(originStation, eq(routes.originStationId, originStation.id))
      .innerJoin(destinationStation, eq(routes.destinationStationId, destinationStation.id))
      .where(eq(flightOrders.id, id))
      .get();

    return row ? { ...row, manifestCount: Number(row.manifestCount) } : null;
  }

  async listManifest(flightOrderId: string) {
    return await this.db
      .select()
      .from(manifests)
      .where(eq(manifests.flightOrderId, flightOrderId))
      .orderBy(manifests.seatNumber);
  }

  async create(input: typeof flightOrders.$inferInsert) {
    const [created] = await this.db.insert(flightOrders).values(input).returning();
    return created;
  }

  async updateStatus(id: string, status: FlightStatus) {
    const [updated] = await this.db
      .update(flightOrders)
      .set({ status })
      .where(eq(flightOrders.id, id))
      .returning();

    return updated ?? null;
  }
}

export class SqliteFuelRepository implements FuelRepository {
  constructor(private readonly db: AppDatabase) {}

  async listRequests(params: { status?: string; limit: number; offset: number }) {
    const where = params.status ? eq(fuelRequests.status, params.status) : undefined;
    const query = this.db.select().from(fuelRequests);

    return where
      ? await query
          .where(where)
          .orderBy(desc(fuelRequests.requiredAt))
          .limit(params.limit)
          .offset(params.offset)
      : await query
          .orderBy(desc(fuelRequests.requiredAt))
          .limit(params.limit)
          .offset(params.offset);
  }

  async getRequest(id: string) {
    const row = await this.db.select().from(fuelRequests).where(eq(fuelRequests.id, id)).get();
    return row ?? null;
  }

  async createRequest(input: typeof fuelRequests.$inferInsert) {
    const [created] = await this.db.insert(fuelRequests).values(input).returning();
    return created;
  }

  async updateRequestStatus(id: string, status: string) {
    const [updated] = await this.db
      .update(fuelRequests)
      .set({ status })
      .where(eq(fuelRequests.id, id))
      .returning();
    return updated ?? null;
  }

  async createUplift(input: typeof fuelUplifts.$inferInsert) {
    const [created] = await this.db.insert(fuelUplifts).values(input).returning();
    return created;
  }

  async listUplifts(fuelRequestId: string) {
    return await this.db
      .select()
      .from(fuelUplifts)
      .where(eq(fuelUplifts.fuelRequestId, fuelRequestId))
      .orderBy(desc(fuelUplifts.upliftedAt));
  }
}

export class SqliteStationExpenseRepository implements StationExpenseRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(params: { status?: string; stationId?: string; limit: number; offset: number }) {
    const conditions: SQL[] = [];
    if (params.status) {
      conditions.push(eq(stationExpenses.status, params.status));
    }
    if (params.stationId) {
      conditions.push(eq(stationExpenses.stationId, params.stationId));
    }

    const where = applyAnd(conditions);
    const query = this.db.select().from(stationExpenses);

    return where
      ? await query
          .where(where)
          .orderBy(desc(stationExpenses.incurredAt))
          .limit(params.limit)
          .offset(params.offset)
      : await query
          .orderBy(desc(stationExpenses.incurredAt))
          .limit(params.limit)
          .offset(params.offset);
  }

  async getById(id: string) {
    const row = await this.db
      .select()
      .from(stationExpenses)
      .where(eq(stationExpenses.id, id))
      .get();
    return row ?? null;
  }

  async create(input: typeof stationExpenses.$inferInsert) {
    const [created] = await this.db.insert(stationExpenses).values(input).returning();
    return created;
  }

  async updateStatus(id: string, status: string) {
    const [updated] = await this.db
      .update(stationExpenses)
      .set({ status })
      .where(eq(stationExpenses.id, id))
      .returning();
    return updated ?? null;
  }

  async attachReceipt(id: string, receiptPath: string) {
    const [updated] = await this.db
      .update(stationExpenses)
      .set({ receiptPath })
      .where(eq(stationExpenses.id, id))
      .returning();
    return updated ?? null;
  }
}

export class SqliteInvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(params: { status?: string; limit: number; offset: number }) {
    const where = params.status ? eq(invoices.status, params.status) : undefined;
    const query = this.db.select().from(invoices);

    return where
      ? await query
          .where(where)
          .orderBy(desc(invoices.issuedAt))
          .limit(params.limit)
          .offset(params.offset)
      : await query.orderBy(desc(invoices.issuedAt)).limit(params.limit).offset(params.offset);
  }

  async getById(id: string) {
    const row = await this.db.select().from(invoices).where(eq(invoices.id, id)).get();
    return row ?? null;
  }

  async updateStatus(id: string, status: string) {
    const [updated] = await this.db
      .update(invoices)
      .set({ status })
      .where(eq(invoices.id, id))
      .returning();
    return updated ?? null;
  }

  async createPayment(input: typeof payments.$inferInsert) {
    const [created] = await this.db.insert(payments).values(input).returning();
    return created;
  }

  async listPayments(invoiceId: string) {
    return await this.db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(desc(payments.paidAt));
  }
}

export class SqliteApprovalRepository implements ApprovalRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(params: {
    status?: ApprovalStatus;
    roleRequired?: DemoRole;
    limit: number;
    offset: number;
  }) {
    const conditions: SQL[] = [];
    if (params.status) {
      conditions.push(eq(approvals.status, params.status));
    }
    if (params.roleRequired) {
      conditions.push(eq(approvals.roleRequired, params.roleRequired));
    }

    const where = applyAnd(conditions);
    const query = this.db.select().from(approvals);

    return where
      ? await query
          .where(where)
          .orderBy(desc(approvals.createdAt))
          .limit(params.limit)
          .offset(params.offset)
      : await query.orderBy(desc(approvals.createdAt)).limit(params.limit).offset(params.offset);
  }

  async getById(id: string) {
    const row = await this.db.select().from(approvals).where(eq(approvals.id, id)).get();
    return row ?? null;
  }

  async create(input: typeof approvals.$inferInsert) {
    const [created] = await this.db.insert(approvals).values(input).returning();
    return created;
  }

  async decide(input: {
    id: string;
    status: ApprovalStatus;
    decidedBy: string;
    decidedAt: string;
    reason?: string;
  }) {
    const [updated] = await this.db
      .update(approvals)
      .set({
        status: input.status,
        decidedBy: input.decidedBy,
        decidedAt: input.decidedAt,
        reason: input.reason
      })
      .where(eq(approvals.id, input.id))
      .returning();

    return updated ?? null;
  }
}

export class SqliteMaintenanceRepository implements MaintenanceRepository {
  constructor(private readonly db: AppDatabase) {}

  async listWorkOrders(params: {
    status?: string;
    aircraftId?: string;
    limit: number;
    offset: number;
  }) {
    const conditions: SQL[] = [];
    if (params.status) {
      conditions.push(eq(maintenanceWorkOrders.status, params.status));
    }
    if (params.aircraftId) {
      conditions.push(eq(maintenanceWorkOrders.aircraftId, params.aircraftId));
    }

    const where = applyAnd(conditions);
    const query = this.db.select().from(maintenanceWorkOrders);

    return where
      ? await query
          .where(where)
          .orderBy(desc(maintenanceWorkOrders.openedAt))
          .limit(params.limit)
          .offset(params.offset)
      : await query
          .orderBy(desc(maintenanceWorkOrders.openedAt))
          .limit(params.limit)
          .offset(params.offset);
  }

  async getWorkOrder(id: string) {
    const row = await this.db
      .select()
      .from(maintenanceWorkOrders)
      .where(eq(maintenanceWorkOrders.id, id))
      .get();
    return row ?? null;
  }

  async createWorkOrder(input: typeof maintenanceWorkOrders.$inferInsert) {
    const [created] = await this.db.insert(maintenanceWorkOrders).values(input).returning();
    return created;
  }

  async closeWorkOrder(id: string, closedAt: string, closingNotes?: string) {
    const row = await this.getWorkOrder(id);
    const description = closingNotes
      ? `${row?.description ?? ''}\nClose notes: ${closingNotes}`
      : row?.description;

    const [updated] = await this.db
      .update(maintenanceWorkOrders)
      .set({ status: 'closed', closedAt, description })
      .where(eq(maintenanceWorkOrders.id, id))
      .returning();
    return updated ?? null;
  }

  async listPartsByWorkOrder(workOrderId: string) {
    return await this.db
      .select()
      .from(serializedParts)
      .where(eq(serializedParts.workOrderId, workOrderId))
      .orderBy(serializedParts.partNumber);
  }

  async listPartsByAircraft(aircraftId: string) {
    return await this.db
      .select()
      .from(serializedParts)
      .where(eq(serializedParts.aircraftId, aircraftId))
      .orderBy(serializedParts.partNumber);
  }
}

export class SqliteAlertRepository implements AlertRepository {
  constructor(private readonly db: AppDatabase) {}

  async listRecent(limit: number) {
    return await this.db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(limit);
  }

  async create(input: typeof alerts.$inferInsert) {
    const [created] = await this.db.insert(alerts).values(input).returning();
    return created;
  }
}

export function createSqliteRepositories(db: AppDatabase): Repositories {
  return {
    references: new SqliteMasterDataLookupRepository(db),
    flights: new SqliteFlightRepository(db),
    fuel: new SqliteFuelRepository(db),
    stationExpenses: new SqliteStationExpenseRepository(db),
    invoices: new SqliteInvoiceRepository(db),
    approvals: new SqliteApprovalRepository(db),
    maintenance: new SqliteMaintenanceRepository(db),
    alerts: new SqliteAlertRepository(db)
  };
}
