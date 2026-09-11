# Riset Gabungan: Operational Workflow + Approved Maintenance Data

Saya gabungkan dua kebutuhan ini karena dalam sistem MRO keduanya tidak boleh dipisahkan:

> **Workflow menjelaskan siapa melakukan apa. Approved maintenance data menjelaskan pekerjaan tersebut dilakukan berdasarkan sumber teknis apa.**

Saya belum benar-benar mewawancarai personel PT AMA atau melihat manual internalnya. Karena itu, keputusan di bawah merupakan **target operating model berbasis regulasi, human-factors guidance, dan pola produk MRO komersial**, yang masih harus divalidasi melalui observasi lapangan, AAMP, GMM, AMO Manual, authorization matrix, serta prosedur operator.

---

# 1. Keputusan desain yang paling masuk akal

Sistem MRO sebaiknya dibangun menjadi tiga workspace yang saling terhubung:

```text
1. Maintenance Control & Work Package Overview
   Untuk status pesawat, planning, blocker dan koordinasi.

2. Maintenance Execution
   Untuk technician, inspector, job card, finding dan sign-off.

3. Engineering & Approved Maintenance Data
   Untuk document control, applicability, revision, AD/SB/EO dan task authoring.
```

Jangan membuat satu halaman besar yang mencoba menangani planning, pengerjaan, document review, inspection, technical records, dan release sekaligus.

Arsitektur informasinya:

```text
Aircraft
└── Maintenance Event / Work Package
    ├── Overview & Readiness
    ├── Work Execution
    ├── Findings & Non-Routine
    ├── Resources
    ├── Technical Records
    ├── Inspection & Release
    └── Approved Data References
```

Satu hal yang harus konsisten pada seluruh halaman adalah:

```text
Aircraft
Work Package
Current Status
Current Station
Applicable Configuration
Frozen Technical Data Revision
Last Sync
Release Eligibility
```

---

# 2. Temuan utama dari regulasi dan produk pembanding

EASA Part-145 mewajibkan organisasi menggunakan **maintenance data yang applicable dan current**. Organisasi juga perlu mengendalikan amendment status serta memastikan revisi terus diterima dan diverifikasi. Maintenance data memengaruhi kemampuan organisasi melakukan maintenance dan tidak boleh hanya diperiksa pada saat dokumen kebetulan dibuka oleh technician. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/approvals-and-standardisation-docs-syllabi-Syllabus_Part145_General_081027.pdf?utm_source=chatgpt.com 'Part-145 - EASA'))

EASA juga menempatkan shift/task handover, production planning, maintenance error detection, maintenance-data discrepancy reporting, record-system control, critical maintenance tasks, dan work away from approved location sebagai prosedur organisasi yang berbeda tetapi saling terhubung. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/amc_gm_to_part-145_-_issue_2_amendment_5.pdf 'AMC & GM to Part-145 — Issue 2, Amendment 5'))

FAA Human Factors Guide merekomendasikan empat unsur handover yang efektif:

- pertemuan handover;

- walkthrough bersama;

- checklist;

- penanda status pekerjaan.

Artinya, fitur handover tidak cukup hanya berupa kolom “catatan shift”.

Pada software komersial, pola yang terlihat adalah:

- IFS Maintenix memisahkan pekerjaan berdasarkan role seperti planner, technician, technical records, engineer, material controller, QC inspector, dan maintenance controller.

- AMOS menghubungkan OEM document library dengan work instruction, template, dan job card.

- Ramco menekankan digital task card, mobile execution, e-sign-off, visibility pekerjaan, dan offline maintenance.

- TRAX mengintegrasikan engineering, planning, production, inventory, quality, documentation, dan technical records dalam satu lifecycle. ([IFS Documentation](https://docs.ifs.com/maintenix/25r1/Operator/enduser/role_pages/AM_shop_technician.html?utm_source=chatgpt.com 'Shop Maintenance Technician'))

---

# 3. Operational workflow per role

## Ringkasan tanggung jawab yang direkomendasikan

| Role                      | Fokus utama                                            | Tidak seharusnya dilakukan                                            |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| Maintenance Planner       | Workscope, schedule, resource readiness                | Menyetujui technical release hanya karena pekerjaan terjadwal selesai |
| Technician/Mechanic       | Melaksanakan task dan mencatat hasil                   | Mengubah sumber teknis atau applicability                             |
| Certifying Staff          | Menentukan dan menandatangani release sesuai authority | Menyetujui pekerjaan di luar scope authorization                      |
| Inspector/Quality Control | Inspection dan independent verification                | Mengubah pekerjaan menjadi passed tanpa evidence                      |
| Maintenance Control       | Aircraft technical status dan koordinasi operasional   | Meng-override release hanya karena penerbangan mendesak               |
| Technical Records         | Kelengkapan, configuration, utilization dan archival   | Membuat technical disposition                                         |
| Material/Stores           | Eligibility, traceability, reservation dan issue       | Menganggap part eligible hanya karena stok tersedia                   |
| Tool Control              | Tool availability, serviceability dan calibration      | Mengizinkan calibrated tool expired digunakan                         |
| Engineering               | Applicability, AD/SB, EO, repair disposition           | Melakukan sign-off execution tanpa authority yang sesuai              |
| Operations Control        | Operational impact, schedule dan restriction           | Mengubah maintenance blocker menjadi acceptable                       |

Pembagian ini harus disesuaikan lagi dengan organisasi, manual, lisensi dan authorization matrix operator.

---

## 3.1 Maintenance Planner

### Informasi pertama yang harus dilihat

```text
Aircraft technical status
Upcoming due FH/FC/calendar
Open defects dan MEL/CDL
Maintenance opportunity/window
Workscope draft
Resource readiness
Material shortages
Tool shortages
Personnel skills/authorization
Previous incomplete work
```

IFS mendokumentasikan fungsi planner seperti membuat work package, menjadwalkannya ke lokasi maintenance, melakukan reservation/request parts, mengecek availability, menghasilkan workscope, mengubah committed workscope dan mengelola scheduled-maintenance deferral. ([IFS Documentation](https://docs.ifs.com/maintenix/24r2/Operator/enduser/role_pages/AM_line_maintenance_planner.html 'Line Maintenance Planner'))

### Apa yang membuat pekerjaan berhenti

- AAMP task belum tervalidasi.

- Technical data belum current.

- Applicability belum dapat dipastikan.

- Part tidak tersedia atau tidak eligible.

- Tool tidak tersedia atau calibration expired.

- Personel dengan skill/authorization yang dibutuhkan tidak tersedia.

- Maintenance location tidak memiliki capability.

- Aircraft belum tersedia pada maintenance window.

- Workscope berubah setelah commitment tanpa approval.

### UI paling masuk akal

Planner membutuhkan:

```text
Planning Board
├── Due Forecast
├── Maintenance Opportunities
├── Workscope Builder
├── Resource Readiness
├── Conflict List
└── Commit Workscope
```

Planner tidak membutuhkan full technical-document viewer sepanjang waktu, tetapi harus melihat:

```text
Source validated
Revision current
Applicability confirmed
Engineering review required
```

---

## 3.2 Technician atau Mechanic

### Informasi pertama yang harus dilihat

Technician sebaiknya langsung melihat:

```text
Assigned to Me
Aircraft and exact location
Task priority
Safety precautions
Current task step
Exact technical-data revision
Required parts/tools
Inspection requirement
Previous handover
Offline/sync state
```

Pada IFS, task/job card membawa work instructions, required labor skills, parts, tools, steps, technical references dan sign-off. Technician juga dapat mencatat start, stop, partial completion, job stop, step status, dan work completion. ([IFS Documentation](https://docs.ifs.com/maintenix/24r2/Operator/enduser/Engineering_TechRecords/task_definitions/c_job_card_definitions.html?utm_source=chatgpt.com 'Job card definitions'))

### Apa yang membuat pekerjaan berhenti

- Aircraft atau component identification tidak cocok.

- Source reference tidak tersedia.

- Revision telah superseded.

- Applicability tidak cocok.

- Required panel/access belum dibuka.

- Part atau tool belum tersedia.

- Safety condition belum dipenuhi.

- Nilai hasil pemeriksaan di luar limit.

- Muncul defect baru.

- Task membutuhkan engineering disposition.

- Task membutuhkan inspector atau independent inspection.

- Handover sebelumnya tidak jelas.

### Halaman execution

```text
Job Card Header
├── Aircraft / Component
├── Job Card Number
├── Task source and exact revision
├── Applicability
├── Safety and prerequisites
├── Parts, tools and personnel
├── Step-by-step execution
├── Measurements and tolerances
├── Findings
├── Attachments
├── Technician sign-off
└── Inspection sign-off
```

Job card harus mendukung:

- `Start`

- `Pause / Job Stop`

- `Resume`

- `Raise Finding`

- `Request Engineering`

- `Request Inspection`

- `Complete Work`

- `Sign`

Bukan hanya checkbox “Done”.

---

## 3.3 Certifying Staff

### Informasi pertama yang harus dilihat

```text
Aircraft release status
Workscope completion
Open job cards
Open findings
Deferred defects
MEL/CDL validity
Inspection completion
Technical-record completeness
Configuration changes
Authorization eligibility
Synchronization conflicts
```

Completion work package yang mengembalikan pesawat ke service membawa konsekuensi airworthiness; dalam dokumentasi IFS, signature saat completion untuk aircraft returning to service menyatakan aircraft airworthy. ([IFS Documentation](https://docs.ifs.com/maintenix/25r1/Operator/enduser/Heavy_Maintenance/tasks_and_non_routines/c_workpackage_complete_release_to_service.html?utm_source=chatgpt.com 'Completing work packages'))

### Release gate

Certifying staff hanya boleh dapat memilih `Release` ketika:

```text
All mandatory work completed
Required inspections signed
All findings dispositioned
Deferred defects valid
MEL/CDL procedures completed
Configuration updated
Installed parts eligible
Tool/calibration controls passed
Technical records complete
No critical offline conflict
Certifying staff authorization valid
```

UI harus menunjukkan **mengapa release tidak bisa dilakukan**, bukan hanya menonaktifkan tombol.

---

## 3.4 Inspector / Quality Control

### Informasi pertama yang harus dilihat

```text
Inspection Queue
Independent Inspection Required
Critical Maintenance Tasks
Rework Required
Measurements and tolerances
Technician identity
Technical-data revision
Evidence and attachments
```

IFS mendukung certification dan independent inspection pada tingkat labor atau task step, termasuk pemisahan personel yang melaksanakan dan melakukan independent inspection. ([IFS Documentation](https://docs.ifs.com/maintenix/25r1/Operator/enduser/Engineering_TechRecords/job_card_definitions/t_adding_task_steps_to_JIC_and_Executable_Requirements_Definitions.html?utm_source=chatgpt.com 'Add task steps to job card and executable requirement definitions'))

### Keputusan inspector

```text
Accepted
Rejected — Rework Required
Unable to Inspect
Engineering Review Required
Inspection Deferred by Approved Procedure
```

Inspector tidak seharusnya hanya memiliki tombol `Pass/Fail`. Saat reject, harus ada:

- langkah yang ditolak;

- reason;

- evidence;

- required rework;

- reference;

- person responsible;

- reinspection requirement.

---

## 3.5 Maintenance Control

Maintenance Control berfungsi sebagai **control tower**, bukan executor seluruh proses.

### Informasi pertama

```text
Fleet technical status
AOG and grounded aircraft
Open critical defects
MEL/CDL expiry
Active maintenance events
Estimated return to service
Station capability
Parts/logistics blockers
Maintenance escalation
Flight impact
```

### Wewenang yang masuk akal

Maintenance Control dapat:

- membuka maintenance event;

- menetapkan priority;

- mengoordinasikan planner, engineering, station dan operations;

- mengubah technical operational status berdasarkan proses yang sah;

- mengeskalasi blocker;

- memantau estimated return to service.

Maintenance Control tidak boleh menghapus blocker atau memberikan release hanya karena kebutuhan jadwal.

---

## 3.6 Technical Records

### Informasi pertama

```text
Pending record review
Missing signatures
Missing attachments
Aircraft FH/FC discrepancies
Component configuration mismatch
Installation/removal mismatch
Open record corrections
Work packages awaiting archival
AD/SB compliance record update
```

IFS memposisikan technical records untuk configuration correction, deadline correction, flight records, technical incidents, inventory lock/unlock dan koordinasi aircraft records. Technical records mencakup condition, usage, work performed, component removal dan installation. ([IFS Documentation](https://docs.ifs.com/maintenix/25r1/Operator/enduser/role_pages/AM_technical_records.html 'Technical Records'))

### Keputusan penting

Technical Records boleh menyatakan:

```text
Record Complete
Record Incomplete
Correction Required
Configuration Conflict
Awaiting Supporting Evidence
```

Namun Technical Records tidak seharusnya membuat engineering disposition atau menyatakan pekerjaan teknis benar hanya berdasarkan kelengkapan form.

---

## 3.7 Material / Stores

### Informasi pertama

```text
Demand by work package
Critical shortages
Reserved parts
Pending receiving inspection
Quarantined parts
Shelf-life expiry
Traceability gaps
Part applicability
Loan/borrowed parts
```

### Tidak cukup dengan status “Available”

Status yang lebih tepat:

```text
Available and Eligible
Available — Inspection Pending
Available — Not Applicable
Reserved
Issued
Installed
Quarantine
Unserviceable
Shelf-Life Expired
Traceability Incomplete
```

Material tersedia secara fisik belum tentu boleh dipasang.

---

## 3.8 Tool Control

### Informasi pertama

```text
Required tools by work package
Tool availability
Checked-out tools
Expected return
Calibration due
Calibration expired
Tool fault
Alternative tool approval
```

IFS memisahkan tracking serial/barcode, check-out/check-in, expected-return monitoring dan calibration task scheduling untuk tool. ([IFS Documentation](https://docs.ifs.com/maintenix/24r2/Operator/enduser/Supply_Chain/tool_management/c_tool_control.html 'Tools'))

Tool yang calibration-nya kedaluwarsa harus menjadi blocker:

```text
Unavailable for Maintenance Use
```

Bukan sekadar warning kecil.

---

## 3.9 Engineering

### Informasi pertama

```text
New AD/SB revisions
Applicability review queue
Technical-data revision impact
Engineering assistance requests
Repair requests
Repeat defects
Non-routine findings
Configuration conflicts
Proposed engineering orders
```

IFS mendokumentasikan peran engineer untuk aircraft/configuration definition, part definition, AD/SB activation, engineering order dan supersession/revision management. ([IFS Documentation](https://docs.ifs.com/maintenix/25r1/Operator/enduser/role_pages/AM_system_engineer.html 'System Engineer'))

### Engineering workflow

```text
Technical Request Received
→ Data Review
→ Aircraft Configuration Review
→ Applicability Determination
→ Technical Disposition Draft
→ Independent/Quality Review
→ Approval
→ EO/Repair Instruction Released
→ Execution
→ Embodiment Confirmation
→ Configuration Update
```

Engineering harus menjadi pemilik keputusan seperti:

- document applicable atau tidak;

- damage within SRM limit atau tidak;

- repair data yang digunakan;

- AD/SB applicability;

- alternative part/tool acceptance bila prosedur memungkinkan;

- technical deviation;

- EO atau modification instruction.

---

## 3.10 Operations Control

### Informasi pertama

```text
Aircraft available/unavailable
Release estimate
Operational restriction
MEL/CDL operational procedure
Flight impact
Replacement aircraft
Station restriction
Next update time
```

Operations Control sebaiknya hanya melihat ringkasan yang dapat dipercaya:

```text
PK-XXX
Status: Maintenance
Release estimate: 16:30 WIT
Confidence: Medium
Blocker: Hydraulic filter unavailable
Next update: 14:00 WIT
```

Operations tidak perlu melihat seluruh langkah task card kecuali diberikan read-only access untuk kebutuhan koordinasi.

---

# 4. Handover shift yang masuk akal

Handover harus menjadi workflow formal, bukan chat atau textarea bebas.

## Data handover minimum

```text
Aircraft/component
Work package/job card
Outgoing person
Incoming person
Current task step
Completed steps
Incomplete step and exact condition
Panels/access opened
Components removed
Temporary installations
Tools still in use
Safety devices/locks/tags
Measurement already taken
Open findings
Engineering requests
Inspection pending
Next required action
Relevant technical-data revision
Photos/evidence
Date/time
```

## Alur

```text
Outgoing technician creates handover
→ Supervisor reviews
→ Walkthrough where required
→ Incoming technician reads
→ Incoming technician accepts
→ Task ownership transferred
```

Status:

```text
Draft Handover
Ready for Review
Walkthrough Required
Accepted by Incoming Shift
Rejected — Information Incomplete
```

Handover yang belum diterima harus terlihat sebagai blocker untuk melanjutkan step sensitif.

---

# 5. Ketika jaringan terputus

Untuk konteks station pedalaman, keputusan paling masuk akal adalah:

## Offline diperbolehkan untuk

- melihat assigned work;

- melihat controlled document package yang sudah diunduh;

- mencatat work progress;

- mengisi measurement;

- menambah finding;

- mengambil foto;

- membuat handover;

- melakukan local sign-off tertentu bila prosedur dan regulator mengizinkan.

## Offline tidak otomatis diperbolehkan untuk

- mengaktifkan technical-data revision baru;

- mengubah applicability;

- mengeluarkan engineering order;

- mengubah authorization;

- melakukan final technical release bila validasi server diperlukan;

- menyelesaikan conflict secara otomatis.

Ramco secara publik mendokumentasikan digital task cards, mobile execution, e-sign-off dan offline maintenance capability. Namun penerapan offline sign-off tetap harus mengikuti prosedur operator dan acceptance regulator yang applicable. ([Ramco Systems](https://www.ramco.com/press-release/ornge-paperless-maintenance-ramco-digital-task-card "Ornge achieves paperless maintenance operations with Ramco's Digital Task Card and Mobile Apps"))

Gunakan status yang jujur:

```text
Saved Locally
Pending Sync
Synced
Sync Failed
Conflict Detected
Server Validation Rejected
```

Jangan menampilkan `Completed` ketika data baru tersimpan di tablet.

---

# 6. Koreksi setelah data ditandatangani

Record yang telah ditandatangani jangan dapat diubah diam-diam.

Gunakan workflow:

```text
Signed Record
→ Correction Requested
→ Reason Entered
→ Corrected Value Proposed
→ Authorized Review
→ Re-sign if meaning changes
→ Amendment Issued
```

Simpan:

- original value;

- corrected value;

- reason;

- requester;

- reviewer;

- time;

- affected signature;

- new revision;

- audit trail.

FAA AC 120-78B memberikan guidance aktif mengenai electronic signature, electronic recordkeeping dan electronic manuals untuk records seperti maintenance records, maintenance task cards dan airworthiness release. Ini dapat menjadi benchmark, tetapi bukan pengganti prosedur dan acceptance DGCA Indonesia. ([Federal Aviation Administration](https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1043396?utm_source=chatgpt.com 'AC 120-78B - Electronic Signatures, Electronic Recordkeeping, and Electronic Manuals'))

---

# 7. End-to-end maintenance workflow yang direkomendasikan

```text
1. Maintenance Demand Intake
   Due task, defect, AD/SB, modification atau inspection.

2. Technical Validation
   Current data, applicability, configuration dan authority.

3. Workscope Draft
   Task, job card, estimated labor, location dan window.

4. Resource Readiness
   Material, tools, personnel, facility dan documents.

5. Workscope Commitment
   Scope dikunci dan exact document revisions di-freeze.

6. Execution
   Technician melakukan work step dan mencatat hasil.

7. Finding / Non-Routine
   Finding dinilai dan dibuat rectification/disposition.

8. Inspection
   Required inspection dan independent inspection.

9. Technical Records Review
   Completeness, configuration, utilization dan evidence.

10. Technical Release
    Certifying staff mengevaluasi semua release gate.

11. Close and Archive
    Record package dikunci, retained dan dapat diaudit.
```

---

# 8. Approved maintenance data: fungsi masing-masing dokumen

## 8.1 AMM — Aircraft Maintenance Manual

Fungsi utama:

- removal/installation;

- adjustment;

- servicing;

- inspection;

- testing;

- maintenance practice;

- troubleshooting reference tertentu.

Pada task execution, tampilkan:

```text
AMM 29-11-00-710-801
Revision 42
Effective 12 Aug 2026
Applicable to MSN 1234
Section available offline
```

---

## 8.2 IPC — Illustrated Parts Catalogue

Fungsi utama:

- identifikasi part;

- part number;

- assembly relationship;

- quantity;

- effectivity;

- interchangeability reference.

IPC sebaiknya digunakan untuk identifikasi dan effectivity part. Jangan memperlakukan ilustrasi IPC sebagai instruksi pemasangan lengkap kecuali approved procedure memang menyatakannya.

---

## 8.3 WDM — Wiring Diagram Manual

Fungsi:

- wiring diagrams;

- connector;

- wire identification;

- circuit relationship;

- routing dan system connection.

Task harus menghubungkan ke exact figure/sheet, bukan hanya “lihat WDM”.

```text
WDM 24-50-02
Figure 3
Sheet 2
Revision 31
```

---

## 8.4 SRM — Structural Repair Manual

Fungsi:

- damage definition;

- allowable damage limits;

- structural inspection;

- standard repair;

- material dan fastener requirements;

- repair limitation.

UI finding struktural harus mencatat:

```text
Damage location
Dimension
Measurement method
SRM section
Within limit / Outside limit
Repair selected
Engineering review
```

---

## 8.5 CMM — Component Maintenance Manual

Fungsi:

- component disassembly;

- cleaning;

- inspection;

- repair;

- assembly;

- testing;

- service limits.

CMM biasanya lebih relevan untuk component/shop maintenance daripada line task sederhana.

---

## 8.6 Maintenance Planning Document

Fungsi:

- sumber planning task;

- interval;

- threshold;

- applicability;

- maintenance-significant task;

- planning requirement.

MPD bukan otomatis sama dengan approved operator AAMP. Engineering harus mengolah sumber tersebut menjadi maintenance requirement yang sesuai program operator.

AMOS secara publik mendukung AMM, MMEL, TSM, IPC dan MPD task card dalam format seperti SGML, XML dan S1000D, lalu menjadikannya interactive object yang dapat digunakan untuk membuat work instruction, template dan job card. ([Swiss AS](https://www.swiss-as.com/news/asiana-airlines-goes-live-amos 'Asiana Airlines goes live with AMOS | Swiss AS'))

---

## 8.7 Task Card / Job Card

Fungsi:

- mengubah maintenance requirement menjadi executable work;

- memberikan langkah;

- menetapkan skill;

- parts;

- tools;

- inspection;

- signature.

IFS membedakan task definition dan job card; job card berisi instructions, skills, parts, tools, estimated duration dan sign-off. ([IFS Documentation](https://docs.ifs.com/maintenix/25r1/Operator/enduser/Engineering_TechRecords/task_definitions/c_task_definitions_overview.html?utm_source=chatgpt.com 'Task definitions'))

Task card harus mengacu ke approved source, tetapi tidak boleh kehilangan identitas internalnya:

```text
Internal Job Card: JC-ATR-29-001
Source: AMM 29-11-00-710-801
Source Revision: 42
Internal Revision: 7
```

---

## 8.8 Engineering Order

Fungsi:

- instruksi engineering internal;

- embodiment of modification;

- compliance action;

- repair disposition;

- inspection tambahan;

- bridging atau special instruction.

EO harus mempunyai:

```text
EO number
Revision
Approval authority
Aircraft effectivity
Source documents
Work instructions
Required inspection
Configuration impact
Weight and balance impact
Records impact
```

---

## 8.9 Airworthiness Directive

AD adalah requirement regulator yang perlu dikendalikan untuk:

- applicability;

- compliance method;

- effective date;

- initial threshold;

- repetitive interval;

- terminating action;

- alternative method bila approved;

- accomplishment evidence.

AD tidak sebaiknya hanya disimpan sebagai file PDF. Dibutuhkan structured compliance record.

---

## 8.10 Service Bulletin

SB berasal dari design approval holder/manufacturer dan biasanya mencakup:

- effectivity;

- reason;

- description;

- compliance recommendation;

- material;

- manpower;

- accomplishment instructions.

SB dapat berhubungan dengan AD, maintenance program, modification atau keputusan operator. Sistem harus dapat menghubungkan:

```text
SB
→ Engineering Assessment
→ Applicability
→ Operator Decision
→ EO/Task
→ Embodiment
→ Configuration Record
```

---

## 8.11 Modification Instruction

Memuat langkah embodiment suatu modification dan dampaknya pada:

- aircraft configuration;

- part effectivity;

- maintenance program;

- W&B;

- electrical load;

- manuals;

- placards;

- training;

- technical records.

Modification tidak dianggap selesai hanya karena physical work selesai. Configuration dan records juga harus diperbarui.

---

## 8.12 Approved Repair Data

Digunakan untuk repair yang tidak cukup ditangani oleh standard repair yang sudah tersedia atau memerlukan data khusus.

UI harus membedakan:

```text
SRM Standard Repair
OEM Repair Approval
Engineering Approved Repair
Authority-Approved Data
Previously Approved Repair
```

FAA AC 43.13-1B, misalnya, hanya menyediakan acceptable methods untuk kondisi tertentu ketika manufacturer instructions tidak tersedia dan bukan pengganti universal atas approved repair data. ([Federal Aviation Administration](https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentid/99861?utm_source=chatgpt.com 'AC 43.13-1B - Acceptable Methods, Techniques, and ...'))

---

# 9. Jangan menggunakan satu status untuk semuanya

Ini keputusan desain yang sangat penting.

Dokumen harus mempunyai paling sedikit **tiga dimensi status**.

## A. Document-control status

```text
Received
Under Review
Active / Current
Superseded
Withdrawn
Obsolete
```

## B. Approval/source status

```text
Authority Issued
OEM Issued
Approved
Accepted
Customer Supplied
Pending Verification
Unverified
```

## C. Aircraft-applicability status

```text
Applicable
Conditionally Applicable
Not Applicable
Applicability Unresolved
Configuration Data Missing
```

Contoh:

```text
AMM Revision 42
Document status: Current
Source status: OEM Issued
Aircraft applicability: Not Applicable to MSN 1234
```

Dokumen bisa current secara global tetapi **tidak applicable** untuk aircraft tertentu.

Sebaliknya, dokumen lama bisa merupakan revision yang memang dibekukan pada suatu work package, tetapi kemudian memerlukan impact review karena revision baru diterbitkan.

---

# 10. Data minimum untuk Approved Maintenance Data Registry

Field awal yang diberikan user sudah benar, tetapi belum cukup.

## Document master

```text
Document type
Document number
Title
Document owner/source
Manufacturer/design approval holder
Aircraft/component family
Format
Subscription/source system
```

## Revision

```text
Revision
Issue date
Effective date
Received date
Review date
Activation date
Superseded date
Superseded by
Temporary revision
Revision reason
Revision summary
```

## Applicability

```text
Aircraft type/model
MSN range
Registration
Engine/APU/propeller type
Part number
Serial range
Modification status
Configuration condition
Effectivity text
Machine-readable applicability rule
```

## Approval

```text
Approval type
Approval reference
Issuing authority
Approval date
Approval limitation
Reviewer
Approver
```

## Integrity dan access

```text
File checksum/hash
Storage location
Access rights
Offline availability
Offline package expiry
Controlled copy number
Distribution acknowledgment
```

## Task relationship

```text
Linked maintenance requirement
Linked job card
Exact section/task reference
Exact source revision
Applicability result
Applicability evidence
Snapshot/frozen copy
```

---

# 11. Cara menangani revision

## Prinsip yang direkomendasikan

Saat workscope masih draft:

```text
Gunakan latest approved/current revision.
```

Saat workscope sudah committed:

```text
Freeze exact revision yang digunakan.
```

Ketika revision baru diterima setelah commitment:

```text
New Revision Available
→ Impact Assessment Required
→ Engineering Review
→ Continue Existing Revision / Update Workscope / Cancel Task
```

Jangan mengganti revision pada active job card secara diam-diam.

IFS menampilkan revision history dan daftar job card dalam work package yang mempunyai revision lebih baru sehingga user dapat memutuskan apakah job card perlu diperbarui. Sistem tersebut juga menggunakan Build, Revision dan Active states pada job-card definition. ([IFS Documentation](https://docs.ifs.com/maintenix/25r1/Operator/enduser/Engineering_TechRecords/task_definitions/t_revising_task_definitions.html?utm_source=chatgpt.com 'Revise and activate task definitions'))

UI yang direkomendasikan:

```text
Source revision used: Rev 41
Latest active revision: Rev 42

⚠ New revision published after workscope commitment
Impact review: Pending
[Compare Revisions] [Request Engineering Review]
```

---

# 12. UI Technical Data Registry

## Halaman daftar dokumen

```text
Approved Maintenance Data

[Search document, section or task]

Filters:
Document Type
Aircraft Type
Revision Status
Applicability
Approval Status
Source
Effective Date
Review Status

--------------------------------------------------
AMM 29-11-00 | Rev 42 | CURRENT
Applicable to PK-ANI
Last verified 29 Aug 2026

SRM 53-20-11 | Rev 18 | CURRENT
Applicability unresolved for PK-ANB
Engineering review required

WDM 24-50-02 | Rev 30 | SUPERSEDED
Superseded by Rev 31
Not available for new work
```

---

## Document detail page

```text
AMM 29-11-00
Hydraulic Reservoir — Maintenance Practices

Status: Current
Revision: 42
Effective: 12 Aug 2026
Source: OEM
Applicability: ATR72 MSN 1000–1400
Approval basis: ICA / OEM Publication

Tabs:
Overview
Applicability
Revisions
Linked Tasks
Aircraft Impact
Distribution
Audit Trail
```

Primary actions berdasarkan role:

```text
Engineering:
[Review Revision] [Approve Applicability] [Create Job Card]

Planner:
[View Linked Tasks]

Technician:
[Open Controlled Section]

Technical Records:
[View Usage and Accomplishment]
```

---

# 13. Revision Impact Queue

Engineering membutuhkan halaman khusus:

```text
Revision Impact Queue

AMM Rev 41 → Rev 42
Affected aircraft: 4
Affected active work packages: 2
Affected job cards: 8
Change type: Procedure + Torque Value
Severity: Critical Review

[Compare] [Assign Reviewer] [Assess Impact]
```

Hasil review:

```text
No Operational Impact
Update Future Tasks Only
Update Active Workscope
Stop Work Immediately
Additional Inspection Required
Configuration Review Required
```

---

# 14. Maintenance-data discrepancy workflow

Karena teknisi dapat menemukan kesalahan atau ambiguitas dalam technical data, sediakan:

```text
Report Technical Data Issue
```

Data:

```text
Document
Revision
Section
Aircraft
Task
Description of ambiguity
Operational impact
Work stopped?
Suggested clarification
Evidence
```

Workflow:

```text
Reported
→ Engineering Review
→ Work May Continue / Stop Work
→ OEM/DAH Query
→ Temporary Instruction if Authorized
→ Response Received
→ Document/Task Updated
→ Closed
```

EASA Part-145 secara eksplisit memasukkan prosedur pemberitahuan inaccuracies dan ambiguities pada maintenance data kepada type-certificate holder sebagai bagian dari prosedur organisasi. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/amc_gm_to_part-145_-_issue_2_amendment_5.pdf 'AMC & GM to Part-145 — Issue 2, Amendment 5'))

---

# 15. Perbandingan pola software

| Produk                  | Pola yang terdokumentasi publik                                                                                                                           | Hal yang layak diadopsi                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **IFS Maintenix**       | Role separation, planning, job-card definitions, skills, technical references, certification, independent inspection, revisions, records dan tool control | Workflow dan authorization yang terstruktur               |
| **AMOS**                | OEM Document Library, structured OEM formats, interactive documents, creation of work instructions/templates/job cards                                    | Approved-data ingestion dan document-to-task traceability |
| **Ramco Aviation**      | Digital task card, mobile execution, e-sign-off, offline maintenance, near-real-time progress                                                             | Technician-first mobile dan offline execution             |
| **TRAX eMRO/eMobility** | Integration engineering, planning, production, inventory, quality, documentation, technical records dan role-specific applications                        | Unified data lifecycle dan cross-functional visibility    |

Sumber publik tidak cukup untuk menilai detail seluruh workflow, kualitas UX, biaya, atau implementasi tiap produk. Perbandingan ini hanya menunjukkan **pola kemampuan yang mereka publikasikan**, bukan ranking produk. ([Trax](https://www.trax.aero/en/products/ 'Products | TRAX'))

---

# 16. Keputusan untuk MANTIK/PT AMA

Pendekatan paling masuk akal bukan menyalin satu kompetitor secara penuh.

Gunakan kombinasi berikut:

## Dari IFS

- role-based workspace;

- task state machine;

- per-step sign-off;

- independent inspection;

- revision impact;

- technical-record separation.

## Dari AMOS

- central OEM/approved document registry;

- structured applicability;

- exact section reference;

- document-to-job-card authoring;

- structured document support dalam jangka panjang.

## Dari Ramco

- technician mobile workspace;

- digital task cards;

- offline execution;

- sync status yang jelas;

- real-time supervisor visibility.

## Dari TRAX

- satu lifecycle data dari engineering sampai records;

- integrasi planning, production, material, quality dan documentation;

- hindari data silo.

---

# 17. Prioritas implementasi

## P0 — fondasi keselamatan dan operasional

1. Aircraft configuration.

2. Approved maintenance data registry.

3. Document revision control.

4. Applicability determination.

5. Maintenance program dan due control.

6. Work package.

7. Digital job card.

8. Finding/non-routine.

9. Material dan tool readiness.

10. Technician/inspector sign-off.

11. Authorization validation.

12. Release blocker.

13. Technical-record package.

14. Audit trail.

15. Offline draft dan controlled document package.

## P1 — engineering dan compliance maturity

1. AD/SB assessment.

2. Engineering order.

3. Revision impact analysis.

4. Repair management.

5. Repeat defect.

6. MEL/CDL integration.

7. Configuration-change automation.

8. Formal handover.

9. Electronic-signature governance.

10. Provider/AMO capability validation.

## P2 — advanced digital MRO

1. Structured OEM data ingestion.

2. SGML/XML/S1000D support.

3. Automatic revision comparison.

4. Machine-readable applicability.

5. Reliability analytics.

6. Predictive planning.

7. Automated work-package optimization.

---

# Kesimpulan

Bentuk sistem yang paling masuk akal adalah:

> **Maintenance Control mengatur status dan koordinasi. Planner mengatur workscope. Engineering mengendalikan approved data dan applicability. Technician melaksanakan controlled task. Inspector melakukan verification. Technical Records memastikan evidence lengkap. Certifying Staff menentukan release. Operations hanya mengonsumsi status dan limitation.**

Sementara untuk approved maintenance data:

> **Setiap task harus mengikat exact document, exact revision, exact section, applicability result dan source approval.**

Kontrol terpenting yang harus dibangun adalah:

```text
Document Current?
Source Valid?
Applicable to Aircraft?
Correct Revision Frozen?
User Authorized?
Resources Eligible?
Work Executed?
Inspection Completed?
Records Complete?
Release Allowed?
```

Tanpa rantai tersebut, sistem hanya menjadi aplikasi task management. Dengan rantai tersebut, sistem mulai menjadi **controlled aviation maintenance system** yang dapat dipertanggungjawabkan secara operasional dan audit.
