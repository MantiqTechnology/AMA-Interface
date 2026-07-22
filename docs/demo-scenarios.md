# PT AMA Scenario Runbook

The scenario database is rebuilt whenever the application process starts with `DEMO_MODE=true`.
Changes made during a session are intentionally discarded at the next restart.

Use a fixed presentation date when screenshots, ticket numbers, or flight numbers must remain stable:

```bash
DEMO_SEED_DATE=2026-07-17 pnpm demo:reset
pnpm demo:scenarios
```

## Presentation Flow

1. **OCC:** open `/flights/requests`, review the request queue, then inspect the converted DG charter in `/flights/readiness`.
2. **Director:** open `/flights` and approve the flight marked ready for approval.
3. **Station Admin:** open `/ticketing/passenger` for check-in and rescheduling, then `/ticketing/cargo` for DG acceptance.
4. **Finance Reviewer:** open `/ticketing/management` for the pending refund and `/invoices` for the partially paid charter invoice.
5. **OCC:** open `/ops/flight-following` for the active remote flight and review the weather diversion from `/flights`.
6. **Maintenance Manager:** open `/flights/maintenance` for the landed flight and its oil-filter handoff.
7. **Inventory Controller:** open `/inventory/purchase-requests` and `/inventory/purchase-orders` for submitted, pending-approval, and partially received procurement records.
8. **OCC / Finance:** finish with `/flights/actual-closure`, the closed charter, cancellation, and reopened correction states.

## Finance Accounting Rehearsal

Open `/finance/accounting` as Finance Reviewer or Director. The baseline is created through the
same accounting service used by the application, so every journal can be traced to its persisted
operational source.

| Scenario                         | Seeded source                       | Expected accounting result                                                       |
| -------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Inventory receipt                | `inv-gr-replenishment-001`          | Posted: Dr Inventory / Cr Receipt Clearing from persisted receipt value          |
| Serialized component receipt     | `inv-gr-finance-components`         | Posted receipt and FIFO layers for each starter-generator scenario               |
| Routine maintenance issue        | `inv-issue-maintenance-filter-001`  | Posted: Dr Maintenance Expense / Cr Inventory using FIFO cost                    |
| Routine issue awaiting approval  | `inv-issue-maintenance-oil-pending` | Pending approval proposal; absent from GL until posted                           |
| Heavy component awaiting review  | `inv-install-starter-draft`         | Draft capitalization proposal; no asset register yet                             |
| Heavy component awaiting posting | `inv-install-starter-approved`      | Approved capitalization proposal; no asset register until posted                 |
| Qualifying heavy component       | `inv-install-brake-active`          | Brake from the posted receipt is capitalized; active asset and 60-month preview  |
| Missing technical acceptance     | `inv-install-starter-exception`     | Persistent `MISSING_CONTEXT` exception and no journal                            |
| Reversed capitalization          | `inv-install-starter-reversed`      | Original and reversal remain posted; asset is reversed and preview is cancelled  |
| Month-end passenger payment      | `finance-ticket-month-end-001`      | Dedicated scheduled flight: Dr Cash / Cr Deferred Revenue in the previous month  |
| Passenger service fulfillment    | `finance-flight-month-crossing`     | Flight month: Dr Deferred Passenger Revenue / Cr Passenger Revenue               |
| Approved refund                  | `refund-passenger-approved`         | Dr Deferred Passenger Revenue / Cr Refund Payable; no normal revenue recognition |

Suggested walkthrough:

1. In **Posting Queue**, compare the draft component, pending routine issue, and approved component.
2. In **General Journal**, open the two journals for `finance-ticket-month-end-001` and compare their accounting dates.
3. In **General Ledger**, verify that only posted journals appear and the pending routine issue is absent.
4. In **Exceptions**, open `inv-install-starter-exception` and inspect the missing technical approval context.
5. In **Asset Components**, compare the active brake assembly and reversed starter generator with their depreciation previews.

The canonical list of scenario keys, roles, pages, and expected actions is printed by `pnpm demo:scenarios`.
