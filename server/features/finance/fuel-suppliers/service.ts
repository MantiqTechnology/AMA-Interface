import { randomUUID } from 'node:crypto';
import type {
  FuelSupplierInput,
  FuelSupplierListQuery
} from '../../../../shared/features/finance/fuel-suppliers';
import { DomainError, notFound } from '../../../utils/errors';
import { StationsRepository } from '../../operations/stations/repository';
import { CurrencyRepository } from '../currencies/repository';
import { FuelSupplierRepository } from './repository';

export class FuelSupplierService {
  constructor(
    private readonly repository: FuelSupplierRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly currenciesRepository: CurrencyRepository
  ) {}
  list(query: FuelSupplierListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('FuelSupplier', id);
    return row;
  }
  async create(input: FuelSupplierInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'fuel-suppliers-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: FuelSupplierInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('FuelSupplier', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('FuelSupplier', id);
    return row;
  }
  private async validate(input: FuelSupplierInput) {
    if (!(await this.stationsRepository.getById(input.stationId))?.isActive)
      throw new DomainError(
        'FUEL_SUPPLIERS_STATION_ID_INVALID',
        'Station must reference an active record.',
        422
      );
    if (!(await this.currenciesRepository.getById(input.currencyId))?.isActive)
      throw new DomainError(
        'FUEL_SUPPLIERS_CURRENCY_ID_INVALID',
        'Currency must reference an active record.',
        422
      );
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'FUEL_SUPPLIERS_DUPLICATE',
        'FuelSupplier code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('FUEL_SUPPLIERS_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
