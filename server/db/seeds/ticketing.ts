import type Database from 'better-sqlite3';
import { createDemoSeedContext, type DemoSeedContext } from './context';

function seedOtaAgents(sqlite: Database.Database, ticketingSeedTime: string) {
  const insertAgent = sqlite.prepare(
    `INSERT OR IGNORE INTO agents (
      id, agent_code, agent_name, agent_type, station_id, commission_basis_points,
      contact_person, phone, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, 'OTA', NULL, 500, ?, ?, 1, ?, ?)`
  );

  insertAgent.run(
    'agent-papua-travel',
    'PAPUA_TRAVEL',
    'Papua Travel Network',
    'Papua Travel Network Support',
    '+62-21-2977-5800',
    ticketingSeedTime,
    ticketingSeedTime
  );
  insertAgent.run(
    'agent-nusantara-booking',
    'NUSANTARA_BOOKING',
    'Nusantara Booking',
    'Nusantara Booking Support',
    '+62-21-3973-0888',
    ticketingSeedTime,
    ticketingSeedTime
  );
}

export function seedTicketingData(
  sqlite: Database.Database,
  context: DemoSeedContext = createDemoSeedContext()
) {
  const ticketingSeedTime = context.now;
  const passengerPaidTicketId = `AMA-TKT-${context.compactDate(1)}-001`;
  const passengerUnpaidTicketId = `AMA-TKT-${context.compactDate(1)}-002`;
  const passengerRescheduleTicketId = `AMA-TKT-${context.compactDate(1)}-003`;
  const otaPrimaryTicketId = `AMA-TKT-${context.compactDate(4)}-004`;
  const otaSecondaryTicketId = `AMA-TKT-${context.compactDate(4)}-005`;
  const generalCargoId = `AMA-AWB-${context.compactDate(2)}-001`;
  const dangerousCargoId = `AMA-AWB-${context.compactDate(2)}-002`;
  const checkedInTicketId = `AMA-TKT-${context.compactDate(0)}-006`;
  const refundReviewTicketId = `AMA-TKT-${context.compactDate(0)}-007`;
  const seed = sqlite.transaction(() => {
    seedOtaAgents(sqlite, ticketingSeedTime);

    const insertSale = sqlite.prepare(
      `INSERT OR IGNORE INTO ticketing_sales (
        id, flight_operation_id, service_type, opened_by_user_id, opened_at
      ) VALUES (?, ?, ?, 'USR-ADMIN', ?)`
    );
    insertSale.run(
      'sale-passenger-primary',
      'fop-ticketing-passenger',
      'PASSENGER',
      ticketingSeedTime
    );
    insertSale.run('sale-cargo-primary', 'fop-ticketing-cargo', 'CARGO', ticketingSeedTime);
    insertSale.run(
      'sale-passenger-later',
      'fop-ticketing-passenger-later',
      'PASSENGER',
      ticketingSeedTime
    );
    insertSale.run('sale-checkin-open', 'fop-checkin-open', 'PASSENGER', ticketingSeedTime);

    sqlite
      .prepare(
        `UPDATE flight_manifests
         SET status_id = 'manifest-status-draft', approved_by_user_id = NULL, approved_at = NULL,
             updated_at = ?
         WHERE flight_operation_id IN ('fop-ticketing-passenger', 'fop-ticketing-cargo')`
      )
      .run(ticketingSeedTime);

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO passenger_tickets (
          id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
          passenger_weight_kg, baggage_weight_kg, ticket_price, rate_card_id, tax_code_id,
          tax_code, tax_rate_basis_points, tax_amount, total_amount, currency_code, payment_status, payment_method,
          paid_at, check_in_status, checked_in_at, loyalty_member_id, agent_id, created_at, updated_at
        ) VALUES (
          '${passengerPaidTicketId}', 'fop-ticketing-passenger', 'Sarah Wenda', 'KTP', 'KTP-930401-443',
          '1A', 65, 8, 1800000, 'rate-passenger-djj-wmx', 'tax-non-tax', 'NON_TAX', 0, 0,
          1800000, 'IDR', 'PAID', 'TRANSFER', ?, 'PENDING', NULL, NULL,
          'agent-djj-counter', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime, ticketingSeedTime);

    for (const ticket of [
      {
        id: checkedInTicketId,
        name: 'Naomi Kambu',
        document: 'KTP-917102-610',
        seat: '1A',
        weight: 61,
        baggage: 9,
        checkInStatus: 'CHECKED_IN',
        checkedInAt: context.at(0, '14:30')
      },
      {
        id: refundReviewTicketId,
        name: 'Petrus Waromi',
        document: 'KTP-917103-722',
        seat: '1B',
        weight: 73,
        baggage: 11,
        checkInStatus: 'PENDING',
        checkedInAt: null
      }
    ]) {
      sqlite
        .prepare(
          `INSERT OR IGNORE INTO passenger_tickets (
            id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
            passenger_weight_kg, baggage_weight_kg, ticket_price, rate_card_id, tax_code_id,
            tax_code, tax_rate_basis_points, tax_amount, total_amount, currency_code, payment_status,
            payment_method, paid_at, check_in_status, checked_in_at, loyalty_member_id, agent_id,
            created_at, updated_at
          ) VALUES (?, 'fop-checkin-open', ?, 'KTP', ?, ?, ?, ?, 1800000,
            'rate-passenger-djj-wmx', 'tax-non-tax', 'NON_TAX', 0, 0, 1800000, 'IDR',
            'PAID', 'TRANSFER', ?, ?, ?, NULL, 'agent-djj-counter', ?, ?)`
        )
        .run(
          ticket.id,
          ticket.name,
          ticket.document,
          ticket.seat,
          ticket.weight,
          ticket.baggage,
          ticketingSeedTime,
          ticket.checkInStatus,
          ticket.checkedInAt,
          ticketingSeedTime,
          ticketingSeedTime
        );
      sqlite
        .prepare(
          `INSERT OR IGNORE INTO flight_manifest_passengers (
            id, manifest_id, passenger_ticket_id, full_name, identity_type, identity_number,
            weight_kg, seat_number, baggage_weight_kg, remarks, created_at, updated_at
          ) VALUES (?, 'fop-checkin-open-manifest-pax', ?, ?, 'KTP', ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `ticket-sync-${ticket.id}`,
          ticket.id,
          ticket.name,
          ticket.document,
          ticket.weight,
          ticket.seat,
          ticket.baggage,
          `Ticket ${ticket.id}`,
          ticketingSeedTime,
          ticketingSeedTime
        );
    }
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO passenger_tickets (
          id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
          passenger_weight_kg, baggage_weight_kg, ticket_price, rate_card_id, tax_code_id,
          tax_code, tax_rate_basis_points, tax_amount, total_amount, currency_code, payment_status, payment_method,
          paid_at, check_in_status, checked_in_at, loyalty_member_id, agent_id, created_at, updated_at
        ) VALUES (
          '${passengerUnpaidTicketId}', 'fop-ticketing-passenger', 'Alex Giai', 'KTP', 'KTP-912201-112',
          '1B', 78, 12, 1800000, 'rate-passenger-djj-wmx', 'tax-non-tax', 'NON_TAX', 0, 0,
          1800000, 'IDR', 'UNPAID', NULL, NULL, 'PENDING', NULL, NULL, NULL, ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO passenger_tickets (
          id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
          passenger_weight_kg, baggage_weight_kg, ticket_price, rate_card_id, tax_code_id,
          tax_code, tax_rate_basis_points, tax_amount, total_amount, currency_code, payment_status, payment_method,
          paid_at, check_in_status, checked_in_at, loyalty_member_id, agent_id, created_at, updated_at
        ) VALUES (
          '${passengerRescheduleTicketId}', 'fop-ticketing-passenger', 'Mikael Tabuni', 'KTP',
          'KTP-920101-778', '2A', 70, 5, 1800000, 'rate-passenger-djj-wmx', 'tax-non-tax',
          'NON_TAX', 0, 0, 1800000, 'IDR', 'PAID', 'TRANSFER', ?, 'PENDING',
          NULL, NULL, 'agent-djj-counter', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime, ticketingSeedTime);

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO passenger_tickets (
          id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
          passenger_weight_kg, baggage_weight_kg, ticket_price, rate_card_id, tax_code_id,
          tax_code, tax_rate_basis_points, tax_amount, total_amount, currency_code, payment_status, payment_method,
          paid_at, check_in_status, checked_in_at, loyalty_member_id, agent_id, created_at, updated_at
        ) VALUES (
          '${otaPrimaryTicketId}', 'fop-ticketing-passenger-later', 'Rian Sitorus', 'KTP', 'KTP-940505-123',
          '1B', 75, 10, 1800000, 'rate-passenger-djj-wmx', 'tax-non-tax', 'NON_TAX', 0, 0,
          1800000, 'IDR', 'PAID', 'TRANSFER', ?, 'PENDING', NULL, NULL,
          'agent-papua-travel', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime, ticketingSeedTime);

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO passenger_tickets (
          id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
          passenger_weight_kg, baggage_weight_kg, ticket_price, rate_card_id, tax_code_id,
          tax_code, tax_rate_basis_points, tax_amount, total_amount, currency_code, payment_status, payment_method,
          paid_at, check_in_status, checked_in_at, loyalty_member_id, agent_id, created_at, updated_at
        ) VALUES (
          '${otaSecondaryTicketId}', 'fop-ticketing-passenger-later', 'Dian Lestari', 'KTP', 'KTP-950812-456',
          '1C', 62, 15, 1800000, 'rate-passenger-djj-wmx', 'tax-non-tax', 'NON_TAX', 0, 0,
          1800000, 'IDR', 'PAID', 'TRANSFER', ?, 'PENDING', NULL, NULL,
          'agent-nusantara-booking', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime, ticketingSeedTime);

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifest_passengers (
          id, manifest_id, passenger_ticket_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (
          'ticket-sync-${passengerPaidTicketId}', 'fop-ticketing-passenger-manifest-pax', '${passengerPaidTicketId}', 'Sarah Wenda', 'KTP',
          'KTP-930401-443', 65, '1A', 8, 'Ticket ${passengerPaidTicketId}', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifest_passengers (
          id, manifest_id, passenger_ticket_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (
          'ticket-sync-${passengerRescheduleTicketId}', 'fop-ticketing-passenger-manifest-pax', '${passengerRescheduleTicketId}', 'Mikael Tabuni',
          'KTP', 'KTP-920101-778', 70, '2A', 5, 'Ticket ${passengerRescheduleTicketId}', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifest_passengers (
          id, manifest_id, passenger_ticket_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (
          'ticket-sync-${passengerUnpaidTicketId}', 'fop-ticketing-passenger-manifest-pax', '${passengerUnpaidTicketId}', 'Alex Giai', 'KTP',
          'KTP-912201-112', 78, '1B', 12, 'Ticket ${passengerUnpaidTicketId}', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifest_passengers (
          id, manifest_id, passenger_ticket_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (
          'ticket-sync-${otaPrimaryTicketId}', 'fop-ticketing-passenger-later-manifest-pax', '${otaPrimaryTicketId}', 'Rian Sitorus',
          'KTP', 'KTP-940505-123', 75, '1B', 10, 'Ticket ${otaPrimaryTicketId}', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifest_passengers (
          id, manifest_id, passenger_ticket_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (
          'ticket-sync-${otaSecondaryTicketId}', 'fop-ticketing-passenger-later-manifest-pax', '${otaSecondaryTicketId}', 'Dian Lestari',
          'KTP', 'KTP-950812-456', 62, '1C', 15, 'Ticket ${otaSecondaryTicketId}', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO cargo_bookings (
          id, flight_operation_id, sender_name, receiver_name, description, actual_weight_kg,
          length_cm, width_cm, height_cm, volume_weight_kg, chargeable_weight_kg, is_dangerous,
          dg_category_id, dg_acceptance_status, payment_method, payment_status, paid_at, agent_id,
          tariff_rate, total_tariff, rate_card_id, tax_code_id, tax_code, tax_rate_basis_points,
          tax_amount, total_amount, currency_code, status, delivered_to, delivered_at, created_at, updated_at
        ) VALUES (
          '${generalCargoId}', 'fop-ticketing-cargo', 'Koperasi Kopi Wamena', 'Toko Kopi Sentani',
          'Roasted coffee shipment', 45, 40, 40, 40, 10.7, 45, 0, NULL, 'NOT_APPLICABLE',
          'TRANSFER', 'PAID', ?, 'agent-papua-cargo', 32000, 1440000, 'rate-cargo-djj-wmx',
          'tax-ppn', 'PPN_11', 1100, 158400, 1598400, 'IDR', 'BOOKED', NULL, NULL, ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO cargo_bookings (
          id, flight_operation_id, sender_name, receiver_name, description, actual_weight_kg,
          length_cm, width_cm, height_cm, volume_weight_kg, chargeable_weight_kg, is_dangerous,
          dg_category_id, dg_acceptance_status, payment_method, payment_status, paid_at, agent_id,
          tariff_rate, total_tariff, rate_card_id, tax_code_id, tax_code, tax_rate_basis_points,
          tax_amount, total_amount, currency_code, status, delivered_to, delivered_at, created_at, updated_at
        ) VALUES (
          '${dangerousCargoId}', 'fop-ticketing-cargo', 'CV Papua Logistik Mandiri',
          'Maria Jayapura', 'Lithium battery equipment', 12, 30, 30, 30, 4.5, 12, 1, 'dg-bat',
          'PENDING', 'CASH', 'UNPAID', NULL, NULL, 32000, 384000, 'rate-cargo-djj-wmx',
          'tax-ppn', 'PPN_11', 1100, 42240, 426240, 'IDR', 'BOOKED', NULL, NULL, ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);

    const insertCargoManifest = sqlite.prepare(
      `INSERT OR IGNORE INTO flight_manifest_cargo_items (
        id, manifest_id, cargo_booking_id, description, sender_name, receiver_name, actual_weight_kg,
        volume_weight_kg, chargeable_weight_kg, dg_category_id, dg_acceptance_status_id,
        remarks, created_at, updated_at
      ) VALUES (?, 'fop-ticketing-cargo-manifest-cargo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertCargoManifest.run(
      `ticket-sync-${generalCargoId}`,
      generalCargoId,
      'Roasted coffee shipment',
      'Koperasi Kopi Wamena',
      'Toko Kopi Sentani',
      45,
      10.7,
      45,
      null,
      'dg-acceptance-status-not-applicable',
      `Ticketing ${generalCargoId}`,
      ticketingSeedTime,
      ticketingSeedTime
    );
    insertCargoManifest.run(
      `ticket-sync-${dangerousCargoId}`,
      dangerousCargoId,
      'Lithium battery equipment',
      'CV Papua Logistik Mandiri',
      'Maria Jayapura',
      12,
      4.5,
      12,
      'dg-bat',
      'dg-acceptance-status-pending',
      `Ticketing ${dangerousCargoId}`,
      ticketingSeedTime,
      ticketingSeedTime
    );

    const insertRefund = sqlite.prepare(
      `INSERT OR IGNORE INTO ticketing_refund_requests (
        id, flight_operation_id, subject_type, passenger_ticket_id, cargo_booking_id,
        reason, status, amount, currency_code, requested_by_user_id, requested_at,
        decided_by_user_id, decided_at, decision_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IDR', ?, ?, ?, ?, ?, ?, ?)`
    );
    insertRefund.run(
      'refund-passenger-requested',
      'fop-checkin-open',
      'PASSENGER',
      refundReviewTicketId,
      null,
      'Passenger requested cancellation before check-in.',
      'REQUESTED',
      1800000,
      'USR-STATION-ADMIN',
      context.at(0, '13:30'),
      null,
      null,
      null,
      ticketingSeedTime,
      ticketingSeedTime
    );
    insertRefund.run(
      'refund-passenger-approved',
      'fop-ticketing-passenger-later',
      'PASSENGER',
      otaPrimaryTicketId,
      null,
      'Passenger cancelled within the refundable booking window.',
      'APPROVED',
      1800000,
      'USR-001',
      context.at(-1, '10:00'),
      'USR-FINANCE-REVIEWER',
      context.at(-1, '11:00'),
      'Approved according to the published fare conditions.',
      context.at(-1, '10:00'),
      context.at(-1, '11:00')
    );
    sqlite
      .prepare(
        `UPDATE passenger_tickets SET ticket_status = 'REFUNDED', updated_at = ? WHERE id = ?`
      )
      .run(context.at(-1, '11:00'), otaPrimaryTicketId);
    sqlite
      .prepare('DELETE FROM flight_manifest_passengers WHERE id = ?')
      .run(`ticket-sync-${otaPrimaryTicketId}`);
    insertRefund.run(
      'refund-cargo-rejected',
      'fop-ticketing-cargo',
      'CARGO',
      null,
      dangerousCargoId,
      'Sender requested cancellation after handling preparation began.',
      'REJECTED',
      426240,
      'USR-STATION-ADMIN',
      context.at(-1, '09:00'),
      'USR-FINANCE-REVIEWER',
      context.at(-1, '10:00'),
      'Rejected because the shipment had not been paid.',
      context.at(-1, '09:00'),
      context.at(-1, '10:00')
    );
  });

  seed();
}
