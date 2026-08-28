import { randomUUID } from 'node:crypto';
import type { SafetyReportInput, SafetyReportListQuery, SafetyReportStatus } from './types'; // <-- IMPORT LOKAL DARI SINI
import { DomainError, notFound } from '../../../utils/errors';
import { AircraftRepository } from '../../operations/aircraft/repository';
import { StationsRepository } from '../../operations/stations/repository';
import { SafetyReportRepository } from './repository';

export class SafetyReportService {
  constructor(
    private readonly repository: SafetyReportRepository,
    private readonly aircraftRepository: AircraftRepository,
    private readonly stationsRepository: StationsRepository
  ) {}

  list(query: SafetyReportListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Safety Report', id);
    return row;
  }

  async create(input: SafetyReportInput) {
    await this.validate(input);
    try {
      const id = 'srep-' + randomUUID();

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const shortId = id.split('-')[1].substring(0, 4).toUpperCase();
      const prefix = input.reportCategory.substring(0, 3).toUpperCase();
      const reportNumber = `${prefix}-${dateStr}-${shortId}`;

      return await this.repository.create(id, reportNumber, input, new Date().toISOString());
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async updateStatus(id: string, status: SafetyReportStatus) {
    await this.get(id);
    try {
      const row = await this.repository.updateStatus(id, status, new Date().toISOString());
      if (!row) throw notFound('Safety Report', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  private async validate(input: SafetyReportInput) {
    if (input.stationId && !(await this.stationsRepository.getById(input.stationId))) {
      throw new DomainError(
        'SAFETY_REPORT_STATION_ID_INVALID',
        'Station ID must reference an active record.',
        422
      );
    }

    if (input.aircraftId && !(await this.aircraftRepository.getById(input.aircraftId))) {
      throw new DomainError(
        'SAFETY_REPORT_AIRCRAFT_ID_INVALID',
        'Aircraft ID must reference a valid record.',
        422
      );
    }

    if (!input.description || input.description.trim().length < 10) {
      throw new DomainError(
        'SAFETY_REPORT_DESCRIPTION_TOO_SHORT',
        'Please provide a description of at least 10 characters.',
        422
      );
    }
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError('SAFETY_REPORT_DUPLICATE', 'Report number already exists.', 409);
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('SAFETY_REPORT_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
