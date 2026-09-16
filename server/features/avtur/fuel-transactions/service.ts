import { randomUUID } from 'node:crypto';
import { DomainError, notFound } from '../../../utils/errors';
import { FuelTransactionRepository } from './repository';
import type { AvturTransactionListQuery, CreateAvturTransactionInput } from './types';

export class FuelTransactionService {
  constructor(private readonly repository: FuelTransactionRepository) {}

  list(query: AvturTransactionListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Avtur Transaction', id);
    return row;
  }

  async createTransaction(input: CreateAvturTransactionInput) {
    this.validateInterlocks(input);

    try {
      const id = 'tx-' + randomUUID();
      const yearStr = new Date().toISOString().slice(0, 4);
      const shortId = id.split('-')[1].substring(0, 4).toUpperCase();
      const transactionNo = `TRX-AVT-${yearStr}-${shortId}`;
      const now = new Date().toISOString();

      return await this.repository.create(id, transactionNo, input, now);
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  private validateInterlocks(input: CreateAvturTransactionInput) {
    if (!input.groundingVerified) {
      throw new DomainError('AVTUR_INTERLOCK_GROUNDING', 'Grounding clamp must be verified before fueling.', 400);
    }
    if (!input.swdTestPassed) {
      throw new DomainError('AVTUR_INTERLOCK_SWD', 'Shell Water Detector (SWD) test must pass.', 400);
    }
    if (!input.settlingTimePassed) {
      throw new DomainError('AVTUR_INTERLOCK_SETTLING', 'Fuel settling time requirement not met.', 400);
    }
    if (!input.sealIntact) {
      throw new DomainError('AVTUR_INTERLOCK_SEAL', 'Container / Skid seal is broken or invalid.', 400);
    }
    if (input.flowmeterEndKg < input.flowmeterStartKg) {
      throw new DomainError('AVTUR_FLOWMETER_INVALID', 'Flowmeter end reading cannot be less than start reading.', 422);
    }
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      throw new DomainError('AVTUR_TX_DUPLICATE', 'Transaction number already exists.', 409);
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      throw new DomainError('AVTUR_TX_RELATION_INVALID', 'Referenced Asset or Mission ID does not exist.', 422);
    }
    throw error;
  }
}