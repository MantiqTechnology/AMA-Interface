import { randomUUID } from 'node:crypto';
import type {
  HandlingParkingSupplierInput,
  HandlingParkingSupplierListQuery
} from '../../../../shared/features/finance/handling-parking-suppliers';
import { DomainError, notFound } from '../../../utils/errors';
import { StationsRepository } from '../../operations/stations/repository';
import { CurrencyRepository } from '../currencies/repository';
import { HandlingParkingSupplierRepository } from './repository';

export class HandlingParkingSupplierService {
  constructor(
    private readonly repository: HandlingParkingSupplierRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly currenciesRepository: CurrencyRepository
  ) {}
  list(query: HandlingParkingSupplierListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('HandlingParkingSupplier', id);
    return row;
  }
  async create(input: HandlingParkingSupplierInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'handling-parking-suppliers-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: HandlingParkingSupplierInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('HandlingParkingSupplier', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('HandlingParkingSupplier', id);
    return row;
  }
  private async validate(input: HandlingParkingSupplierInput) {
    if (!(await this.stationsRepository.getById(input.stationId))?.isActive)
      throw new DomainError(
        'HANDLING_PARKING_SUPPLIERS_STATION_ID_INVALID',
        'Station must reference an active record.',
        422
      );
    if (input.currencyId && !(await this.currenciesRepository.getById(input.currencyId))?.isActive)
      throw new DomainError(
        'HANDLING_PARKING_SUPPLIERS_CURRENCY_ID_INVALID',
        'Currency must reference an active record.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'HANDLING_PARKING_SUPPLIERS_DUPLICATE',
        'HandlingParkingSupplier code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError(
        'HANDLING_PARKING_SUPPLIERS_RELATION_INVALID',
        'A related record is invalid.',
        422
      );
    throw error;
  }
}
