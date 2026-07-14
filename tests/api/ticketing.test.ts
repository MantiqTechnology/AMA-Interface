import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { setup, $fetch } from '@nuxt/test-utils/e2e';
import { describe, expect, it } from 'vitest';
import type { ApiResponse } from '../../shared/contracts/api';
import type { CargoBookingDto } from '../../shared/features/ticketing/cargo';
import type { TicketingLedgerDto } from '../../shared/features/ticketing/finance';
import type {
  PassengerRescheduleOptionDto,
  PassengerTicketDto
} from '../../shared/features/ticketing/passenger';
import type { TicketRefundRequestDto } from '../../shared/features/ticketing/refunds';
import type {
  AvailableTicketingFlightDto,
  TicketingOccFlightDto,
  TicketingSalesOpeningDto
} from '../../shared/features/ticketing/sales';
import { createDbClient, resolveDbPath } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';
import { seedFlightOperationsData } from '../../server/db/seed-flight-operations';
import { seedTicketingData } from '../../server/db/seeds/ticketing';

process.env.DEMO_MODE = 'true';
process.env.AMA_DB_PATH = './data/test-ticketing-api.sqlite';

const resolved = resolveDbPath(process.env.AMA_DB_PATH);
await rm(resolved, { force: true });
await rm(`${resolved}-wal`, { force: true });
await rm(`${resolved}-shm`, { force: true });

const { db, sqlite } = createDbClient(process.env.AMA_DB_PATH);
dropDemoDatabase(sqlite);
runMigrations(sqlite);
await seedDemoData(db);
seedFlightOperationsData(sqlite);
seedTicketingData(sqlite);
sqlite.exec(
  `INSERT INTO flight_operations (
       id, order_number, flight_number, flight_date, flight_type_id, service_type_id,
       request_source, priority_id, route_id, origin_station_id, destination_station_id,
       customer_id, aircraft_id, pilot_in_command_id, co_pilot_id, scheduled_departure_at,
       scheduled_arrival_at, current_status_id, created_by_user_id, approved_by_user_id,
       billing_type, currency_code, is_locked, created_at, updated_at
     ) VALUES (
       'fop-ticketing-api-open', 'FO-TICKETING-API', 'AMA-TICKETING-API', '2026-07-18',
       'flight-type-passenger', 'flight-service-type-scheduled-passenger',
       'API integration test', 'flight-priority-normal', 'route-djj-wmx', 'st-djj', 'st-wmx',
       'cust-individual-1', 'ac-pk-ama', 'crew-pic-valid', 'crew-cop-valid',
       '2026-07-18T08:00:00.000+09:00', '2026-07-18T08:55:00.000+09:00',
       'flight-operation-status-scheduled', 'USR-001', 'USR-DEMO-ADMIN', 'CHARTER', 'IDR',
       0, '2026-07-13T10:00:00.000+07:00', '2026-07-13T10:00:00.000+07:00'
   )`
);
sqlite.close();

await setup({
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: true,
  browser: false
});

describe('ticketing APIs', () => {
  it('enforces operational mutation permissions on the server', async () => {
    const response = await $fetch<ApiResponse<unknown>>(
      '/api/flight-operations/flights/fop-dg-pending/actions/approve',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=OCC' },
        body: {},
        ignoreResponseError: true
      }
    );

    expect(response).toMatchObject({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        details: { permissionId: 'flight.approve', role: 'OCC' }
      }
    });

    const invalidRole = await $fetch<ApiResponse<unknown>>(
      '/api/flight-operations/flights/fop-dg-pending/actions/approve',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=Unknown' },
        body: {},
        ignoreResponseError: true
      }
    );
    expect(invalidRole).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN', details: { role: 'Unknown' } }
    });

    const emptyRole = await $fetch<ApiResponse<unknown>>(
      '/api/flight-operations/flights/fop-dg-pending/actions/approve',
      {
        method: 'POST',
        headers: { cookie: 'ama_demo_role=' },
        body: {},
        ignoreResponseError: true
      }
    );
    expect(emptyRole).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN', details: { role: '' } }
    });
  });

  it('rejects refund records whose subject belongs to another operation', () => {
    const ownershipDb = new Database(resolveDbPath(process.env.AMA_DB_PATH));
    ownershipDb.pragma('foreign_keys = ON');

    expect(() =>
      ownershipDb
        .prepare(
          `INSERT INTO ticketing_refund_requests (
             id, flight_operation_id, subject_type, passenger_ticket_id, reason, status,
             amount, currency_code, requested_by_user_id, requested_at, created_at, updated_at
           ) VALUES (
             'refund-invalid-owner', 'fop-ticketing-cargo', 'PASSENGER', 'TKT-DEMO34',
             'Ownership mismatch regression test', 'REQUESTED', 1800000, 'IDR',
             'USR-DEMO-ADMIN', '2026-07-14T00:00:00.000Z',
             '2026-07-14T00:00:00.000Z', '2026-07-14T00:00:00.000Z'
           )`
        )
        .run()
    ).toThrow('ticketing refund flight ownership mismatch');

    ownershipDb.close();
  });

  it('lists only sales-open flights with route-specific rates', async () => {
    const passenger = await $fetch<ApiResponse<AvailableTicketingFlightDto[]>>(
      '/api/ticketing/available-flights',
      { query: { serviceType: 'PASSENGER' } }
    );
    const cargo = await $fetch<ApiResponse<AvailableTicketingFlightDto[]>>(
      '/api/ticketing/available-flights',
      { query: { serviceType: 'CARGO' } }
    );
    expect(passenger.ok && passenger.data).toContainEqual(
      expect.objectContaining({
        flightOperationId: 'fop-ticketing-passenger',
        baseRate: 1800000,
        originCode: 'DJJ',
        destinationCode: 'WMX'
      })
    );
    expect(cargo.ok && cargo.data).toContainEqual(
      expect.objectContaining({ flightOperationId: 'fop-ticketing-cargo', baseRate: 32000 })
    );

    const statusDb = new Database(resolveDbPath(process.env.AMA_DB_PATH));
    statusDb
      .prepare(
        "UPDATE flight_operations SET current_status_id = 'flight-operation-status-cancelled' WHERE id = ?"
      )
      .run('fop-ticketing-passenger');
    statusDb.close();
    const afterCancellation = await $fetch<ApiResponse<AvailableTicketingFlightDto[]>>(
      '/api/ticketing/available-flights',
      { query: { serviceType: 'PASSENGER' } }
    );
    const restoreDb = new Database(resolveDbPath(process.env.AMA_DB_PATH));
    restoreDb
      .prepare(
        "UPDATE flight_operations SET current_status_id = 'flight-operation-status-scheduled' WHERE id = ?"
      )
      .run('fop-ticketing-passenger');
    restoreDb.close();
    expect(
      afterCancellation.ok && afterCancellation.data.map((flight) => flight.flightOperationId)
    ).not.toContain('fop-ticketing-passenger');
  });

  it('books, pays, and checks in a passenger while synchronizing the OCC manifest', async () => {
    const created = await $fetch<ApiResponse<PassengerTicketDto>>(
      '/api/ticketing/passenger-tickets',
      {
        method: 'POST',
        body: {
          flightOperationId: 'fop-ticketing-passenger',
          passengerName: 'API Ticketing Passenger',
          documentType: 'KTP',
          documentNumber: 'API-KTP-001',
          seatNumber: '1C',
          passengerWeightKg: 68,
          baggageWeightKg: 7,
          agentId: 'agent-djj-counter'
        }
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error.message);
    expect(created.data).toMatchObject({ ticketPrice: 1800000, paymentStatus: 'UNPAID' });
    const detail = await $fetch<ApiResponse<PassengerTicketDto>>(
      `/api/ticketing/passenger-tickets/${created.data.id}`
    );
    expect(detail.ok && detail.data.id).toBe(created.data.id);
    const unfilteredList = await $fetch<ApiResponse<PassengerTicketDto[]>>(
      '/api/ticketing/passenger-tickets?search&paymentStatus&checkInStatus'
    );
    expect(unfilteredList.ok).toBe(true);
    expect(unfilteredList.ok && unfilteredList.data.length).toBeGreaterThan(0);
    const occupiedSeats = await $fetch<ApiResponse<string[]>>(
      '/api/ticketing/flights/fop-ticketing-passenger/occupied-seats'
    );
    expect(occupiedSeats.ok && occupiedSeats.data).toContain('1C');

    const duplicate = await $fetch<ApiResponse<PassengerTicketDto>>(
      '/api/ticketing/passenger-tickets',
      {
        method: 'POST',
        ignoreResponseError: true,
        body: {
          flightOperationId: 'fop-ticketing-passenger',
          passengerName: 'Duplicate Seat',
          documentType: 'KTP',
          documentNumber: 'API-KTP-002',
          seatNumber: '1C',
          passengerWeightKg: 70,
          baggageWeightKg: 0
        }
      }
    );
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) throw new Error('Expected duplicate seat to fail.');
    expect(duplicate.error.code).toBe('TICKETING_SEAT_OCCUPIED');

    const unpaidCheckIn = await $fetch<ApiResponse<PassengerTicketDto>>(
      `/api/ticketing/passenger-tickets/${created.data.id}/check-in`,
      { method: 'PATCH', ignoreResponseError: true }
    );
    expect(!unpaidCheckIn.ok && unpaidCheckIn.error.code).toBe('TICKETING_PAYMENT_REQUIRED');

    const paid = await $fetch<ApiResponse<PassengerTicketDto>>(
      `/api/ticketing/passenger-tickets/${created.data.id}/payment`,
      { method: 'PATCH', body: { paymentMethod: 'QRIS' } }
    );
    expect(paid.ok && paid.data.paymentStatus).toBe('PAID');
    const checkedIn = await $fetch<ApiResponse<PassengerTicketDto>>(
      `/api/ticketing/passenger-tickets/${created.data.id}/check-in`,
      { method: 'PATCH' }
    );
    expect(checkedIn.ok && checkedIn.data.checkInStatus).toBe('CHECKED_IN');

    const sqlite = new Database(resolveDbPath(process.env.AMA_DB_PATH), { readonly: true });
    const sync = sqlite
      .prepare('SELECT manifest_id FROM flight_manifest_passengers WHERE id = ?')
      .get(`ticket-sync-${created.data.id}`) as { manifest_id: string };
    expect(sync.manifest_id).toBe('fop-ticketing-passenger-manifest-pax');
    expect(sqlite.pragma('foreign_key_check')).toEqual([]);
    sqlite.close();
  });

  it('requests and approves a passenger refund with an auditable finance reversal', async () => {
    const requested = await $fetch<ApiResponse<TicketRefundRequestDto>>(
      '/api/ticketing/passenger-tickets/TKT-DEMO12/refund-request',
      {
        method: 'POST',
        body: { reason: 'Unable to travel due to a medical appointment.' }
      }
    );
    expect(requested.ok).toBe(true);
    if (!requested.ok) throw new Error(requested.error.message);
    expect(requested.data).toMatchObject({
      subjectType: 'PASSENGER',
      subjectId: 'TKT-DEMO12',
      status: 'REQUESTED',
      amount: 1800000
    });

    const duplicate = await $fetch<ApiResponse<TicketRefundRequestDto>>(
      '/api/ticketing/passenger-tickets/TKT-DEMO12/refund-request',
      {
        method: 'POST',
        body: { reason: 'A second request must not be accepted.' },
        ignoreResponseError: true
      }
    );
    expect(!duplicate.ok && duplicate.error.code).toBe('TICKETING_REFUND_ALREADY_REQUESTED');

    const pending = await $fetch<ApiResponse<TicketRefundRequestDto[]>>(
      '/api/ticketing/refund-requests',
      { query: { subjectType: 'PASSENGER', status: 'REQUESTED' } }
    );
    expect(pending.ok && pending.data.map((request) => request.id)).toContain(requested.data.id);

    const approved = await $fetch<ApiResponse<TicketRefundRequestDto>>(
      `/api/ticketing/refund-requests/${requested.data.id}/decision`,
      {
        method: 'PATCH',
        body: { decision: 'APPROVE', note: 'Approved after station verification.' }
      }
    );
    expect(approved.ok && approved.data.status).toBe('APPROVED');

    const ticket = await $fetch<ApiResponse<PassengerTicketDto>>(
      '/api/ticketing/passenger-tickets/TKT-DEMO12'
    );
    expect(ticket.ok && ticket.data.refundRequest).toMatchObject({ status: 'APPROVED' });
    const occupiedSeats = await $fetch<ApiResponse<string[]>>(
      '/api/ticketing/flights/fop-ticketing-passenger/occupied-seats'
    );
    expect(occupiedSeats.ok && occupiedSeats.data).not.toContain('1A');

    const refundedCheckIn = await $fetch<ApiResponse<PassengerTicketDto>>(
      '/api/ticketing/passenger-tickets/TKT-DEMO12/check-in',
      { method: 'PATCH', ignoreResponseError: true }
    );
    expect(!refundedCheckIn.ok && refundedCheckIn.error.code).toBe(
      'TICKETING_REFUND_BLOCKS_ACTION'
    );

    const ledger = await $fetch<ApiResponse<TicketingLedgerDto>>('/api/ticketing/ledger');
    expect(ledger.ok && ledger.data.entries).toContainEqual(
      expect.objectContaining({
        entryType: 'PASSENGER_REFUND',
        referenceNumber: 'TKT-DEMO12',
        amount: -1800000,
        paymentStatus: 'REFUNDED'
      })
    );
  });

  it('reschedules an active passenger ticket and moves its OCC manifest entry atomically', async () => {
    const historicalRefund = await $fetch<ApiResponse<TicketRefundRequestDto>>(
      '/api/ticketing/passenger-tickets/TKT-RESCHEDULE/refund-request',
      {
        method: 'POST',
        body: { reason: 'Passenger requested review before changing the original flight.' }
      }
    );
    expect(historicalRefund.ok).toBe(true);
    if (!historicalRefund.ok) throw new Error(historicalRefund.error.message);
    const rejectedRefund = await $fetch<ApiResponse<TicketRefundRequestDto>>(
      `/api/ticketing/refund-requests/${historicalRefund.data.id}/decision`,
      {
        method: 'PATCH',
        body: { decision: 'REJECT', note: 'Passenger selected reschedule instead.' }
      }
    );
    expect(rejectedRefund.ok && rejectedRefund.data.flightOperationId).toBe(
      'fop-ticketing-passenger'
    );

    const options = await $fetch<ApiResponse<PassengerRescheduleOptionDto[]>>(
      '/api/ticketing/passenger-tickets/TKT-RESCHEDULE/reschedule-options'
    );
    expect(options.ok && options.data).toContainEqual(
      expect.objectContaining({
        flightOperationId: 'fop-ticketing-passenger-later',
        flightNumber: 'AMA-20260717-008',
        availableSeats: expect.arrayContaining(['1A'])
      })
    );

    const rescheduled = await $fetch<ApiResponse<PassengerTicketDto>>(
      '/api/ticketing/passenger-tickets/TKT-RESCHEDULE/reschedule',
      {
        method: 'POST',
        body: {
          flightOperationId: 'fop-ticketing-passenger-later',
          seatNumber: '1A'
        }
      }
    );
    expect(rescheduled.ok && rescheduled.data).toMatchObject({
      flightOperationId: 'fop-ticketing-passenger-later',
      flightNumber: 'AMA-20260717-008',
      seatNumber: '1A'
    });

    const oldSeats = await $fetch<ApiResponse<string[]>>(
      '/api/ticketing/flights/fop-ticketing-passenger/occupied-seats'
    );
    const newSeats = await $fetch<ApiResponse<string[]>>(
      '/api/ticketing/flights/fop-ticketing-passenger-later/occupied-seats'
    );
    expect(oldSeats.ok && oldSeats.data).not.toContain('2A');
    expect(newSeats.ok && newSeats.data).toContain('1A');

    const refundHistory = await $fetch<ApiResponse<TicketRefundRequestDto[]>>(
      '/api/ticketing/refund-requests',
      { query: { subjectType: 'PASSENGER', status: 'REJECTED' } }
    );
    expect(refundHistory.ok && refundHistory.data).toContainEqual(
      expect.objectContaining({
        id: historicalRefund.data.id,
        flightOperationId: 'fop-ticketing-passenger',
        flightNumber: 'AMA-20260715-006'
      })
    );

    const duplicateSeat = await $fetch<ApiResponse<PassengerTicketDto>>(
      '/api/ticketing/passenger-tickets/TKT-DEMO34/reschedule',
      {
        method: 'POST',
        body: {
          flightOperationId: 'fop-ticketing-passenger-later',
          seatNumber: '1A'
        },
        ignoreResponseError: true
      }
    );
    expect(!duplicateSeat.ok && duplicateSeat.error.code).toBe('TICKETING_PAYMENT_REQUIRED');
  });

  it('books, pays, and delivers cargo with server-calculated tariff and OCC sync', async () => {
    const occCapacityDb = new Database(resolveDbPath(process.env.AMA_DB_PATH));
    occCapacityDb.pragma('foreign_keys = ON');
    occCapacityDb
      .prepare("UPDATE rate_cards SET cargo_price_basis = 'VOLUME_WEIGHT' WHERE id = ?")
      .run('rate-cargo-djj-wmx');
    occCapacityDb
      .prepare(
        `INSERT INTO flight_manifest_cargo_items (
           id, manifest_id, description, actual_weight_kg, volume_weight_kg,
           chargeable_weight_kg, dg_acceptance_status_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, 'dg-acceptance-status-not-applicable', ?, ?)`
      )
      .run(
        'occ-only-capacity-item',
        'fop-ticketing-cargo-manifest-cargo',
        'OCC-only load',
        1300,
        1300,
        1300,
        '2026-07-13T10:05:00.000+07:00',
        '2026-07-13T10:05:00.000+07:00'
      );
    occCapacityDb.close();

    const overCapacity = await $fetch<ApiResponse<CargoBookingDto>>(
      '/api/ticketing/cargo-bookings',
      {
        method: 'POST',
        ignoreResponseError: true,
        body: {
          flightOperationId: 'fop-ticketing-cargo',
          senderName: 'Oversized Cargo Sender',
          receiverName: 'Oversized Cargo Receiver',
          description: 'Cargo above aircraft capacity',
          actualWeightKg: 50,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
          isDangerous: false,
          paymentMethod: 'TRANSFER'
        }
      }
    );
    const removeOccLoadDb = new Database(resolveDbPath(process.env.AMA_DB_PATH));
    removeOccLoadDb
      .prepare('DELETE FROM flight_manifest_cargo_items WHERE id = ?')
      .run('occ-only-capacity-item');
    removeOccLoadDb.close();
    expect(!overCapacity.ok && overCapacity.error.code).toBe('TICKETING_CARGO_CAPACITY_EXCEEDED');

    const created = await $fetch<ApiResponse<CargoBookingDto>>('/api/ticketing/cargo-bookings', {
      method: 'POST',
      body: {
        flightOperationId: 'fop-ticketing-cargo',
        senderName: 'API Cargo Sender',
        receiverName: 'API Cargo Receiver',
        description: 'Medical supply box',
        actualWeightKg: 20,
        lengthCm: 40,
        widthCm: 40,
        heightCm: 40,
        isDangerous: false,
        paymentMethod: 'TRANSFER',
        agentId: 'agent-papua-cargo'
      }
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error.message);
    expect(created.data).toMatchObject({
      chargeableWeightKg: 20,
      isDangerous: false,
      tariffRate: 32000,
      totalTariff: 342400
    });
    expect(typeof created.data.isDangerous).toBe('boolean');
    const detail = await $fetch<ApiResponse<CargoBookingDto>>(
      `/api/ticketing/cargo-bookings/${created.data.id}`
    );
    expect(detail.ok && detail.data.id).toBe(created.data.id);
    const list = await $fetch<ApiResponse<CargoBookingDto[]>>('/api/ticketing/cargo-bookings', {
      query: { search: created.data.id }
    });
    expect(list.ok && list.data).toHaveLength(1);
    const unfilteredList = await $fetch<ApiResponse<CargoBookingDto[]>>(
      '/api/ticketing/cargo-bookings?search&paymentStatus&status'
    );
    expect(unfilteredList.ok).toBe(true);
    expect(unfilteredList.ok && unfilteredList.data.length).toBeGreaterThan(0);

    const unpaidDelivery = await $fetch<ApiResponse<CargoBookingDto>>(
      `/api/ticketing/cargo-bookings/${created.data.id}/delivery`,
      { method: 'PATCH', body: { deliveredTo: 'Receiver' }, ignoreResponseError: true }
    );
    expect(!unpaidDelivery.ok && unpaidDelivery.error.code).toBe('TICKETING_PAYMENT_REQUIRED');
    await $fetch(`/api/ticketing/cargo-bookings/${created.data.id}/payment`, {
      method: 'PATCH',
      body: { paymentMethod: 'TRANSFER' }
    });
    const delivered = await $fetch<ApiResponse<CargoBookingDto>>(
      `/api/ticketing/cargo-bookings/${created.data.id}/delivery`,
      { method: 'PATCH', body: { deliveredTo: 'API Cargo Receiver' } }
    );
    expect(delivered.ok && delivered.data.status).toBe('DELIVERED');

    const sqlite = new Database(resolveDbPath(process.env.AMA_DB_PATH), { readonly: true });
    expect(
      sqlite
        .prepare('SELECT manifest_id FROM flight_manifest_cargo_items WHERE id = ?')
        .get(`ticket-sync-${created.data.id}`)
    ).toEqual({ manifest_id: 'fop-ticketing-cargo-manifest-cargo' });
    sqlite.close();
    const restoreRateDb = new Database(resolveDbPath(process.env.AMA_DB_PATH));
    restoreRateDb
      .prepare("UPDATE rate_cards SET cargo_price_basis = 'CHARGEABLE_WEIGHT' WHERE id = ?")
      .run('rate-cargo-djj-wmx');
    restoreRateDb.close();
  });

  it('requests and rejects a cargo refund without removing the booking from OCC', async () => {
    const requested = await $fetch<ApiResponse<TicketRefundRequestDto>>(
      '/api/ticketing/cargo-bookings/AWB-100200/refund-request',
      {
        method: 'POST',
        body: { reason: 'Sender requested cancellation after cargo acceptance.' }
      }
    );
    expect(requested.ok).toBe(true);
    if (!requested.ok) throw new Error(requested.error.message);

    const rejected = await $fetch<ApiResponse<TicketRefundRequestDto>>(
      `/api/ticketing/refund-requests/${requested.data.id}/decision`,
      {
        method: 'PATCH',
        body: { decision: 'REJECT', note: 'Cargo has already entered acceptance handling.' }
      }
    );
    expect(rejected.ok && rejected.data.status).toBe('REJECTED');

    const booking = await $fetch<ApiResponse<CargoBookingDto>>(
      '/api/ticketing/cargo-bookings/AWB-100200'
    );
    expect(booking.ok && booking.data.refundRequest).toMatchObject({ status: 'REJECTED' });
    const sqlite = new Database(resolveDbPath(process.env.AMA_DB_PATH), { readonly: true });
    expect(
      sqlite
        .prepare('SELECT id FROM flight_manifest_cargo_items WHERE id = ?')
        .get('ticket-sync-AWB-100200')
    ).toEqual({ id: 'ticket-sync-AWB-100200' });
    sqlite.close();
  });

  it('opens OCC sales once and exposes the new commercial flight', async () => {
    const beforeOpenDb = new Database(resolveDbPath(process.env.AMA_DB_PATH), { readonly: true });
    const operationCountBefore = (
      beforeOpenDb.prepare('SELECT COUNT(*) AS count FROM flight_operations').get() as {
        count: number;
      }
    ).count;
    beforeOpenDb.close();
    const flights = await $fetch<ApiResponse<TicketingOccFlightDto[]>>('/api/ticketing/sales');
    expect(flights.ok).toBe(true);
    if (!flights.ok) throw new Error(flights.error.message);
    expect(flights.data).toContainEqual(
      expect.objectContaining({
        flightOperationId: 'fop-ticketing-api-open',
        canOpenSales: true,
        blockers: []
      })
    );
    expect(flights.data).toContainEqual(
      expect.objectContaining({
        flightOperationId: 'fop-blocked-crew-expired',
        canOpenSales: false,
        blockers: expect.arrayContaining(['FLIGHT_STATUS_NOT_ELIGIBLE'])
      })
    );
    const opened = await $fetch<ApiResponse<TicketingSalesOpeningDto>>(
      '/api/ticketing/sales/open',
      { method: 'POST', body: { flightOperationId: 'fop-ticketing-api-open' } }
    );
    expect(opened.ok && opened.data).toMatchObject({
      flightOperationId: 'fop-ticketing-api-open',
      flightNumber: 'AMA-TICKETING-API',
      serviceType: 'PASSENGER'
    });
    if (!opened.ok) throw new Error(opened.error.message);

    const sqlite = new Database(resolveDbPath(process.env.AMA_DB_PATH));
    sqlite.pragma('foreign_keys = ON');
    expect(
      (sqlite.prepare('SELECT COUNT(*) AS count FROM flight_operations').get() as { count: number })
        .count
    ).toBe(operationCountBefore);
    expect(
      sqlite
        .prepare('SELECT flight_operation_id FROM ticketing_sales WHERE flight_operation_id = ?')
        .get('fop-ticketing-api-open')
    ).toEqual({ flight_operation_id: 'fop-ticketing-api-open' });
    sqlite
      .prepare(
        `INSERT INTO flight_manifests (
           id, flight_operation_id, manifest_type_id, status_id, created_at, updated_at
         ) VALUES (?, ?, 'manifest-type-passenger', 'manifest-status-draft', ?, ?)`
      )
      .run(
        'occ-owned-passenger-manifest',
        'fop-ticketing-api-open',
        '2026-07-13T10:05:00.000+07:00',
        '2026-07-13T10:05:00.000+07:00'
      );
    sqlite
      .prepare(
        `INSERT INTO flight_manifest_passengers (
           id, manifest_id, full_name, identity_type, identity_number, weight_kg,
           seat_number, baggage_weight_kg, created_at, updated_at
         ) VALUES (?, ?, ?, 'KTP', ?, ?, ?, 0, ?, ?)`
      )
      .run(
        'occ-owned-passenger-seat',
        'occ-owned-passenger-manifest',
        'OCC Existing Passenger',
        'OCC-KTP-001',
        62,
        '1A',
        '2026-07-13T10:05:00.000+07:00',
        '2026-07-13T10:05:00.000+07:00'
      );
    sqlite.close();

    const occupied = await $fetch<ApiResponse<string[]>>(
      `/api/ticketing/flights/${opened.data.flightOperationId}/occupied-seats`
    );
    expect(occupied.ok && occupied.data).toContain('1A');
    const occupiedTicket = await $fetch<ApiResponse<PassengerTicketDto>>(
      '/api/ticketing/passenger-tickets',
      {
        method: 'POST',
        ignoreResponseError: true,
        body: {
          flightOperationId: opened.data.flightOperationId,
          passengerName: 'Duplicate OCC Seat',
          documentType: 'KTP',
          documentNumber: 'API-KTP-OCC-DUPLICATE',
          seatNumber: '1A',
          passengerWeightKg: 64,
          baggageWeightKg: 4
        }
      }
    );
    expect(!occupiedTicket.ok && occupiedTicket.error.code).toBe('TICKETING_SEAT_OCCUPIED');

    const ticket = await $fetch<ApiResponse<PassengerTicketDto>>(
      '/api/ticketing/passenger-tickets',
      {
        method: 'POST',
        body: {
          flightOperationId: opened.data.flightOperationId,
          passengerName: 'Existing Manifest Passenger',
          documentType: 'KTP',
          documentNumber: 'API-KTP-MANIFEST',
          seatNumber: '1B',
          passengerWeightKg: 64,
          baggageWeightKg: 4
        }
      }
    );
    expect(ticket.ok).toBe(true);
    if (!ticket.ok) throw new Error(ticket.error.message);
    const manifestDb = new Database(resolveDbPath(process.env.AMA_DB_PATH), { readonly: true });
    expect(
      manifestDb
        .prepare('SELECT manifest_id FROM flight_manifest_passengers WHERE id = ?')
        .get(`ticket-sync-${ticket.data.id}`)
    ).toEqual({ manifest_id: 'occ-owned-passenger-manifest' });
    manifestDb.close();

    const duplicate = await $fetch<ApiResponse<TicketingSalesOpeningDto>>(
      '/api/ticketing/sales/open',
      {
        method: 'POST',
        body: { flightOperationId: 'fop-ticketing-api-open' },
        ignoreResponseError: true
      }
    );
    expect(!duplicate.ok && duplicate.error.code).toBe('TICKETING_SALES_NOT_READY');
  });

  it('returns a typed passenger and cargo ledger', async () => {
    const response = await $fetch<ApiResponse<TicketingLedgerDto>>('/api/ticketing/ledger');
    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.message);
    expect(response.data.totals).toContainEqual(
      expect.objectContaining({ currencyCode: 'IDR', totalRevenue: expect.any(Number) })
    );
    expect(
      response.data.totals.find((total) => total.currencyCode === 'IDR')!.totalRevenue
    ).toBeGreaterThan(0);
    expect(response.data.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entryType: 'PASSENGER' }),
        expect.objectContaining({ entryType: 'CARGO' })
      ])
    );
  });
});
