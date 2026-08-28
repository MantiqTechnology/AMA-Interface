import { randomUUID } from 'node:crypto';
import type { FratAssessmentInput, RiskZone, FratStatus } from './types';
import { DomainError, notFound } from '../../../utils/errors';
import { FratAssessmentRepository } from './repository';

export class FratAssessmentService {
  constructor(private readonly repository: FratAssessmentRepository) {}

  async getByFlightOperation(flightOperationId: string) {
    return this.repository.getByFlightOperationId(flightOperationId);
  }

  async evaluateRisk(input: FratAssessmentInput) {
    this.validateScores(input);

    // 1. Kalkulasi Total Risiko
    const totalScore = input.crewFatigueScore + input.weatherRiskScore + input.airstripRatingScore;

    // 2. Evaluasi Zona & Hard Lock (BR-034)
    let riskZone: RiskZone = 'GREEN';
    let isHardLocked = false;
    let status: FratStatus = 'CLEARED'; // Secara default aman

    // Jika skor total > 75 ATAU jika kelelahan kru tembus batas kritis (> 75)
    if (totalScore > 75 || input.crewFatigueScore > 75) {
      riskZone = 'RED';
      isHardLocked = true;
      status = 'SUBMITTED'; // Tertahan, butuh di-override oleh Chief Pilot
    } else if (totalScore > 40) {
      riskZone = 'YELLOW';
      // Status tetap 'CLEARED' tapi diberi warning di frontend
    }

    try {
      const id = 'frat-' + randomUUID();
      return await this.repository.create(
        id,
        {
          flightOperationId: input.flightOperationId,
          picEmployeeId: input.picEmployeeId,
          crewFatigueScore: input.crewFatigueScore,
          weatherRiskScore: input.weatherRiskScore,
          airstripRatingScore: input.airstripRatingScore,
          totalRiskScore: totalScore,
          riskZone,
          isHardLocked,
          status
        },
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async overrideFrat(id: string, approverId: string, reason: string) {
    const frat = await this.repository.getById(id);
    if (!frat) throw notFound('FRAT Assessment', id);

    if (!frat.isHardLocked) {
      throw new DomainError(
        'FRAT_NOT_LOCKED',
        'FRAT ini tidak dalam status Hard-Lock, tidak perlu di-override.',
        400
      );
    }

    // BR-019: Alasan mitigasi wajib dicatat jika ada override
    if (!reason || reason.trim().length < 10) {
      throw new DomainError(
        'FRAT_OVERRIDE_REASON_SHORT',
        'Alasan atau langkah mitigasi wajib diisi minimal 10 karakter.',
        422
      );
    }

    try {
      const row = await this.repository.overrideHardLock(
        id,
        approverId,
        reason,
        new Date().toISOString()
      );
      if (!row) throw notFound('FRAT Assessment', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  private validateScores(input: FratAssessmentInput) {
    if (input.weatherRiskScore < 0 || input.weatherRiskScore > 25) {
      throw new DomainError(
        'INVALID_WEATHER_SCORE',
        'Weather risk score must be between 0 and 25.',
        422
      );
    }
    if (input.airstripRatingScore < 0 || input.airstripRatingScore > 25) {
      throw new DomainError(
        'INVALID_AIRSTRIP_SCORE',
        'Airstrip rating score must be between 0 and 25.',
        422
      );
    }
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'FRAT_DUPLICATE',
        'FRAT assessment for this flight already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('FRAT_RELATION_INVALID', 'Flight or PIC record is invalid.', 422);
    throw error;
  }
}
