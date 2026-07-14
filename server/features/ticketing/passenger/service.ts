import { nanoid } from 'nanoid';
import type {
  CreatePassengerTicketInput,
  PassengerRescheduleOptionDto,
  PassengerTicketListQuery,
  PayPassengerTicketInput,
  ReschedulePassengerTicketInput
} from '../../../../shared/features/ticketing/passenger';
import { DomainError, notFound } from '../../../utils/errors';
import type { AgentRepository } from '../../commercial/agents/repository';
import type { TicketingSalesRepository } from '../sales/repository';
import { PassengerTicketRepository } from './repository';

export class PassengerTicketService {
  constructor(
    private readonly repository: PassengerTicketRepository,
    private readonly salesRepository: TicketingSalesRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  list(query: PassengerTicketListQuery) {
    return this.repository.list(query);
  }

  get(id: string) {
    const ticket = this.repository.get(id);
    if (!ticket) throw notFound('Passenger ticket', id);
    return ticket;
  }

  occupiedSeats(flightOperationId: string) {
    const flight = this.salesRepository.getBookableFlight(flightOperationId, 'PASSENGER');
    if (!flight) throw notFound('Bookable passenger flight', flightOperationId);
    return this.repository.occupiedSeats(flightOperationId);
  }

  rescheduleOptions(id: string): PassengerRescheduleOptionDto[] {
    const context = this.getEligibleRescheduleContext(id);
    return this.salesRepository
      .listAvailable({
        serviceType: 'PASSENGER',
        originStationId: context.originStationId,
        destinationStationId: context.destinationStationId
      })
      .filter((flight) => flight.flightOperationId !== context.flightOperationId)
      .map((flight) => ({
        flightOperationId: flight.flightOperationId,
        flightNumber: flight.flightNumber,
        scheduledDeparture: flight.scheduledDeparture,
        scheduledArrival: flight.scheduledArrival,
        originCode: flight.originCode,
        destinationCode: flight.destinationCode,
        aircraftRegistration: flight.aircraftRegistration,
        availableSeats: this.seatsForCapacity(flight.passengerCapacity).filter(
          (seat) => !this.repository.occupiedSeats(flight.flightOperationId).includes(seat)
        )
      }))
      .filter((flight) => flight.availableSeats.length > 0);
  }

  reschedule(id: string, input: ReschedulePassengerTicketInput, actorId: string) {
    const context = this.getEligibleRescheduleContext(id);
    if (input.flightOperationId === context.flightOperationId) {
      throw new DomainError(
        'TICKETING_RESCHEDULE_FLIGHT_INVALID',
        'Select a different flight for rescheduling.',
        422
      );
    }
    const target = this.salesRepository.getBookableFlight(input.flightOperationId, 'PASSENGER');
    if (!target || target.routeId !== context.routeId) {
      throw new DomainError(
        'TICKETING_RESCHEDULE_FLIGHT_INVALID',
        'The replacement flight must be an available passenger flight on the same route.',
        422
      );
    }
    if (!this.seatsForCapacity(target.passengerCapacity).includes(input.seatNumber)) {
      throw new DomainError(
        'TICKETING_SEAT_INVALID',
        `Seat ${input.seatNumber} is not available on ${target.aircraftRegistration}.`,
        422
      );
    }
    if (this.repository.occupiedSeats(target.flightOperationId).includes(input.seatNumber)) {
      throw new DomainError(
        'TICKETING_SEAT_OCCUPIED',
        `Seat ${input.seatNumber} is already occupied.`,
        409
      );
    }
    try {
      this.repository.rescheduleAndSync({
        id: `reschedule-${nanoid(12)}`,
        ticketId: id,
        sourceFlightOperationId: context.flightOperationId,
        targetFlightOperationId: target.flightOperationId,
        routeId: context.routeId,
        seatNumber: input.seatNumber,
        actorId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('passenger_tickets.flight_operation_id') ||
        message.includes('flight_manifest_passengers.manifest_id')
      ) {
        throw new DomainError(
          'TICKETING_SEAT_OCCUPIED',
          `Seat ${input.seatNumber} is already occupied.`,
          409
        );
      }
      if (message.includes('TICKETING_MANIFEST_LOCKED')) {
        throw new DomainError(
          'TICKETING_MANIFEST_LOCKED',
          'The source or replacement OCC manifest is locked.',
          409
        );
      }
      if (
        message.includes('TICKETING_RESCHEDULE_SUBJECT_CHANGED') ||
        message.includes('TICKETING_RESCHEDULE_TARGET_CHANGED')
      ) {
        throw new DomainError(
          'TICKETING_RESCHEDULE_STATE_CHANGED',
          'The ticket or replacement flight changed. Refresh and try again.',
          409
        );
      }
      throw error;
    }
    return this.get(id);
  }

  async create(input: CreatePassengerTicketInput) {
    const flight = this.salesRepository.getBookableFlight(input.flightOperationId, 'PASSENGER');
    if (!flight) throw notFound('Bookable passenger flight', input.flightOperationId);
    const validSeats = new Set(this.seatsForCapacity(flight.passengerCapacity));
    if (!validSeats.has(input.seatNumber)) {
      throw new DomainError(
        'TICKETING_SEAT_INVALID',
        `Seat ${input.seatNumber} is not available on ${flight.aircraftRegistration}.`,
        422
      );
    }
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
    const timestamp = new Date().toISOString();
    const id = `TKT-${nanoid(8).toUpperCase()}`;
    const taxAmount = Math.round((flight.baseRate * flight.taxRateBasisPoints) / 10_000);
    try {
      this.repository.createAndSync({
        id,
        flightOperationId: flight.flightOperationId,
        passengerName: input.passengerName,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        seatNumber: input.seatNumber,
        passengerWeightKg: input.passengerWeightKg,
        baggageWeightKg: input.baggageWeightKg,
        ticketPrice: flight.baseRate,
        rateCardId: flight.rateCardId,
        taxCodeId: flight.taxCodeId,
        taxCode: flight.taxCode,
        taxRateBasisPoints: flight.taxRateBasisPoints,
        taxAmount,
        totalAmount: flight.baseRate + taxAmount,
        currencyCode: flight.currencyCode,
        loyaltyMemberId: input.loyaltyMemberId || null,
        agentId: input.agentId || null,
        timestamp
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('passenger_tickets.flight_operation_id') ||
        message.includes('flight_manifest_passengers.manifest_id')
      ) {
        throw new DomainError(
          'TICKETING_SEAT_OCCUPIED',
          `Seat ${input.seatNumber} is already occupied.`,
          409
        );
      }
      if (message.includes('TICKETING_MANIFEST_LOCKED')) {
        throw new DomainError(
          'TICKETING_MANIFEST_LOCKED',
          'The OCC passenger manifest is locked and cannot accept new bookings.',
          409
        );
      }
      throw error;
    }
    return this.get(id);
  }

  pay(id: string, input: PayPassengerTicketInput) {
    const ticket = this.get(id);
    if (ticket.paymentStatus === 'PAID') return ticket;
    this.repository.markPaid(id, input.paymentMethod, new Date().toISOString());
    return this.get(id);
  }

  checkIn(id: string) {
    const ticket = this.get(id);
    if (
      ticket.refundRequest?.status === 'REQUESTED' ||
      ticket.refundRequest?.status === 'APPROVED'
    ) {
      throw new DomainError(
        'TICKETING_REFUND_BLOCKS_ACTION',
        'A ticket with a pending or approved refund cannot be checked in.',
        409
      );
    }
    if (ticket.paymentStatus !== 'PAID') {
      throw new DomainError(
        'TICKETING_PAYMENT_REQUIRED',
        'The ticket must be paid before check-in.',
        409
      );
    }
    if (ticket.checkInStatus === 'CHECKED_IN') return ticket;
    this.repository.checkIn(id, new Date().toISOString());
    return this.get(id);
  }

  private seatsForCapacity(capacity: number) {
    const columns = ['A', 'B', 'C'];
    return Array.from({ length: capacity }, (_, index) => {
      const row = Math.floor(index / columns.length) + 1;
      return `${row}${columns[index % columns.length]}`;
    });
  }

  private getEligibleRescheduleContext(id: string) {
    const context = this.repository.rescheduleContext(id);
    if (!context) throw notFound('Passenger ticket', id);
    if (context.ticketStatus !== 'ACTIVE') {
      throw new DomainError(
        'TICKETING_REFUND_BLOCKS_ACTION',
        'A refunded ticket cannot be rescheduled.',
        409
      );
    }
    if (context.paymentStatus !== 'PAID') {
      throw new DomainError(
        'TICKETING_PAYMENT_REQUIRED',
        'The ticket must be paid before rescheduling.',
        409
      );
    }
    if (context.checkInStatus !== 'PENDING') {
      throw new DomainError(
        'TICKETING_RESCHEDULE_NOT_ELIGIBLE',
        'A checked-in ticket cannot be rescheduled.',
        409
      );
    }
    if (context.refundStatus === 'REQUESTED' || context.refundStatus === 'APPROVED') {
      throw new DomainError(
        'TICKETING_REFUND_BLOCKS_ACTION',
        'A ticket with a pending or approved refund cannot be rescheduled.',
        409
      );
    }
    return context;
  }
}
