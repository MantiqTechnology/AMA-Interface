import { randomUUID } from 'node:crypto';
import type {
  RateCardInput,
  RateCardListQuery
} from '../../../../shared/features/commercial/rates';
import { DomainError, notFound } from '../../../utils/errors';
import { CurrencyRepository } from '../../finance/currencies/repository';
import { TaxCodeRepository } from '../../finance/tax-codes/repository';
import { StationsRepository } from '../../operations/stations/repository';
import { CustomerRepository } from '../customers/repository';
import { RateCardRepository } from './repository';

export class RateCardService {
  constructor(
    private readonly repository: RateCardRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly customersRepository: CustomerRepository,
    private readonly currenciesRepository: CurrencyRepository,
    private readonly taxCodesRepository: TaxCodeRepository
  ) {}
  list(query: RateCardListQuery) {
    return this.repository.list(query);
  }
  options() {
    return this.repository.options();
  }
  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('RateCard', id);
    return row;
  }
  async create(input: RateCardInput) {
    await this.validate(input);
    try {
      return await this.repository.create(
        'rate-cards-' + randomUUID(),
        input,
        new Date().toISOString()
      );
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async update(id: string, input: RateCardInput) {
    await this.get(id);
    await this.validate(input);
    try {
      const row = await this.repository.update(id, input, new Date().toISOString());
      if (!row) throw notFound('RateCard', id);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }
  async setActive(id: string, isActive: boolean) {
    await this.get(id);
    const row = await this.repository.setActive(id, isActive, new Date().toISOString());
    if (!row) throw notFound('RateCard', id);
    return row;
  }
  private async validate(input: RateCardInput) {
    if (!(await this.stationsRepository.getById(input.originStationId))?.isActive)
      throw new DomainError(
        'RATE_CARDS_ORIGIN_STATION_ID_INVALID',
        'Origin must reference an active record.',
        422
      );
    if (!(await this.stationsRepository.getById(input.destinationStationId))?.isActive)
      throw new DomainError(
        'RATE_CARDS_DESTINATION_STATION_ID_INVALID',
        'Destination must reference an active record.',
        422
      );
    if (input.customerId && !(await this.customersRepository.getById(input.customerId))?.isActive)
      throw new DomainError(
        'RATE_CARDS_CUSTOMER_ID_INVALID',
        'Customer must reference an active record.',
        422
      );
    if (!(await this.currenciesRepository.getById(input.currencyId))?.isActive)
      throw new DomainError(
        'RATE_CARDS_CURRENCY_ID_INVALID',
        'Currency must reference an active record.',
        422
      );
    if (input.taxCodeId && !(await this.taxCodesRepository.getById(input.taxCodeId))?.isActive)
      throw new DomainError(
        'RATE_CARDS_TAX_CODE_ID_INVALID',
        'Tax code must reference an active record.',
        422
      );
    if (input.originStationId === input.destinationStationId)
      throw new DomainError(
        'RATE_STATIONS_MATCH',
        'Origin and destination cannot be the same.',
        422
      );
    if (input.effectiveTo && input.effectiveTo < input.effectiveFrom)
      throw new DomainError(
        'INVALID_EFFECTIVE_DATE',
        'Effective end date cannot be before start date.',
        422
      );
    if (input.serviceType === 'PASSENGER' && input.rateUnit !== 'PER_PASSENGER')
      throw new DomainError(
        'RATE_PASSENGER_UNIT_INVALID',
        'Passenger rates must use PER_PASSENGER.',
        422
      );
    if (input.serviceType === 'CARGO' && input.rateUnit !== 'PER_KG')
      throw new DomainError('RATE_CARGO_UNIT_INVALID', 'Cargo rates must use PER_KG.', 422);
    if (input.serviceType === 'CARGO' && !input.cargoPriceBasis)
      throw new DomainError(
        'RATE_CARGO_BASIS_REQUIRED',
        'Cargo rates require a cargo price basis.',
        422
      );
    if (input.serviceType === 'CHARTER' && input.rateUnit !== 'PER_FLIGHT')
      throw new DomainError('RATE_CHARTER_UNIT_INVALID', 'Charter rates must use PER_FLIGHT.', 422);
  }
  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed'))
      throw new DomainError(
        'RATE_CARDS_DUPLICATE',
        'RateCard code or unique combination already exists.',
        409
      );
    if (message.includes('FOREIGN KEY constraint failed'))
      throw new DomainError('RATE_CARDS_RELATION_INVALID', 'A related record is invalid.', 422);
    throw error;
  }
}
