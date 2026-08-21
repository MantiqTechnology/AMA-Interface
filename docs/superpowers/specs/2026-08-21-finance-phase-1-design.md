# Finance Phase 1 Design

## Goal

Turn the existing policy-driven accounting core into a transactional Finance system with canonical handoff control, AR/AP subledgers, cash/bank projections, and bank reconciliation without introducing a second posting engine or accounting ledger.

## Non-Negotiable Invariants

- `AccountingService` is the single posting engine.
- Every posted journal is balanced, immutable, period-valid, and source-idempotent.
- Journal lines are the source for GL, Trial Balance, and cash/bank book projections.
- Source-owned operational records remain in their source modules.
- Allocation and accounting posting complete in one SQLite transaction.
- Settlement derives from posted allocations, not invoice or payment status alone.
- Approval thresholds use deterministic IDR base amounts and preserve currency/rate inputs.
- No Phase 1 dashboard metric may use hardcoded financial data.

## Accounting Ownership Matrix

| Source/Event                   | Recognition Point                                                                                               | Financial Owner                                  | Debit                                         | Credit                                                              | Dimensions                                                           | Idempotency Key                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| Ticketing payment              | Successful paid passenger ticket or cargo booking before service                                                | Ticketing source, Finance posting engine         | Cash/Bank                                     | Deferred Revenue                                                    | Flight, route, station, aircraft when known                          | `ticket-payment:{source_type}:{source_id}`             |
| Flight passenger/cargo revenue | Fulfilled passenger service or completed cargo flight                                                           | Flight/Ticketing handoff, Finance posting engine | Deferred Revenue                              | Passenger/Cargo Revenue                                             | Flight, route, station, aircraft                                     | `service-fulfilled:{ticket_or_booking_id}`             |
| Customer invoice               | Issued credit invoice only; prepaid passenger/cargo invoice is a billing document and creates no second revenue | AR subledger, Finance posting engine             | AR                                            | Revenue and output tax only for recognition-owning invoice profiles | Customer, flight, route, station, aircraft, cost center              | `customer-invoice-issued:{invoice_id}`                 |
| Customer receipt               | Receipt posted and allocation committed atomically                                                              | AR subledger, Finance posting engine             | Cash/Bank                                     | AR                                                                  | Customer, cash/bank account, invoice dimensions                      | `customer-receipt-posted:{receipt_id}`                 |
| PO goods receipt               | Accepted inventory goods receipt                                                                                | Inventory source, Finance posting engine         | Inventory/Expense                             | GRNI                                                                | Station, cost center, PO/GR references                               | `inventory-received:{movement_id}`                     |
| Supplier invoice, PO-based     | Invoice matched to PO and accepted GR quantities                                                                | AP subledger, Finance posting engine             | GRNI plus price/tax variance where applicable | AP                                                                  | Supplier, station, cost center, PO, GR                               | `supplier-invoice-po-posted:{supplier_invoice_id}`     |
| Supplier invoice, non-PO       | Approved invoice without prior cost recognition                                                                 | AP subledger, Finance posting engine             | Expense/Asset/Input Tax                       | AP                                                                  | Supplier, station, flight, aircraft, route, cost center              | `supplier-invoice-non-po-posted:{supplier_invoice_id}` |
| Supplier payment               | Approved payment request executed and allocated atomically                                                      | AP subledger, Finance posting engine             | AP                                            | Cash/Bank                                                           | Supplier, cash/bank account, invoice dimensions                      | `supplier-payment-executed:{payment_id}`               |
| Inventory issue                | Finalized FIFO issue to maintenance/operation                                                                   | Inventory source, Finance posting engine         | Maintenance/Operational Expense or Asset      | Inventory                                                           | Aircraft, flight, station, cost center, work package                 | `inventory-issue:{movement_id}`                        |
| Fuel cost                      | Validated uplift/cost for a completed flight before vendor invoice                                              | Fuel source, Finance posting engine              | Fuel Expense                                  | Accrued Liability                                                   | Flight, route, station, aircraft, cost center                        | `fuel-cost-posted:{fuel_cost_id}`                      |
| MRO service cost               | Approved external maintenance service before vendor invoice                                                     | MRO source, Finance posting engine               | Maintenance Expense                           | Accrued Liability                                                   | Flight when applicable, aircraft, station, work package, cost center | `mro-cost-approved:{maintenance_cost_id}`              |
| Station cost                   | Finance-approved actual cost with evidence before vendor invoice                                                | Flight Operations source, Finance posting engine | Handling/Parking Expense                      | Accrued Liability                                                   | Flight, route, station, aircraft, cost center                        | `station-cost-approved:{station_cost_id}`              |

### Duplicate Recognition Controls

- Passenger and cargo payments remain deferred-revenue events. Service fulfillment owns revenue recognition. Generated invoices for already-paid ticket/cargo sources are billing artifacts and never create AR or revenue events.
- Charter or other credit service invoices own AR and revenue recognition only when their accounting profile says `INVOICE_RECOGNITION`.
- PO goods receipt owns inventory/expense recognition against GRNI. A matched supplier invoice clears GRNI to AP and does not debit inventory again.
- Fuel, MRO service, and station cost accounting recognize expense against accrued liability before a vendor invoice exists. AP remains reserved for supplier-invoice subledger postings; a later supplier document must clear the accrual to AP rather than recognize the expense again.

## Architecture

### Foundation

Existing CoA, periods, accounting policies, events, journals, GL, and Trial Balance remain canonical. Add generic `financial_dimension_values` linked to accounting events, journals, and handoffs while retaining legacy fixed columns for compatibility. Add approval authority rules normalized to IDR base amounts.

### Canonical Finance Handoff

`finance_handoffs` is an orchestration record with a unique source event identity. Source adapters bridge `flight_finance_handoffs`, `inventory_accounting_events`, ticketing, procurement, fuel, and MRO records without transferring source ownership. Status history and exception data are persisted; retry reuses the same handoff and accounting event.

### AR

Customer invoices carry separate lifecycle and settlement states. `customer_receipts` and `receipt_allocations` hold receipt and allocation state. Only `POSTED` allocations reduce outstanding. Receipt posting, journal creation/posting, allocations, settlement state, and cash projection are committed in one database transaction.

### AP

Supplier invoices are explicitly `PO` or `NON_PO`. PO invoices calculate matching state from PO, GR, and invoice quantities/prices. Payment requests enforce maker-checker and threshold rules. Only executed, posted payment allocations reduce payable outstanding.

### Cash, Bank, and Reconciliation

Cash/bank accounts map to postable GL accounts. `cash_bank_book_transactions` contain references to posted journal lines and cannot exist without those lines. Bank statements and lines are external records. Reconciliation matches statement lines to book projections and never mutates a journal.

## Transaction Boundaries

All state-changing Finance services use `better-sqlite3` transactions. A failed policy resolution, journal creation, approval, or posting leaves allocation settlement unchanged and records a visible exception where an outer transaction can safely retain it. Duplicate source calls return the existing result.

## UI

Operational pages expose backend data only: Finance Dashboard, Handoff Inbox, Customer Invoices/AR, Receipts, Supplier Invoices/AP, Payments, Cash & Bank, Reconciliation, Accounting Workbench, Trial Balance, and Finance Master Data. Unsupported profitability and closing claims remain out of Phase 1.

## Verification

- F0 regression tests execute before schema work.
- Every F1-F4 behavior follows red-green-refactor.
- Golden scenarios verify persisted state and GL lineage, not only DTO status.
- Final checks include targeted Vitest, demo reset, integrity SQL, typecheck, build, and relevant Playwright/API flows.
