Baik. Saya ubah pendekatannya.

Di bawah ini **bukan kumpulan contoh fitur**, melainkan **baseline proses kerja MRO yang saya tetapkan** berdasarkan dokumen resmi DGCA yang dapat diverifikasi secara publik. Struktur proses, pemisahan tanggung jawab, state, gate, evidence, dan perilaku sistem dapat langsung digunakan untuk BRD, BPMN, backend workflow, permission model, UAT, dan desain Figma.

Hal yang tidak saya putuskan secara sembarangan adalah nilai yang memang hanya boleh berasal dari controlled document operator, seperti isi MEL operator, interval AAMP, exact release statement, jenis mandatory inspection, dan scope authorization per personel.

---

# 1. Basis resmi yang digunakan

| Kode   | Sumber                            | Penggunaan                                                                              |
| ------ | --------------------------------- | --------------------------------------------------------------------------------------- |
| **R1** | KP 062 Tahun 2018 / SI 8900-3.327 | Maintenance program, task, interval, approved source, revision, operator responsibility |
| **R2** | KP 060 Tahun 2018 / SI 8900-3.329 | Maintenance records, electronic records, retention, maintenance release                 |
| **R3** | KP 064 Tahun 2018 / SI 8900-6.9   | AMO, roster, technical data, calibration, records, return to service                    |
| **R4** | KP 067 Tahun 2018 / SI 8900-6.5   | Training, authorization competence, software, human factors, handover dan fatigue       |
| **R5** | KP 121 Tahun 2016 / AC 21-11      | Eligibility, quality, identification, dan traceability material/part                    |
| **R6** | KP 523 Tahun 2015 / SI 8900-4.4   | Development, review, dan approval MEL/CDL                                               |

SI 8900-3.327 menetapkan maintenance program berdasarkan MRBR, MPD, maintenance manual, dan dokumen relevan lain; program harus mengendalikan task, interval, mandatory item, operating environment, revision, dan human-factor principles. Operator tetap menjadi pihak yang terutama bertanggung jawab atas airworthiness dan pihak yang digunakan operator harus bekerja di bawah direction and control operator serta mengikuti maintenance program operator.

SI 8900-3.329 memperbolehkan sistem record elektronik, tetapi manual operator harus menjelaskan sistem dan penggunaannya. Records harus dapat dibuat, dipreservasi, dan diambil kembali; minimum record mencakup deskripsi atau referensi pekerjaan, tanggal penyelesaian, serta identitas/signature dan certificate number pihak yang menyetujui return to service.

SI 8900-6.9 mengharuskan AMO memiliki roster management, supervisory, inspection, dan personel yang berwenang menandatangani maintenance release. Technical data harus current, accurate, complete, tersedia bagi personel, dan obsolete data harus disingkirkan dari area penggunaan. Calibration system harus mengendalikan identitas alat, status, last calibration, next due, recall, dan records.

Human factors DGCA mencakup task documentation, sign-off, planning, komunikasi, shift/task turnover, undocumented maintenance, distraction, pressure, fatigue, procedural noncompliance, risk assessment, dan penggunaan software maintenance. Human factors ditujukan bukan hanya kepada technician, tetapi juga supervisor dan planner.

AC 21-11 menetapkan bahwa installer harus memastikan part acceptable dan eligible sebelum pemasangan. Release certificate atau tag tidak dengan sendirinya membuktikan bahwa suatu part cocok dipasang pada aircraft tertentu; applicability, traceability, condition, dan approved installation data tetap harus diperiksa.

---

# 2. Keputusan arsitektur proses

Saya menetapkan proses MRO menjadi empat lapisan:

```text
Controlled Maintenance Data
        ↓
Planning & Readiness
        ↓
Controlled Execution & Inspection
        ↓
Records Review & Technical Release
```

Aplikasi tidak boleh membiarkan user melompati lapisan tersebut.

## Lifecycle utama

```text
Maintenance Demand
→ Technical Validation
→ Workscope Planning
→ Resource Readiness
→ Work Package Commitment
→ Aircraft Induction
→ Work Execution
→ Finding / Non-Routine
→ Inspection
→ Technical Records Review
→ Release Readiness
→ Technical Release
→ Archive & Reliability Feedback
```

---

# 3. Proses kerja nyata end-to-end

## Tahap 0 — Controlled master data

### Pemilik

- Engineering: technical requirements dan applicability.

- Document Control: document revision.

- Technical Records: aircraft configuration.

- Quality: authorization dan controlled procedure.

- Training/Authorization Administrator: competence dan authorization record.

### Sistem harus sudah mempunyai

- Aircraft configuration.

- Aircraft FH/FC/calendar status.

- AAMP revision aktif.

- Approved maintenance data.

- AD/SB status.

- MEL/CDL operator.

- AMO certificate, rating, capability, dan location.

- Personnel license, training, dan authorization.

- Material master dan traceability.

- Tool/GSE dan calibration status.

### Gate

Tidak ada work package yang dapat committed jika salah satu master data kritis belum memiliki status valid.

### Evidence

- Master revision.

- Approval reference.

- Effective date.

- Aircraft applicability.

- Source dan last verified date.

- User yang mengaktifkan data.

---

## Tahap 1 — Maintenance demand creation

Maintenance demand hanya boleh berasal dari sumber teridentifikasi:

1. AAMP due task.

2. AD requirement.

3. SB atau engineering assessment.

4. Technical log defect.

5. Inspection finding.

6. MEL/CDL rectification.

7. Component life requirement.

8. Reliability action.

9. Modification.

10. Approved repair requirement.

11. Abnormal occurrence inspection.

12. Operator-directed maintenance requirement.

### Primary owner

- Planner menerima demand.

- Engineering memvalidasi demand teknis.

- Maintenance Control menentukan operational priority.

### Sistem melakukan

- Membuat `Maintenance Demand ID`.

- Mengikat aircraft/component.

- Mengikat source document.

- Mengambil current utilization.

- Menghitung due.

- Menandai operational impact.

- Menetapkan apakah mandatory atau discretionary.

### Exit gate

Demand tidak dapat masuk planning sebelum memiliki:

```text
Source identified
Aircraft/component identified
Applicability status determined
Due basis determined
Technical owner assigned
```

### State

```text
Detected
→ Under Technical Validation
→ Validated
→ Rejected as Not Applicable
→ On Hold
```

---

## Tahap 2 — Technical validation

Engineering harus menentukan:

- Dokumen apa yang menjadi source.

- Exact revision.

- Exact section/task reference.

- Aircraft/MSN/configuration applicability.

- Mandatory atau non-mandatory.

- Threshold dan interval.

- Required skill.

- Required material.

- Required tool/GSE.

- Inspection requirement.

- Configuration impact.

- Technical-record impact.

- Weight and balance impact bila ada.

- Operational restriction bila ada.

### Keputusan sistem

Task hanya dapat berstatus `Technically Validated` jika:

```text
document.status = CURRENT
AND document.applicability = APPLICABLE
AND source_section IS NOT NULL
AND aircraft_configuration IS VERIFIED
AND technical_owner IS ASSIGNED
```

### Jika applicability belum dapat dipastikan

Status:

```text
APPLICABILITY UNRESOLVED
```

Akibatnya:

- Task tidak boleh masuk committed workscope.

- Planner tidak boleh mengubahnya menjadi executable.

- Engineering harus melakukan review.

### Evidence

- Source document ID.

- Revision.

- Section.

- Applicability result.

- Aircraft configuration snapshot.

- Reviewer.

- Review timestamp.

- Technical decision.

---

## Tahap 3 — Workscope planning

Planner membentuk work package dari seluruh demand yang telah technically validated.

### Planner menentukan

- Maintenance event.

- Station/location.

- Planned start dan finish.

- Aircraft downtime.

- Task sequencing.

- Labor demand.

- Required skill dan authorization.

- Material demand.

- Tool/GSE demand.

- Inspection point.

- Access dependency.

- Parallel atau sequential work.

- Shift plan.

- Estimated return to service.

### Planner tidak boleh

- Mengubah applicability.

- Mengubah approved task interval.

- Mengubah technical instruction.

- Menyatakan aircraft airworthy.

- Menghapus mandatory task tanpa approved disposition.

### State workscope

```text
Draft
→ Technical Review
→ Resource Review
→ Ready to Commit
→ Committed
```

### Exit gate

Seluruh task dalam workscope harus:

- technically validated;

- memiliki source revision;

- memiliki applicability;

- mempunyai resource requirement;

- mempunyai inspection requirement;

- tidak mempunyai unresolved technical query.

---

## Tahap 4 — Resource readiness

Sistem melakukan pemeriksaan nyata terhadap lima kelompok resource.

### 4.1 Personnel

Pemeriksaan:

```text
Employment active
License valid
Company authorization valid
Aircraft/fleet scope valid
Task/process scope valid
Station scope valid
Training current
Recency current
Shift availability valid
```

### 4.2 Material

Pemeriksaan:

```text
Correct part number
Applicable to configuration
Serviceable condition
Traceability complete
Certificate acceptable
Shelf life valid
Life remaining sufficient
Receiving inspection completed
Not quarantined
Reserved to work package
```

### 4.3 Tools dan GSE

Pemeriksaan:

```text
Correct tool type
Required range and accuracy
Serviceable
Calibration valid through intended usage
Available at station
Reserved
No unresolved out-of-tolerance case
```

### 4.4 Facilities dan location

Pemeriksaan:

```text
AMO rating valid
Capability valid
Location approved/controlled
Required environment available
Required workshop/hangar available
Required ground support available
```

### 4.5 Technical data

Pemeriksaan:

```text
Current controlled copy available
Applicable revision available
Offline package downloaded when required
No unresolved supersession impact
No technical-data discrepancy open
```

### Output readiness

Bukan persentase tunggal. Sistem menghasilkan:

```text
READY
READY WITH WARNINGS
NOT READY — BLOCKED
```

Satu blocker kritis tetap menghasilkan `NOT READY`, walaupun 99% resource tersedia.

---

## Tahap 5 — Work package commitment

Commitment berarti workscope dan technical baseline dikunci.

### Saat commit, sistem membekukan

- Daftar task.

- Exact source revisions.

- Aircraft configuration.

- Utilization snapshot.

- Planned material.

- Planned tools.

- Planned personnel.

- Inspection requirements.

- Planned location.

- Maintenance window.

### Perubahan setelah commitment

Tidak boleh direct edit.

Harus melalui:

```text
Scope Change Request
→ Technical Impact Review
→ Resource Impact Review
→ Approval
→ New Work Package Revision
```

Evidence:

- Previous scope.

- New scope.

- Reason.

- Requester.

- Reviewer.

- Approver.

- Effective timestamp.

---

## Tahap 6 — Aircraft induction dan maintenance handover

Maintenance Control menyerahkan aircraft ke maintenance event.

### Induction harus mencatat

- Aircraft registration.

- Current FH/FC.

- Current station.

- Technical log status.

- Open defects.

- Open MEL/CDL.

- Fuel condition bila relevan.

- Aircraft configuration.

- Existing damage/condition.

- Open panels atau temporary installation.

- Aircraft operational status.

- Person menyerahkan dan menerima.

### State aircraft

```text
IN SERVICE
→ MAINTENANCE INDUCTION
→ UNDER MAINTENANCE
```

Operations Control tidak boleh mengubahnya kembali menjadi `IN SERVICE`. Perubahan tersebut hanya berasal dari technical release process.

---

## Tahap 7 — Job Card execution

Job Card bukan to-do sederhana. Setiap task execution harus menggunakan langkah yang terkontrol.

### Sebelum `Start`

Sistem memeriksa ulang:

- Aircraft identity.

- Job Card revision.

- Approved data revision.

- Applicability.

- Assigned person.

- Authorization.

- Material.

- Tool.

- Safety prerequisite.

- Open handover.

- Sync/data status.

### Struktur pelaksanaan

```text
Preparation
Isolation / Safety
Access
Removal or Disassembly
Inspection / Measurement
Rectification / Installation
Reassembly
Test
Restoration
Documentation
```

Struktur aktual mengikuti approved technical data.

### Step type

- Performed action.

- Measurement.

- Pass/fail inspection.

- Material installed.

- Component removed.

- Tool used.

- Photo/evidence.

- Technician sign-off.

- Inspector sign-off.

- Independent inspection.

### Status Job Card

```text
Released to Execution
→ Assigned
→ In Progress
→ Paused
→ Awaiting Technical Support
→ Awaiting Material
→ Awaiting Inspection
→ Rework Required
→ Work Completed
→ Signed Off
→ Records Accepted
```

### Tidak ada tombol `Skip`

Pilihan yang tersedia:

```text
Not Applicable
Unable to Perform
Technical Clarification Required
Deviation Required
Finding Raised
```

Masing-masing membutuhkan reason dan authority.

---

## Tahap 8 — Interruption dan handover

Saat pekerjaan berhenti, user wajib memilih `Pause Task`.

### Data wajib

- Reason.

- Last fully completed step.

- Step yang sedang dikerjakan.

- Physical condition.

- Panel/access terbuka.

- Component dilepas.

- Fastener/connection belum selesai.

- Tool masih berada di area.

- Safety lock/tag.

- Temporary protection.

- Finding yang belum selesai.

- Next safe action.

### Jika melewati shift

Sistem membuat `Shift Handover`.

```text
Prepared by Outgoing Technician
→ Reviewed by Supervisor
→ Reviewed by Incoming Technician
→ Accepted
```

Incoming technician tidak dapat menekan `Resume` sebelum menerima handover.

Human factors DGCA secara eksplisit memasukkan proper task documentation, communication, shift/task turnover, distraction, fatigue, undocumented maintenance, dan procedural noncompliance sebagai area yang harus dikelola.

---

## Tahap 9 — Finding dan non-routine work

Ketika condition berbeda dari approved limit atau expected condition, technician membuat finding.

### Finding record

- Aircraft/component.

- Source Job Card dan step.

- ATA.

- Location.

- Condition.

- Measurement.

- Limit.

- Evidence.

- Operational impact.

- Work stopped atau tidak.

- Reporter.

- Timestamp.

### Engineering/authorized assessment menentukan

```text
Within Approved Limit
Rectify Using Existing Approved Data
Create Non-Routine Job Card
Engineering Order Required
Approved Repair Required
Eligible for MEL/CDL Deferral
Aircraft Grounded
```

### State

```text
Open
→ Under Assessment
→ Disposition Issued
→ Rectification In Progress
→ Awaiting Inspection
→ Closed
```

Finding tidak dapat ditutup hanya dengan mengubah status menjadi `Closed`.

---

## Tahap 10 — Inspection dan rework

Sistem membentuk inspection queue berdasarkan Job Card dan inspection rule.

### Sebelum assign inspector

Sistem memeriksa:

- Inspector authorization.

- Aircraft/type scope.

- Process/task scope.

- Station scope.

- Training.

- Independence requirement.

- Conflict dengan performer.

### Hasil inspection

```text
Accepted
Rejected — Rework Required
Unable to Verify
Engineering Review Required
```

### Jika rejected

- Previous completion tidak lagi valid.

- Task berubah menjadi `Rework Required`.

- Rework harus diselesaikan.

- Inspection baru wajib dilakukan.

- Inspection lama tetap tersimpan dalam audit trail.

---

## Tahap 11 — Technical Records review

Technical Records tidak menentukan apakah pekerjaan secara teknis benar. Technical Records memastikan record package lengkap, konsisten, dan dapat ditelusuri.

### Pemeriksaan

- Seluruh Job Card complete.

- Mandatory signatures tersedia.

- Inspection signatures tersedia.

- Finding disposition tersedia.

- Part install/remove lengkap.

- Component configuration konsisten.

- Aircraft FH/FC valid.

- AD/SB status diperbarui.

- Modification/repair status diperbarui.

- MEL/CDL status diperbarui.

- Supporting certificates tersedia.

- Source revision tersedia.

- No unresolved amendment.

- No unresolved sync conflict.

### Status

```text
Records Incomplete
Records Under Review
Correction Required
Records Complete
```

DGCA mengharuskan records mempunyai description/reference, completion date, dan signature/certificate pihak yang memberikan approval. Current status tertentu seperti AD compliance, inspection status, total time, dan life-limited part harus dapat dipertahankan dan ditelusuri.

---

## Tahap 12 — Release readiness

Sistem menjalankan gate secara otomatis, tetapi keputusan release tetap dilakukan oleh authorized certifying staff.

```text
release_eligible =
    mandatory_tasks_signed
AND required_inspections_accepted
AND findings_dispositioned
AND non_routine_tasks_closed
AND material_traceability_complete
AND configuration_updated
AND technical_records_complete
AND mel_cdl_conditions_valid
AND source_data_valid
AND signer_authorized
AND no_critical_sync_conflict
```

### Output

```text
RELEASE BLOCKED
RELEASE REVIEW REQUIRED
ELIGIBLE FOR TECHNICAL RELEASE
```

### Sistem harus menampilkan

- Semua blocker.

- Semua warning.

- Semua open MEL/CDL.

- Operational restriction.

- Technical-record status.

- Signer authorization status.

- Last data sync.

- Work package revision.

Persyaratan maintenance release mencakup pekerjaan yang dilakukan sesuai manual certificate holder, inspection oleh authorized person untuk item yang memerlukan inspection, tidak adanya known condition yang membuat aircraft unairworthy, dan aircraft berada dalam kondisi aman untuk operasi terkait pekerjaan yang dilakukan.

---

## Tahap 13 — Technical release

Halaman release harus terpisah dari halaman execution.

### Certifying Staff harus melihat

- Aircraft identity.

- Work package.

- Maintenance performed.

- Open defects.

- Open MEL/CDL.

- Operational restrictions.

- Inspection summary.

- Record summary.

- Configuration changes.

- Authorization scope.

- Release statement.

### Action

```text
Return for Correction
Reject Release
Authenticate and Release
```

Tidak ada generic button `Approve`.

### Saat release

Sistem menyimpan:

- Signed release statement.

- Work package revision.

- Gate evaluation snapshot.

- Signer identity.

- Certificate/license.

- Authorization snapshot.

- Timestamp.

- Station.

- Open limitation.

- Digital signature/integrity evidence.

AMO wajib memberikan copy maintenance release kepada owner/operator dan menyimpan records yang mendemonstrasikan compliance dengan Part 43; record harus secara jelas menyatakan article approved for return to service.

---

## Tahap 14 — Archive dan feedback

Setelah release:

- Work package menjadi read-only.

- Direct edit ditolak.

- Correction dilakukan melalui amendment.

- Records masuk retention category.

- Reliability data diperbarui.

- Repeat defect monitoring diperbarui.

- Actual man-hours dan material usage direkam.

- Planning variance disimpan.

- Technical-data issue diteruskan ke Engineering/Document Control.

- Quality event diteruskan ke CAPA bila diperlukan.

---

# 4. Pembagian kewenangan final

| Role                    | Boleh melakukan                                                           | Tidak otomatis boleh melakukan                                     |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Planner**             | Membuat workscope, schedule, resource plan, commitment                    | Mengubah technical applicability, sign execution, release          |
| **Engineering**         | Applicability, technical disposition, EO, repair/modification instruction | Menyatakan pekerjaan fisik selesai tanpa execution evidence        |
| **Maintenance Control** | Mengendalikan event, technical status, koordinasi, escalation             | Menghapus blocker atau memaksa release                             |
| **Technician**          | Melaksanakan dan mencatat task sesuai authorization                       | Mengubah source data atau melakukan independent inspection sendiri |
| **Inspector**           | Inspection dan reinspection sesuai scope                                  | Release di luar authorization                                      |
| **Certifying Staff**    | Menandatangani technical release sesuai scope                             | Bypass incomplete gate                                             |
| **Technical Records**   | Review record, configuration, utilization, archival                       | Membuat technical disposition                                      |
| **Stores**              | Receiving, eligibility, reserve, issue, return, quarantine                | Menentukan engineering interchangeability tanpa approved basis     |
| **Tool Control**        | Tool issue, return, serviceability, calibration                           | Mengizinkan expired calibrated tool dipakai                        |
| **Quality**             | Surveillance, authorization governance, CAPA, compliance review           | Menjadi approver rutin seluruh pekerjaan hanya karena role Quality |
| **Operations Control**  | Menerima status, ETR, restriction, flight impact                          | Mengubah maintenance status atau technical release                 |

Seseorang boleh memiliki lebih dari satu role, tetapi setiap action tetap harus dievaluasi terhadap authorization yang digunakan pada saat action tersebut.

---

# 5. State model yang harus digunakan

## Work Package

```text
DRAFT
TECHNICALLY_VALIDATED
RESOURCE_REVIEW
READY_TO_COMMIT
COMMITTED
IN_EXECUTION
AWAITING_INSPECTION
AWAITING_RECORDS
RELEASE_REVIEW
RELEASED
CLOSED
CANCELLED
```

## Control status terpisah

```text
CLEAR
WARNING
BLOCKED
ON_HOLD
```

Jangan memasukkan `Blocked` sebagai satu-satunya lifecycle state karena work package tetap berada pada tahap tertentu ketika diblokir.

## Job Card

```text
RELEASED_TO_EXECUTION
ASSIGNED
IN_PROGRESS
PAUSED
AWAITING_SUPPORT
AWAITING_INSPECTION
REWORK_REQUIRED
WORK_COMPLETED
SIGNED_OFF
RECORDS_ACCEPTED
VOIDED
```

## Approved data

```text
RECEIVED
UNDER_REVIEW
CURRENT
SUPERSEDED
WITHDRAWN
OBSOLETE
```

Applicability harus terpisah:

```text
APPLICABLE
CONDITIONALLY_APPLICABLE
NOT_APPLICABLE
UNRESOLVED
```

---

# 6. Regulatory Traceability Matrix yang ditetapkan

## A. Approved data dan planning

| ID          | Source | Requirement                                    | Business rule                                     | UI/system control                    | Evidence                            | Authorized role     | Jika gagal                |
| ----------- | ------ | ---------------------------------------------- | ------------------------------------------------- | ------------------------------------ | ----------------------------------- | ------------------- | ------------------------- |
| **DAT-001** | R1, R3 | Task menggunakan current applicable data       | Document `CURRENT` dan applicability `APPLICABLE` | Source/revision/applicability header | Document dan configuration snapshot | Engineering         | Task blocked              |
| **DAT-002** | R3     | Obsolete data tidak boleh digunakan            | Superseded/obsolete source tidak selectable       | Superseded badge dan disabled state  | Supersession record                 | Document Control    | Selection rejected        |
| **DAT-003** | R1, R3 | Exact revision harus ditelusuri                | Revision dibekukan saat commitment                | Frozen revision indicator            | Revision snapshot                   | Engineering/Planner | Commitment rejected       |
| **DAT-004** | R3     | Revision baru harus dikendalikan               | Tidak ada silent replacement pada active task     | Revision impact queue                | Old/new revision dan decision       | Engineering         | Technical review required |
| **DAT-005** | R3     | Technical data tersedia bagi pelaksana         | Required section harus accessible                 | Controlled viewer/offline status     | Access log dan package version      | Document Control    | Task start blocked        |
| **MP-001**  | R1     | Hanya maintenance program aktif yang digunakan | Program harus approved/effective                  | AAMP status                          | Program revision dan approval       | Engineering         | Due generation rejected   |
| **MP-002**  | R1     | Due mengikuti task dan interval approved       | Hitung FH/FC/calendar/whichever first             | Due countdown                        | Calculation snapshot                | Planning            | Due flagged invalid       |
| **MP-003**  | R1     | Perubahan program dikendalikan                 | Draft-review-approval-effective                   | Revision workflow                    | Before/after dan approval           | Engineering/Quality | Revision tidak aktif      |
| **WP-001**  | R1, R3 | Workscope hanya berisi validated task          | Semua task technically validated                  | Workscope validation                 | Task-source mapping                 | Planner             | Commit rejected           |
| **WP-002**  | R3     | AMO/location harus mempunyai capability        | Rating, capability, location valid                | Capability gate                      | Certificate/Ops Specs snapshot      | Planner/Quality     | Work package blocked      |

---

## B. Resource readiness

| ID           | Source | Requirement                                                | Business rule                                            | UI/system control        | Evidence                        | Authorized role         | Jika gagal                      |
| ------------ | ------ | ---------------------------------------------------------- | -------------------------------------------------------- | ------------------------ | ------------------------------- | ----------------------- | ------------------------------- |
| **MAT-001**  | R5     | Part harus acceptable dan eligible                         | Condition, traceability, applicability, shelf life valid | Eligibility status       | P/N, S/N, certificate, batch    | Stores                  | Issue/install rejected          |
| **MAT-002**  | R5     | Release tag tidak otomatis membuktikan install eligibility | Aircraft configuration tetap diperiksa                   | Install eligibility gate | Approved source dan effectivity | Engineering/Stores      | Installation blocked            |
| **MAT-003**  | R3, R5 | Unserviceable/quarantine terpisah                          | Status dan stock location harus konsisten                | Quarantine indicator     | Location/status history         | Stores                  | Movement/issue rejected         |
| **TOOL-001** | R3     | Calibration valid saat digunakan                           | Next due setelah usage timestamp                         | Calibration gate         | Tool ID, cert, dates            | Tool Control            | Assignment rejected             |
| **TOOL-002** | R3     | Tool sesuai task                                           | Type/range/accuracy match                                | Compatibility status     | Tool spec dan task requirement  | Tool Control            | Step start blocked              |
| **TOOL-003** | R3     | Tool issued harus accounted for                            | Open issue tidak boleh tersisa saat close                | Tool reconciliation      | Issue/return log                | Technician/Tool Control | Work package close blocked      |
| **AUTH-001** | R3, R4 | Account bukan authorization                                | License, scope, training, validity diperiksa runtime     | Authorization status     | Authorization snapshot          | Authorization Admin     | Action rejected                 |
| **AUTH-002** | R3     | Inspector/certifying staff harus ada di current roster     | User ada pada roster aktif                               | Roster validation        | Roster revision                 | Quality/Management      | Sign-off rejected               |
| **AUTH-003** | R3, R4 | Training sesuai assignment                                 | Required training current                                | Training badge           | Training/assessment record      | Training Admin          | Assignment blocked              |
| **AUTH-004** | R3     | Authority sesuai fleet/task/location                       | Seluruh scope harus match                                | Scope-match indicator    | Rule evaluation                 | System                  | Critical action hidden/rejected |

---

## C. Execution, handover, dan inspection

| ID           | Source     | Requirement                                     | Business rule                                    | UI/system control          | Evidence                     | Authorized role             | Jika gagal                |
| ------------ | ---------- | ----------------------------------------------- | ------------------------------------------------ | -------------------------- | ---------------------------- | --------------------------- | ------------------------- |
| **JC-001**   | R1, R2, R4 | Work execution terdokumentasi per task          | Tidak ada one-click completion                   | Step execution             | Actor, step, time, result    | Technician                  | Task incomplete           |
| **JC-002**   | R4         | Interruption harus dapat dipulihkan             | Pause menyimpan last safe state                  | Pause workflow             | Interruption record          | Technician                  | Resume blocked            |
| **JC-003**   | R4         | Shift/task turnover dikendalikan                | Incoming person harus accept                     | Handover panel             | Outgoing/incoming acceptance | Technician/Supervisor       | Ownership not transferred |
| **JC-004**   | R1, R4     | Deviation tidak dilakukan informal              | Tidak ada `Skip`; deviation memerlukan authority | Deviation workflow         | Reason/reference/approval    | Engineering                 | Step blocked              |
| **JC-005**   | R2         | Measurement dan work result menjadi record      | Structured value dan limit                       | Measurement input          | Value, unit, tool, timestamp | Technician                  | Out-of-limit finding      |
| **FND-001**  | R1, R4     | Finding memiliki technical disposition          | Tidak dapat close tanpa disposition              | Finding assessment         | Condition, source, decision  | Engineering/authorized role | Finding remains open      |
| **INSP-001** | R2, R3     | Required inspection dilakukan authorized person | Authorization harus valid                        | Inspection assignment gate | Inspector identity/signature | Inspector                   | Inspection rejected       |
| **INSP-002** | R3         | Independence dipenuhi ketika diwajibkan         | Performer berbeda dari independent inspector     | Conflict gate              | Performer/inspector identity | Inspector                   | Sign-off rejected         |
| **INSP-003** | R2         | Rework memerlukan reinspection                  | Rework membuat inspection lama stale             | Reinspection badge         | Rework/inspection linkage    | Inspector                   | Release blocked           |

---

## D. Records, MEL/CDL, dan release

| ID          | Source | Requirement                                         | Business rule                                           | UI/system control        | Evidence                            | Authorized role                | Jika gagal             |
| ----------- | ------ | --------------------------------------------------- | ------------------------------------------------------- | ------------------------ | ----------------------------------- | ------------------------------ | ---------------------- |
| **REC-001** | R2, R3 | Record minimum harus lengkap                        | Description/reference, date, approver identity tersedia | Completeness panel       | Signed work record                  | Technical Records              | Release blocked        |
| **REC-002** | R2     | Current status records dipertahankan                | FH/FC, inspection, LLP, AD status tidak boleh hilang    | Current status registry  | Source dan history                  | Technical Records              | Aircraft status hold   |
| **REC-003** | R2     | Electronic record dapat dipreservasi dan diambil    | Record dan attachment retrievable                       | Audit export             | Manifest, file, metadata            | Technical Records              | Record exception       |
| **REC-004** | R2     | Signed data tidak dikoreksi diam-diam               | Correction menghasilkan amendment                       | Amendment workflow       | Before/after/reason                 | Authorized role                | Direct edit rejected   |
| **MEL-001** | R6     | Deferral menggunakan approved MEL/CDL operator      | Reference dan revision harus applicable                 | MEL/CDL selector         | Approved item snapshot              | Authorized maintenance control | Deferral rejected      |
| **MEL-002** | R6     | Conditions/procedures harus dipenuhi                | Deferral belum active sampai seluruh gate selesai       | Deferral readiness       | M/O procedure, placard, restriction | Authorized roles               | Aircraft remains no-go |
| **MEL-003** | R6     | Expiry mengikuti approved MEL                       | Tanpa approved active extension, expiry lock berlaku    | Expiry countdown/lock    | Start, category, expiry, extension  | Maintenance Control            | Release blocked        |
| **RTS-001** | R2, R3 | Release hanya setelah seluruh persyaratan terpenuhi | Critical blocker count harus nol                        | Release readiness page   | Gate evaluation                     | Certifying Staff               | Release unavailable    |
| **RTS-002** | R2, R3 | Signer harus authorized                             | Runtime scope validation                                | Authority panel          | License/authorization snapshot      | Certifying Staff               | Signature rejected     |
| **RTS-003** | R2, R3 | Release statement dan record dipertahankan          | Signed statement immutable                              | Dedicated release action | Statement/signature/timestamp       | Certifying Staff               | No release produced    |
| **RTS-004** | R3     | Owner/operator menerima maintenance release         | Release package didistribusikan                         | Distribution status      | Recipient dan delivery record       | Technical Records              | Package remains open   |

---

# 7. Perilaku UI yang menjadi keputusan final

## Global header wajib selalu terlihat

```text
Aircraft
Current technical status
Work package
Current station
Current lifecycle stage
Release eligibility
Last synchronization
```

## Blocker tidak boleh disembunyikan

Blocker muncul pada:

1. global status bar;

2. tab badge;

3. readiness summary;

4. release review;

5. assigned action queue.

## Primary actions berdasarkan tahap

| Tahap      | Primary action             |
| ---------- | -------------------------- |
| Demand     | Validate requirement       |
| Planning   | Review workscope           |
| Readiness  | Resolve blockers           |
| Execution  | Start/continue Job Card    |
| Inspection | Review inspection queue    |
| Records    | Resolve record deficiency  |
| Release    | Review release eligibility |

Tidak ada satu tombol universal `Approve`.

---

# 8. Hal yang tetap harus diambil dari PT AMA dan AMO

Struktur proses di atas sudah dapat dipakai. Namun nilai berikut tidak boleh saya karang:

- Exact AAMP task dan interval.

- Exact MEL/CDL item, category, interval, dan extension.

- Daftar RII/mandatory/independent inspection.

- Exact maintenance release statement.

- Certifying-staff scope.

- Station capability.

- Work-away authority.

- Electronic/offline signature allowance.

- Record-retention classification internal.

- Fatigue/work-hour threshold.

- Defect deferral authority.

- Major repair/alteration approval route.

Untuk setiap item tersebut, sistem harus berstatus:

```text
CONTROLLED POLICY NOT LOADED
```

bukan menggunakan default palsu.

---

# 9. Urutan pekerjaan tim yang saya putuskan

## Fase 1 — Process dan compliance foundation

1. Bentuk Regulatory Source Register.

2. Masukkan controlled manual register.

3. Finalisasi role dan authorization matrix.

4. Finalisasi state machine.

5. Finalisasi Regulatory Traceability Matrix.

6. Bentuk data dictionary.

7. Bentuk release-gate specification.

## Fase 2 — UX dan workflow

1. Fleet Technical Status.

2. Work Package Overview.

3. Planning & Resource Readiness.

4. Job Card Execution.

5. Findings & Non-Routine.

6. Inspection Workspace.

7. Technical Records Review.

8. Technical Release.

## Fase 3 — Backend enforcement

1. Document/applicability engine.

2. Due-control engine.

3. Runtime authorization.

4. Material eligibility.

5. Calibration gate.

6. Job Card state machine.

7. Inspection/rework gate.

8. Record completeness.

9. MEL/CDL gate.

10. Technical-release gate.

## Fase 4 — Verification

1. Requirement-level test.

2. Role/authorization test.

3. Offline/sync test.

4. Human-factors scenario test.

5. Record-integrity test.

6. Release-negative test.

7. Audit package generation.

8. Operator/AMO UAT.

9. Quality review.

10. DGCA engagement bila diperlukan.

---

# Keputusan akhirnya

Proses kerja sistem harus memaksa rantai berikut:

```text
Validated Requirement
→ Applicable Approved Data
→ Committed Workscope
→ Eligible Resources
→ Authorized Execution
→ Required Inspection
→ Complete Technical Record
→ Valid Release Authority
→ Technical Release
```

Tidak ada actor, termasuk Maintenance Control atau Operations Control, yang dapat memotong rantai tersebut.

Dengan baseline ini, desain MRO Anda tidak lagi diperlakukan sebagai kumpulan dashboard, form, dan todo list. Ia menjadi **controlled maintenance workflow** dengan entry criteria, exit criteria, authorized action, stored evidence, failure behaviour, dan release gate yang jelas.
