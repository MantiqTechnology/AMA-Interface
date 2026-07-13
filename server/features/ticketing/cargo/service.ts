import { nanoid } from 'nanoid';
import type {
  CargoBookingListQuery,
  CreateCargoBookingInput,
  DeliverCargoBookingInput,
  PayCargoBookingInput
} from '../../../../shared/features/ticketing/cargo';
import { DomainError, notFound } from '../../../utils/errors';
import type { DgCategoryRepository } from '../../cargo/dg-categories/repository';
import type { AgentRepository } from '../../commercial/agents/repository';
import type { TicketingSalesRepository } from '../sales/repository';
import { CargoBookingRepository, CargoCapacityExceededError } from './repository';

export class CargoBookingService {
  constructor(
    private readonly repository: CargoBookingRepository,
    private readonly salesRepository: TicketingSalesRepository,
    private readonly agentRepository: AgentRepository,
    private readonly dgCategoryRepository: DgCategoryRepository
  ) {}

  list(query: CargoBookingListQuery) {
    return this.repository.list(query);
  }

  get(id: string) {
    const booking = this.repository.get(id);
    if (!booking) throw notFound('Cargo booking', id);
    return booking;
  }

  async create(input: CreateCargoBookingInput) {
    const flight = this.salesRepository.getBookableFlight(input.flightOrderId, 'CARGO');
    if (!flight) throw notFound('Bookable cargo flight', input.flightOrderId);
    if (input.agentId) {
      const agent = await this.agentRepository.getById(input.agentId);
      if (!agent?.isActive) {
        throw new DomainError(
          'TICKETING_AGENT_INVALID',
          'Agent must reference an active agent.',
          422
        );
      }
    }
    if (input.isDangerous) {
      const dgCategory = input.dgCategoryId
        ? await this.dgCategoryRepository.getById(input.dgCategoryId)
        : null;
      if (!dgCategory?.isActive) {
        throw new DomainError(
          'TICKETING_DG_CATEGORY_INVALID',
          'Dangerous cargo must reference an active DG category.',
          422
        );
      }
    }
    const volumeWeightKg = this.roundWeight(
      (input.lengthCm * input.widthCm * input.heightCm) / 6000
    );
    const chargeableWeightKg = Math.max(input.actualWeightKg, volumeWeightKg);
    const pricingWeightKg =
      flight.cargoPriceBasis === 'ACTUAL_WEIGHT'
        ? input.actualWeightKg
        : flight.cargoPriceBasis === 'VOLUME_WEIGHT'
          ? volumeWeightKg
          : chargeableWeightKg;
    const totalTariff = Math.max(
      Math.round(pricingWeightKg * flight.baseRate),
      flight.minimumCharge ?? 0
    );
    const id = `AWB-${nanoid(8).toUpperCase()}`;
    const timestamp = new Date().toISOString();
    try {
      this.repository.createAndSync({
        id,
        flightOrderId: input.flightOrderId,
        flightOperationId: flight.flightOperationId,
        senderName: input.senderName,
        receiverName: input.receiverName,
        description: input.description,
        actualWeightKg: input.actualWeightKg,
        lengthCm: input.lengthCm,
        widthCm: input.widthCm,
        heightCm: input.heightCm,
        volumeWeightKg,
        chargeableWeightKg,
        isDangerous: input.isDangerous,
        dgCategoryId: input.isDangerous ? input.dgCategoryId || null : null,
        dgAcceptanceStatus: input.isDangerous ? 'PENDING' : 'NOT_APPLICABLE',
        paymentMethod: input.paymentMethod,
        agentId: input.agentId || null,
        tariffRate: flight.baseRate,
        totalTariff,
        cargoCapacityKg: flight.cargoCapacityKg,
        timestamp
      });
    } catch (error) {
      if (error instanceof CargoCapacityExceededError) {
        throw new DomainError(
          'TICKETING_CARGO_CAPACITY_EXCEEDED',
          `Cargo exceeds the ${flight.cargoCapacityKg} kg capacity of ${flight.aircraftRegistration}.`,
          409,
          { projectedWeightKg: this.roundWeight(error.projectedWeightKg) }
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('TICKETING_MANIFEST_LOCKED')) {
        throw new DomainError(
          'TICKETING_MANIFEST_LOCKED',
          'The OCC cargo manifest is locked and cannot accept new bookings.',
          409
        );
      }
      throw error;
    }
    return this.get(id);
  }

  pay(id: string, input: PayCargoBookingInput) {
    const booking = this.get(id);
    if (booking.paymentStatus === 'PAID') return booking;
    this.repository.markPaid(id, input.paymentMethod, new Date().toISOString());
    return this.get(id);
  }

  deliver(id: string, input: DeliverCargoBookingInput) {
    const booking = this.get(id);
    if (
      booking.refundRequest?.status === 'REQUESTED' ||
      booking.refundRequest?.status === 'APPROVED'
    ) {
      throw new DomainError(
        'TICKETING_REFUND_BLOCKS_ACTION',
        'Cargo with a pending or approved refund cannot be delivered.',
        409
      );
    }
    if (booking.paymentStatus !== 'PAID') {
      throw new DomainError(
        'TICKETING_PAYMENT_REQUIRED',
        'Cargo must be paid before proof of delivery can be recorded.',
        409
      );
    }
    if (booking.status === 'DELIVERED') return booking;
    this.repository.deliver(id, input.deliveredTo, new Date().toISOString());
    return this.get(id);
  }

  private roundWeight(value: number) {
    return Math.round(value * 10) / 10;
  }
}
