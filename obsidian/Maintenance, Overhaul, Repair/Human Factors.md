# Riset Human Factors untuk Desain Sistem MRO Aviasi

## Kesimpulan utama

Dalam sistem MRO, **human factors tidak cukup diterapkan sebagai pelatihan atau tampilan yang “user-friendly”**. Human factors harus menjadi bagian dari:

- business rule;

- workflow;

- task design;

- authorization;

- production planning;

- interruption recovery;

- handover;

- error-capturing;

- technical record;

- release gating.

CASR untuk operasi Part 135 secara eksplisit menyatakan maintenance program harus dikembangkan dengan mempertimbangkan human-factor principles. DGCA melalui KP 067 Tahun 2018 juga menempatkan human factors sebagai bagian dari sistem pengelolaan human error yang mencakup personel pelaksana, supervisor, dan planner—bukan hanya teknisi.

---

# 1. Tingkat kepastian sumber

| Tingkat                               | Sumber                                        | Cara menggunakannya                                                                         |
| ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Utama untuk Indonesia**             | CASR dan Staff Instruction DGCA/JDIH Kemenhub | Baseline regulasi, manual, training, audit, dan prosedur operator Indonesia                 |
| **Benchmark regulator internasional** | EASA Part-145 AMC/GM                          | Acuan detail work card, fatigue, interruption, handover, critical task, dan error-capturing |
| **Benchmark human factors**           | FAA Maintenance Human Factors                 | Identifikasi penyebab maintenance error dan penyusunan program mitigasi                     |
| **Prinsip sistem keselamatan**        | ICAO Human Performance/SMS                    | Systems thinking, error tolerance, dan human-centred design                                 |
| **Baseline UI accessibility**         | W3C WCAG 2.2                                  | Warna, kontras, ukuran target, zoom, dan aksesibilitas antarmuka                            |

EASA saat ini mencantumkan **AMC & GM to Part-145 Issue 2 Amendment 9, 6 Juli 2026** dalam katalog resminya. Untuk formal compliance baseline, organisasi perlu menggunakan revisi terkini tersebut. Klausul human factors yang dirujuk dalam riset ini berasal dari publikasi resmi AMC/GM dan perlu dipetakan ulang terhadap amendment terkini pada saat regulatory traceability dibuat. ([EASA](https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/amc-gm-part-145-issue-2-amendment-9?utm_source=chatgpt.com 'AMC & GM to Part-145 — Issue 2, Amendment 9 - EASA'))

FAA, EASA, ICAO, dan WCAG bukan pengganti CASR atau approved manuals operator Indonesia. Mereka digunakan sebagai **authoritative design benchmark**, kecuali diwajibkan melalui approval, kontrak, lessor, customer, atau ketentuan lain yang applicable.

---

# 2. Apa saja risiko human factors yang harus ditangani?

DGCA KP 067 Tahun 2018 menyebut topik penting human factors maintenance, antara lain:

- human performance and limitations;

- lingkungan fisik dan sosial;

- dokumentasi pekerjaan dan sign-off;

- task, equipment, dan spare planning;

- komunikasi;

- teamwork dan leadership;

- shift/task turnover;

- undocumented maintenance;

- distraction;

- pressure;

- stress;

- fatigue dan fitness for duty;

- procedural noncompliance;

- voluntary reporting dan just culture;

- risk-based decision making.

FAA mengelompokkan penyebab umum maintenance error dalam “Dirty Dozen”: kurang komunikasi, complacency, kurang pengetahuan, distraction, kurang teamwork, fatigue, kurang resource, pressure, kurang assertiveness, stress, kurang awareness, dan norms. ([Federal Aviation Administration](https://www.faa.gov/about/initiatives/maintenance_hf 'Human Factors in Aviation Maintenance | Federal Aviation Administration'))

Artinya, UI harus dirancang untuk mengatasi **kondisi kerja nyata**, bukan hanya membuat form lebih rapi.

---

# 3. Human Factors Control Matrix

| Risiko                   | Masalah operasional                                             | Kontrol sistem yang disarankan                             |
| ------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Kurang komunikasi        | Status pekerjaan tidak dipahami shift berikutnya                | Structured handover dan acceptance                         |
| Interruption             | Teknisi lupa langkah terakhir atau mengulang langkah yang salah | Pause state, last safe step, resume review                 |
| Fatigue                  | Penurunan perhatian dan meningkatnya risiko error               | Shift-risk indicator dan planning mitigation               |
| Distraction              | Step terlewat saat ada panggilan atau aktivitas lain            | Explicit interruption marker dan resume checklist          |
| Time pressure            | User melompati prosedur untuk mengejar release                  | Tidak ada silent bypass; deviation workflow                |
| Complacency              | Teknisi tidak lagi membaca instruksi yang dianggap familiar     | Revision confirmation dan critical-change highlight        |
| Ambiguous procedure      | Instruksi teknis ditafsirkan berbeda                            | Exact reference, clarification request, stop-work state    |
| Weak handover            | Kondisi fisik aircraft tidak ditransfer secara lengkap          | Handover record dengan opened panels, removed parts, tools |
| Critical-task error      | Kesalahan pada task berisiko tinggi tidak terdeteksi            | Independent inspection/reinspection gate                   |
| Alert fatigue            | Banyak pesan merah diabaikan                                    | Alert aggregation dan prioritization                       |
| Visual misinterpretation | Status hanya dibedakan warna                                    | Ikon, label, warna, deskripsi                              |
| Accidental action        | Tombol release atau reject salah ditekan                        | Action separation, reauthentication dan confirmation       |
| Poor data state          | User mengira record telah tersimpan/sinkron                     | Saved locally, pending sync, synced, conflict              |

---

# 4. Komunikasi dan handover

## Dasar sumber

DGCA memasukkan komunikasi, shift/task turnover, undocumented maintenance, dan proper task documentation sebagai materi inti human factors. EASA juga menempatkan shift/task handover sebagai prosedur organisasi tersendiri.

Studi resmi EASA tentang work-card system menemukan dua masalah penting:

1. complacency—dokumentasi tidak lagi dibaca karena pekerjaan dianggap sudah dikenal;

2. interruption dan handover tidak didokumentasikan secara formal.

Studi tersebut juga menemukan bahwa time pressure memperburuk dampak task card yang membingungkan atau instruksi yang ambigu.

## Keputusan desain

Handover tidak boleh hanya berupa:

```text
Catatan shift:
"lanjutkan pekerjaan sebelumnya"
```

Gunakan objek `Maintenance Handover` terstruktur:

```text
Aircraft / Component
Work Package
Job Card
Outgoing Person
Incoming Person
Current Step
Last Confirmed Step
Work Actually Completed
Work Not Completed
Opened Panels / Access
Parts Removed
Temporary Installations
Tools Still in Use
Safety Locks / Tags
Measurements Taken
Open Findings
Engineering Assistance Pending
Inspection Pending
Next Safe Action
Technical Data Revision
Evidence / Photos
```

## State handover

```text
Draft
→ Submitted by Outgoing Shift
→ Supervisor Review
→ Walkthrough Required
→ Accepted by Incoming Shift
```

Jika handover belum diterima:

```text
TASK OWNERSHIP NOT TRANSFERRED
```

Incoming technician harus memilih:

- `Accept Handover`

- `Request Clarification`

- `Reject — Information Incomplete`

Jangan otomatis mengalihkan ownership hanya berdasarkan perubahan jadwal shift.

## UI yang disarankan

Pada Job Card tampilkan:

```text
HANDOVER REQUIRED

Previous technician: Budi Santoso
Paused at: Step 6 — Hydraulic leakage test
Last confirmed: 22:14 WIT
Open access: Panel 192DB
Tool retained: Torque wrench TW-023
Finding open: NR-2026-0041

[Review Handover]
```

---

# 5. Interruption dan resume

## Dasar sumber

EASA menyatakan work card untuk tugas panjang atau kompleks harus dipecah berdasarkan lokasi pekerjaan dapat diinterupsi. Work card juga harus menunjukkan pekerjaan yang benar-benar dilakukan oleh setiap orang ketika task dilaksanakan oleh beberapa personel atau beberapa shift. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/AMC%20%26%20GM%20to%20Part-145%20%E2%80%94%20Issue%202%2C%20Amendment%205.pdf 'AMC & GM to Part-145 — Issue 2, Amendment 5'))

EASA juga memasukkan distraction dan interruption dalam syllabus human factors maintenance. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/AMC%20%26%20GM%20to%20Part-145%20%E2%80%94%20Issue%202%2C%20Amendment%205.pdf 'AMC & GM to Part-145 — Issue 2, Amendment 5'))

## Keputusan desain

Setiap Job Card perlu memiliki action:

```text
Start
Pause
Resume
Request Assistance
Raise Finding
Complete Work
```

Saat `Pause`, sistem meminta:

```text
Reason for interruption
Current physical condition
Last fully completed step
Opened panels/access
Removed or loosened parts
Tool/material condition
Safety condition
Temporary protection installed
Required action before resume
```

## Resume protocol

Ketika user menekan `Resume`, jangan langsung membuka step berikutnya.

Tampilkan:

```text
RESUME REVIEW

Last fully completed step: Step 4
Interrupted during: Step 5
Previous technician: Budi Santoso
Interruption duration: 6h 42m
Aircraft configuration changed: No
New technical data revision: No
Open finding: 1

Confirm:
☐ Aircraft identity verified
☐ Physical condition matches handover
☐ Tools and removed parts accounted for
☐ Applicable technical data reviewed
```

Baru setelah itu:

```text
[Resume from Step 5]
```

## Data model

```text
InterruptionEvent
- job_card_id
- interrupted_step_id
- last_completed_step_id
- reason
- physical_condition
- created_by
- created_at
- evidence
- handover_required
- resumed_by
- resumed_at
- resume_verification
```

---

# 6. Fatigue dan workload management

## Dasar sumber

EASA mewajibkan ancaman fatigue dipertimbangkan dalam maintenance planning dan pengaturan shift. Sumber fatigue dapat mencakup kondisi lingkungan, jam kerja berlebihan, overtime, night work, pola shift, dan perjalanan menuju lokasi maintenance. Ketika jam kerja ditingkatkan atau pola shift berubah karena kebutuhan mendesak, organisasi perlu mempunyai prosedur mitigasi atau melakukan risk assessment. Contoh mitigasinya meliputi additional supervision, independent inspection, membatasi pekerjaan pada non-critical task, dan tambahan waktu istirahat. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/AMC%20%26%20GM%20to%20Part-145%20%E2%80%94%20Issue%202%2C%20Amendment%205.pdf 'AMC & GM to Part-145 — Issue 2, Amendment 5'))

ICAO menekankan bahwa penyelesaian masalah human error dapat memerlukan perubahan sistem, misalnya mengubah maintenance rostering untuk mengatasi fatigue. Pendekatan yang dianjurkan adalah membuat sistem error-tolerant, bukan hanya menyalahkan individu. ([ICAO](https://www.icao.int/sites/default/files/SMI/TrainingDocs/SMS%20for%20Aviation-A%20Practical%20Guide/Third%20Edition/SMS-for-Aviation-A-Practical-Guide-SMS-6-Human-Factors-and-Human-Performance-3rd-Edition.pdf 'Safety management systems for aviation: a practical guide SMS 6 Human factors and human performance'))

## Keputusan desain paling aman

Sistem **jangan mendiagnosis seseorang “fatigued”** atau menghasilkan skor kesehatan tersembunyi.

Sistem hanya boleh menampilkan **planning risk indicator** berdasarkan data yang disetujui organisasi:

```text
SHIFT RISK ATTENTION

Extended duty detected
Night shift: Yes
Critical tasks assigned: 2
Independent inspection available: No

Supervisor assessment required
```

Threshold harus berasal dari:

- company fatigue procedure;

- manpower planning procedure;

- approved GMM/AMO Manual;

- applicable employment dan aviation requirements;

- hasil safety risk assessment.

Jangan hard-code threshold dari asumsi vendor.

## Data yang relevan

```text
Shift start and end
Scheduled duty duration
Actual duty duration
Overtime
Night/day shift
Recent shift pattern
Critical task assignment
Work environment
Supervisor availability
Independent inspector availability
Rest break record
Fatigue concern report
Mitigation selected
```

## Mitigasi dalam sistem

Planner atau supervisor dapat memilih:

```text
Assign additional supervisor
Add independent inspection
Move critical task to next shift
Replace assigned technician
Add rest break
Reduce scope to non-critical tasks
Perform formal risk assessment
```

## Privacy dan safety culture

Fatigue report tidak seharusnya:

- menjadi leaderboard;

- menjadi penilaian produktivitas;

- terlihat ke seluruh karyawan;

- otomatis menghasilkan hukuman;

- digunakan untuk mendorong teknisi tetap bekerja.

Aksesnya dibatasi untuk role yang ditentukan safety dan manpower procedure.

---

# 7. Procedural compliance

## Dasar sumber

DGCA memasukkan procedural noncompliance, undocumented maintenance, proper documentation, sign-off, planning, dan just culture dalam human factors program.

EASA meminta work card membedakan disassembly, task accomplishment, reassembly, testing, serta error-capturing method seperti independent inspection. Human factors harus dipertimbangkan dalam pengembangan work card. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/AMC%20%26%20GM%20to%20Part-145%20%E2%80%94%20Issue%202%2C%20Amendment%205.pdf 'AMC & GM to Part-145 — Issue 2, Amendment 5'))

## Keputusan desain

### Jangan gunakan satu checkbox besar

Buruk:

```text
☐ Pekerjaan selesai
```

Lebih tepat:

```text
1. Preparation                     Completed
2. De-energize system              Signed
3. Remove component                Completed
4. Inspect mounting                Measurement required
5. Install replacement             In progress
6. Torque fasteners                Independent inspection
7. Operational test                Not started
8. Restore aircraft                Not started
```

### Step type

Setiap langkah dapat mempunyai tipe kontrol:

```text
Acknowledgement
Performed action
Measured value
Pass / Fail
Part installed
Part removed
Tool used
Photo evidence
Technician sign-off
Inspector sign-off
Independent inspection
```

### Deviation workflow

User tidak boleh melewati step dengan tombol `Skip`.

Gunakan:

```text
Not Applicable
Unable to Perform
Deviation Required
Engineering Assistance Required
```

Setiap pilihan wajib memiliki:

- reason;

- authority;

- evidence;

- reviewer;

- technical reference;

- impact terhadap release.

---

# 8. Critical maintenance task dan error-capturing

## Dasar sumber

EASA mengharuskan organisasi mempunyai prosedur untuk mengidentifikasi critical maintenance tasks, menentukan error-capturing method, menentukan qualification personel yang melakukannya, dan memastikan staf memahami task kritis tersebut. Sumber identifikasi dapat berasal dari design approval holder, accident/incident report, occurrence reporting, audit, independent inspection, operational monitoring, dan feedback pelatihan. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/AMC%20%26%20GM%20to%20Part-145%20%E2%80%94%20Issue%202%2C%20Amendment%205.pdf 'AMC & GM to Part-145 — Issue 2, Amendment 5'))

## Tampilan critical task

```text
CRITICAL MAINTENANCE TASK

Dual-engine oil servicing
Consequence of error: Multiple system impairment
Error-capturing method: Independent inspection
Required authorization: Engine-rated Inspector
```

Tampilkan secara konsisten melalui:

- ikon khusus;

- label teks `CRITICAL TASK`;

- border atau background;

- deskripsi konsekuensi;

- error-capturing method;

- required role.

## Rule utama

```text
IF task.critical = true
AND error_capture.completed = false
THEN technical_release = BLOCKED
```

## Independent inspection

Sistem harus memastikan:

- inspector memiliki authorization;

- inspector tidak sama dengan performer jika independence diwajibkan;

- pemeriksaan dilakukan pada waktu yang benar;

- rework membatalkan inspection sebelumnya;

- inspection mengacu pada revision yang sama;

- hasil dan evidence tercatat.

---

# 9. Pisahkan action biasa dan action keselamatan

Action berikut jangan diletakkan dalam kelompok yang sama:

```text
Save Draft
Add Note
Upload Photo
Technical Sign-off
Approve Inspection
Return to Service
```

## Klasifikasi action

### Action biasa

- Save draft.

- Add note.

- Upload evidence.

- Request assistance.

### Controlled action

- Complete step.

- Technician sign-off.

- Submit for inspection.

- Accept handover.

### Safety-critical action

- Independent inspection.

- Defer defect.

- Override warning.

- Approve technical release.

- Return to service.

## Desain safety-critical action

```text
APPROVE TECHNICAL RELEASE

Aircraft: PK-XXX
Work Package: WP-2026-0018
Open blockers: 0
Open MEL items: 2
Operational restrictions: 1
Authorization: Valid

Release statement:
[controlled statement]

[Cancel]               [Authenticate & Release]
```

Require:

- reauthentication;

- explicit statement;

- authorization check;

- current data check;

- timestamp;

- audit event;

- reason jika ada exception.

Hindari tombol `Release` tepat di sebelah `Save`.

---

# 10. Jangan mengandalkan warna

## Dasar sumber

WCAG 2.2 menyatakan warna tidak boleh menjadi satu-satunya cara untuk menyampaikan informasi, status, atau action. WCAG juga menetapkan contrast minimum 4.5:1 untuk teks normal dan 3:1 untuk teks besar, dengan pengecualian tertentu. ([W3C](https://www.w3.org/TR/WCAG22/?utm_source=chatgpt.com 'Web Content Accessibility Guidelines (WCAG) 2.2'))

WCAG bukan regulasi aviasi, tetapi merupakan benchmark resmi dan tepat untuk aksesibilitas aplikasi web.

## Status yang benar

```text
⛔ RELEASE BLOCKED
8 mandatory conditions are not satisfied
```

Bukan:

```text
●
```

Contoh redundant encoding:

| Status             | Warna        | Ikon             | Label                 |
| ------------------ | ------------ | ---------------- | --------------------- |
| AOG/Critical       | Merah        | Stop/octagon     | `AOG`                 |
| Release blocked    | Merah/oranye | Blocked          | `RELEASE BLOCKED`     |
| MEL open           | Kuning       | Warning triangle | `MEL OPEN`            |
| Pending inspection | Biru/abu     | Clock            | `AWAITING INSPECTION` |
| In service         | Hijau        | Check circle     | `IN SERVICE`          |

## Acceptance criteria

UI masih harus dapat dipahami ketika:

- dilihat dalam grayscale;

- user mempunyai color-vision deficiency;

- monitor memiliki warna buruk;

- layar terkena cahaya terang;

- warna printer tidak tersedia.

---

# 11. Ukuran teks dan target sentuh

WCAG 2.2 Level AA menetapkan target minimum 24×24 CSS pixel atau spacing yang setara. Level AAA menggunakan 44×44 CSS pixel. W3C menjelaskan bahwa target lebih besar mengurangi risiko salah menekan kontrol, terutama pada touchscreen dan input yang kurang presisi. ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html?utm_source=chatgpt.com 'Understanding SC 2.5.8: Target Size (Minimum) (Level AA)'))

## Standar internal yang direkomendasikan untuk MRO

Karena tablet dapat digunakan di hangar:

```text
Primary operational action: minimum 44 × 44 px
Critical action: minimum 48 px height
Icon-only button: minimum 44 × 44 px
Body text: sekitar 16 px
Metadata: jangan lebih kecil dari sekitar 13–14 px
Critical status: sekitar 20–24 px atau lebih
```

Angka font di atas merupakan **design standard internal yang direkomendasikan**, bukan ketentuan langsung CASR.

## Kontrol tambahan

- jangan menempatkan dua action berlawanan terlalu dekat;

- gunakan spacing lebih besar saat user memakai sarung tangan;

- jangan mengandalkan hover;

- semua action harus dapat digunakan melalui touch;

- sediakan visible focus state untuk keyboard;

- dukung zoom 200% tanpa kehilangan fungsi, sejalan dengan WCAG. ([W3C](https://www.w3.org/TR/WCAG22/?utm_source=chatgpt.com 'Web Content Accessibility Guidelines (WCAG) 2.2'))

---

# 12. Hindari pesan error berulang

## Dasar human factors

FAA memasukkan distraction, pressure, stress, lack of awareness, dan lack of communication sebagai penyebab umum maintenance error. ICAO menyarankan sistem dirancang toleran terhadap error dan memperbaiki kondisi sistemik, bukan hanya memberi lebih banyak peringatan kepada individu. ([Federal Aviation Administration](https://www.faa.gov/about/initiatives/maintenance_hf 'Human Factors in Aviation Maintenance | Federal Aviation Administration'))

## Buruk

```text
Job card incomplete
Job card incomplete
Job card incomplete
Job card incomplete
Job card incomplete
Job card incomplete
```

## Lebih tepat

```text
6 MANDATORY JOB CARDS INCOMPLETE

Primary cause:
• 3 awaiting technician completion
• 2 awaiting inspection
• 1 blocked by material

[Review Job Cards]
```

## Struktur pesan

Setiap pesan harus menjawab:

```text
What happened?
Why does it matter?
What is blocked?
Who owns the action?
What must happen next?
```

Contoh:

```text
TOOL CALIBRATION EXPIRED

Torque wrench TW-023 expired at 00:00 WIT.
Task JC-042 cannot continue.

Owner: Tool Control
Required action: Assign eligible replacement tool

[Assign Replacement]
```

Jangan menampilkan raw backend error kepada user operasional.

---

# 13. Blocker tidak boleh disembunyikan dalam tab

Release blocker harus tersedia pada dua level:

## Level global

Sticky status pada work package:

```text
RELEASE BLOCKED
8 blockers · 3 warnings · 12 passed
```

## Level lokal

Pada tab terkait:

```text
Execution       6 blockers
Resources       1 blocker
Technical Data  1 blocker
Release         8 blockers
```

Jika user berada di tab lain, perubahan blocker tetap muncul melalui:

- global banner;

- tab badge;

- notification;

- next-action panel.

Jangan mengandalkan toast yang hilang setelah beberapa detik untuk informasi airworthiness.

---

# 14. Technical-data ambiguity dan stop work

EASA menyatakan ketika personel menemukan maintenance data yang inaccurate, incomplete, atau ambiguous, detailnya harus dicatat melalui internal safety reporting dan dilaporkan kepada pembuat maintenance data sampai masalah diklarifikasi. ([EASA](https://www.easa.europa.eu/sites/default/files/dfu/AMC%20%26%20GM%20to%20Part-145%20%E2%80%94%20Issue%202%2C%20Amendment%205.pdf 'AMC & GM to Part-145 — Issue 2, Amendment 5'))

## Action pada Job Card

```text
[Report Technical Data Issue]
```

Form:

```text
Document and revision
Section/task reference
Type of issue:
- Ambiguous
- Incomplete
- Suspected incorrect
- Does not match aircraft configuration

Description
Evidence
Work impact
```

Keputusan:

```text
May Continue
Continue With Approved Clarification
Stop Work
Engineering Review Required
OEM/DAH Clarification Required
```

Jika `Stop Work`:

- task berubah menjadi blocked;

- supervisor dan engineering diberi tahu;

- pekerjaan tidak dapat ditandatangani;

- alasan terlihat pada handover;

- technical release terkena gate jika task mandatory.

---

# 15. Offline dan status sinkronisasi

Ini merupakan **design inference berdasarkan prinsip error tolerance ICAO**, ditambah konteks operasi di lokasi dengan konektivitas terbatas. Sistem tidak boleh membuat user salah mengira data sudah berada di server ketika baru tersimpan secara lokal. ([ICAO](https://www.icao.int/sites/default/files/SMI/TrainingDocs/SMS%20for%20Aviation-A%20Practical%20Guide/Third%20Edition/SMS-for-Aviation-A-Practical-Guide-SMS-6-Human-Factors-and-Human-Performance-3rd-Edition.pdf 'Safety management systems for aviation: a practical guide SMS 6 Human factors and human performance'))

Gunakan state yang berbeda:

```text
Saved Locally
Pending Synchronization
Synchronizing
Synchronized
Synchronization Failed
Conflict Detected
Server Validation Rejected
```

## Hal yang wajib terlihat

```text
Last server sync
Number of pending changes
Affected job cards
Attachments pending upload
Conflict status
Current controlled-document package
```

## Release rule

Final release tidak boleh dilakukan berdasarkan record yang:

- mempunyai unresolved conflict;

- belum tervalidasi server jika prosedur mensyaratkannya;

- menggunakan technical-data package yang tidak valid;

- mempunyai signature yang belum dapat diverifikasi.

Requirement akhirnya harus disesuaikan dengan approved electronic-record dan electronic-signature procedure operator.

---

# 16. Struktur halaman Job Card berbasis human factors

```text
┌──────────────────────────────────────────────────────────────┐
│ PK-XXX · ATR 72 · Wamena · MAINTENANCE                      │
│ WP-100FH · Last Sync 14:32 WIT · ONLINE                     │
├──────────────────────────────────────────────────────────────┤
│ RELEASE BLOCKED · 3 task blockers · 1 inspection pending     │
├──────────────────────────────────────────────────────────────┤
│ JC-042 HYDRAULIC RESERVOIR INSPECTION                        │
│ Critical Task · AMM 29-11-00 Rev 42 · Applicable             │
├───────────────┬──────────────────────────┬────────────────────┤
│ TASK STEPS    │ CURRENT INSTRUCTION      │ WORK CONTEXT       │
│               │                          │                    │
│ ✓ Step 1      │ Step 5                   │ Technician         │
│ ✓ Step 2      │ Inspect mounting...      │ Parts              │
│ ✓ Step 3      │                          │ Tools              │
│ ✓ Step 4      │ Limit: 0.20 mm           │ Inspection         │
│ ▶ Step 5      │ [Enter measurement]      │ Handover           │
│ ○ Step 6      │                          │ Findings           │
│ ○ Step 7      │ Source and illustration  │ Sync state         │
├───────────────┴──────────────────────────┴────────────────────┤
│ [Pause Task] [Raise Finding] [Request Inspection]             │
│                                    [Complete & Sign Step]      │
└──────────────────────────────────────────────────────────────┘
```

## Informasi yang harus persistent

- aircraft identity;

- work package;

- Job Card;

- operational status;

- current technical-data revision;

- applicability;

- critical-task flag;

- current step;

- last synchronized state;

- pending handover;

- open blocker.

---

# 17. Human factors data model

Sistem sebaiknya memiliki entity tersendiri, bukan hanya catatan bebas.

```text
TaskInterruption
TaskResumeVerification
ShiftHandover
TechnicalDataIssue
CriticalTaskDefinition
ErrorCapturingRequirement
IndependentInspection
ProceduralDeviation
FatigueRiskAssessment
SafetyReport
WorkloadPlan
CommunicationAcknowledgment
```

Contoh `ShiftHandover`:

```text
id
aircraft_id
work_package_id
job_card_id
outgoing_user_id
incoming_user_id
last_completed_step_id
interrupted_step_id
aircraft_physical_state
open_panels
removed_parts
tools_in_use
safety_devices
open_findings
next_safe_action
submitted_at
accepted_at
acceptance_status
```

---

# 18. UAT Human Factors yang wajib dilakukan

| Skenario                             | Expected result                                           |
| ------------------------------------ | --------------------------------------------------------- |
| UI dilihat grayscale                 | Semua status tetap dapat dibedakan melalui ikon dan label |
| Task diinterupsi pada Step 5         | Sistem menyimpan last completed step dan physical state   |
| Teknisi lain melanjutkan task        | Wajib review dan accept handover                          |
| Revision baru terbit saat task aktif | User mendapat impact notice, bukan silent replacement     |
| Tool calibration expired             | Task diblokir dan action diarahkan ke Tool Control        |
| Inspector menolak hasil              | Task kembali ke rework dan inspection lama tidak valid    |
| Teknisi bekerja extended shift       | Planner mendapat risk attention dan mitigation workflow   |
| User menekan release dengan blocker  | Release ditolak dengan alasan spesifik                    |
| Jaringan putus                       | State menunjukkan saved locally, bukan synced             |
| Sync menghasilkan conflict           | Record tidak digabung diam-diam                           |
| Enam Job Card gagal                  | Pesan diagregasi berdasarkan penyebab                     |
| UI dizoom 200%                       | Tidak ada fungsi, label, atau tombol yang hilang          |
| Tablet digunakan dengan touch        | Primary target memenuhi standar internal ≥44 px           |
| Technical data ambigu                | Tersedia report issue dan stop-work workflow              |
| Safety concern dilaporkan            | Reporter menerima reference dan status follow-up          |

---

# 19. Prioritas implementasi

## P0 — sebelum production credibility

1. Status tidak bergantung pada warna.

2. Persistent aircraft dan release context.

3. Blocker selalu visible.

4. Structured interruption dan resume.

5. Formal shift/task handover.

6. Step-level documentation dan sign-off.

7. Critical-task dan independent-inspection gate.

8. Pemisahan normal action dan safety-critical action.

9. Technical-data issue dan stop-work workflow.

10. Status offline, sync, dan conflict.

11. Authorization check sebelum sign-off.

12. Audit trail untuk seluruh perubahan.

## P1 — operational maturity

1. Fatigue-aware production planning.

2. Shift dan workload risk assessment.

3. Just-culture safety reporting.

4. Human-factors dashboard untuk interruption, rework, repeat error, dan handover.

5. Alert rationalization.

6. Review efektivitas mitigasi.

## P2 — optimization

1. Analisis pola interruption.

2. Identification task yang sering menimbulkan ambiguity.

3. Work-card usability analytics.

4. Predictive workload conflict.

5. Adaptive interface berdasarkan role dan kondisi kerja.

---

# 20. Hal yang sebaiknya tidak dibuat

Hindari desain berikut:

- fatigue score yang memberi label buruk kepada teknisi;

- release satu klik;

- tombol `Save` dan `Release` berdampingan;

- status hanya berupa warna;

- blocker hanya terlihat di dalam tab;

- Job Card dengan satu checkbox `Done`;

- otomatis melanjutkan step setelah interruption;

- handover hanya berupa chat;

- technical instruction diganti diam-diam saat revision berubah;

- alert merah untuk semua masalah;

- popup confirmation pada setiap action kecil;

- disabled button tanpa penjelasan;

- record offline ditampilkan sebagai synchronized;

- inspector dapat sign-off task yang ia lakukan sendiri ketika independent inspection diwajibkan.

---

# Keputusan akhir yang paling masuk akal

Untuk sistem MRO yang sedang dirancang, human factors harus diterapkan melalui lima mekanisme utama:

```text
1. Persistent operational awareness
2. Controlled task execution
3. Interruption and handover recovery
4. Error-capturing and independent verification
5. Error-tolerant records and release gating
```

Target desainnya bukan membuat manusia “tidak pernah salah”. Target yang lebih realistis dan selaras dengan prinsip ICAO adalah:

> **Membuat kesalahan lebih sulit dilakukan, lebih cepat terdeteksi, lebih mudah dipulihkan, dan tidak dapat berkembang menjadi technical release yang tidak sah.** ([ICAO](https://www.icao.int/operational-safety/HP 'operational-safety/HP'))
