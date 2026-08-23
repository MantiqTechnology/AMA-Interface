import { randomUUID } from 'node:crypto';
import type { CapaTicketInput, CapaListQuery, CapaStatus } from './types';
import { DomainError, notFound } from '../../../utils/errors';
import { CapaTicketRepository } from './repository';
import { SafetyReportRepository } from '../safety-reports/repository';

export class CapaTicketService {
  constructor(
    private readonly repository: CapaTicketRepository,
    private readonly safetyReportRepository: SafetyReportRepository
  ) {}

  list(query: CapaListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('CAPA Ticket', id);
    return row;
  }

  async create(input: CapaTicketInput) {
    await this.validate(input);
    try {
      const id = 'capa-' + randomUUID();
      
      // Auto-generate nomor tiket, misal: CAPA-2026-XXXX
      const yearStr = new Date().toISOString().slice(0, 4);
      const shortId = id.split('-')[1].substring(0, 4).toUpperCase();
      const ticketNumber = `CAPA-${yearStr}-${shortId}`;

      return await this.repository.create(
        id,
        ticketNumber,
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async updateStatus(id: string, status: CapaStatus) {
    await this.get(id); 
    try {
      const row = await this.repository.updateStatus(id, status, new Date().toISOString());
      if (!row) throw notFound('CAPA Ticket', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  // Logika Eksekusi Eskalasi (Terhubung dengan Fitur 9 di Capa.vue)
  async escalateOverdueTicket(id: string, escalatedToUserId: string) {
    const ticket = await this.get(id);
    
    // Pastikan tiket memang overdue sebelum di-eskalasi
    const today = new Date().toISOString().slice(0, 10);
    if (ticket.dueDate >= today) {
        throw new DomainError('CAPA_NOT_OVERDUE', 'Tiket ini belum melewati batas waktu (due date) sehingga tidak bisa dieskalasi.', 400);
    }

    if (ticket.status === 'VERIFIED' || ticket.status === 'CLOSED') {
        throw new DomainError('CAPA_ALREADY_CLOSED', 'Tidak bisa mengeskalasi tiket yang sudah ditutup.', 400);
    }

    try {
      const row = await this.repository.escalate(id, escalatedToUserId, new Date().toISOString());
      if (!row) throw notFound('CAPA Ticket', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  private async validate(input: CapaTicketInput) {
    // Validasi bahwa Source Report ID benar-benar ada di database
    if (input.sourceReportId) {
      const report = await this.safetyReportRepository.getById(input.sourceReportId);
      if (!report) {
        throw new DomainError(
          'CAPA_SOURCE_REPORT_INVALID',
          'Source Safety Report ID is invalid or does not exist.',
          422
        );
      }
    }

    if (!input.subject || input.subject.trim().length < 5) {
      throw new DomainError(
        'CAPA_SUBJECT_TOO_SHORT',
        'Subject is required and must be at least 5 characters.',
        422
      );
    }

    if (!input.dueDate) {
       throw new DomainError('CAPA_DUE_DATE_REQUIRED', 'Due date is mandatory for CAPA tracking.', 422);
    }
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError('CAPA_TICKET_DUPLICATE', 'CAPA Ticket number already exists.', 409);
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('CAPA_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}