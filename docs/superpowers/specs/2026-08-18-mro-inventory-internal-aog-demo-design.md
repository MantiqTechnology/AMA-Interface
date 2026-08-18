# MRO–Inventory Internal AOG Demo Design

**Date:** 2026-08-18

**Status:** Approved in chat; awaiting written-spec review

**Implementation target:** Demo only

## 1. Purpose

This milestone will create one repeatable, end-to-end Internal AOG demo that makes the relationship between MRO and Inventory immediately understandable. A presenter must be able to start from an aircraft grounded by a defect, resolve a material blocker through Inventory, complete maintenance and inspection, and issue a simulated technical release.

The milestone optimizes for a credible product demonstration. It does not claim regulatory compliance and does not establish production-grade identity, electronic signatures, record retention, integrations, or infrastructure.

## 2. Desired Demo Outcome

The complete story is:

1. A Maintenance Manager opens the MRO Control Center.
2. One aircraft is visibly AOG because a required material is not yet issued.
3. The linked Work Package shows its readiness gates, hard blocker, owner, impact, and next action.
4. The presenter switches to Inventory Controller.
5. Inventory reserves, picks, and issues the required material to the Work Package.
6. The material gate becomes ready and the release blocker clears.
7. A Maintenance Technician opens a focused task, performs the simulated work, records evidence, and signs the work.
8. Certifying Staff performs an independent inspection and issues a simulated technical release.
9. A unified activity timeline shows the MRO and Inventory events in sequence.
10. The presenter resets the scenario and can repeat it from the same initial state.

The audience should understand three things without explanation: why the aircraft cannot be released, who must act next, and how the Inventory action changes MRO readiness.

## 3. Scope Boundary

### In scope

- One deterministic Internal AOG scenario.
- Existing demo-role switching for Maintenance Manager, Inventory Controller, Maintenance Technician, and Certifying Staff.
- An exception-first MRO Control Center.
- A redesigned Work Package overview for the selected scenario.
- A readiness matrix covering material, tools, personnel, approved data, inspection, and release.
- An attention queue with owner, impact, due state, and contextual action.
- A material lifecycle covering requirement, reservation, picking, issue, and MRO readiness recalculation.
- Focused technician task execution.
- Independent inspection and simulated technical release using existing demo authorization concepts.
- A unified event timeline.
- Demo guidance and deterministic reset.
- Automated service/API coverage and one end-to-end browser scenario.
- Desktop validation for management/controller workflows and tablet validation for technician/stores workflows.

### Explicitly out of scope

- Production authentication, MFA, identity providers, or legal electronic signatures.
- A claim of CASR, EASA, FAA, or other regulatory compliance.
- PostgreSQL migration, production multi-tenancy, disaster recovery, or infrastructure hardening.
- External ERP, procurement, finance, regulator, email, or notification integrations.
- External customer quotation, approval, portal, or billing workflows.
- Component Shop Lite.
- Engine, APU, landing-gear, propeller, or specialist shop workflows.
- A full redesign of all MRO and Inventory pages.
- Exhaustive quality, CAPA, SDR, reliability, or supplier-management functions.

Future milestones may add external customer maintenance and a wheel/brake Component Shop Lite, but they must not enlarge this implementation plan.

## 4. Design Approach

The implementation will be a vertical slice through the existing Nuxt, Vue, Vuetify, SQLite, service, and API patterns. Existing domain behavior that already supports work packages, job cards, material requirements, tool/personnel readiness, inspection, release, and audit events should be reused.

The milestone must not introduce a parallel MRO engine. Where current MRO demo reservations are disconnected from canonical Inventory balances, the implementation should add the smallest explicit adapter or orchestration boundary needed for this scenario. The Work Package readiness view must be derived from persisted actions rather than from client-only state.

Large existing pages should be decomposed only where required by this vertical slice. The redesign must coexist with current detailed capabilities so unrelated demo scenarios continue to work.

## 5. Information Architecture

### 5.1 MRO Control Center

The Maintenance landing page becomes an exception-first command center. Its first viewport contains:

- AOG aircraft count and the selected AOG case.
- Release blockers.
- Work waiting for material.
- Work waiting for inspection.
- A role-relevant `Needs Your Attention` queue.
- Direct navigation to the selected Work Package.

Routine totals and secondary charts appear below the action-oriented content. Decorative charts must not displace blockers or next actions.

### 5.2 Work Package overview

The selected Work Package gets a concise overview composed of:

- A sticky context header: package number, aircraft, AOG state, status, target release, blocker count, and primary action.
- A readiness matrix.
- A blocker panel.
- Job-card progress.
- Material status and link to the relevant Inventory action.
- A unified activity timeline.

Existing detailed functions remain accessible through focused sections or links. The overview must not reproduce every form currently present on the large Work Package detail page.

### 5.3 Role workspaces

- **Maintenance Manager:** sees readiness, blocker ownership, progress, and escalation actions.
- **Inventory Controller:** sees the selected requirement, stock availability, reservation, picking, and issue actions.
- **Maintenance Technician:** sees one active task with instructions, resources, evidence, and sign-off.
- **Certifying Staff:** sees inspection evidence, release gates, and the simulated release action.

Each workspace presents one primary action. Secondary actions are visually subordinate.

## 6. Interaction Patterns

### Exception-first attention

Attention priority is:

1. safety or release blocker;
2. AOG or overdue work;
3. material, tool, or personnel shortage;
4. inspection waiting;
5. routine work.

Red is reserved for hard blockers or rejected states, amber for risk or required attention, blue for the current action, green for verified/ready/completed, and neutral tones for reference information. Status must always include text or an icon and must not rely on color alone.

### Readiness matrix

Each gate shows:

- status;
- short reason;
- owner;
- action when unresolved.

The material gate changes from blocked to ready only after the required persisted Inventory action succeeds.

### Focused task execution

Technician execution follows:

`Review instruction -> Confirm resources -> Perform task -> Record result -> Attach evidence -> Sign`

Only information needed for the current step is prominent. Technical metadata remains available through progressive disclosure.

### Impact preview

Before a material issue, the UI previews the part, quantity, source location, destination Work Package/aircraft, and resulting stock. The demo action creates a visible timeline event.

### Demo Coach

The demo layer shows:

- scenario title;
- current step and total steps;
- current role;
- recommended next action;
- reset control.

It must be visually identified as demo guidance and must not masquerade as a production maintenance control.

## 7. Seeded Scenario Contract

The seed must use stable identifiers for:

- one aircraft in an AOG state;
- one primary defect;
- one Work Package;
- at least one job card requiring independent inspection;
- one required serialized or lot-controlled material item;
- one source warehouse/bin with sufficient stock;
- one valid tool allocation;
- one eligible technician;
- one independent Certifying Staff actor;
- one simulated release result.

Initial state requirements:

- the material requirement is not yet issued;
- MRO readiness reports the material blocker;
- other gates required for the happy path are ready;
- the aircraft cannot be simulated as released;
- the attention queue points to Inventory Controller as the next owner.

Reset requirements:

- all scenario-created movements, reservations, sign-offs, inspections, releases, and timeline events return to the same seeded baseline;
- repeated resets are safe;
- a second complete run produces the same visible scenario and valid identifiers.

## 8. State and Data Flow

The expected state sequence is:

`AOG / MATERIAL_BLOCKED`

`-> MATERIAL_RESERVED`

`-> MATERIAL_PICKED`

`-> MATERIAL_ISSUED / READY_FOR_EXECUTION`

`-> WORK_SIGNED / INSPECTION_REQUIRED`

`-> INSPECTION_PASSED / READY_FOR_RELEASE`

`-> SIMULATED_RELEASED`

The server is authoritative for transitions. After each command, the client refreshes the Work Package/readiness projection. The client must not clear a blocker optimistically before the server confirms the Inventory action.

Commands must return actionable errors. A failed command leaves the previous persisted state intact and explains the impact and required next action. Existing optimistic-version and idempotency patterns should be reused where already available.

## 9. Unified Timeline

The scenario timeline combines events from relevant domains into one ordered presentation:

- defect and Work Package creation;
- readiness evaluation;
- material reservation;
- picking/issue;
- job-card start and mechanic sign-off;
- independent inspection;
- release request and simulated release.

The timeline is a read model for demo comprehension. It does not replace the existing domain audit records. Every displayed event must originate from persisted server-side state or audit/event data.

## 10. Error and Failure Behavior

Milestone 1 must demonstrate a reliable happy path and protect it from common failures:

- insufficient ATP: reservation is rejected and the blocker remains;
- wrong role: action is hidden or rejected consistently with existing demo permissions;
- duplicate command: no duplicate reservation, issue, sign-off, inspection, or release;
- stale Work Package version: user receives a refresh-and-retry instruction;
- self-inspection: inspection is rejected;
- reset after a partial run: all scenario state returns to baseline.

Expired tooling, invalid personnel authorization, and certificate rejection may be represented in later demo scenarios. They are not required to enlarge Milestone 1 beyond the approved material-blocked AOG story.

## 11. Verification and Acceptance Criteria

### Automated verification

- Seed/reset tests prove deterministic initial state and safe repeated reset.
- Service/API tests cover the material-blocked readiness state and its transition after issue.
- Tests verify insufficient ATP and duplicate-command behavior.
- Tests preserve independent-inspection separation.
- One Playwright test performs the full role-switching AOG journey.
- The existing relevant MRO and Inventory test suites remain passing.
- `pnpm build` completes successfully.

### Visual and usability verification

- At desktop size, the AOG blocker and next action are visible without scrolling on the Control Center and Work Package overview.
- At the project tablet viewport, the technician can complete the focused task without horizontal scrolling.
- Status is understandable without color alone.
- Every role sees one clear primary action.
- The full guided scenario can be completed and reset without manual database repair.

### Demo acceptance script

The milestone is accepted when a presenter can complete the ten-step outcome in Section 2 from a freshly reset database, while explaining only the business story rather than compensating for confusing navigation or hidden state.

## 12. Delivery Order

1. Lock stable scenario identifiers and deterministic reset behavior.
2. Add regression coverage for the initial blocked state and required transitions.
3. Build the Control Center attention summary.
4. Build the Work Package overview and readiness matrix.
5. Connect the material reservation/picking/issue story to readiness recalculation.
6. Add focused technician and release actions required by the scenario.
7. Add the unified timeline and Demo Coach.
8. Complete end-to-end, visual, regression, and production-build verification.

## 13. Later Demo Milestones

These are directional only and require separate design approval:

1. External customer maintenance with quotation, supplemental finding approval, progress, and release summary.
2. Component Shop Lite for one wheel/brake shop visit.
3. Receiving/quarantine and suspected-unapproved-part failure scenario.
4. Additional compliance-themed blockers and audit rehearsal.
