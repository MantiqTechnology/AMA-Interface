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

- `POST /api/uploads/receipts` multipart field `file` -> `{ filename, path, size, contentType }`

Uploads are stored under `public/uploads/mock-receipts` for local demos. Swap this for object storage or a production document service later without changing station expense DTOs.
