# Next Required Actions — Spesifikasi Implementasi Nyata

Saya menetapkan **Next Required Actions** sebagai **action orchestration layer** pada Work Package.

Komponen ini bukan daftar tugas bebas yang dibuat user. Isinya harus dihasilkan dari:

```text
Release blocker
Workflow blocker
Warning
Inspection result
Resource deficiency
Record deficiency
Human assignment
```

Dasar operasionalnya kuat: DGCA SI 8900-6.9 memeriksa kecukupan personel yang trained, qualified, dan authorized, pengendalian tools serta calibration, maintenance records, dan pelaksanaan shift-turnover procedure. SI 8900-3.329 yang berstatus berlaku mengatur evaluasi maintenance-record system operator. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=4vKtAtteWrmKThIe0keS3u8QmITj2K3Kl4JJvdoVAJHj8X1GYxdtQzn4ub8fcDih2T4vQhQ4klhEu4JDTguLnczG4ktKgHdmkoC4JIcmVK82rvLnkxPrgWMDSHKRwf6D49iEJu3YrwWbnzd6NEMzsPX3TE1M131wRvNQU2gCK6cUYA8qAmFclJvwyQjHgXi3oEjVkP7fSek2UXMOWGdVjKxVyd1g&utm_source=chatgpt.com 'KP 064 TAHUN 2018 TENTANG PETUNJUK TEKNIS ...'))

FAA juga menempatkan status pekerjaan, komunikasi, checklist, dan turnover sebagai kontrol penting dalam maintenance human factors. Oleh sebab itu, action harus menunjukkan owner, kondisi pekerjaan, tindakan berikutnya, dan bukti penyelesaiannya—bukan hanya label error. ([Federal Aviation Administration](https://www.faa.gov/sites/faa.gov/files/about/initiatives/maintenance_hf/training_tools/HF_Guide.pdf?utm_source=chatgpt.com 'Human Factors Guide for Aviation Maintenance and ...'))

---

# 1. Keputusan model

Pisahkan tiga objek:

```text
Readiness Issue
→ Required Action
→ Resolution Evidence
```

## A. Readiness Issue

Menjelaskan kondisi yang ditemukan sistem:

```text
Hydraulic filter yang diwajibkan JC-031 belum tersedia.
```

## B. Required Action

Menjelaskan tindakan yang harus dilakukan:

```text
Reserve satu hydraulic filter P/N 7010-15
yang serviceable dan eligible untuk PK-ANI.
```

## C. Resolution Evidence

Membuktikan bahwa tindakan benar-benar selesai:

```text
Reservation ID
Part number
Serial/batch
Release certificate
Eligibility result
Reserved location
Reserved quantity
Timestamp
```

Action tidak boleh berubah menjadi `Resolved` hanya karena user menekan tombol.

---

# 2. Data wajib setiap action

Struktur minimalnya:

```text
Problem
Operational impact
Current status
Owner role
Assigned person
Required action
Due time
Due basis
Source rule
Evidence required
Resolution criteria
Escalation
Dependencies
Affected entities
```

Spesifikasi lengkap:

```typescript
interface RequiredAction {
  id: string;
  actionCode: string;

  workPackageId: string;
  aircraftId: string;

  issueId: string;
  category: ActionCategory;

  problem: {
    title: string;
    description: string;
    sourceEntityType: string;
    sourceEntityId: string;
  };

  operationalImpact: {
    level: OperationalImpactLevel;
    description: string;
    affectedWorkflowStage?: string;
    aircraftStatusImpact?: string;
    releaseImpact: 'NONE' | 'WARNING' | 'BLOCKER';
  };

  priority: {
    level: 'P1' | 'P2' | 'P3' | 'P4';
    reasonCode: string;
  };

  owner: {
    accountableRole: string;
    assignedUserId?: string;
    supportingRoles: string[];
    escalationRole?: string;
  };

  requiredAction: {
    commandCode: string;
    title: string;
    instructions: string;
    targetEntityType: string;
    targetEntityId: string;
  };

  due: {
    dueAt?: string;
    actionByAt?: string;
    dueBasis: DueBasis;
    sourceReference?: string;
    timezone: string;
  };

  sourceRule: {
    ruleId: string;
    ruleVersion: string;
    requirementId: string;
    sourceDocument?: string;
    sourceRevision?: string;
    sourceClause?: string;
  };

  evidenceRequirements: EvidenceRequirement[];
  resolutionCriteria: ResolutionCriterion[];

  dependencies: string[];
  affectedEntities: AffectedEntity[];

  status: RequiredActionStatus;

  detectedAt: string;
  assignedAt?: string;
  acknowledgedAt?: string;
  startedAt?: string;
  submittedAt?: string;
  verifiedAt?: string;
  resolvedAt?: string;

  createdFromEvaluationId: string;
  lastEvaluationId: string;
}
```

---

# 3. Jangan campurkan severity dengan operational impact

Severity dan operational impact adalah dua hal berbeda.

## Severity

Menunjukkan tingkat pentingnya kondisi:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

## Operational impact

Menunjukkan apa yang terpengaruh:

```typescript
type OperationalImpactLevel =
  | 'AIRCRAFT_GROUNDING'
  | 'TECHNICAL_RELEASE_BLOCKER'
  | 'WORK_PACKAGE_STAGE_BLOCKER'
  | 'JOB_CARD_BLOCKER'
  | 'OPERATIONAL_WARNING'
  | 'INFORMATION';
```

Contoh penerapan:

```text
Severity: HIGH
Operational impact: JOB_CARD_BLOCKER
Release impact: BLOCKER
```

Material mungkin hanya menghentikan satu Job Card pada saat ini, tetapi karena Job Card tersebut mandatory, dampak akhirnya tetap menjadi technical-release blocker.

---

# 4. State machine Required Action

Gunakan state berikut:

```text
OPEN
→ ASSIGNED
→ ACKNOWLEDGED
→ IN_PROGRESS
→ WAITING_DEPENDENCY
→ READY_FOR_VERIFICATION
→ RESOLVED
```

State alternatif:

```text
SUPERSEDED
CANCELLED_BY_SOURCE_CHANGE
EVALUATION_ERROR
```

## Diagram

```text
Issue detected
      ↓
OPEN
      ↓ Assign owner
ASSIGNED
      ↓ Owner accepts
ACKNOWLEDGED
      ↓ Work starts
IN_PROGRESS
      ├──→ WAITING_DEPENDENCY
      │          ↓ Dependency resolved
      └──────── IN_PROGRESS
                  ↓ Evidence submitted
          READY_FOR_VERIFICATION
                  ↓ Rule/authorized review passed
              RESOLVED
```

## Status yang tidak digunakan

Jangan menggunakan:

```text
Done
Closed
Finished
```

karena tidak menjelaskan apakah tindakan:

- baru dikerjakan;

- sudah mempunyai evidence;

- sudah diverifikasi;

- benar-benar menghilangkan blocker.

---

# 5. Transition specification

## ACT-T01 — Membuat action

| Properti    | Ketetapan                                                               |
| ----------- | ----------------------------------------------------------------------- |
| Transition  | `— → OPEN`                                                              |
| Pemicu      | Readiness evaluator atau authorized manual assessment                   |
| Prasyarat   | Issue unik ditemukan                                                    |
| Data wajib  | Problem, impact, rule, required action, owner role, resolution criteria |
| Signature   | Tidak diperlukan                                                        |
| Audit event | `REQUIRED_ACTION_CREATED`                                               |
| Dampak      | Blocker/warning tampil di Work Package                                  |

Action manual hanya boleh dibuat dari controlled assessment, misalnya:

- inspector rejection;

- engineering disposition;

- records discrepancy;

- quality hold.

User tidak boleh membuat arbitrary release blocker tanpa source dan authority.

---

## ACT-T02 — Assign owner

| Properti        | Ketetapan                                |
| --------------- | ---------------------------------------- |
| Transition      | `OPEN → ASSIGNED`                        |
| Authorized role | Process owner atau supervisor            |
| Data wajib      | Assigned user, expected response time    |
| Prasyarat       | User aktif dan sesuai organisasi/station |
| Audit event     | `REQUIRED_ACTION_ASSIGNED`               |

Assignment belum membuktikan user mempunyai authorization untuk melakukan technical action. Authorization diperiksa kembali pada command aktual.

---

## ACT-T03 — Acknowledge

| Properti        | Ketetapan                      |
| --------------- | ------------------------------ |
| Transition      | `ASSIGNED → ACKNOWLEDGED`      |
| Authorized role | Assigned user                  |
| Data wajib      | Acknowledgment                 |
| Timestamp       | Wajib                          |
| Audit event     | `REQUIRED_ACTION_ACKNOWLEDGED` |

`Acknowledge` hanya berarti owner menerima penugasan.

Ia tidak:

- menyelesaikan warning;

- menghilangkan blocker;

- memberikan approval;

- memperpanjang due time.

---

## ACT-T04 — Start action

| Properti        | Ketetapan                                    |
| --------------- | -------------------------------------------- |
| Transition      | `ACKNOWLEDGED → IN_PROGRESS`                 |
| Authorized role | Assigned user                                |
| Prasyarat       | Action masih applicable dan belum superseded |
| Data wajib      | Actual start                                 |
| Audit event     | `REQUIRED_ACTION_STARTED`                    |

Sistem menjalankan ulang context check:

```text
Aircraft masih sama?
Work Package revision masih sama?
Issue masih aktif?
User masih authorized?
Source rule masih applicable?
```

---

## ACT-T05 — Waiting dependency

| Properti        | Ketetapan                                     |
| --------------- | --------------------------------------------- |
| Transition      | `IN_PROGRESS → WAITING_DEPENDENCY`            |
| Authorized role | Assigned user/supervisor                      |
| Reason          | Wajib                                         |
| Data wajib      | Dependency, owner dependency, expected update |
| Audit event     | `REQUIRED_ACTION_WAITING_DEPENDENCY`          |

Reason code:

```text
WAITING_SUPPLIER
WAITING_ENGINEERING
WAITING_INSPECTOR
WAITING_MATERIAL_TRANSFER
WAITING_TECHNICAL_DATA
WAITING_OPERATOR_CONFIRMATION
WAITING_EXTERNAL_AMO
```

Action tetap open dan tetap memengaruhi readiness.

---

## ACT-T06 — Submit evidence

| Properti        | Ketetapan                                    |
| --------------- | -------------------------------------------- |
| Transition      | `IN_PROGRESS → READY_FOR_VERIFICATION`       |
| Authorized role | Assigned user                                |
| Prasyarat       | Seluruh evidence wajib tersedia              |
| Data wajib      | Evidence references dan completion statement |
| Audit event     | `REQUIRED_ACTION_SUBMITTED_FOR_VERIFICATION` |

Backend harus memeriksa evidence requirement, bukan hanya keberadaan attachment.

---

## ACT-T07 — Verify and resolve

| Properti        | Ketetapan                                 |
| --------------- | ----------------------------------------- |
| Transition      | `READY_FOR_VERIFICATION → RESOLVED`       |
| Authorized role | System evaluator atau authorized verifier |
| Prasyarat       | Seluruh resolution criteria passed        |
| Signature       | Sesuai jenis action                       |
| Audit event     | `REQUIRED_ACTION_RESOLVED`                |
| Dampak          | Readiness dan release gate dihitung ulang |

Setelah resolved:

```text
Re-evaluate source rule
→ Verify blocker no longer exists
→ Create new readiness snapshot
→ Update global release decision
```

Jika source rule masih gagal, action kembali menjadi:

```text
IN_PROGRESS
```

dengan reason:

```text
RESOLUTION_CRITERIA_NOT_MET
```

---

# 6. Penentuan due time yang benar

Sistem tidak boleh sembarang membuat label:

```text
Due today 16:00
```

Due harus mempunyai sumber yang jelas.

## Due basis

```typescript
type DueBasis =
  | 'REGULATORY_OR_APPROVED_EXPIRY'
  | 'MAINTENANCE_PROGRAM_LIMIT'
  | 'MEL_CDL_EXPIRY'
  | 'WORKFLOW_LATEST_START'
  | 'MAINTENANCE_WINDOW'
  | 'SHIFT_HANDOVER'
  | 'DEPENDENCY_REQUIRED_BY'
  | 'INTERNAL_RESPONSE_TARGET'
  | 'NO_FIXED_DUE';
```

## A. `dueAt`

Waktu ketika requirement benar-benar jatuh tempo atau berakhir.

```text
MEL expires:
31 Aug 2026 23:59 WIT
```

## B. `actionByAt`

Waktu terakhir tindakan harus dimulai atau diselesaikan agar due tidak terlewat.

```text
Action by:
31 Aug 2026 18:00 WIT
```

## C. Consequence

```text
If missed:
Aircraft release remains prohibited.
```

Tampilan final:

```text
Due: 31 Aug 2026 · 23:59 WIT
Action by: 31 Aug 2026 · 18:00 WIT
Basis: MEL Category expiry
```

Jangan hanya menampilkan “Today” karena dapat ambigu saat lintas zona waktu atau shift malam.

---

# 7. Prioritas action

Gunakan prioritas tetap:

## P1 — Immediate technical/safety impact

- No-go defect.

- Expired MEL/CDL.

- Critical technical-data issue.

- Aircraft-level grounding condition.

- Invalid technical release data.

## P2 — Release blocker

- Mandatory Job Card incomplete.

- Required inspection incomplete.

- Material traceability incomplete.

- Tool calibration invalid.

- Required signature missing.

## P3 — Workflow blocker

- Material transfer pending.

- Inspector belum assigned.

- Engineering review pending.

- Handover belum accepted.

## P4 — Warning/preventive action

- Calibration mendekati expiry.

- MEL mendekati due.

- Authorization akan habis.

- Maintenance window berisiko terlambat.

## Sorting

```text
1. P1 sebelum P2, P3, P4
2. Expired sebelum approaching due
3. Grounding sebelum stage blocker
4. Dependency-unlocking action lebih dahulu
5. Due/action-by terdekat
6. Assigned to current user
7. Oldest unresolved action
```

Jumlah action tidak menentukan prioritas. Satu MEL expired lebih tinggi daripada enam Job Card administratif yang belum lengkap.

---

# 8. Kepemilikan action

Jangan hanya menyimpan satu field `owner`.

Gunakan:

```text
Accountable role
Assigned person
Supporting role
Verification role
Escalation role
```

## Contoh struktur organisasi action

```text
Accountable role: Stores Supervisor
Assigned person: Daniel Tebai
Supporting role: Procurement
Verification role: Material Inspector/System
Escalation role: Maintenance Manager
```

## Jika belum ada personel

Tampilkan:

```text
Owner role: Stores Supervisor
Assigned person: Unassigned
```

Status tetap:

```text
OPEN
```

dan action masuk escalation queue.

## Assignment rule

Owner yang ditugaskan harus:

- aktif;

- berada pada organisasi/station yang sesuai;

- mempunyai permission melakukan command;

- tersedia pada maintenance window;

- tidak suspended;

- mempunyai authorization bila action teknis memerlukannya.

---

# 9. Action per domain

## A. Work Execution

### Kondisi yang menghasilkan action

- mandatory Job Card belum selesai;

- Job Card paused;

- handover belum diterima;

- technician sign-off belum tersedia;

- finding belum dispositioned;

- rework belum dikerjakan.

### Required action

```text
Complete mandatory Job Card
Accept maintenance handover
Complete rework
Submit Job Card for inspection
Provide execution sign-off
Request engineering disposition
```

### Resolution criteria

```text
Job Card state sesuai required terminal state
Mandatory steps completed
Required measurements recorded
Required signatures valid
No unresolved finding
No unresolved handover
```

### Target

Dedicated Execution workspace.

---

## B. MEL/CDL & Defects

### Kondisi

- open no-go defect;

- MEL/CDL expired;

- M-procedure incomplete;

- O-procedure incomplete;

- placard missing;

- operational restriction belum acknowledged;

- rectification due.

### Required action

```text
Rectify defect
Complete M-procedure
Complete O-procedure
Install and record placard
Review operational limitation
Complete recurring inspection
Close deferred defect after rectification
```

### Resolution criteria

Tidak cukup hanya mengubah status defect.

Wajib memeriksa:

```text
Applicable approved reference
Required procedure completed
Authorized person signed
Restriction recorded
Expiry valid
Rectification evidence complete
Required test/inspection accepted
```

---

## C. Material & Components

### Kondisi

- part tidak tersedia;

- part belum reserved;

- receiving inspection pending;

- traceability incomplete;

- certificate missing;

- part tidak applicable;

- shelf life expired;

- component transaction incomplete.

### Required action yang ditetapkan

```text
Reserve eligible part
Complete receiving inspection
Resolve traceability deficiency
Replace ineligible part
Complete part issue
Complete component installation transaction
Complete component removal/return transaction
```

### Action “Reserve eligible part”

Data wajib:

```text
Required part number
Required quantity
Aircraft/configuration
Required-by time
Selected stock item
Condition
Certificate
Traceability
Shelf life
Life remaining
Storage location
```

Resolution criteria:

```text
reservation.status = CONFIRMED
AND stock_item.condition = SERVICEABLE
AND eligibility_result = ELIGIBLE
AND reserved_quantity >= required_quantity
AND certificate_status = ACCEPTABLE
AND shelf_life_valid = true
```

Tombol:

```text
[Reserve Eligible Part]
```

Bukan hanya `[Reserve Part]`, karena stok fisik belum tentu eligible.

---

## D. Personnel

### Kondisi

- required role belum assigned;

- authorization expired;

- training tidak current;

- fleet/task scope mismatch;

- independent inspector tidak tersedia;

- shift coverage tidak cukup.

### Required action

```text
Assign authorized technician
Assign independent inspector
Replace ineligible assignment
Resolve authorization record
Adjust shift coverage
Request additional qualified personnel
```

### Resolution criteria

```text
person.active
AND authorization.valid
AND fleet_scope_match
AND task_scope_match
AND station_scope_match
AND training_current
AND available_during_required_window
AND independence_rule_satisfied
```

Tidak boleh resolved hanya karena nama user sudah dipilih.

---

## E. Tools & GSE

### Kondisi

- tool unavailable;

- calibration expired;

- wrong range/accuracy;

- GSE unavailable;

- tool masih issued di lokasi lain;

- tool out-of-tolerance under review.

### Required action

```text
Assign calibrated replacement tool
Reserve required GSE
Return and reconcile issued tool
Complete calibration
Resolve out-of-tolerance impact assessment
```

### Resolution criteria untuk replacement

```text
replacement_tool.serviceable
AND calibration_valid_through_use_time
AND tool_range_compatible
AND accuracy_compatible
AND location_available
AND reservation_confirmed
```

DGCA SI 8900-6.9 secara khusus mencakup identifikasi special tools/test equipment, calibration records, dan personel yang sesuai dengan tugasnya. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=4vKtAtteWrmKThIe0keS3u8QmITj2K3Kl4JJvdoVAJHj8X1GYxdtQzn4ub8fcDih2T4vQhQ4klhEu4JDTguLnczG4ktKgHdmkoC4JIcmVK82rvLnkxPrgWMDSHKRwf6D49iEJu3YrwWbnzd6NEMzsPX3TE1M131wRvNQU2gCK6cUYA8qAmFclJvwyQjHgXi3oEjVkP7fSek2UXMOWGdVjKxVyd1g&utm_source=chatgpt.com 'KP 064 TAHUN 2018 TENTANG PETUNJUK TEKNIS ...'))

---

## F. Technical Data & Capability

### Kondisi

- technical-data revision tidak current;

- applicability unresolved;

- revision impact pending;

- section/reference missing;

- station capability invalid;

- controlled data tidak tersedia;

- technical-data ambiguity.

### Required action

```text
Validate applicability
Complete revision impact review
Activate approved revision
Provide controlled technical section
Resolve technical-data discrepancy
Verify AMO/station capability
Issue approved technical disposition
```

### Resolution criteria

```text
document.status = CURRENT
AND applicability = APPLICABLE
AND exact_section_defined
AND source_approval_verified
AND revision_impact_resolved
AND capability_match = VALID
```

EASA Part-145 juga memisahkan prosedur shift/task handover serta notification of maintenance-data inaccuracies and ambiguities, sehingga technical-data issue harus menghasilkan action formal, bukan catatan bebas. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/amc_gm_to_part-145_-_issue_2_amendment_5.pdf?utm_source=chatgpt.com 'AMC & GM to Part-145 — Issue 2, Amendment 5 - EASA'))

---

## G. Inspection

### Kondisi

- inspector belum assigned;

- mandatory inspection pending;

- independent-inspection conflict;

- inspection rejected;

- reinspection required;

- evidence missing.

### Required action

```text
Assign authorized inspector
Complete required inspection
Complete independent inspection
Perform rework
Perform reinspection
Provide inspection evidence
```

### Resolution criteria

```text
inspection.status = ACCEPTED
AND inspector.authorization_valid
AND inspector.scope_match
AND independence_rule_satisfied
AND inspected_revision_matches_execution
AND no_rework_outstanding
```

---

## H. Technical Records

### Kondisi

- maintenance description/reference missing;

- signature missing;

- component transaction incomplete;

- configuration conflict;

- FH/FC conflict;

- material certificate missing;

- provider release missing;

- signed-record amendment pending;

- sync conflict.

### Required action

```text
Complete missing maintenance record
Upload and verify supporting certificate
Resolve aircraft configuration conflict
Reconcile utilization
Complete signed-record amendment
Accept provider maintenance package
Resolve synchronization conflict
```

### Resolution criteria

```text
required_record_fields_complete
AND signatures_valid
AND configuration_reconciled
AND utilization_reconciled
AND supporting_evidence_available
AND amendments_resolved
AND sync_integrity_clear
```

SI 8900-3.329 berfokus pada generation, preservation, dan retrieval maintenance records serta evaluasi sistem record operator. Karena itu, action records baru boleh selesai setelah record dapat ditelusuri dan diverifikasi, bukan setelah file sekadar diunggah. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=Clm7Ce3Gu7gH5OQLbudL1f4fVE0pE5xKR8Rl6Vkdfhgr4UoonTdDbjF8mz6RhNJA7Z8QfpGi6JLP648gwAKLkGXJ4ua5fcbmpho8n1hIR8fZO59iue5Stgt6IIAu13zGJFi96SqEYfcYHJ5LDENrR8FSkMBFJl6dXSBOfJLhvQcPp15nKMIKZbnwcnN4dGz0HGzw2z5LmweYWCXt79IeouOkCZok&utm_source=chatgpt.com 'PERATURAN DIREKTUR JENDERAL PERHUBUNGAN UDARA ...'))

---

# 10. Evidence requirement

Evidence harus ditentukan oleh rule.

```typescript
interface EvidenceRequirement {
  code: string;
  label: string;

  type:
    | 'SYSTEM_STATE'
    | 'STRUCTURED_RECORD'
    | 'DOCUMENT'
    | 'CERTIFICATE'
    | 'PHOTO'
    | 'MEASUREMENT'
    | 'SIGNATURE'
    | 'ACKNOWLEDGMENT'
    | 'EXTERNAL_REFERENCE';

  required: boolean;
  verificationMethod: 'AUTOMATIC' | 'AUTHORIZED_REVIEW' | 'DUAL_VERIFICATION';

  acceptedSourceTypes: string[];
}
```

## Klasifikasi evidence

### System-generated evidence

- Job Card state.

- Calibration status.

- Authorization match.

- Reservation record.

- MEL expiry calculation.

- Configuration reconciliation.

### Human-generated structured evidence

- Measurement.

- Inspection result.

- Finding disposition.

- Handover acceptance.

- Reason for amendment.

### Controlled document evidence

- Release certificate.

- Calibration certificate.

- Engineering approval.

- Technical-data revision.

- Provider maintenance release.

### Signature evidence

- performer;

- inspector;

- independent inspector;

- records acceptance;

- certifying staff.

Attachment tanpa konteks tidak cukup. Setiap attachment harus dikaitkan dengan:

```text
Action
Evidence requirement
Uploader
Timestamp
Document type
Revision
Integrity/hash
Verification status
```

---

# 11. Source rule

Setiap action harus menunjukkan alasan sistem membuatnya.

Tampilan user:

```text
Source rule
MAT-ELIG-004 — Mandatory material must be reserved and eligible
Rule version 1.3
```

Detail audit:

```text
Requirement ID: MAT-001
Rule ID: MAT-ELIG-004
Rule version: 1.3
Source manual: Material Control Procedure
Manual revision: Rev 07
Source clause: 5.4.2
Evaluation ID: RDY-20260829-017
```

Jika source rule berubah, action lama tidak langsung dihapus.

Gunakan:

```text
SUPERSEDED
```

dan buat action baru berdasarkan rule version baru.

---

# 12. UI Next Required Actions

## Panel ringkas

```text
NEXT REQUIRED ACTIONS

P1 · MEL/CDL
MEL-24-03 expired
Aircraft grounding · Release blocker
Owner: Maintenance Control
Action by: Overdue 32 min
[Open Defect Control]

P2 · Work Execution
6 mandatory Job Cards incomplete
Release blocker
Owner: Production Supervisor
Required by: 18:00 WIT
[Open Execution]

P2 · Material
Hydraulic filter P/N 7010-15 unavailable
JC-031 blocked
Owner: Stores Supervisor
Required by: 16:00 WIT
[Reserve Eligible Part]

[View All Actions]
```

## Data yang selalu terlihat

Setiap card/row wajib menampilkan:

```text
Priority
Problem
Impact
Owner
Required action
Due/action-by
Current status
```

Source rule dan evidence dapat tampil setelah row dibuka.

---

# 13. Detail drawer

Klik satu action membuka drawer:

```text
HYDRAULIC FILTER UNAVAILABLE
P2 · RELEASE BLOCKER

Problem
JC-031 requires hydraulic filter P/N 7010-15.
No eligible stock is currently reserved.

Operational impact
JC-031 cannot continue.
Work Package cannot pass Execution.
Technical release remains blocked.

Owner
Stores Supervisor
Assigned to: Daniel Tebai

Required action
Reserve one serviceable and eligible
hydraulic filter P/N 7010-15.

Timing
Required by: 29 Aug 2026 · 16:00 WIT
Basis: JC-031 planned installation start

Source rule
MAT-ELIG-004 · Version 1.3
Requirement: MAT-001

Evidence required
○ Confirmed reservation
○ Serviceable condition
○ Acceptable release certificate
○ Aircraft applicability passed
○ Shelf life valid

Dependencies
JC-031 — Hydraulic system servicing

[Reserve Eligible Part]
[Reassign Owner]
[Open Material Workspace]
```

---

# 14. Drawer atau subpage?

## Drawer digunakan untuk

- memahami issue;

- assign/reassign owner;

- acknowledge;

- reserve satu part;

- assign satu personel;

- assign replacement tool;

- melihat source rule;

- melihat evidence checklist.

## Dedicated subpage digunakan untuk

- melaksanakan Job Card;

- melakukan defect assessment;

- MEL/CDL processing;

- engineering review;

- inspection;

- records reconciliation;

- material planning multi-item;

- tool out-of-tolerance investigation.

Drawer adalah tempat triage dan quick action, bukan tempat menyelesaikan technical workflow panjang.

---

# 15. Global action queue dan personal queue

Sediakan dua tampilan berbeda.

## A. Work Package Action Queue

Menampilkan semua action pada Work Package:

```text
All actions
Blocking only
Warnings
Unassigned
Waiting dependency
Overdue
Resolved
```

## B. My Required Actions

Menampilkan action yang:

- assigned kepada user;

- assigned kepada role user;

- membutuhkan verification user;

- membutuhkan acknowledgment user.

Tampilan personal tidak boleh menyembunyikan global blocker dari header.

---

# 16. Escalation

Escalation tidak mengubah technical requirement.

## Trigger escalation

```text
P1 belum acknowledged sesuai response policy
P2 mendekati action-by time
Owner belum assigned
Dependency melewati expected update
Action overdue
Owner authorization menjadi invalid
```

## Escalation result

```text
Notify escalation role
Add escalation indicator
Request reassignment
Create management attention event
```

Escalation tidak boleh:

- menandai action resolved;

- mengubah blocker menjadi warning;

- memperpanjang MEL;

- mengizinkan technical release.

---

# 17. Deduplication dan dependency

Satu issue dapat memengaruhi banyak objek.

```text
Material blocker MAT-0018
├── Blocks JC-031
├── Blocks Execution exit criterion
└── Blocks Technical Release
```

Jangan membuat tiga action identik.

Buat satu action:

```text
Reserve eligible hydraulic filter
```

dengan `affectedEntities`:

```text
JC-031
Workflow stage Execution
Release Gate
```

Setelah action resolved, semua dependency dihitung ulang.

Sebaliknya, satu blocker dapat memerlukan lebih dari satu action:

```text
MEL item incomplete
├── Complete M-procedure
├── Complete O-procedure
└── Install placard
```

Parent blocker hanya resolved setelah seluruh child action selesai.

---

# 18. API command model

## Mendapatkan action

```http
GET /maintenance/work-packages/{id}/required-actions
```

Filter:

```text
status
priority
category
owner
blockingOnly
assignedToMe
overdue
```

## Assign

```http
POST /maintenance/required-actions/{id}/transitions/assign
```

```json
{
  "assignedUserId": "usr_daniel",
  "expectedVersion": 4,
  "idempotencyKey": "e5b135bb-18d1-49ab-97e2-88177dd115cb"
}
```

## Start

```http
POST /maintenance/required-actions/{id}/transitions/start
```

## Waiting dependency

```http
POST /maintenance/required-actions/{id}/transitions/wait-dependency
```

```json
{
  "dependencyType": "MATERIAL_TRANSFER",
  "dependencyReference": "TRF-2026-0091",
  "expectedUpdateAt": "2026-08-29T15:30:00+09:00",
  "reason": "Replacement part is being transferred from Jayapura",
  "expectedVersion": 6
}
```

## Submit evidence

```http
POST /maintenance/required-actions/{id}/transitions/submit-evidence
```

## Verify

```http
POST /maintenance/required-actions/{id}/transitions/verify
```

Backend harus menjalankan resolution criteria kembali. Tidak tersedia endpoint:

```http
PATCH /required-actions/{id}
{ "status": "RESOLVED" }
```

---

# 19. Audit events

```text
REQUIRED_ACTION_CREATED
REQUIRED_ACTION_ASSIGNED
REQUIRED_ACTION_REASSIGNED
REQUIRED_ACTION_ACKNOWLEDGED
REQUIRED_ACTION_STARTED
REQUIRED_ACTION_WAITING_DEPENDENCY
REQUIRED_ACTION_DEPENDENCY_RESOLVED
REQUIRED_ACTION_EVIDENCE_ADDED
REQUIRED_ACTION_SUBMITTED_FOR_VERIFICATION
REQUIRED_ACTION_VERIFICATION_FAILED
REQUIRED_ACTION_RESOLVED
REQUIRED_ACTION_REOPENED
REQUIRED_ACTION_ESCALATED
REQUIRED_ACTION_SUPERSEDED
```

Setiap event menyimpan:

```text
Aircraft ID
Work Package ID
Action ID
Issue ID
From/to state
Actor
Acting role
Authorization snapshot
Reason
Evidence references
Rule ID/version
Work Package revision
Occurred at
Recorded at
Device
Sync state
```

---

# 20. Regulatory Traceability Matrix

| ID          | Requirement                                    | Business rule                                             | UI/system control          | Evidence                | Authorized role        | Jika gagal                     |
| ----------- | ---------------------------------------------- | --------------------------------------------------------- | -------------------------- | ----------------------- | ---------------------- | ------------------------------ |
| **ACT-001** | Blocker harus menghasilkan tindakan yang jelas | Issue aktif harus mempunyai required action               | Next Required Actions      | Action record           | System/process owner   | Readiness result invalid       |
| **ACT-002** | Action harus mempunyai operational impact      | Impact level dan affected entity wajib tersedia           | Impact label               | Issue dependency        | System                 | Action tidak dipublikasikan    |
| **ACT-003** | Action harus mempunyai owner                   | Accountable role wajib; person dapat unassigned sementara | Owner indicator            | Assignment history      | Supervisor             | Escalation dibuat              |
| **ACT-004** | Due time harus mempunyai basis                 | Due/action-by tidak boleh berupa free text                | Due detail                 | Due source snapshot     | System/process owner   | Due ditampilkan unknown        |
| **ACT-005** | Action harus mempunyai source rule             | Rule ID dan version wajib tersimpan                       | Source-rule detail         | Evaluation record       | System/Quality         | Action tidak auditable         |
| **ACT-006** | Penyelesaian membutuhkan evidence              | Status tidak dapat langsung diubah menjadi resolved       | Evidence checklist         | Evidence records        | Assigned/verifier role | Verification ditolak           |
| **ACT-007** | Resolution harus dievaluasi ulang              | Source rule harus passed setelah action                   | Verification transition    | New evaluation snapshot | System/verifier        | Action kembali in progress     |
| **ACT-008** | Satu issue tidak boleh diduplikasi             | Unique issue ID digunakan lintas dependency               | Aggregated action          | Dependency graph        | System                 | Duplicate digabungkan          |
| **ACT-009** | Action kritis tidak boleh ditutup manual       | Hanya transition dengan guard yang diizinkan              | Controlled action commands | Audit events            | Authorized role        | Direct update ditolak          |
| **ACT-010** | Escalation tidak mengubah requirement          | Escalation hanya mengubah attention/ownership             | Escalation badge           | Escalation record       | Supervisor             | Blocker tetap aktif            |
| **ACT-011** | Action offline harus menunjukkan sync state    | Local completion belum dianggap verified                  | Pending-sync indicator     | Device/sync events      | System                 | Critical action belum resolved |
| **ACT-012** | Signed/verified action tidak dapat ditimpa     | Perubahan baru menghasilkan reopen/supersede event        | Read-only resolved state   | Full event history      | Authorized verifier    | Direct edit ditolak            |

---

# 21. UAT wajib

| Skenario                                         | Expected result                                                 |
| ------------------------------------------------ | --------------------------------------------------------------- |
| Blocker dibuat tanpa owner role                  | Evaluasi ditandai invalid atau owner role otomatis dari rule    |
| Action mempunyai label due tetapi tanpa basis    | Sistem menolak due atau menampilkan `Due not established`       |
| User menekan acknowledge                         | Action menjadi acknowledged, blocker tetap aktif                |
| Part di-reserve tetapi certificate invalid       | Action tidak dapat resolved                                     |
| Part eligible dan reservation confirmed          | Evidence passed dan action dapat diverifikasi                   |
| Tool diganti tetapi range tidak sesuai           | Verification gagal                                              |
| Technician assigned tetapi authorization expired | Personnel action tetap open                                     |
| Inspection dilakukan user yang tidak independen  | Inspection action tidak resolved                                |
| Record file diunggah tanpa klasifikasi           | Technical Records action tetap incomplete                       |
| Source blocker berubah karena workscope revision | Action lama menjadi superseded dan action baru dibuat           |
| Satu shortage memblokir tiga Job Card            | Satu primary action dengan tiga affected entities               |
| Satu MEL memerlukan M/O procedure dan placard    | Parent issue resolved setelah semua child action selesai        |
| Action overdue                                   | Escalation dibuat; blocker tetap aktif                          |
| Action diselesaikan offline                      | Status pending sync, belum verified untuk release               |
| Evidence diubah setelah verification             | Action/release review menjadi stale dan reevaluation dijalankan |
| Rule evaluator gagal                             | Action tidak dianggap resolved; release tetap blocked           |
| User mencoba `PATCH status=RESOLVED`             | Backend menolak                                                 |
| Blocker resolved                                 | Readiness snapshot baru dibuat dan release gate dihitung ulang  |

---

# Keputusan final

Komponen Next Required Actions harus menggunakan struktur:

```text
Problem
→ Operational impact
→ Priority
→ Accountable owner
→ Assigned person
→ Required action
→ Due and due basis
→ Source rule
→ Evidence requirements
→ Resolution criteria
→ Verification
→ Readiness reevaluation
```

Tampilan final satu action:

```text
P2 · MATERIAL & COMPONENTS

Hydraulic filter unavailable

Impact
JC-031 blocked
Technical release blocked

Owner
Stores Supervisor · Daniel Tebai

Required action
Reserve one serviceable and eligible
hydraulic filter P/N 7010-15.

Required by
29 Aug 2026 · 16:00 WIT
Basis: JC-031 planned installation start

Evidence
0/5 requirements satisfied

[Reserve Eligible Part]
```

Dengan model ini, panel tidak hanya mengatakan bahwa ada masalah. Sistem menjelaskan:

- apa yang salah;

- apa dampaknya;

- siapa yang bertanggung jawab;

- apa tindakan yang sah;

- kapan harus dilakukan;

- aturan apa yang melandasinya;

- bukti apa yang dibutuhkan;

- dan kapan blocker benar-benar boleh dianggap selesai.
