# Information Architecture Work Package MRO — Hasil Implementasi

Saya menetapkan struktur ini menjadi **6 menu utama dan beberapa nested workspace**. Tujuannya agar navigasi tetap ringkas, tetapi pekerjaan yang membutuhkan fokus, evidence, inspection, atau signature tidak dipaksakan berada pada satu halaman panjang.

```text
Work Package
├── Overview & Readiness
├── Execution
│   └── Job Card Execution
├── Findings & Non-Routine
│   ├── Finding Assessment
│   └── Non-Routine Job Card
├── Resources
│   ├── Material & Components
│   ├── Tools & GSE
│   ├── Personnel & Shift
│   └── Facility & Capability
├── Technical Records
│   ├── Records Review
│   ├── Configuration Reconciliation
│   └── Amendments
└── Inspection & Release
    ├── Inspection Workspace
    └── Technical Release
```

`Inspection` dan `Technical Release` tetap tampil dalam satu kelompok navigasi, tetapi merupakan **dua dedicated page berbeda**. Inspection tidak boleh dicampurkan dengan halaman penandatanganan technical release.

---

# 1. Routing final

```text
/mro/work-packages/:workPackageId/overview

/mro/work-packages/:workPackageId/execution
/mro/work-packages/:workPackageId/execution/job-cards/:jobCardId

/mro/work-packages/:workPackageId/findings
/mro/work-packages/:workPackageId/findings/:findingId/assessment
/mro/work-packages/:workPackageId/non-routines/:nonRoutineId

/mro/work-packages/:workPackageId/resources/materials
/mro/work-packages/:workPackageId/resources/tools
/mro/work-packages/:workPackageId/resources/personnel
/mro/work-packages/:workPackageId/resources/facilities

/mro/work-packages/:workPackageId/records
/mro/work-packages/:workPackageId/records/configuration
/mro/work-packages/:workPackageId/records/amendments

/mro/work-packages/:workPackageId/inspection
/mro/work-packages/:workPackageId/release
```

Setiap URL harus dapat dibuka melalui deep link dan tetap memuat:

- aircraft context;

- Work Package context;

- user authorization;

- current lifecycle;

- release status;

- sync dan data freshness.

---

# 2. Global shell yang selalu tersedia

Seluruh subpage menggunakan shell yang sama.

```text
┌──────────────────────────────────────────────────────────────┐
│ Persistent Aircraft & Work Package Context                   │
├──────────────────────────────────────────────────────────────┤
│ Decision Status: RELEASE BLOCKED · 8 blockers                │
├──────────────────────────────────────────────────────────────┤
│ Overview | Execution | Findings | Resources | Records | ...  │
├──────────────────────────────────────────────────────────────┤
│ Current Subpage Content                                      │
└──────────────────────────────────────────────────────────────┘
```

## Komponen global

### A. Persistent context header

Selalu menampilkan:

```text
Aircraft registration
Aircraft type/model/MSN
Current station
Aircraft technical status
Work Package number/name
Work Package lifecycle
Maintenance window
FH/FC
Sync status
Data freshness
```

### B. Decision-status strip

Versi ringkas dari release decision:

```text
⛔ RELEASE BLOCKED
8 blockers · 3 warnings
Highest priority: MEL-24-03 expired
[Review Blockers]
```

### C. Navigation dengan count

```text
Overview
Execution             6
Findings              2
Resources             3
Technical Records     1
Inspection & Release  2
```

Count hanya menampilkan unresolved item yang relevan. Jangan menampilkan angka dekoratif seperti total seluruh record.

---

# 3. Overview & Readiness

## Tujuan halaman

Menjawab lima pertanyaan:

1. Apakah aircraft dapat menuju technical release?

2. Di tahap mana Work Package berada?

3. Apa yang memblokir?

4. Siapa yang harus bertindak?

5. Apa tindakan berikutnya?

## Konten final

```text
Decision Status
Workflow Stepper
Readiness Summary
Next Required Actions
Workscope Summary
Maintenance Window & ETR
Open MEL/CDL and Defects
Recent Critical Activity
```

## Komponen

### Decision Status

```text
RELEASE BLOCKED
8 blockers · 3 warnings · 12 checks passed

Aircraft cannot be released.

Next action:
Complete 6 mandatory Job Cards

Owner:
Production Supervisor
```

### Workflow stepper

```text
Planning
→ Readiness
→ Execution
→ Inspection
→ Records Review
→ Technical Release
```

### Readiness summary

```text
Work Execution
MEL/CDL & Defects
Material & Components
Personnel
Tools & GSE
Technical Data & Capability
Inspection
Technical Records
```

### Next Required Actions

Urut berdasarkan operational impact dan dependency, bukan jumlah item.

## Action yang tersedia

```text
Review Blockers
Run Readiness Evaluation
Assign Action Owner
Open Related Workspace
Review Workscope Revision
View Activity
```

## Action yang tidak tersedia di halaman ini

- menjalankan Job Card;

- menilai defect secara teknis;

- melakukan inspection;

- menerima technical records;

- menandatangani technical release;

- mengubah approved data.

Overview adalah **decision and coordination surface**, bukan execution page.

---

# 4. Execution

## Tujuan halaman

Mengendalikan pekerjaan aktual seluruh Job Card dalam Work Package.

## Halaman daftar Execution

```text
Execution Summary
Shift and Supervisor
Job Card Queue
Paused and Interrupted Tasks
Awaiting Support
Awaiting Inspection
Rework Required
Execution Blockers
```

## Filter wajib

```text
All
Assigned to Me
Mandatory
Blocking
In Progress
Paused
Awaiting Support
Awaiting Inspection
Rework Required
Signed Off
```

## Struktur row Job Card

```text
JC-031 · Hydraulic Filter Replacement
Mandatory · In Progress

Assigned:
Daniel Tebai

Source:
AMM [document] · Current · Applicable

Current step:
5 of 8 — Install replacement filter

Status:
Blocked by material

[Open Job Card]
```

## Dedicated Job Card page

Ketika dibuka, halaman berubah menjadi controlled execution workspace:

```text
Identity & Applicability
Approved Data
Safety Precautions
Prerequisites
Material / Tools / GSE
Step-by-Step Execution
Measurements
Findings
Evidence
Inspection
Certification
Audit Trail
```

## Action yang tersedia

```text
Start Work
Complete Step
Pause Task
Resume Task
Raise Finding
Request Support
Request Inspection
Complete and Sign Work
```

Tidak tersedia action generik:

```text
Mark Done
Close Task
Skip
```

---

# 5. Findings & Non-Routine

## Tujuan halaman

Mengendalikan kondisi yang ditemukan selama maintenance dan pekerjaan tambahan yang dihasilkan.

## Halaman daftar

```text
Open Findings
Awaiting Assessment
Stop-Work Findings
Disposition Issued
Non-Routine In Progress
Awaiting Inspection
Closed Findings
```

## Finding dapat dibuat melalui drawer

Drawer hanya digunakan untuk **initial capture**:

```text
Aircraft/Component
Source Job Card
Source Step
Observed condition
Location
Measurement
Evidence
Work stopped?
```

Action:

```text
[Record Finding]
```

Setelah disimpan:

```text
Finding State: UNDER ASSESSMENT
```

## Dedicated Finding Assessment page

Assessment tidak dilakukan di drawer.

Kontennya:

```text
Finding Identity
Aircraft Configuration
Observed vs Expected Condition
Measurements and Limits
Approved Data References
Operational/Airworthiness Impact
Repeat Defect Information
Engineering Assessment
Disposition
Required Rectification
Inspection Requirement
Evidence
Approval
```

## Disposition yang tersedia

```text
Within Approved Limit
Rectify Using Existing Approved Data
Create Non-Routine Job Card
Engineering Order Required
Approved Repair Data Required
MEL/CDL Assessment Required
Aircraft Grounded
```

## Dedicated Non-Routine page

Non-Routine Job Card menggunakan struktur teknis yang sama dengan Job Card biasa:

- approved source;

- work instructions;

- resources;

- execution steps;

- inspection;

- signature;

- records acceptance.

---

# 6. Resources

Resources menggunakan empat tab permanen.

```text
Material & Components
Tools & GSE
Personnel & Shift
Facility & Capability
```

---

## 6.1 Material & Components

### Konten

```text
Demand by Job Card
Reservation Status
Shortages
Eligibility Issues
Receiving Inspection
Issued Material
Installed/Removed Components
Quarantine
Transfer Requests
```

### Quick action melalui drawer

Drawer diperbolehkan untuk:

```text
Reserve satu stock item yang eligible
Create simple transfer request
View certificate
Assign material owner
```

### Dedicated page digunakan untuk

```text
Multi-item material planning
Alternative part assessment
Traceability investigation
Component installation/removal reconciliation
Loan/borrow transaction
Repair order
```

### Action gate

Part hanya dapat di-reserve sebagai eligible jika:

```text
Serviceable
Applicable
Traceability complete
Certificate acceptable
Shelf life valid
Life remaining valid
Receiving inspection passed
Not quarantined
```

---

## 6.2 Tools & GSE

### Konten

```text
Required Tools by Job Card
Availability
Reservation
Issue/Return
Calibration
Serviceability
Alternative Tools
Out-of-Tolerance Cases
```

### Drawer diperbolehkan untuk

```text
Assign eligible replacement tool
Reserve GSE
View calibration status
Reassign tool owner
```

### Dedicated page digunakan untuk

```text
Out-of-tolerance investigation
Calibration management
Complex tool substitution
Tool accountability reconciliation
```

---

## 6.3 Personnel & Shift

### Konten

```text
Required Skills
Current Assignment
Authorization Eligibility
Training and Recency
Shift Coverage
Inspector Availability
Certifying Staff Availability
Handover Status
```

### Drawer diperbolehkan untuk

```text
Assign satu eligible technician
Assign inspector
Replace invalid assignment
View authorization summary
```

### Dedicated page digunakan untuk

```text
Multi-shift manpower planning
Workload balancing
Authorization investigation
Fatigue/workload mitigation
Complex reassignment
```

---

## 6.4 Facility & Capability

### Konten

```text
AMO Certificate
Rating
Capability
Station/Location Approval
Hangar/Workshop Availability
Environmental Requirements
Special Facility
Work-Away Authority
```

Tidak ada dropdown yang membiarkan planner mengabaikan capability.

Jika capability tidak sesuai:

```text
FACILITY & CAPABILITY · BLOCKED
Work Package cannot start at this location.
```

---

# 7. Technical Records

## Tujuan halaman

Memastikan record package lengkap, konsisten, dapat ditelusuri, dan siap untuk release review.

## Konten utama

```text
Records Completeness
Job Card Record Status
Signatures
Inspection Records
Component Transactions
Aircraft Configuration
FH/FC Reconciliation
AD/SB/LLP Update
MEL/CDL Update
Supporting Certificates
Provider Records
Amendments
Sync and Integrity
```

## Halaman daftar Records Review

Setiap deficiency mempunyai:

```text
Problem
Affected record
Operational impact
Owner
Required action
Evidence required
Status
```

## Configuration Reconciliation page

Digunakan untuk:

- component installation/removal;

- serial-position conflict;

- configuration changes;

- modification embodiment;

- repair configuration;

- part effectivity.

## Amendment page

Digunakan untuk signed record correction:

```text
Original value
Proposed value
Reason
Affected signature
Reviewer
Re-sign requirement
Audit history
```

## Action yang tersedia

```text
Request Record Correction
Accept Record
Reconcile Configuration
Reconcile Utilization
Submit Amendment
Review Supporting Evidence
Accept Record Package
```

`Accept Record Package` hanya tersedia setelah seluruh mandatory deficiency clear.

---

# 8. Inspection & Release

Kelompok ini mempunyai dua dedicated page.

---

## 8.1 Inspection Workspace

## Tujuan

Mengelola:

```text
In-Process Inspection
Required Inspection
Independent Inspection
Functional Test Witness
Reinspection
Final Inspection
```

## Konten

```text
Inspection Queue
Assigned Inspector
Authorization and Independence
Execution Evidence
Measurements
Technical Data Revision
Inspection Result
Rejected Items
Rework
Reinspection
```

## Action

```text
Accept Inspection
Reject — Rework Required
Unable to Verify
Request Engineering Review
```

Jika rejected:

```text
Job Card → REWORK_REQUIRED
Execution → RETURNED
Inspection → BLOCKED
```

Inspection lama tetap dipertahankan.

---

## 8.2 Technical Release page

Technical Release mempunyai halaman sendiri karena:

- action bersifat safety-critical;

- membutuhkan fokus;

- memerlukan runtime authorization;

- menggunakan controlled statement;

- menghasilkan immutable release record.

## Konten

```text
Aircraft Identity
Work Package Identity and Revision
Release Decision
Release Gate Results
Completed Work Summary
Open Defects
Open MEL/CDL
Operational Limitations
Inspection Summary
Technical Records Acceptance
Configuration Summary
Signer Authorization
Controlled Release Statement
```

## Action

```text
Return for Technical Correction
Return for Record Correction
Reject Release
Authenticate and Issue Technical Release
```

Tidak boleh ada tombol:

```text
Approve
Complete
Finish
```

## Release gate

```text
All mandatory work signed
Required inspections accepted
Findings dispositioned
Rework complete
MEL/CDL valid
Material traceability complete
Configuration reconciled
Technical Records accepted
Signer authorized
No critical sync conflict
```

---

# 9. Aturan drawer

Drawer hanya dipakai jika aktivitas memenuhi seluruh ketentuan:

```text
Satu objek utama
Satu keputusan atau command
Tidak membutuhkan workflow bercabang
Tidak membutuhkan perbandingan banyak record
Tidak membutuhkan technical disposition
Tidak menghasilkan technical release
Tidak membutuhkan multi-role sign-off
Context aircraft tetap dapat terlihat
```

## Drawer yang ditetapkan

| Drawer                | Fungsi                                         |
| --------------------- | ---------------------------------------------- |
| Review Blocker        | Melihat impact, owner, source rule, evidence   |
| Assign Owner          | Menugaskan personel pada required action       |
| Reserve Material      | Reservasi satu stock item yang sudah eligible  |
| Assign Tool           | Menetapkan satu replacement tool yang valid    |
| Assign Personnel      | Menetapkan satu personel eligible              |
| Add Finding           | Initial finding capture                        |
| Activity              | Melihat audit/activity timeline                |
| Quick Document Review | Melihat revision, applicability, exact section |
| Handover Review       | Membaca dan accept/reject handover             |
| Evidence Review       | Melihat evidence untuk satu requirement        |

## Drawer tidak digunakan untuk

- defect assessment;

- engineering disposition;

- MEL/CDL deferral;

- Job Card execution;

- non-routine execution;

- inspection;

- records reconciliation;

- signed-record amendment;

- technical release.

---

# 10. Aturan dedicated page

Dedicated page wajib digunakan ketika aktivitas:

- terdiri dari beberapa tahap;

- membutuhkan source technical data;

- membutuhkan evidence kompleks;

- membutuhkan measurement;

- dapat menghasilkan finding atau rework;

- membutuhkan authorization;

- membutuhkan signature;

- memengaruhi aircraft configuration;

- memengaruhi airworthiness atau release;

- memerlukan perbandingan beberapa record;

- dapat berlangsung lintas shift.

| Pekerjaan                      | Dedicated page       |
| ------------------------------ | -------------------- |
| Job Card execution             | Execution/Job Card   |
| Finding assessment             | Findings/Assessment  |
| Non-routine work               | Non-Routine Job Card |
| MEL/CDL assessment             | Defect/MEL workspace |
| Engineering review             | Technical Validation |
| Multi-item material planning   | Resources/Material   |
| Out-of-tolerance investigation | Resources/Tools      |
| Inspection                     | Inspection Workspace |
| Records reconciliation         | Technical Records    |
| Signed record correction       | Amendments           |
| Technical release              | Release page         |

---

# 11. Role ownership

| Subpage               | Primary owner                           | Supporting role                        |
| --------------------- | --------------------------------------- | -------------------------------------- |
| Overview & Readiness  | Maintenance Planner/Maintenance Control | Seluruh domain owner                   |
| Execution             | Production Supervisor                   | Technician, Engineering                |
| Job Card              | Assigned Technician                     | Inspector, Engineering                 |
| Findings              | Engineering/Maintenance Control         | Technician, Inspector                  |
| Non-Routine           | Production Supervisor                   | Technician, Engineering                |
| Materials             | Stores Supervisor                       | Procurement, Engineering               |
| Tools & GSE           | Tool Control                            | Production Supervisor                  |
| Personnel             | Production Supervisor                   | Quality/Authorization Admin            |
| Facility & Capability | Quality/AMO Management                  | Planner                                |
| Technical Records     | Technical Records                       | Engineering, Stores                    |
| Inspection            | Inspector                               | Technician, Engineering                |
| Technical Release     | Certifying Staff                        | Technical Records, Maintenance Control |

Role yang bukan owner tetap dapat memperoleh read-only access sesuai policy.

---

# 12. Navigation dan page guard

Setiap route melakukan pemeriksaan:

```text
Aircraft ID match
Work Package ID match
Current user permission
Current state allows access
Work Package revision current
Data freshness sufficient
Sync state acceptable
```

## Jangan menyembunyikan future stage

Technical Release page tetap boleh terlihat dalam navigasi sebelum ready, tetapi tampil locked:

```text
TECHNICAL RELEASE
Unavailable

Entry criteria not met:
• Execution incomplete
• 2 inspections pending
• Technical Records not accepted
```

Dengan demikian user memahami proses berikutnya tanpa dapat melewatinya.

---

# 13. Unsaved-work protection

Saat user berpindah subpage dan ada data belum tersimpan:

```text
UNSAVED TECHNICAL DATA

Measurement pada JC-031 belum tersimpan.
Leaving this page will discard the current entry.

[Stay on Job Card]
[Discard Draft]
```

Untuk draft yang sudah disimpan lokal:

```text
Saved locally
Pending synchronization
```

Jangan menggunakan pesan generik:

```text
Are you sure?
```

---

# 14. Cross-page deep linking

Setiap blocker harus menuju objek spesifik.

```text
Material blocker
→ /resources/materials?issue=MAT-018

Inspection blocker
→ /inspection?inspection=INSP-044

Job Card blocker
→ /execution/job-cards/JC-031?step=5

Record deficiency
→ /records?deficiency=REC-029
```

Saat user kembali, sistem mempertahankan:

- filter sebelumnya;

- selected issue;

- scroll position;

- originating action;

- aircraft dan Work Package context.

---

# 15. Figma frame yang harus dibuat

## Global frames

```text
WP-Overview-Desktop
WP-Overview-Tablet
WP-Drawer-Blocker
WP-Drawer-Activity
```

## Execution

```text
WP-Execution-Queue
WP-JobCard-InProgress
WP-JobCard-Paused
WP-JobCard-AwaitingInspection
WP-JobCard-Rework
WP-JobCard-Offline
```

## Findings

```text
WP-Findings-Queue
WP-Finding-Capture-Drawer
WP-Finding-Assessment
WP-NonRoutine-Execution
```

## Resources

```text
WP-Resources-Material
WP-Resources-Tools
WP-Resources-Personnel
WP-Resources-Capability
WP-Reserve-Material-Drawer
WP-Assign-Personnel-Drawer
```

## Records

```text
WP-Records-Review
WP-Configuration-Reconciliation
WP-Record-Amendment
```

## Inspection dan Release

```text
WP-Inspection-Queue
WP-Inspection-Review
WP-Inspection-Rejected
WP-Release-Blocked
WP-Release-Eligible
WP-Release-Authentication
WP-Release-Issued
```

---

# 16. UAT navigasi dan pemisahan halaman

| Skenario                                          | Hasil                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| User berpindah Overview ke Execution              | Aircraft dan Work Package context tetap sama                     |
| User membuka blocker Job Card                     | Masuk ke Job Card dan step yang tepat                            |
| User menambah finding melalui drawer              | Finding tersimpan `UNDER ASSESSMENT`                             |
| User mencoba menilai finding di drawer            | Dialihkan ke Assessment page                                     |
| User reserve satu eligible part                   | Dapat dilakukan melalui drawer                                   |
| Reservasi memerlukan alternatif/transfer kompleks | Dialihkan ke Material page                                       |
| User membuka inspection                           | Dedicated Inspection page tersedia                               |
| Inspection rejected                               | Execution ditandai returned dan rework dibuat                    |
| User membuka Technical Release terlalu awal       | Page read-only dengan entry criteria yang gagal                  |
| Records belum accepted                            | Release action tidak tersedia                                    |
| User berpindah aircraft saat drawer terbuka       | Action dihentikan karena context mismatch                        |
| User mengakses route tanpa authorization          | Read-only atau access denied sesuai policy                       |
| Tablet portrait                                   | Navigation berubah menjadi menu ringkas tanpa kehilangan context |
| Unsaved measurement saat pindah page              | Navigation guard muncul                                          |
| Data baru tersimpan lokal                         | Status menunjukkan pending sync                                  |
| Drawer ditutup                                    | Subpage dan scroll position tidak berubah                        |

---

# Keputusan akhir

Arsitektur halaman final adalah:

```text
Work Package
├── Overview & Readiness
│   └── Decision dan koordinasi
├── Execution
│   └── Controlled Job Card execution
├── Findings & Non-Routine
│   └── Assessment dan additional work
├── Resources
│   └── Material, tools, personnel, capability
├── Technical Records
│   └── Evidence dan reconciliation
└── Inspection & Release
    ├── Independent verification
    └── Authorized technical release
```

Prinsip implementasinya:

```text
Drawer = triage dan quick action
Dedicated page = controlled technical work
```

Dengan pemisahan ini, satu halaman tidak lagi menjadi dashboard, planner, execution form, inspection desk, records office, dan release screen sekaligus. Setiap role memperoleh ruang kerja yang sesuai, sementara aircraft context, blocker, workflow stage, dan release decision tetap konsisten di seluruh Work Package.
