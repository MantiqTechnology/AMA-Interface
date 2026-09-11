# Release Readiness Summary — Spesifikasi Implementasi Nyata

Saya menetapkan komponen ini sebagai **hasil evaluasi lintas-domain yang dihitung sistem**, bukan tabel status yang diisi manual.

Fungsinya:

> Menunjukkan domain apa yang masih menghalangi pekerjaan atau technical release, siapa pemilik tindakannya, dan ke mana user harus pergi untuk menyelesaikannya.

DGCA SI 8900-6.9 memeriksa keberadaan special tools, calibration records, personel yang terlatih untuk assignment-nya, shift-turnover procedure, kecukupan personel yang qualified/authorized, dan kelancaran proses tanpa gangguan resource yang dapat memengaruhi airworthiness. Karena itu, material, tools, personnel, inspection, technical data, dan records memang harus menjadi domain evaluasi terpisah—bukan satu status umum `Ready`.

---

# 1. Keputusan struktur kategori

Enam kategori awal belum cukup. Saya menetapkan **delapan kategori final**:

```text
1. Work Execution
2. MEL/CDL & Defects
3. Material & Components
4. Personnel
5. Tools & GSE
6. Technical Data & Capability
7. Inspection
8. Technical Records
```

Perubahannya:

- `Job Cards` menjadi **Work Execution**, karena evaluasinya juga mencakup finding, non-routine work, rework, dan execution sign-off.

- Ditambahkan **MEL/CDL & Defects**, karena expired MEL atau no-go defect dapat memblokir release meskipun seluruh Job Card selesai.

- Ditambahkan **Technical Data & Capability**, karena pekerjaan tidak boleh dinilai siap jika source document, applicability, AMO capability, atau station capability belum valid.

- `Material`, `Personnel`, `Tools`, `Inspection`, dan `Technical Records` tetap berdiri sendiri karena mempunyai owner, bukti, dan failure behaviour berbeda.

---

# 2. Struktur tabel final

Kolom `Passed` sebaiknya diubah menjadi **Criteria Passed**, ditampilkan sebagai `passed/total`.

```text
Release Readiness Summary

Category                    Status      Blocker  Warning  Criteria    Next action
Work Execution              BLOCKED        6       2      16/24       Complete mandatory Job Cards
MEL/CDL & Defects           NOT EVALUATED  —       —       —          Run defect readiness check
Material & Components       BLOCKED        1       1      16/18       Reserve eligible replacement
Personnel                   BLOCKED        1       0      11/12       Assign authorized personnel
Tools & GSE                 BLOCKED        1       1       7/9        Assign calibrated replacement
Technical Data & Capability NOT EVALUATED  —       —       —          Validate technical baseline
Inspection                  WARNING        0       1       9/10       Assign required inspector
Technical Records           BLOCKED        1       0      18/19       Complete supporting record
```

Angka pada dua kategori baru tidak boleh diisi `0` sebelum evaluator dijalankan.

Gunakan:

```text
NOT EVALUATED
```

Bukan:

```text
0 blockers
```

`0 blockers` berarti sistem sudah mengevaluasi dan memastikan tidak ada blocker. `Not Evaluated` berarti sistem belum dapat memberikan keputusan.

---

# 3. Status category

```typescript
type ReadinessCategoryStatus =
  | 'NOT_EVALUATED'
  | 'EVALUATING'
  | 'CLEAR'
  | 'WARNING'
  | 'BLOCKED'
  | 'EVALUATION_FAILED'
  | 'NOT_APPLICABLE';
```

| Status              | Arti                                                            | Visual                        |
| ------------------- | --------------------------------------------------------------- | ----------------------------- |
| `NOT_EVALUATED`     | Belum pernah dievaluasi pada revision aktif                     | Ikon minus, abu-abu           |
| `EVALUATING`        | Evaluasi sedang dijalankan                                      | Spinner kecil dan label       |
| `CLEAR`             | Seluruh mandatory criteria passed                               | Check hijau                   |
| `WARNING`           | Tidak ada hard blocker, tetapi ada perhatian                    | Warning kuning                |
| `BLOCKED`           | Minimal satu hard blocker aktif                                 | Stop merah                    |
| `EVALUATION_FAILED` | Sistem tidak dapat memverifikasi data                           | Error merah dengan penjelasan |
| `NOT_APPLICABLE`    | Tidak diwajibkan berdasarkan applicability yang sudah disetujui | Minus abu-abu dan reason      |

`NOT_APPLICABLE` tidak dapat dipilih manual oleh user. Harus berasal dari applicability rule atau approved procedure.

---

# 4. Definisi hitungan

## Blocker

Satu blocker adalah kondisi unik yang:

- menghentikan tahap workflow;

- membuat pekerjaan tidak dapat dilanjutkan;

- atau membuat technical release tidak diizinkan.

Contoh satu material shortage yang memblokir tiga Job Card tetap dihitung sebagai:

```text
1 primary material blocker
```

Bukan tiga blocker material yang identik.

Ketiga Job Card tetap menyimpan dependency ke blocker yang sama.

---

## Warning

Warning adalah kondisi yang:

- belum menjadi hard blocker;

- membutuhkan perhatian atau review;

- dapat berkembang menjadi blocker;

- atau memerlukan acknowledgment sesuai prosedur.

Contohnya:

```text
Tool calibration due in 2 days
MEL expiry approaching
Inspector shift ends before estimated inspection time
```

Warning tidak boleh otomatis diterima hanya karena user menekan `Acknowledge`.

---

## Criteria passed

Criteria merupakan rule yang versioned dan dapat ditelusuri.

```text
Material eligibility verified
Required inspector authorized
Technical data current
Component transaction completed
```

Tampilkan:

```text
16/18 criteria passed
```

Bukan sekadar:

```text
16 passed
```

Karena user perlu mengetahui denominator-nya.

---

# 5. Work Execution evaluator

## Primary process owner

```text
Production Supervisor
```

Pemilik tindakan aktual dapat berubah berdasarkan blocker.

## Data yang dievaluasi

- mandatory Job Cards;

- non-mandatory Job Cards;

- Job Card execution state;

- mandatory step completion;

- technician sign-off;

- findings;

- non-routine Job Cards;

- rework;

- technical-support requests;

- handover;

- issued material dan tools.

## Hard-blocking criteria

```text
Mandatory Job Card belum technically completed
Mandatory signature belum tersedia
Job Card masih REWORK_REQUIRED
Finding belum memiliki disposition
Non-routine work belum selesai
Task paused tanpa handover yang diterima
Measurement berada di luar limit tanpa disposition
Technical-data discrepancy masih berstatus STOP WORK
```

## Warning criteria

```text
Job Card mendekati planned finish
Job Card menunggu inspection
Handover belum lama diterima
Non-mandatory work belum selesai
Actual man-hours melebihi estimate
```

## Status formula

```typescript
if (evaluationError) return 'EVALUATION_FAILED';
if (hardBlockers.length > 0) return 'BLOCKED';
if (warnings.length > 0) return 'WARNING';
return 'CLEAR';
```

## Next-action prioritization

```text
1. No-go atau safety-critical work
2. Rework required
3. Mandatory Job Card incomplete
4. Finding tanpa disposition
5. Missing execution signature
6. Schedule warning
```

## Row action

```text
[Open Execution Workspace]
```

Membuka subpage:

```text
/work-packages/{id}/execution?readiness=blocking
```

Bukan drawer, karena penyelesaian Job Card merupakan pekerjaan panjang.

---

# 6. MEL/CDL & Defects evaluator

## Primary process owner

```text
Maintenance Control
```

Engineering atau Certifying Staff dapat menjadi owner tindakan tertentu sesuai approved procedure.

## Data yang dievaluasi

- open technical-log defects;

- no-go defects;

- deferred defects;

- MEL reference dan revision;

- CDL reference;

- deferral category;

- start dan expiry;

- M-procedure;

- O-procedure;

- placard;

- operational restriction;

- rectification status;

- repeat defect;

- aircraft-level hold.

## Hard-blocking criteria

```text
Open no-go defect
MEL/CDL item expired
MEL/CDL item tidak applicable
Required M-procedure belum selesai
Required O-procedure belum selesai
Required placard belum tersedia
Deferred item tidak mempunyai authorized approval
Operational restriction tidak dapat dipenuhi
Finding airworthiness belum mempunyai disposition
```

## Warning criteria

```text
MEL/CDL mendekati expiry
Recurring inspection mendekati due
Repeat defect terdeteksi
Deferred item belum memiliki rectification plan
```

## Row action

```text
[Open Defect & MEL Control]
```

Membuka dedicated subpage, bukan modal.

---

# 7. Material & Components evaluator

## Primary process owner

```text
Stores / Material Control
```

## Data yang dievaluasi

- required material;

- reservation;

- stock status;

- receiving-inspection status;

- serviceability;

- part number;

- serial/batch/lot;

- certificate;

- traceability;

- applicability;

- shelf life;

- life remaining;

- quarantine;

- issue/install/remove transactions;

- component configuration.

## Hard-blocking criteria

```text
Mandatory part tidak tersedia
Part tersedia tetapi tidak serviceable
Traceability tidak lengkap
Certificate tidak valid atau tidak tersedia
Part tidak applicable untuk aircraft configuration
Shelf life expired
Life remaining tidak mencukupi
Receiving inspection belum selesai
Part masih quarantine
Installed component transaction belum tercatat
```

Ketersediaan fisik tidak sama dengan installation eligibility. Eligibility tetap harus mempertimbangkan condition, traceability, applicability, dan installation data. DGCA surveillance juga menilai alur parts/material dan memastikan keterbatasan resource tidak mengganggu maintenance dengan cara yang dapat memengaruhi airworthiness.

## Warning criteria

```text
Part belum di-reserve
Shelf life mendekati expiry
Material masih dalam transport
Alternative part memerlukan engineering confirmation
Jumlah tersisa berada di bawah safety stock
```

## Quick action drawer

Untuk satu blocker:

```text
Material Readiness

Hydraulic filter P/N 7010-15
Status: BLOCKING
Required by: JC-031
Required at: 16:00 WIT

Availability:
• Wamena: 0
• Jayapura: 2 serviceable
• In transit: 1

Eligibility:
• P/N applicable: Passed
• Certificate: Passed
• Shelf life: Passed
• Receiving inspection: Passed

[Reserve from Jayapura]
[Create Transfer Request]
[Open Material Workspace]
```

Untuk planning atau beberapa shortage kompleks, action menuju subpage Material.

---

# 8. Personnel evaluator

## Primary process owner

```text
Production Supervisor
```

Quality/Authorization Administrator menjadi owner jika masalahnya terkait authorization record.

## Data yang dievaluasi

- assignment;

- employment status;

- license;

- company authorization;

- fleet/type scope;

- task/process scope;

- station scope;

- training;

- competence;

- recency;

- shift availability;

- inspection independence;

- workload/shift conflict.

## Hard-blocking criteria

```text
Required skill tidak tersedia
Assigned technician authorization expired
Aircraft/fleet scope tidak cocok
Task/process scope tidak cocok
Required inspector tidak tersedia
Certifying Staff tidak tersedia
Required training tidak current
Authorization suspended
Independent-inspection segregation tidak dapat dipenuhi
```

SI 8900-6.9 secara eksplisit menilai apakah tersedia personel yang cukup, trained, qualified, dan authorized untuk specific task sepanjang maintenance process.

## Warning criteria

```text
Authorization akan kedaluwarsa selama maintenance window
Shift coverage tidak mencakup planned completion
Personel dialokasikan ke dua task kritis pada waktu yang sama
Inspector hanya tersedia pada akhir maintenance window
```

## Quick action drawer

```text
Personnel Readiness

Required role:
ATR72 Independent Inspector

Required window:
30 Aug · 14:00–17:00 WIT

Current assignment:
No eligible person assigned

Eligible personnel:
• Y. Wonda — Available 14:00
• A. Tabuni — Assigned to WP-019
• R. Sari — Authorization expires before inspection

[Assign Y. Wonda]
[Request Schedule Change]
[Open Personnel Planning]
```

---

# 9. Tools & GSE evaluator

## Primary process owner

```text
Tool Control
```

## Data yang dievaluasi

- required tools;

- special tools;

- GSE;

- tool type;

- range;

- accuracy;

- serviceability;

- calibration status;

- calibration certificate;

- location;

- reservation;

- issue/return;

- out-of-tolerance case;

- alternative-tool approval.

## Hard-blocking criteria

```text
Mandatory tool tidak tersedia
Tool tidak sesuai range atau accuracy
Calibration expired sebelum planned use
Tool unserviceable
Calibration certificate tidak tersedia
Tool berada di station lain dan belum ada confirmed transfer
Out-of-tolerance impact review belum selesai
Issued tool belum accounted for saat close-out
```

DGCA SI 8900-6.9 meminta special tools/test equipment diidentifikasi dan digunakan bila diperlukan, serta calibration records dipertahankan bagi seluruh tools dan test equipment yang membutuhkan calibration.

## Warning criteria

```text
Calibration mendekati due
Tool belum di-reserve
Expected return melewati planned start
Alternative tool approval masih pending
```

## Quick action drawer

```text
Tool Readiness

Torque Wrench TW-023
Required range: 40–200 Nm
Required by: JC-044

Status:
Calibration expired 29 Aug 00:00 WIT

Eligible alternatives:
• TW-019 — Available — Calibration valid
• TW-028 — In use until 15:30
• TW-031 — Different range, not eligible

[Assign TW-019]
[Open Tool Control]
```

---

# 10. Technical Data & Capability evaluator

## Primary process owner

```text
Engineering
```

Document Control atau Quality menjadi owner untuk data/capability deficiency tertentu.

## Data yang dievaluasi

- source document;

- revision;

- effective date;

- applicability;

- exact section;

- task-card revision;

- supersession;

- revision impact;

- technical-data issue;

- aircraft configuration;

- AMO certificate;

- ratings;

- capability list;

- station/location;

- work-away authorization;

- controlled offline document package.

## Hard-blocking criteria

```text
Source document tidak current
Document superseded untuk new work
Applicability unresolved
Aircraft configuration tidak verified
Exact section/task reference tidak tersedia
Revision impact belum diputuskan
Technical-data discrepancy berstatus STOP WORK
AMO rating/capability tidak sesuai
Maintenance location tidak authorized
Required controlled document tidak tersedia
```

## Warning criteria

```text
Revision baru tersedia setelah workscope committed
Temporary revision mendekati expiry
Offline document package mendekati masa invalid
Conditional applicability membutuhkan review
```

## Row action

```text
[Open Technical Validation]
```

Membuka Engineering/Approved Data subpage. Penyelesaian applicability atau revision impact tidak tepat dilakukan melalui drawer kecil.

---

# 11. Inspection evaluator

## Primary process owner

```text
Inspector / Quality Control
```

## Data yang dievaluasi

- required inspection points;

- independent-inspection requirement;

- inspector assignment;

- inspector authorization;

- evidence;

- inspection results;

- rejected inspection;

- rework;

- reinspection;

- stale inspection;

- final inspection.

## Hard-blocking criteria

```text
Mandatory inspection belum dilakukan
Inspector tidak authorized
Independent inspector sama dengan performer
Inspection rejected
Rework belum selesai
Reinspection belum dilakukan
Inspection menjadi stale setelah task berubah
Required evidence tidak tersedia
Final inspection belum accepted
```

## Warning criteria

```text
Inspector belum dijadwalkan
Inspection window berisiko terlewat
Evidence tersedia tetapi belum direview
Non-mandatory inspection masih pending
```

## Row action

Jika hanya assignment:

```text
[Assign Inspector]
```

Buka drawer.

Jika sudah ada inspection/rework:

```text
[Open Inspection Workspace]
```

Buka dedicated subpage.

---

# 12. Technical Records evaluator

## Primary process owner

```text
Technical Records
```

## Data yang dievaluasi

- maintenance description/reference;

- completion date;

- performer identity;

- inspector identity;

- sign-off;

- technical-data revision;

- component install/remove;

- aircraft configuration;

- FH/FC;

- AD/SB/LLP status;

- material certificates;

- attachments;

- amendment;

- provider release;

- sync/integrity status;

- archive readiness.

KP 060 Tahun 2018/SI 8900-3.329 mengenai Maintenance Records System Evaluations tercatat berstatus berlaku dalam JDIH Kementerian Perhubungan. Dokumen tersebut menjadi dasar bahwa maintenance-record review harus diperlakukan sebagai proses tersendiri, bukan sekadar daftar attachment. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=Clm7Ce3Gu7gH5OQLbudL1f4fVE0pE5xKR8Rl6Vkdfhgr4UoonTdDbjF8mz6RhNJA7Z8QfpGi6JLP648gwAKLkGXJ4ua5fcbmpho8n1hIR8fZO59iue5Stgt6IIAu13zGJFi96SqEYfcYHJ5LDENrR8FSkMBFJl6dXSBOfJLhvQcPp15nKMIKZbnwcnN4dGz0HGzw2z5LmweYWCXt79IeouOkCZok&utm_source=chatgpt.com 'PERATURAN DIREKTUR JENDERAL PERHUBUNGAN UDARA ...'))

## Hard-blocking criteria

```text
Required signature missing
Work description atau reference missing
Completion date missing
Component install/remove incomplete
Aircraft configuration conflict
Material certificate missing
FH/FC conflict memengaruhi due status
AD/SB/LLP update belum dilakukan
Signed-record amendment belum resolved
Critical attachment integrity failure
Critical sync conflict
Provider maintenance release belum diterima
```

## Warning criteria

```text
Supporting document belum diklasifikasikan
Archive metadata belum lengkap
Non-critical attachment pending upload
Record retention category belum ditentukan
```

## Row action

```text
[Open Records Review]
```

Dedicated subpage diperlukan karena user harus membandingkan record, configuration, signature, dan supporting evidence.

---

# 13. Urutan kategori di UI

Gunakan **urutan tetap**, bukan mengurutkan row secara acak setiap kali blocker muncul.

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

Alasannya:

- menjaga muscle memory user;

- posisi kategori tidak berpindah-pindah;

- memudahkan penggunaan di ops room;

- mengurangi risiko user melewatkan domain.

Di atas tabel tambahkan filter:

```text
[All] [Blocking only] [Warnings] [Assigned to me]
```

Di dalam drawer, item baru diurutkan berdasarkan severity, dependency, dan due time.

FAA merekomendasikan explicit work-status markers dan beberapa lapisan informasi agar incoming worker tidak menganggap pekerjaan telah selesai ketika sebenarnya masih berlangsung. Readiness Summary berfungsi sebagai digital status marker pada level Work Package.

---

# 14. Struktur row final

```text
⛔  Material & Components                      BLOCKED

    Owner: Stores Supervisor
    Last evaluated: 14:32 WIT

    1 blocker    1 warning    16/18 criteria passed

    Highest-priority issue:
    Hydraulic filter P/N 7010-15 unavailable

    Next action:
    Reserve eligible replacement part

                                      [Resolve] [›]
```

Pada desktop, informasi dapat berada dalam satu row.

Pada tablet:

```text
⛔ Material & Components
BLOCKED · 1 blocker · 1 warning

16/18 criteria passed
Next: Reserve replacement part
```

Klik row membuka detail; tombol `Resolve` langsung membuka target action.

---

# 15. Drawer detail

Drawer adalah tempat **triage**, bukan tempat menjalankan pekerjaan teknis panjang.

```text
Material & Components
1 blocker · 1 warning · 16/18 passed
Last evaluated 14:32 WIT

BLOCKERS

Hydraulic filter P/N 7010-15 unavailable
Required by: JC-031
Owner: Stores Supervisor
Required before: 16:00 WIT

Impact:
JC-031 cannot continue.
Work Package technical release remains blocked.

Required action:
Reserve an eligible component.

[Reserve Part]

WARNINGS

Seal kit shelf life expires in 12 days
Required by: JC-054
Impact: No current release block

[Review]

PASSED CRITERIA

✓ Receiving inspection completed
✓ Traceability verified
✓ Required certificates available

[Open Full Material Workspace]
```

---

# 16. Drawer vs subpage

| Category                    | Default detail    | Action workspace                          |
| --------------------------- | ----------------- | ----------------------------------------- |
| Work Execution              | Drawer summary    | Execution subpage                         |
| MEL/CDL & Defects           | Drawer summary    | Defect/MEL subpage                        |
| Material                    | Drawer            | Material subpage untuk planning kompleks  |
| Personnel                   | Drawer            | Personnel planning bila banyak assignment |
| Tools & GSE                 | Drawer            | Tool Control subpage                      |
| Technical Data & Capability | Drawer summary    | Engineering/Data subpage                  |
| Inspection                  | Drawer assignment | Inspection subpage untuk review/rework    |
| Technical Records           | Drawer summary    | Records Review subpage                    |

Jangan menggunakan centered modal untuk kategori ini. Modal akan menutup aircraft context dan menyulitkan user membandingkan blocker.

---

# 17. Next-action engine

Setiap category mempunyai satu `primary next action`.

Sistem memilihnya menggunakan:

```text
1. Action berasal dari blocker aktif
2. Action dapat dilakukan sekarang
3. Action dengan severity tertinggi
4. Action yang membuka dependency terbanyak
5. Action dengan due/expiry terdekat
6. Action mempunyai owner atau assignable owner
```

```typescript
function determineCategoryNextAction(items: ReadinessIssue[]): ReadinessAction | null {
  return (
    items
      .filter((item) => item.status !== 'RESOLVED')
      .filter((item) => item.actionAvailable)
      .sort(compareSeverity)
      .sort(compareDependencyImpact)
      .sort(compareDueAt)[0]?.action ?? null
  );
}
```

Jika tidak ada action yang dapat dilakukan karena menunggu pihak eksternal:

```text
Next action: Await supplier confirmation
Owner: Procurement
Expected update: 16:00 WIT
```

Jangan menampilkan tombol yang sebenarnya tidak dapat menyelesaikan masalah.

---

# 18. Evaluation engine

Readiness evaluation dijalankan pada:

- Work Package dibuat;

- workscope berubah;

- aircraft configuration berubah;

- material di-reserve/issue/install;

- tool di-assign atau calibration berubah;

- personnel assignment/authorization berubah;

- Job Card berubah state;

- finding dibuat/ditutup;

- inspection berubah;

- record accepted/corrected;

- MEL/CDL berubah;

- synchronization conflict muncul atau selesai;

- user menjalankan `Run Readiness Check`.

## Evaluation flow

```text
Load current Work Package revision
→ Load aircraft configuration
→ Load domain snapshots
→ Execute category evaluators
→ Generate criteria results
→ Generate unique blockers/warnings
→ Determine next actions
→ Save immutable evaluation snapshot
→ Recalculate global release decision
```

Evaluator gagal tidak boleh menghasilkan status hijau.

```text
Material evaluator unavailable
→ Material status: EVALUATION_FAILED
→ Global release decision: BLOCKED/STATUS UNAVAILABLE
```

---

# 19. Readiness snapshot

Setiap evaluation menghasilkan snapshot immutable:

```typescript
interface ReadinessEvaluationSnapshot {
  id: string;
  workPackageId: string;
  workPackageRevision: number;
  aircraftId: string;
  aircraftConfigurationVersion: number;

  status: 'CLEAR' | 'WARNING' | 'BLOCKED' | 'EVALUATION_FAILED';

  categories: ReadinessCategorySummary[];

  uniqueBlockerCount: number;
  uniqueWarningCount: number;
  passedCriteriaCount: number;
  totalCriteriaCount: number;

  ruleSetVersion: string;
  evaluatedAt: string;
  evaluatedBy: 'SYSTEM' | 'USER_REQUEST';

  sourceVersions: Record<string, number>;
  previousSnapshotId?: string;
}
```

Category summary:

```typescript
interface ReadinessCategorySummary {
  code:
    | 'WORK_EXECUTION'
    | 'MEL_CDL_DEFECTS'
    | 'MATERIAL_COMPONENTS'
    | 'PERSONNEL'
    | 'TOOLS_GSE'
    | 'TECHNICAL_DATA_CAPABILITY'
    | 'INSPECTION'
    | 'TECHNICAL_RECORDS';

  status: ReadinessCategoryStatus;

  processOwnerRole: string;
  currentActionOwnerRole?: string;
  currentActionOwnerUserId?: string;

  blockerCount: number;
  warningCount: number;

  passedCriteria: number;
  totalCriteria: number;

  nextAction?: ReadinessAction;
  highestPriorityIssueId?: string;

  evaluatedAt: string;
  dataFreshnessStatus: 'CURRENT' | 'AGING' | 'STALE' | 'CONFLICT' | 'UNKNOWN';
}
```

---

# 20. API

```http
GET /maintenance/work-packages/{id}/readiness
```

Response:

```json
{
  "evaluationId": "rdy_20260829_143200_017",
  "workPackageId": "wp_2026_0018",
  "workPackageRevision": 7,
  "overallStatus": "BLOCKED",
  "uniqueBlockerCount": 10,
  "uniqueWarningCount": 5,
  "passedCriteriaCount": 77,
  "totalCriteriaCount": 93,
  "evaluatedAt": "2026-08-29T14:32:00+09:00",
  "ruleSetVersion": "MRO-RDY-1.0.0",
  "categories": [
    {
      "code": "WORK_EXECUTION",
      "status": "BLOCKED",
      "processOwnerRole": "PRODUCTION_SUPERVISOR",
      "blockerCount": 6,
      "warningCount": 2,
      "passedCriteria": 16,
      "totalCriteria": 24,
      "nextAction": {
        "code": "COMPLETE_MANDATORY_JOB_CARDS",
        "label": "Complete 6 mandatory Job Cards",
        "target": "/work-packages/wp_2026_0018/execution?readiness=blocking"
      },
      "evaluatedAt": "2026-08-29T14:32:00+09:00",
      "dataFreshnessStatus": "CURRENT"
    }
  ]
}
```

Manual refresh:

```http
POST /maintenance/work-packages/{id}/readiness/evaluations
```

Payload:

```json
{
  "expectedWorkPackageRevision": 7,
  "idempotencyKey": "fb23b978-51e2-4382-b65d-8afae542d44f"
}
```

---

# 21. Audit events

```text
READINESS_EVALUATION_STARTED
READINESS_EVALUATION_COMPLETED
READINESS_EVALUATION_FAILED
READINESS_CATEGORY_BLOCKED
READINESS_CATEGORY_CLEARED
READINESS_WARNING_CREATED
READINESS_WARNING_RESOLVED
READINESS_BLOCKER_CREATED
READINESS_BLOCKER_ASSIGNED
READINESS_BLOCKER_RESOLVED
READINESS_NEXT_ACTION_CHANGED
```

Setiap event menyimpan:

```text
Work Package
Work Package revision
Aircraft
Category
Rule ID dan version
Previous result
New result
Source entity
Evidence
Actor/system
Occurred at
Recorded at
```

---

# 22. Regulatory Traceability Matrix

| ID          | Requirement                                           | Business rule                                                      | UI/system control           | Evidence                  | Owner              | Failure behaviour                              |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------------ | --------------------------- | ------------------------- | ------------------ | ---------------------------------------------- |
| **RDY-001** | Kesiapan harus dievaluasi lintas-domain               | Semua mandatory category harus mempunyai evaluation result         | Readiness Summary           | Evaluation snapshot       | System             | Release review ditolak                         |
| **RDY-002** | Status tidak boleh diisi manual                       | Category status hanya berasal dari evaluator                       | Read-only status badge      | Rule result               | System             | Direct update ditolak                          |
| **RDY-003** | Resource tidak cukup dapat menghentikan proses        | Personnel, material, tools, facility, dan data mempunyai hard gate | Domain blocker              | Resource evidence         | Domain owner       | Category `BLOCKED`                             |
| **RDY-004** | Tool dan test equipment harus valid                   | Required tool harus sesuai dan calibration valid                   | Tool readiness row          | Tool/certificate snapshot | Tool Control       | Task/release blocked                           |
| **RDY-005** | Personel harus trained, qualified, dan authorized     | Runtime assignment dan authorization evaluation                    | Personnel readiness row     | Authorization snapshot    | Production/Quality | Assignment/signature ditolak                   |
| **RDY-006** | Technical Records harus lengkap dan retrievable       | Records evaluator harus passed sebelum release review              | Records readiness row       | Records package snapshot  | Technical Records  | Release blocked                                |
| **RDY-007** | Blocker harus actionable                              | Setiap blocker mempunyai owner, impact, dan required action        | Next-action column/drawer   | Blocker record            | Process owner      | Tidak dapat berstatus valid tanpa owner/action |
| **RDY-008** | Evaluasi gagal tidak menghasilkan false clear         | Evaluator error menghasilkan `EVALUATION_FAILED`                   | Error state                 | Error/input snapshot      | System             | Global release blocked                         |
| **RDY-009** | Status harus menggunakan data revision yang konsisten | Work Package dan source versions dibekukan dalam snapshot          | Evaluated-at/version detail | Source-version map        | System             | Snapshot invalidated                           |
| **RDY-010** | Blocker tidak boleh dihitung berulang                 | Satu issue mempunyai primary category dan unique ID                | Deduplicated counts         | Issue dependency graph    | System             | Global count menggunakan unique blocker        |
| **RDY-011** | Not evaluated berbeda dari clear                      | Category tanpa evaluation tidak menampilkan nol                    | `NOT EVALUATED` badge       | Evaluator history         | System             | Release review blocked                         |
| **RDY-012** | Detail tidak boleh menghilangkan aircraft context     | Drawer mempertahankan persistent header                            | Side drawer                 | Context ID                | UI/backend         | Context mismatch diblokir                      |

---

# 23. UAT wajib

| Skenario                                         | Hasil yang harus terjadi                                     |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Material evaluator belum dijalankan              | Tampil `NOT EVALUATED`, bukan `0 blocker`                    |
| Tool calibration expired                         | Tools `BLOCKED`; Job Card terkait blocked                    |
| Tool diganti dengan calibrated replacement       | Blocker resolved dan readiness dihitung ulang                |
| Technician authorization expired                 | Personnel `BLOCKED`; assignment/sign-off ditolak             |
| Enam Job Card incomplete                         | Work Execution menampilkan 6 blocker teragregasi             |
| Satu material shortage memengaruhi tiga Job Card | Global blocker dihitung satu, dependencies tetap tiga        |
| MEL expired                                      | MEL/CDL `BLOCKED` dan menjadi highest-priority action        |
| Inspection rejected                              | Inspection `BLOCKED`; Work Execution kembali untuk rework    |
| Rework selesai tetapi belum reinspected          | Inspection tetap blocked                                     |
| Missing material certificate                     | Material atau Records blocked sesuai tahap transaksi         |
| Record attachment belum sinkron                  | Technical Records blocked jika attachment critical           |
| Technical-data revision superseded               | Technical Data blocked atau revision review required         |
| Evaluator mengalami timeout                      | Category `EVALUATION_FAILED`; release tidak menjadi eligible |
| Blocker diselesaikan                             | Snapshot baru dibuat; snapshot lama tetap tersedia           |
| User membuka row                                 | Drawer menampilkan blocker, evidence, owner, action          |
| User memilih pekerjaan panjang                   | Dialihkan ke subpage, bukan form di dalam modal              |
| User berpindah aircraft saat drawer terbuka      | Action diblokir sampai context diselaraskan                  |
| UI dilihat grayscale                             | Status tetap dikenali melalui ikon dan label                 |
| Tablet portrait                                  | Category tetap terbaca tanpa horizontal table scroll         |

---

# Keputusan final

Struktur yang digunakan bukan hanya:

```text
Category · Blocker · Warning · Passed
```

Tetapi:

```text
Category
→ Computed Status
→ Unique Blockers
→ Warnings
→ Passed/Total Criteria
→ Current Owner
→ Highest-Priority Issue
→ Next Action
→ Last Evaluation
→ Data Freshness
```

Readiness Summary menjadi **control surface** untuk seluruh Work Package:

- row menunjukkan kondisi;

- drawer digunakan untuk memahami dan melakukan quick action;

- subpage digunakan untuk menyelesaikan pekerjaan;

- status dihitung backend;

- setiap hasil mempunyai evidence dan rule version;

- kategori yang belum dinilai tidak pernah ditampilkan seolah-olah aman.

Dengan demikian, tabel ini bukan sekadar ringkasan visual. Ia menjadi penghubung antara **execution, resource readiness, inspection, technical records, dan technical release**.
