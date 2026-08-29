# PT AMA MRO Demo-v3 — Final Acceptance

## A. Final Status

PASS

## B. Release Candidate

Date: 2026-08-09

Environment: local Nuxt/Vitest/Playwright, Asia/Jakarta workstation.

DB: SQLite demo database. Browser acceptance used Playwright fresh demo DB `./data/playwright.sqlite`; reset acceptance used isolated `./data/m9-reset.sqlite`.

Branch/worktree note: branch `integrate/demo-mro-hris`; dirty release-candidate worktree with prior M1-M8.5 implementation/evidence changes preserved. No reset, clean, commit, or push performed.

## C. Milestone Summary

M0: Core work package, job card, sign-off, inspection, rework, RTS, audit baseline preserved.

M1: Resource-v21 readiness contracts verified.

M2: Material lifecycle, reservation/issue/install/traceability/concurrency verified.

M3: Defect, NO-GO, deferred lifecycle, restrictions verified.

M4: Non-routine and rework/reinspection verified.

M5: Due Control, WP planning, compliance, recurrence, idempotency verified.

M5.5: Facility hierarchy, maintenance slot, bay conflict, occupancy verified.

M6: Personnel eligibility/assignment and tool calibration/allocation/custody verified.

M7: Technical Record, release eligibility, Technical Release, snapshot verified.

M8: Aircraft technical eligibility consumed by Flight readiness/release/departure verified.

M8.5: Facility readiness, GSE, movement/custody, shift handover, handback verified.

## D. Domain Authority Map

Resource: `ResourceV21Service` backend readiness/evaluation.

Defect: Aircraft airworthiness defect records plus Maintenance assessment service.

Due: Maintenance Due Control status/compliance records.

Facility: `maintenance_slots` and Maintenance facility planning/operations services.

Personnel: Resource-v21 personnel requirement, eligibility, assignment, confirmation, release.

Tools: Resource-v21 tool requirement, eligibility, allocation, custody, return.

GSE: `managed_assets` with category GSE as master; MRO owns requirement/allocation/staging.

Technical Release: Maintenance release service and aircraft maintenance release records.

Aircraft Technical Eligibility: `evaluateAircraftTechnicalEligibility()`.

Operational Availability: `evaluateMaintenanceOperationalAvailability()`.

Flight Readiness: Flight Operations readiness evaluation.

Departure: Flight Operations departure assurance with action-time MRO revalidation.

## E. Acceptance Scenarios

Scenario A — Scheduled: PASS

Scenario B — Deferred: PASS

Scenario C — NO-GO + Material: PASS

Scenario D — NR + Rework: PASS

Scenario E — Facility Conflict: PASS

Scenario F — MRO ↔ Flight: PASS

Scenario G — Facility Custody: PASS

Scenario H — Authorization: PASS

## F. Critical Invariants

- No false READY: PASS
- Backend critical enforcement: PASS
- Single canonical authority per critical domain: PASS
- History preserved: PASS
- Assignment != authorization: PASS
- Planning != execution: PASS
- Technical Release != Handback: PASS
- MRO ELIGIBLE != Flight READY: PASS
- MRO BLOCKED prevents Flight Release/Departure: PASS
- Critical idempotency: PASS

## G. Browser / E2E

Tests: `pnpm exec playwright test tests/e2e/mro-demo-v3-acceptance.spec.ts --project=chromium`

Runtime: 1.2m test body, 2.2m total including fresh demo boot.

Result: PASS, 1/1 tests.

## H. API Verification

Maintenance: PASS, 10/10 tests, 151.22s.

Flight: PASS, 11/11 tests, 151.36s.

Operations: PASS, 11/11 tests, 145.24s.

## I. Concurrency Verification

Material: PASS via M2 regression.

Personnel: PASS via M6 regression.

Tools: PASS via M6 regression.

Bay: PASS via M5.5 regression.

GSE: PASS via M8.5 regression.

Actual Move-in: PASS via M8.5 regression.

## J. Idempotency

Technical Release: PASS.

Due Compliance: PASS.

Flight Release if applicable: PASS for snapshot stability and no stale MRO bypass.

Movement: PASS.

Handback: PASS.

## K. Audit / Traceability

Defect: PASS.

Materials: PASS.

Personnel: PASS.

Tools: PASS.

Facility: PASS.

Movement: PASS.

Release: PASS.

Due: PASS.

Flight: PASS.

## L. Demo Reset

Reset: PASS. `AMA_DB_PATH=./data/m9-reset.sqlite DEMO_SEED_DATE=2026-07-17 pnpm demo:reset` twice, exit 0 both times.

Fresh Boot: PASS via Playwright webserver fresh reset/boot.

Smoke: PASS. Authorized Maintenance Manager smoke loaded seeded WP `MWP-MROV1-RTS` from reset DB.

## M. Screenshots

- `artifacts/mro-demo-v3-m9/01-maintenance-command-overview.png`
- `artifacts/mro-demo-v3-m9/02-due-to-work-package.png`
- `artifacts/mro-demo-v3-m9/03-resource-readiness.png`
- `artifacts/mro-demo-v3-m9/04-defect-nogo.png`
- `artifacts/mro-demo-v3-m9/05-deferred-restriction.png`
- `artifacts/mro-demo-v3-m9/06-non-routine-rework.png`
- `artifacts/mro-demo-v3-m9/07-facility-slot.png`
- `artifacts/mro-demo-v3-m9/08-facility-readiness.png`
- `artifacts/mro-demo-v3-m9/09-aircraft-in-bay.png`
- `artifacts/mro-demo-v3-m9/10-technical-record.png`
- `artifacts/mro-demo-v3-m9/11-technical-release.png`
- `artifacts/mro-demo-v3-m9/12-flight-blocked-by-mro.png`
- `artifacts/mro-demo-v3-m9/13-flight-recovered-after-mro.png`
- `artifacts/mro-demo-v3-m9/14-flight-release-snapshot.png`
- `artifacts/mro-demo-v3-m9/15-departure-rejected-after-new-nogo.png`
- `artifacts/mro-demo-v3-m9/16-shift-handover.png`
- `artifacts/mro-demo-v3-m9/17-maintenance-handback.png`
- `artifacts/mro-demo-v3-m9/18-final-aircraft-consistency.png`

## N. Bugs Found During M9

| ID             | Priority | Finding                                                                    | Fix                                                                                       | Status |
| -------------- | -------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| M9-HARNESS-001 | P3       | Acceptance spec referenced a non-existent seeded WP id.                    | Retargeted to seeded `mwp-mrov1-release-ready`.                                           | CLOSED |
| M9-HARNESS-002 | P3       | Acceptance helper assumed one aircraft API response shape.                 | Accepted direct aircraft detail and airworthiness wrapper shapes.                         | CLOSED |
| M9-HARNESS-003 | P3       | Acceptance setup attempted Flight creation under Maintenance Manager role. | Switched to OCC for Flight creation and back to Maintenance Manager for facility actions. | CLOSED |
| M9-HARNESS-004 | P3       | Several Playwright locators matched hidden/duplicate text.                 | Narrowed locators to visible headings/first exact matches/readiness tab.                  | CLOSED |

No production P0/P1 defect was found during M9.

## O. Remaining Known Issues

No open P0 or P1 issues.

Known P2/P3 limitation: Nuxt API regression harness is slow, with individual API files taking about 145-151 seconds. It completed with exit code 0.

## P. Post-Demo Gaps

See `artifacts/mro-demo-v3-m9/post-demo-gaps.md`.

## Q. Final Feature Classification

See `artifacts/mro-demo-v3-m9/feature-matrix.md`.

## R. Maturity Scores

Functional Demo Readiness: 9/10. End-to-end MRO/Flight/Facility workflows are demo-ready with evidence.

Enterprise Functional Coverage: 8/10. Broad enterprise workflow coverage is present, with production-only aviation domains intentionally excluded.

Operational Workflow Coherence: 8/10. Planning, resources, release, facility custody, and Flight gates compose coherently.

Audit / Traceability: 8/10. Critical histories and snapshots are queryable; production retention/certification controls remain future work.

Production Readiness: 5/10. Architecture is functional but not production hardened for security, scale, monitoring, DR, or regulatory operation.

Regulatory Readiness: 3/10. Demo records support traceability but are not DGCA/CASR-approved electronic maintenance records or legal CRS/e-signatures.

## S. Compliance Boundary

PT AMA MRO Demo-v3 is an enterprise-functional software demonstration.

It must not be represented as DGCA certified, CASR compliant electronic maintenance record, approved AMO system, approved CAMO system, or legal CRS/e-signature implementation.

## T. Final Exit Gate

Core domain:

- [x] Due -> WP works
- [x] Planning does not equal compliance
- [x] Defect report/assessment works
- [x] Deferred lifecycle works
- [x] NO-GO works
- [x] Non-Routine works
- [x] Rework/reinspection works
- [x] Material reserve/issue/install works
- [x] Material concurrency works
- [x] Personnel eligibility works
- [x] Personnel authorization works
- [x] Tool calibration/allocation/custody works
- [x] Personnel/tool conflicts work
- [x] Technical Record works
- [x] Unified Release Eligibility works
- [x] Technical Release works
- [x] Release snapshot works
- [x] Release idempotency works

Facility:

- [x] Facility hierarchy works
- [x] Slot booking works
- [x] Bay conflict works
- [x] Slot concurrency works
- [x] Facility readiness works
- [x] GSE works
- [x] GSE concurrency works
- [x] Actual movement works
- [x] Actual bay occupancy works
- [x] Move-in concurrency works
- [x] Shift handover works
- [x] Technical Release != Handback
- [x] Handback works
- [x] Planned vs actual history works

Flight:

- [x] Canonical aircraft technical eligibility works
- [x] MRO BLOCKED -> Flight BLOCKED
- [x] Valid restriction visible
- [x] Expired restriction blocks
- [x] Overdue blocks
- [x] Flight Release action-time recheck works
- [x] Departure action-time recheck works
- [x] Flight Release -> new NO-GO -> Departure rejected
- [x] Technical Release recovery works
- [x] Operational IN_FACILITY blocks Flight
- [x] Handback clears operational blocker
- [x] Handback cannot override new NO-GO
- [x] Historical Flight MRO snapshot remains stable

Security/control:

- [x] Reporter cannot perform restricted assessment
- [x] Assignment != certification authority
- [x] Self-inspection rejected
- [x] Unauthorized Technical Release rejected
- [x] Unauthorized Flight override rejected
- [x] Unauthorized resource mutation rejected
- [x] Backend guards exist for critical actions

Quality:

- [x] M1-M8.5 service regressions PASS
- [x] Maintenance API PASS
- [x] Flight API PASS
- [x] relevant Operations API PASS
- [x] Final E2E acceptance PASS
- [x] Demo reset PASS
- [x] Fresh demo boot PASS
- [x] Typecheck PASS
- [x] Scoped lint PASS
- [x] No `.only`
- [x] No unintended `.skip`
- [x] No P0 open

Evidence:

- [x] M9 screenshots captured
- [x] `demo-script.md` created
- [x] `demo-personas.md` created
- [x] `feature-matrix.md` created
- [x] `post-demo-gaps.md` created
- [x] acceptance report created
- [x] no regulatory overclaim

## U. Recommendation

DEMO-v3 ACCEPTED — FEATURE FREEZE
