# Roadmap Enterprise MVP AMA Interface

**Tanggal dokumen:** 29 Juli 2026  
**Bahasa:** Indonesia  
**Status aplikasi saat ini:** Demo persisten aktif, belum production-ready  
**Target roadmap:** Enterprise MVP untuk PT AMA  
**Estimasi utama:** 8 bulan kalender dengan Medium Squad dan agent Codex paralel  
**Rentang aman:** 7 sampai 9 bulan untuk Enterprise MVP, 12 sampai 18 bulan untuk full production multi-integrasi

## 1. Ringkasan Eksekutif

AMA Interface saat ini sudah memiliki demo persisten yang luas untuk operasi penerbangan, ticketing, finance, inventory, asset management, master data, commercial, personnel, dokumen, dan dashboard. Namun status "fungsional" pada codebase saat ini harus dibaca sebagai fungsional untuk demo lokal, bukan berarti siap digunakan sebagai sistem enterprise harian.

Gap utama yang masih harus diselesaikan sebelum sistem layak disebut Enterprise MVP:

- HRIS belum menjadi modul penuh. Saat ini data employees dan departments sudah ada pada backend master/options, tetapi belum memiliki UI dan workflow HRIS enterprise.
- CRM belum menjadi modul penuh. Beberapa kemampuan commercial customer/agent sudah ada, tetapi belum mencakup pipeline, aktivitas sales, service case, renewal, dan customer relationship workflow.
- Marketing campaign dan advertising belum menjadi modul penuh. Existing marketing lebih dekat ke contracts/subsidies dan commercial governance, belum mencakup campaign planning, budget iklan, cost tracking, lead attribution, atau integrasi Meta Ads/Google Ads/TikTok Ads/platform iklan lain.
- Autentikasi masih berbasis persona demo, belum IdP/MFA production.
- Database masih SQLite lokal, belum production-grade seperti PostgreSQL dengan migration, backup, restore, retention, dan observability yang matang.
- File/document storage masih lokal/demo, belum object storage production dengan retention, scanning, dan access policy.
- Notification masih belum lengkap secara end-to-end.
- Offline mode dan sync station belum tersedia sebagai arsitektur produksi.
- Integrasi eksternal seperti payment gateway, bank, tax, ERP/accounting, regulatory reporting, satellite/connectivity provider, dan BI warehouse belum masuk scope implementasi saat ini.
- UI/UX masih perlu enterprise polish untuk workflow harian, error state, empty state, loading state, mobile/tablet station usage, dan konsistensi lintas modul.

Target dokumen ini adalah memberi rundown yang bisa langsung dipakai untuk menyusun backlog, membagi agent Codex, mengatur tim UI/UX, software engineer, system analyst, QA, DevOps, dan stakeholder PT AMA.

## 2. Definisi Target

### 2.1 Enterprise MVP

Enterprise MVP berarti sistem cukup matang untuk pilot terkontrol di lingkungan PT AMA, dengan batasan jelas, bukan seluruh fitur final.

Minimal Enterprise MVP harus memiliki:

- Workflow inti yang bisa dipakai oleh role utama: Director, OCC, Station Admin, Maintenance, Finance, HR, Commercial, Demo/Admin.
- HRIS dasar yang terhubung ke personnel, crew readiness, asset custodian, dan approval workflow.
- CRM dasar yang terhubung ke customer, agent, ticketing, rate, contract, finance exposure, dan activity history.
- Ticketing yang lebih rapi untuk passenger, cargo, refund, reschedule, finance ledger, dan manifest sync.
- Notification center yang membantu user mengetahui approval, blocker, expiry, exception, dan task urgent.
- Offline mode station-critical untuk station dengan konektivitas buruk.
- Audit, permission, validation, dan data integrity yang lebih kuat.
- Backup/restore dasar, observability dasar, dan deployment practice yang bisa diaudit.
- UAT per role dengan test scenario yang jelas.

### 2.2 Bukan Scope Enterprise MVP

Hal berikut tidak masuk Enterprise MVP kecuali PT AMA memutuskan sebagai prioritas wajib:

- Payroll penuh.
- Pajak dan slip gaji penuh.
- Payment gateway production.
- Integrasi production dengan Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads, atau platform advertising lain.
- Integrasi bank production.
- Integrasi regulator aviation production.
- Full ERP/accounting integration.
- Full offline-first untuk semua modul.
- BI warehouse penuh.
- Mobile native app.
- Satellite provider integration detail.
- E-signature legal production.
- Malware scanning production-grade untuk semua dokumen.
- DR multi-region dengan failover otomatis.

Scope tersebut dapat menjadi phase setelah Enterprise MVP.

## 3. Kondisi Codebase Saat Ini

Berdasarkan inspeksi repository pada 29 Juli 2026:

- Framework: Nuxt 3, Vue, TypeScript, Vuetify.
- Backend: Nitro/H3 route handlers, feature services, repository pattern.
- Persistence: SQLite dengan Drizzle ORM, migration, seed, demo reset.
- Test: Vitest, Playwright, contract tests, service tests, API tests.
- Modul yang sudah terlihat:
  - Flight Operations.
  - Station Operations.
  - Ticketing passenger/cargo.
  - Finance, invoices, accounting, HPP, trial balance.
  - Inventory dan procurement.
  - Corporate assets.
  - Commercial customer, agent, rate card.
  - Contracts and subsidies read model.
  - Personnel operations.
  - Employees dan departments backend master/options.
  - Documents dan uploads demo.
  - Dashboard dan flight following.
- Branch remote yang terlihat belum menampilkan branch bernama HRIS atau CRM eksplisit.
- Ada branch `notification-fe`, tetapi notification perlu audit ulang sebelum dipastikan siap digabung.

Implikasi:

- HRIS dan CRM perlu diperlakukan sebagai workstream baru atau workstream integrasi dari branch yang belum tersedia.
- Employees/departments dan personnel dapat menjadi fondasi HRIS, tetapi tidak cukup untuk HRIS enterprise.
- Commercial customer/agent dapat menjadi fondasi CRM, tetapi belum cukup untuk CRM enterprise.
- Marketing/contracts yang ada dapat menjadi fondasi governance komersial, tetapi belum cukup untuk campaign management dan advertising performance.
- Offline sync tidak boleh ditempel sebagai fitur UI saja; perlu arsitektur data, queue, idempotency, conflict handling, dan audit.

## 4. Asumsi Estimasi

Estimasi utama menggunakan asumsi Medium Squad:

| Role                                  |                         Jumlah | Fokus                                                              |
| ------------------------------------- | -----------------------------: | ------------------------------------------------------------------ |
| Product Owner / Business Owner PT AMA |         1 sampai 3 stakeholder | Keputusan prioritas, validasi proses, UAT sign-off                 |
| System Analyst / Business Analyst     |                              1 | Process mapping, requirement, data dictionary, acceptance criteria |
| UI/UX Designer                        |                              2 | Design audit, workflow UX, prototype, design system, usability     |
| Full-stack Engineer                   |                              3 | Nuxt/Vue, API, services, contracts, database                       |
| QA Engineer                           |                              1 | Test plan, regression, E2E, UAT support                            |
| DevOps/Security Engineer              |                              1 | Environment, deployment, observability, backup, security baseline  |
| Agent Codex                           | 4 sampai 8 paralel sesuai task | Draft implementation, refactor, tests, docs, review                |

Asumsi tambahan:

- PT AMA menyediakan stakeholder per domain maksimal 2 hari kerja untuk keputusan kritis.
- HRIS/CRM branch atau referensi lama diberikan pada fase discovery.
- Target awal adalah Enterprise MVP, bukan full production.
- Offline mode awal hanya untuk station-critical workflow.
- Setiap fase memasukkan buffer human error, bug fixing, salah asumsi requirement, dan rework.
- Agent Codex membantu akselerasi, tetapi code review manusia tetap wajib untuk area security, finance, sync, dan migration.

## 5. Estimasi Waktu

### 5.1 Estimasi Kalender

| Target                          |        Small Squad |       Medium Squad |       Large Squad |
| ------------------------------- | -----------------: | -----------------: | ----------------: |
| Demo lengkap lebih rapi         |   4 sampai 6 bulan |   3 sampai 4 bulan |  2 sampai 3 bulan |
| Enterprise MVP                  | 10 sampai 14 bulan |   7 sampai 9 bulan |  5 sampai 7 bulan |
| Full production multi-integrasi | 18 sampai 24 bulan | 12 sampai 18 bulan | 9 sampai 14 bulan |

Rekomendasi dokumen ini memakai **Medium Squad, Enterprise MVP, 8 bulan**.

### 5.2 Buffer Human Error dan Rework

Untuk software enterprise internal, estimasi tidak boleh hanya menghitung waktu coding. Buffer realistis:

| Area                             | Buffer Minimal | Alasan                                   |
| -------------------------------- | -------------: | ---------------------------------------- |
| Requirement berubah              | 10% sampai 15% | PT AMA masih menentukan fitur urgent     |
| Bug dan human error engineering  | 15% sampai 25% | Banyak modul lintas domain               |
| UI/UX revisi                     | 10% sampai 20% | Workflow operasional perlu validasi user |
| Data migration dan seed mismatch | 10% sampai 15% | Struktur demo ke enterprise berubah      |
| Offline sync conflict            | 25% sampai 40% | Area teknis paling berisiko              |
| Security/permission mistake      | 15% sampai 25% | Role dan scope harus diaudit             |
| UAT dan stabilisasi              | 20% sampai 30% | User akan menemukan gap nyata            |

Dengan buffer ini, pekerjaan yang terlihat seperti 5 sampai 6 bulan secara teknis akan menjadi 7 sampai 9 bulan secara kalender.

## 6. Pertanyaan Penting untuk PT AMA

Pertanyaan berikut harus dijawab pada discovery. Jika belum dijawab, gunakan asumsi default yang ditulis di setiap bagian.

### 6.1 Pertanyaan Prioritas Bisnis

1. Modul apa yang paling urgent untuk dipakai harian?
2. Apakah target pertama adalah pilot satu station, semua station Papua, atau hanya demo manajemen?
3. Role mana yang paling kritis: OCC, Station Admin, Finance, HR, Commercial, Maintenance, atau Director?
4. Proses mana yang saat ini paling banyak menyebabkan error manual?
5. Laporan apa yang wajib tersedia untuk direksi setiap hari, minggu, dan bulan?
6. Data apa yang saat ini paling tidak konsisten: flight, passenger, cargo, invoice, employee, customer, inventory, atau asset?
7. Apakah PT AMA ingin sistem ini menggantikan Excel sepenuhnya pada pilot, atau hanya mendampingi proses lama?
8. Siapa yang berwenang memutuskan perubahan workflow saat terjadi konflik antar department?

Asumsi default:

- Prioritas pertama adalah stabilisasi Flight Ops, Station Ops, Ticketing, Finance handoff, HRIS crew/personnel, CRM customer/agent, dan offline station-critical.

### 6.2 Pertanyaan HRIS

1. HRIS harus mencakup karyawan non-crew saja, crew saja, atau seluruh employee PT AMA?
2. Apakah payroll termasuk scope MVP?
3. Apakah attendance dan leave harus masuk MVP?
4. Apakah roster/availability crew harus menjadi source of truth untuk flight readiness?
5. Apakah training, license, medical certificate, qualification, dan document expiry wajib menghasilkan notification?
6. Apakah HR membutuhkan approval workflow untuk perubahan data employee?
7. Apakah data lama HR tersedia dalam Excel, aplikasi lama, atau belum terstruktur?
8. Apakah struktur organisasi butuh hierarchy department, position, supervisor, cost center, dan station assignment?
9. Apakah PT AMA membutuhkan audit perubahan data sensitif seperti salary, identity number, dan employment status?

Asumsi default:

- Payroll tidak masuk Enterprise MVP.
- HRIS MVP mencakup employee registry, department, position, employment status, station assignment, roster/availability minimal, training/license/document expiry, dan audit.

### 6.3 Pertanyaan CRM

1. CRM dipakai oleh commercial team, ticketing team, station, finance, atau semua?
2. Apakah CRM harus mengelola lead dan opportunity sebelum menjadi customer?
3. Apakah quotation wajib masuk MVP?
4. Apakah contract renewal dan subsidy tracking menjadi bagian CRM atau marketing/contracts module?
5. Apakah complaint dan service case customer perlu masuk MVP?
6. Apakah customer credit hold harus diputuskan oleh Commercial, Finance, atau Director?
7. Apakah agent commission settlement masuk CRM atau tetap Finance?
8. Apakah customer activity harus otomatis membaca dari ticketing, invoices, flight operations, dan documents?
9. Apakah CRM membutuhkan SLA follow-up dan reminder notification?

Asumsi default:

- CRM MVP mencakup account profile, contacts, activity timeline, opportunity/quotation ringan, service case, renewal reminder, customer exposure read-only, dan integrasi ke ticketing/finance.

### 6.4 Pertanyaan Marketing, Campaign, dan Ads

1. Apakah marketing yang dimaksud hanya contract/subsidy governance, atau juga campaign iklan digital?
2. Apakah PT AMA membutuhkan campaign planning untuk rute, charter, cargo, promo seasonal, corporate account, atau recruitment?
3. Apakah budget iklan harus dicatat sebagai rencana, realisasi manual, atau otomatis dari platform iklan?
4. Apakah biaya iklan harus masuk ke Finance sebagai expense, cost allocation, atau hanya reporting marketing?
5. Apakah lead dari iklan harus otomatis menjadi CRM lead/opportunity?
6. Platform mana yang wajib: Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads, X Ads, marketplace/OTA, atau platform lokal?
7. Apakah integrasi butuh read-only reporting, campaign creation, budget adjustment, atau full campaign management?
8. Attribution apa yang dibutuhkan: campaign-to-lead, campaign-to-booking, campaign-to-revenue, atau campaign-to-route profitability?
9. Apakah PT AMA sudah memiliki Business Manager/ad account, pixel/conversion tracking, website public, dan consent/privacy policy?
10. Siapa owner approval budget iklan: Marketing, Commercial, Finance, atau Director?

Asumsi default:

- Enterprise MVP hanya memasukkan marketing campaign registry dan budget/cost tracking manual sebagai P1 jika P0 stabil.
- Integrasi Meta Ads dan platform iklan lain tidak masuk 8 bulan Enterprise MVP default karena membutuhkan credential, API review, consent/tracking, attribution model, dan reconciliation biaya.
- Jika PT AMA menjadikan ads integration sebagai P0, timeline Enterprise MVP naik sekitar 1 sampai 2 bulan untuk read-only reporting, atau 2 sampai 4 bulan untuk campaign management dan budget control lintas platform.

### 6.5 Pertanyaan Ticketing

1. Ticketing dipakai internal saja atau public booking portal?
2. Pembayaran production akan manual, payment gateway, bank transfer upload, atau integrasi bank?
3. Apakah refund/reschedule harus memiliki approval finance?
4. Apakah cargo booking perlu AWB formal dan proof of delivery production?
5. Apakah ticketing harus mendukung OTA seperti Traveloka/Tiket.com pada MVP?
6. Apakah manifest final harus dikunci oleh OCC, station, atau pilot?
7. Apakah tarif harus selalu dari Rate Card atau boleh override dengan approval?

Asumsi default:

- OTA dan payment gateway tidak masuk Enterprise MVP.
- Ticketing difokuskan pada internal booking, passenger/cargo, payment status, refund/reschedule, ledger, dan manifest sync.

### 6.6 Pertanyaan Offline Mode

1. Station mana yang butuh offline mode terlebih dahulu?
2. Transaksi apa yang boleh dibuat offline?
3. Berapa lama perangkat bisa offline: jam, hari, atau lebih?
4. Apakah satu flight bisa diedit oleh beberapa station saat offline?
5. Apakah evidence file harus bisa disimpan offline?
6. Bagaimana conflict harus diputuskan: latest write wins, manual review, atau domain-specific rule?
7. Apakah perangkat station digunakan oleh satu user atau bergantian?
8. Apakah data sensitif boleh disimpan di browser/device?
9. Apakah ada SOP reconnect dan sync sebelum departure/closure?

Asumsi default:

- Offline MVP hanya mencakup station task checklist, evidence metadata/file kecil, manifest confirmation terbatas, service/cost draft, dan queue action. Conflict critical masuk manual review.

### 6.7 Pertanyaan Notification

1. Notification hanya in-app atau juga email/WhatsApp/SMS?
2. Event apa yang wajib memicu notification?
3. Role mana yang menerima blocker flight?
4. Apakah expiry license/medical/training harus muncul H-30/H-14/H-7/H-1?
5. Apakah escalation ke Director perlu otomatis?
6. Apakah user bisa mute atau configure preference?
7. Apakah notification harus immutable untuk audit atau hanya convenience inbox?

Asumsi default:

- MVP hanya in-app notification center, tanpa email/WhatsApp/SMS production.

### 6.8 Pertanyaan Security dan Compliance

1. IdP apa yang digunakan: Microsoft Entra ID, Google Workspace, Keycloak, atau custom?
2. Apakah MFA wajib?
3. Apakah akses harus dibatasi per station?
4. Apakah audit log harus disimpan berapa lama?
5. Data apa yang dianggap sensitif?
6. Siapa yang boleh export data?
7. Apakah ada kewajiban retention dokumen aviation?
8. Apakah environment production harus memiliki approval deployment?
9. Apakah backup restore harus diuji berkala?

Asumsi default:

- MVP memakai IdP production, MFA untuk privileged roles, station scope, audit log untuk command penting, dan backup harian dengan restore drill.

## 7. Prioritas Fitur

### 7.1 Prioritas P0

P0 adalah fitur yang harus ada sebelum pilot Enterprise MVP.

- Production foundation dasar:
  - IdP/MFA decision.
  - Role and permission matrix.
  - Environment config.
  - Database migration plan.
  - Backup/restore baseline.
  - Observability baseline.
- HRIS MVP:
  - Employee registry UI.
  - Department/position/station assignment UI.
  - Employment status lifecycle.
  - Personnel/crew link.
  - License, medical, qualification, training expiry.
  - Availability/roster minimal.
- CRM MVP:
  - Account/customer profile.
  - Contact management.
  - Activity timeline.
  - Opportunity/quotation ringan.
  - Customer service case.
  - Renewal reminder.
  - Finance exposure read-only.
- Marketing campaign MVP-plus:
  - Campaign registry untuk rute, charter, cargo, corporate, recruitment, atau promo.
  - Budget plan dan actual cost manual.
  - Campaign owner, status, period, channel, target audience, dan linked customer/opportunity.
  - Basic attribution manual ke lead/opportunity/booking jika data tersedia.
  - Approval budget sederhana jika diputuskan masuk P1.
- Flight Ops stabilization:
  - Readiness integrity.
  - Station task workflow.
  - Manifest lock/approval.
  - Flight closure and finance handoff.
- Ticketing stabilization:
  - Passenger booking.
  - Cargo booking.
  - Refund/reschedule.
  - Payment status.
  - Manifest sync.
  - Ticketing finance ledger.
- Notification:
  - In-app inbox.
  - Role-targeted events.
  - Flight blocker.
  - Approval reminder.
  - Document expiry.
  - Finance exception.
- Offline station-critical:
  - Local queue.
  - Sync status.
  - Idempotency key.
  - Retry.
  - Conflict review.
  - Audit replay.
- QA/UAT:
  - Critical E2E tests.
  - API contract tests.
  - Permission tests.
  - UAT scenario per role.

### 7.2 Prioritas P1

P1 bisa masuk jika P0 stabil atau menjadi phase setelah pilot.

- HR leave dan attendance ringan.
- HR approval workflow lanjutan.
- CRM SLA dashboard.
- Customer segmentation.
- Marketing campaign registry.
- Marketing budget plan dan actual cost tracking manual.
- Manual campaign attribution ke CRM lead/opportunity/booking.
- Campaign performance dashboard berbasis data internal.
- Contract authoring and approval.
- Subsidy amendment/versioning.
- AP aging.
- Bank reconciliation manual.
- Cash-flow forecast.
- Period close/reopen.
- Object storage production.
- Audit retention dashboard.
- Export PDF/Excel enterprise.
- Email notification.
- Mobile/tablet UI optimization tambahan.

### 7.3 Prioritas P2

P2 sebaiknya tidak mengganggu Enterprise MVP.

- Payroll penuh.
- Payment gateway production.
- OTA integration.
- Meta Ads integration.
- Google Ads integration.
- TikTok Ads integration.
- LinkedIn Ads integration.
- Automated campaign creation and budget adjustment.
- Cross-platform ad attribution and conversion tracking.
- WhatsApp/SMS gateway.
- Satellite provider integration detail.
- Regulatory reporting.
- E-signature legally binding.
- BI warehouse.
- Advanced analytics.
- Native mobile app.
- Multi-region disaster recovery.

## 8. Rundown 8 Bulan

### Bulan 0.5: Discovery, Audit, dan Product Definition

Durasi: 2 minggu.

Tujuan:

- Mengunci scope Enterprise MVP.
- Mengambil branch HRIS/CRM jika tersedia.
- Memastikan gap codebase aktual.
- Menyusun backlog prioritas dengan PT AMA.

Aktivitas:

- Audit codebase, branch, database schema, API, services, tests, UI.
- Workshop PT AMA per domain: OCC, Station, Finance, HR, Commercial, Maintenance, Management.
- Mapping proses manual saat ini.
- Mapping data source: Excel, sistem lama, dokumen fisik, accounting, ticketing, HR.
- Buat role and permission matrix.
- Buat data dictionary awal.
- Buat acceptance criteria per modul.
- Tentukan pilot station.
- Tentukan fitur P0/P1/P2.

Output:

- Product Requirement Document Enterprise MVP.
- System Analysis Document.
- UI/UX journey map.
- Backlog prioritas.
- Risk register awal.
- Definition of Done.
- UAT scenario draft.

Agent Codex:

- Agent Analyst: ekstrak gap dari codebase dan dokumen.
- Agent API Auditor: daftar endpoint dan kontrak.
- Agent UI Auditor: inventaris halaman dan komponen.
- Agent Test Auditor: inventaris test coverage.
- Agent Docs: menyusun living documentation.

Gate:

- Tidak boleh mulai implementasi besar sebelum P0 disetujui stakeholder PT AMA.

### Bulan 1: Foundation Enterprise Dasar

Durasi: 4 minggu.

Tujuan:

- Menyiapkan fondasi agar pengembangan HRIS/CRM/offline tidak menambah technical debt.

Aktivitas:

- Desain target architecture untuk production-grade deployment.
- Tentukan strategi database: tetap SQLite untuk demo, PostgreSQL untuk enterprise.
- Tentukan migration policy.
- Tentukan IdP/MFA dan mapping role.
- Tentukan object storage dan document retention policy.
- Tentukan audit log coverage.
- Tentukan observability: app logs, request id, error tracking, health checks.
- Tentukan backup/restore SOP.
- Rapikan permission helper dan server enforcement.
- Rapikan API envelope dan error consistency jika masih ada gap.

Output:

- Architecture Decision Records.
- Security baseline.
- Database migration plan.
- Backup and restore runbook.
- Observability checklist.
- Permission matrix v1.

Risiko:

- Jika IdP belum dipilih, implementasi auth production tertunda.
- Jika database target belum dipilih, migration HRIS/CRM bisa berubah.

Gate:

- Semua modul baru harus mengikuti API envelope, Zod contracts, audit, permission, dan test pattern yang disepakati.

### Bulan 2: HRIS MVP

Durasi: 4 minggu.

Tujuan:

- Membuat HRIS dasar yang bisa menjadi source of truth employee/personnel untuk operasi.

Fitur:

- Employee list, create, edit, detail.
- Department list, create, edit, hierarchy.
- Position and station assignment.
- Employment status: active, inactive, suspended, terminated, on leave.
- Personnel link untuk crew/pilot/maintenance/ops.
- License, medical certificate, qualification, and training tracking.
- Expiry summary dan readiness impact.
- Availability/roster minimal.
- HR document panel.
- HR audit timeline.

Integrasi:

- Flight Operations membaca availability dan readiness crew.
- Asset Management membaca custodian employee dan department.
- Notification membaca document expiry dan availability blocker.
- Master Data menyajikan employee/department options.

Output:

- HRIS UI.
- HRIS API/contracts.
- HRIS service tests.
- HRIS UAT scenario.

Risiko:

- HR data sensitif. Permission harus jelas.
- Jika payroll diminta masuk, estimasi berubah signifikan.

Gate:

- HRIS tidak boleh merusak Personnel existing dan flight readiness.

### Bulan 3: CRM MVP

Durasi: 4 minggu.

Tujuan:

- Membuat CRM dasar yang memperkuat customer/agent/commercial workflow, serta menyiapkan hook untuk marketing campaign jika dipilih sebagai P1.

Fitur:

- Customer/account workspace.
- Contact management.
- Customer activity timeline.
- Opportunity/quotation ringan.
- Service case/complaint.
- Contract renewal reminder.
- Campaign source field dan lead/opportunity source tracking ringan.
- Customer exposure read-only dari Finance.
- Agent relationship dan commission visibility.
- Document links.
- CRM audit/history.

Integrasi:

- Ticketing membaca customer/agent canonical.
- Rate Card membaca customer/agent context.
- Finance exposure tetap read-only dari finance read model.
- Notification untuk renewal, complaint SLA, credit hold, dan follow-up.
- Contracts/Subsidies tetap menjadi boundary governance contract.

Output:

- CRM UI.
- CRM API/contracts.
- CRM service tests.
- CRM UAT scenario.
- Marketing campaign backlog dan attribution decision, jika PT AMA ingin ads masuk setelah MVP.

Risiko:

- CRM sering melebar menjadi sales automation penuh. MVP harus dijaga.
- Ads integration sering melebar menjadi martech platform penuh. Untuk MVP, jangan langsung mengelola campaign platform eksternal kecuali ada keputusan P0.
- Finance dan Commercial harus sepakat soal credit hold authority.

Gate:

- CRM tidak boleh menduplikasi invoice/payment source of truth.

### Bulan 4: Penyempurnaan Modul Existing dan Enterprise UI/UX Pass

Durasi: 4 minggu.

Tujuan:

- Membuat aplikasi terasa profesional untuk workflow harian, bukan hanya demo halaman.

Aktivitas:

- UI/UX audit untuk dashboard, flight ops, station ops, ticketing, finance, inventory, asset, HRIS, CRM.
- Konsistensi empty/loading/error states.
- Konsistensi filter, search, pagination, table density, action placement.
- Form validation dan inline error message.
- Audit destructive action dan confirmation.
- Mobile/tablet check untuk station-critical screen.
- Review navigation sidebar dan role-based visibility.
- Review language consistency Indonesia/English.
- Review accessibility minimum: contrast, focus state, keyboard path untuk form penting.

Output:

- UI/UX issue list.
- Design system usage notes.
- Updated critical screens.
- Playwright screenshots untuk critical flow.

Risiko:

- UI polish bisa melebar tanpa prioritas. Gunakan workflow critical sebagai batas.

Gate:

- Critical workflows harus bisa dijalankan tanpa user bingung karena state kosong, error tidak jelas, atau action tersembunyi.

### Bulan 5: Notification dan Workflow Orchestration

Durasi: 4 minggu.

Tujuan:

- Mengubah aplikasi dari pasif menjadi proaktif melalui notification center.

Fitur:

- Notification event table/service.
- In-app inbox.
- Unread/read state.
- Priority: info, warning, critical.
- Target role dan target user.
- Target entity: flight, station task, document, invoice, employee, customer, case.
- Notification rules:
  - Flight blocker.
  - Approval needed.
  - Station task overdue.
  - License/medical/training expiry.
  - Customer renewal.
  - Finance exception.
  - Refund/reschedule approval.
  - Offline sync conflict.
- Notification center di Topbar.
- Deep link ke entity.
- Audit untuk event penting.

Output:

- Notification API/contracts.
- Notification UI.
- Notification tests.
- Event rule documentation.

Risiko:

- Notification noise. MVP harus prioritaskan event yang actionable.

Gate:

- Setiap notification penting harus punya owner role dan next action.

### Bulan 6 sampai 6.5: Offline Station Critical Sync

Durasi: 6 minggu.

Tujuan:

- Station tetap bisa bekerja saat koneksi buruk untuk workflow kritis.

Scope offline MVP:

- Melihat data flight/station yang sudah dicache.
- Mengisi station task checklist.
- Menambah evidence metadata dan file kecil.
- Mengisi service/cost draft.
- Manifest confirmation terbatas.
- Queue action saat offline.
- Sync saat online.
- Conflict review untuk data critical.

Arsitektur minimum:

- Client local store untuk cache dan queue.
- Idempotency key per action.
- Server endpoint untuk sync batch.
- Server replay command dengan validation yang sama seperti online.
- Conflict status: synced, pending, failed, conflict.
- Manual conflict review screen.
- Audit replay.
- Sync status indicator di UI.

Conflict policy awal:

- Non-critical note dapat latest accepted jika tidak bentrok.
- Station task action yang sama dari dua device menjadi conflict.
- Manifest count mismatch menjadi conflict.
- Flight lifecycle critical tidak boleh dilakukan offline kecuali PT AMA menyetujui SOP khusus.
- Finance posting tidak boleh offline.

Output:

- Offline sync contracts.
- Offline queue UI.
- Sync status UI.
- Conflict review.
- Offline simulation tests.

Risiko:

- Offline sync adalah area paling kompleks dan paling rawan bug.
- File evidence offline perlu batas ukuran dan security policy.
- Device sharing bisa menyebabkan masalah session.

Gate:

- Tidak boleh pilot offline tanpa UAT khusus dengan skenario jaringan buruk.

### Bulan 6.5 sampai 7.5: QA, Security, Data, dan Hardening

Durasi: 4 minggu.

Tujuan:

- Menurunkan risiko sebelum UAT final dan pilot.

Aktivitas QA:

- Regression tests.
- API contract tests.
- Service tests.
- Permission tests.
- E2E critical journeys.
- Offline simulation.
- Data reconciliation.
- Browser compatibility smoke.
- Mobile/tablet viewport smoke.

Aktivitas Security:

- Role/scope enforcement review.
- Sensitive data review.
- Audit log review.
- Export permission review.
- Session hardening review.
- Basic threat model.

Aktivitas DevOps:

- Build verification.
- Deployment rehearsal.
- Backup restore test.
- Health check.
- Logging and request id check.
- Error tracking check.

Output:

- QA report.
- Security review report.
- Known limitations.
- Bug triage board.
- Release candidate checklist.

Risiko:

- Banyak bug baru muncul saat domain diintegrasikan.
- Data demo tidak selalu mewakili data PT AMA.

Gate:

- P0 bugs harus closed atau memiliki accepted workaround tertulis.

### Bulan 7.5 sampai 8: UAT, Training, dan Stabilization

Durasi: 2 minggu.

Tujuan:

- Memastikan PT AMA dapat menggunakan Enterprise MVP dengan batasan yang disepakati.

Aktivitas:

- UAT per role.
- Training scenario.
- Bug bash.
- Final UI polish.
- Final documentation.
- Operational runbook.
- Go/no-go meeting.
- Pilot readiness review.

Output:

- UAT sign-off.
- Release notes.
- Runbook.
- Admin guide.
- User guide ringkas.
- Known limitations.
- Post-MVP backlog.

Gate:

- Tidak boleh disebut siap pilot jika role utama belum menyelesaikan UAT scenario.

## 9. Workstream Detail

### 9.1 System Analyst

Tanggung jawab:

- Mengubah kebutuhan PT AMA menjadi requirement yang bisa diimplementasikan.
- Menjaga scope MVP.
- Menentukan acceptance criteria.
- Menyusun proses AS-IS dan TO-BE.
- Menentukan data ownership.
- Menghubungkan stakeholder antar department.

Deliverable:

- Requirement matrix.
- Process map.
- Data dictionary.
- Role matrix.
- UAT scenario.
- Change log requirement.

Checklist:

- Setiap fitur punya business owner.
- Setiap fitur punya definisi done.
- Setiap keputusan scope tercatat.
- Setiap conflict antar department punya decision owner.

### 9.2 UI/UX

Tanggung jawab:

- Mengubah requirement menjadi workflow yang mudah dipakai.
- Menjaga konsistensi enterprise UI.
- Mengurangi human error lewat desain.
- Mengoptimalkan station workflow untuk kondisi lapangan.

Deliverable:

- User journey.
- Wireframe/prototype.
- Screen inventory.
- Design system notes.
- Empty/loading/error states.
- UX acceptance checklist.

Prinsip UI/UX:

- Workflow harian harus cepat dan jelas.
- Critical action harus memiliki context, warning, dan confirmation.
- Table harus mendukung scan cepat.
- Form harus mencegah error sebelum submit.
- Notification harus actionable.
- Offline state harus terlihat jelas.
- Mobile/tablet station screen harus tidak overlap dan tidak terlalu padat.

### 9.3 Software Engineering

Tanggung jawab:

- Implementasi frontend, API, service, contract, migration, tests.
- Menjaga domain boundary.
- Menjaga data integrity.
- Menjaga permission dan audit.

Deliverable:

- Feature code.
- API contracts.
- DB migration.
- Unit/service/API/E2E tests.
- Technical docs.
- Code review notes.

Prinsip engineering:

- Jangan duplikasi source of truth.
- Semua endpoint pakai validation schema.
- Semua command penting punya audit.
- Semua mutation critical punya permission check.
- Semua workflow finance critical idempotent.
- Offline action direplay oleh server command yang sama dengan online.

### 9.4 QA

Tanggung jawab:

- Membuktikan workflow berjalan dan edge case penting tertangani.
- Menjaga regression.
- Mendampingi UAT.

Deliverable:

- Test plan.
- Regression suite.
- E2E scenario.
- UAT scripts.
- Bug report.
- Release quality report.

Prioritas test:

- Flight request sampai invoice.
- Ticketing booking sampai manifest.
- HRIS expiry sampai readiness blocker.
- CRM case/renewal sampai notification.
- Offline queue sampai sync/conflict.
- Permission per role.
- Backup/restore smoke.

### 9.5 DevOps dan Security

Tanggung jawab:

- Menyiapkan environment yang bisa dipakai pilot.
- Menjaga deployment, secrets, backup, logging, dan monitoring.
- Meninjau security baseline.

Deliverable:

- Deployment guide.
- Environment config.
- Backup/restore runbook.
- Observability setup.
- Security checklist.
- Incident response draft.

Prioritas:

- IdP/MFA.
- Secrets management.
- Database backup.
- Object storage policy.
- Health check.
- Error logging.
- Audit retention.

## 10. Pembagian Agent Codex

Agent Codex sebaiknya tidak dipakai sebagai satu agent besar. Gunakan beberapa agent kecil dengan boundary jelas.

| Agent              | Fokus                        | Output                                  |
| ------------------ | ---------------------------- | --------------------------------------- |
| Analyst Agent      | Membaca codebase dan dokumen | Gap list, requirement notes, domain map |
| UI Audit Agent     | Audit screen dan UX          | UI issue list, screenshot notes         |
| HRIS Agent         | Implement HRIS               | Contracts, service, UI, tests           |
| CRM Agent          | Implement CRM                | Contracts, service, UI, tests           |
| Notification Agent | Implement notification       | Event service, inbox UI, tests          |
| Offline Sync Agent | Implement sync               | Queue, sync API, conflict UI, tests     |
| QA Agent           | Test dan regression          | Unit/API/E2E tests                      |
| DevOps Docs Agent  | Runbook dan deployment docs  | Operational docs                        |
| Review Agent       | Code review                  | Findings, risk, missing tests           |

Aturan kerja agent:

- Setiap agent harus bekerja pada branch/task kecil.
- Setiap PR harus punya test evidence.
- Agent tidak boleh mengubah domain lain tanpa mencatat alasan.
- Agent offline sync harus review bersama engineer manusia.
- Agent finance/security harus selalu melalui code review manusia.
- Agent UI harus mengambil screenshot sebelum dan sesudah untuk critical screens.

## 11. Data dan Integrasi

### 11.1 Source of Truth

Rekomendasi source of truth:

| Data                               | Source of Truth            |
| ---------------------------------- | -------------------------- |
| Flight operation                   | Flight Operations          |
| Passenger/cargo booking            | Ticketing                  |
| Manifest final                     | Flight Operations Manifest |
| Invoice/payment                    | Finance                    |
| Accounting journal                 | Accounting                 |
| Inventory stock                    | Inventory                  |
| Asset                              | Corporate Assets           |
| Employee                           | HRIS                       |
| Crew license/medical/qualification | HRIS/Personnel             |
| Customer/account                   | CRM/Commercial             |
| Rate card                          | Commercial                 |
| Contract/subsidy                   | Marketing/Contracts        |
| Marketing campaign                 | Marketing/CRM              |
| Advertising platform spend         | Ads integration read model |
| Notification                       | Notification service       |
| Offline queued actions             | Offline sync service       |

### 11.2 Integrasi Internal MVP

Integrasi yang wajib:

- HRIS ke Flight Operations untuk crew readiness.
- HRIS ke Asset Management untuk custodian.
- CRM ke Ticketing untuk customer/agent.
- CRM ke Finance untuk exposure read-only.
- Marketing campaign ke CRM untuk source/lead/opportunity.
- Marketing campaign ke Finance untuk budget/cost visibility manual jika dipilih P1.
- Ticketing ke Manifest.
- Flight Closure ke Finance handoff.
- Inventory ke Maintenance handoff.
- Notification ke HRIS/CRM/Flight/Ticketing/Finance.
- Offline sync ke Station Operations.

### 11.3 Integrasi Eksternal Post-MVP

Integrasi yang sebaiknya setelah Enterprise MVP:

- Payment gateway.
- Bank reconciliation API.
- Tax/e-faktur.
- ERP/accounting external.
- OTA.
- Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads, dan advertising platform lain.
- BI warehouse.
- Regulatory reporting.
- Satellite/connectivity provider telemetry.
- Email/SMS/WhatsApp gateway.

### 11.4 Marketing Ads Integration Policy

Integrasi ads harus dipisahkan menjadi tiga level supaya scope tidak melebar:

| Level                             | Kapabilitas                                                                                                | Rekomendasi Timing |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ |
| Level 1: Manual Campaign Registry | Campaign, channel, budget plan, actual cost manual, owner, period, status, link ke CRM opportunity/booking | P1 atau MVP-plus   |
| Level 2: Read-only Ads Reporting  | Tarik spend, impression, click, campaign status dari Meta/Google/TikTok/LinkedIn                           | Post-MVP awal      |
| Level 3: Campaign Management      | Buat campaign, ubah budget, pause/resume campaign, sync creative, conversion tracking penuh                | Post-MVP lanjutan  |

Untuk PT AMA, default yang paling aman adalah Level 1 terlebih dahulu. Level 2 dan 3 membutuhkan credential, app review platform, consent/privacy, conversion tracking, reconciliation biaya ke Finance, dan kontrol approval budget.

## 12. Arsitektur Offline Sync

Offline sync perlu dianggap sebagai subsystem tersendiri.

Komponen:

- Cache data awal per station.
- Local action queue.
- Idempotency key.
- Sync batch endpoint.
- Server command replay.
- Conflict detection.
- Conflict review UI.
- Sync audit.
- Retry scheduler.
- Device/session scope.

Data yang boleh offline:

- Station checklist.
- Task evidence draft.
- Station service/cost draft.
- Manifest confirmation terbatas.
- Notes dan observations.

Data yang tidak boleh offline pada MVP:

- Finance posting.
- Invoice approval.
- Flight lifecycle critical seperti depart/land/close, kecuali ada SOP khusus.
- Employee sensitive data mutation.
- Customer credit hold.
- Rate activation.

Acceptance criteria:

- User tahu sedang offline.
- User tahu action masuk queue.
- User tahu action berhasil sync atau conflict.
- Server tetap menjalankan validation saat replay.
- Duplicate action tidak membuat data ganda.
- Conflict critical tidak diselesaikan diam-diam.
- Audit mencatat original offline timestamp dan replay timestamp.

## 13. Backup, Restore, dan Disaster Recovery

Enterprise MVP minimal:

- Backup database harian.
- Backup retention policy.
- Restore drill sebelum pilot.
- Upload/object storage backup plan.
- Migration rollback plan.
- Environment variable documentation.
- Health check endpoint.
- Error logging.
- Request id pada API.
- Operational runbook.

Target RPO/RTO awal:

| Kategori         | Target MVP                                 |
| ---------------- | ------------------------------------------ |
| RPO              | Maksimal kehilangan data 24 jam            |
| RTO              | Sistem pulih dalam 4 sampai 8 jam          |
| Restore test     | Minimal 1 kali sebelum pilot               |
| Backup frequency | Harian untuk MVP                           |
| Audit retention  | Ditentukan PT AMA, default minimal 1 tahun |

Catatan:

- Untuk operasi penerbangan nyata, RPO/RTO ini mungkin belum cukup. PT AMA harus memutuskan apakah pilot hanya pendamping proses atau source of truth operasional.

## 14. Security Baseline

Wajib untuk Enterprise MVP:

- IdP production.
- MFA untuk privileged roles.
- Role-based access control.
- Station-based scope.
- Audit log untuk mutation penting.
- Server-side permission enforcement.
- Session hardening.
- Sensitive data classification.
- Export permission.
- Backup access restriction.
- Basic threat model.

Data sensitif:

- Employee personal data.
- License/medical records.
- Customer financial exposure.
- Invoice/payment data.
- Audit log.
- Uploaded documents.
- Offline cached data.

Security questions sebelum pilot:

- Apakah perangkat station shared device?
- Apakah browser menyimpan data offline?
- Apakah user bisa export employee/customer data?
- Siapa admin tertinggi?
- Bagaimana offboarding user?
- Bagaimana jika device station hilang?

## 15. Acceptance Criteria Enterprise MVP

Enterprise MVP dianggap siap UAT final jika:

- HRIS P0 selesai dan terhubung ke readiness.
- CRM P0 selesai dan terhubung ke ticketing/finance.
- Notification in-app berjalan untuk event P0.
- Offline station-critical berjalan pada skenario terbatas.
- Ticketing critical flow stabil.
- Flight Ops sampai invoice berjalan tanpa manual DB intervention.
- Permission per role diuji.
- Audit command penting tersedia.
- Backup restore berhasil diuji.
- Critical E2E tests passing.
- UAT scenario disetujui business owner.
- Known limitations ditulis dan disetujui.

Tidak boleh go-live/pilot jika:

- Permission critical masih bypassable.
- Offline conflict bisa silent data loss.
- Finance posting bisa duplicate.
- Flight closure membuat invoice ganda.
- HRIS expiry tidak mempengaruhi readiness sesuai rule.
- Data sensitif dapat diakses role tidak berwenang.
- Backup belum pernah direstore.

## 16. Test Plan

### 16.1 Unit dan Service Tests

Wajib mencakup:

- HRIS employment lifecycle.
- HRIS license/medical/training expiry.
- HRIS crew availability.
- CRM contact/activity/case.
- CRM renewal reminder.
- Notification event rules.
- Offline queue replay.
- Conflict detection.
- Permission checks.
- Finance handoff idempotency.
- Ticketing fare/refund/reschedule.

### 16.2 API Contract Tests

Wajib mencakup:

- HRIS endpoints.
- CRM endpoints.
- Notification endpoints.
- Offline sync endpoints.
- Existing flight/ticketing/finance endpoints yang terdampak.
- Error envelope.
- Validation failure.
- Unauthorized/forbidden response.

### 16.3 E2E Tests

Critical journeys:

- OCC membuat flight request sampai flight ready.
- Station Admin menyelesaikan task dan evidence.
- Ticketing membuat passenger booking sampai check-in dan manifest.
- Cargo booking sampai payment dan delivery.
- HR mengubah license expiry lalu readiness berubah.
- CRM membuat service case lalu notification muncul.
- Finance menerima handoff dan invoice.
- Offline station membuat task update lalu sync.
- Conflict offline masuk conflict review.
- Director melihat dashboard dan approval.

### 16.4 UAT

UAT harus dibagi per role:

- Director.
- OCC.
- Station Admin.
- Maintenance Manager.
- Finance.
- HR.
- Commercial.
- Admin.

Setiap UAT script harus memiliki:

- Tujuan bisnis.
- Data awal.
- Step.
- Expected result.
- Screenshot/evidence.
- Pass/fail.
- Catatan user.
- Severity jika gagal.

## 17. Risiko Utama

| Risiko                            | Dampak              | Mitigasi                                            |
| --------------------------------- | ------------------- | --------------------------------------------------- |
| PT AMA belum menentukan prioritas | Timeline melebar    | Discovery wajib, P0/P1/P2 dikunci                   |
| HRIS/CRM branch belum tersedia    | Rework              | Audit branch/repo pada minggu pertama               |
| Offline sync terlalu luas         | Delay besar         | Batasi station-critical                             |
| IdP belum dipilih                 | Security tertunda   | Pilih default cepat atau stub production-compatible |
| Data lama tidak rapi              | Migration lama      | Data profiling dan import staging                   |
| UI terlalu demo                   | User error          | Enterprise UI/UX pass                               |
| Notification terlalu bising       | User abaikan sistem | Hanya actionable event P0                           |
| Permission salah                  | Security incident   | Permission tests dan review                         |
| Finance duplicate posting         | Data rusak          | Idempotency dan reconciliation tests                |
| Backup tidak diuji                | Recovery gagal      | Restore drill wajib                                 |

## 18. Timeline Detail per Minggu

| Minggu | Fokus                                                 | Output Utama                       |
| -----: | ----------------------------------------------------- | ---------------------------------- |
|      1 | Discovery codebase dan branch                         | Gap report                         |
|      2 | Workshop PT AMA dan backlog                           | PRD, priority matrix               |
|      3 | Architecture/security foundation                      | ADR, permission matrix             |
|      4 | Database/storage/backup plan                          | Migration and backup plan          |
|      5 | HRIS schema/contracts                                 | HRIS contracts                     |
|      6 | HRIS UI employee/department                           | HRIS screens                       |
|      7 | HRIS personnel/readiness integration                  | Readiness integration              |
|      8 | HRIS tests/UAT prep                                   | HRIS test suite                    |
|      9 | CRM schema/contracts                                  | CRM contracts                      |
|     10 | CRM account/contact/activity UI                       | CRM workspace                      |
|     11 | CRM opportunity/case/renewal                          | CRM workflows                      |
|     12 | CRM tests/integration and marketing campaign decision | CRM test suite, ads scope decision |
|     13 | UI/UX audit existing modules                          | UI issue list                      |
|     14 | Flight/ticketing polish                               | Updated critical flows             |
|     15 | Finance/inventory/asset polish                        | Updated enterprise states          |
|     16 | Role navigation and consistency                       | UX baseline                        |
|     17 | Notification service/contracts                        | Notification backend               |
|     18 | Notification UI/topbar/inbox                          | Notification center                |
|     19 | Notification rules                                    | Event rules                        |
|     20 | Notification tests/polish                             | Notification test suite            |
|     21 | Offline architecture/cache/queue                      | Offline queue                      |
|     22 | Sync API/replay/idempotency                           | Sync endpoint                      |
|     23 | Conflict detection/review UI                          | Conflict workflow                  |
|     24 | Offline tests/simulation                              | Offline test suite                 |
|     25 | Regression/security review                            | QA report                          |
|     26 | Backup/restore/deployment drill                       | Runbook evidence                   |
|     27 | Bug fixing and stabilization                          | Release candidate                  |
|     28 | UAT round 1                                           | UAT findings                       |
|     29 | Fix UAT findings                                      | RC2                                |
|     30 | UAT final                                             | Sign-off candidate                 |
|     31 | Training/runbook/final docs                           | Pilot package                      |
|     32 | Go/no-go and pilot readiness                          | Release decision                   |

## 19. RACI Ringkas

| Aktivitas     | Responsible            | Accountable                | Consulted          | Informed          |
| ------------- | ---------------------- | -------------------------- | ------------------ | ----------------- |
| Prioritas P0  | Product/Analyst        | PT AMA Owner               | Leads domain       | Squad             |
| HRIS          | HRIS Engineer          | HR Owner                   | OCC, Asset         | Management        |
| CRM           | CRM Engineer           | Commercial Owner           | Finance, Ticketing | Management        |
| Marketing Ads | CRM/Marketing Engineer | Commercial/Marketing Owner | Finance, Director  | Management        |
| Offline sync  | Offline Engineer       | Operations Owner           | Station, Security  | Management        |
| Notification  | Full-stack Engineer    | Product Owner              | Semua domain       | Semua user        |
| Security      | DevOps/Security        | CTO/Tech Lead              | Analyst, QA        | Management        |
| UAT           | QA/Analyst             | PT AMA Owner               | Domain users       | Squad             |
| Release       | Tech Lead              | PT AMA Sponsor             | QA, DevOps         | Semua stakeholder |

## 20. Post-MVP Roadmap

Setelah Enterprise MVP stabil, urutan lanjutan yang disarankan:

1. Production hardening penuh.
2. PostgreSQL production migration jika belum dilakukan.
3. Object storage production dan document scanning.
4. Payroll/attendance/leave HRIS.
5. Contract authoring, subsidy amendment, and unbilled exposure.
6. AP aging, bank reconciliation, cash-flow forecast.
7. Period close/reopen dan automated depreciation.
8. Payment gateway/bank integration.
9. OTA integration.
10. Meta Ads/Google Ads/TikTok Ads/LinkedIn Ads reporting integration.
11. Automated campaign management and conversion attribution.
12. Tax/regulatory integration.
13. Email/WhatsApp/SMS notification.
14. BI warehouse and analytics.
15. Satellite/connectivity telemetry integration.
16. Native mobile app jika web offline tidak cukup.

## 21. Rekomendasi Keputusan Awal

Keputusan yang sebaiknya dibuat paling awal:

1. Tetapkan Enterprise MVP sebagai target 8 bulan.
2. Tetapkan pilot station dan role yang masuk UAT.
3. Tetapkan HRIS MVP tanpa payroll.
4. Tetapkan CRM MVP tanpa sales automation penuh.
5. Tetapkan marketing ads integration sebagai post-MVP default, kecuali PT AMA membutuhkan campaign budget/cost tracking manual sebagai P1.
6. Tetapkan offline station-critical, bukan full offline-first.
7. Tetapkan in-app notification dulu, tanpa WhatsApp/SMS/email production.
8. Tetapkan IdP dan MFA strategy.
9. Tetapkan database target dan backup policy.
10. Tetapkan business owner per domain.
11. Tetapkan rule bahwa finance dan flight lifecycle critical harus idempotent dan teruji.

## 22. Kesimpulan

Dengan kondisi codebase saat ini, AMA Interface sudah kuat sebagai demo operasional terintegrasi, tetapi belum cukup untuk enterprise pilot tanpa HRIS, CRM, notification, offline sync, production foundation, backup/restore, security hardening, QA, dan UAT.

Estimasi 8 bulan adalah estimasi realistis untuk Medium Squad dengan dukungan agent Codex, selama PT AMA cepat menentukan prioritas dan tidak memperluas scope MVP menjadi full production. Fokus utama bukan menambah halaman sebanyak mungkin, tetapi memastikan workflow yang ada dapat dipercaya: datanya benar, permission-nya aman, audit-nya jelas, user-nya tidak mudah salah, dan sistem tetap bisa bekerja pada kondisi station yang konektivitasnya terbatas.
