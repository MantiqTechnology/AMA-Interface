# Executive Summary

## 1. Kedekatan UI Saat Ini dengan Pengalaman Membaca Laporan Power BI

Skor keseluruhan: **2.4 / 5**.

Aplikasi sudah memiliki bahan dasar yang relevan: KPI cards, chart ApexCharts, filter field, tabs, refresh button, dashboard/report pages, tables, detail pages, audit trail, dan workflow safety. Namun pengalaman sebagai report consumer Power BI belum matang karena filter context tidak selalu terlihat sebagai state yang dapat dipahami, interaksi visual belum mendukung cross-filter/cross-highlight, drill-through belum distandarkan, visual header tidak konsisten, metric definition/source/last updated belum menjadi kontrak UI umum, dan responsive layout terbukti bermasalah pada screenshot mobile.

Evidence:

- `app/pages/dashboard.vue` mengambil banyak sumber data untuk satu canvas (`/api/dashboard`, `/api/flight-operations/flights`, `/api/flight-operations/requests`, `/api/master-data/aircraft`, `/api/master-data/stations`, `/api/flight-operations/fuel`, `/api/flight-operations/needs-my-action`) di lines 57-76.
- Screenshot `desktop-1440-dashboard.png` memperlihatkan dashboard dengan filter date/station/operation, KPI cards, action queue, tetapi tidak ada summary filter aktif, scope visual, definition, atau visual header konsisten.
- Screenshot `desktop-1440-finance-dashboard.png` memperlihatkan Finance Dashboard lebih dekat ke report page karena ada period selector, KPI row, panels, chart/table section, dan "As of" di bawah page.
- Screenshot `mobile-390-dashboard.png` dan `mobile-390-flight-following.png` memperlihatkan konten kiri terpotong/terdorong, sehingga belum layak disebut responsive report view.

## 2. Bagian yang Layak Dibuat Familiar Seperti Power BI

- Management/analytical pages: `/dashboard`, `/finance/dashboard`, `/finance/hpp`, `/finance/trial-balance`, `/flights/station-operations/reports`, `/asset-management/overview`, `/inventory`, `/hris/kpi`.
- Report consumer patterns yang cocok: report canvas, page tabs, visible slicers untuk filter umum, filter drawer untuk advanced filter, visual header ringan, focus mode, show data/table view, drill-through ke detail record, last updated/source/period indicator, bookmark/saved view untuk filter dan column preferences.
- Finance dashboard sudah paling siap karena ada period URL state (`app/pages/finance/dashboard.vue` lines 11-39), KPI cards (`FinanceKpiCard.vue`), loading skeleton, error state, dan reporting API (`/api/finance/reporting/*`).

## 3. Bagian yang Harus Tetap Menjadi Operational ERP Interface

- Flight detail dan lifecycle actions: `/flights/[id]`, `/flights/[id]/manifest`, `/ops/flight-closure/[id]`.
- Station operations workbench: `/flights/station-operations/*`.
- Accounting workbench: `/finance/accounting`.
- MRO command/work package execution: `/maintenance`, `/maintenance/work-packages/[id]`, `/maintenance/my-work`, `/maintenance/releases`.
- Inventory procurement queues dan asset workflow pages.

Halaman ini tidak boleh dipaksa menjadi canvas BI. Power BI familiarity cukup diterapkan melalui filter clarity, status hierarchy, exception list, traceable drill-through, consistent tables, dan visible data freshness. Action buttons, approval gates, validation, blocker messages, permission hints, dan audit context harus tetap dominan.

## 4. Lima Masalah Terbesar

1. **P0-01: Layout rail/mobile memotong konten penting.** Screenshot mobile dan beberapa desktop rail-state menunjukkan title, filter label, dan content kiri terpotong.
2. **P0-02: Data context/freshness belum menjadi standar lintas laporan.** Finance punya period/as-of, MRO punya stale warning, radar punya demo/timezone; dashboard utama dan list operasional belum konsisten menampilkan source/status/posted/approved/draft.
3. **P1-01: Filter context tidak cukup terlihat.** Filter ada, tetapi active-filter chips, reset all, filter count, persisted URL, dan affected visual scope tidak konsisten.
4. **P1-02: KPI cards sering belum lengkap sebagai metric.** Banyak KPI hanya label/nilai/caption, belum period, target, variance, definition, source, last updated.
5. **P1-03: Drill-through dan report navigation belum distandarkan.** Ada Nuxt links ke records, tetapi belum ada pola "drill-through with context" atau back-to-summary preserving filters.

## 5. Lima Perubahan Berdampak Terbesar

1. Buat **Report Page Shell** untuk analytical/management pages: title, report context, common slicers, active-filter summary, page tabs, refresh/source/as-of indicator.
2. Buat **KPI Card v2** dengan metric definition, period, comparison, target/variance, trend direction, source, and stale/partial data state.
3. Buat **Filter State Framework**: URL-backed report filters, chips, reset, scope labeling, and saved view primitives.
4. Buat **Drill-through Contract**: context payload in query params, back-to-summary button, breadcrumb, open original transaction action.
5. Perbaiki **responsive/rail layout** sebelum redesign report lain karena ini merusak usability dasar.

## 6. Risiko Jika Seluruh Aplikasi Dipaksa Menjadi Seperti Power BI

- Operational action dapat tersamar sebagai chart interaction; pemilihan chart segment tidak boleh terlihat seperti approval/status action.
- Safety blocker dapat kalah visual oleh chart dekoratif.
- Estimated/simulated/live/approved/posted data bisa salah dibaca bila semua angka diperlakukan setara.
- Workflow audit trail dan permission context bisa hilang jika desain terlalu fokus pada ringkasan.
- Pengguna operasional perlu queue, next action, blocker, owner, dan sign-off; dashboard penuh visual bisa memperlambat tugas.

## 7. Pilot Redesign Paling Tepat

1. **Management/reporting pilot:** `/finance/dashboard`  
   Alasan: data reporting sudah relatif terstruktur (`FinanceDashboardDto`, period selector, reporting API), ada KPI row, finance source/status penting untuk posted/approved/reconciled distinction, dan kebutuhan Power BI-style report consumer jelas.

2. **Operational workbench pilot:** `/maintenance`  
   Alasan: aviation safety tinggi, command center sudah memiliki stale warning, authorization wording, blocker list, workflow chain Defect -> Work Package -> Job Card -> Inspection -> Release -> Audit, dan perlu pemisahan kuat antara analytics summary dan action queue.

## Scoring

| Dimension                | Score | Evidence                                                                                                                                                                                                                                                |
| ------------------------ | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| navigation clarity       |     2 | Sidebar groups long and mixed: Ops contains master-data station/routes; separate Flight Control, Finance, Master Data, Cargo, HRIS, Maintenance. See `Sidebar.vue` lines 47-120 and screenshot sidebar in `desktop-1440-maintenance-create-dialog.png`. |
| Power BI familiarity     |     2 | Dashboard/report canvas exists, but no cross-filter, focus mode, visual headers, bookmarks, or show data pattern.                                                                                                                                       |
| visual hierarchy         |     2 | Finance is clearest; dashboard/MRO pages are dense and rail screenshots crop left content.                                                                                                                                                              |
| filter usability         |     2 | Filters exist (`dashboard.vue` date/station/type; `flights/index.vue` search/status/type/route/aircraft), but active filter summary and scope missing.                                                                                                  |
| drill-down/drill-through |     2 | Links to detail exist, but no preserved filter context/back-to-summary contract.                                                                                                                                                                        |
| KPI clarity              |     2 | Finance cards include comparison; generic `DsStatCard` only label/value/tone.                                                                                                                                                                           |
| chart quality            |     2 | ApexCharts present; chart semantic/source/definition and visual interaction missing.                                                                                                                                                                    |
| table/matrix usability   |     3 | Vuetify tables and pagination used; analytical matrix capabilities not standardized.                                                                                                                                                                    |
| operational safety       |     4 | MRO, flight, finance workbenches expose blockers, permission checks, and audit-oriented flows.                                                                                                                                                          |
| data context/freshness   |     2 | Present on some pages only: Finance as-of, MRO stale, radar simulated/timezone.                                                                                                                                                                         |
| accessibility            |     2 | Some aria labels/tooltips exist; charts lack table alternative and status relies on color in places.                                                                                                                                                    |
| responsive behavior      |     1 | `mobile-390-dashboard.png` and `mobile-390-flight-following.png` show severe clipping.                                                                                                                                                                  |
| performance perception   |     3 | Skeleton loaders exist on Finance; many pages lack standardized loading/stale state.                                                                                                                                                                    |
| consistency              |     2 | Multiple shells/components: Vuetify cards, FinancePanel, VTable, VDataTable, custom CSS.                                                                                                                                                                |
| role-based usability     |     3 | Permission-aware nav and actions exist; denied route redirects to `/dashboard` without explicit explanation.                                                                                                                                            |
