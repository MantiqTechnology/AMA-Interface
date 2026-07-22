import { nanoid } from 'nanoid';
import type {
  DecideTicketRefundInput,
  RequestTicketRefundInput,
  TicketRefundListQuery
} from '../../../../shared/features/ticketing/refunds';
import { DomainError, notFound } from '../../../utils/errors';
import type { AccountingService } from '../../finance/accounting/service';
import { TicketRefundRepository } from './repository';

export class TicketRefundService {
  constructor(
    private readonly repository: TicketRefundRepository,
    private readonly accountingService?: AccountingService
  ) {}

  list(query: TicketRefundListQuery) {
    return this.repository.list(query);
  }

  get(id: string) {
    const request = this.repository.get(id);
    if (!request) throw notFound('Ticket refund request', id);
    return request;
  }

  requestPassenger(ticketId: string, input: RequestTicketRefundInput, actorId: string) {
    const ticket = this.repository.passengerSubject(ticketId);
    if (!ticket) throw notFound('Passenger ticket', ticketId);
    this.assertPassengerEligible(ticket.paymentStatus, ticket.checkInStatus);
    this.assertNoOpenOrApprovedRequest(this.repository.latestPassengerRequest(ticketId));
    const id = `refund-${nanoid(12)}`;
    try {
      this.repository.createPassenger(
        id,
        ticketId,
        ticket.flightOperationId,
        input.reason,
        ticket.amount,
        ticket.currencyCode,
        actorId,
        new Date().toISOString()
      );
    } catch (error) {
      this.translateDuplicate(error);
    }
    return this.get(id);
  }

  requestCargo(bookingId: string, input: RequestTicketRefundInput, actorId: string) {
    const booking = this.repository.cargoSubject(bookingId);
    if (!booking) throw notFound('Cargo booking', bookingId);
    this.assertCargoEligible(booking.paymentStatus, booking.bookingStatus);
    this.assertNoOpenOrApprovedRequest(this.repository.latestCargoRequest(bookingId));
    const id = `refund-${nanoid(12)}`;
    try {
      this.repository.createCargo(
        id,
        bookingId,
        booking.flightOperationId,
        input.reason,
        booking.amount,
        booking.currencyCode,
        actorId,
        new Date().toISOString()
      );
    } catch (error) {
      this.translateDuplicate(error);
    }
    return this.get(id);
  }

  decide(id: string, input: DecideTicketRefundInput, actorId: string) {
    const current = this.get(id);
    if (current.status !== 'REQUESTED') return current;
    try {
      const decided = this.repository.decide(
        id,
        input.decision,
        input.note,
        actorId,
        new Date().toISOString()
      );
      if (decided.status === 'APPROVED') {
        this.accountingService?.recordTicketRefundApproved(decided.id, actorId);
      }
      return decided;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('TICKETING_MANIFEST_LOCKED')) {
        throw new DomainError(
          'TICKETING_MANIFEST_LOCKED',
          'The OCC manifest is locked, so this refund cannot be approved.',
          409
        );
      }
      if (message.includes('TICKETING_REFUND_SUBJECT_CHANGED')) {
        throw new DomainError(
          'TICKETING_REFUND_NOT_ELIGIBLE',
          'The booking state changed and is no longer eligible for refund.',
          409
        );
      }
      throw error;
    }
  }

  private assertPassengerEligible(paymentStatus: string, checkInStatus: string) {
    if (paymentStatus !== 'PAID') {
      throw new DomainError(
        'TICKETING_REFUND_PAYMENT_REQUIRED',
        'Only a paid passenger ticket can be refunded.',
        409
      );
    }
    if (checkInStatus !== 'PENDING') {
      throw new DomainError(
        'TICKETING_REFUND_NOT_ELIGIBLE',
        'A checked-in passenger ticket cannot be refunded.',
        409
      );
    }
  }

  private assertCargoEligible(paymentStatus: string, bookingStatus: string) {
    if (paymentStatus !== 'PAID') {
      throw new DomainError(
        'TICKETING_REFUND_PAYMENT_REQUIRED',
        'Only a paid cargo booking can be refunded.',
        409
      );
    }
    if (bookingStatus !== 'BOOKED') {
      throw new DomainError(
        'TICKETING_REFUND_NOT_ELIGIBLE',
        'Delivered cargo cannot be refunded.',
        409
      );
    }
  }

  private assertNoOpenOrApprovedRequest(
    request: ReturnType<TicketRefundRepository['latestPassengerRequest']>
  ) {
    if (request?.status === 'REQUESTED') {
      throw new DomainError(
        'TICKETING_REFUND_ALREADY_REQUESTED',
        'A refund request is already awaiting a decision.',
        409
      );
    }
    if (request?.status === 'APPROVED') {
      throw new DomainError(
        'TICKETING_REFUND_ALREADY_APPROVED',
        'This booking has already been refunded.',
        409
      );
    }
  }

  private translateDuplicate(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      throw new DomainError(
        'TICKETING_REFUND_ALREADY_REQUESTED',
        'A refund request is already awaiting a decision.',
        409
      );
    }
    throw error;
  }
}
