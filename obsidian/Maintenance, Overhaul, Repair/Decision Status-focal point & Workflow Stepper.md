# Decision Status dan Workflow Stepper MRO — Spesifikasi Implementasi

Saya menetapkan dua keputusan desain penting:

1. **Decision Status harus menjadi hasil perhitungan sistem**, bukan status yang dipilih manual oleh user.

2. Workflow sebaiknya memakai **enam tahap**, bukan lima, karena `Technical Records Review` merupakan gate tersendiri sebelum technical release.

Struktur final:

```text
Planning
→ Readiness
→ Execution
→ Inspection
→ Records Review
→ Technical Release
```

Menggabungkan `Records Review` ke dalam Inspection atau Technical Release akan menyembunyikan proses penting: pemeriksaan kelengkapan maintenance records, configuration update, utilization, component transaction, signature, dan supporting evidence. SI 8900-3.329 yang berstatus berlaku secara khusus mengatur evaluasi maintenance-record system, sedangkan SI 8900-6.9 mengatur surveillance terhadap AMO termasuk maintenance records dan release. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/detail?data=G6tr5IupMQbCEByNtzqMvL8LKVGCUvJBf8cOuFKc0E9m4Tsac2C3Uv34OeyrhkIhlZ8bP2eag1BWk4OVyIi7W9RP4vW6Q5S4yqm8lwdQeSzOsQKrUakqfYbhQJpgQ5plD6lgC8k2BKzrHsLCHPdtIL2NOb&utm_source=chatgpt.com 'Peraturan Direktur Jenderal Perhubungan Udara Nomor'))

SI 8900-3.327 juga tetap menjadi dasar evaluasi maintenance program operator, sedangkan EASA menerbitkan AMC/GM Part-145 Issue 2 Amendment 9 pada 6 Juli 2026 sebagai benchmark internasional terbaru untuk maintenance-organisation controls. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/detail?data=3rgypheYlQG8lzwa1Ai4X64ktLvqsZlva8LWM9r8ZY6r8bIbKTY9WoI8m3KzVmKAor4JLDsuQcJVb4EuPGVsgMkw8hht8g2FM828X2YnqLaR8O7JCeP6fLGHE1iVAx3Z6ZFJ8aan5Vth6to0hf0a1I3XS0&utm_source=chatgpt.com 'Peraturan Direktur Jenderal Perhubungan Udara Nomor'))

---

# 1. Posisi komponen pada halaman

Susunan halaman Work Package:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Persistent Aircraft & Work Package Context                         │
├────────────────────────────────────────────────────────────────────┤
│ DECISION STATUS                                                    │
│ ⛔ RELEASE BLOCKED                                                  │
│ 8 blockers · 3 warnings · 12 checks passed                         │
│ Aircraft cannot be released                                       │
│ Next action: Complete 6 mandatory Job Cards                        │
│                                                                    │
│ [Review Blockers]                    [Run Readiness Check]          │
├────────────────────────────────────────────────────────────────────┤
│ WORKFLOW                                                           │
│ Planning → Readiness → Execution → Inspection → Records → Release  │
├────────────────────────────────────────────────────────────────────┤
│ Stage summary / blocker breakdown / work content                   │
└────────────────────────────────────────────────────────────────────┘
```

Decision Status harus berada:

- langsung di bawah persistent context header;

- selalu di atas workflow content;

- tetap terlihat saat user berpindah subpage;

- tidak hilang ketika drawer atau side panel dibuka;

- tetap ringkas pada tablet.

---

# 2. Decision Status tidak sama dengan progress

Decision Status menjawab:

> Apakah Work Package ini sudah memenuhi syarat untuk technical release?

Progress menjawab:

> Berapa banyak pekerjaan administratif atau teknis yang telah selesai?

Keduanya harus dipisahkan.

```text
Progress: 99%
Release Status: BLOCKED
Reason: Mandatory independent inspection incomplete
```

Persentase tidak boleh menentukan release eligibility.

Formula yang dilarang:

```text
IF progress >= 100%
THEN release_eligible = true
```

Formula yang benar:

```text
release_eligible =
    mandatory_work_complete
AND required_inspections_accepted
AND findings_dispositioned
AND mel_cdl_conditions_valid
AND material_traceability_complete
AND aircraft_configuration_reconciled
AND technical_records_accepted
AND certifying_staff_authorized
AND critical_sync_conflicts = 0
```

Satu hard blocker membuat hasil akhir tetap `BLOCKED`, berapa pun jumlah check yang sudah passed.

---

# 3. State Decision Status

Gunakan enum berikut:

```typescript
type ReleaseDecisionStatus =
  | 'NOT_EVALUATED'
  | 'EVALUATING'
  | 'BLOCKED'
  | 'REVIEW_REQUIRED'
  | 'ELIGIBLE'
  | 'RELEASED'
  | 'EVALUATION_FAILED';
```

## Arti setiap status

| Status              | Arti                                                                                   | Action utama              |
| ------------------- | -------------------------------------------------------------------------------------- | ------------------------- |
| `NOT_EVALUATED`     | Readiness belum pernah dihitung untuk revision aktif                                   | Run Readiness Check       |
| `EVALUATING`        | Sistem sedang mengevaluasi gate                                                        | Tunggu hasil              |
| `BLOCKED`           | Minimal satu hard blocker aktif                                                        | Review Blockers           |
| `REVIEW_REQUIRED`   | Tidak ada hard blocker, tetapi ada warning atau keputusan manusia yang wajib dilakukan | Review Warnings           |
| `ELIGIBLE`          | Seluruh gate sistem passed; siap direview Certifying Staff                             | Open Release Review       |
| `RELEASED`          | Technical release telah ditandatangani                                                 | View Release Record       |
| `EVALUATION_FAILED` | Rule engine tidak dapat menghasilkan hasil yang dapat dipercaya                        | Resolve System/Data Issue |

## Prioritas hasil

```text
Evaluation failure
    ↓
Hard blocker
    ↓
Mandatory human review
    ↓
Eligible
    ↓
Released
```

Logika:

```typescript
function determineReleaseStatus(input: ReleaseEvaluation): ReleaseDecisionStatus {
  if (input.releaseSigned) return 'RELEASED';
  if (input.evaluationFailed) return 'EVALUATION_FAILED';
  if (input.hardBlockers.length > 0) return 'BLOCKED';
  if (input.reviewItems.length > 0) return 'REVIEW_REQUIRED';
  if (input.allRequiredGatesPassed) return 'ELIGIBLE';
  return 'NOT_EVALUATED';
}
```

---

# 4. Release Blocker taxonomy

Setiap blocker harus mempunyai kategori yang jelas.

```typescript
type ReleaseBlockerCategory =
  | 'TECHNICAL_DATA'
  | 'WORK_EXECUTION'
  | 'FINDING'
  | 'INSPECTION'
  | 'MEL_CDL'
  | 'MATERIAL'
  | 'TOOL_CALIBRATION'
  | 'PERSONNEL_AUTHORIZATION'
  | 'AIRCRAFT_CONFIGURATION'
  | 'TECHNICAL_RECORDS'
  | 'SYNC_INTEGRITY'
  | 'AMO_CAPABILITY';
```

## Struktur satu blocker

```typescript
interface ReleaseBlocker {
  id: string;
  code: string;
  category: ReleaseBlockerCategory;

  severity: 'CRITICAL' | 'BLOCKER' | 'WARNING';
  title: string;
  description: string;

  sourceEntityType: string;
  sourceEntityId: string;
  sourceRuleId: string;
  ruleVersion: string;

  ownerRole: string;
  ownerUserId?: string;

  requiredAction: string;
  actionRoute?: string;

  detectedAt: string;
  dueAt?: string;

  evidenceRequired: string[];
  resolutionStatus: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'SUPERSEDED';
}
```

Contoh hasil sistem:

```text
CRITICAL · MEL/CDL

MEL item MEL-24-03 has expired
Aircraft release is prohibited until the defect is rectified
or another approved disposition is issued.

Owner: Maintenance Control
Required action: Rectify defect
Detected: 29 Aug 2026 14:32 WIT
```

---

# 5. Aggregasi blocker

Jangan menampilkan enam alert yang sama.

## Buruk

```text
Job Card incomplete
Job Card incomplete
Job Card incomplete
Job Card incomplete
Job Card incomplete
Job Card incomplete
```

## Benar

```text
6 MANDATORY JOB CARDS INCOMPLETE

3 awaiting technician completion
2 awaiting inspection
1 blocked by material

Owner: Production Supervisor
[Review Job Cards]
```

Agregasi hanya pada tampilan. Setiap blocker individual tetap tersimpan sebagai record tersendiri agar dapat diaudit dan ditindaklanjuti.

---

# 6. Penentuan “Next Action”

`Next Action` tidak boleh diisi secara manual dalam banner.

Sistem menentukan tindakan berikutnya berdasarkan:

1. severity;

2. dependency;

3. mandatory status;

4. operational impact;

5. due/expiry;

6. apakah tindakan tersebut benar-benar dapat dilakukan sekarang.

## Urutan prioritas

```text
P1 — Immediate safety/regulatory blocker
P2 — Expired or imminent mandatory limitation
P3 — Blocker yang menghentikan seluruh execution
P4 — Mandatory inspection atau Job Card incomplete
P5 — Technical-record deficiency
P6 — Warning dan optimization item
```

## Algorithm

```typescript
function selectNextAction(blockers: ReleaseBlocker[]): ReleaseBlocker | null {
  return (
    blockers
      .filter((item) => item.resolutionStatus !== 'RESOLVED')
      .filter((item) => actionIsCurrentlyAvailable(item))
      .sort(compareSeverity)
      .sort(compareDependency)
      .sort(compareDueDate)[0] ?? null
  );
}
```

Jika enam Job Card memiliki tindakan dan owner yang sama, banner menampilkan agregasi:

```text
Next action:
Complete 6 mandatory Job Cards

Owner:
Production Supervisor
```

Jika ada MEL expired, MEL harus menjadi next action walaupun jumlah Job Card yang belum selesai lebih banyak.

---

# 7. Tampilan Decision Status

## A. Blocked

```text
⛔ RELEASE BLOCKED

8 blockers · 3 warnings · 12 checks passed

Aircraft cannot be released.

Highest-priority blocker:
MEL-24-03 has expired.

Next action:
Rectify the defect or issue an approved disposition.

Owner:
Maintenance Control

[Review 8 Blockers]       [Run Readiness Check]
```

## B. Review required

```text
⚠ RELEASE REVIEW REQUIRED

0 blockers · 3 warnings · 18 checks passed

No hard blocker detected.
Three operational limitations require review and acknowledgment.

[Review Warnings]         [Open Release Review]
```

## C. Eligible

```text
✓ ELIGIBLE FOR TECHNICAL RELEASE

0 blockers · 0 unresolved warnings · 21 checks passed

All system release gates have passed.
Final decision must be completed by authorized Certifying Staff.

[Open Release Review]
```

## D. Released

```text
✓ TECHNICAL RELEASE ISSUED

Released by: Authorized Certifying Staff
Released at: 31 Aug 2026 18:42 WIT
Release record: RTS-2026-0081

Aircraft technical status:
IN SERVICE

[View Release Record]
```

## E. Evaluation failure

```text
⛔ RELEASE STATUS UNAVAILABLE

The system could not verify current authorization and MEL/CDL data.

Technical release is blocked until the evaluation can be completed.

[Review Data Issues]      [Retry Evaluation]
```

Jangan fallback menjadi `Eligible` ketika rule engine atau integration gagal.

---

# 8. “Checks passed” yang benar

`12 checks passed` hanya boleh berasal dari daftar gate yang terdefinisi dan versioned.

Contoh gate:

```text
Technical data current
Aircraft applicability confirmed
Mandatory Job Cards complete
Findings dispositioned
Inspection complete
Material traceability complete
Tool calibration valid
Personnel authorization valid
Configuration reconciled
MEL/CDL conditions valid
Technical records accepted
Critical sync conflicts clear
```

Setiap gate menyimpan:

```text
Gate ID
Rule version
Evaluation result
Input data version
Evaluated at
Evidence references
Failure reason
```

`Checks passed` tidak boleh berasal dari jumlah checkbox UI biasa.

---

# 9. Workflow stepper final

## Tahapan final

```text
1. Planning
2. Readiness
3. Execution
4. Inspection
5. Records Review
6. Technical Release
```

Pada tablet, visual dapat disederhanakan:

```text
Planning → Readiness → Execution → Close-out → Release
```

Namun `Close-out` hanya presentation grouping untuk:

```text
Inspection + Records Review
```

Backend tetap mempertahankan dua tahap terpisah.

---

# 10. State untuk setiap workflow stage

Gunakan status stage yang sama:

```typescript
type WorkflowStageStatus =
  | 'NOT_STARTED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'RETURNED'
  | 'COMPLETED'
  | 'NOT_REQUIRED';
```

`NOT_REQUIRED` hanya boleh digunakan jika terdapat approved rule yang menyatakan tahap tertentu tidak diperlukan. User tidak dapat memilihnya secara bebas.

## Tampilan status

| Status         | Visual                 | Arti                                  |
| -------------- | ---------------------- | ------------------------------------- |
| `NOT_STARTED`  | Lingkaran abu-abu      | Entry criteria belum terpenuhi        |
| `AVAILABLE`    | Lingkaran biru outline | Dapat dimulai                         |
| `IN_PROGRESS`  | Lingkaran biru aktif   | Tahap sedang dilakukan                |
| `BLOCKED`      | Ikon stop merah        | Ada hard blocker                      |
| `RETURNED`     | Panah kembali oranye   | Dikembalikan untuk koreksi            |
| `COMPLETED`    | Check hijau            | Exit criteria terpenuhi               |
| `NOT_REQUIRED` | Minus abu-abu          | Tidak diwajibkan oleh rule applicable |

---

# 11. Stage 1 — Planning

## Tujuan

Membentuk workscope yang benar berdasarkan maintenance demand, approved data, aircraft configuration, dan due requirement.

## Primary owner

```text
Maintenance Planner
```

## Supporting roles

- Engineering.

- Maintenance Control.

- Technical Records.

- Material Planning.

## Entry criteria

```text
Aircraft identified
Aircraft configuration baseline available
Maintenance demands available
Current utilization available
Applicable maintenance program identified
```

## Aktivitas

- Memilih maintenance demand.

- Menentukan preliminary workscope.

- Menentukan maintenance window.

- Menentukan station dan provider.

- Meminta technical validation.

- Menentukan preliminary labor, material, tool, dan inspection demand.

## Exit criteria

```text
All tasks technically validated
Applicable source and revision assigned
Workscope approved
Maintenance window assigned
AMO/location capability verified
Workscope committed
```

## Blocker

- Approved source missing.

- Applicability unresolved.

- Aircraft configuration unverified.

- FH/FC conflict.

- Mandatory due task omitted.

- AMO capability tidak sesuai.

## Stage output

```text
Committed Workscope Revision
```

## Timestamp yang ditampilkan

```text
Completed 29 Aug 2026 09:12 WIT
```

## Owner display

```text
Owner: Maintenance Planner
Completed by: R. Wonda
```

---

# 12. Stage 2 — Readiness

## Tujuan

Memastikan pekerjaan benar-benar dapat dimulai di lokasi dan waktu yang ditetapkan.

## Primary owner

```text
Maintenance Planner / Production Supervisor
```

Maintenance Control mengendalikan induction dan operational coordination, tetapi tidak menggantikan technical/resource validation.

## Entry criteria

```text
Workscope committed
Exact technical-data revisions frozen
Station and maintenance window confirmed
```

## Readiness domains

```text
Personnel
Material
Tools/GSE
Facilities
Technical Data
Aircraft Induction
```

## Exit criteria

```text
Minimum required personnel available and authorized
Mandatory material available and eligible
Required tools available and valid
Facility/location capability valid
Controlled technical data available
Aircraft induction completed
No pre-execution hard blocker
```

## Blocker

- Part shortage.

- Part traceability incomplete.

- Tool calibration expired.

- Authorized technician unavailable.

- Required inspector unavailable.

- Technical data package unavailable offline.

- Aircraft belum diserahkan ke maintenance.

- Station capability invalid.

## Stage output

```text
Pre-Execution Readiness Record
```

## UI

```text
READINESS · BLOCKED

Owner: Maintenance Planner
Last updated: 29 Aug 2026 12:04 WIT

2 blockers:
• Hydraulic filter unavailable
• Torque wrench calibration expired

Exit criteria: 9/11 passed

[Review Readiness]
```

---

# 13. Stage 3 — Execution

## Tujuan

Melaksanakan seluruh Job Card dan non-routine task sesuai approved data dan authorization.

## Primary owner

```text
Production Supervisor
```

## Executing roles

- Technician/mechanic.

- Assigned specialist.

- Engineering support bila dibutuhkan.

## Entry criteria

```text
Readiness completed
Aircraft inducted
Work Package started
At least one Job Card released to execution
```

## Aktivitas

- Start Job Card.

- Step execution.

- Measurement.

- Material issue/install/remove.

- Tool usage.

- Pause/resume.

- Shift handover.

- Raise finding.

- Request technical support.

- Technician sign-off.

FAA Human Factors Guide menekankan pentingnya shift-turnover meeting, walkthrough, checklist, dan status marker untuk pekerjaan yang sedang berjalan; karena itu handover dan lokasi terakhir pekerjaan harus menjadi bagian formal dari execution, bukan hanya komentar bebas. ([Federal Aviation Administration](https://www.faa.gov/sites/faa.gov/files/about/initiatives/maintenance_hf/training_tools/HF_Guide.pdf?utm_source=chatgpt.com 'Human Factors Guide for Aviation Maintenance and ...'))

## Exit criteria

```text
All mandatory Job Cards technically completed
All execution signatures present
All findings assessed
All non-routine work completed or validly dispositioned
No Job Card in rework-required state
All issued tools and parts accounted for
```

## Blocker

- Mandatory Job Card incomplete.

- Finding tanpa disposition.

- Technical-data ambiguity.

- Job Card paused tanpa handover.

- Material/tool unavailable.

- Measurement outside limit.

- Rework incomplete.

- Missing technician sign-off.

## Stage output

```text
Execution Completion Package
```

---

# 14. Stage 4 — Inspection

## Tujuan

Melakukan seluruh required inspection, independent inspection, reinspection, dan final inspection.

## Primary owner

```text
Inspector
```

## Entry criteria

```text
Inspection-requested Job Cards tersedia
Required execution steps completed
Inspection evidence tersedia
Inspector assignment valid
```

## Exit criteria

```text
All mandatory inspections accepted
Independent-inspection requirements fulfilled
No rejected item awaiting rework
No stale inspection after task modification
Final inspection accepted if required
```

## Blocker

- Inspector tidak authorized.

- Performer sama dengan independent inspector.

- Required evidence missing.

- Inspection rejected.

- Rework belum selesai.

- Inspected task berubah setelah sign-off.

- Inspection menggunakan revision berbeda dari execution.

## Stage output

```text
Accepted Inspection Package
```

## Returned path

```text
Inspection rejected
→ Job Card REWORK_REQUIRED
→ Workflow Execution RETURNED
→ Rework
→ Reinspection
```

Stepper harus menunjukkan:

```text
Execution: RETURNED
Inspection: BLOCKED
```

Bukan sekadar mengurangi persentase.

---

# 15. Stage 5 — Records Review

## Tujuan

Memastikan maintenance-record package lengkap, konsisten, retrievable, dan sesuai dengan pekerjaan yang dilakukan.

## Primary owner

```text
Technical Records
```

## Entry criteria

```text
Execution complete
Required inspections accepted
Work Package submitted for record review
```

## Pemeriksaan

- Work description/reference.

- Completion date.

- Performer identity.

- Inspector identity.

- Release/sign-off identity.

- Job Card revision.

- Technical-data revision.

- Component install/remove.

- Material certificate.

- Tool usage.

- Aircraft configuration.

- FH/FC.

- AD/SB/LLP status.

- MEL/CDL status.

- Attachments.

- Amendment.

- Sync conflict.

SI 8900-3.329 tercatat berlaku di JDIH sebagai petunjuk evaluasi maintenance-record system. Karena itu, records review harus menjadi proses eksplisit, bukan hanya attachment tab di halaman release. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/index?page=219&per-page=12&style=row&utm_source=chatgpt.com 'Peraturan - JDIH Kemenhub - Kementerian Perhubungan'))

## Exit criteria

```text
All Job Card records accepted
Required signatures present
Configuration reconciled
Utilization reconciled
Supporting certificates available
No unresolved amendment
No critical sync conflict
Record package accepted
```

## Blocker

- Missing signature.

- Missing work reference.

- Component transaction incomplete.

- Configuration conflict.

- Missing material certificate.

- Attachment integrity failure.

- FH/FC conflict.

- Signed record correction pending.

- Offline record belum tervalidasi.

## Stage output

```text
Accepted Technical Record Package
```

## Returned path

```text
Record issue only
→ Records Review remains IN_PROGRESS/CORRECTION_REQUIRED

Physical correction required
→ Return to Execution
```

---

# 16. Stage 6 — Technical Release

## Tujuan

Memberikan keputusan return to service oleh personel yang mempunyai authority sesuai scope.

## Primary owner

```text
Certifying Staff
```

## Entry criteria

```text
Technical Records accepted
Release gate evaluated
No hard blocker
Certifying Staff authorization valid
Controlled release statement available
```

## Aktivitas

- Review work performed.

- Review open defects.

- Review MEL/CDL.

- Review operational limitations.

- Review inspection result.

- Review technical records.

- Review configuration impact.

- Verify authorization.

- Sign technical release.

## Exit criteria

```text
Controlled release statement signed
Release record immutable
Release distributed to operator/owner
Aircraft technical status recalculated
```

## Blocker

- Any release gate failed.

- MEL expired.

- Open no-go defect.

- Records incomplete.

- Signer authorization invalid.

- Work Package revision changed after review.

- Critical synchronization conflict.

- Release statement unavailable.

- Other active aircraft-level grounding source.

## Stage output

```text
Technical Release Record
```

Work Package `RELEASED` tidak selalu berarti aircraft `IN_SERVICE`. Sistem masih harus mengevaluasi defect, MEL/CDL, aircraft holds, dan Work Package lain yang aktif.

---

# 17. Stage data structure

```typescript
interface WorkflowStage {
  code:
    'PLANNING' | 'READINESS' | 'EXECUTION' | 'INSPECTION' | 'RECORDS_REVIEW' | 'TECHNICAL_RELEASE';

  status: WorkflowStageStatus;

  ownerRole: string;
  ownerUser?: {
    id: string;
    name: string;
  };

  enteredAt?: string;
  lastUpdatedAt?: string;
  completedAt?: string;

  entryCriteria: StageCriterion[];
  exitCriteria: StageCriterion[];

  blockerCount: number;
  warningCount: number;

  blockers: Array<{
    id: string;
    title: string;
    ownerRole: string;
    requiredAction: string;
  }>;

  completion?: {
    passedCriteria: number;
    totalCriteria: number;
  };

  returnedFromStage?: string;
  returnReason?: string;
}
```

Criterion:

```typescript
interface StageCriterion {
  id: string;
  title: string;
  result: 'NOT_EVALUATED' | 'PASSED' | 'FAILED' | 'WARNING' | 'NOT_REQUIRED';

  sourceRuleId: string;
  evaluatedAt?: string;
  evidenceReferences: string[];
  failureReason?: string;
}
```

---

# 18. API response

```http
GET /maintenance/work-packages/{id}/decision-context
```

```json
{
  "releaseDecision": {
    "status": "BLOCKED",
    "blockerCount": 8,
    "warningCount": 3,
    "passedCheckCount": 12,
    "evaluatedAt": "2026-08-29T14:32:00+09:00",
    "evaluationVersion": 17,
    "nextAction": {
      "title": "Complete 6 mandatory Job Cards",
      "ownerRole": "PRODUCTION_SUPERVISOR",
      "route": "/work-packages/wp_0018/execution?filter=blocking"
    }
  },
  "workflow": [
    {
      "code": "PLANNING",
      "status": "COMPLETED",
      "ownerRole": "MAINTENANCE_PLANNER",
      "completedAt": "2026-08-29T09:12:00+09:00",
      "blockerCount": 0,
      "completion": {
        "passedCriteria": 8,
        "totalCriteria": 8
      }
    },
    {
      "code": "READINESS",
      "status": "COMPLETED",
      "ownerRole": "MAINTENANCE_PLANNER",
      "completedAt": "2026-08-29T12:04:00+09:00",
      "blockerCount": 0,
      "completion": {
        "passedCriteria": 11,
        "totalCriteria": 11
      }
    },
    {
      "code": "EXECUTION",
      "status": "BLOCKED",
      "ownerRole": "PRODUCTION_SUPERVISOR",
      "lastUpdatedAt": "2026-08-29T14:28:00+09:00",
      "blockerCount": 6,
      "completion": {
        "passedCriteria": 18,
        "totalCriteria": 24
      }
    },
    {
      "code": "INSPECTION",
      "status": "NOT_STARTED",
      "ownerRole": "INSPECTOR",
      "blockerCount": 0
    },
    {
      "code": "RECORDS_REVIEW",
      "status": "NOT_STARTED",
      "ownerRole": "TECHNICAL_RECORDS",
      "blockerCount": 0
    },
    {
      "code": "TECHNICAL_RELEASE",
      "status": "NOT_STARTED",
      "ownerRole": "CERTIFYING_STAFF",
      "blockerCount": 0
    }
  ]
}
```

---

# 19. Transition audit event

Setiap perubahan stage menghasilkan event:

```typescript
interface WorkflowStageTransitionEvent {
  eventId: string;
  workPackageId: string;

  stageCode: string;
  fromStatus: WorkflowStageStatus;
  toStatus: WorkflowStageStatus;

  actorUserId: string;
  actorRole: string;
  authorizationSnapshotId?: string;

  transitionCommand: string;
  reasonCode?: string;
  reasonText?: string;

  entryCriteriaSnapshot: string[];
  exitCriteriaSnapshot: string[];

  blockerSnapshot: string[];
  evidenceReferences: string[];

  occurredAt: string;
  recordedAt: string;

  workPackageVersionBefore: number;
  workPackageVersionAfter: number;
}
```

Event utama:

```text
PLANNING_STARTED
PLANNING_COMPLETED
READINESS_STARTED
READINESS_BLOCKED
READINESS_COMPLETED
EXECUTION_STARTED
EXECUTION_BLOCKED
EXECUTION_RETURNED
EXECUTION_COMPLETED
INSPECTION_STARTED
INSPECTION_REJECTED
INSPECTION_ACCEPTED
RECORDS_REVIEW_STARTED
RECORDS_CORRECTION_REQUIRED
RECORDS_ACCEPTED
RELEASE_REVIEW_STARTED
TECHNICAL_RELEASE_ISSUED
```

---

# 20. UI workflow stepper desktop

```text
① Planning               ② Readiness               ③ Execution
✓ COMPLETED              ✓ COMPLETED               ⛔ BLOCKED
Planner                   Planner                    Production Supervisor
29 Aug · 09:12            29 Aug · 12:04            Updated 14:28
8/8 criteria passed       11/11 criteria passed     6 blockers

        →                         →                         →

④ Inspection             ⑤ Records Review          ⑥ Technical Release
○ NOT STARTED            ○ NOT STARTED             ○ NOT STARTED
Inspector                 Technical Records          Certifying Staff
Waiting for Execution     Waiting for Inspection     Waiting for Records
```

Pada tampilan ringkas horizontal, tampilkan:

- ikon state;

- nama stage;

- status;

- blocker count.

Detail owner, timestamp, dan criteria muncul ketika stage dipilih.

---

# 21. UI stage detail panel

Ketika user menekan `Execution`:

```text
EXECUTION · BLOCKED

Owner
Production Supervisor — Budi Santoso

Last updated
29 Aug 2026 · 14:28 WIT

Entry criteria
✓ Readiness completed
✓ Aircraft inducted
✓ Work Package started

Exit criteria
✓ 18 Job Cards completed
⛔ 6 mandatory Job Cards incomplete
⚠ 2 Job Cards awaiting inspection
✓ All findings dispositioned

Active blockers
1. JC-024 awaiting technician completion
2. JC-031 blocked by material
3. JC-044 awaiting independent inspection

[Open Execution Workspace]
```

---

# 22. Responsive behavior

## Desktop ops room

- Decision Status tampil penuh.

- Stepper horizontal enam tahap.

- Owner dan timestamp tampil langsung.

- Blocker detail terbuka di side panel.

## Tablet landscape

- Decision Status tetap penuh.

- Stepper horizontal dapat scroll-snap per stage.

- Setiap stage target sentuh minimal 44 px.

- Detail owner dan criteria muncul dalam drawer.

## Tablet portrait

Stepper menjadi vertical:

```text
✓ Planning
  Completed · Planner · 09:12

✓ Readiness
  Completed · Planner · 12:04

⛔ Execution
  Blocked · 6 blockers · Updated 14:28

○ Inspection
  Not started

○ Records Review
  Not started

○ Technical Release
  Not started
```

Jangan mengecilkan enam tahap sampai teks tidak dapat dibaca.

---

# 23. Micro-interaction

## Saat blocker baru muncul

- Status berubah tanpa animasi berlebihan.

- Ikon blocker tampil.

- Perubahan diberi highlight singkat.

- Reason ditampilkan.

- Audit event dibuat.

- User melihat `New blocker detected`.

```text
RELEASE STATUS CHANGED

REVIEW REQUIRED → BLOCKED

Reason:
MEL-24-03 expired at 14:30 WIT.
```

## Saat blocker resolved

Jangan langsung mengubah status tanpa trace.

```text
Blocker resolved
Hydraulic filter P/N 7010-15 issued and eligibility verified.

Re-evaluating release gates...
```

## Saat evaluation berjalan

```text
Evaluating 21 release gates...
```

Bukan spinner tanpa informasi.

## Saat action disabled

```text
Open Release Review
Unavailable because:

• Technical Records not accepted
• 2 inspection sign-offs pending
• Authorization data is stale
```

---

# 24. Regulatory Traceability Matrix

| ID          | Requirement                                         | Business rule                                     | UI/system control          | Evidence                                  | Authorized role    | Failure behaviour                       |
| ----------- | --------------------------------------------------- | ------------------------------------------------- | -------------------------- | ----------------------------------------- | ------------------ | --------------------------------------- |
| **DEC-001** | Release decision tidak boleh berasal dari progress  | Hard blocker mengalahkan completion percentage    | Decision Status hero       | Gate-evaluation snapshot                  | System             | Status tetap `BLOCKED`                  |
| **DEC-002** | Seluruh blocker harus terlihat dan actionable       | Setiap blocker memiliki owner dan required action | Review Blockers drawer     | Blocker record                            | Process owner      | Blocker tidak boleh disembunyikan       |
| **DEC-003** | Release eligibility dan signed release berbeda      | `ELIGIBLE` tidak sama dengan `RELEASED`           | Status dan action terpisah | Eligibility evaluation dan release record | Certifying Staff   | Aircraft belum dianggap released        |
| **DEC-004** | Rule evaluation harus dapat ditelusuri              | Gate menyimpan rule version dan evidence          | Check detail panel         | Evaluation record                         | System/Quality     | Evaluation invalid bila evidence hilang |
| **DEC-005** | System failure tidak boleh menghasilkan false clear | Evaluation error menghasilkan blocking state      | Evaluation-failed status   | Error dan input snapshot                  | System             | Technical release diblokir              |
| **WF-001**  | Workflow stage mempunyai entry dan exit criteria    | Stage hanya berubah melalui transition command    | Stage stepper              | Transition event                          | Role sesuai stage  | Transition ditolak                      |
| **WF-002**  | Owner harus selalu terlihat                         | Setiap active stage memiliki owner role/user      | Owner label                | Assignment history                        | Planner/Supervisor | Escalation jika owner kosong            |
| **WF-003**  | Blocker harus dikaitkan ke stage                    | Blocker memengaruhi status stage dan release gate | Stage blocker badge        | Blocker-stage mapping                     | System             | Stage menjadi blocked                   |
| **WF-004**  | Records Review tidak boleh dilewati                 | Release Review membutuhkan records accepted       | Dedicated Records stage    | Record-acceptance event                   | Technical Records  | Release entry ditolak                   |
| **WF-005**  | Rework harus mengembalikan proses                   | Rejected inspection mengembalikan Execution       | Returned-stage indicator   | Inspection/rework event                   | Inspector          | Inspection/release blocked              |
| **WF-006**  | Timestamp transition harus tersedia                 | Setiap perubahan menyimpan occurred/recorded time | Last updated label         | Audit event                               | System             | Transition tidak valid tanpa event      |
| **WF-007**  | Stage completion tidak boleh diedit manual          | Status dihitung dari transition dan criteria      | Read-only stage status     | Transition history                        | System             | Direct update ditolak                   |

---

# 25. Minimum UAT

| Skenario                                               | Expected result                                            |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| Progress 99%, satu inspection belum selesai            | Decision tetap `BLOCKED`                                   |
| Seluruh gate passed tetapi belum ada release signature | Status `ELIGIBLE`, bukan `RELEASED`                        |
| Rule engine gagal membaca MEL data                     | Status `EVALUATION_FAILED`; release blocked                |
| Enam Job Card incomplete                               | Banner menampilkan agregasi dan detail tetap dapat dibuka  |
| MEL expired saat user berada di Execution              | Global Decision Status segera berubah menjadi `BLOCKED`    |
| Inspection rejected                                    | Execution menjadi `RETURNED`; Inspection menjadi `BLOCKED` |
| Rework selesai tetapi belum reinspected                | Release tetap blocked                                      |
| Records belum accepted                                 | Technical Release stage tidak dapat dimulai                |
| Physical work benar tetapi attachment kurang           | Dikembalikan ke Records Review, bukan Execution            |
| Signer tidak authorized                                | Release transition ditolak                                 |
| Work Package released tetapi defect no-go lain terbuka | Aircraft tetap `GROUNDED`                                  |
| Blocker resolved                                       | Gate dievaluasi ulang dan audit event tersimpan            |
| Status hanya dilihat grayscale                         | Ikon dan label tetap menjelaskan kondisi                   |
| Tablet portrait                                        | Seluruh stage tetap terbaca melalui vertical stepper       |
| Stage owner belum ditetapkan                           | Stage tidak dapat aktif atau menghasilkan escalation       |
| User mencoba mengganti stage melalui API patch         | Request ditolak; harus melalui transition command          |

---

# 26. Komponen Figma

```text
ReleaseDecisionHero
├── StatusIcon
├── DecisionLabel
├── DecisionDescription
├── BlockerCount
├── WarningCount
├── PassedGateCount
├── HighestPriorityBlocker
├── NextAction
├── Owner
├── EvaluatedAt
├── PrimaryAction
└── SecondaryAction
```

Variants:

```text
Not Evaluated
Evaluating
Blocked
Review Required
Eligible
Released
Evaluation Failed
Offline / Cannot Evaluate
```

Workflow:

```text
MaintenanceWorkflowStepper
├── WorkflowStageItem × 6
│   ├── StepNumber/Icon
│   ├── StageName
│   ├── StageStatus
│   ├── Owner
│   ├── BlockerCount
│   ├── LastUpdated
│   └── CriteriaProgress
└── StageDetailPanel
```

Variants setiap stage:

```text
Not Started
Available
In Progress
Blocked
Returned
Completed
Not Required
```

---

# Keputusan final

Struktur halaman yang digunakan:

```text
Persistent Context
        ↓
Decision Status
        ↓
Workflow Stepper
        ↓
Current Stage Workspace
        ↓
Supporting Details
```

Status utama tidak boleh berbunyi:

```text
74% Complete
```

Status utama harus berbunyi:

```text
RELEASE BLOCKED
```

beserta alasan dan tindakan berikutnya.

Workflow final:

```text
Planning
→ Readiness
→ Execution
→ Inspection
→ Records Review
→ Technical Release
```

Dengan desain ini, user selalu mengetahui:

- posisi Work Package;

- apakah pesawat dapat dirilis;

- apa yang memblokir;

- siapa pemilik tindakan;

- tindakan berikutnya;

- syarat masuk dan keluar setiap tahap;

- kapan kondisi terakhir diperbarui;

- bukti apa yang mendasari keputusan sistem.
