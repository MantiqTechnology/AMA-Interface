# Persistent Context Header MRO — Spesifikasi Implementasi

Saya menetapkan header ini sebagai **komponen wajib dan persisten** pada seluruh subpage Work Package:

```text
Overview
Execution
Findings
Resources
Technical Records
Inspection & Release
```

Header bukan sekadar identitas halaman. Fungsinya adalah mencegah user:

- mengerjakan pesawat yang salah;

- membaca status yang salah;

- menandatangani Job Card pada Work Package yang salah;

- menggunakan FH/FC yang tidak mutakhir;

- salah memahami bahwa Work Package sudah selesai berarti pesawat sudah `IN SERVICE`;

- melakukan action berdasarkan data yang belum tersinkron.

Kebutuhan ini sejalan dengan kewajiban pengendalian maintenance records, current aircraft/component status, technical data yang terkendali, serta bukti bahwa pekerjaan dilakukan sesuai persyaratan yang berlaku. DGCA SI 8900-3.329 membahas generation, preservation, retention, dan retrieval maintenance records, sementara SI 8900-6.9 membahas pengendalian technical data, maintenance records, personnel, tools, dan release dalam AMO. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/detail?data=BoXD6FugDsmLtnC0xQdai88m36NZs0cjb4uTP6cLSqRg4DpM5JjdTwu8bP2KrCNBVY8QiR0VbrMyE8QiOZ3FO2WB4TsaMJ1BvUn4jw20VTujlRGErOjE8vr6vCHhXBPRj6or5ouCKtcZUuj5StG7W3oLoS&utm_source=chatgpt.com 'Peraturan Direktur Jenderal Perhubungan Udara Nomor: KP 060tahun 2018'))

---

# 1. Keputusan struktur header

Gunakan **dua lapisan sticky header**, bukan satu baris yang dipenuhi banyak field.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ AIRCRAFT CONTEXT                                                            │
│ PK-ANI · ATR 72-600 · MSN 1234      Wamena (WAM)      MAINTENANCE           │
│ Airframe 12,840:35 FH · 9,214 FC    Updated 14:31 WIT                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ WORK PACKAGE CONTEXT                                                        │
│ WP-2026-0018 · MS-100FH Inspection     IN EXECUTION                         │
│ 29 Aug 08:00 – 31 Aug 18:00 WIT       RELEASE BLOCKED · 8 blockers          │
│ Last Sync 14:32 WIT · SYNCED                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Lapisan 1 — Aircraft Context

Menjawab:

> Pesawat apa yang sedang dikerjakan dan bagaimana status teknisnya sekarang?

## Lapisan 2 — Work Package Context

Menjawab:

> Pekerjaan maintenance mana yang sedang dibuka, berada pada tahap apa, dan apakah hasilnya dapat menuju release?

Kedua konteks tersebut tidak boleh digabung menjadi satu status.

---

# 2. Informasi yang wajib ditampilkan

## A. Aircraft registration

### Field

```text
aircraft.registration
```

### Contoh nilai

```text
PK-ANI
```

### Ketetapan UI

- Menjadi teks paling dominan pada header.

- Tidak boleh terpotong.

- Tetap terlihat saat user scroll.

- Ditampilkan pada setiap dialog atau drawer yang menghasilkan perubahan teknis.

- Saat action kritis, registration ditampilkan kembali pada confirmation screen.

### Source of truth

```text
Aircraft Master / Aircraft Registry
```

### Guard

Jika registration tidak dapat ditentukan:

```text
AIRCRAFT CONTEXT UNAVAILABLE
```

Semua action execution, inspection, dan signature harus diblokir.

---

## B. Aircraft type dan model

### Field

```text
aircraft.type
aircraft.model
```

### Tampilan

```text
ATR 72-600
```

Jangan hanya menampilkan:

```text
ATR
```

karena type family belum tentu cukup untuk menentukan applicability.

### Source of truth

```text
Aircraft Configuration Master
```

### Perilaku

Jika configuration master belum diverifikasi:

```text
ATR 72-600
CONFIGURATION UNVERIFIED
```

Status tersebut harus menjadi blocker untuk technical validation dan task applicability, tetapi tidak selalu menghalangi user membuka data secara read-only.

---

## C. Serial number atau MSN

### Field

```text
aircraft.manufacturer_serial_number
```

### Tampilan

```text
MSN 1234
```

### Keputusan layout

MSN wajib tersedia, tetapi tidak harus memiliki bobot visual sebesar registration.

Urutan visual:

```text
PK-ANI · ATR 72-600 · MSN 1234
```

MSN penting karena applicability technical data sering bergantung pada serial number, effectivity range, modification status, dan actual configuration—tidak hanya aircraft type.

### Failure state

```text
MSN UNKNOWN
```

Jika task memerlukan MSN-based applicability, task tersebut berubah menjadi:

```text
APPLICABILITY UNRESOLVED
```

---

## D. Current station

### Field

```text
aircraft.current_station_id
aircraft.current_station_code
aircraft.current_station_name
```

### Tampilan

```text
Wamena (WAM)
```

Gunakan kode station internal/IATA/ICAO sesuai standard master data perusahaan, tetapi jangan mencampurkan kode berbeda tanpa label.

### Source of truth

Current station berasal dari event yang dapat ditelusuri:

```text
Flight arrival
Aircraft movement
Maintenance induction
Authorized station transfer
```

### Perilaku

Current station **bukan dropdown bebas** pada header.

Perubahan station harus melalui command:

```text
TRANSFER_AIRCRAFT_STATION
```

atau event operasional yang sah.

### Evidence

- station sebelumnya;

- station baru;

- event source;

- effective time;

- actor/system;

- reason;

- aircraft movement reference.

### Dampak

Perubahan station harus menjalankan ulang:

```text
AMO location validity
Station capability
Personnel availability
Material availability
Tool availability
Offline package availability
```

---

## E. Current operational/technical status

### Field

```text
aircraft.technical_status
```

### Enum

```text
IN_SERVICE
MAINTENANCE
GROUNDED
AOG
```

### Visual

| Status        | Visual                                  |
| ------------- | --------------------------------------- |
| `IN_SERVICE`  | Ikon check + label hijau                |
| `MAINTENANCE` | Ikon wrench + label biru/abu            |
| `GROUNDED`    | Ikon stop + label merah                 |
| `AOG`         | Ikon critical + label merah/oranye kuat |

Warna bukan satu-satunya indikator. Status harus menggunakan:

```text
Icon + text label + color + short explanation
```

### Contoh

```text
⛔ GROUNDED
Open no-go defect
```

### Aturan penting

Aircraft status tidak boleh diturunkan hanya dari Work Package yang sedang dibuka.

Status merupakan hasil agregasi:

```text
Active maintenance events
Open grounding defects
MEL/CDL status
Aircraft-level holds
Technical release records
Configuration conflicts
```

Work Package dapat `RELEASED`, tetapi aircraft tetap `GROUNDED` jika masih ada defect atau hold lain.

---

# 3. Work Package context

## A. Work Package ID

### Field

```text
work_package.number
```

### Tampilan

```text
WP-2026-0018
```

Nomor harus selalu ditampilkan bersama nama package.

Buruk:

```text
100 FH Inspection
```

Benar:

```text
WP-2026-0018 · MS-100FH Inspection
```

Nomor menjadi referensi stabil untuk:

- technical records;

- attachment;

- audit;

- handover;

- inspection;

- release;

- komunikasi lintas role.

---

## B. Work Package name/type

### Field

```text
work_package.title
work_package.maintenance_event_type
```

### Tampilan

```text
MS-100FH Inspection
```

Event type harus berasal dari controlled taxonomy:

```text
SCHEDULED_CHECK
LINE_MAINTENANCE
BASE_MAINTENANCE
AOG_RECOVERY
DEFECT_RECTIFICATION
COMPONENT_CHANGE
MODIFICATION
REPAIR
SPECIAL_INSPECTION
```

Jangan menggunakan free text sebagai satu-satunya identitas event.

---

## C. Work Package lifecycle

### Field

```text
work_package.lifecycle_state
```

### Nilai

```text
DRAFT
PLANNING
TECHNICAL_REVIEW
READINESS_REVIEW
COMMITTED
READY_FOR_EXECUTION
IN_EXECUTION
AWAITING_FINAL_INSPECTION
AWAITING_RECORDS
RELEASE_REVIEW
RELEASED
ARCHIVED
CANCELLED
TERMINATED
```

### Tampilan

```text
IN EXECUTION
```

Lifecycle tidak boleh diganti dengan label seperti:

```text
70% completed
```

Persentase dapat ditampilkan sebagai pendukung, tetapi tidak menggantikan state proses.

---

## D. Release gate status

### Field

```text
work_package.release_gate_status
```

### Nilai

```text
NOT_EVALUATED
BLOCKED
REVIEW_REQUIRED
ELIGIBLE
RELEASED
```

### Tampilan

```text
⛔ RELEASE BLOCKED · 8 blockers
```

atau:

```text
✓ ELIGIBLE FOR RELEASE REVIEW
```

### Aturan

`ELIGIBLE` tidak berarti pesawat sudah dirilis.

Urutannya:

```text
Release Gate Eligible
→ Certifying Staff Review
→ Technical Release Signed
→ Aircraft Status Recalculated
```

---

## E. Maintenance window

### Fields

```text
work_package.planned_start_at
work_package.planned_finish_at
work_package.actual_start_at
work_package.estimated_release_at
```

### Tampilan normal

```text
29 Aug 2026 08:00 – 31 Aug 2026 18:00 WIT
```

### Saat execution sudah dimulai

Tampilkan actual start dan current ETR:

```text
Started 29 Aug 08:14 WIT
Current ETR 31 Aug 19:30 WIT
```

### Status variance

```text
ON PLAN
AT RISK
DELAYED
ETR NOT AVAILABLE
```

ETR tidak boleh disajikan sebagai technical release promise.

Tampilkan label:

```text
Estimated Release Time
Planning estimate — not technical release
```

---

# 4. Aircraft FH/FC

## Data yang ditampilkan

```text
Airframe FH
Airframe FC
Utilization effective timestamp
Utilization source
Reconciliation status
```

### Tampilan

```text
12,840:35 FH · 9,214 FC
As of 29 Aug 2026 14:31 WIT
```

Gunakan format FH yang konsisten.

Jika operator menggunakan jam-menit:

```text
12,840:35 FH
```

Jangan mencampurkannya dengan decimal hours tanpa label:

```text
12,840.58 FH
```

## Source of truth

Utilization berasal dari record yang dapat ditelusuri, misalnya:

- flight record;

- technical log;

- journey log;

- verified integration;

- authorized correction.

DGCA SI 8900-3.329 berfokus pada maintenance-record system dan current-status records yang harus dapat dipreservasi serta diambil kembali. Hal ini mendukung kebutuhan agar FH/FC tidak hanya ditampilkan sebagai angka, tetapi juga memiliki source dan timestamp yang jelas. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/detail?data=BoXD6FugDsmLtnC0xQdai88m36NZs0cjb4uTP6cLSqRg4DpM5JjdTwu8bP2KrCNBVY8QiR0VbrMyE8QiOZ3FO2WB4TsaMJ1BvUn4jw20VTujlRGErOjE8vr6vCHhXBPRj6or5ouCKtcZUuj5StG7W3oLoS&utm_source=chatgpt.com 'Peraturan Direktur Jenderal Perhubungan Udara Nomor: KP 060tahun 2018'))

## Status utilization

```text
VERIFIED
PENDING_RECONCILIATION
STALE
CONFLICT
UNKNOWN
```

### Visual

```text
12,840:35 FH · 9,214 FC
✓ Verified at 14:31 WIT
```

atau:

```text
12,840:35 FH · 9,214 FC
⚠ Pending flight-log reconciliation
```

## Guard

Jika utilization conflict memengaruhi due calculation:

```text
DUE CALCULATION UNRELIABLE
```

Konsekuensinya:

- Planner tidak boleh commit task yang bergantung pada nilai tersebut.

- Release gate dapat diblokir jika conflict memengaruhi mandatory maintenance status.

---

# 5. Last synchronization

## Field

```text
sync_state
last_successful_sync_at
pending_change_count
conflict_count
```

## Nilai status

```text
SYNCED
PENDING_SYNC
SYNCING
SYNC_FAILED
CONFLICT
LOCAL_ONLY
SERVER_REJECTED
```

### Tampilan normal

```text
✓ SYNCED · 14:32 WIT
```

### Tampilan offline

```text
OFFLINE
Last server sync 13:42 WIT
3 changes pending
```

### Tampilan conflict

```text
⛔ SYNC CONFLICT
2 critical records require review
```

## Aturan

Jangan menggunakan satu label:

```text
Saved
```

Gunakan status yang menyatakan lokasi data sebenarnya:

```text
Saved locally
Pending server synchronization
Synchronized
Rejected by server
```

Untuk action kritis seperti records acceptance atau release, backend harus memeriksa status sinkronisasi dan integritas record, bukan hanya status visual di perangkat.

---

# 6. Data freshness

`Last sync` dan `data freshness` adalah dua hal berbeda.

## Last sync

Menjawab:

> Kapan perangkat terakhir bertukar data dengan server?

## Data freshness

Menjawab:

> Apakah data sumber yang sedang ditampilkan masih cukup mutakhir untuk keputusan ini?

Contohnya:

- perangkat baru saja sinkron;

- tetapi personnel authorization yang dibawa dalam offline package sudah kedaluwarsa;

- sehingga `Last Sync = recent`, tetapi `Authorization Data = stale`.

## Status freshness

```text
CURRENT
AGING
STALE
UNKNOWN
CONFLICT
```

## Freshness dihitung per domain

```text
Aircraft utilization
MEL/CDL status
Personnel authorization
Material eligibility
Tool calibration
Technical-data revision
Aircraft configuration
```

## Kebijakan

Jangan hard-code satu threshold untuk seluruh data.

Gunakan policy:

```text
freshness_policy
- data_domain
- maximum_age
- source
- operation_mode
- criticality
- stale_behaviour
```

Nilai `maximum_age` harus berasal dari approved procedure atau data-governance decision operator.

## Header summary

Header hanya menampilkan hasil paling kritis:

```text
DATA CURRENT
```

atau:

```text
⚠ STALE DATA
Authorization and utilization require refresh
```

Klik status membuka detail:

| Domain               | Status  | Last verified | Dampak           |
| -------------------- | ------- | ------------: | ---------------- |
| Aircraft utilization | Current |         14:31 | Clear            |
| MEL/CDL              | Current |         14:28 | Clear            |
| Authorization        | Stale   |         10:02 | Sign-off blocked |
| Technical data       | Current |         13:55 | Clear            |

---

# 7. Hierarki visual final

Urutan prioritas visual:

## Level 1 — Keselamatan dan keputusan

```text
Aircraft Technical Status
Release Gate Status
Critical Data Freshness/Sync Conflict
```

## Level 2 — Identitas

```text
Registration
Aircraft type/model
Work Package number/name
Current station
```

## Level 3 — Proses

```text
Work Package lifecycle
Maintenance window
ETR
```

## Level 4 — Supporting context

```text
MSN
FH/FC
Last sync
Exact timestamps
```

Jangan membuat FH/FC lebih menonjol daripada status `GROUNDED` atau `RELEASE BLOCKED`.

---

# 8. Layout desktop

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ PK-ANI · ATR 72-600 · MSN 1234    Wamena (WAM)      ⛔ GROUNDED             │
│ 12,840:35 FH · 9,214 FC           Verified 14:31     Open no-go defect       │
├──────────────────────────────────────────────────────────────────────────────┤
│ WP-2026-0018 · MS-100FH Inspection       IN EXECUTION                       │
│ 29 Aug 08:00 – 31 Aug 18:00 WIT          ⛔ RELEASE BLOCKED · 8 blockers     │
│ ETR 31 Aug 19:30 WIT · AT RISK           ✓ SYNCED · 14:32 WIT               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Ukuran

- Tinggi dua lapis: sekitar 112–136 px.

- Registration: 20–24 px.

- Critical status: 16–20 px dengan weight tinggi.

- Metadata: 13–14 px minimum.

- Seluruh target interaction minimal 44 px.

- Jangan menggunakan horizontal scroll untuk header.

Angka tersebut merupakan baseline desain internal, bukan angka CASR.

---

# 9. Layout tablet

Pada tablet, gunakan tiga row.

```text
┌──────────────────────────────────────────┐
│ PK-ANI · ATR 72-600                      │
│ ⛔ GROUNDED · Wamena                     │
├──────────────────────────────────────────┤
│ WP-2026-0018                             │
│ MS-100FH Inspection · IN EXECUTION       │
│ ⛔ RELEASE BLOCKED · 8 blockers           │
├──────────────────────────────────────────┤
│ 12,840:35 FH · 9,214 FC                  │
│ Last Sync 14:32 WIT · DATA CURRENT       │
└──────────────────────────────────────────┘
```

## Yang tetap selalu terlihat

- registration;

- aircraft status;

- Work Package;

- release gate;

- sync/freshness alert.

## Yang dapat masuk expandable detail

- MSN;

- full maintenance window;

- utilization source;

- full station name;

- ETR history.

Critical information tidak boleh masuk tooltip atau hover karena tablet tidak mempunyai hover yang andal.

---

# 10. Perilaku ketika berpindah subpage

Saat user berpindah:

```text
Overview → Execution → Findings → Release
```

komponen header tidak di-render ulang dengan data lokal tiap halaman.

Gunakan satu source:

```text
MaintenanceContextProvider
```

atau Nuxt store:

```text
useMaintenanceContextStore()
```

Store menerima authoritative context dari backend dan memperbarui seluruh subpage.

## Header harus mempertahankan

```text
selected_aircraft_id
selected_work_package_id
aircraft_context_version
work_package_version
last_server_sync
```

Jika context berubah karena user membuka Work Package lain, sistem harus:

1. menampilkan perubahan context;

2. membatalkan draft action yang masih terkait Work Package sebelumnya;

3. meminta confirmation jika terdapat input belum tersimpan;

4. memuat ulang permissions dan transition actions;

5. tidak mempertahankan Job Card ID lama.

---

# 11. Context mismatch protection

Sebelum action kritis, UI harus memvalidasi bahwa:

```text
Displayed aircraft ID
=
Command aircraft ID
=
Job Card aircraft ID
=
Work Package aircraft ID
```

Jika tidak cocok:

```text
CONTEXT MISMATCH

This Job Card belongs to PK-ANB,
but the active workspace is PK-ANI.

Action has been blocked.
```

Simpan audit event:

```text
CONTEXT_MISMATCH_BLOCKED
```

Ini wajib divalidasi oleh backend, bukan hanya frontend.

---

# 12. Refresh dan real-time update

Header menerima update ketika terjadi:

- aircraft technical-status change;

- Work Package transition;

- blocker added/resolved;

- MEL/CDL change;

- utilization update;

- station change;

- release issued;

- synchronization conflict;

- technical-data revision impact.

## Perubahan status kritis

Jangan mengganti diam-diam.

Tampilkan state change:

```text
AIRCRAFT STATUS CHANGED

MAINTENANCE → GROUNDED
Reason: No-go finding NR-2026-041
Changed at 14:41 WIT
```

User harus acknowledge jika perubahan memengaruhi task aktif.

---

# 13. Permission model

Header umumnya read-only.

## Role yang dapat mengubah data terkait

| Data                      | Authorized process                                 |
| ------------------------- | -------------------------------------------------- |
| Registration/MSN/type     | Controlled aircraft master/configuration procedure |
| Current station           | Aircraft movement/induction/authorized transfer    |
| Aircraft technical status | Computed system + authorized maintenance event     |
| Work Package              | Work Package state transition                      |
| Maintenance window/ETR    | Planner/Maintenance Control                        |
| FH/FC                     | Flight record/Technical Records reconciliation     |
| Release status            | Computed release gate + Certifying Staff signature |
| Sync/freshness            | System-generated                                   |

Tidak ada user yang boleh menekan status pada header lalu memilih nilai baru dari dropdown.

---

# 14. Data model

```typescript
type AircraftTechnicalStatus = 'IN_SERVICE' | 'MAINTENANCE' | 'GROUNDED' | 'AOG';

type ReleaseGateStatus = 'NOT_EVALUATED' | 'BLOCKED' | 'REVIEW_REQUIRED' | 'ELIGIBLE' | 'RELEASED';

type SyncStatus =
  | 'LOCAL_ONLY'
  | 'PENDING_SYNC'
  | 'SYNCING'
  | 'SYNCED'
  | 'SYNC_FAILED'
  | 'CONFLICT'
  | 'SERVER_REJECTED';

type FreshnessStatus = 'CURRENT' | 'AGING' | 'STALE' | 'UNKNOWN' | 'CONFLICT';

interface MaintenanceContextHeader {
  contextVersion: number;

  aircraft: {
    id: string;
    registration: string;
    type: string;
    model: string;
    msn: string;
    currentStationId: string;
    currentStationCode: string;
    currentStationName: string;
    technicalStatus: AircraftTechnicalStatus;
    statusReasonCode?: string;
    statusReasonText?: string;
  };

  utilization: {
    airframeFlightHoursMinutes: number;
    airframeFlightCycles: number;
    effectiveAt: string;
    sourceRecordId: string;
    reconciliationStatus: 'VERIFIED' | 'PENDING_RECONCILIATION' | 'STALE' | 'CONFLICT' | 'UNKNOWN';
  };

  workPackage: {
    id: string;
    number: string;
    title: string;
    lifecycleState: string;
    controlStatus: 'CLEAR' | 'WARNING' | 'BLOCKED' | 'ON_HOLD';
    releaseGateStatus: ReleaseGateStatus;
    blockerCount: number;
    warningCount: number;
    plannedStartAt: string;
    plannedFinishAt: string;
    actualStartAt?: string;
    estimatedReleaseAt?: string;
  };

  connectivity: {
    syncStatus: SyncStatus;
    lastSuccessfulSyncAt?: string;
    pendingChangeCount: number;
    conflictCount: number;
  };

  freshness: {
    overallStatus: FreshnessStatus;
    evaluatedAt: string;
    criticalDomains: Array<{
      domain: string;
      status: FreshnessStatus;
      lastVerifiedAt?: string;
      impact?: string;
    }>;
  };
}
```

---

# 15. API response

```http
GET /maintenance/work-packages/{workPackageId}/context
```

```json
{
  "contextVersion": 82,
  "aircraft": {
    "id": "ac_ani",
    "registration": "PK-ANI",
    "type": "ATR",
    "model": "72-600",
    "msn": "1234",
    "currentStationId": "st_wam",
    "currentStationCode": "WAM",
    "currentStationName": "Wamena",
    "technicalStatus": "GROUNDED",
    "statusReasonCode": "OPEN_NO_GO_FINDING",
    "statusReasonText": "No-go finding NR-2026-041"
  },
  "utilization": {
    "airframeFlightHoursMinutes": 770435,
    "airframeFlightCycles": 9214,
    "effectiveAt": "2026-08-29T14:31:00+09:00",
    "sourceRecordId": "fr_29881",
    "reconciliationStatus": "VERIFIED"
  },
  "workPackage": {
    "id": "wp_2026_0018",
    "number": "WP-2026-0018",
    "title": "MS-100FH Inspection",
    "lifecycleState": "IN_EXECUTION",
    "controlStatus": "BLOCKED",
    "releaseGateStatus": "BLOCKED",
    "blockerCount": 8,
    "warningCount": 3,
    "plannedStartAt": "2026-08-29T08:00:00+09:00",
    "plannedFinishAt": "2026-08-31T18:00:00+09:00",
    "actualStartAt": "2026-08-29T08:14:00+09:00",
    "estimatedReleaseAt": "2026-08-31T19:30:00+09:00"
  },
  "connectivity": {
    "syncStatus": "SYNCED",
    "lastSuccessfulSyncAt": "2026-08-29T14:32:00+09:00",
    "pendingChangeCount": 0,
    "conflictCount": 0
  },
  "freshness": {
    "overallStatus": "CURRENT",
    "evaluatedAt": "2026-08-29T14:32:02+09:00",
    "criticalDomains": []
  }
}
```

---

# 16. Audit event

Perubahan context tidak hanya mengganti tampilan.

Perubahan kritis menghasilkan event:

```text
AIRCRAFT_TECHNICAL_STATUS_CHANGED
AIRCRAFT_STATION_CHANGED
AIRCRAFT_UTILIZATION_RECONCILED
WORK_PACKAGE_STATE_CHANGED
RELEASE_GATE_CHANGED
DATA_FRESHNESS_CHANGED
SYNC_CONFLICT_DETECTED
```

Data event minimal:

```text
Event ID
Aircraft ID
Work Package ID
Previous value
New value
Source
Actor/system
Occurred at
Recorded at
Reason
Correlation ID
```

---

# 17. Regulatory Traceability Matrix

| ID          | Requirement                                           | Business rule                                                    | UI/system control               | Evidence                         | Authorized role                            | Failure behaviour                      |
| ----------- | ----------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------- | -------------------------------- | ------------------------------------------ | -------------------------------------- |
| **CTX-001** | Aircraft identity harus selalu dapat ditentukan       | Registration, aircraft ID, MSN, dan Work Package harus konsisten | Persistent aircraft identity    | Context snapshot                 | System/Aircraft Master Admin               | Execution dan sign-off diblokir        |
| **CTX-002** | Aircraft configuration harus mendukung applicability  | Type/model/MSN/configuration harus verified                      | Configuration status            | Configuration revision           | Engineering/Technical Records              | Applicability unresolved               |
| **CTX-003** | Current location harus dapat ditelusuri               | Station berubah hanya melalui event sah                          | Station indicator               | Movement/induction event         | Maintenance Control/Operations integration | Capability review required             |
| **CTX-004** | Technical status tidak boleh ambigu                   | Status menggunakan controlled enum dan reason                    | Icon, label, color, description | Status event                     | System/authorized process                  | Action mengikuti status gate           |
| **CTX-005** | Work Package context harus persisten                  | Semua subpage menggunakan Work Package ID yang sama              | Sticky Work Package context     | Context access log               | System                                     | Context mismatch blocked               |
| **CTX-006** | Utilization harus mempunyai source dan effective time | FH/FC tanpa verified source tidak dapat dianggap current         | FH/FC freshness state           | Source record dan reconciliation | Technical Records                          | Due calculation flagged/blocked        |
| **CTX-007** | Sync state harus terlihat                             | Local data tidak boleh ditampilkan seolah server-validated       | Sync status badge               | Device/sync events               | System                                     | Critical action diblokir sesuai policy |
| **CTX-008** | Data freshness harus diketahui                        | Critical domain yang stale harus memengaruhi action              | Freshness summary               | Freshness evaluation             | System/Data owner                          | Warning atau hard block                |
| **CTX-009** | Release status terpisah dari lifecycle                | `IN_EXECUTION`, `BLOCKED`, dan aircraft status tidak digabung    | Separate status labels          | Gate evaluation snapshot         | System/Certifying Staff                    | Tidak ada false `Completed` state      |
| **CTX-010** | Critical status changes harus terlihat                | Perubahan tidak boleh silent                                     | Status-change notification      | Before/after event               | System                                     | User acknowledgment jika diperlukan    |

---

# 18. UAT yang wajib lulus

| Skenario                                                   | Expected result                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| User berpindah Overview ke Execution                       | Header tetap menampilkan aircraft dan Work Package yang sama         |
| User membuka Job Card milik aircraft lain                  | Action diblokir sebagai context mismatch                             |
| Aircraft berubah menjadi grounded saat user sedang bekerja | Header berubah segera dan alasan ditampilkan                         |
| Work Package released tetapi ada grounding defect lain     | Aircraft tetap `GROUNDED`                                            |
| FH/FC belum direkonsiliasi                                 | Header menunjukkan pending reconciliation                            |
| FH/FC conflict memengaruhi due                             | Commit/release action yang relevan diblokir                          |
| Perangkat offline                                          | Header menunjukkan offline dan waktu last server sync                |
| Ada perubahan lokal belum dikirim                          | `Pending Sync` dan jumlah perubahan terlihat                         |
| Ada conflict pada record kritis                            | Header menunjukkan critical conflict                                 |
| Authorization data stale                                   | Sign-off diblokir walaupun last sync masih baru                      |
| User membuka drawer/modal                                  | Registration dan Work Package tetap terlihat                         |
| Tablet landscape                                           | Status critical tetap above the fold                                 |
| Zoom 200%                                                  | Registration, aircraft status, release gate, dan sync tetap terlihat |
| Station berubah                                            | Capability dan resource readiness dihitung ulang                     |
| Work Package berganti                                      | Draft/action context lama dibersihkan atau dikonfirmasi              |

---

# 19. Keputusan final untuk Figma

Persistent header yang harus dibuat di Figma terdiri dari komponen berikut:

```text
MaintenanceContextHeader
├── AircraftIdentity
│   ├── Registration
│   ├── Type/Model
│   └── MSN
├── AircraftLocation
│   └── Current Station
├── AircraftTechnicalStatus
│   ├── Status
│   └── Reason
├── AircraftUtilization
│   ├── FH
│   ├── FC
│   └── Effective Time
├── WorkPackageIdentity
│   ├── Number
│   └── Title
├── WorkPackageLifecycle
├── MaintenanceWindow
├── ReleaseGateStatus
├── SynchronizationStatus
└── DataFreshnessStatus
```

Variant Figma yang harus tersedia:

```text
Desktop / Clear
Desktop / Warning
Desktop / Blocked
Desktop / Offline
Desktop / Sync Conflict
Tablet / Clear
Tablet / Warning
Tablet / Blocked
Tablet / Offline
Tablet / Sync Conflict
```

## Prinsip yang tidak boleh dilanggar

1. Registration selalu terlihat.

2. Aircraft status dan release status dipisahkan.

3. Work Package lifecycle dan blocker dipisahkan.

4. FH/FC selalu memiliki effective timestamp.

5. Last sync tidak dianggap sama dengan data freshness.

6. Station tidak dapat diedit dari header.

7. Context mismatch memblokir action.

8. Work Package release tidak otomatis membuat aircraft `IN SERVICE`.

9. Critical warning tidak disembunyikan ketika user berpindah tab.

10. Header tetap ringkas; detail dibuka melalui controlled context panel.

Dengan spesifikasi ini, persistent header bukan lagi dekorasi halaman. Ia menjadi **operational context control** yang menjaga identitas pesawat, status teknis, Work Package, source data, dan release state tetap konsisten sepanjang proses maintenance.
