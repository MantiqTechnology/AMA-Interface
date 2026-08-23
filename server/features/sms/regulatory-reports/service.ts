import { randomUUID } from 'node:crypto';
import type { RegulatoryReportInput, RegulatoryReportListQuery } from './types';
import { DomainError, notFound } from '../../../utils/errors';
import { RegulatoryReportRepository } from './repository';
import { SafetyReportRepository } from '../safety-reports/repository';

export class RegulatoryReportService {
  constructor(
    private readonly repository: RegulatoryReportRepository,
    private readonly safetyReportRepository: SafetyReportRepository
  ) {}

  list(query: RegulatoryReportListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Regulatory Report', id);
    return row;
  }

  async generateReport(input: RegulatoryReportInput) {
    // Validasi Laporan Internal Sumber
    if (input.sourceReportId) {
      const source = await this.safetyReportRepository.getById(input.sourceReportId);
      if (!source) {
        throw new DomainError(
          'INVALID_SOURCE_REPORT',
          'Source Safety Report tidak ditemukan di dalam sistem.',
          422
        );
      }
    }

    try {
      const id = 'reg-' + randomUUID();
      
      // Auto-generate Nomor Referensi MOR (Misal: MOR-202608-XXXX)
      const yearMonthStr = new Date().toISOString().slice(0, 7).replace(/-/g, '');
      const shortId = id.split('-')[1].substring(0, 4).toUpperCase();
      const typeStr = input.reportType ?? 'MOR';
      const referenceNumber = `${typeStr}-${yearMonthStr}-${shortId}`;

      return await this.repository.create(
        id,
        referenceNumber,
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async submitToAuthority(id: string, receiptNumber?: string) {
    await this.get(id); // Pastikan record ada
    try {
      const row = await this.repository.markAsSubmitted(id, receiptNumber ?? null, new Date().toISOString());
      if (!row) throw notFound('Regulatory Report', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError('REGULATORY_REPORT_DUPLICATE', 'Report reference number already exists.', 409);
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('REGULATORY_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}