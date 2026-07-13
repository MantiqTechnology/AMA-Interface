export const ticketingStatements = [
  `CREATE TABLE IF NOT EXISTS ticketing_sales (
    id TEXT PRIMARY KEY,
    flight_operation_id TEXT NOT NULL REFERENCES flight_operations(id) ON DELETE CASCADE,
    flight_order_id TEXT NOT NULL REFERENCES flight_orders(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('PASSENGER', 'CARGO')),
    opened_by_user_id TEXT NOT NULL,
    opened_at TEXT NOT NULL,
    UNIQUE (flight_operation_id),
    UNIQUE (flight_order_id)
  )`,
  `CREATE TABLE IF NOT EXISTS passenger_tickets (
    id TEXT PRIMARY KEY,
    flight_order_id TEXT NOT NULL REFERENCES flight_orders(id) ON DELETE CASCADE,
    passenger_name TEXT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'KTP',
    document_number TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    passenger_weight_kg REAL NOT NULL CHECK (passenger_weight_kg > 0),
    baggage_weight_kg REAL NOT NULL DEFAULT 0 CHECK (baggage_weight_kg >= 0),
    ticket_price INTEGER NOT NULL CHECK (ticket_price >= 0),
    ticket_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (ticket_status IN ('ACTIVE', 'REFUNDED')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID')),
    payment_method TEXT,
    paid_at TEXT,
    check_in_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (check_in_status IN ('PENDING', 'CHECKED_IN')),
    checked_in_at TEXT,
    loyalty_member_id TEXT,
    agent_id TEXT REFERENCES agents(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cargo_bookings (
    id TEXT PRIMARY KEY,
    flight_order_id TEXT NOT NULL REFERENCES flight_orders(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    description TEXT NOT NULL,
    actual_weight_kg REAL NOT NULL CHECK (actual_weight_kg > 0),
    length_cm REAL NOT NULL CHECK (length_cm > 0),
    width_cm REAL NOT NULL CHECK (width_cm > 0),
    height_cm REAL NOT NULL CHECK (height_cm > 0),
    volume_weight_kg REAL NOT NULL CHECK (volume_weight_kg >= 0),
    chargeable_weight_kg REAL NOT NULL CHECK (chargeable_weight_kg > 0),
    is_dangerous INTEGER NOT NULL DEFAULT 0,
    dg_category_id TEXT REFERENCES dg_categories(id),
    dg_acceptance_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE' CHECK (dg_acceptance_status IN ('NOT_APPLICABLE', 'PENDING', 'ACCEPTED', 'REJECTED')),
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID')),
    paid_at TEXT,
    agent_id TEXT REFERENCES agents(id),
    tariff_rate INTEGER NOT NULL CHECK (tariff_rate >= 0),
    total_tariff INTEGER NOT NULL CHECK (total_tariff >= 0),
    status TEXT NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'DELIVERED')),
    delivered_to TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ticketing_refund_requests (
    id TEXT PRIMARY KEY,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('PASSENGER', 'CARGO')),
    passenger_ticket_id TEXT REFERENCES passenger_tickets(id) ON DELETE CASCADE,
    cargo_booking_id TEXT REFERENCES cargo_bookings(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED')),
    amount INTEGER NOT NULL CHECK (amount >= 0),
    currency_code TEXT NOT NULL,
    requested_by_user_id TEXT NOT NULL,
    requested_at TEXT NOT NULL,
    decided_by_user_id TEXT,
    decided_at TEXT,
    decision_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
      (subject_type = 'PASSENGER' AND passenger_ticket_id IS NOT NULL AND cargo_booking_id IS NULL)
      OR (subject_type = 'CARGO' AND cargo_booking_id IS NOT NULL AND passenger_ticket_id IS NULL)
    )
  )`,
  `CREATE TABLE IF NOT EXISTS passenger_ticket_reschedules (
    id TEXT PRIMARY KEY,
    passenger_ticket_id TEXT NOT NULL REFERENCES passenger_tickets(id) ON DELETE CASCADE,
    previous_flight_order_id TEXT NOT NULL REFERENCES flight_orders(id),
    new_flight_order_id TEXT NOT NULL REFERENCES flight_orders(id),
    previous_seat_number TEXT NOT NULL,
    new_seat_number TEXT NOT NULL,
    rescheduled_by_user_id TEXT NOT NULL,
    rescheduled_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ticketing_sales_service ON ticketing_sales(service_type)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS flight_manifest_passengers_manifest_seat_unique
   ON flight_manifest_passengers(manifest_id, seat_number)
   WHERE seat_number IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS passenger_tickets_flight_seat_unique
   ON passenger_tickets(flight_order_id, seat_number)
   WHERE ticket_status = 'ACTIVE'`,
  `CREATE INDEX IF NOT EXISTS idx_passenger_tickets_flight ON passenger_tickets(flight_order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_passenger_tickets_payment ON passenger_tickets(payment_status)`,
  `CREATE INDEX IF NOT EXISTS idx_cargo_bookings_flight ON cargo_bookings(flight_order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cargo_bookings_payment ON cargo_bookings(payment_status)`,
  `CREATE INDEX IF NOT EXISTS idx_ticketing_refunds_status ON ticketing_refund_requests(status)`,
  `CREATE INDEX IF NOT EXISTS idx_ticketing_refunds_passenger ON ticketing_refund_requests(passenger_ticket_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ticketing_refunds_cargo ON ticketing_refund_requests(cargo_booking_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ticketing_refunds_open_passenger_unique
   ON ticketing_refund_requests(passenger_ticket_id)
   WHERE passenger_ticket_id IS NOT NULL AND status = 'REQUESTED'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ticketing_refunds_open_cargo_unique
   ON ticketing_refund_requests(cargo_booking_id)
   WHERE cargo_booking_id IS NOT NULL AND status = 'REQUESTED'`,
  `CREATE INDEX IF NOT EXISTS idx_passenger_reschedules_ticket
   ON passenger_ticket_reschedules(passenger_ticket_id)`,
  `CREATE INDEX IF NOT EXISTS idx_passenger_reschedules_time
   ON passenger_ticket_reschedules(rescheduled_at)`
];

export const ticketingDropStatements = [
  'DROP TABLE IF EXISTS passenger_ticket_reschedules',
  'DROP TABLE IF EXISTS ticketing_refund_requests',
  'DROP TABLE IF EXISTS cargo_bookings',
  'DROP TABLE IF EXISTS passenger_tickets',
  'DROP TABLE IF EXISTS ticketing_sales'
];
