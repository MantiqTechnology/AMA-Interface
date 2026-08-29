# Matrix Traceability Modul dan Use Case

Status:

- **Kuat untuk demo**: alur utama terhubung ke API/database dan memiliki evidence runtime/test yang relevan.
- **Parsial**: sebagian alur nyata, tetapi ada mock, gap, test drift, atau kontrol lintas modul belum tuntas.
- **Tampilan/simulasi**: sengaja demo-only dan telah/harus diberi disclosure.
- **Tidak tersedia**: tidak ditemukan implementasi in-scope.

Matrix ini menilai kesiapan demo, bukan sertifikasi compliance.

## Modul

|   # | Modul                              | Status                                          | Trace utama / evidence                                                                                                                                                        | Gap yang terlihat saat demo                                                                                                               |
| --: | ---------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Dashboard & Executive Reporting    | Parsial                                         | `app/pages/dashboard.vue` → `/api/dashboard` → `server/services/operations-monitoring.service.ts`/dashboard services → operational schemas                                    | Alert fallback palsu; file UI sangat besar; KPI perlu lineage disclosure                                                                  |
|   2 | Flight Operations                  | Kuat untuk demo                                 | `app/pages/flights/[id]/index.vue` → flight composables/API → `server/services/flight-operations.service.ts` + verification service → `server/db/schema/flight-operations.ts` | Service monolitik; acceptance selector drift; authority perlu validasi OpSpecs                                                            |
|   3 | Flight Request                     | Parsial                                         | `app/pages/flights/requests/new.vue` → planning/request APIs → flight operations service → flight request tables                                                              | Wizard kaya tetapi 2.290 baris; supplier/ground service masih mock; E2E label drift                                                       |
|   4 | Flight Order                       | Kuat untuk demo                                 | `app/pages/flights/index.vue`/detail → `/api/flight-operations/flights` → flight operations service → canonical `flights`                                                     | Terminologi Flight/Flight Order perlu diseragamkan                                                                                        |
|   5 | Flight Assignment                  | Parsial                                         | Flight detail/request wizard → assignment actions → verification service → crew/aircraft assignment records                                                                   | Qualification/authority perlu dikunci ke manual/operator applicability                                                                    |
|   6 | Readiness & Departure Assurance    | Kuat untuk demo                                 | `app/pages/flights/readiness/index.vue` → readiness/evaluate APIs → verification service → readiness/task/audit tables                                                        | Accessibility icon action; readiness vs final release authority perlu training presenter                                                  |
|   7 | Manifest Control                   | Kuat untuk demo                                 | `app/pages/flights/[id]/manifest.vue` → manifest passenger/cargo/approve/lock APIs → flight service → manifest tables                                                         | DG action icon-only; station/security chain-of-custody belum lengkap                                                                      |
|   8 | Fuel Control                       | Parsial                                         | `app/pages/flights/fuel/index.vue` → fuel APIs → flight service → fuel planning/uplift records                                                                                | Fuel supplier flow dinyatakan mock; actual-to-cost lineage perlu demo terkontrol                                                          |
|   9 | Flight Actual & Closure            | Kuat untuk demo                                 | actual/closure pages → lifecycle/closure APIs → verification/flight service → actual/closure/audit                                                                            | Offline critical action tidak boleh; authority/manual applicability belum disahkan                                                        |
|  10 | Station Operations                 | Kuat untuk demo                                 | station pages → `useStationOperations*`, `useStationVerification`, services/costs composables → station APIs → flight services/schema                                         | 10/10 selected E2E lulus; offline tidak ada; snackbar/label consistency perlu polish                                                      |
|  11 | Aircraft Master & Detail           | Parsial                                         | aircraft pages/features → master-data aircraft APIs/service → operations schema                                                                                               | GET aircraft tidak enforce permission; station admin/anonymous melihat seluruh fleet                                                      |
|  12 | Maintenance/MRO                    | Kuat untuk demo, high caution                   | maintenance pages → `useMaintenanceUi`/maintenance APIs → `server/features/maintenance/service.ts` → maintenance migrations/tables                                            | Service 8.768 baris; acceptance heading drift; manual/authorization validation tetap wajib                                                |
|  13 | Defect & Technical Log             | Kuat untuk demo                                 | `app/pages/maintenance/defects.vue` + flight maintenance handoff → maintenance APIs/service → defect/log/audit tables                                                         | Retention dan linkage MEL/manual perlu validasi AMA                                                                                       |
|  14 | MEL/Deferred Defect                | Parsial                                         | Defect/serviceability states ada di MRO/aircraft profile                                                                                                                      | Tidak ada evidence bahwa konfigurasi MEL, interval, category, extension, placard, dan expiry lengkap; **PERLU VERIFIKASI SOURCE/RUNTIME** |
|  15 | Work Order/Package/Job Card        | Kuat untuk demo                                 | work-package pages → maintenance APIs → maintenance service → WP/job card/signoff/inspection/release tables                                                                   | UI/service terlalu besar; perlu configuration-driven RII/dual sign-off                                                                    |
|  16 | Inventory & Spare Parts            | Kuat untuk demo                                 | inventory pages → `useInventoryUi` → inventory APIs → `server/features/inventory/service.ts`/repository → inventory schema                                                    | True-parallel reservation tests merah; permission/download audit perlu diperluas                                                          |
|  17 | Procurement                        | Kuat untuk demo                                 | PR/PO/receipt pages → inventory APIs → inventory service/repository → PR/PO/GR tables                                                                                         | Supplier master authority/finance reconciliation perlu end-to-end evidence                                                                |
|  18 | Repairables & Rotables             | Parsial                                         | repairables/core return pages → repair/core APIs → inventory service → serial/repair tables                                                                                   | Component history, life limit, cert acceptability dan cost loop perlu skenario PT AMA                                                     |
|  19 | Finance                            | Kuat untuk demo                                 | finance pages → finance APIs → feature services/repositories → finance schema                                                                                                 | E2E fixture period drift; external bank/tax/ERP integrations belum ada                                                                    |
|  20 | Invoice                            | Kuat untuk demo                                 | invoice pages → invoice APIs → invoice service/repository → billing/finance tables                                                                                            | Real customer/vendor documents dan payment integration belum divalidasi                                                                   |
|  21 | Accounting Workbench               | Kuat untuk demo                                 | accounting page → accounting APIs → accounting service → journals/lines                                                                                                       | Demo posting route harus dipisahkan/disabled di non-demo; SoD perlu formal validation                                                     |
|  22 | General Ledger                     | Kuat untuk demo                                 | accounting/reporting UI/API → accounting/reporting service → journal lines/dimensions                                                                                         | Export/reconciliation against external ledger belum tersedia                                                                              |
|  23 | Trial Balance                      | Kuat untuk demo                                 | `app/pages/finance/trial-balance.vue` → reporting API/service → posted journal lines                                                                                          | Pastikan period/filter dan drill-through selalu canonical                                                                                 |
|  24 | HPP & Profitability                | Parsial                                         | `app/pages/finance/hpp.vue` → aviation-profitability API → reporting service → posted GL dimensions                                                                           | E2E period expectation drift; source allocation policy perlu disetujui Finance AMA                                                        |
|  25 | Safety & Quality                   | Tidak tersedia sebagai SMS; MRO quality parsial | `app/pages/maintenance/quality.vue` dan maintenance quality API hanya MRO simulation                                                                                          | Hazard/confidential report/FRAT/CAPA/ERP/SPI/MOR tidak ada                                                                                |
|  26 | Aviation Security                  | Tidak tersedia                                  | Tidak ditemukan page/API/domain AVSEC                                                                                                                                         | Perlu scope tertutup berdasar program keamanan AMA; jangan fake dengan page generik                                                       |
|  27 | Documents & Uploads                | Parsial, security blocker                       | document components/APIs → document access/storage → manifests/object references                                                                                              | Upload API terbuka; station scope bocor untuk owner non-inventory; receipt endpoint bypass                                                |
|  28 | Access, Permission & Authorization | Demo-only, blocker                              | persona UI/session → role cookie → `server/utils/auth.ts` → permission map                                                                                                    | Anonymous super-admin, mutable role cookie, fail-open client routes                                                                       |
|  29 | Audit Trail                        | Parsial-kuat pada domain tertentu               | flight/MRO/finance audit APIs/services/tables + DB immutability triggers                                                                                                      | Coverage universal belum dibuktikan; document/upload/master data access tidak memadai                                                     |
|  30 | Offline & Sync Infrastructure      | Tidak tersedia                                  | Roadmap only; browser: 0 SW, 0 cache                                                                                                                                          | Tidak ada local draft/queue/retry/conflict/sync audit                                                                                     |
|  31 | Supporting Master Data             | Parsial                                         | master pages/features → master APIs/services/repositories → operations/finance schemas                                                                                        | Enforcement server tidak seragam; fuel/handling supplier berlabel mock                                                                    |

## Trace representative dari UI sampai database

### Flight readiness dan lifecycle

`app/pages/flights/readiness/index.vue` mengirim action evaluate melalui API flight operations. Handler memanggil service/verification layer; canonical state berada pada `server/db/schema/flight-operations.ts:8-59`, readiness pada `:64-93`, approval task stages pada `:113-156`, verification/audit pada `:180-223`, dan manifest uniqueness pada `:250-282`.

Assessment: struktur data memahami bahwa readiness, verification, approval, manifest, dan lifecycle bukan satu boolean. Risiko utama berada pada ukuran service, authority validation, dan gap offline—not on absence of schema.

### Station verification

Station UI menggunakan `app/features/station-operations/composables/useStationOperationsContext.ts`, `useStationOperationsPageData.ts`, dan `useStationVerification.ts`, lalu station-operation/verification APIs memanggil flight operations services dan canonical flight schema. Browser test membuktikan verification evidence bertahan setelah reload serta station scope pada endpoint yang diuji (`tests/e2e/station-operations.spec.ts:130-190`).

Assessment: ini alur paling aman untuk dijadikan pusat presentasi.

### MRO work package hingga release

`app/pages/maintenance/work-packages/[id]/index.vue` memanggil maintenance APIs, yang masuk ke `server/features/maintenance/service.ts`. Data MRO dibuat melalui maintenance migration/tables. Trigger melindungi signoff, inspection attempt, audit log, released package, technical release, release snapshot, dan audit pack (`server/db/migrations/maintenance.ts:751-821`).

Assessment: evidence integritas kuat untuk demo, tetapi file sangat besar dan applicability authorization/dual sign-off wajib dikonfirmasi dari manual AMA.

### MRO material ke inventory

`app/pages/inventory/maintenance-demand.vue` → inventory maintenance-demand APIs → inventory/resource services → reservation/issue/install/event tables. UI snapshot menunjukkan active demand dan stock reservation action. Namun dua true-parallel worker tests tidak menghasilkan hasil, sehingga protection terhadap simultaneous reservation belum mempunyai gate hijau (`tests/services/resource-v21-material-lifecycle.test.ts:81-101`).

Assessment: demo sequential aman setelah reset; jangan mendemokan dua user paralel sebelum retest.

### Inventory/flight cost ke accounting

Finance accounting API memanggil `server/features/finance/accounting/service.ts`. Source events diproses dalam immediate transactions (`:141-202`) menjadi journals/lines di `server/db/schema/finance.ts`; database menolak posted unbalanced/empty journal dan menjaga posted records immutable (`server/db/migrate.ts:1650-1706`).

Assessment: integrasi dan accounting control cukup meyakinkan untuk scripted demo, tetapi source allocation/policy dan external reconciliation belum disahkan Finance AMA.

### Documents

Document APIs memakai owner-access utility dan storage service. Inventory owner memiliki mapping station yang rinci, tetapi non-inventory owner langsung dianggap valid (`server/utils/document-access.ts:50-52`, `:159-196`). Raw uploads bahkan tidak melewati permission utility (`server/api/uploads/index.get.ts:1-6`).

Assessment: end-to-end ada, tetapi authorization boundary tidak aman.

## Use case A–W

| ID  | Use case                      | Status demo         | Catatan                                                                          |
| --- | ----------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| A   | Flight planning               | Parsial-kuat        | Route/aircraft/crew candidates dan advisories ada; wizard test selector drift    |
| B   | Aircraft & crew assignment    | Parsial-kuat        | Serviceability/eligibility preview ada; authority applicability perlu manual AMA |
| C   | Readiness evaluation          | Kuat                | Readiness dipisah dari final assurance dan menyimpan verification state          |
| D   | Manifest preparation          | Kuat                | Passenger/cargo/DG records tersedia                                              |
| E   | Load validation               | Parsial-kuat        | Capacity/readiness checks ada; W&B/loadsheet certification depth perlu validasi  |
| F   | Fuel planning & actual uplift | Parsial             | Planning/posted record ada; supplier flow masih mock                             |
| G   | Station handling              | Kuat                | Services/costs/tasks/verification tersedia dan E2E lulus                         |
| H   | Departure assurance           | Kuat dengan caution | Unsafe departure action disembunyikan saat blocker aktif                         |
| I   | Actual departure/arrival      | Kuat online         | Dialog actual time/station tersedia; tidak dapat offline                         |
| J   | Flight closure                | Kuat online         | Closure/handoff/audit tersedia                                                   |
| K   | Defect reporting              | Kuat                | Defect/handoff/work package linkage ada                                          |
| L   | Maintenance assessment        | Kuat                | Command center, due control, approved data, authorization concepts ada           |
| M   | Work order/job card           | Kuat                | WP/job card/signoff/inspection workflow kaya                                     |
| N   | Spare-part issue              | Parsial-kuat        | Reservation/issue/install/return tersedia; race test belum hijau                 |
| O   | Inspection                    | Kuat                | Attempts/signoffs immutable pada DB                                              |
| P   | Technical release             | Kuat untuk demo     | Eligibility/release/audit pack ada; manual authority validation tetap wajib      |
| Q   | Inventory valuation           | Parsial-kuat        | Reporting/permission concept ada; external valuation policy perlu sign-off       |
| R   | Procurement                   | Kuat                | PR/PO/receipt/approval tersedia                                                  |
| S   | Cost handoff                  | Parsial-kuat        | Station/flight/inventory handoff ada; supplier mock dan external integration gap |
| T   | Journal creation              | Kuat                | Canonical source events dan DB balance guard                                     |
| U   | Approval & posting            | Kuat untuk demo     | Role checks/SoD concepts ada; demo auth tidak production-safe                    |
| V   | Audit & management reporting  | Parsial-kuat        | Flight/MRO/finance evidence tersedia; coverage universal belum ada               |
| W   | Offline station operation     | Tidak tersedia      | Hard blocker terhadap narasi offline-ready                                       |

## Baseline dokumen vs implementasi

| Perbedaan                                                                | Yang perlu diperbaiki                                                                                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| SOW menyebut PostgreSQL/S3, aplikasi default SQLite `/tmp`/local storage | Implementasi deployment harus diperbaiki; dokumen benar sebagai target, tetapi perlu phase/acceptance date                       |
| SOW meminta full SMS/AVSEC, implementasi tidak ada                       | Implementasi dan roadmap delivery perlu diperjelas; jangan menyatakan module complete                                            |
| Roadmap mengakui offline belum ada                                       | Implementasi belum memenuhi kebutuhan operasional; dokumen sudah jujur dan perlu dijadikan disclosure demo                       |
| SOW menyebut dual/authority secara luas                                  | Dokumen tidak boleh diterjemahkan menjadi blanket two-person rule; konfigurasi harus diturunkan dari OpSpecs/manual/task/RII AMA |
| E2E mengharapkan copy/fixture lama                                       | Test harus diperbaiki; UI baru pada beberapa kasus lebih informatif/lebih aman                                                   |
| Client route policy tampak RBAC, server master/upload tidak konsisten    | Implementasi harus diperbaiki; authorization tidak boleh bergantung UI                                                           |
