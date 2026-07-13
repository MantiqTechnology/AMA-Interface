import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { rateCards } from '../../../db/schema';
import type {
  RateCardDto,
  RateCardInput,
  RateCardListQuery,
  RateCardOption
} from '../../../../shared/features/commercial/rates';

function toDto(row: typeof rateCards.$inferSelect): RateCardDto {
  return {
    id: row.id,
    rateCode: row.rateCode,
    serviceType: row.serviceType,
    originStationId: row.originStationId,
    destinationStationId: row.destinationStationId,
    customerId: row.customerId,
    aircraftType: row.aircraftType,
    currencyId: row.currencyId,
    taxCodeId: row.taxCodeId,
    baseRate: row.baseRate,
    rateUnit: row.rateUnit,
    pricingScope: row.pricingScope,
    bookingChannel: row.bookingChannel,
    passengerType: row.passengerType,
    cargoPriceBasis: row.cargoPriceBasis,
    ratePriority: row.ratePriority,
    minimumCharge: row.minimumCharge,
    demoUsageNote: row.demoUsageNote,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class RateCardRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(query: RateCardListQuery): Promise<RateCardDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(eq(rateCards.isActive, true));
    if (query.active === 'inactive') conditions.push(eq(rateCards.isActive, false));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(rateCards.rateCode, term),
          like(rateCards.serviceType, term),
          like(rateCards.aircraftType, term),
          like(rateCards.pricingScope, term),
          like(rateCards.bookingChannel, term),
          like(rateCards.passengerType, term),
          like(rateCards.cargoPriceBasis, term),
          like(rateCards.demoUsageNote, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(rateCards)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(rateCards.rateCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<RateCardDto | null> {
    const row = await this.db.select().from(rateCards).where(eq(rateCards.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, input: RateCardInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .insert(rateCards)
      .values({ id, ...values, isActive: true, createdAt: timestamp, updatedAt: timestamp })
      .returning()
      .get();
    return toDto(row);
  }

  async update(id: string, input: RateCardInput, timestamp: string) {
    const values = input;
    const row = await this.db
      .update(rateCards)
      .set({ ...values, updatedAt: timestamp })
      .where(eq(rateCards.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async setActive(id: string, isActive: boolean, timestamp: string) {
    const row = await this.db
      .update(rateCards)
      .set({ isActive, updatedAt: timestamp })
      .where(eq(rateCards.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<RateCardOption[]> {
    return await this.db
      .select({
        id: rateCards.id,
        rateCode: rateCards.rateCode,
        serviceType: rateCards.serviceType
      })
      .from(rateCards)
      .where(eq(rateCards.isActive, true))
      .orderBy(asc(rateCards.rateCode));
  }
}
