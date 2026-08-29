# PT AMA MRO Demo-v3 — Stakeholder Demo Script

Scope: enterprise-functional demonstration only. Do not present as DGCA/CASR certification, approved AMO/CAMO system, or legal CRS/e-signature implementation.

Suggested runtime: 20-30 minutes.

## 1. Maintenance Command Overview

Persona: Maintenance Manager

Route: `/maintenance`

Show:

- Maintenance command summary
- Work packages ready/blocked
- Recent audit records
- Navigation to Due Control, Defects, Work Packages, Facility Planning, Facility Operations, Releases, and Records

## 2. Due Control To Work Package

Persona: Maintenance Manager

Route: `/maintenance/due-control`

Show:

- Due/overdue requirement state
- Current utilization basis
- Create Work Package from Due
- Planning does not mark compliance complete

## 3. Work Package Resources

Persona: Maintenance Manager

Route: `/maintenance/work-packages/mwp-mrov1-release-ready`

Show:

- Material, personnel, and tool readiness from backend Resource-v21
- Assignment is planning evidence, not sign-off authority
- Tool allocation/custody remains separate from release eligibility

## 4. Defect And NO-GO

Persona: Maintenance Manager

Route: `/maintenance/defects`

Show:

- Defect report and maintenance assessment
- NO-GO blocks aircraft technical eligibility
- Flight readiness consumes canonical MRO eligibility

## 5. Deferred Restriction

Persona: OCC

Route: Flight detail using aircraft `PK-AME`

Show:

- Active deferred defect restriction
- Flight displays restriction without claiming MEL/CDL compliance
- Expired deferment blocks in backend tests

## 6. Non-Routine And Rework

Persona: Certifying Staff

Route: `/maintenance/work-packages/mwp-mrov1-rework`

Show:

- Failed inspection
- Rework evidence
- Reinspection passed
- Technical Record retains the history chain

## 7. Facility Planning And Operations

Persona: Maintenance Manager

Routes:

- `/maintenance/facility-planning`
- `/maintenance/facility-operations`

Show:

- Facility hierarchy and bay slot
- Facility readiness dimensions
- GSE allocation and staging
- `BOOKED != IN_BAY`
- Planned vs actual occupancy

## 8. Facility Custody And Handback

Persona: Maintenance Manager

Route: `/maintenance/facility-operations`

Show:

- Move-in to maintenance custody
- Aircraft IN_BAY blocks operational availability
- Shift handover prepared and acknowledged
- Technical Release while still in bay
- Technical Release does not hand back aircraft
- Move-out and handback complete physical custody transfer

## 9. Technical Records And Release

Persona: Certifying Staff

Route: `/maintenance/work-packages/mwp-mrov1-release-ready`

Show:

- Release eligibility
- Technical Record package
- Technical Release
- Immutable signer/release evidence snapshot
- Release idempotency verified by tests

## 10. MRO To Flight

Persona: OCC

Route: Flight detail for aircraft used in facility scenario

Show:

- MRO technical eligible does not imply Flight ready
- Operational IN_FACILITY blocks Flight
- Handback clears operational blocker
- New NO-GO after handback blocks Flight again
- Departure revalidates current MRO state

## 11. Audit And History

Persona: Maintenance Manager / Director

Routes:

- `/maintenance/records`
- `/maintenance/releases`
- Flight History tab

Show:

- Defect assessment
- Material traceability
- Personnel/tool evidence
- Facility booking/movement/handover/handback
- Technical Release
- Flight release/readiness evidence
