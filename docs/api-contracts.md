# API Contracts

All endpoints return a standard envelope:

```ts
type ApiResponse<T> =
  | { ok: true; data: T; meta?: { requestId?: string; count?: number; demoMode?: boolean } }
  | { ok: false; error: { code: string; message: string; details?: unknown }; meta?: ApiMeta };
```

Request params, query strings, and bodies are validated with feature-owned Zod schemas.

## Auth

- `GET /api/auth/session` -> `DemoSessionDto`
- `POST /api/auth/role` body `{ role }` -> `DemoSessionDto`

Roles: `Director`, `OCC`, `Station Admin`, `Maintenance Manager`, `Demo Admin`.

## Flight Operations

`flight_operations.id` is the universal flight identifier used by every dependent domain.

- `GET /api/flight-operations/flights` -> flight operation list
- `POST /api/flight-operations/flights` -> create flight operation
- `GET /api/flight-operations/flights/:id` -> flight operation detail
- `PUT /api/flight-operations/flights/:id` -> update flight operation
- `POST /api/flight-operations/flights/:id/actions/*` -> lifecycle actions
- `GET /api/flight-operations/flight-following` -> `FlightFollowingDto`

Fuel, station service, station cost, maintenance handoff, manifest, approval, readiness, and closure endpoints are grouped under `/api/flight-operations`. All payloads and rows refer to a `flightOperationId`.

## Dashboard

- `GET /api/dashboard?date=&stationId=&status=` -> `DashboardDto`

The dashboard is calculated from canonical operations, ticketing, fuel, station cost, maintenance handoff, invoice, and payment data. Alerts are derived from current blockers and overdue workflow state; they are not stored as a second flight status.

## Invoices

- `GET /api/invoices?status=&limit=&offset=` -> `InvoiceSummaryDto[]`
- `GET /api/invoices/:id` -> `InvoiceDetailDto`
- `POST /api/invoices/:id/actions/record-payment` body `RecordPaymentBody` -> `PaymentDto`

Invoices use `flightOperationId`. A ready finance handoff creates at most one draft invoice for a closed flight.

## Ticketing

- `GET /api/ticketing/available-flights?serviceType=&originStationId=&destinationStationId=` -> `AvailableTicketingFlightDto[]`
- `GET /api/ticketing/sales` -> `TicketingOccFlightDto[]`
- `POST /api/ticketing/sales/open` body `{ flightOperationId }` -> `TicketingSalesOpeningDto`
- `GET /api/ticketing/passenger-tickets?search=&flightOperationId=&paymentStatus=&checkInStatus=` -> `PassengerTicketDto[]`
- `POST /api/ticketing/passenger-tickets` body `CreatePassengerTicketInput` -> `PassengerTicketDto`
- `GET /api/ticketing/passenger-tickets/:id` -> `PassengerTicketDto`
- `PATCH /api/ticketing/passenger-tickets/:id/payment` -> `PassengerTicketDto`
- `PATCH /api/ticketing/passenger-tickets/:id/check-in` -> `PassengerTicketDto`
- `GET /api/ticketing/flights/:id/occupied-seats` -> `string[]`
- `GET /api/ticketing/cargo-bookings?search=&flightOperationId=&paymentStatus=&status=` -> `CargoBookingDto[]`
- `POST /api/ticketing/cargo-bookings` body `CreateCargoBookingInput` -> `CargoBookingDto`
- `GET /api/ticketing/cargo-bookings/:id` -> `CargoBookingDto`
- `PATCH /api/ticketing/cargo-bookings/:id/payment` -> `CargoBookingDto`
- `PATCH /api/ticketing/cargo-bookings/:id/delivery` -> `CargoBookingDto`
- `GET /api/ticketing/ledger` -> `TicketingLedgerDto`

## Uploads

- `GET /api/uploads` -> `LocalUploadDto[]`
- `POST /api/uploads` multipart field `file` -> `LocalUploadDto`
- `GET /api/uploads/:id` -> `LocalUploadDto`
- `GET /api/uploads/:id/file` -> file stream for inline view
- `GET /api/uploads/:id/file?download=1` -> file stream as attachment
- `DELETE /api/uploads/:id` -> deleted `LocalUploadDto`
- `POST /api/uploads/receipts` multipart field `file` -> `{ filename, path, size, contentType }`

General uploads are stored under `data/uploads/local` with local metadata in `data/local-uploads.json`. Receipt mock uploads are stored under `public/uploads/mock-receipts`.

## Documents

- `GET /api/documents?ownerType=&ownerId=&status=&verificationStatus=&search=` -> `MasterDocumentDto[]`
- `POST /api/documents` body `CreateDocumentBody` -> `MasterDocumentDto`
- `GET /api/documents/:id` -> `MasterDocumentDto`
- `PATCH /api/documents/:id` body `UpdateDocumentBody` -> `MasterDocumentDto`
- `DELETE /api/documents/:id` -> deleted `MasterDocumentDto`
- `POST /api/documents/:id/verify` -> `MasterDocumentDto`
- `POST /api/documents/:id/reject` body `{ rejectionReason }` -> `MasterDocumentDto`
- `POST /api/documents/:id/supersede` body `SupersedeDocumentBody` -> new `MasterDocumentDto`

Document metadata is stored in `data/local-documents.json`. File bytes remain in the upload domain and are served only through `/api/uploads/:id/file`.
