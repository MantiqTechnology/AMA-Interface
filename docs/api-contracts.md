# API Contracts

All endpoints return a standard envelope:

```ts
type ApiResponse<T> =
  | { ok: true; data: T; meta?: { requestId?: string; count?: number; demoMode?: boolean } }
  | { ok: false; error: { code: string; message: string; details?: unknown }; meta?: ApiMeta };
```

Request params, query strings, and bodies are validated with Zod schemas from `shared/contracts`.

## Auth

- `GET /api/auth/session` -> `DemoSessionDto`
- `POST /api/auth/role` body `{ role }` -> `DemoSessionDto`

Roles: `Director`, `OCC`, `Station Admin`, `Maintenance Manager`.

## Operations Command Center Pack

The `/ops/*` pages currently run from local fixture state loaded from `data/ops-demo-db.json`. Domain mutations such as readiness rerun, dispatch approval, mock fuel/handling confirmation, flight-following update, and closure are guarded by `authorizeOperation()` in `app/utils/operations/policies.ts`.

Production swap path:

- keep the DTO shape and standard API envelope;
- expose the same domain actions as server endpoints;
- run module entitlement, RBAC, station scope, workflow transition, and readiness guards on the server before writing;
- persist audit/timeline events in the production database instead of Nuxt local state.

## Dashboard

- `GET /api/dashboard` -> `DashboardDto`

Includes KPIs, latest flights, pending fuel requests, submitted station expenses, invoices, approvals, and alerts.

## Flights

- `GET /api/flights?status=&station=&limit=&offset=` -> `FlightSummaryDto[]`
- `POST /api/flights` body `CreateFlightOrderBody` -> `FlightDetailDto`
- `GET /api/flights/:id` -> `FlightDetailDto`
- `POST /api/flights/:id/actions/dispatch` -> `FlightDetailDto`

## Fuel

- `GET /api/fuel/requests?status=&limit=&offset=` -> `FuelRequestDto[]`
- `POST /api/fuel/requests` body `CreateFuelRequestBody` -> `FuelRequestDto`
- `GET /api/fuel/requests/:id` -> `FuelRequestDto`
- `POST /api/fuel/requests/:id/actions/approve` -> `FuelRequestDto`
- `POST /api/fuel/requests/:id/actions/uplift` body `RecordFuelUpliftBody` -> `FuelUpliftDto`

## Station Expenses

- `GET /api/station-expenses?status=&stationId=&limit=&offset=` -> `StationExpenseDto[]`
- `POST /api/station-expenses` body `CreateStationExpenseBody` -> `StationExpenseDto`
- `POST /api/station-expenses/:id/actions/submit` -> `StationExpenseDto`
- `POST /api/station-expenses/:id/receipt` body `{ receiptPath }` -> `StationExpenseDto`

## Invoices

- `GET /api/invoices?status=&limit=&offset=` -> `InvoiceSummaryDto[]`
- `GET /api/invoices/:id` -> `InvoiceDetailDto`
- `POST /api/invoices/:id/actions/record-payment` body `RecordPaymentBody` -> `PaymentDto`

## Approvals

- `GET /api/approvals?status=&roleRequired=&limit=&offset=` -> `ApprovalDto[]`
- `POST /api/approvals/:id/actions/decision` body `DecideApprovalBody` -> `ApprovalDto`

## Maintenance

- `GET /api/maintenance/work-orders?status=&aircraftId=&limit=&offset=` -> `MaintenanceWorkOrderDto[]`
- `POST /api/maintenance/work-orders` body `CreateWorkOrderBody` -> `MaintenanceWorkOrderDto`
- `GET /api/maintenance/work-orders/:id` -> `MaintenanceWorkOrderDto`
- `POST /api/maintenance/work-orders/:id/actions/close` body `CloseWorkOrderBody` -> `MaintenanceWorkOrderDto`

## Uploads

- `GET /api/uploads` -> `LocalUploadDto[]`
- `POST /api/uploads` multipart field `file` -> `LocalUploadDto`
- `GET /api/uploads/:id` -> `LocalUploadDto`
- `GET /api/uploads/:id/file` -> file stream for inline view
- `GET /api/uploads/:id/file?download=1` -> file stream as attachment
- `DELETE /api/uploads/:id` -> deleted `LocalUploadDto`
- `POST /api/uploads/receipts` multipart field `file` -> `{ filename, path, size, contentType }`

General uploads are stored under `data/uploads/local` with local metadata in `data/local-uploads.json`.
The legacy receipt mock endpoint stores files under `public/uploads/mock-receipts`.
Swap this for object storage or a production document service later without changing station expense DTOs.

Run `pnpm uploads:migrate-local` once to move older local uploads from `public/uploads/local` into private local storage.

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

## Ticketing

- `GET /api/ticketing/tickets?id=&flightOrderId=` -> List of passenger tickets or single passenger ticket.
- `POST /api/ticketing/book-passenger` body `{ flightOrderId, passengerName, documentNumber, seatNumber, weightKg, ticketPrice, loyaltyMemberId, agentId }` -> Creates a passenger ticket. Validates seat occupancy to prevent double bookings.
- `GET /api/ticketing/cargo-bookings?id=` -> List of cargo bookings or single cargo booking.
- `POST /api/ticketing/book-cargo` body `{ flightOrderId, senderName, receiverName, actualWeightKg, lengthCm, widthCm, heightCm, isDangerous, dgClass, paymentMethod, agentId, totalTariff }` -> Creates a cargo booking.
- `POST /api/ticketing/pay-ticket` body `{ ticketId }` -> Sets passenger ticket payment status to PAID.
- `POST /api/ticketing/pay-cargo` body `{ cargoBookingId }` -> Sets cargo booking payment status to PAID.
- `POST /api/ticketing/check-in` body `{ ticketId }` -> Sets passenger check-in status to CHECKED_IN.
- `GET /api/ticketing/occupied-seats?flightOrderId=` -> Array of occupied seat numbers (e.g. `["1A", "1B"]`) for the specified flight order.
- `POST /api/ticketing/open-sales` body `{ flightOperationId }` -> Creates a commercial flight order in `flight_orders` mapped from the OCC's `flight_operations` record.

For detailed visual and business workflows of the ticketing features (including seatmap mapping, double-booking validation, and client-side PDF exports), refer to [docs/ticketing-flow.md](file:///home/mark/Development/project/AMA-Interface/docs/ticketing-flow.md).
