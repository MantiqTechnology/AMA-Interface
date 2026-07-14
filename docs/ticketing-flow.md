# Ticketing and Cargo Flow

The ticketing demo is implemented as an independent domain under `server/features/ticketing`, `shared/features/ticketing`, and `app/features/ticketing`. It uses the canonical Operations, Commercial, Finance, and Cargo master tables directly.

## Open Sales

1. Ticketing Management lists OCC records from `flight_operations`.
2. Sales can open only when aircraft, PIC, customer, schedule, serviceable aircraft, and an active route rate are present.
3. `POST /api/ticketing/sales/open` creates one `ticketing_sales` row keyed directly by `flight_operation_id`; it never creates or copies a flight.
4. No station, route, aircraft, or customer is copied. Missing master data blocks the action and must be fixed in its owning feature.

## Passenger Booking

1. The portal lists only `ticketing_sales` flights with an active passenger rate.
2. The server validates the seat against aircraft capacity and calculates the fare from `rate_cards`.
3. A unique `(flight_operation_id, seat_number)` index prevents concurrent double booking.
4. `passenger_tickets` and source-linked `flight_manifest_passengers` are written in one SQLite transaction.
5. Payment is required before check-in.

## Cargo Booking

1. Volumetric weight is calculated as `length * width * height / 6000`.
2. Chargeable weight is the greater of actual and volumetric weight.
3. The server applies the canonical cargo rate and minimum charge, then validates aircraft cargo capacity.
4. Dangerous cargo requires an active `dg_categories` record and enters the OCC manifest with pending DG acceptance.
5. `cargo_bookings` and source-linked `flight_manifest_cargo_items` are written in one transaction. Payment is required before proof of delivery.

## Screens

- `/ticketing/booking`: public passenger booking, cargo registration, payment lookup, and PDF documents.
- `/ticketing/passenger`: passenger payment and check-in manifest.
- `/ticketing/cargo`: AWB tracking and proof of delivery.
- `/ticketing/management`: canonical tariffs and OCC sales opening.
- `/ticketing/finance`: passenger and cargo station ledger.
