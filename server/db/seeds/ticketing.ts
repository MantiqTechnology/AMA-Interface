import type Database from 'better-sqlite3';

const ticketingSeedTime = '2026-07-13T09:00:00.000+07:00';

export function seedTicketingData(sqlite: Database.Database) {
  const seed = sqlite.transaction(() => {
    const insertSale = sqlite.prepare(
      `INSERT OR IGNORE INTO ticketing_sales (
        id, flight_operation_id, service_type, opened_by_user_id, opened_at
      ) VALUES (?, ?, ?, 'USR-DEMO-ADMIN', ?)`
    );
    insertSale.run(
      'sale-passenger-demo',
      'fop-ticketing-passenger',
      'PASSENGER',
      ticketingSeedTime
    );
    insertSale.run('sale-cargo-demo', 'fop-ticketing-cargo', 'CARGO', ticketingSeedTime);
    insertSale.run(
      'sale-passenger-later',
      'fop-ticketing-passenger-later',
      'PASSENGER',
      ticketingSeedTime
    );

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
          passenger_weight_kg, baggage_weight_kg, ticket_price, payment_status, payment_method,
          paid_at, check_in_status, checked_in_at, loyalty_member_id, agent_id, created_at, updated_at
        ) VALUES (
          'TKT-DEMO12', 'fop-ticketing-passenger', 'Sarah Wenda', 'KTP', 'KTP-930401-443',
          '1A', 65, 8, 1800000, 'PAID', 'TRANSFER', ?, 'PENDING', NULL, NULL,
          'agent-djj-counter', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO passenger_tickets (
          id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
          passenger_weight_kg, baggage_weight_kg, ticket_price, payment_status, payment_method,
          paid_at, check_in_status, checked_in_at, loyalty_member_id, agent_id, created_at, updated_at
        ) VALUES (
          'TKT-DEMO34', 'fop-ticketing-passenger', 'Alex Giai', 'KTP', 'KTP-912201-112',
          '1B', 78, 12, 1800000, 'UNPAID', NULL, NULL, 'PENDING', NULL, NULL, NULL, ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO passenger_tickets (
          id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
          passenger_weight_kg, baggage_weight_kg, ticket_price, payment_status, payment_method,
          paid_at, check_in_status, checked_in_at, loyalty_member_id, agent_id, created_at, updated_at
        ) VALUES (
          'TKT-RESCHEDULE', 'fop-ticketing-passenger', 'Mikael Tabuni', 'KTP',
          'KTP-920101-778', '2A', 70, 5, 1800000, 'PAID', 'TRANSFER', ?, 'PENDING',
          NULL, NULL, 'agent-djj-counter', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime, ticketingSeedTime);

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifest_passengers (
          id, manifest_id, passenger_ticket_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (
          'ticket-sync-TKT-DEMO12', 'fop-ticketing-passenger-manifest-pax', 'TKT-DEMO12', 'Sarah Wenda', 'KTP',
          'KTP-930401-443', 65, '1A', 8, 'Ticket TKT-DEMO12', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifest_passengers (
          id, manifest_id, passenger_ticket_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (
          'ticket-sync-TKT-RESCHEDULE', 'fop-ticketing-passenger-manifest-pax', 'TKT-RESCHEDULE', 'Mikael Tabuni',
          'KTP', 'KTP-920101-778', 70, '2A', 5, 'Ticket TKT-RESCHEDULE', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO flight_manifest_passengers (
          id, manifest_id, passenger_ticket_id, full_name, identity_type, identity_number, weight_kg, seat_number,
          baggage_weight_kg, remarks, created_at, updated_at
        ) VALUES (
          'ticket-sync-TKT-DEMO34', 'fop-ticketing-passenger-manifest-pax', 'TKT-DEMO34', 'Alex Giai', 'KTP',
          'KTP-912201-112', 78, '1B', 12, 'Ticket TKT-DEMO34', ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime);

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO cargo_bookings (
          id, flight_operation_id, sender_name, receiver_name, description, actual_weight_kg,
          length_cm, width_cm, height_cm, volume_weight_kg, chargeable_weight_kg, is_dangerous,
          dg_category_id, dg_acceptance_status, payment_method, payment_status, paid_at, agent_id,
          tariff_rate, total_tariff, status, delivered_to, delivered_at, created_at, updated_at
        ) VALUES (
          'AWB-100200', 'fop-ticketing-cargo', 'Koperasi Kopi Wamena', 'Toko Kopi Sentani',
          'Roasted coffee shipment', 45, 40, 40, 40, 10.7, 45, 0, NULL, 'NOT_APPLICABLE',
          'TRANSFER', 'PAID', ?, 'agent-papua-cargo', 32000, 1440000, 'BOOKED', NULL, NULL, ?, ?
        )`
      )
      .run(ticketingSeedTime, ticketingSeedTime, ticketingSeedTime);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO cargo_bookings (
          id, flight_operation_id, sender_name, receiver_name, description, actual_weight_kg,
          length_cm, width_cm, height_cm, volume_weight_kg, chargeable_weight_kg, is_dangerous,
          dg_category_id, dg_acceptance_status, payment_method, payment_status, paid_at, agent_id,
          tariff_rate, total_tariff, status, delivered_to, delivered_at, created_at, updated_at
        ) VALUES (
          'AWB-300400', 'fop-ticketing-cargo', 'CV Papua Logistik Mandiri',
          'Maria Jayapura', 'Lithium battery equipment', 12, 30, 30, 30, 4.5, 12, 1, 'dg-bat',
          'PENDING', 'CASH', 'UNPAID', NULL, NULL, 32000, 384000, 'BOOKED', NULL, NULL, ?, ?
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
      'ticket-sync-AWB-100200',
      'AWB-100200',
      'Roasted coffee shipment',
      'Koperasi Kopi Wamena',
      'Toko Kopi Sentani',
      45,
      10.7,
      45,
      null,
      'dg-acceptance-status-not-applicable',
      'Ticketing AWB-100200',
      ticketingSeedTime,
      ticketingSeedTime
    );
    insertCargoManifest.run(
      'ticket-sync-AWB-300400',
      'AWB-300400',
      'Lithium battery equipment',
      'CV Papua Logistik Mandiri',
      'Maria Jayapura',
      12,
      4.5,
      12,
      'dg-bat',
      'dg-acceptance-status-pending',
      'Ticketing AWB-300400',
      ticketingSeedTime,
      ticketingSeedTime
    );
  });

  seed();
}
