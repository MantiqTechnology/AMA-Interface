import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { emergencyActivations } from '../../../db/schema';
import type { EmergencyActivationDto, EmergencyActivationInput, EmergencyStatus } from './types';

function toDto(row: typeof emergencyActivations.$inferSelect): EmergencyActivationDto {
  return {
    id: row.id,
    activationNumber: row.activationNumber,
    flightOperationId: row.flightOperationId,
    aircraftId: row.aircraftId,
    stationId: row.stationId,
    
    // Pemetaan data SAR ICAO / BASARNAS
    icaoPhase: row.icaoPhase as EmergencyActivationDto['icaoPhase'],
    natureOfEmergency: row.natureOfEmergency,
    pob: row.pob,
    endurance: row.endurance,
    lkp: row.lkp,
    
    declaredByUserId: row.declaredByUserId,
    declaredAt: row.declaredAt,
    broadcastStatusJson: row.broadcastStatusJson,
    status: row.status as EmergencyStatus,
    closedAt: row.closedAt,
    closureReason: row.closureReason,
    createdAt: row.createdAt
  };
}

export class EmergencyActivationRepository {
  constructor(private readonly db: AppDatabase) {}

  async getActiveActivations(): Promise<EmergencyActivationDto[]> {
    const rows = await this.db
      .select()
      .from(emergencyActivations)
      .where(eq(emergencyActivations.status, 'ACTIVE'))
      .orderBy(desc(emergencyActivations.declaredAt));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<EmergencyActivationDto | null> {
    const row = await this.db.select().from(emergencyActivations).where(eq(emergencyActivations.id, id)).get();
    return row ? toDto(row) : null;
  }

  async create(id: string, activationNumber: string, input: EmergencyActivationInput, timestamp: string) {
    const row = await this.db
      .insert(emergencyActivations)
      .values({
        id,
        activationNumber,
        flightOperationId: input.flightOperationId ?? null,
        aircraftId: input.aircraftId ?? null,
        stationId: input.stationId ?? null,
        
        // Injeksi data SAR ICAO / BASARNAS ke dalam database
        icaoPhase: input.icaoPhase,
        natureOfEmergency: input.natureOfEmergency,
        pob: input.pob ?? null,
        endurance: input.endurance ?? null,
        lkp: input.lkp ?? null,
        
        declaredByUserId: input.declaredByUserId,
        declaredAt: timestamp,
        status: 'ACTIVE',
        // Default payload JSON mencakup simulasi koneksi API eksternal
        broadcastStatusJson: JSON.stringify({ 
          basarnas_api: 'ACKNOWLEDGED', 
          whatsapp: 'PENDING', 
          sms: 'PENDING', 
          email: 'PENDING' 
        }),
        createdAt: timestamp
      })
      .returning()
      .get();
    return toDto(row);
  }

  async close(id: string, reason: string, timestamp: string) {
    const row = await this.db
      .update(emergencyActivations)
      .set({ status: 'CLOSED', closedAt: timestamp, closureReason: reason })
      .where(eq(emergencyActivations.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }
}