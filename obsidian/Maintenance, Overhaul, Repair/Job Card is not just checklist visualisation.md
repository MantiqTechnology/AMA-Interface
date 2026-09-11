# Job Card MRO — Spesifikasi Hasil Kerja Nyata

Saya menetapkan **Job Card** sebagai:

> **Controlled technical execution record yang mengikat pekerjaan, approved maintenance data, aircraft configuration, personel berwenang, resource, hasil pemeriksaan, signature, dan audit trail.**

Job Card **bukan task checklist umum** dan tidak boleh dianggap selesai hanya karena seluruh checkbox dicentang.

Sebagai benchmark struktur record, 14 CFR §43.9 mensyaratkan deskripsi pekerjaan atau referensi data yang dapat diterima, tanggal penyelesaian, serta identitas pihak yang menyetujui pekerjaan untuk return to service. Untuk inspection, §43.11 menambahkan jenis dan cakupan inspection, tanggal, aircraft total time, identitas serta certificate pihak yang menyetujui atau menolak return to service. §43.5 juga mengaitkan approval for return to service dengan dibuatnya maintenance-record entry yang sesuai. ([eCFR](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-43/section-43.9?utm_source=chatgpt.com '14 CFR 43.9 -- Content, form, and disposition ...'))

Untuk konteks Indonesia, SI 8900-3.329 menyatakan sistem maintenance records dapat berbentuk elektronik, tetapi prosedur operator harus mengatur generation, storage, retention, retrieval, responsible persons, dan menghasilkan record yang akurat serta dapat diambil kembali. Sistem juga perlu menyimpan deskripsi atau referensi pekerjaan dan identitas pihak yang melakukan atau menyetujui pekerjaan. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=Clm7Ce3Gu7gH5OQLbudL1f4fVE0pE5xKR8Rl6Vkdfhgr4UoonTdDbjF8mz6RhNJA7Z8QfpGi6JLP648gwAKLkGXJ4ua5fcbmpho8n1hIR8fZO59iue5Stgt6IIAu13zGJFi96SqEYfcYHJ5LDENrR8FSkMBFJl6dXSBOfJLhvQcPp15nKMIKZbnwcnN4dGz0HGzw2z5LmweYWCXt79IeouOkCZok&utm_source=chatgpt.com '[PDF] PERATURAN DIREKTUR JENDERAL PERHUBUNGAN UDARA ...'))

---

# 1. Batas fungsi Job Card

## Job Card bertanggung jawab atas

- Identitas aircraft atau component.

- Applicability.

- Approved maintenance data.

- Instruksi pekerjaan.

- Keselamatan dan prerequisite.

- Material, tools, dan GSE.

- Pelaksanaan per langkah.

- Measurement dan inspection result.

- Finding dan non-routine work.

- Evidence.

- Technician certification.

- Required inspection.

- Completion dan sign-off.

- Amendments dan audit trail.

## Job Card tidak bertanggung jawab langsung atas

- Menentukan interval AAMP.

- Menentukan AD applicability tingkat armada.

- Menyetujui engineering repair data.

- Mengubah aircraft configuration tanpa controlled transaction.

- Mengeluarkan technical release seluruh pesawat.

- Mengubah MEL/CDL requirement.

- Mengubah authorization personel.

Job Card mengonsumsi hasil dari modul-modul tersebut dan menghasilkan execution record.

---

# 2. Lifecycle final Job Card

```text
DRAFT
→ RELEASED_TO_EXECUTION
→ ASSIGNED
→ IN_PROGRESS
→ PAUSED / AWAITING_SUPPORT
→ AWAITING_INSPECTION
→ REWORK_REQUIRED
→ TECHNICALLY_COMPLETED
→ SIGNED_OFF
→ RECORDS_ACCEPTED
```

State tambahan:

```text
VOIDED
TERMINATED
SUPERSEDED
```

## Pemisahan status

Jangan menyimpan seluruh kondisi dalam satu kolom `status`.

```text
Lifecycle State
Control Status
Inspection Status
Record Status
Synchronization Status
```

### Control status

```text
CLEAR
WARNING
BLOCKED
ON_HOLD
```

### Inspection status

```text
NOT_REQUIRED
PENDING
ACCEPTED
REJECTED
REINSPECTION_REQUIRED
```

### Record status

```text
INCOMPLETE
UNDER_REVIEW
CORRECTION_REQUIRED
COMPLETE
ACCEPTED
```

### Sync status

```text
LOCAL_ONLY
PENDING_SYNC
SYNCED
SYNC_FAILED
CONFLICT
SERVER_REJECTED
```

---

# 3. Struktur halaman Job Card

Gunakan layout tiga area pada desktop/tablet landscape.

```text
┌────────────────────────────────────────────────────────────────────┐
│ PERSISTENT AIRCRAFT & WORK PACKAGE CONTEXT                         │
├────────────────────────────────────────────────────────────────────┤
│ JOB CARD CONTROL HEADER                                            │
│ JC Number · State · Critical Task · Source Revision · Sync         │
├────────────────┬──────────────────────────────┬────────────────────┤
│ STEP NAVIGATOR │ CURRENT WORK INSTRUCTION     │ WORK CONTEXT       │
│                │                              │                    │
│ 01 Preparation │ Instruction                  │ Safety             │
│ 02 Isolation   │ Illustration/reference       │ Material           │
│ 03 Removal     │ Measurement/input            │ Tools              │
│ 04 Inspection  │ Action controls              │ Personnel          │
│ 05 Installation│                              │ Inspection         │
│ 06 Test        │                              │ Findings           │
│ 07 Restoration │                              │ Handover           │
├────────────────┴──────────────────────────────┴────────────────────┤
│ [Pause Task] [Raise Finding] [Request Support] [Complete Step]     │
└────────────────────────────────────────────────────────────────────┘
```

Pada tablet portrait:

1. Context header.

2. Job Card status.

3. Current step.

4. Work instruction.

5. Input/result.

6. Resources dan safety.

7. Action bar.

8. Step list melalui drawer.

---

# 4. Section 1 — Identity and applicability

## Field wajib

```text
Job Card ID
Job Card Number
Internal Revision
Job Card Title
Work Package ID
Aircraft ID
Aircraft Registration
Aircraft Type/Model
Aircraft MSN
Component ID jika component task
Component P/N dan S/N
ATA Chapter
Maintenance Event Type
Execution Station
Applicable Position/Zone
Task Criticality
Applicability Status
Applicability Basis
```

## Applicability status

```text
APPLICABLE
CONDITIONALLY_APPLICABLE
NOT_APPLICABLE
UNRESOLVED
```

## Business rule

Job Card tidak dapat masuk `RELEASED_TO_EXECUTION` jika:

```text
aircraft_id IS NULL
OR applicability = UNRESOLVED
OR aircraft_configuration_status != VERIFIED
OR source_data_status != CURRENT
```

## Kontrol UI

Header Job Card harus selalu menampilkan:

```text
Aircraft Registration
Job Card Number
Aircraft/Component Applicability
Job Card Lifecycle State
Critical Task Indicator
```

## Failure behaviour

```text
APPLICABILITY UNRESOLVED
Execution is blocked pending Engineering review.
```

---

# 5. Section 2 — Approved data reference

## Field wajib

```text
Document Type
Document Number
Document Title
Revision
Issue Date
Effective Date
Exact Section/Task Reference
Figure/Sheet Reference
Source Organization
Approval Type
Approval Reference
Applicability Result
Frozen Revision ID
Controlled Copy Status
Offline Package Status
```

## Supported source type

```text
AMM
IPC
WDM
SRM
CMM
MPD-derived operator task
Engineering Order
AD
SB
Modification Instruction
Approved Repair Data
Operator Procedure
AMO Procedure
```

## Business rule

```text
document.status = CURRENT
AND applicability = APPLICABLE
AND exact_reference IS NOT NULL
AND controlled_copy_available = true
```

## Revision handling

Saat Work Package committed:

```text
Exact technical-data revision is frozen.
```

Jika revision baru diterbitkan saat Job Card aktif:

```text
NEW REVISION AVAILABLE
Impact review required.
```

Sistem tidak boleh mengganti revision aktif secara otomatis.

## UI

```text
SOURCE DATA

AMM
Document: [controlled document number]
Revision: [frozen revision]
Section: [exact task reference]
Status: CURRENT
Applicability: APPLICABLE
Controlled copy: AVAILABLE
```

Action:

```text
[Open Controlled Section]
[View Applicability]
[Report Technical Data Issue]
```

---

# 6. Section 3 — Safety precautions

## Field wajib

```text
Safety Precaution ID
Precaution Type
Instruction
Severity
Required Acknowledgment
Required Physical Control
Evidence Requirement
Applies Before Step
Release Condition
```

## Precaution type

```text
ENERGY ISOLATION
AIRCRAFT SUPPORT
SYSTEM DEPRESSURIZATION
ELECTRICAL SAFETY
FUEL/HYDRAULIC HAZARD
MOVING SURFACE
FIRE PROTECTION
FOD CONTROL
ENVIRONMENTAL CONTROL
PERSONAL PROTECTIVE EQUIPMENT
```

## Rule

Step yang bergantung pada safety control tidak boleh dimulai sebelum precaution dinyatakan aktif.

```text
IF step.requires_isolation = true
AND isolation.status != CONFIRMED
THEN step.start = BLOCKED
```

## UI

```text
SAFETY CONTROLS

⛔ System must be depressurized
Status: NOT CONFIRMED
Responsible role: Technician
Evidence: Isolation record required

[Confirm Isolation]
```

Checkbox biasa tidak cukup untuk safety control yang memerlukan record atau verification.

---

# 7. Section 4 — Prerequisites

## Field wajib

```text
Prerequisite ID
Type
Description
Responsible Role
Required Before Step
Verification Method
Status
Evidence Reference
Verified By
Verified At
```

## Prerequisite type

```text
AIRCRAFT CONDITION
ACCESS AVAILABLE
SYSTEM CONFIGURATION
PRECEDING JOB CARD
MATERIAL AVAILABLE
TOOL AVAILABLE
PERSONNEL AUTHORIZED
TECHNICAL DATA AVAILABLE
ENVIRONMENTAL CONDITION
INSPECTION AVAILABILITY
```

## Status

```text
NOT_CHECKED
PASSED
FAILED
WAIVED_BY_APPROVED_PROCEDURE
NOT_APPLICABLE
```

`WAIVED` hanya dapat digunakan jika terdapat approved basis dan authorized approval.

---

# 8. Section 5 — Material, tools, dan GSE

## Material requirement

```text
Required P/N
Description
Quantity
Unit
Condition Requirement
Applicability Requirement
Certificate Requirement
Shelf-Life Requirement
Life-Remaining Requirement
Planned Reservation
Actual Issue
Actual Installation/Consumption
```

## Tool requirement

```text
Tool Type
Tool ID
Required Range
Required Accuracy
Calibration Required
Calibration Valid Through
Serviceability
Reservation
Issue Time
Return Time
```

## GSE requirement

```text
GSE Type
GSE ID
Capacity
Serviceability
Inspection Status
Location
Reservation
```

## Start gate

```text
mandatory_material_ready
AND mandatory_tools_eligible
AND mandatory_gse_available
```

## Installation transaction

Ketika part dipasang:

```text
Aircraft
Installation Position
Part Number
Serial Number
Batch/Lot
Condition
Certificate
Removal Source jika applicable
Installed By
Installed At
Job Card Step
Approved Data Reference
```

Material tersedia tidak otomatis berarti eligible. Eligibility harus diperiksa terhadap condition, traceability, certificate, shelf life, life remaining, dan aircraft configuration.

---

# 9. Section 6 — Work instructions

## Struktur instruction block

```text
Instruction Block ID
Sequence
Title
Controlled Instruction
Source Reference
Illustration Reference
Warning/Caution/Note
Required Skill
Estimated Duration
Interruption Allowed After Block
Inspection Requirement
```

## Ketetapan

- Instruksi tidak disimpan hanya sebagai rich text bebas.

- Setiap block mempunyai source reference.

- Warning, caution, dan note dipisahkan secara semantik.

- Interruption point harus ditetapkan.

- Instruction changes mengikuti revision process.

## Instruction type

```text
PREPARATION
ISOLATION
ACCESS
REMOVAL
CLEANING
INSPECTION
MEASUREMENT
REPAIR
INSTALLATION
ADJUSTMENT
TEST
RESTORATION
CLOSE-OUT
```

---

# 10. Section 7 — Step-by-step execution

Setiap step adalah controlled record tersendiri.

## Data model

```typescript
interface JobCardStep {
  id: string;
  jobCardId: string;

  sequence: number;
  code: string;
  title: string;
  instructionBlockId: string;

  stepType: StepType;
  mandatory: boolean;
  critical: boolean;

  state:
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'PAUSED'
    | 'AWAITING_INPUT'
    | 'AWAITING_INSPECTION'
    | 'FAILED'
    | 'COMPLETED'
    | 'NOT_APPLICABLE';

  requiredRole: string;
  requiredAuthorization?: string;

  predecessorStepIds: string[];
  prerequisiteIds: string[];

  startedBy?: string;
  startedAt?: string;
  completedBy?: string;
  completedAt?: string;

  resultRecordId?: string;
  inspectionRequirementId?: string;
}
```

## Step type final

```text
ACKNOWLEDGMENT
PERFORMED_ACTION
CHECKLIST_GROUP
MEASURED_VALUE
PASS_FAIL
TEXT_OBSERVATION
PART_REMOVAL
PART_INSTALLATION
MATERIAL_CONSUMPTION
TOOL_CONFIRMATION
PHOTO_EVIDENCE
DOCUMENT_REFERENCE
TECHNICIAN_SIGN_OFF
INSPECTOR_SIGN_OFF
DUAL_SIGN_OFF
```

## Rule umum

```text
A step cannot become COMPLETED unless:
- prerequisites passed;
- required input valid;
- required evidence attached;
- required signature valid;
- no unresolved failure exists.
```

---

# 11. Step input specification

## A. Performed action

```text
Result:
PERFORMED
NOT_PERFORMED
UNABLE_TO_PERFORM
NOT_APPLICABLE
```

`NOT_PERFORMED` dan `UNABLE_TO_PERFORM` harus menghasilkan reason dan blocker/disposition workflow.

---

## B. Measured value

```text
Measured Value
Unit
Minimum Limit
Maximum Limit
Nominal Value jika applicable
Measurement Tool
Tool Calibration Status
Measurement Time
Measured By
```

Validation:

```text
IF value < minimum
OR value > maximum
THEN:
  step = FAILED
  finding_required = true
```

User tidak dapat mengubah limit pada execution page.

---

## C. Pass/fail

```text
PASS
FAIL
UNABLE_TO_DETERMINE
```

`FAIL` menghasilkan finding atau rework requirement berdasarkan rule.

---

## D. Text observation

Text observation digunakan untuk kondisi yang memang memerlukan narasi.

Field:

```text
Observation
Condition Code
Location
Relevant Measurement
Evidence
```

Narasi tidak boleh menggantikan structured measurement atau part transaction.

---

## E. Part removed

```text
Removed P/N
Removed S/N
Position
Removal Reason
Condition After Removal
Removal Time
Removed By
Destination
Tag/Record Reference
```

---

## F. Part installed

```text
Installed P/N
Installed S/N
Position
Condition
Certificate
Eligibility Result
Installed By
Installation Time
```

---

## G. Attachment

```text
Attachment Type
File
Captured At
Captured By
Related Step
Description
Integrity Hash
Sync Status
Verification Status
```

Attachment type:

```text
PHOTO
MEASUREMENT REPORT
CERTIFICATE
TEST REPORT
DRAWING
ENGINEERING APPROVAL
SUPPORTING DOCUMENT
```

---

## H. Dual sign-off

Dual sign-off bukan dua checkbox.

Data:

```text
Performer Identity
Performer Authorization Snapshot
Performer Signature
Performer Signed At

Verifier Identity
Verifier Authorization Snapshot
Verifier Independence Result
Verifier Signature
Verifier Signed At
```

Sistem harus mencegah orang yang sama mengisi kedua fungsi ketika independence diwajibkan.

---

# 12. Section 8 — Measurement dan inspection results

Measurement result harus menjadi structured record.

```text
Result ID
Step ID
Measurement Type
Value
Unit
Limit Source
Minimum/Maximum
Result Status
Tool ID
Calibration Snapshot
Environmental Condition jika relevan
Measured By
Measured At
Reviewed By
Review At
```

Result status:

```text
WITHIN_LIMIT
OUT_OF_LIMIT
INCONCLUSIVE
INVALIDATED
```

Jika measurement diubah setelah inspection:

```text
Inspection status = REINSPECTION_REQUIRED
```

Hasil lama tetap tersimpan dalam audit trail.

---

# 13. Section 9 — Findings dan non-routine work

Finding dibuat dari Job Card dan step tertentu.

## Field wajib

```text
Finding ID
Aircraft/Component
Job Card
Step
ATA
Location
Observed Condition
Expected Condition
Measurement
Limit
Evidence
Operational Impact
Reporter
Reported At
Work Stop Required
```

## Finding state

```text
OPEN
UNDER_ASSESSMENT
DISPOSITIONED
RECTIFICATION_IN_PROGRESS
AWAITING_INSPECTION
CLOSED
```

## Disposition

```text
WITHIN_APPROVED_LIMIT
RECTIFY_USING_EXISTING_DATA
CREATE_NON_ROUTINE_JOB_CARD
ENGINEERING_ORDER_REQUIRED
APPROVED_REPAIR_DATA_REQUIRED
MEL_CDL_ASSESSMENT_REQUIRED
AIRCRAFT_GROUNDED
```

## Rule

Job Card tidak dapat technically completed jika:

```text
finding.status IN (
  OPEN,
  UNDER_ASSESSMENT,
  RECTIFICATION_IN_PROGRESS,
  AWAITING_INSPECTION
)
```

kecuali finding telah dipisahkan melalui approved disposition yang tetap menjaga release gate.

---

# 14. Section 10 — Evidence dan attachments

Evidence tidak boleh menjadi folder upload umum.

## Evidence requirement

```text
Requirement ID
Related Step/Inspection/Action
Evidence Type
Mandatory
Verification Method
Accepted Source
Status
```

## Verification status

```text
MISSING
UPLOADED
UNDER_REVIEW
ACCEPTED
REJECTED
SUPERSEDED
```

## Rule

```text
step.completion =
  required_evidence.status = ACCEPTED
```

atau, jika hanya automatic verification:

```text
required_evidence.status IN (UPLOADED, ACCEPTED)
```

sesuai rule yang berlaku.

---

# 15. Section 11 — Technician certification

Technician certification harus menyatakan makna signature.

## Field

```text
Certification Statement ID
Statement Text
Job Card Revision
Technical Data Revision
Completed Steps
Technician Identity
License
Company Authorization
Authorization Scope
Station Scope
Signature
Signed At
```

## Runtime checks

```text
User authenticated
Employment active
License valid
Company authorization valid
Aircraft scope match
Task scope match
Station scope match
Training current
Record revision unchanged
No unresolved mandatory step
```

## Action label

Gunakan:

```text
[Complete and Sign Work]
```

Bukan:

```text
[Done]
```

## Signature meaning

```text
PERFORMED_BY
WORK_COMPLETION_CERTIFICATION
```

Jangan menggunakan generic signature type.

---

# 16. Section 12 — Inspector dan independent inspection

## Inspection requirement

```text
Inspection Type
Required Step
Inspection Basis
Required Authorization
Independence Required
Evidence Required
Inspection Timing
Reinspection Trigger
```

## Inspection type

```text
IN_PROCESS_INSPECTION
REQUIRED_INSPECTION
INDEPENDENT_INSPECTION
FUNCTIONAL_TEST_WITNESS
FINAL_INSPECTION
```

## Inspection result

```text
ACCEPTED
REJECTED_REWORK_REQUIRED
UNABLE_TO_VERIFY
ENGINEERING_REVIEW_REQUIRED
```

## Data wajib

```text
Inspector Identity
Authorization Snapshot
Independence Result
Inspected Job Card Revision
Inspected Step Revision
Evidence
Result
Reason jika tidak accepted
Signature
Inspection Time
```

## Rework

Jika inspection rejected:

```text
Job Card → REWORK_REQUIRED
Affected step → FAILED
Previous completion → INVALIDATED
Inspection record → retained
```

Setelah rework:

```text
Inspection Status → REINSPECTION_REQUIRED
```

Inspection lama tidak ditimpa.

---

# 17. Section 13 — Completion dan sign-off

Job Card completion terdiri dari tiga keputusan terpisah.

## A. Physical/technical work completion

```text
All mandatory steps completed
Measurements valid
Findings dispositioned
Rework cleared
Resources accounted for
```

State:

```text
TECHNICALLY_COMPLETED
```

## B. Maintenance sign-off

```text
Authorized signer
Controlled statement
Runtime authorization
Signature
```

State:

```text
SIGNED_OFF
```

## C. Records acceptance

```text
Required fields complete
Component transactions complete
Attachments valid
Inspection records complete
Configuration update complete
No unresolved amendment
No sync conflict
```

State:

```text
RECORDS_ACCEPTED
```

Job Card baru dianggap selesai untuk Work Package setelah `RECORDS_ACCEPTED`.

## Completion guard

```text
mandatory_steps_complete
AND mandatory_inspections_accepted
AND unresolved_findings = 0
AND rework_items = 0
AND mandatory_evidence_complete
AND material_transactions_complete
AND tools_accounted_for
AND execution_signatures_valid
```

---

# 18. Section 14 — Amendments dan audit trail

Signed record tidak boleh diedit langsung.

## Amendment lifecycle

```text
AMENDMENT_REQUESTED
→ UNDER_REVIEW
→ APPROVED
→ APPLIED
→ RE_SIGN_REQUIRED
→ COMPLETED
```

## Field wajib

```text
Amendment ID
Record Type
Record ID
Original Value
Proposed Value
Reason
Requested By
Requested At
Reviewed By
Review Decision
Affected Signatures
Re-sign Requirement
Applied At
```

## Rule

Jika perubahan mengubah makna pekerjaan atau certification:

```text
Existing signature = SUPERSEDED
New signature required
```

Jika perubahan hanya metadata non-substantif, perlakuannya harus mengikuti approved records procedure.

FAA AC 120-78B merupakan guidance aktif untuk electronic signatures, electronic recordkeeping, dan electronic manuals, termasuk records serta task cards dalam format digital. AC tersebut adalah acceptable guidance, bukan pengganti approval atau prosedur DGCA/operator. ([Federal Aviation Administration](https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1043396?utm_source=chatgpt.com 'AC 120-78B - Electronic Signatures ...'))

---

# 19. Interruption dan handover

## Pause action

```text
[Pause Task]
```

Data wajib:

```text
Pause Reason
Last Fully Completed Step
Current Step
Aircraft/Component Physical Condition
Open Panels
Removed/Loose Parts
Tools in Work Area
Safety Lock/Tag
Temporary Protection
Open Findings
Next Safe Action
Handover Required
```

## Resume

User harus mengonfirmasi:

```text
Aircraft identity verified
Physical state matches interruption record
Tools and parts accounted for
Technical-data revision checked
Open findings reviewed
Handover accepted
```

Baru kemudian:

```text
[Resume from Controlled Step]
```

Progress tidak ditentukan dari persentase, tetapi dari step terakhir yang selesai dan tervalidasi.

---

# 20. Offline behaviour

## Offline diperbolehkan untuk

- membuka controlled data package yang sudah divalidasi;

- mencatat progress;

- mencatat measurement;

- membuat finding;

- menambahkan evidence;

- membuat handover;

- menyimpan local execution record.

## Status wajib

```text
SAVED LOCALLY
PENDING SYNC
SYNCED
SYNC FAILED
CONFLICT
SERVER REJECTED
```

## Aturan sign-off

Offline sign-off hanya boleh diaktifkan jika prosedur electronic records/signature operator secara eksplisit mengizinkannya.

Jika belum divalidasi server:

```text
SIGNED LOCALLY
NOT YET SERVER VALIDATED
```

Job Card tidak boleh menjadi `RECORDS_ACCEPTED` dan tidak boleh dipakai untuk final release sampai validation requirement terpenuhi.

---

# 21. Action yang tersedia berdasarkan state

| Job Card state          | Action                                               |
| ----------------------- | ---------------------------------------------------- |
| `RELEASED_TO_EXECUTION` | Assign Technician                                    |
| `ASSIGNED`              | Start Work                                           |
| `IN_PROGRESS`           | Complete Step, Pause, Raise Finding, Request Support |
| `PAUSED`                | Review Handover, Resume                              |
| `AWAITING_SUPPORT`      | Review Resolution, Resume                            |
| `AWAITING_INSPECTION`   | Inspect                                              |
| `REWORK_REQUIRED`       | Start Rework                                         |
| `TECHNICALLY_COMPLETED` | Complete and Sign Work                               |
| `SIGNED_OFF`            | Review Records                                       |
| `RECORDS_ACCEPTED`      | View Record                                          |
| `VOIDED/TERMINATED`     | View History                                         |

Action harus ditentukan oleh:

```text
Current state
+ role
+ authorization
+ prerequisite
+ data freshness
+ sync status
```

Bukan berdasarkan role saja.

---

# 22. API command model

Tidak boleh ada endpoint:

```http
PATCH /job-cards/{id}
{
  "status": "SIGNED_OFF"
}
```

Gunakan command khusus.

```http
POST /job-cards/{id}/transitions/start
POST /job-cards/{id}/steps/{stepId}/complete
POST /job-cards/{id}/transitions/pause
POST /job-cards/{id}/transitions/resume
POST /job-cards/{id}/findings
POST /job-cards/{id}/transitions/request-inspection
POST /job-cards/{id}/transitions/sign-off
POST /job-cards/{id}/transitions/accept-records
```

## Complete measured step

```json
{
  "expectedJobCardVersion": 18,
  "value": 0.16,
  "unit": "mm",
  "toolId": "tool_tw_019",
  "evidenceIds": ["ev_2819"],
  "idempotencyKey": "70c91cc1-178c-4c21-9704-7f682cfa8161"
}
```

Backend melakukan:

```text
Load Job Card
Check expected version
Check lifecycle state
Check step prerequisite
Check current authorization
Check technical-data revision
Check tool eligibility
Validate value and unit
Compare against tolerance
Create result record
Append audit event
Recalculate Job Card state
Recalculate Work Package readiness
```

---

# 23. Database entity minimum

```text
job_cards
job_card_revisions
job_card_applicability
job_card_source_references
job_card_instruction_blocks
job_card_steps
job_card_step_dependencies
job_card_step_results
job_card_measurements
job_card_precautions
job_card_prerequisites
job_card_material_requirements
job_card_material_transactions
job_card_tool_requirements
job_card_tool_usage
job_card_findings
job_card_evidence_requirements
job_card_evidence
job_card_inspection_requirements
job_card_inspections
job_card_signatures
job_card_interruptions
job_card_handovers
job_card_amendments
job_card_transition_events
```

Jangan menyimpan seluruh Job Card sebagai satu JSON besar tanpa relational integrity dan versioning yang jelas.

---

# 24. Audit event

Setiap action menghasilkan immutable event.

```typescript
interface JobCardAuditEvent {
  eventId: string;
  jobCardId: string;
  jobCardRevision: number;

  eventType: string;
  fromState?: string;
  toState?: string;

  stepId?: string;
  resultId?: string;

  actorUserId: string;
  actingRole: string;
  authorizationSnapshotId?: string;

  reasonCode?: string;
  reasonText?: string;

  evidenceIds: string[];
  signatureId?: string;
  signatureMeaning?: string;

  deviceOccurredAt?: string;
  serverRecordedAt: string;
  stationId: string;
  deviceId?: string;

  syncStatus: string;
  correlationId: string;
  idempotencyKey: string;

  aggregateVersionBefore: number;
  aggregateVersionAfter: number;
}
```

Event wajib:

```text
JOB_CARD_RELEASED
JOB_CARD_ASSIGNED
JOB_CARD_STARTED
STEP_STARTED
STEP_COMPLETED
STEP_FAILED
MEASUREMENT_RECORDED
PART_REMOVED
PART_INSTALLED
JOB_CARD_PAUSED
HANDOVER_SUBMITTED
HANDOVER_ACCEPTED
JOB_CARD_RESUMED
FINDING_RAISED
INSPECTION_REQUESTED
INSPECTION_ACCEPTED
INSPECTION_REJECTED
REWORK_STARTED
JOB_CARD_TECHNICALLY_COMPLETED
JOB_CARD_SIGNED_OFF
JOB_CARD_RECORDS_ACCEPTED
AMENDMENT_REQUESTED
AMENDMENT_APPLIED
```

---

# 25. Regulatory Traceability Matrix

| ID         | Requirement                                     | Business rule                                      | UI/system control            | Evidence                   | Authorized role        | Failure behaviour             |
| ---------- | ----------------------------------------------- | -------------------------------------------------- | ---------------------------- | -------------------------- | ---------------------- | ----------------------------- |
| **JC-001** | Pekerjaan harus mempunyai description/reference | Job Card wajib mengikat source dan exact section   | Source-data header           | Document/revision snapshot | Engineering            | Release to execution ditolak  |
| **JC-002** | Aircraft/component applicability harus jelas    | Applicability tidak boleh unresolved               | Applicability status         | Configuration snapshot     | Engineering            | Execution blocked             |
| **JC-003** | Pekerjaan harus terdokumentasi                  | Setiap mandatory step mempunyai result             | Step execution               | Step result event          | Technician             | Job Card incomplete           |
| **JC-004** | Tanggal dan pelaksana harus tercatat            | Completion menyimpan actor dan timestamp           | Completion record            | User/time                  | Technician             | Sign-off ditolak              |
| **JC-005** | Measurement harus dapat ditelusuri              | Value, unit, limit, tool, dan actor wajib          | Measurement input            | Structured result          | Technician             | Step tidak complete           |
| **JC-006** | Out-of-limit result tidak boleh diabaikan       | Failed result menghasilkan finding/blocker         | Failure indicator            | Result/finding linkage     | Technician/Engineering | Task blocked                  |
| **JC-007** | Required inspection harus dilakukan             | Inspection gate harus accepted                     | Inspection panel             | Inspector record/signature | Inspector              | Sign-off blocked              |
| **JC-008** | Independent inspection harus independen         | Performer dan inspector berbeda jika required      | Independence check           | Identity comparison        | Inspector              | Inspection rejected           |
| **JC-009** | Rework harus dapat ditelusuri                   | Rework membatalkan inspection terkait              | Reinspection state           | Rework linkage             | Technician/Inspector   | Release blocked               |
| **JC-010** | Completion membutuhkan authority                | Runtime authorization diperiksa saat sign          | Certification panel          | Authorization snapshot     | Authorized signer      | Signature rejected            |
| **JC-011** | Signed record tidak boleh ditimpa               | Perubahan melalui amendment                        | Amendment workflow           | Before/after/reason        | Authorized role        | Direct edit rejected          |
| **JC-012** | Electronic records harus retrievable            | Record dan evidence dapat diambil kembali          | Record package viewer/export | Record manifest            | Technical Records      | Records acceptance rejected   |
| **JC-013** | Offline state harus terlihat                    | Local data tidak disamakan dengan server validated | Sync status                  | Sync events                | System                 | Final acceptance blocked      |
| **JC-014** | Job Card baru selesai setelah record diterima   | `SIGNED_OFF` tidak sama dengan `RECORDS_ACCEPTED`  | Separate statuses            | Records checklist          | Technical Records      | Work Package tetap incomplete |

---

# 26. Minimum UAT

| Skenario                                                    | Expected result                                      |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| Job Card tidak mempunyai approved-data reference            | Tidak dapat released ke execution                    |
| Applicability unresolved                                    | Start Work ditolak                                   |
| Source revision superseded sebelum commitment               | Job Card tidak dapat digunakan                       |
| Revision baru muncul saat execution                         | Active revision tidak berubah; impact review dibuat  |
| Technician tidak authorized                                 | Start atau sign-off ditolak                          |
| Safety isolation belum dikonfirmasi                         | Dependent step tidak dapat dimulai                   |
| Required tool calibration expired                           | Step diblokir                                        |
| Measurement di luar limit                                   | Step failed dan finding wajib dibuat                 |
| User memilih `Not Applicable` tanpa authority               | Transition ditolak                                   |
| Mandatory attachment belum tersedia                         | Step completion ditolak                              |
| Technician pause tanpa physical state                       | Pause submission ditolak                             |
| Incoming technician belum accept handover                   | Resume ditolak                                       |
| Inspector sama dengan performer pada independent inspection | Sign-off ditolak                                     |
| Inspection rejected                                         | Job Card menjadi `REWORK_REQUIRED`                   |
| Rework selesai tetapi belum reinspected                     | Job Card tidak dapat technically completed           |
| Part installation belum dicatat                             | Completion ditolak                                   |
| Job Card technically complete tetapi belum signed           | Work Package tetap incomplete                        |
| Job Card signed tetapi records belum accepted               | Release gate tetap blocked                           |
| Signed record diedit                                        | Direct edit ditolak dan amendment diwajibkan         |
| Evidence diganti setelah signature                          | Signature/inspection menjadi stale                   |
| Job Card diselesaikan offline                               | Status pending sync; tidak dianggap records accepted |
| Duplicate submit                                            | Hanya satu event dibuat melalui idempotency key      |
| Concurrent update menggunakan version lama                  | Request ditolak sebagai conflict                     |

---

# 27. Komponen Figma yang harus dibuat

```text
JobCardExecutionPage
├── MaintenanceContextHeader
├── JobCardControlHeader
├── SourceDataPanel
├── SafetyPrecautionPanel
├── PrerequisitePanel
├── StepNavigator
├── WorkInstructionPanel
├── StepInputRenderer
│   ├── ActionInput
│   ├── MeasurementInput
│   ├── PassFailInput
│   ├── ObservationInput
│   ├── PartRemovalInput
│   ├── PartInstallationInput
│   ├── AttachmentInput
│   └── SignatureInput
├── ResourceContextPanel
├── InspectionPanel
├── FindingDrawer
├── HandoverDrawer
├── TechnicalDataIssueDrawer
├── CompletionCertificationPanel
├── AmendmentHistory
└── StickyActionBar
```

Variants utama:

```text
Assigned
In Progress
Paused
Awaiting Support
Awaiting Inspection
Rework Required
Technically Completed
Signed Off
Records Accepted
Offline
Sync Conflict
Critical Task
```

---

# Keputusan akhir

Struktur implementasi Job Card menjadi:

```text
Controlled identity and applicability
→ Frozen approved-data reference
→ Safety and prerequisites
→ Eligible resources
→ Step-level controlled execution
→ Structured results
→ Finding and non-routine control
→ Required inspection
→ Authorized certification
→ Records acceptance
→ Immutable audit trail
```

Dengan model ini, Job Card pada overview tetap boleh terlihat seperti daftar pekerjaan. Namun ketika dibuka, sistem berubah menjadi **technical execution workspace dan maintenance record** yang memiliki:

- source yang pasti;

- applicability yang terverifikasi;

- state dan transition;

- input terstruktur;

- role dan authorization;

- evidence;

- inspection;

- signature;

- correction control;

- serta audit trail lengkap.
