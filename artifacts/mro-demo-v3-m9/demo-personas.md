# PT AMA MRO Demo-v3 — Demo Personas

Do not include or expose real passwords in demo artifacts. Use the application demo role selector.

## Maintenance Planner / Manager

Demo role: `Maintenance Manager`

Demonstrates:

- Due review and Work Package creation
- Defect assessment
- Facility slot booking
- GSE allocation/staging
- Move-in, move-out, and handback
- Shift handover preparation

Primary routes:

- `/maintenance`
- `/maintenance/due-control`
- `/maintenance/defects`
- `/maintenance/work-packages`
- `/maintenance/facility-planning`
- `/maintenance/facility-operations`

## Mechanic

Demo role: `Maintenance Technician`

Demonstrates:

- My Work
- Job Card work start
- Mechanic sign-off where authorized
- Non-routine finding creation
- Tool custody/return visibility

Primary routes:

- `/maintenance/my-work`
- `/maintenance/work-packages/:id`

## Independent Inspector / Certifying Staff

Demo role: `Certifying Staff`

Demonstrates:

- Independent inspection
- Reinspection after rework
- Technical Release
- Release evidence snapshot

Primary routes:

- `/maintenance/work-packages/:id`
- `/maintenance/releases`
- `/maintenance/records`

## Facility / Maintenance Supervisor

Demo role: `Maintenance Manager`

Demonstrates:

- Facility Operations workbench
- Facility readiness
- Actual bay occupancy
- Shift handover
- Operational handback

Primary route:

- `/maintenance/facility-operations`

## Flight / OCC User

Demo role: `OCC`

Demonstrates:

- Flight creation/evaluation
- MRO technical eligibility consumption
- Maintenance operational availability gate
- Flight blocked by NO-GO or IN_FACILITY
- Flight reevaluation after handback

Primary routes:

- `/flights`
- `/flights/:id`

## OCC Checker

Demo role: `OCC Checker`

Demonstrates:

- Independent readiness acceptance where the flight is otherwise ready

Primary route:

- `/flights/:id`

## Director

Demo role: `Director`

Demonstrates:

- Flight final approval separation from OCC readiness acceptance
- Read-only executive review of MRO/Flight evidence

Primary routes:

- `/flights/:id`
- `/maintenance/releases`

## Unauthorized / Restricted Role

Demo role: `Employee` or a role without the target permission

Demonstrates:

- Restricted maintenance assessment rejected
- Unauthorized Technical Release rejected
- Unauthorized resource/facility mutation rejected
- No manual Flight maintenance-ready override
