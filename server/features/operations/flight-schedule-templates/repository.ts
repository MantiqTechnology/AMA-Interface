import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { flightScheduleTemplates } from '../../../db/schema';
import type {
  FlightScheduleTemplateDto,
  FlightScheduleTemplateInput,
  FlightScheduleTemplateListQuery,
  FlightScheduleTemplateOption
} from '../../../../shared/features/operations/flight-schedule-templates';

function toDto(row: typeof flightScheduleTemplates.$inferSelect): FlightScheduleTemplateDto {
  return {
    id: row.id,
    templateCode: row.templateCode,
    routeId: row.routeId,
    serviceTypeId: row.serviceTypeId,
    defaultAircraftId: row.defaultAircraftId,
    operatingDays: row.operatingDays.split(',').filter(Boolean),
    departureTimeLocal: row.departureTimeLocal,
    arrivalTimeLocal: row.arrivalTimeLocal,
    bookingOpenHoursBefore: row.bookingOpenHoursBefore,
    bookingCloseMinutesBefore: row.bookingCloseMinutesBefore,
    scheduleNote: row.scheduleNote,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class FlightScheduleTemplateRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: FlightScheduleTemplateListQuery): Promise<FlightScheduleTemplateDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(flightScheduleTemplates.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(flightScheduleTemplates.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(flightScheduleTemplates.templateCode, term),
          like(flightScheduleTemplates.operatingDays, term),
          like(flightScheduleTemplates.scheduleNote, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(flightScheduleTemplates)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(flightScheduleTemplates.templateCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<FlightScheduleTemplateDto | null> {
    const row = await this.db
      .select()
      .from(flightScheduleTemplates)
      .where(eq(flightScheduleTemplates.id, id))
      .get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: FlightScheduleTemplateInput, timestamp: string) {
    const values = { ...input, operatingDays: input.operatingDays.join(',') };
    const row = await this.db
      .insert(flightScheduleTemplates)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: FlightScheduleTemplateInput, timestamp: string) {
    const values = { ...input, operatingDays: input.operatingDays.join(',') };
    const row = await this.db
      .update(flightScheduleTemplates)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(flightScheduleTemplates.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(flightScheduleTemplates)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(flightScheduleTemplates.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<FlightScheduleTemplateOption[]> {
    const rows = await this.db
      .select({
        id: flightScheduleTemplates.id,
        templateCode: flightScheduleTemplates.templateCode,
        routeId: flightScheduleTemplates.routeId,
        serviceTypeId: flightScheduleTemplates.serviceTypeId,
        defaultAircraftId: flightScheduleTemplates.defaultAircraftId,
        operatingDays: flightScheduleTemplates.operatingDays,
        departureTimeLocal: flightScheduleTemplates.departureTimeLocal,
        arrivalTimeLocal: flightScheduleTemplates.arrivalTimeLocal,
        bookingOpenHoursBefore: flightScheduleTemplates.bookingOpenHoursBefore,
        bookingCloseMinutesBefore: flightScheduleTemplates.bookingCloseMinutesBefore,
        scheduleNote: flightScheduleTemplates.scheduleNote
      })
      .from(flightScheduleTemplates)
      .where(eq(flightScheduleTemplates.isActive, true))
      .orderBy(asc(flightScheduleTemplates.templateCode));
    return rows.map((row) => ({
      ...row,
      operatingDays: row.operatingDays.split(',').filter(Boolean)
    }));
  }
}
