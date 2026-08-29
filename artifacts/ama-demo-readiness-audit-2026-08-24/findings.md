# Temuan Audit

## Cara membaca

- **BUG TERBUKTI**: dibuktikan oleh source dan/atau runtime.
- **RISIKO SANGAT MUNGKIN**: control lemah ditemukan, tetapi dampak akhir membutuhkan skenario tambahan.
- **GAP REQUIREMENT**: baseline bisnis/regulasi meminta kemampuan yang tidak tersedia atau belum lengkap.
- **REKOMENDASI PENINGKATAN**: maturity/usability improvement, bukan defect safety yang sudah terbukti.
- **P0**: blocker production atau demo publik; **P1**: blocker/risiko besar untuk demo klien; **P2**: penting setelah blocker; **P3**: polish.

## Register ringkas

| ID    | Severity | Klasifikasi             | Area                    | Temuan                                                            |
| ----- | -------- | ----------------------- | ----------------------- | ----------------------------------------------------------------- |
| F-001 | P0       | BUG TERBUKTI            | Auth                    | Pengunjung tanpa cookie menjadi Demo Admin wildcard               |
| F-002 | P0       | BUG TERBUKTI            | Upload/security         | Semua upload API tidak memiliki permission enforcement            |
| F-003 | P0       | BUG TERBUKTI            | Documents/station scope | Owner non-inventory selalu lolos station isolation                |
| F-004 | P0       | BUG TERBUKTI            | Dependency/devtools     | Advisory RCE kritis pada DevTools aktif                           |
| F-005 | P0       | GAP REQUIREMENT         | Offline                 | Tidak ada offline cache, queue, sync, conflict UI                 |
| F-006 | P0       | RISIKO SANGAT MUNGKIN   | Persistence/deployment  | SQLite production/Vercel default di `/tmp`                        |
| F-007 | P0       | GAP REQUIREMENT         | Safety & Quality        | SMS end-to-end tidak tersedia                                     |
| F-008 | P0       | GAP REQUIREMENT         | Aviation Security       | Modul AVSEC tidak tersedia                                        |
| F-009 | P1       | BUG TERBUKTI            | Demo credibility        | Fallback alert memakai maskapai/station bukan AMA dan dead action |
| F-010 | P1       | BUG TERBUKTI            | Responsive UX           | Dashboard dan Flight Following terpotong pada 390 px              |
| F-011 | P1       | BUG TERBUKTI            | Quality gate            | Lint default rusak, suite OOM, concurrency evidence merah         |
| F-012 | P1       | RISIKO SANGAT MUNGKIN   | Code architecture       | God files, direct SQL, dan unsafe typing meningkatkan change risk |
| F-013 | P2       | BUG TERBUKTI            | Accessibility           | Icon-only controls, toast, skip-link, dan focus indicator lemah   |
| F-014 | P2       | BUG TERBUKTI            | Consistency             | Bahasa dan locale tanggal tidak konsisten                         |
| F-015 | P1       | BUG TERBUKTI            | Master data access      | Aircraft read API tidak enforce permission                        |
| F-016 | P1       | GAP REQUIREMENT         | Workflow completeness   | Supplier/ground-service preparation masih dinyatakan mock         |
| F-017 | P1       | BUG TERBUKTI            | Global navigation       | Modul excluded/frontend-only tetap muncul lintas persona          |
| F-018 | P2       | REKOMENDASI PENINGKATAN | UI system               | Komponen KPI/header/status tersebar dalam beberapa keluarga       |
| F-019 | P2       | BUG TERBUKTI            | Regression tests        | Lima acceptance test drift dari UI/fixture aktual                 |
| F-020 | P2       | RISIKO SANGAT MUNGKIN   | Performance             | Bundle besar berisiko pada koneksi station terbatas               |
| F-021 | P1       | BUG TERBUKTI            | Runtime Vue/Nuxt        | Komponen tidak ter-resolve dan `useAsyncData` key/return conflict |

## Temuan terperinci

### F-001 — Pengunjung tanpa autentikasi memperoleh super-admin

Severity: **P0**  
Klasifikasi: **BUG TERBUKTI**

`getDemoRole()` mengembalikan `defaultDemoRole` ketika cookie hilang/tidak valid (`server/utils/auth.ts:33-36`); default tersebut adalah `Demo Admin` (`shared/types/roles.ts:21`) dan permission-nya wildcard (`shared/types/roles.ts:197-198`). Demo mode juga default aktif pada server dan public runtime config (`nuxt.config.ts:53-55`, `:68-70`). Runtime read-only tanpa cookie mengembalikan session Demo Admin dan dapat membaca aircraft/uploads.

Dampak: siapa pun yang mencapai URL memperoleh identity/authority tertinggi. Ini memang persona demo, tetapi mengubah deployment publik menjadi data/API sandbox dengan trust boundary nol. Cookie role dapat diubah melalui endpoint role switch selama demo runtime (`server/api/auth/role.post.ts:6-13`) dan sengaja tidak `httpOnly` (`server/utils/auth.ts:39-45`).

Perbaikan: default unauthenticated harus 401/login, demo persona hanya tersedia pada build/environment allowlisted, endpoint role switch dihapus dari deploy klien, dan server-side permission tetap wajib. Tambahkan MFA/IdP dan identity immutable sebelum production.

Kontrol demo sementara: localhost/private network only, firewall, database sintetis, tanpa data nyata.

### F-002 — Upload metadata/file/create/delete terbuka tanpa authorization

Severity: **P0**  
Klasifikasi: **BUG TERBUKTI**

List upload langsung memanggil storage tanpa `requireDemoPermission` (`server/api/uploads/index.get.ts:1-6`). Pola yang sama terdapat pada create/read/file/delete upload. Receipt upload menerima multipart, mempercayai extension, dan menulis byte langsung ke public directory tanpa permission, allowlist MIME, atau size limit (`server/api/uploads/receipts.post.ts:8-29`). Route `/uploads` juga dinyatakan public oleh client (`app/utils/demoRouteAccess.ts:41`). Runtime anonymous `GET /api/uploads` mengembalikan 23 metadata.

Dampak: disclosure dokumen, unauthorized upload/delete, storage exhaustion, dan active-content risk. Upload storage umum memiliki path/size safeguards, tetapi endpoint receipt khusus mem-bypass kontrol tersebut.

Perbaikan: permission per operasi, owner/station scope, confidential visibility, maximum size, MIME sniffing, antivirus/quarantine, non-public object storage, short-lived download URL, immutable audit, dan CSRF protection. Hapus receipt mock endpoint atau paksa melalui canonical upload service.

### F-003 — Station isolation dokumen tidak diterapkan pada owner operasional

Severity: **P0**  
Klasifikasi: **BUG TERBUKTI**

Document owner mencakup aircraft, personnel, station, vendor, customer, route, dan flight (`shared/contracts/documents.ts:5-24`). Namun semua owner yang bukan inventory/corporate asset di-resolve sebagai `exists: true` tanpa database lookup/station mapping (`server/utils/document-access.ts:50-52`). `canAccessDocumentOwner()` lalu selalu mengizinkannya (`server/utils/document-access.ts:159-172`) dan `requireDocumentOwnerAccess()` kembali tanpa check (`server/utils/document-access.ts:175-196`). Runtime Station Admin scope WMX dapat membaca seluruh dokumen owner `flight` yang tersedia.

Dampak: dokumen flight/aircraft/personnel dari station lain dapat terlihat. Visibility `CONFIDENTIAL`/`RESTRICTED` tidak berarti aman bila owner authorization salah.

Perbaikan: implement resolver per owner type, map flight ke origin/destination/operating station dan actor duty scope, deny unknown owner, test positive/negative lintas station, dan audit akses dokumen sensitif.

### F-004 — DevTools aktif dengan advisory RCE kritis

Severity: **P0**  
Klasifikasi: **BUG TERBUKTI**

Nuxt DevTools diaktifkan tanpa environment guard (`nuxt.config.ts:41-45`). `pnpm audit --prod --audit-level high` menemukan 23 advisory: 1 critical, 18 high, 4 moderate. Critical adalah `@nuxt/devtools <3.3.1`, unauthenticated DevTools RPC arbitrary command execution; dependency path berasal dari Nuxt 3.21.8 (`package.json:32-43`). Browser snapshot juga memperlihatkan tombol “Toggle Nuxt DevTools”.

Dampak: laptop developer/demo host dapat terkompromi bila dev server dapat dijangkau pihak lain. Advisory lain mencakup Nuxt sebelum 3.21.10 serta DoS/path traversal transitive dependencies.

Perbaikan: `devtools: { enabled: process.env.NODE_ENV === 'development' && process.env.ENABLE_DEVTOOLS === 'true' }`, upgrade Nuxt/lockfile ke patched versions, audit ulang, dan gunakan production preview untuk presentasi.

### F-005 — Offline station operation tidak tersedia

Severity: **P0**  
Klasifikasi: **GAP REQUIREMENT**

Roadmap secara jujur menyatakan offline/sync station belum tersedia (`docs/roadmap-enterprise-mvp.md:19-24`), sementara acceptance yang diharapkan mencakup cache per station, queue, idempotency, replay validation, conflict UI, retry, dan sync audit (`docs/roadmap-enterprise-mvp.md:1027-1069`). Browser probe menemukan 0 service worker, 0 cache, dan reload offline gagal `ERR_INTERNET_DISCONNECTED` dengan body kosong.

Dampak: station dengan koneksi terputus kehilangan workspace dan tidak dapat menyimpan draft/evidence. Memaksakan mutasi kritis offline tanpa desain khusus dapat menggandakan manifest, fuel, stock issue, sign-off, release, atau journal.

Perbaikan: implement subsystem offline terbatas sesuai roadmap. Jangan izinkan depart/land/close, technical release, finance posting, approval, atau authority-sensitive mutation offline sampai conflict/replay controls divalidasi.

### F-006 — SQLite production default berada di filesystem sementara

Severity: **P0**  
Klasifikasi: **RISIKO SANGAT MUNGKIN — PERLU VERIFIKASI SOURCE/RUNTIME pada target deploy**

Config memilih `/tmp/ama-demo.sqlite` ketika `VERCEL` atau production (`nuxt.config.ts:4-8`); DB client mengulang default itu (`server/db/client.ts:17-26`) dan memindahkan path Vercel ke `/tmp` (`server/db/client.ts:34-44`). SQLite sendiri mengaktifkan FK, busy timeout, dan WAL—kontrol lokal yang baik (`server/db/client.ts:56-62`).

Dampak: `/tmp` pada serverless bersifat ephemeral dan per-instance; restart/cold start dapat kehilangan data, beberapa instance dapat memiliki state berbeda, dan local WAL tidak menjadi shared durability. Ini bertentangan dengan requirement PostgreSQL, object storage, backup/DR (`docs/statement-of-work.md:207-216`).

Perbaikan: PostgreSQL managed, migrations versioned, object storage, transactional outbox/audit, backup/restore test, monitoring, dan deployment topology yang eksplisit.

### F-007 — Safety Management System tidak diimplementasikan

Severity: **P0**  
Klasifikasi: **GAP REQUIREMENT**

SOW meminta hazard/occurrence, confidential reporting, FRAT, hard-lock/override, CAPA, ERP, SPI, MOR, offline-first dan promotion/training (`docs/statement-of-work.md:160-175`). Source in-scope hanya memiliki halaman `maintenance/quality.vue` yang diberi label simulasi quality & safety; tidak ditemukan domain/API/page SMS end-to-end. **Nomor baris belum dapat diverifikasi** untuk implementasi karena file implementasi modul tersebut tidak ada.

Dampak: PT AMA dapat salah menganggap “Quality & Safety” sudah mendukung SMS, padahal siklus reporting–risk–mitigation–effectiveness–closure dan confidentiality belum tersedia. Baseline terbaru adalah PM 2 Tahun 2026; lihat `regulatory-baseline.md`.

Perbaikan: pisahkan SMS dari MRO quality simulation, definisikan confidential access model, hazard/risk taxonomy, FRAT gate, CAPA/effectiveness, reporting retention, audit, dan validate dengan accountable executive/manual AMA.

### F-008 — Aviation Security tidak diimplementasikan

Severity: **P0**  
Klasifikasi: **GAP REQUIREMENT**

Tidak ditemukan page/API/domain Aviation Security pada source in-scope. **Nomor baris belum dapat diverifikasi** untuk implementasi karena file modul tidak ada. Baseline resmi dan batas disclosure tercatat di `regulatory-baseline.md` bagian Aviation Security.

Dampak: tidak ada evidence workflow chain-of-custody/security event/need-to-know. Menambahkan page generik tanpa program keamanan PT AMA juga tidak cukup dan berisiko mengekspos prosedur sensitif.

Perbaikan: workshop tertutup dengan AVSEC PT AMA; tentukan scope yang boleh masuk aplikasi, need-to-know, evidence preservation, restricted export, dan audit access. Jangan masukkan materi sensitif ke demo umum.

### F-009 — Fallback notifikasi memakai data maskapai/bandara lain

Severity: **P1**  
Klasifikasi: **BUG TERBUKTI**

Topbar memiliki fallback GA204, QZ512, JT-682, CGK, dan SUB (`app/components/layout/Topbar.vue:18-68`). Fallback dipakai ketika dashboard tidak memiliki alert (`app/components/layout/Topbar.vue:71-74`). Tombol “View All Notifications” tidak memiliki navigation atau click handler (`app/components/layout/Topbar.vue:244-248`).

Dampak: klien langsung melihat bahwa demo menggunakan dummy airline lain; notifikasi critical palsu bisa dianggap data operasional. Dead button menurunkan trust.

Perbaikan: jika tidak ada alert, tampilkan honest empty state. Fixture harus memakai flight/station AMA yang konsisten dan badge `DEMO DATA`. Hubungkan tombol ke alert workbench atau hapus.

### F-010 — Layout mobile utama terpotong dan tidak usable

Severity: **P1**  
Klasifikasi: **BUG TERBUKTI berdasarkan visual evidence**

Screenshot `mobile-390-dashboard.png` dan `mobile-390-flight-following.png` menunjukkan sisi kiri content hilang, heading/filter/cards bertumpuk, serta kontrol keluar viewport. Source global menggunakan VMain dengan dynamic inline padding dan `overflow-x-hidden` (`app/layouts/default.vue:15-20`), yang dapat menyembunyikan overflow alih-alih memperbaiki layout. Akar per-component belum dipastikan. **Nomor baris belum dapat diverifikasi** untuk seluruh penyebab layout.

Dampak: penggunaan station lewat ponsel tidak dapat dipercaya; safety/action labels dapat terpotong.

Perbaikan: regression visual 360/390/768/1024, responsive table pattern, drawer overlay behavior, filter stacking, no clipped focus/alert, dan minimum target 44 px.

### F-011 — Quality gate tidak stabil/repeatable

Severity: **P1**  
Klasifikasi: **BUG TERBUKTI**

Lint script `eslint .` (`package.json:26`) tidak meng-ignore `.vercel` (`eslint.config.mjs:6-14`), menghasilkan 17,467 masalah meski source-only lint tidak memiliki error. Full test suite OOM sekitar 4 GB. Dua true-parallel reservation tests gagal karena worker tidak menghasilkan JSON pada `tests/services/resource-v21-material-lifecycle.test.ts:97-101`. Kombinasi test API inti juga tidak menyelesaikan output dan dihentikan setelah tidak ada progres.

Dampak: tim tidak memiliki satu command hijau yang membuktikan baseline. Race control pada spare reservation belum memiliki evidence test yang dapat dipercaya.

Perbaikan: ignore generated folders, shard suite, bounded worker/memory policy, close handles, surface child exit code/signal, dan wajibkan clean CI. Race test harus membedakan crash, spawn failure, DB lock, dan domain conflict.

### F-012 — File sangat besar dan direct SQL memperbesar risiko perubahan

Severity: **P1**  
Klasifikasi: **RISIKO SANGAT MUNGKIN — PERLU VERIFIKASI SOURCE/RUNTIME per perubahan**

Contoh: work-package Vue 5,107 baris, maintenance service 8,768 baris, flight operations service 7,080 baris, verification service 4,445 baris, flight request wizard 2,290 baris. Verification service menggunakan `any` pada boundary penting (`server/services/flight-operations-verification.service.ts:1114`, `:2185`, `:2190`, `:3972`, `:3976`, `:4408`) dan melakukan SQL langsung di service sekitar `:2170-2210` serta `:4408-4420`.

Dampak: perubahan state transition, authority, station scope, atau transaction boundary sulit direview dan mudah menimbulkan regression lintas modul.

Perbaikan: pisahkan domain command/query, typed DTO, repository per aggregate, state machine eksplisit, transaction boundary per use case, audit-outcome contract, dan characterization test sebelum refactor.

### F-013 — Accessibility dasar belum konsisten

Severity: **P2**  
Klasifikasi: **BUG TERBUKTI**

Tidak ada skip link pada root/layout (`app/app.vue:1-7`, `app/layouts/default.vue:11-23`). Banyak icon-only button tidak memiliki accessible name, misalnya readiness refresh/open/evaluate (`app/pages/flights/readiness/index.vue:122`, `:267-281`), Manifest back/refresh/DG accept/reject (`app/pages/flights/[id]/manifest.vue:153-166`, `:245-257`), dan Finance recognize/review (`app/pages/finance/closing.vue:285-291`, `:366-371`). Toast stack tidak memiliki live region (`app/components/feature/DemoToastStack.vue:12-27`). Field-help target hanya 24×24 dan focus-visible menghapus outline (`app/components/FieldHelpLabel.vue:38-58`).

Dampak: keyboard/screen-reader user tidak dapat mengetahui fungsi action kritis atau feedback save/approve. Status/error bisa tidak diumumkan.

Perbaikan: semantic main/skip link, tooltip + `aria-label`, `aria-live` terukur, visible focus ring, 44 px touch target, field errors dengan `aria-describedby`, dan axe/keyboard E2E.

### F-014 — Bahasa dan format tanggal/waktu bercampur

Severity: **P2**  
Klasifikasi: **BUG TERBUKTI**

Readiness memakai English (`app/pages/flights/readiness/index.vue:116-127`, `:237-243`), sementara MRO/Inventory banyak Bahasa Indonesia. Locale formatting tersebar antara `en-US`, `en-GB`, `id-ID`, dan raw `toLocaleString()`, misalnya `app/features/operations/routes/RouteDetailPage.vue:54`, `:63` serta `app/features/operations/stations/StationDetailPage.vue:316`, `:338`.

Dampak: waktu lokal WIT/WITA/WIB, accounting period, weight/volume, dan status dapat ditafsirkan berbeda. Dalam operasi penerbangan, timezone ambiguity bukan kosmetik.

Perbaikan: central formatting service dengan explicit timezone/station, format unit canonical, translation completeness gate, dan satu glossary status/action.

### F-015 — Aircraft master read API melewati permission model

Severity: **P1**  
Klasifikasi: **BUG TERBUKTI**

Aircraft list API hanya parse query dan memanggil service (`server/api/master-data/aircraft/index.get.ts:1-7`), tanpa `requireDemoPermission`. Client route policy membatasi generic `/master-data` ke platform admin kecuali routes (`app/utils/demoRouteAccess.ts:21-22`), tetapi server tetap mengembalikan 11 aircraft kepada anonymous dan Station Admin.

Dampak: client-side hiding memberi ilusi authorization yang tidak berlaku pada API. Pola serupa perlu diaudit pada seluruh master-data endpoint.

Perbaikan: deny-by-default middleware server, permission declarative per route, station/data classification scope, dan negative API tests per persona.

### F-016 — Supplier dan station preparation masih mock

Severity: **P1**  
Klasifikasi: **GAP REQUIREMENT**

Fuel Supplier page menyatakan “Mock ... for future Fuel Control demo flows” (`app/features/finance/fuel-suppliers/FuelSupplierPage.vue:49-52`); Handling/Parking Supplier page menyatakan future Station Operations flows (`app/features/finance/handling-parking-suppliers/HandlingParkingSupplierPage.vue:49-54`); Flight Request wizard memberi subtitle “Mock supplier and ground-service requests” (`app/pages/flights/requests/new.vue:64-67`).

Dampak: use case fuel planning/uplift, handling, procurement, cost handoff, dan profitability tampak terintegrasi tetapi supplier flow belum authoritative.

Perbaikan: tetapkan fixture demo yang jelas atau implement canonical supplier/service request → confirmation → actual → invoice/cost handoff → journal lineage.

### F-017 — Modul excluded/frontend-only tetap tampil di navigasi global

Severity: **P1**  
Klasifikasi: **BUG TERBUKTI, direct dependency terhadap demo in-scope**

CRM & Marketing sengaja selalu visible dan diakui frontend-only (`app/components/layout/sidebar/Sidebar.vue:47-50`). Corporate Assets overview/register juga selalu visible (`app/components/layout/sidebar/Sidebar.vue:324-339`). Snapshot persona Inventory Controller tetap menampilkan Corporate Assets, CRM & Marketing, Ticketing, dan Uploads.

Dampak: walau modul tersebut dikecualikan dari audit, navigasi global mengundang klien membuka area setengah jadi dan merusak persepsi RBAC.

Perbaikan: demo profile/feature flag yang hanya menampilkan scope presentasi, plus server authorization. Jangan mengandalkan presenter untuk menghindari menu.

### F-018 — Design system terfragmentasi

Severity: **P2**  
Klasifikasi: **REKOMENDASI PENINGKATAN**

Terdapat keluarga KPI/header/status yang tumpang tindih: `app/components/ds/StatCard.vue`, `app/components/finance/FinanceKpiCard.vue`, `app/components/ds/OperationalPageHeader.vue`, `app/components/finance/FinancePageHeader.vue`, `app/components/ds/StatusBadge.vue`, `app/components/finance/FinanceStatusBadge.vue`, dan beberapa domain status chips. **Nomor baris belum dapat diverifikasi** sebagai satu defect karena perbedaan props/semantics perlu dipetakan per component.

Dampak: status sama dapat memiliki label/warna/density berbeda, dan accessibility fixes harus diulang.

Perbaikan: satu token/semantic status registry dan primitive bersama, dengan wrapper domain hanya saat semantics berbeda.

### F-019 — Acceptance test drift dari UI dan safety gating aktual

Severity: **P2**  
Klasifikasi: **BUG TERBUKTI pada test suite**

Lima E2E gagal pada dua database setup. Empat jelas selector/fixture drift: finance mengharapkan Agustus tetapi seeded period Juli (`tests/e2e/finance-phase-two.spec.ts:33-43`); route label lama (`tests/e2e/flight-requests.spec.ts:17-28`); inventory “Reservasi” vs “Reservasi stok” (`tests/e2e/inventory.spec.ts:118-130`); MRO heading lama (`tests/e2e/mro-demo-v3-acceptance.spec.ts:143-159`). Departure test mengharapkan action saat flight memiliki empat blocker (`tests/e2e/flight-requests.spec.ts:41-55`), sehingga expectation-nya bertentangan dengan gating yang aman.

Dampak: regression suite mendorong developer mengembalikan copy lama atau, lebih buruk, menampilkan departure action ketika belum ready.

Perbaikan: test stable role/name semantics, fixture contract version, assert blockers dan absence of unsafe action, bukan copy incidental.

### F-020 — Client payload berat untuk konektivitas terbatas

Severity: **P2**  
Klasifikasi: **RISIKO SANGAT MUNGKIN — PERLU VERIFIKASI SOURCE/RUNTIME dengan network profile Papua**

Build menghasilkan warning chunk >500 KB; chunk client terbesar sekitar 965 KB sebelum gzip dan beberapa 500–625 KB. Build total server 63.9 MB (8.36 MB gzip). Flight Following sendiri memiliki CSS sekitar 79.56 KB.

Dampak: first load/reload setelah cache miss dapat lambat atau gagal pada koneksi station. Tanpa offline cache, user harus mengunduh ulang setelah reload/network drop.

Perbaikan: route-level dynamic imports, manual chunking, lazy-load MapLibre/chart/PDF, budget CI, compression/cache headers, and test Fast 3G/Slow 3G with packet loss.

### F-021 — Runtime menghasilkan unresolved component dan async-data warnings

Severity: **P1**  
Klasifikasi: **BUG TERBUKTI**

Selama probe runtime, server berulang kali melaporkan `Failed to resolve component: NuxtLink` pada Dashboard; penggunaan berada di `app/pages/dashboard.vue:886-891`. Flight detail melaporkan `Failed to resolve component: DocumentPanel`; component dipakai tanpa import di `app/pages/flights/[id]/index.vue:2019-2021`, sedangkan file component berada di `app/components/documents/DocumentPanel.vue`. Flight Request mengembalikan `null` dari handler `useAsyncData` sebelum route dipilih (`app/pages/flights/requests/new.vue:568-576`), yang diperingatkan Nuxt dapat menggandakan request saat hydration. Key `customers-options` juga digunakan dengan handler berbeda di Flight Request (`app/pages/flights/requests/new.vue:530-533`) dan CustomerSelect (`app/features/commercial/customers/CustomerSelect.vue:20-27`).

Dampak: link/panel dapat tidak hydrate/render konsisten, request planning dapat dieksekusi ulang, dan shared async state dapat saling menimpa. DocumentPanel juga berada pada jalur dokumen flight yang sudah memiliki access-scope blocker.

Perbaikan: import/rename component secara eksplisit, pastikan NuxtLink tersedia pada render context atau gunakan supported auto-import convention, kembalikan non-null typed state dari `useAsyncData`, dan beri key unik per data owner/handler.

## Kontrol kuat yang sudah terbukti

Temuan blocker tidak menghapus beberapa keputusan arsitektur yang baik:

- Finance posting memakai immediate transaction (`server/features/finance/accounting/service.ts:141-161`) dan inventory event processing juga immediate (`:164-202`).
- Database menolak posted journal yang tidak balance dan menjaga posted entry/lines immutable (`server/db/migrate.ts:1650-1706`).
- Finalized inventory movements/lines immutable (`server/db/migrations/inventory.ts:430-457`).
- MRO sign-off, inspection attempt, audit log, technical release, eligibility snapshot, dan audit pack dilindungi trigger (`server/db/migrations/maintenance.ts:751-821`).
- Flight Following memberi disclosure yang tepat bahwa telemetry bersifat simulasi dan bukan certified surveillance/navigation (`app/pages/ops/flight-following.vue:381-383`).
- Station Operations selected E2E membuktikan evidence persistence setelah refresh dan enforcement station scope pada endpoint yang diuji (`tests/e2e/station-operations.spec.ts:130-190`).

Kontrol ini patut dipertahankan dan diperluas secara konsisten ke seluruh module boundary.
