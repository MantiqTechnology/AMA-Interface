# PT AMA Scenario Runbook

The scenario database is rebuilt whenever the application process starts with `DEMO_MODE=true`.
Changes made during a session are intentionally discarded at the next restart.

Use a fixed presentation date when screenshots, ticket numbers, or flight numbers must remain stable:

```bash
DEMO_SEED_DATE=2026-07-17 pnpm demo:reset
pnpm demo:scenarios
```

## Presentation Flow

The primary aviation operations walkthrough is a 10-15 minute vertical slice:

1. Run `pnpm demo:reset`, then switch to the **OCC** persona.
2. Open `/flights/requests`, approve the submitted request with a different authorized persona, and
   convert it once. Retrying conversion returns the same Flight Order.
3. Open the generated Flight Order. Use the command strip for current phase, next action, owner, and
   active blockers.
4. Resolve readiness, maintenance coordination, fuel/manifest, and origin station evidence using
   each blocker recovery link.
5. Complete OCC acceptance and switch to **Director** for final approval.
6. Complete station preparation, departure, simulated flight tracking, arrival, and destination
   station completion.
7. In Station Services, confirm the explicitly assigned supplier, record completion evidence, and
   verify the service.
8. In Station Costs, distinguish `REFERENCE ESTIMATE` from actual, attach an invoice/evidence
   reference, submit as Station Admin, and approve as Finance Reviewer. Self-approval is rejected.
9. Complete `MAINTENANCE COORDINATION / MAINTENANCE HANDOFF`, Finance Handoff, then Closure.
10. Review the Flight Order History tab for the cross-domain audit trail.

The seeded exception flights are:

- `fop-blocked-crew-expired`: aircraft/maintenance readiness blocker;
- `fop-dg-pending`: missing manifest, fuel, or station evidence before departure;
- `fop-ticketing-passenger-later`: prepared destination-change impact from DJJ-WMX to DJJ-TIM;
- `fop-pending-closure`: existing Station Cost remains `DRAFT` and blocks closure until approved
  with a Finance Handoff or voided with a reason.

Fuel is created automatically only when a converted Flight Request contains an explicit origin
fuel supplier and a requested quantity. The generated record begins at `REQUESTED`; Station Admin
must approve it, record uplift, and post it in `/flights/fuel`. A directly created Flight Order does
not silently choose a supplier, so its fuel request must be created explicitly in Fuel Control.

All flight-following positions are labelled `SIMULATED FLIGHT TRACKING`. Maintenance is a
coordination/handoff demonstration, not full MRO.

1. **OCC:** open `/flights/requests`, review the request queue, then inspect the converted DG charter in `/flights/readiness`.
2. **Director:** open `/flights` and approve the flight marked ready for approval.
3. **Station Admin:** open `/ticketing/passenger` for check-in and rescheduling, then `/ticketing/cargo` for DG acceptance.
4. **Finance Reviewer:** open `/ticketing/management` for the pending refund and `/invoices` for the partially paid charter invoice.
5. **OCC:** open `/ops/flight-following` for the active remote flight and review the weather diversion from `/flights`.
6. **Maintenance Manager:** open `/flights/maintenance` for the landed flight and its oil-filter handoff.
7. **Inventory Controller:** open `/inventory/purchase-requests` and `/inventory/purchase-orders` for submitted, pending-approval, and partially received procurement records.
8. **OCC / Finance:** finish with `/flights/actual-closure`, the closed charter, cancellation, and reopened correction states.

## MRO Demo-v2.1: Operational Resource Control

Demo-v2.1 extiende las capacidades MRO con gestión completa de recursos operacionales. Esta funcionalidad permite planificar, reservar y rastrear materiales, herramientas y personal para work packages de mantenimiento.

### Escenarios Seeded

Cinco escenarios de demostración están precargados:

#### Escenario A: Fully Ready Package (`mwp-mrov1-release-ready`)

Work package con todos los recursos planificados y listos para liberación técnica:

- ✅ Declaraciones de recursos: MATERIAL, TOOL, PERSONNEL = REQUIRED
- ✅ Material reservado y emitido (inventory reservations activas)
- ✅ Herramientas asignadas con custodia (calibración vigente)
- ✅ Personal asignado y confirmado (elegibilidad ELIGIBLE)
- ✅ Validación AMO scope exitosa
- ✅ Flight-MRO link establecido

**Flujo de demostración:**

1. Como **Maintenance Manager**, abrir `/maintenance/work-packages/mwp-mrov1-release-ready`
2. Navegar a las tabs: Material, Tool, Personnel, AMO Scope, MRO Eligibility
3. Verificar que todos los recursos están en estado "ready"
4. En tab "MRO Eligibility", confirmar que no hay blockers
5. Ejecutar Technical Release (botón "Release Work Package")

#### Escenario B: Double Reservation Conflict (`mwp-mrov21-conflict`)

Dos work packages compiten por el mismo inventario limitado:

- ⚠️ Material requirement para `inv-part-filter-c208-reserve` (solo 2 unidades disponibles)
- ⚠️ `mwp-mrov1-release-ready` ya reservó 2 unidades
- ⚠️ Este package no puede reservar → blocker MATERIAL_NOT_RESERVED

**Flujo de demostración:**

1. Como **Maintenance Manager**, abrir `/maintenance/work-packages/mwp-mrov21-conflict`
2. En tab "Material", intentar crear una reserva para el filter
3. El sistema rechaza la reserva con error ATP (Available-to-Promise insuficiente)
4. En tab "MRO Eligibility", ver blocker: "MATERIAL_NOT_RESERVED"

#### Escenario C: Tool Calibration Expired (`mwp-mrov1-active`)

Tool requirement para herramienta con calibración vencida:

- ⚠️ Tool requirement para `mtool-mrov2-expired` (calibración vencida 2024-12-01)
- ⚠️ El sistema bloquea la asignación de esta herramienta
- ⚠️ Blocker: TOOL_CALIBRATION_EXPIRED

**Flujo de demostración:**

1. Como **Maintenance Manager**, abrir `/maintenance/work-packages/mwp-mrov1-active`
2. En tab "Tool", ver tool requirement para torque wrench
3. Intentar asignar la herramienta → sistema rechaza por calibración vencida
4. En tab "MRO Eligibility", ver blocker: "TOOL_CALIBRATION_EXPIRED"

#### Escenario D: Personnel Authorization Expired (`mwp-mrov21-expired-auth`)

Personnel requirement con autorización de compañía vencida:

- ⚠️ Personnel requirement para INSPECTOR role
- ⚠️ Assignment a `crew-mrov21-inspector-expired` (authorization vencida)
- ⚠️ Eligibility snapshot muestra: authorization expired
- ⚠️ Blocker: PERSONNEL_ASSIGNMENT_INELIGIBLE

**Flujo de demostración:**

1. Como **Maintenance Manager**, abrir `/maintenance/work-packages/mwp-mrov21-expired-auth`
2. En tab "Personnel", ver assignment con estado INELIGIBLE
3. Expandir eligibility snapshot → ver "Authorization expired"
4. En tab "MRO Eligibility", ver blocker: "PERSONNEL_ASSIGNMENT_INELIGIBLE"

#### Escenario E: Return and Cancellation (`mwp-mrov1-history`)

Work package completado con devoluciones y cancelaciones:

- ✅ Status: RELEASED (liberación técnica completada)
- ✅ Tools devueltas (status RETURNED, condition GOOD)
- ✅ Personal liberado (status RELEASED)
- ✅ Flight-MRO link cancelado con razón de desvinculación

**Flujo de demostración:**

1. Como **Maintenance Manager**, abrir `/maintenance/work-packages/mwp-mrov1-history`
2. En tab "Tool", ver allocations con status RETURNED
3. En tab "Personnel", ver assignments con status RELEASED
4. Verificar audit trail completo de devoluciones

### Navegación UI

Las nuevas funcionalidades están disponibles en:

- **Work Package Detail** (`/maintenance/work-packages/[id]`): tabs Material, Tool, Personnel, AMO Scope, MRO Eligibility
- **Flight Detail** (`/flights/[id]`): sección "MRO Readiness" con linked packages y blockers

### Roles y Permisos

- **Maintenance Manager**: puede crear/ver declaraciones, requisitos, reservas, asignaciones
- **Maintenance Technician**: puede ver recursos asignados a sus work packages
- **Certifying Staff**: puede ejecutar Technical Release si MRO Eligibility = true
- **Demo Admin**: acceso completo a todas las funcionalidades

### Limitaciones Demo

- Las reservas de inventario son simuladas (no afectan stock real de inventory_parts)
- ATP (Available-to-Promise) es calculado pero no bloquea movimientos de inventario externos
- Las validaciones de calibración usan fechas estáticas del seed data
- Los Flight-MRO links son solo referenciales (no bloquean flight operations)
- No hay integración con sistemas externos (ERP, procurement, etc.)

---

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
