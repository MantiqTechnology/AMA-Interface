import { randomUUID } from 'node:crypto';
import type { VendorInput, VendorListQuery } from '../../../../shared/features/finance/vendors';
import { DomainError, notFound } from '../../../utils/errors';
import { StationsRepository } from '../../operations/stations/repository';
import { PaymentTermRepository } from '../payment-terms/repository';
import { VendorRepository } from './repository';

export class VendorService {
  constructor(
    private readonly repository: VendorRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly paymentTermsRepository: PaymentTermRepository
  ) {}
  list(query: VendorListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Vendor', id);
    return row;
  }
  async create(input: VendorInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'vendors-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: VendorInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('Vendor', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('Vendor', id);
    return row;
  }
  private async validate(input: VendorInput) {
    if (input.stationId && !(await this.stationsRepository.getById(input.stationId))?.isActive)
      throw new DomainError(
        'VENDORS_STATION_ID_INVALID',
        'Coverage station must reference an active record.',
        422
      );
    if (
      input.paymentTermId &&
      !(await this.paymentTermsRepository.getById(input.paymentTermId))?.isActive
    )
      throw new DomainError(
        'VENDORS_PAYMENT_TERM_ID_INVALID',
        'Payment term must reference an active record.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'VENDORS_DUPLICATE',
        'Vendor code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('VENDORS_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
