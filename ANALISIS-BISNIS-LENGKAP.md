# Analisis Bisnis Komprehensif — AMA Ops Interface

## PT Asman Motor Air (AMA) — Operator Penerbangan STOL Papua

**Tanggal Analisis:** 27 Juli 2026  
**Status Aplikasi:** Demo persisten aktif; belum production-ready  
**Total Halaman:** 92 halaman Vue, 382 handler API, 28 feature service

---

## RINGKASAN EKSEKUTIF

AMA Ops Interface adalah platform operasional terpadu yang dirancang khusus untuk mengelola seluruh siklus penerbangan STOL (Short Take-Off and Landing) di Papua. Platform ini mengatasi tantangan unik operasional penerbangan di wilayah terpencil: konektivitas terbatas, jarak antar-stasiun yang jauh, kebutuhan koordinasi multi-peran (OCC, station agent, pilot, finance), serta kepatuhan terhadap regulasi penerbangan.

**Cakupan Platform:**

- Perencanaan & permintaan penerbangan (Flight Request)
- Eksekusi operasional (Flight Order, Manifest, Fuel Control)
- Operasional stasiun (Station Operations dengan dual sign-off)
- Ticketing & penjualan (penumpang, kargo, dangerous goods)
- Keuangan (Invoice, HPP, Accounting Workbench)
- Inventori & pengadaan (spare parts, procurement, repairables)
- Aset korporat (non-aircraft assets)
- Dashboard eksekutif & reporting

**Arsitektur Teknis:**

- Frontend: Nuxt 3 / Vue 3 / Vuetify
- Backend: Nuxt Server API dengan SQLite (demo)
- Database: SQLite dengan Drizzle ORM
- Autentikasi: Role-based demo authentication
- Validasi: Zod schema validation
- Multi-currency support: IDR, USD, PGK

### 0.1 Perubahan Material Sejak Analisis 2025

Analisis awal telah dibandingkan ulang dengan route, API, schema, migration, service, permission, seeder, dan test yang tersedia. Perubahan material yang harus dianggap bagian dari baseline 2026 adalah:

1. Customer Detail telah berkembang menjadi Customer Account workspace dengan persistent contacts, payment-term relation, credit configuration, Finance exposure read model, credit-hold command, rates, contracts, documents, notes, activity, dan audit.
2. Agent Detail telah berkembang menjadi commercial channel workspace dengan station/customer/personnel relation, contacts, lifecycle command, effective commission rules, rate/contracts linkage, Finance commission summary, activity, documents, notes, dan audit.
3. Fare & Rate Card telah memiliki lifecycle, effective dating, optimistic version, deterministic selection, ambiguity guard, backend preview, contract/customer/agent scope, booking channel, tax relation, documents, dan history.
4. Personnel Detail telah memiliki historical license dan medical records, qualifications, operational readiness evaluation, documents, notes, audit, serta flying-hours aggregation dari Flight Operations.
5. Modul Marketing Contracts & Subsidies ditambahkan pada `/marketing/contracts-subsidies`, dengan contract portfolio, subsidy program, absorption, rates, documents, activity, dan history.
6. Finance Dashboard, Trial Balance, dan HPP telah dipindahkan dari static composable ke persistent reporting service berbasis posted ledger dan immutable invoice snapshot.
7. Demo database tidak lagi seharusnya reset otomatis saat aplikasi start. Reset merupakan command eksplisit, sedangkan seed mempunyai integrity guard.

### 0.2 Batas Klaim Kematangan

Status **fungsional penuh** pada dokumen ini berarti alur demo lokal tersedia end-to-end pada UI dan API. Status tersebut bukan sertifikasi production readiness. Kesenjangan utama masih mencakup identity provider produksi, database production-grade, strategi offline station, observability, backup/DR, normalisasi money legacy, FX policy, dan integrasi eksternal.

### 0.3 Matriks Source of Truth Setelah Penambahan Modul

| Informasi                           | Source of truth                           | Consumer/read model                       |
| ----------------------------------- | ----------------------------------------- | ----------------------------------------- |
| Customer identity dan credit limit  | Customer Master                           | Commercial, Ticketing, Finance review     |
| Current exposure dan overdue        | Finance invoice/payment                   | Customer Financial tab, Finance Dashboard |
| Customer contacts                   | Customer Contacts                         | Customer Detail, booking/billing lookup   |
| Agent identity dan lifecycle        | Commercial Agent                          | Ticketing, Cargo, Commercial reporting    |
| Commission policy                   | Agent Commission Rules                    | Booking commission snapshot               |
| Commission payable/settlement       | Finance                                   | Agent commission summary read-only        |
| Station dan route                   | Station/Route Master                      | Flight, Customer/Agent/Rate summaries     |
| Rate applicability dan calculation  | Fare & Rate Card                          | Flight planning, Ticketing, Cargo         |
| Applied rate historis               | Transaction finance/rate snapshot         | Invoice, audit, reconciliation            |
| Personnel identity/readiness inputs | Personnel + License/Medical/Qualification | Crew planning/readiness                   |
| Flying hours                        | Completed Flight Operations               | Personnel flying-hours read model         |
| Actual crew assignment              | Flight Operations                         | Personnel summary/history lookup          |
| Contract relation                   | Customer/Agent/Rate contract records      | Marketing portfolio                       |
| Subsidy program dan consumption     | Marketing Contracts & Subsidies           | Marketing/Finance monitoring              |
| Invoice dan payment                 | Finance/Billing                           | Customer exposure, Dashboard, reporting   |
| Documents                           | Uploads/Documents                         | Linked entity tabs                        |
| Business activity                   | Domain event/read projection              | Activity tabs                             |
| Change history                      | Domain audit log                          | History tabs                              |

### 0.4 Terminologi Canonical

- Gunakan **Customer Account**, bukan mencampur “cliente/cuenta” pada contract atau DTO baru.
- Gunakan **Commercial Agent**, bukan user login atau Personnel.
- Gunakan **Fare & Rate Card** untuk pricing configuration; **applied rate snapshot** untuk nilai historis transaksi.
- Gunakan **Contracts & Subsidies** untuk portfolio Marketing; invoice/payment tetap Finance.
- Gunakan **Personnel** untuk kru/staf operasional dan **Employee** untuk master HR/custodian non-crew.
- Istilah UI boleh diterjemahkan, tetapi enum, permission, error code, dan contract API mengikuti naming canonical codebase.

---

## 1. FLIGHT OPERATIONS — INTI OPERASIONAL PENERBANGAN

### 1.1 Flight Requests (Permintaan Penerbangan) — `/flights/requests`

**Status:** Fungsional Penuh  
**Pengguna:** Staff OCC, Flight Coordinator, Operator Charter

**Business Value:**

- Pintu masuk seluruh permintaan penerbangan ke dalam sistem (charter, terjadwal, kargo, medevac)
- Pemisahan fase perencanaan dari eksekusi memastikan setiap penerbangan melalui persetujuan tertib
- Ringkasan status (Draft, Submitted, Converted, Rejected) memberikan visibilitas beban kerja persetujuan
- Wizard 5-langkah memastikan tidak ada informasi kritis terlewat — krusial untuk lingkungan Papua di mana kesalahan perencanaan bisa berakibat fatal

**Fungsionalitas:**

- **Daftar Permintaan:** Tabel seluruh Flight Request dengan nomor, rute, pelanggan, pesawat, prioritas, status
- **Pencarian & Filter:** Filter berdasarkan status, pencarian berdasarkan nama/rute/pelanggan
- **Pembuatan Baru (Wizard 5 Langkah):**
  - **Langkah 1 — Informasi Dasar:** Tanggal, kategori, jenis layanan, rute, pelanggan, jadwal, prioritas
  - **Langkah 2 — Penugasan Pesawat & Kru:** Pemilihan aircraft dengan preview kelaikan dan kapasitas, PIC dan co-pilot dari kandidat tersedia
  - **Langkah 3 — Persiapan Manifest:** Estimasi penumpang dan kargo, kategori kargo (General, Perishable, Medical, AOG Parts, Dangerous Goods, Mail), profil kapasitas
  - **Langkah 4 — Bahan Bakar & Stasiun:** Jenis fuel (AVTUR/ Jet A-1), volume, supplier, handling provider, parking, estimasi revenue dengan rate preview otomatis
  - **Langkah 5 — Tinjauan & Kirim:** Ringkasan lengkap, readiness preview, opsi Draft atau langsung Submit
- **Detail & Edit:** View detail lengkap, edit untuk Draft/Rejected, submit untuk review
- **Approval:** Approve & Create Order (membuat Flight Order otomatis), Reject dengan alasan, Request Revision dengan catatan

**Data yang Ditampilkan:**

- Nomor dan tanggal permintaan
- Rute asal-tujuan dan jenis layanan
- Nama pelanggan, registrasi pesawat, nama pilot
- Prioritas (Normal, High, Emergency)
- Status alur permintaan
- Estimasi revenue dari rate card
- Peringatan: posisi pesawat tidak sesuai, lisensi PIC hampir kedaluwarsa, kapasitas tidak mencukupi

**Business Rules:**

- Hanya Draft/Rejected yang dapat disunting
- Pembuat request tidak dapat approve request sendiri (separation of duties)
- Planning blocker mencegah submission (rute tidak siap, aircraft tidak available, crew tidak available)
- Approval otomatis menciptakan Flight Order terpisah

---

### 1.2 Flight Orders Board — `/flights`

**Status:** Fungsional Penuh  
**Pengguna:** Operation Manager, OCC Staff, Direktur Operasional

**Business Value:**

- Visibilitas real-time seluruh order penerbangan dari readiness hingga closure
- Filter multi-dimensi (status, tipe, rute, aircraft) untuk isolasi cepat flight yang perlu perhatian
- Dashboard KPI memberikan ringkasan instan jumlah penerbangan per status
- Akses cepat ke creation flow untuk Flight Request baru

**Fungsionalitas:**

- **Ringkasan KPI:** 8 kartu status (Draft, Pending Readiness, Blocked, Ready for Approval, Scheduled, In Progress, Landed, Pending Closure)
- **Tabel Flight Order:** Nomor flight, nomor order, status, rute, jenis layanan, persentase readiness
- **Filter & Pencarian:** Filter berdasarkan status, tipe penerbangan, rute, aircraft
- **Aksi Cepat:** Tombol "New Flight Request", klik untuk buka detail

**Data yang Ditampilkan:**

- Nomor penerbangan dan order
- Status operasional saat ini
- Rute (origin → destination)
- Jenis layanan (Charter Cargo, Passenger, Medevac, dll)
- Persentase readiness
- Summary counts per status

---

### 1.3 Flight Order Detail — `/flights/[id]`

**Status:** Fungsional Penuh  
**Pengguna:** Operation Manager, OCC Staff, Direktur, Finance Reviewer

**Business Value:**

- Workspace terpusat untuk seluruh aspek operasional satu penerbangan (planning hingga closure)
- Lifecycle management ketat dengan validasi status berurutan memastikan kepatuhan SOP
- Separation of duties: pembuat ≠ approve, finance reviewer tidak dapat mengubah data aktual
- Financial tracking terintegrasi (estimated revenue, operational cost, margin) untuk monitoring profitabilitas real-time

**Fungsionalitas:**

#### 1.3.1 Overview Tab

- Informasi lengkap: nomor flight, tanggal, rute, aircraft, PIC, progress readiness
- Ringkasan manifest: penumpang, kargo, fuel, handling
- Sidebar: alert blocking issues dan lifecycle tracker visual (12 tahap)
- Lifecycle: Draft → Pending Readiness → Ready for Approval → Approved → Scheduled → Check-in Open → Check-in Closed → Ready for Departure → In Progress → Landed → Pending Closure → Closed

#### 1.3.2 Readiness Tab

- Checklist readiness per kategori: Aircraft, Crew, Manifest, Fuel, Station, Finance, Documents
- Status per item: Pass/Fail/Warning dengan catatan
- Blocking issues terpisah
- Tombol "Run Readiness Check" untuk evaluasi ulang

#### 1.3.3 Assignment Tab

- Detail aircraft: registrasi, tipe, kapasitas, stasiun saat ini, kelaikan, maintenance berikutnya
- Daftar alternatif aircraft tersedia
- Crew assignment: PIC dan co-pilot dengan lisensi, medical, ketersediaan
- Conflict detector: isu assignment yang perlu ditangani

#### 1.3.4 Approval Tab

- Lifecycle timeline 12 tahap
- Approval stages: Operational Review, Finance Review, Director Approval dengan status
- Sidebar: current status, next action, blocking reason
- Tombol aksi sesuai permission dan status

#### 1.3.5 Records Tab

- Ringkasan record: Passenger Manifest, Cargo Manifest, Fuel Request, Station Handling, Flight Actual
- Jumlah dan status per record

#### 1.3.6 History Tab

- Log perubahan status: aktor, waktu, alasan
- Filter: status changes, approval, readiness evaluation

**Data yang Ditampilkan:**

- Identitas flight (nomor, tanggal, rute, layanan)
- Jadwal (ETD/ETA) dan waktu aktual
- Aircraft (registrasi, tipe, kapasitas, kelaikan)
- Crew (PIC, co-pilot, lisensi, medical, ketersediaan)
- Manifest (penumpang, kargo, dangerous goods)
- Fuel (supplier, quantity, approval, actual uplift, biaya)
- Station services (handling, parking, konfirmasi)
- Financial (estimated revenue, operational cost breakdown: fuel/station/maintenance, margin)
- Approval stages dan history
- Blocking issues dan warnings
- Closure requirements dan status

**Business Rules:**

- Validasi status berurutan: tidak dapat loncat tahap
- Concurrency control dengan expectedUpdatedAt mencegah race condition
- Closure readiness check: semua requirement harus terpenuhi (actual times, final manifest, actual fuel, approved station cost, approved maintenance)
- Commercial details editing hanya diizinkan pada status tertentu (Draft, Pending Readiness, Blocked, Reopened)
- Aircraft reassignment memicu recalculation readiness otomatis

---

### 1.4 Manifest Control — `/flights/[id]/manifest`

**Status:** Fungsional Penuh  
**Pengguna:** OCC Staff (preparation), Operation Manager/Direktur (approval & lock)

**Business Value:**

- Workflow approval berjenjang (Draft → Submit → Approve → Lock) memastikan validasi ganda muatan
- Dangerous goods decision tracking dengan audit trail (accept/reject dengan alasan) memitigasi risiko keselamatan
- Version control mencegah konflik edit simultan
- Departure assurance evaluation terintegrasi memvalidasi kesiapan manifest sebagai prasyarat keberangkatan

**Fungsionalitas:**

- **Dua Manifest per Flight:** Passenger/Patient dan Cargo
- **Metadata Manifest:** Jumlah item, versi, status submit, status lock
- **Aksi (berdasarkan permission):**
  - **Prepare:** Submit manifest ke OCC
  - **Review:** Approve, Reject dengan alasan, Lock sebagai final, Unlock dengan alasan
  - **Dangerous Goods:** Decision accept/reject per item dengan alasan dan evidence reference
- **Departure Assurance Panel:** Checklist kesiapan keberangkatan (dievaluasi setelah check-in ditutup)

**Data yang Ditampilkan:**

- Passenger manifest: nama, identitas (KTP/paspor), nomor kursi, berat (penumpang + bagasi)
- Cargo manifest: deskripsi, berat aktual, kategori dangerous goods, status acceptance
- Metadata: jumlah item, versi, waktu submit/lock, alasan reject

**Business Rules:**

- Empty load declaration memerlukan alasan khusus
- Reject dan unlock memerlukan alasan wajib
- Dangerous goods decision memerlukan reason dan evidence IDs
- Version control dengan expectedVersion mencegah concurrent modification
- Departure assurance hanya dapat dievaluasi setelah check-in ditutup

---

### 1.5 Fuel Control — `/flights/fuel`

**Status:** Fungsional Penuh  
**Pengguna:** OCC Staff, Operation Manager, Finance

**Business Value:**

- Worklist terpusat untuk seluruh fuel request mempercepat turnaround time
- Alur approval berjenjang (Request → Approve → Uplift → Post) memastikan validasi sebelum posting ke finance
- Tracking actual uplift vs approved quantity mendukung akurasi billing
- Integrasi dengan Flight Order memastikan biaya fuel diperhitungkan dalam operational cost

**Fungsionalitas:**

- **Tabel Fuel Request:** Flight, Supplier, Fuel Type, Requested, Approved, Actual, Total Cost, Status
- **Aksi per Status:**
  - **Requested:** Approve
  - **Approved:** Uplift (catat actual)
  - **Uplifted:** Post ke finance
- **Konfirmasi & Validasi** per aksi
- **Link ke Flight Order** untuk detail

**Data yang Ditampilkan:**

- Nomor penerbangan dan supplier
- Tipe fuel (AVTUR, Jet A-1)
- Quantity: requested, approved, actual uplift
- Reference price per liter dan total cost
- Status (Requested, Approved, Uplifted, Posted, Rejected)

**Business Rules:**

- Approval hanya untuk status Requested
- Uplift recording hanya untuk status Approved
- Posting ke finance hanya untuk status Uplifted
- Actual uplift dan price digunakan untuk menghitung total cost aktual

---

### 1.6 Maintenance Handoff — `/flights/maintenance`

**Status:** Fungsional Penuh  
**Pengguna:** Operation Manager, Maintenance Team, Finance

**Business Value:**

- Centralized maintenance handoff tracking memastikan setiap isu kelaikan terdokumentasi dan diapprove
- Evidence completeness checker memitigasi risiko aircraft tidak laik terbang
- Integration dengan inventory spare parts memungkinkan tracking penggunaan suku cadang
- Finance impact panel menunjukkan breakdown biaya operasional dan projected gross margin

**Fungsionalitas:**

- **Tabel Maintenance Handoff:** Flight/Route, Scheduled, Aircraft, Serviceability, Maintenance Due, Evidence, Cost, Status
- **Filter:** Pencarian, tanggal, station, serviceability, status
- **Summary Cards:** Closure Ready, Needs Attention, Pending Approval, Maintenance Cost
- **Drawer Detail:**
  - Evidence checklist: serviceability reviewed, work order attached, maintenance approval
  - Blockers & attention list
  - Maintenance notes: assessment, work order, spare part reference, note
  - Issued spare parts: part number, quantity, serial numbers, total value
  - Finance impact: fuel cost, station cost, maintenance cost, total operational cost, projected margin
- **Dialog Issue Parts:** Pencatatan penggunaan spare parts dari inventory (warehouse, maintenance category, reason, multiple lines)

**Data yang Ditampilkan:**

- Flight information (nomor, route, scheduled departure)
- Aircraft (registrasi, tipe, serviceability status, next maintenance due)
- Evidence status (complete/incomplete dengan blockers)
- Maintenance notes dan references
- Issued spare parts (part number, quantity, serial numbers, total value)
- Finance impact (fuel cost, station cost, maintenance cost, total operational cost, projected margin)

**Business Rules:**

- Closure memerlukan approved maintenance handoff
- Aircraft unserviceable atau maintenance due sebelum departure akan fail readiness
- Evidence complete check: serviceability reviewed + work order attached + maintenance approval
- Finance currency mismatch warning jika costs menggunakan mata uang berbeda
- Inventory issue posting mengurangi stock dan track serial numbers

---

### 1.7 Manifest Worklist — `/flights/manifest`

**Status:** Fungsional Penuh  
**Pengguna:** OCC Staff, Operation Manager

**Business Value:**

- Worklist view menyediakan perspektif cross-flight untuk manifest control
- Prioritasi workload berdasarkan status dan readiness
- Progress bar readiness memberikan visualisasi cepat kesiapan
- Direct link ke manifest workspace dan edit request

**Fungsionalitas:**

- **Grid Card per Flight:** Flight dalam fase pre-departure (Draft hingga Ready for Departure)
- **Per Card:** Nomor flight, rute, flight type, status, progress bar readiness, readiness summary
- **Aksi:** Open Manifest Workspace, Edit Request (untuk Draft/Blocked/Reopened)

**Data yang Ditampilkan:**

- Nomor penerbangan dan rute
- Jenis penerbangan
- Status operasional
- Persentase readiness dan ringkasan (contoh: "5/7 checks complete")

---

### 1.8 Operational Assurance — `/flights/readiness`

**Status:** Fungsional Penuh  
**Pengguna:** Operation Manager, OCC Staff

**Business Value:**

- Pemisahan eksplisit Planning Readiness (pre-approval) dan Departure Assurance (final gate) memperjelas tanggung jawab
- Planning readiness checklist memastikan aircraft, route, crew, dokumen siap sebelum approval
- Departure assurance memvalidasi final manifest lock, DG decision, fuel, origin tasks, documents, dual station sign-off
- Blocking reason display memungkinkan identifikasi cepat penyebab delay

**Fungsionalitas:**

#### 1.8.1 Planning Readiness Section

- Tabel flight: Pending Readiness, Blocked, Ready for Approval
- Kolom: Flight, Route, Aircraft, PIC, Status, Readiness (progress bar), Blocking Reason
- Aksi: view detail, evaluate (run readiness check), approve (untuk Ready for Approval)

#### 1.8.2 Departure Assurance Section

- List flight: Check-in Closed, Ready for Departure
- Per item: rute, tanggal, status
- Klik ke manifest workspace untuk evaluasi

**Data yang Ditampilkan:**

- Nomor penerbangan dan tanggal
- Rute dan aircraft registration
- PIC name
- Status dan progress readiness
- Blocking reason

**Business Rules:**

- Planning readiness: aircraft, route, crew, planning documents, separation of duties
- Departure assurance: final manifest lock, DG decision, fuel, origin tasks, documents, dual station sign-off
- Evaluasi readiness dapat dipicu ulang kapan saja
- Approval hanya setelah readiness evaluated dan status Ready for Approval

---

### 1.9 Flight Actual & Closure — `/flights/actual-closure`

**Status:** Fungsional Penuh  
**Pengguna:** OCC Staff, Operation Manager

**Business Value:**

- Worklist terpusat untuk actual time capture dan closure workflow
- Sequential action buttons memandu user melalui alur closure yang benar
- Actual departure/arrival recording dengan timestamp dan station validation
- Closure gate dengan requirement checklist memastikan semua prasyarat terpenuhi

**Fungsionalitas:**

- **Tabel Flight:** Scheduled hingga Pending Closure
- **Kolom:** Flight, Route, Status, Scheduled Departure, Actual Departure, Actual Arrival, Closure (locked/open), Action
- **Aksi Dinamis per Status:**
  - **Scheduled:** Open Check-in
  - **Check-in Open:** Depart (dialog actual time)
  - **In Progress:** Land (dialog actual time)
  - **Landed:** Pending Closure
  - **Diverted:** Diversion Closure
  - **Pending Closure:** Close
- **Dialog Actual Time:** Validasi timestamp dan station

**Data yang Ditampilkan:**

- Nomor penerbangan dan customer
- Rute
- Status operasional
- Scheduled dan actual departure/arrival
- Closure status (locked/open dengan blocking reason)

**Business Rules:**

- Actual departure memerlukan validasi timestamp dan origin station
- Actual arrival memerlukan validasi timestamp dan destination station
- Closure hanya jika semua requirement terpenuhi (actual times, final manifest, actual fuel, approved station cost, approved maintenance)
- Blocked closure requirements ditampilkan dengan alasan dan link ke halaman terkait

---

## 2. STATION OPERATIONS — OPERASIONAL STASIUN

### 2.1 Master Data Stations — `/master-data/stations`

**Status:** Fungsional Penuh  
**Pengguna:** Operations Manager, Station Manager, Master Data Administrator

**Business Value:**

- Sentralisasi data bandara, airstrip, STOL field dalam registri operasional terkontrol
- Tracking kapabilitas layanan per stasiun (fuel, handling, parking) untuk perencanaan
- Manajemen PIC stasiun dan catatan operasional khusus per lokasi
- Filtering berdasarkan status aktif/nonaktif untuk perencanaan rute

**Fungsionalitas:**

- **Daftar Stasiun:** Kode, nama, lokasi, tipe bandara, kapabilitas layanan
- **Filter & Pencarian:** Status (aktif/nonaktif/semua), pencarian nama/kode
- **Create/Edit Form:**
  - Kode dan nama stasiun
  - Lokasi (kota/wilayah, provinsi)
  - Tipe bandara (Airport, Airstrip, STOL Airfield)
  - PIC stasiun (nama dan telepon)
  - Catatan operasional
  - Flag: remote station, low connectivity mode
  - Kapabilitas: fuel, handling, parking
- **Aktivasi/Deaktivasi:** Toggle dengan konfirmasi
- **Detail View:** Informasi lokasi, tipe, PIC, catatan

**Data yang Ditampilkan:**

- Kode stasiun dan nama
- Lokasi geografis (kota/wilayah, provinsi)
- Tipe infrastruktur (Airport/Airstrip/STOL Airfield)
- Kapabilitas layanan (Fuel, Handling, Parking)
- Status operasional (Aktif/Nonaktif)
- PIC dan kontak
- Catatan operasional khusus

---

### 2.2 Station Operations Overview — `/flights/station-operations`

**Status:** Fungsional Penuh  
**Pengguna:** Station Operations Officer, Duty Manager, OCC

**Business Value:**

- Dashboard real-time monitoring operasional harian per stasiun dengan KPI kritis
- Identifikasi cepat flight yang membutuhkan attention berdasarkan readiness
- Tracking penumpang dan kargo agregat untuk decision making
- Visibilitas pending services dan costs untuk preventing bottleneck
- Multi-station operations dengan switcher terintegrasi

**Fungsionalitas:**

- **Station & Date Selector:** Pilih stasiun dan tanggal operasi (default: hari ini, default station: DJJ)
- **6 KPI Cards Real-time:**
  - Inbound flights
  - Outbound flights
  - Flights needing action
  - Pax check-in vs boarded
  - Pending services
  - Pending costs
- **Priority Flight Board:** 8 flight prioritas (diurutkan: readiness status, delayed flights, scheduled time)
  - Per flight: waktu (scheduled & actual), nomor, rute, status, readiness, pax/cargo, link ke workspace
- **Attention Queue:** Quick links ke area follow-up:
  - Verification tasks pending
  - Services awaiting confirmation
  - Costs awaiting action
  - Flights not ready
- **Passenger & Cargo Summary:** Agregat harian:
  - Checked in passengers
  - Boarded passengers
  - Load factor (%)
  - Cargo weight (kg)
  - Shipments count
- **Service & Cost Status:** Breakdown:
  - Services: Requested, Confirmed, Completed
  - Costs: Draft, Submitted, Approved

**Data yang Ditampilkan:**

- Flight count berdasarkan arah dan status kesiapan
- Penumpang: check-in, boarded, load factor
- Kargo: total weight (kg), shipment count
- Services: breakdown by status
- Costs: breakdown by status
- Priority flights dengan readiness indicators

**Business Rules:**

- Readiness status dihitung dari kelengkapan task verifikasi
- Delayed flights diprioritaskan dalam Priority Flight Board
- Auto-refresh saat ganti stasiun/tanggal

---

### 2.3 Flights Board — `/flights/station-operations/flights`

**Status:** Fungsional Penuh  
**Pengguna:** Station Operations Officer, Ground Handling Coordinator

**Business Value:**

- Visibility penuh semua penerbangan di stasiun tertentu pada tanggal tertentu
- Filtering cepat berdasarkan arah, status, readiness untuk decision making
- Link langsung ke flight workspace untuk detail operational tasks

**Fungsionalitas:**

- **Filter & Search:**
  - Search: nomor flight, rute, tipe aircraft
  - Direction: All, Inbound, Outbound
  - Status: All, Scheduled, Boarding, Arriving, Landed, Delayed, Departed
  - Readiness: All, Ready, Check, Not Ready
- **Tabel Flight Lengkap:**
  - Waktu: scheduled + actual (WIT)
  - Nomor flight
  - Rute: origin → destination
  - Aircraft type
  - Tipe: PSG (Passenger) atau CRG (Cargo)
  - Status flight (badge)
  - Readiness status (badge)
  - Passenger: actual/onboard vs total
  - Cargo weight (kg)
  - Action: link ke workspace

**Data yang Ditampilkan:**

- Waktu terjadwal dan aktual (WIT)
- Nomor penerbangan dan rute
- Jenis aircraft dan tipe layanan
- Status operasional (Scheduled, Boarding, Arriving, Landed, Delayed, Departed)
- Status kesiapan (Ready, Check, Not Ready)
- Load factor: penumpang actual vs total capacity
- Berat kargo dalam kg

**Business Rules:**

- Status flight diturunkan dari status code API
- Readiness status dari kelengkapan task verifikasi
- Flight belum siap (readiness ≠ READY) ditandai sebagai needsAction

---

### 2.4 Services Board — `/flights/station-operations/services`

**Status:** Fungsional Penuh  
**Pengguna:** Station Operations Officer, Ground Services Coordinator

**Business Value:**

- Manajemen layanan handling dan parking per flight di tingkat stasiun
- Workflow approval memastikan layanan terkonfirmasi sebelum eksekusi
- Tracking referensi rate untuk cost control dan vendor management
- Integrasi dengan flight workspace

**Fungsionalitas:**

- **Filter & Search:**
  - Search: nomor flight, nama supplier
  - Type: All, Handling, Parking
  - Status: All, Requested, Confirmed, Completed, Cancelled
- **Create Service Form:** Flight, tipe layanan, supplier, referensi rate
- **Confirm Service:** Untuk status REQUESTED (permission: `station.operation.update`)
- **Tabel Services:** Flight, tipe, supplier, referensi rate (IDR), status, action

**Data yang Ditampilkan:**

- Nomor penerbangan
- Jenis layanan: Handling atau Parking
- Nama supplier/vendor
- Referensi rate dalam IDR
- Status: Requested → Confirmed → Completed (atau Rejected/Cancelled)

**Business Rules:**

- Layanan harus dikonfirmasi sebelum bisa diverifikasi
- Task ORIGIN_HANDLING memerlukan service HANDLING confirmed/completed
- Permission `station.operation.update` untuk create dan confirm

---

### 2.5 Verification Board — `/flights/station-operations/verification`

**Status:** Fungsional Penuh  
**Pengguna:** Station Operations Officer, Quality Assurance, OCC Approver

**Business Value:**

- Workflow verifikasi task dengan dual sign-off (Station + OCC)
- Evidence-based verification untuk audit trail dan compliance
- Blocker detection otomatis memastikan kelengkapan sebelum verifikasi
- Rejection workflow dengan reason tracking untuk quality control
- Visibility penuh status verifikasi per phase

**Fungsionalitas:**

- **Filter & Search:**
  - Search: nomor flight, task code, title
  - Phase: All, ORIGIN_DEPARTURE, DESTINATION_ARRIVAL, DESTINATION_CLOSURE
  - Status: All, PENDING, IN_PROGRESS, VERIFIED, REJECTED
- **Task Actions:**
  - **Start Task:** PENDING → IN_PROGRESS (permission: `station.task.start`)
  - **Add Evidence:** Upload file bukti + catatan (permission: `station.evidence.add`)
  - **Verify Task:** Dengan evidence (permission: `station.task.verify`)
    - Blocker otomatis:
      - Task requiresEvidence harus punya minimal 1 evidence
      - Task ORIGIN_HANDLING memerlukan service HANDLING confirmed/completed
      - Task STATION_SIGNOFF memerlukan semua task lain di phase sudah VERIFIED
  - **Reject Task:** Dengan reason wajib (permission: `station.task.reject`)
  - **Approve OCC Sign-off:** Setelah station verification selesai (permission: `station.signoff.approve`)
- **Tabel Tasks:** Flight, task title & code, phase, evidence count, station decision, OCC decision, status, actions

**Data yang Ditampilkan:**

- Nomor penerbangan
- Judul dan kode task
- Phase operasional
- Jumlah evidence terlampir
- Keputusan stasiun (Station decision)
- Keputusan OCC (OCC decision)
- Status: PENDING → IN_PROGRESS → VERIFIED (atau REJECTED)
- Alasan penolakan (jika ada)

**Business Rules:**

- Dual sign-off: Station verification harus selesai sebelum OCC approval
- Evidence mandatory untuk task tertentu
- Task blocking logic memastikan dependencies terpenuhi
- Task STATION_SIGNOFF tidak bisa diverifikasi jika ada task lain di phase belum VERIFIED
- Rejection reason wajib

---

### 2.6 Costs Board — `/flights/station-operations/costs`

**Status:** Fungsional Penuh  
**Pengguna:** Station Operations Officer, Finance/Accounting, Cost Approver

**Business Value:**

- Manajemen biaya operasional stasiun dengan workflow approval berjenjang
- Multi-currency support (IDR dan lainnya) untuk vendor international
- Kategorisasi biaya untuk cost allocation dan reporting
- Separation: operational cost record di Station Operations, accounting ownership di Accounting Workbench
- Tracking biaya per flight atau station-level costs

**Fungsionalitas:**

- **Filter & Search:**
  - Search: nomor flight, vendor, kategori, deskripsi
  - Status: All, DRAFT, SUBMITTED, APPROVED, REJECTED, VOID
- **Create Cost Form:** Flight (opsional), kategori, vendor, mata uang (default: IDR), deskripsi, jumlah
- **Submit Cost:** DRAFT → SUBMITTED (permission: `station.operation.update`)
- **Approve Cost:** SUBMITTED → APPROVED (permission: `station.cost.approve`)
- **Tabel Costs:** Flight (atau "Station"), kategori, vendor, deskripsi, jumlah, status, action

**Data yang Ditampilkan:**

- Nomor penerbangan (jika applicable) atau "Station"
- Kategori biaya
- Nama vendor
- Deskripsi
- Jumlah dalam mata uang (IDR, USD, dll)
- Status: DRAFT → SUBMITTED → APPROVED (atau REJECTED/VOID)

**Business Rules:**

- Workflow: DRAFT → SUBMITTED → APPROVED
- Permission berbeda: submit (`station.operation.update`) vs approve (`station.cost.approve`)
- Biaya bisa terkait flight atau station-level (misal: positioning)
- Accounting ownership di Accounting Workbench

---

### 2.7 Flight Workspace — `/flights/station-operations/[flightId]`

**Status:** Fungsional Penuh  
**Pengguna:** Station Operations Officer, Ground Handling Coordinator, OCC, Quality Assurance

**Business Value:**

- Single pane of glass untuk semua aspek operasional per flight di tingkat stasiun
- Phase-based workflow (Origin Departure, Destination Arrival, Destination Closure) untuk structured operations
- Integrated task, service, cost, evidence, reconciliation, audit dalam satu workspace
- Progress tracking visual per phase dengan readiness indicators
- Dual sign-off workflow (Station + OCC) untuk operational assurance
- Reconciliation form untuk actual vs planned load tracking

**Fungsionalitas:**

**Header & Summary:**

- Flight info: nomor, status, rute, tanggal
- Scheduled & actual departure (WIT)
- Aircraft type dan service type
- Passenger load: actual vs total
- Cargo weight
- Phase selector
- Progress bar: verified tasks / total tasks
- Phase state: Needs Action / In Progress / Ready / Blocked
- Refresh button

**Tab 1: Tasks**

- List task di phase yang dipilih
- Task card: title, status, code, station, version, evidence count, decisions, blocker alert, notes
- Actions: Start, Evidence, Verify, Reject
- Sidebar: phase readiness (circular progress), sign-off status, OCC approve button

**Tab 2: Services**

- List services untuk station di phase yang dipilih
- Tabel: service type, supplier, rate, status, actions (view, confirm, reject)

**Tab 3: Evidence & Sign-off**

- Evidence register: file name, task, upload time, notes, view link
- Dual sign-off card: list sign-off tasks, decisions, OCC approve button

**Tab 4: Costs**

- List costs untuk station di flight
- Tabel: category, vendor, description, amount, status, actions (view, submit, approve)

**Tab 5: Reconciliation**

- Form actual vs planned:
  - Planned vs actual passengers
  - Planned vs actual cargo (kg)
  - No-show passengers
  - Offloaded cargo (kg)
  - Discrepancy note (wajib jika ada difference)
- Computed differences dengan visual indicators
- Save button

**Tab 6: Audit**

- Audit trail untuk flight ini
- Timeline view

**Data yang Ditampilkan:**

- Flight summary: scheduled/actual times, aircraft, passenger load, cargo
- Tasks per phase: title, status, evidence, decisions, blockers
- Services per station: type, supplier, rate, status
- Costs per station: category, vendor, amount, status
- Evidence per phase: file name, task, timestamp, notes
- Sign-off status: station dan OCC decisions
- Reconciliation: planned vs actual passengers dan cargo
- Audit trail: semua aksi

**Business Rules:**

- Phase-based workflow
- Task dependencies: ORIGIN_HANDLING memerlukan service HANDLING confirmed/completed
- Sign-off dependencies: semua task di phase harus VERIFIED sebelum STATION_SIGNOFF
- Dual sign-off: Station verification selesai sebelum OCC approval
- Evidence mandatory untuk task tertentu
- Reconciliation: discrepancy note wajib jika actual ≠ planned
- Permission-based actions

---

### 2.8 Reports — `/flights/station-operations/reports`

**Status:** Fungsional Penuh  
**Pengguna:** Station Manager, Operations Manager, Management Reporting

**Business Value:**

- Laporan operasional harian komprehensif untuk management review
- Visual breakdown flight by type untuk capacity planning
- Exception tracking untuk issue identification dan root cause analysis
- Export CSV untuk external reporting dan data analysis
- KPI aggregation untuk performance monitoring

**Fungsionalitas:**

- **Daily Report Summary (5 kategori):**
  1. Flights: Total, On Time, Delayed
  2. Passengers: Check-in, Boarded, Load Factor (%)
  3. Cargo: Weight (kg), Volume (m³), Shipments
  4. Services: Requested, Confirmed, Completed
  5. Costs: Total, Approved (%), Approved Amount (IDR)
- **Flights by Type Chart:** Donut chart distribusi Passenger/Cargo/Positioning
- **Exceptions Dashboard (5 jenis):**
  - Delay > 15 minutes
  - Services overdue (REQUESTED)
  - Cost overdue (DRAFT/SUBMITTED)
  - Manifest issues
  - Tech log open
- **Export CSV:** Download dengan timestamp dan station code

**Data yang Ditampilkan:**

- Agregat harian: flight count, passenger count, cargo weight
- Breakdown by status: on-time vs delayed
- Load factor percentage
- Service completion rate
- Cost approval rate dan approved amount
- Flight type distribution
- Exception counts

**Business Rules:**

- Load factor = (Boarded / Checked-in) × 100%
- Delay berdasarkan flight status DELAYED
- Service overdue: status REQUESTED
- Cost overdue: status DRAFT atau SUBMITTED
- Export CSV mencakup semua data dengan metadata

**Catatan:**

- Beberapa field (volume m³, shipments) masih hardcoded ke 0 — dalam tahap pengembangan aktif
- Exception tracking untuk manifest issues dan tech log open masih hardcoded ke 0

---

### 2.9 Audit Trail — `/flights/station-operations/audit`

**Status:** Fungsional Penuh  
**Pengguna:** Quality Assurance, Compliance Officer, Operations Manager

**Business Value:**

- Complete audit trail untuk semua aktivitas operasional dengan timestamp dan actor tracking
- Compliance dan accountability dengan read-only assurance activity log
- Timeline view untuk traceability dan incident investigation
- Filtering by module dan role untuk focused analysis
- Link langsung ke flight workspace

**Fungsionalitas:**

- **Filter & Search:**
  - Search: nomor flight, action, reason
  - Module: All, TASKS, SERVICES, COSTS, dll
  - Role: All, STATION_OPS, OCC, FINANCE
- **Timeline View:**
  - Nomor flight (link ke workspace)
  - Module badge
  - Action description
  - Actor role dan timestamp (WIT)
  - Status change: before → after
  - Reason (jika ada)
- **Color Coding:** Primary (normal), Error (REJECTED)

**Data yang Ditampilkan:**

- Nomor penerbangan
- Modul operasional
- Aksi yang dilakukan
- Role aktor
- Timestamp (WIT)
- Perubahan status: before → after
- Alasan aksi

**Business Rules:**

- Audit trail read-only dan auto-generated
- Semua aksi tercatat dengan actor, timestamp, reason
- Timeline diurutkan terbaru ke terlama
- Link ke flight workspace untuk drill-down

---

## 3. TICKETING & COMMERCIAL — PENJUALAN & KOMERSIAL

### 3.1 Portal Reservasi (Booking) — `/ticketing/booking`

**Status:** Fungsional Penuh  
**Pengguna:** Publik (tanpa autentikasi), Staff Ticketing

**Business Value:**

- Pintu masuk publik untuk penjualan tiket penumpang dan reservasi kargo di penerbangan STOL terjadwal
- Emisi tiket dan AWB (Air Waybill) langsung tanpa kredensial internal
- Koneksi reservasi dengan manifest OCC memastikan konsistensi operasional real-time
- Perhitungan tarif terpusat di server menghilangkan discrepancy

**Fungsionalitas:**

#### 3.1.1 Tab Penumpang

- Pilih origin, destination, flight
- Data penumpang: nama, dokumen (KTP/Paspor), berat, bagasi
- Pilih kursi dari visual selector (availability real-time)
- Opsional: link sales agent dan loyalty member
- Konfirmasi dengan nomor referensi dan opsi download PDF

#### 3.1.2 Tab Kargo

- Data: remitente, destinatario, deskripsi barang, dimensi (panjang/lebar/tinggi), berat real
- Indikasi dangerous goods (dengan kategori DG wajib jika applicable)
- Pilih flight kargo
- Konfirmasi dengan AWB number dan opsi download PDF

#### 3.1.3 Tab Konsultasi Reservasi

- Cari berdasarkan nomor tiket atau AWB
- Lihat status pembayaran
- Minta refund, bayar yang pending
- Reprogram flight (untuk penumpang)

**Data yang Ditampilkan:**

- Flight tersedia: origin, destination, tanggal/waktu, kapasitas, tarif base + pajak
- Kursi tersedia/terpenuhi (visual)
- Konfirmasi: referensi, data flight, tarif base, pajak, total
- Status pembayaran dan check-in

**Business Rules:**

- Kursi harus dipilih dari yang tersedia (real-time check)
- Tarif dihitung server berdasarkan rate card
- Untuk kargo: chargeable weight = max(actual weight, volume weight)
- Dangerous goods wajib kategori DG
- Refund hanya jika tiket aktif, paid, tanpa check-in (penumpang) atau status BOOKED dan paid (kargo)
- Reprogram hanya jika tiket aktif, paid, tanpa check-in, tanpa refund pending/approved

---

### 3.2 Manifes Penumpang — `/ticketing/passenger`

**Status:** Fungsional Penuh  
**Pengguna:** Staff Ticketing / Operasional Stasiun

**Business Value:**

- Vista consolidada seluruh tiket penumpang dengan status pembayaran, check-in, refund
- Operasi harian: check-in, reprogramación, manajemen refund, emisi PDF
- Fundamental untuk kontrol manifes sebelum setiap penerbangan STOL

**Fungsionalitas:**

- **Tabel Tiket Penumpang** dengan filter: search, status pembayaran (paid/pending), status check-in
- **Per Baris:** nomor tiket, penumpang, dokumen, flight, rute, kursi, tarif total, status pembayaran, check-in, refund
- **Aksi per Tiket:**
  - **Check-in:** Tandai penumpang sebagai boarded (requires paid, no refund pending)
  - **Reprogramación:** Dialog dengan flight alternatif di rute yang sama, kursi tersedia
  - **Aprobación/rechazo refund:** Form dengan nota keputusan wajib
  - **Download PDF** tiket

**Data yang Ditampilkan:**

- Tiket penumpang: flight, rute, kursi, tarif, pajak, status pembayaran, check-in, refund
- Flight alternatif untuk reprogramación dengan kursi tersedia

**Business Rules:**

- Check-in tidak bisa jika tiket belum paid
- Check-in tidak bisa jika ada refund REQUESTED atau APPROVED
- Reprogramación hanya untuk tiket aktif, paid, tanpa check-in
- Keputusan refund memerlukan nota minimal 3 karakter
- Reprogramación hanya menampilkan flight eligible di rute yang sama dengan kursi tersedia

---

### 3.3 Tracking Kargo — `/ticketing/cargo`

**Status:** Fungsional Penuh  
**Pengguna:** Staff Kargo / Operasional Stasiun

**Business Value:**

- Vista consolidada seluruh reservasi kargo (AWB) dengan status pembayaran, penerimaan DG, status entrega, refund
- Registrasi proof of delivery, manajemen refund, emisi AWB PDF
- Esensial untuk kontrol logistik barang di penerbangan STOL Papua

**Fungsionalitas:**

- **Tabel Reservasi Kargo** dengan filter: search, status pembayaran, status entrega
- **Per Baris:** nomor AWB, remitente & destinatario, flight, rute, chargeable vs actual weight, kategori DG, tarif total, status pembayaran, entrega, refund
- **Aksi per Reservasi:**
  - **Registrar Entrega:** Dialog dengan nama penerima (requires paid, no refund pending)
  - **Aprobación/rechazo refund:** Form dengan nota wajib
  - **Download PDF** AWB

**Data yang Ditampilkan:**

- Reservasi kargo: AWB, pihak terlibat, flight, berat, DG, tarif, pajak, pembayaran, entrega, refund

**Business Rules:**

- Entrega hanya bisa jika reservasi paid
- Entrega tidak bisa jika ada refund REQUESTED atau APPROVED
- Keputusan refund memerlukan nota minimal 3 karakter
- Kategori DG ditampilkan dengan warning chip

---

### 3.4 Libro Operativo Ticketing (Finance) — `/ticketing/finance`

**Status:** Fungsional Penuh  
**Pengguna:** Finance / Akuntansi

**Business Value:**

- Libro operativo (ledger) yang mengkonsolidasi seluruh transaksi ticketing: pendapatan penumpang, pendapatan kargo, refund, unpaid
- Visi keuangan multi-currency dengan total terurai
- Basis untuk konsiliasi akuntansi dan laporan pendapatan per operasi

**Fungsionalitas:**

- **Panel Superior:** Kartu total per currency: pendapatan penumpang, pendapatan kargo, refund, total pendapatan
- **Karti Tambahan:** Jumlah transaksi unpaid
- **Tabel Detail Transaksi:** Referensi, tipe (penumpang/kargo/refund), flight, rute, klien/passed, agen, tanggal, status pembayaran, jumlah
- **Jumlah negatif (refund)** ditampilkan dengan warna error

**Data yang Ditampilkan:**

- Total agregat per currency: pendapatan penumpang, kargo, refund, total, unpaid count
- Detail per transaksi: referensi, tipe, flight, rute, klien, agen, tanggal, status, jumlah

**Business Rules:**

- Total dihitung per currency, memisahkan penumpang, kargo, refund
- Transaksi termasuk cobrança dan devoluciones

---

### 3.5 Gestión Ticketing — `/ticketing/management`

**Status:** Fungsional Penuh  
**Pengguna:** Gestión Comercial / Operaciones

**Business Value:**

- Centro de control untuk konfiguración tarif komersial per rute dan aktivación ventas di flight OCC
- Visualización apakah setiap rute memiliki tarif configured untuk penumpang dan kargo
- Control apertura ventas ticketing per flight dengan detección blocker operasional

**Fungsionalitas:**

#### 3.5.1 Tab "Rutas y Tarifas"

- **Tabel Rute Aktif:** Kode, durasi, tarif penumpang (per penumpang), tarif kargo (per kg) configured
- **Warning Chip** jika rute belum memiliki tarif configured
- **Aksi:** Tambah rute baru, navigasi ke edit rate cards

#### 3.5.2 Tab "Ventas OCC"

- **Tabel Flight OCC** dengan status aktivación ventas
- **Per Flight:** nomor, order, status operasional, rute, jadwal, aircraft, PIC, tipe layanan (PASSENGER/CARGO), status ventas
- **Chip Verde** jika ventas sudah abierta
- **Warning Chips** dengan blocker: "Aircraft not assigned", "PIC not assigned", "Rate not configured", dll
- **Tombol "Open sales"** untuk activar venta

**Deteksi Blocker:**

- Ventas ya abierta
- Aircraft tidak assigned
- PIC tidak assigned
- PIC tidak available
- Lisensi/medical PIC expired
- Cliente tidak assigned
- Jadwal incompleto
- Aircraft tidak available
- Status flight tidak eligible
- Tarif tidak configured

**Data yang Ditampilkan:**

- Rute dengan tarif configured (penumpang dan kargo)
- Flight OCC dengan aircraft, pilot, status operasional, tipe layanan, status aktivación ventas

**Business Rules:**

- Ventas hanya bisa dibuka di flight yang belum abierta dan tanpa blocker
- Tarif yang ditampilkan adalah rate cards aktif tipe public (tanpa klien specific) per rute dan tipe layanan
- Pembuatan rute melalui dialog form yang create di master data

---

### 3.6 Agentes y Counters — `/master-data/agents`

**Status:** Fungsional Penuh  
**Pengguna:** Gestión Comercial / Administración

**Business Value:**

- Registro centralizado: sales agents, cargo agents, station counters
- Gestión comisión (basis points), asignación estaciones, datos contacto
- Vinculación agentes ke reservasi para trazabilidad ventas

**Fungsionalitas:**

- **Listado:** Tabel dengan kode, nama, tipe (TICKET_AGENT, CARGO_AGENT, STATION_COUNTER), estación, comisión, kontak, status
- **Filter:** Search dan status (activo/inactivo)
- **Form:** Kode (auto-uppercase), nama, tipe, estación (solo STATION_COUNTER), comisión, kontak, teléfono
- **Detalle:** Página con todos los campos
- **Activación/desactivación:** Toggle con confirmación
- **AgentSelect:** Autocomplete reutilizable con creación rápida inline

**Data yang Ditampilkan:**

- Código, nombre, tipo, estación, comisión, contacto, teléfono, estado

**Business Rules:**

- Kode auto-uppercase
- Estación solo relevante untuk STATION_COUNTER
- Comisión en basis points (centésimas de porcentaje)

**Pembaruan 2026 — Detail Agent dan Backend:**

- Detail Agent kini memiliki tab Overview, Commission & Rates, Contact Persons, Contracts, Activity, Documents, Notes, dan History dengan lazy fetch.
- Station, customer/partner, responsible personnel, dan primary contact dikembalikan sebagai relation summary; raw ID bukan label utama.
- Contact disimpan pada `agent_contacts`, dengan satu primary contact aktif dan lifecycle deactivate.
- Commission disimpan sebagai effective-dated `agent_commission_rules`: percentage basis points, fixed minor amount, atau hybrid; rule memiliki basis, priority, lifecycle, dan version.
- Lifecycle Agent memakai command activate, suspend, deactivate, dan archive dengan optimistic concurrency dan audit.
- Booking dapat mengambil commission snapshot berisi rule ID/version, basis amount/type, result amount, dan currency. Finance tetap source of truth untuk accrued/paid/outstanding settlement.
- Limitation: authoring contract/rate tetap dilakukan pada domain asal; halaman Agent hanya membaca linkage. Settlement write workflow tidak berada di Agent.

---

### 3.7 Clientes y Cuentas Corporativas — `/master-data/customers`

**Status:** Fungsional Penuh  
**Pengguna:** Gestión Comercial / Administración

**Business Value:**

- Registro centralizado de cuentas: individuales, corporativas, gubernamentales, agencias
- Gestión términos de pago, límites de crédito, direcciones facturación
- Vinculación clientes ke rate cards (kontrak korporat) dan vuelos charter

**Fungsionalitas:**

- **Listado:** Tabel dengan tipo cuenta, código, nama, kontak, teléfono, email, status
- **Filter:** Search dan status
- **Form:** Tipo cuenta (INDIVIDUAL, CORPORATE, GOVERNMENT, AGENCY), código (uppercase), nama, kontak, teléfono, email, dirección facturación, término de pago (link ke Payment Terms), límite de crédito
- **Detalle:** Página completa
- **Activación/desactivación:** Toggle con confirmación
- **CustomerSelect:** Autocomplete reutilizable

**Data yang Ditampilkan:**

- Tipo cuenta, código, nama, kontak, teléfono, email, dirección facturación, término de pago, límite de crédito, estado

**Business Rules:**

- Código auto-uppercase
- Email validación formato
- Término de pago desde Payment Terms module
- Límite de crédito optional, numérico entero

**Pembaruan 2026 — Customer Account dan Credit Boundary:**

- Detail Customer memiliki tab Overview, Contacts, Financial, Rates & Terms, Documents, Contracts, Activity, Notes, dan History.
- Legacy contact dapat dimigrasikan menjadi persistent `customer_contacts`; satu primary contact aktif digunakan sebagai relation.
- Payment Term ditampilkan sebagai relation summary dari Finance master, bukan raw ID.
- Credit limit adalah konfigurasi Customer. Current exposure, overdue, open invoice, dan last payment berasal dari invoice/payment read model.
- Available credit dihitung backend sebagai `max(credit limit - current exposure, 0)` dan tidak disimpan sebagai input.
- Place/release credit hold menggunakan command dengan reason, actor, timestamp, optimistic version, dan audit.
- Financial field dan financial notes dibatasi backend berdasarkan permission, bukan hanya disembunyikan frontend.
- Limitation: exposure demo saat ini berbasis posted/issued invoice dan payment yang tersedia; unbilled exposure dan multi-currency consolidation belum memiliki policy lengkap.

---

### 3.8 Tarifas y Rate Cards — `/master-data/rates`

**Status:** Fungsional Penuh  
**Pengguna:** Gestión Comercial / Administración

**Business Value:**

- Define tarifas canónicas para seluruh servicios: penumpang, kargo, charter
- Konfiguración precios diferenciados per rute, tipe servicio, alcance pricing (público, kontrakt korporat, kontrakt kargo, kontrakt charter), canal reserva, tipe passed, base precio kargo
- Soporte multi-currency, códigos impositivos, cargos mínimos, prioritas rate
- Tarifas digunakan langsung en cálculo totales al emitir tickets y AWB

**Fungsionalitas:**

- **Listado:** Tabel dengan código, tipo servicio, origen, destino, cliente, tipe aircraft, status
- **Filter:** Search dan status
- **Form Extensivo:**
  - Código (uppercase), tipo servicio (CHARTER, PASSENGER, CARGO), estación origen/destino
  - Cliente optional (kontrak korporat), tipe aircraft optional
  - Moneda (link ke Currencies), código impuesto optional
  - Tarifa base, unidad (PER_FLIGHT, PER_PASSENGER, PER_KG)
  - Alcance pricing (PUBLIC_COUNTER, CORPORATE_CONTRACT, CARGO_CONTRACT, CHARTER_CONTRACT)
  - Canal reserva (COUNTER, AGENT, CORPORATE, CARGO, CHARTER)
  - Tipo passed (ADULT, CHILD, INFANT) — solo PASSENGER
  - Base precio kargo (ACTUAL_WEIGHT, VOLUME_WEIGHT, CHARGEABLE_WEIGHT) — solo CARGO
  - Prioritas, cargo mínimo optional
  - Nota uso demo, vigencia desde/hasta
- **Detalle:** Página completa
- **Activación/desactivación:** Toggle con confirmación
- **RateCardSelect:** Autocomplete reutilizable

**Data yang Ditampilkan:**

- Código, tipo servicio, origen, destino, cliente, tipe aircraft, moneda, código impuesto, tarifa base, unidad, alcance, canal, tipo passed/kargo, prioritas, cargo mínimo, nota demo, vigencia, estado

**Business Rules:**

- Código auto-uppercase
- Vigencia desde obligatorio (YYYY-MM-DD)
- Vigencia hasta optional
- Prioritas determines cual rate card aplica cuando hay múltiples opciones
- Cargo mínimo optional, solo kargo
- Tipo passed solo PASSENGER
- Base precio kargo solo CARGO

**Pembaruan 2026 — Rate Safety dan Historical Protection:**

- Rate Detail memiliki tab Overview, Pricing & Charges, Contracts, Booking Channels, Route & Coverage, Documents, dan History.
- Relation Station, Customer, Agent, Contract, Currency, Tax, dan Aircraft ditampilkan sebagai human-readable summary.
- Backend memvalidasi scope-specific requirement, unit/basis combination, effective period, relation validity, priority, dan overlapping applicability.
- Pemilihan rate bersifat deterministic. Kandidat dengan specificity dan priority sama menghasilkan `RATE_SELECTION_AMBIGUOUS`, bukan dipilih berdasarkan urutan row database.
- Rate aktif yang sudah digunakan tidak diedit secara historis; update menghasilkan version baru. Duplicate selalu membuat DRAFT baru tanpa usage/audit history.
- Backend preview menghitung cargo per-kg dan minimum charge menggunakan integer minor-unit, lalu tax basis points. Preview tidak membuat booking atau journal.
- Transaction snapshot menyimpan source rate/version dan calculation values sehingga perubahan Rate Card tidak mengubah transaksi historis.
- Limitation: additional charge component yang kompleks belum menjadi subsystem lengkap; model saat ini berfokus pada base rate, minimum charge, dan linked tax.

---

### 3.9 Contracts & Subsidies — `/marketing/contracts-subsidies`

**Status:** Fungsional sebagai portfolio/read model persisten  
**Pengguna:** Commercial Manager, Finance Reviewer, Direksi

**Business Value:**

- Menyatukan customer contract, agent contract, dan rate-linked contract dalam satu portfolio tanpa memindahkan ownership domain
- Memantau program subsidi, recognized consumption, remaining budget, dan absorption untuk mencegah over-utilization
- Menyediakan early warning contract expiry dan renewal review
- Menjembatani Commercial dan Finance tanpa memberi akses edit invoice, payment, atau journal

**Fungsionalitas:**

- Delapan tab: Overview, Contracts, Subsidies, Absorption, Rates & Terms, Documents, Activity, History
- Overview: active/expiring contract, active subsidy, allocated/consumed/remaining budget, absorption, renewal review, dan `asOf`
- Contracts: union read model dari `customer_contracts`, `agent_contracts`, dan `rate_contract_links`
- Subsidies: sponsor, service/route scope, contract reference, minor-unit budget, effective period, lifecycle, renewal
- Absorption: source type/id, description, amount minor, recognized date, status
- Rates dari Rate Card, documents dari Uploads/Documents, activity dari business projection, history dari audit subsystem
- Lazy fetch per tab; tidak memuat seluruh portfolio saat initial render

**Domain Boundary:**

- Customer/Agent/Rate tetap source of truth contract relation masing-masing
- Subsidy program dan consumption berada pada Marketing
- Invoice, payment, journal, dan accounting exposure tetap milik Finance
- Documents tetap milik Uploads/Documents

**Limitation:**

- UI saat ini berorientasi monitoring; create/update/approve/amend contract dan subsidy program belum menjadi authoring workbench lengkap
- `unbilledExposureMinor` belum memiliki canonical projection
- Absorption belum menggantikan Finance recognition atau posting

---

## 4. FINANCE & ACCOUNTING — KEUANGAN & AKUNTANSI

### 4.1 Dashboard Finance — `/finance/dashboard`

**Status:** Fungsional dengan persistent reporting read model  
**Pengguna:** CFO, Finance Manager, Accounting Lead, Direksi

**Business Value:**

- Tinjauan satu layar atas posted ledger performance, receivable risk, cash position, dan operational profitability
- Kontrol ledger memperlihatkan Trial Balance, accounting exceptions, status periode, dan jumlah posted journal
- Margin lini bisnis berasal dari immutable invoice snapshot, bukan angka KPI editable
- Route revenue dan action queue menghubungkan Finance dengan Flight Operations serta Contracts/Subsidies

**Fungsionalitas:**

- Accounting period selector dari backend dan sinkron dengan query parameter
- Lima KPI: Recognized Revenue, Operating Expense, Net Result, Cash Position, Overdue Receivables
- Ledger Control: balance, exceptions, period status, posted journals
- Gross Margin by Business Line: Charter, Passenger, Cargo
- Route Revenue dari IDR flight invoice snapshots
- Requires Attention dengan destination route yang valid
- Loading skeleton, retry/error, empty state, dan responsive mobile

**Source of Truth:**

- Revenue, expense, cash: posted `journal_entries` dan `journal_lines`
- Overdue receivable: invoice/payment read model
- HPP/margin: immutable `invoice_finance_snapshots`
- Route: Flight Operations relation
- Contract/subsidy alert: Marketing read model

**Rules dan Limitation:**

- Reporting service bersifat read-only dan tidak menyimpan saldo/dashboard KPI kedua
- Hanya IDR yang diagregasi; currency berbeda tidak dijumlahkan tanpa FX policy
- AR masih berasal dari model invoice/payment yang tersedia; AP aging dan bank reconciliation belum tersedia

---

### 4.2 Accounting Workbench — `/finance/accounting`

**Status:** Fungsional kuat untuk demo/UAT; memerlukan hardening produksi  
**Pengguna:** Accounting Staff, Accounting Supervisor, Finance Reviewer

**Business Value:**

- Mengganti jurnal manual dengan mesin jurnal berbasis policy: setiap peristiwa operasi otomatis dipetakan ke akun Debet/Kredit
- Compliance: 4 tahap (Draft → Submit → Approve → Post), hanya role berwenang dapat posting
- Audit trail lengkap: snapshot policy, evidence, kondisi cocok, log audit — krusial untuk audit eksternal
- Deteksi exception dini: event tanpa policy, periode tertutup, akun tidak valid, jurnal tidak balance

**Fungsionalitas (6 Tab):**

#### 4.2.1 Posting Queue

- Daftar jurnal proposal menunggu review/approval/posting
- Per baris: sumber event, tanggal akuntansi, treatment (capitalize, expense, revenue recognition, deferred, inventory), policy, status validasi, status
- Aksi: Submit → Review → Post
- Tombol "Process inventory events" (batch 25)
- Klik sumber event atau icon mata → Journal Detail Dialog

#### 4.2.2 General Journal

- Daftar jurnal posted atau reversed
- Filter: status (ALL/POSTED/REVERSED), tipe (SYSTEM/REVERSAL), tanggal, pencarian
- Per baris: nomor jurnal, tanggal posting, tipe, sumber, policy + versi, status, total nilai
- Aksi: Reverse (dengan alasan minimal 3 karakter)

#### 4.2.3 General Ledger

- Buku besar dengan baris jurnal posted, dikelompokkan per jurnal (double-entry)
- Filter utama: periode, akun, pencarian
- Filter lanjutan: tanggal, aircraft, station, flight, work order, source type
- Ringkasan: opening balance, total debit, total kredit, net movement
- Warning jika debit ≠ kredit
- Export CSV
- Pagination 10/20/50, responsif mobile

#### 4.2.4 Exceptions

- Event gagal diproses policy engine
- 7 kategori: NO_MATCHING_POLICY, AMBIGUOUS_POLICY, MISSING_CONTEXT, INVALID_ACCOUNT, CLOSED_PERIOD, UNBALANCED_JOURNAL, MANUAL_REVIEW_REQUIRED
- Filter status: ALL/OPEN/RESOLVED
- Klik icon review → dialog konteks exception

#### 4.2.5 Policies (Read-only)

- Seluruh accounting policy yang pernah berlaku
- Panel read-only (chip gembok)
- Klik nama → drawer detail: treatment, priority, approval status, pemetaan Debet → Kredit, dimensi wajib, periode berlaku

#### 4.2.6 Asset Components

- Komponen pesawat terkapitalisasi
- Kolom: asset number, nama, serial, aircraft, tanggal akuisisi, biaya perolehan, umur manfaat (bulan), status
- Preview jadwal depresiasi (period code, status, jumlah)
- Tombol: lihat jurnal sumber kapitalisasi, lihat depreciation preview

**Journal Detail Dialog (3 Tab):**

1. **Overview:** Konteks jurnal, alasan policy dipilih, dampak akuntansi (debet/kredit), ringkasan lifecycle
2. **Policy & Evidence:** Identitas policy, kondisi cocok, bukti pendukung, cost basis
3. **Audit Trail:** Timeline lengkap peristiwa jurnal

- Aksi: buka sumber asal, lihat di General Ledger, buka jurnal asli/pembalik, reverse, salin nomor

**Data yang Ditampilkan:**

- Jurnal proposal (draft → posted), jurnal terpokok, reversal
- General ledger lines dengan 7+ dimensi akuntansi
- Accounting exceptions dengan 7 kategori
- Accounting policies dengan pemetaan akun dan snapshot
- Asset components dengan depreciation preview
- Audit trail per jurnal: actor, timestamp, status, related resource

**Dimensi Akuntansi:**

- Station, aircraft, flight, ticket, work order, component, cost center

---

### 4.3 Breakdown HPP per Lini Bisnis — `/finance/hpp`

**Status:** Fungsional dengan immutable invoice snapshot  
**Pengguna:** Finance Analyst, CFO, Marketing Manager

**Business Value:**

- Perbandingan revenue, operational cost, gross profit, dan gross margin untuk Charter, Passenger, dan Cargo
- Cost trace dari fuel, station services, dan maintenance yang dibekukan saat invoice finalization
- Menjaga reproducibility tanpa mengubah invoice atau posted journal
- Mendukung pricing dan route review dengan metode allocation yang dinyatakan eksplisit

**Fungsionalitas:**

- Period selector dan refresh
- Revenue vs allocated HPP chart
- Business Line Breakdown dengan revenue, HPP, gross profit, dan margin
- Cost Composition untuk fuel, station, dan maintenance
- Penjelasan allocation method dan `asOf`

**Business Rules dan Limitation:**

- Shared flight costs dialokasikan berdasarkan revenue share per flight
- Integer totals dipertahankan saat pembagian agar total snapshot tidak berubah
- Direct cost attribution dan policy-driven allocation run belum tersedia
- Reporting hanya untuk IDR

---

### 4.4 Neraca Saldo (Trial Balance) — `/finance/trial-balance`

**Status:** Fungsional dari posted ledger  
**Pengguna:** Accounting Staff, Accounting Supervisor, Auditor Internal

**Business Value:**

- Validasi integritas pembukuan: memastikan total Debit dan Kredit balance sebelum close
- Deteksi saldo abnormal (saldo bertentangan posisi normal akun) — indikator kesalahan posting atau fraud
- Deteksi kas negatif — warning dini rekonsiliasi bank
- Support close bulanan dan audit trail akuntan publik

**Fungsionalitas:**

- Header periode + Export CSV button
- 3 KPI ringkasan: total Debit, total Kredit, status neraca (balance/tidak balance)
- 2 status badge: saldo abnormal, kas negatif
- Filter: pencarian kode/nama akun, kategori akun (Aset/Kewajiban/Ekuitas/Pendapatan/Beban)
- Tabel dikelompokkan per kategori dengan subtotal per grup, collapse/expand
- Per baris: indikator validasi (!), kode akun, nama akun + subkategori, kategori, Debit, Kredit, saldo normal (D/K), saldo aktual
- Footer total dengan badge "BALANCE" atau "TIDAK BALANCE"
- Legenda: D = saldo normal Debit, K = Kredit, ! merah = abnormal, ! kuning = kas negatif

**Data yang Ditampilkan:**

- Seluruh akun Chart of Accounts: kode, nama, kategori, subkategori, debit, kredit, saldo normal, saldo aktual
- Indikator abnormal dan kas negatif per akun
- Status balance global berdasarkan total minor-unit Debit dan Kredit

**Business Rules:**

- Hanya journal berstatus `POSTED` sampai akhir accounting period yang dihitung
- Akun berasal dari active Chart of Accounts
- Saldo mengikuti normal balance Debit/Credit; abnormal balance dan negative cash ditandai
- Read model tidak menyimpan saldo editable kedua
- CSV export berasal dari hasil backend yang sama dengan tabel

---

### 4.5 Invoices (Daftar & Detail) — `/invoices` dan `/invoices/[id]`

**Status:** Fungsional dengan Nuxt Server API lokal dan approval workflow  
**Pengguna:** Finance Staff, Finance Reviewer

**Business Value:**

- Jembatan antara operasi penerbangan dan pendapatan: setiap invoice melekat pada satu flight operation
- Segregation of duties: pembuat tidak dapat approve invoice sendiri
- Visibility piutang (balance due) dan overdue untuk collection
- Snapshot finansial per invoice (revenue breakdown, operational cost, gross margin) untuk analisis profitabilitas

**Fungsionalitas:**

#### 4.5.1 Index `/invoices`

- 4 KPI ringkasan: jumlah invoice, total revenue, total margin + rasio %, total balance due + badge overdue
- Filter: pencarian (invoice/flight/customer), status (draft/issued/partially_paid/paid/overdue/void), customer, jatuh tempo (all/upcoming/overdue)
- Badge jumlah filter aktif + chip closable
- Tabel desktop: Invoice, Customer/Flight (nomor flight & origin→destination), Revenue, Cost, Margin, Tax/Total, Due (styling warna), Status, aksi
- Tampilan mobile: kartu
- Klik → detail

#### 4.5.2 Detail `/invoices/[id]`

- Header: nomor invoice, badge status, customer + flight + rute
- 4 KPI: Revenue, Operational Cost, Gross Margin, Balance Due
- Revenue Lines (tabel): sumber (PASSENGER_TICKET/CARGO_BOOKING/CHARTER), deskripsi, qty, base, kode pajak, tarif pajak, jumlah pajak, total
- Operational Cost (card): Fuel, Station, Maintenance, total
- Billing (card): Subtotal, Tax, Paid, Issued date, Due date
- Finance Handoff Timeline: event handoff dengan status, ringkasan, jumlah, mata uang
- Payments: tabel pembayaran dengan referensi, tanggal, jumlah, mata uang
- Tombol Approve Invoice: hanya jika status = draft DAN user punya `finance.invoice.approve` DAN user bukan pembuat

**Data yang Ditampilkan:**

- Invoice summary: nomor, status, subtotal, pajak, total, mata uang, pembuat, approver, tanggal terbit, jatuh tempo, paid amount, balance due
- Customer (nama, email) dan Flight (nomor, origin→destination, status)
- Snapshot finance: ticket/cargo/charter revenue, fuel/station/maintenance cost, gross margin
- Line items: source type, qty, unit price, subtotal, tax code, tax rate (basis points), tax amount, total
- Handoff events, payments, audit info

**Business Rules:**

- Self-approval guard: pembuat tidak dapat approve invoice sendiri
- Due date mengikuti payment term customer (fallback 14 hari)
- Approval hanya untuk status draft

---

### 4.6 Master Data Keuangan (8 Entitas CRUD)

**Status:** Fungsional Penuh  
**Pengguna:** Finance/Admin Master Data

#### 4.6.1 Vendors — `/master-data/vendors`

**Business Value:** Vendor non-bahan bakar (handling, parking, akomodasi, transport, catering, maintenance, general) dengan station cakupan dan payment term untuk jatuh tempo akurat.  
**Fungsionalitas:** CRUD lengkap, form: vendor code (auto-uppercase), nama, tipe, coverage station, kontak, telepon, email, payment term. Toggle aktif/nonaktif.  
**Data:** Vendor code, nama, tipe, station, kontak, telepon, email, payment term, status.

#### 4.6.2 Fuel Suppliers — `/master-data/fuel-suppliers`

**Business Value:** Referensi supplier Avtur/Avgas per station dengan harga referensi per liter dan mata uang — dasar perhitungan biaya bahan bakar.  
**Fungsionalitas:** CRUD lengkap, form wajib: kode, nama, station, fuel type (AVTUR/AVGAS), harga referensi/liter, mata uang. Kontak/telepon opsional.  
**Data:** Kode supplier, nama, station, fuel type, harga referensi per liter, mata uang, kontak, telepon, status.

#### 4.6.3 Handling & Parking Suppliers — `/master-data/handling-parking-suppliers`

**Business Value:** Supplier jasa handling dan parking per station — biaya signifikan dari biaya langsung penerbangan.  
**Fungsionalitas:** CRUD lengkap, form: kode, nama, station, service type (HANDLING/PARKING/BOTH), tarif referensi, mata uang, kontak, telepon.  
**Data:** Kode, nama, station, service type, tarif referensi, mata uang, kontak, telepon, status.

#### 4.6.4 Tax Codes — `/master-data/tax-codes`

**Business Value:** Tarif pajak (NON_TAX, VAT, WITHHOLDING) dengan periode efektif untuk perhitungan pajak konsisten dan audit-proof.  
**Fungsionalitas:** CRUD lengkap, form: kode pajak, nama, tarif (basis points), tipe, effective from (wajib), effective to (opsional).  
**Data:** Kode, nama, tarif (basis points), tipe, periode efektif, status.

#### 4.6.5 Chart of Accounts — `/master-data/chart-of-accounts`

**Business Value:** Fondasi Chart of Accounts (CoA) untuk Accounting Workbench. Struktur hirarkis dengan parent account untuk pelaporan bertingkat.  
**Fungsionalitas:** CRUD lengkap, form: kode akun, nama, tipe akun (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE), normal balance (DEBIT/CREDIT), parent account (select), flag postable.  
**Data:** Kode, nama, tipe, normal balance, parent, postable, status.

#### 4.6.6 Cost Categories — `/master-data/cost-categories`

**Business Value:** Pengelompokan biaya operasi (station, fuel, maintenance, emergency) ke cost group + akun beban default.  
**Fungsionalitas:** CRUD lengkap, form: kode kategori, nama, cost group, default expense COA (select).  
**Data:** Kode, nama, cost group, default COA, status.

#### 4.6.7 Currencies — `/master-data/currencies`

**Business Value:** Transaksi multi-mata uang (IDR, USD, PGK) dengan simbol dan jumlah desimal terkontrol.  
**Fungsionalitas:** CRUD lengkap, form: kode (3-huruf auto-uppercase), nama, simbol, jumlah tempat desimal.  
**Data:** Kode, nama, simbol, decimal places, status.

#### 4.6.8 Payment Terms — `/master-data/payment-terms`

**Business Value:** Aturan jatuh tempo (due days) untuk customer dan vendor — digunakan otomatis oleh invoice dan purchase order.  
**Fungsionalitas:** CRUD lengkap, form: kode istilah, nama, jumlah hari jatuh tempo, deskripsi.  
**Data:** Kode, nama, due days, deskripsi, status.

---

## 5. INVENTORY & PROCUREMENT — INVENTORI & PENGADAAN

### 5.1 Inventory Control Center (Dashboard) — `/inventory`

**Status:** Fungsional Penuh  
**Pengguna:** Manajer Operasional, Kepala Gudang, Staf Inventory, Direktur

**Business Value:**

- Visibilitas real-time kesehatan inventory di seluruh stasiun penerbangan STOL Papua
- Identifikasi segera part low stock untuk mencegah grounded aircraft
- Monitoring sertifikat dan expiry date untuk kepatuhan CASR
- Valuasi finansial inventory untuk keputusan pengadaan dan perencanaan anggaran

**Fungsionalitas:**

- Dashboard statistik metrik kunci:
  - Jumlah part tersedia dan siap pakai
  - Jumlah part low stock (di bawah reorder point)
  - Jumlah lot mendekati kedaluwarsa
  - Peringatan sertifikat perlu diperbarui
  - Jumlah part karantina
  - Jumlah PR dan PO terbuka
  - Total valuasi inventory (FIFO, dalam Rupiah)
- Gerakan inventory terbaru: nomor transaksi, tipe, stasiun asal, alasan, status, waktu

**Data yang Ditampilkan:**

- Statistik agregat (8 indikator utama)
- Gerakan inventory terbaru (audit trail)

**Business Rules:**

- Valuasi FIFO hanya untuk pengguna dengan izin `inventory.valuation.read`
- Data difilter berdasarkan stasiun yang diizinkan

---

### 5.2 Stock Availability — `/inventory/stock`

**Status:** Fungsional Penuh  
**Pengguna:** Staf Gudang, Manajer Operasional, Kepala Gudang

**Business Value:**

- Pencarian cepat ketersediaan part di seluruh lokasi (stasiun, gudang, bin)
- Support keputusan alokasi part ke aircraft
- Transfer stok antar bin untuk optimasi distribusi
- Valuasi stok per item untuk akurasi aset

**Fungsionalitas:**

- Daftar lengkap stok tersedia
- Pencarian: part number, nama, nomor lot, kode bin, stasiun
- Filter: gudang tertentu, low stock only
- Per baris: part number & nama, lokasi (stasiun/gudang/bin + tipe: usable/quarantine/repair/transit), nomor lot & expiry, kondisi, jumlah (on hand & available), valuasi FIFO
- **Aksi:**
  - **Transfer Stok:** Pindah part antar bin dengan alasan
  - **Adjustment Stok:** Sesuaikan kuantitas (tambah/kurang) untuk part tracking kuantitas, dengan alasan dan biaya per unit

**Data yang Ditampilkan:**

- Daftar saldo stok per part per bin
- Informasi lot dan expiry
- Valuasi FIFO per item

**Business Rules:**

- Transfer memerlukan alasan valid dan bin tujuan berbeda
- Adjustment hanya untuk part tracking type "QUANTITY" (bukan lot/serial)
- Transfer part serial memerlukan pemilihan nomor serial spesifik
- Valuasi hanya untuk pengguna berizin khusus
- Indikator low stock saat available < reorder point

---

### 5.3 Spare Part Catalog — `/inventory/parts`

**Status:** Fungsional Penuh  
**Pengguna:** Manajer Inventory, Kepala Gudang

**Business Value:**

- Master data part terpusat dan terstandarisasi
- Klasifikasi part berdasarkan lifecycle type (consumable/expendable/repairable/rotable)
- Mengelola criticality level untuk prioritas pengadaan
- Mencatat aplikasi part ke tipe aircraft untuk kompatibilitas

**Fungsionalitas:**

- Katalog lengkap spare part
- Kolom: part number & nama, manufaktur & part number manufaktur, lifecycle type, tracking type, criticality, shelf life, indikator sertifikat
- **Aksi:**
  - **Tambah Part Baru:** Form lengkap
  - **Edit Part:** Update informasi
  - **Lihat Sertifikat:** Dokumen sertifikat (integrasi Document Management)
- **Form Input Part:**
  - Informasi dasar: part number, nama, deskripsi, manufaktur
  - Unit of measure (EA/SET/KIT/L/KG/M)
  - Lifecycle type (CONSUMABLE, EXPENDABLE, REPAIRABLE, ROTABLE)
  - Tracking type (QUANTITY, LOT, SERIAL)
  - Criticality (STANDARD, ESSENTIAL, CRITICAL)
  - Shelf life dan requirement sertifikat
  - Aircraft Applicability: daftar tipe aircraft kompatibel

**Data yang Ditampilkan:**

- Master data part dengan atribut lengkap
- Hubungan part dengan aircraft (applicability)

**Business Rules:**

- Part number dan warehouse code auto-uppercase
- Part tracking "QUANTITY" tidak boleh memiliki shelf life atau requirement sertifikat (hanya lot/serial)
- Part number harus unik (minimal 2 karakter)
- Certificate requirement hanya aktif untuk tracking LOT atau SERIAL
- Aircraft applicability dapat memiliki beberapa tipe dengan model dan catatan opsional

---

### 5.4 Warehouses & Bins — `/inventory/warehouses`

**Status:** Fungsional Penuh  
**Pengguna:** Manajer Inventory, Kepala Gudang

**Business Value:**

- Struktur fisik penyimpanan part per stasiun
- Pemisahan area berdasarkan kondisi (usable/quarantine/repair/transit)
- Konfigurasi reorder rule untuk otomatisasi pengadaan
- Pelacakan lokasi untuk operasional maintenance

**Fungsionalitas:**

- Daftar gudang dalam kartu
- Per gudang: kode & nama, stasiun, daftar bin (kode, nama, tipe: USABLE/QUARANTINE/REPAIR/TRANSIT)
- **Aksi:**
  - **Tambah Gudang Baru:** Form dengan pemilihan stasiun, kode & nama gudang, daftar bin
  - **Konfigurasi Reorder Rule:** Atur aturan reorder (minimum, reorder point, maximum, lead time) per part di gudang

**Data yang Ditampilkan:**

- Struktur gudang per stasiun
- Bin per gudang dengan tipe

**Business Rules:**

- Setiap gudang minimal satu bin
- Kode gudang dan bin auto-uppercase
- Reorder rule: minimum < reorder point < maximum quantity
- Reorder rule dikaitkan dengan part, gudang, lead time (hari)

---

### 5.5 Purchase Requests — `/inventory/purchase-requests`

**Status:** Fungsional Penuh  
**Pengguna:** Staf Operasional, Manajer Operasional, Kepala Gudang

**Business Value:**

- Permintaan pengadaan part dari stasiun ke pusat
- Dokumentasi kebutuhan dan justifikasi
- Workflow approval dengan status tracking
- Support partial ordering

**Fungsionalitas:**

- Daftar purchase request
- Kolom: nomor request, stasiun peminta, alasan, daftar part (part number, kuantitas, tanggal dibutuhkan), status (DRAFT/SUBMITTED/PARTIALLY_ORDERED/ORDERED/CANCELLED), tanggal pembuatan
- **Aksi:**
  - **Buat Request Baru:** Form: stasiun, alasan, daftar baris part
  - **Submit Request:** DRAFT → SUBMITTED

**Data yang Ditampilkan:**

- Daftar purchase request dengan detail part

**Business Rules:**

- Request minimal satu baris part
- Request harus di-submit sebelum konversi ke PO
- Status berubah PARTIALLY_ORDERED saat sebagian baris sudah diorder
- Status berubah ORDERED saat semua baris sudah diorder
- Hanya SUBMITTED atau PARTIALLY_ORDERED yang bisa dibuatkan PO

---

### 5.6 Purchase Orders — `/inventory/purchase-orders`

**Status:** Fungsional Penuh  
**Pengguna:** Manajer Inventory, Direktur (approval)

**Business Value:**

- Konversi PR menjadi order resmi ke vendor
- Workflow approval dengan pemisahan tanggung jawab
- Multi-currency dengan konversi IDR untuk pelaporan
- Tracking penerimaan per baris untuk akurasi inventory

**Fungsionalitas:**

- Daftar purchase order
- Kolom: nomor order, kode mata uang, nama vendor, daftar baris (part number, kuantitas, harga per unit), tanggal diharapkan, status (DRAFT/PENDING_APPROVAL/APPROVED/REJECTED/PARTIALLY_RECEIVED/RECEIVED/CANCELLED)
- **Aksi:**
  - **Buat Purchase Order:** Form: PR (submitted/partially ordered), vendor, mata uang, kurs IDR, tanggal diharapkan, kuantitas per baris
  - **Submit Order:** DRAFT → PENDING_APPROVAL
  - **Approve Order:** (permission: `inventory.po.approve`)
  - **Reject Order:** Dengan alasan minimal 3 karakter (permission: `inventory.po.approve`)

**Data yang Ditampilkan:**

- Daftar purchase order dengan detail vendor dan part

**Business Rules:**

- PO hanya dari PR status SUBMITTED atau PARTIALLY_ORDERED
- Kuantitas order per baris tidak melebihi outstanding quantity
- Submit mengunci order
- Approve/reject memerlukan izin khusus
- Reject memerlukan alasan minimal 3 karakter
- Status berubah PARTIALLY_RECEIVED saat sebagian barang diterima
- Status berubah RECEIVED saat semua barang diterima
- Valuasi harga hanya untuk pengguna berizin

---

### 5.7 Goods Receipts — `/inventory/receipts`

**Status:** Fungsional Penuh  
**Pengguna:** Staf Gudang, Manajer Inventory

**Business Value:**

- Pencatatan penerimaan barang dari vendor dengan detail lot/serial
- Kepatuhan verifikasi sertifikat untuk part kritis
- Integrasi dengan movement accounting (FIFO cost layer)
- Support reversal untuk koreksi

**Fungsionalitas:**

- Daftar goods receipt yang sudah posted
- Kolom: nomor receipt, nomor PO, referensi dokumen, tanggal/waktu, total nilai Rupiah, status (POSTED/REVERSED)
- **Aksi:**
  - **Post Receipt Baru:** Form: PO (approved/partially received), gudang tujuan, tanggal/waktu, referensi dokumen (wajib), per baris: kuantitas, bin tujuan, nomor lot, tanggal manufaktur & expiry, nomor serial, referensi sertifikat, indikator verifikasi
  - **Reverse Receipt:** Batalkan receipt (syarat: cost layer belum dikonsumsi)

**Data yang Ditampilkan:**

- Daftar goods receipt yang sudah posted
- Detail penerimaan per part

**Business Rules:**

- GR hanya untuk PO status APPROVED atau PARTIALLY_RECEIVED
- Kuantitas diterima tidak melebihi outstanding quantity
- Part tracking LOT/SERIAL memerlukan nomor lot
- Part tracking SERIAL memerlukan nomor serial
- Part certificate required memerlukan referensi sertifikat
- Reversal hanya jika semua cost layer belum dikonsumsi
- Valuasi hanya untuk pengguna berizin

---

### 5.8 Movements & Cycle Counts — `/inventory/movements`

**Status:** Fungsional Penuh  
**Pengguna:** Staf Gudang, Auditor Inventory, Manajer Operasional

**Business Value:**

- Audit trail lengkap semua transaksi inventory
- Support cycle counting untuk akurasi stok fisik vs sistem
- Reversal untuk koreksi kesalahan
- Compliance audit dengan tracking lengkap

**Fungsionalitas:**

#### 5.8.1 Tab Movements

- Daftar semua gerakan inventory
- Kolom: nomor gerakan, tipe (RECEIPT/ISSUE/TRANSFER/ADJUSTMENT_GAIN/ADJUSTMENT_LOSS/COUNT_VARIANCE/INSTALL/REMOVE/REPAIR_SEND/REPAIR_RETURN/SCRAP/REVERSAL), stasiun asal, alasan, nilai Rupiah, status (POSTED/REVERSED), tanggal/waktu
- **Aksi:**
  - **Reverse Movement:** Hanya untuk tipe RECEIPT/ISSUE/ADJUSTMENT_GAIN/ADJUSTMENT_LOSS dan status POSTED
  - **Export CSV:** Dengan izin `inventory.read`

#### 5.8.2 Tab Cycle Counts

- Daftar cycle count yang sudah dilakukan
- Kolom: nomor count, gudang, alasan, status (DRAFT/COUNTED/POSTED/CANCELLED), tanggal/waktu
- **Aksi:**
  - **Start Cycle Count:** Form: gudang, bin (opsional), alasan
  - **Record Count:** Per item: part number, bin & lot, book quantity, counted quantity
  - **Post Count:** Menghasilkan movement COUNT_VARIANCE untuk selisih

**Data yang Ditampilkan:**

- Audit trail gerakan inventory
- Daftar cycle count dengan variance

**Business Rules:**

- Reversal hanya untuk tipe tertentu (RECEIPT/ISSUE/ADJUSTMENT_GAIN/ADJUSTMENT_LOSS)
- Reversal membuat movement baru bertipe REVERSAL linked ke asli
- Reversal memerlukan izin `inventory.adjust`
- Cycle count: draft → record → post
- Post count menghasilkan COUNT_VARIANCE untuk selisih
- Movement yang sudah di-reverse tidak bisa di-reverse lagi
- Valuasi hanya untuk pengguna berizin

---

### 5.9 Repairable & Rotable Lifecycle — `/inventory/repairables`

**Status:** Fungsional Penuh  
**Pengguna:** Teknisi Maintenance, Manajer Inventory, Kepala Bengkel

**Business Value:**

- Mengelola lifecycle komponen repairable dan rotable dengan tracking serial
- Install/remove component ke/dari aircraft untuk maintenance
- Proses repair dengan vendor eksternal
- Capitalization untuk komponen bernilai tinggi

**Fungsionalitas:**

#### 5.9.1 Tab Serialized Components

- Daftar komponen serial
- Kolom: serial number & part number/nama, kondisi (SERVICEABLE/QUARANTINE/UNSERVICEABLE/IN_REPAIR/INSTALLED/SCRAPPED), lokasi (aircraft + position atau bin code), TSN/CSN, referensi sertifikat & status verifikasi, status repair order
- **Aksi:**
  - **Install Component:** Form: aircraft, posisi, tanggal/waktu, TSN/CSN saat install, capitalization candidate (jika true: work order ID, kategori, technical acceptance, threshold, benefit months, ready date)
  - **Remove Component:** Form: bin tujuan (quarantine), tanggal/waktu, TSN/CSN saat remove, alasan
  - **Create Repair Order:** Form: vendor repair, tanggal diharapkan, alasan
  - **Scrap Component:** Form: alasan scrap (wajib, tidak bisa di-reverse)
  - **Lihat Sertifikat:** Dokumen sertifikat

#### 5.9.2 Tab Repair Orders

- Daftar repair order
- Kolom: nomor RO, serial number & part number, nama vendor, tanggal diharapkan, biaya repair Rupiah, status (DRAFT/SENT/RECEIVED)
- **Aksi:**
  - **Send to Vendor:** DRAFT → SENT
  - **Return Serviceable:** SENT → RECEIVED, form: bin tujuan (usable), tanggal/waktu, referensi sertifikat (wajib), biaya repair, mata uang & kurs IDR

**Data yang Ditampilkan:**

- Komponen serial dengan kondisi dan lokasi
- Repair order dengan vendor dan biaya

**Business Rules:**

- Install hanya untuk kondisi SERVICEABLE
- Remove hanya untuk kondisi INSTALLED
- Remove harus masuk quarantine bin
- Remove bisa langsung dibuatkan RO jika perlu diperbaiki
- Create RO hanya untuk QUARANTINE/UNSERVICEABLE dan belum ada RO aktif
- Scrap tidak bisa di-reverse (permanen)
- Send to vendor mengeluarkan dari stok gudang
- Return serviceable memerlukan sertifikat terverifikasi
- Capitalization candidate memerlukan threshold dan useful life

---

## 6. CORPORATE ASSETS — ASET KORPORAT

### 6.1 Overview — `/asset-management/overview`

**Status:** Fungsional Penuh  
**Pengguna:** Station Admin, Maintenance Manager, Inventory Controller, Finance Reviewer

**Business Value:**

- High-level summary seluruh corporate assets (non-aircraft)
- Monitoring insurance status untuk compliance
- Financial projection dari Accounting module (jika permission tersedia)
- Quick insight operational status dan audit discrepancies

**Fungsionalitas:**

- **4 KPI Cards:** Total assets, serviceable, under maintenance, audit discrepancies
- **Insurance Watch:** Expired policies count, expiring soon (30 hari)
- **Financial View Card:** Capitalized assets count, acquisition value (IDR), current book value (IDR) — hanya jika permission `asset.finance.read`

**Data yang Ditampilkan:**

- Operational: Total assets, serviceable, under maintenance, audit discrepancies
- Insurance: Expired count, expiring soon count
- Financial: Capitalized assets, acquisition value, current book value (permission-gated)

**Catatan:**

- Financial values dari Accounting module, read-only
- Format currency IDR dengan division by 100 (server stores in cents)

---

### 6.2 Asset Register — `/asset-management/register`

**Status:** Fungsional Penuh  
**Pengguna:** Station Admin, Maintenance Manager

**Business Value:**

- Register persisten seluruh corporate assets
- Tracking lokasi, custodian, kondisi status
- Server-generated asset codes untuk unique identification
- Filter by station, category, kondisi

**Fungsionalitas:**

- Data table: asset (code + name), category, station/location, custodian, condition, version
- Search: code/name/serial
- Filter: category, condition
- **Create New Asset:** Form: nama, category (GSE/VEHICLE/IT_EQUIPMENT/FACILITY/OTHER), brand, model, serial number, station, department, location type (STATION/WAREHOUSE/FIELD/OTHER), location detail, custodian employee, custodian name snapshot, acquisition date, acquisition reference
- Table rows clickable ke detail

**Data yang Ditampilkan:**

- Asset identity: Code (server-generated), name, category
- Location: Station, location type, location detail
- Custodian: Employee, name snapshot
- Condition: Status (SERVICEABLE/UNDER_MAINTENANCE/LIMITED/UNSERVICEABLE/LOST/DISPOSED)
- Financial: Acquisition date, reference
- Version: Optimistic locking version

**Business Rules:**

- Asset code di-generate server (bukan user input)
- Category: GSE, VEHICLE, IT_EQUIPMENT, FACILITY, OTHER
- Location type: STATION, WAREHOUSE, FIELD, OTHER
- Condition status mempengaruhi availability
- Optimistic locking via version field
- Permission `asset.manage` untuk create

---

### 6.3 Maintenance Queue — `/asset-management/maintenance`

**Status:** Fungsional Penuh  
**Pengguna:** Maintenance Manager

**Business Value:**

- Queue monitoring untuk work orders
- Tracking priority dan status
- Link ke detail untuk context

**Fungsionalitas:**

- Data table: work order (number), asset (code + name), station, priority, status, summary
- Table rows clickable ke detail

**Data yang Ditampilkan:**

- Work order: Number, status, priority
- Asset: Code, name
- Station: Station code
- Summary: Work order summary

**Business Rules:**

- Work order dibuat dari detail page
- Stock consumption melalui Inventory part issue (bukan langsung dari WO)
- Priority dan status dengan color-coded badges

---

## 7. DASHBOARD OPERASIONAL — `/dashboard`

**Status:** Fungsional Penuh  
**Pengguna:** OCC, Director, Station Admin, Maintenance Manager, Finance Reviewer, Inventory Controller

### 7.1 Operations Overview Tab

**Business Value:**

- Pandangan real-time seluruh operasi dalam satu layar
- Deteksi dini flight blocked atau butuh intervensi
- Monitoring kesiapan armada dan stasiun simultan
- Filter dinamis berdasarkan tanggal, stasiun, jenis operasi

**Fungsionalitas:**

- **6 KPI Utama:** Jumlah Flight Request, ready to approve, flight blocked/kritis, flight aktif, pesawat tersedia vs total, flight delay
- **Action Required Panel:** 3 alert prioritas tertinggi dengan severity (Critical/Warning) dan owner
- **Flight Readiness Chart (Donut):** Ready, Needs Review, Blocked, Completed
- **Fleet Availability Grid:** Kelompokkan pesawat berdasarkan tipe, status serviceability
- **Flight Status Board (Kanban):** 5 lane: Planned, Blocked, Active, Landed, Closed — kartu clickable
- **Current Blockers Breakdown:** Kategori penyebab blocker (Fuel, Crew, Station, Aircraft, Manifest)
- **Station Readiness Matrix:** Kapabilitas setiap stasiun: status operasional, fuel/handling/parking

**Data yang Ditampilkan:**

- KPI: Flight Request count, Ready for Approval, Blocked/Critical, Active Flights, Aircraft Available, Delayed Flights
- Action Queue: Alert title, severity, issue description, owner
- Readiness Chart: Ready/Needs Review/Blocked/Completed counts
- Fleet Grid: Aircraft family, status breakdown
- Fleet Table: Registration, current station, serviceability, next maintenance
- Flight Board: Flight number, route, aircraft, scheduled/actual, delay, readiness %
- Blocker Chart: Categories dengan count
- Station Matrix: Station code, name, status, fuel/handling/parking, notes

**Business Rules:**

- Filter tanggal membatasi scope
- Filter stasiun memfilter flight dan aircraft
- Delay: actual > 15 menit dari scheduled
- Readiness % dari canonical checks
- Alert Critical → OCC Duty Manager, Warning → Flight Operations

### 7.2 Management Overview Tab

**Business Value:**

- Executive summary untuk Director dan Finance
- Trend analisis performa operasional dan komersial
- Identifikasi pola delay dan utilisasi armada
- Snapshot finansial: revenue, operational cost, gross margin, invoiced, paid

**Fungsionalitas:**

- **7 Metrik Finansial & Ticketing:**
  - Financial KPIs: Revenue, Operational Cost, Gross Margin, Invoiced, Paid
  - Ticketing KPIs: Passenger Tickets, Cargo Bookings
- **Flight Completion Trend (Line Chart):** Scheduled vs completed vs cancelled (7 hari terakhir)
- **On-Time Performance (Donut):** On-time/delayed/cancelled
- **Request Source Mix (Pie):** Distribusi sumber request
- **Delay Reason Breakdown (Horizontal Bar):** Weather, Handling, Fuel, Crew, Maintenance, Operational
- **Aircraft Utilization (Bar):** Flight hours per registration
- **Fuel Requested vs Confirmed (Grouped Bar):** Per station
- **Route Activity Table:** Flight count dan cargo flight count per route
- **Station Performance Table:** Total flights dan delay count per station

**Data yang Ditampilkan:**

- Financial KPIs: Recognized Revenue, Operational Cost, Gross Margin, Invoiced, Paid
- Ticketing KPIs: Passenger Tickets, Cargo Bookings
- Completion Trend: Scheduled/Completed/Cancelled per date
- On-Time Performance: On-time/Delayed/Cancelled %
- Request Source Mix: Counts per source
- Delay Reasons: Flight count per category
- Aircraft Utilization: Flight hours per registration
- Fuel Metrics: Requested vs Confirmed litres per station
- Route Activity: Flight count dan cargo flight count per route
- Station Performance: Flight count dan delay count per station

**Catatan:**

- Data finansial berasal dari `invoice_finance_snapshots`, invoice, dan payment.
- Jika lebih dari satu currency ditemukan, dashboard mengembalikan breakdown per currency dan tidak menjumlahkan nominal berbeda; `isMixedCurrency` menandai kondisi tersebut.

---

## 8. MASTER DATA LAINNYA

### 8.1 Aircraft Management — `/master-data/aircraft`

**Status:** Fungsional Penuh  
**Pengguna:** OCC, Maintenance Manager, Station Admin (read), Demo Admin (full)

**Business Value:**

- Registry tunggal seluruh armada pesawat PT AMA
- Tracking serviceability dan maintenance schedule
- Basis data untuk flight assignment dan readiness evaluation
- Support STOL operations dengan konfigurasi kapasitas

**Fungsionalitas:**

- **List Page:** Tabel aircraft: registration, serial/MASN, type, manufacturer, model, fleet code, status
- **Search/Filter:** Text, status (active/inactive/all)
- **Create/Edit Form:** Registration, serial, type, manufacturer, model, fleet code, passenger capacity, cargo capacity (kg), fuel type (AVTUR/AVGAS), default capacity profile, operational status (ACTIVE/INACTIVE/RETIRED), serviceability status (SERVICEABLE/SERVICEABLE_WITH_RESTRICTIONS/MAINTENANCE_DUE/UNSERVICEABLE), base station, current station, last maintenance check, next maintenance due, serviceability note
- **Detail Page:** Header dengan image (jika ada), operational facts (current station, home base, serviceability, next maintenance), readiness score (circular progress), capacity & configuration, upcoming flight assignment, maintenance snapshot, installed components

**Data yang Ditampilkan:**

- Aircraft identity: Registration, serial/MASN, type, manufacturer, model, fleet code
- Operational facts: Current station, home base, serviceability, next maintenance
- Readiness score: Percentage, label, check items
- Capacity: Passenger/cargo configured/usable/max, fuel type, capacity profile
- Upcoming flight: Flight number, route, schedule, PIC, readiness
- Maintenance: Last inspection, next due, latest handoff
- Installed components: Position, part info, serial, condition, TSN/CSN, certificate

**Business Rules:**

- Readiness score dari weighted checks
- Aircraft position check: current station vs upcoming flight origin
- Maintenance window check: next maintenance vs flight date
- Effective capacity profile: default > flight-specific > first available
- Component alerts dari condition, certificate, repair order

---

### 8.2 Pilot & Crew Management — `/master-data/personnel`

**Status:** Fungsional Penuh  
**Pengguna:** OCC, Station Admin (read), Maintenance Manager (read), Demo Admin (full)

**Business Value:**

- Registry personel operasional (pilot, co-pilot, cabin crew, flight operations, ground crew)
- Tracking lisensi dan sertifikat medis untuk compliance
- Basis data untuk crew assignment dan readiness evaluation
- Multi-station operations dengan base station dan duty station

**Fungsionalitas:**

- **List Page:** Tabel personnel: employee code, full name, crew role, license type, license number, license expiry, status
- **Search/Filter:** Text, status
- **Create/Edit Form:** Employee code, full name, crew role (PILOT_IN_COMMAND/CO_PILOT/CABIN_CREW/FLIGHT_OPERATIONS/GROUND_CREW), license type, license number, license expiry, medical certificate expiry, base station, availability status (AVAILABLE/ON_DUTY/ASSIGNED_OTHER_FLIGHT/ON_LEAVE/UNAVAILABLE), duty station, readiness note, unit, employment status (PERMANENT/CONTRACT/ON_LEAVE/INACTIVE)

**Data yang Ditampilkan:**

- Identitas: Employee code, full name, crew role
- Lisensi: Type, number, expiry
- Medis: Certificate expiry
- Lokasi: Base station, duty station
- Status: Availability, employment status
- Catatan: Readiness note

**Business Rules:**

- License dan medical disimpan sebagai record historis terpisah; penggantian primary tidak menghapus record lama
- Hanya active, belum expired license yang dapat menjadi primary
- Medical certificate baru tidak menimpa certificate lama
- Availability bukan satu-satunya syarat readiness
- Readiness mengevaluasi employment, lifecycle, availability, primary license, medical, dan qualification
- Flying hours berasal dari completed/canonical Flight Operations dan disimpan sebagai integer minutes pada response
- Station ditampilkan sebagai relation code/name, bukan raw ID
- Documents berasal dari Uploads/Documents dan history berasal dari personnel audit log
- Archive mempertahankan historical flight assignment

---

### 8.3 Routes Management — `/master-data/routes`

**Status:** Fungsional Penuh  
**Pengguna:** OCC, Station Admin (read), Demo Admin (full)

**Business Value:**

- Definisi rute penerbangan antar stasiun
- Konfigurasi estimated duration dan distance untuk flight planning
- Support restriction level (NONE/ADVISORY/BLOCKING)
- Basis data untuk schedule template dan flight request

**Fungsionalitas:**

- **List Page:** Tabel routes: route (origin→destination), code, estimated duration (menit), distance (km), status
- **Search/Filter:** Text, status
- **Create/Edit Form:** Route code, origin/destination station, estimated duration, distance, operational notes, restriction level, restriction note
- **Detail Page:** Header dengan visual route line, stats cards, route overview, active schedule templates, compatible aircraft, upcoming flights, route readiness, restriction alert, available services, operational notes

**Data yang Ditampilkan:**

- Route identity: Code, origin/destination, distance, duration
- Operational profile: Region, timezone, readiness, checks
- Metrics: Active templates, compatible aircraft, next flight
- Schedules: Operating days, times, service types, default aircraft
- Compatibility: Aircraft dengan capacity dan serviceability
- Services: Service types dengan sources
- Flights: Upcoming flights dengan schedule dan load
- Reverse: Reverse route reference

**Business Rules:**

- Origin ≠ destination
- Restriction note required jika level ADVISORY/BLOCKING
- Readiness evaluation: active station, schedule template, capacity profile, rate card
- Available for scheduling = semua checks PASS atau WARNING

---

### 8.4 Flight Capacity Profiles — `/master-data/flight-capacity-profiles`

**Status:** Fungsional Penuh  
**Pengguna:** OCC, Station Admin (read), Demo Admin (full)

**Business Value:**

- Definisi kapasitas pesawat per route dan service type
- Support seat blocking dan cargo reservation
- Basis data untuk ticketing capacity check dan flight planning
- Flexibility konfigurasi per aircraft-route-service

**Fungsionalitas:**

- **List Page:** Tabel: profile code, name, aircraft, route, operation type, total seats, status
- **Search/Filter:** Text, status
- **Create/Edit Form:** Profile code, name, aircraft, route, service type (Charter Cargo/Charter Passenger/Scheduled Passenger/Medevac/Positioning), seat capacity, cargo capacity (kg), blocked seats, reserved cargo, capacity note

**Data yang Ditampilkan:**

- Profile identity: Code, name
- Assignment: Aircraft, route, service type
- Capacity: Seat capacity, cargo capacity, reserved seats, reserved cargo
- Catatan: Capacity note

**Business Rules:**

- Usable seats = seat capacity - reserved
- Usable cargo = cargo capacity - reserved
- Service type menentukan kategori operasi
- Profile dapat di-assign sebagai default capacity

---

### 8.5 Flight Reasons — `/master-data/flight-reasons`

**Status:** Fungsional Penuh  
**Pengguna:** OCC, Finance Reviewer (read), Demo Admin (full)

**Business Value:**

- Standardisasi alasan delay, cancellation, diversion, correction reopening
- Tracking dampak KPI dan finance review requirement
- Severity level untuk dashboard alert prioritization
- Mandatory operator note pada reason tertentu

**Fungsionalitas:**

- **List Page:** Expandable table: reason code, name, type (DELAY/CANCELLED/DIVERTED/REOPENED_FOR_CORRECTION), category, status
- **Expanded:** Description, requires note, affects KPI, affects finance review, dashboard severity (INFO/WARNING/CRITICAL)
- **Create/Edit Form:** Reason code, name, type, category, description, requires note, affects KPI, affects finance review, dashboard severity

**Data yang Ditampilkan:**

- Reason identity: Code, name, type, category
- Configuration: Requires note, affects KPI, affects finance review
- Severity: Dashboard severity
- Deskripsi: Full description

**Business Rules:**

- Reason type menentukan konteks penggunaan
- Requires note memaksa user mengisi operator note
- Affects KPI mempengaruhi perhitungan dashboard
- Affects finance review menandai reason yang memerlukan review
- Dashboard severity mempengaruhi alert prioritization

---

### 8.6 Flight Schedule Templates — `/master-data/flight-schedule-templates`

**Status:** Fungsional Penuh  
**Pengguna:** OCC, Station Admin (read), Demo Admin (full)

**Business Value:**

- Template jadwal reusable untuk flight request dan order
- Definisi operating days, departure/arrival times, default aircraft per route
- Konfigurasi booking window
- Basis data untuk automated schedule generation

**Fungsionalitas:**

- **List Page:** Tabel: template code, route, service type, default aircraft, operating days, departure local, status
- **Search/Filter:** Text, status, route (via query param)
- **Create/Edit Form:** Template code, route, service type, default aircraft (optional), operating days (MON-SUN multi-select), departure/arrival time local (HH:mm), booking opens before (hours), booking closes before (minutes), schedule note

**Data yang Ditampilkan:**

- Template identity: Code, route, service type
- Schedule: Operating days, departure/arrival times
- Assignment: Default aircraft
- Booking window: Open hours before, close minutes before
- Catatan: Schedule note

**Business Rules:**

- Operating days minimal 1 hari
- Departure/arrival format HH:mm
- Booking opens before (jam sebelum departure)
- Booking closes before (menit sebelum departure)
- Default aircraft optional
- Template dapat difilter by route dari detail page

---

### 8.7 Dangerous Goods Categories — `/master-data/dg-categories`

**Status:** Fungsional Penuh  
**Pengguna:** OCC, Station Admin (read), Demo Admin (full)

**Business Value:**

- Klasifikasi dangerous goods sesuai regulasi penerbangan (IATA DGR)
- Basis data untuk cargo booking dan manifest
- Tracking requirement khusus untuk penanganan DG

**Fungsionalitas:**

- **List Page:** Tabel: category code, name, hazard class, status
- **Search/Filter:** Text, status
- **Create/Edit Form:** Category code, name, hazard class, description, handling requirements

**Data yang Ditampilkan:**

- Category identity: Code, name
- Hazard classification: Hazard class
- Handling: Requirements
- Status: Active/Inactive

**Business Rules:**

- Category code unique
- Hazard class menentukan requirement penanganan
- Wajib untuk cargo dangerous goods

---

### 8.8 Employees & Departments — Backend Master/Options

**Status:** Backend persisten; belum memiliki halaman Vue tersendiri  
**Pengguna:** HR, Admin, Demo Admin (full)

**Business Value:**

- Registry karyawan non-crew dan departemen
- Basis data untuk custodian tracking, assignment, approval workflows
- Hierarki departemen untuk organisasi

**Fungsionalitas:**

- API CRUD dan options tersedia pada `/api/master-data/employees` dan `/api/master-data/departments`
- Digunakan oleh Corporate Assets untuk custodian, department ownership, dan assignment
- Belum ada route UI master-data Employees maupun Departments

**Data yang Ditampilkan:**

- Employee: Code, name, email, phone, department, position, status
- Department: Code, name, description, parent

**Business Rules:**

- Employee code unique
- Department hierarchy support
- Employment status mempengaruhi availability

---

## RINGKASAN STATUS IMPLEMENTASI

### Status Keseluruhan

| Kategori                     | Kondisi 27 Juli 2026                                     |
| ---------------------------- | -------------------------------------------------------- |
| **Halaman Vue**              | 92                                                       |
| **Nuxt Server API handlers** | 382                                                      |
| **Feature service groups**   | 28                                                       |
| **Persistence**              | SQLite lokal dengan migration dan scenario seed          |
| **Production readiness**     | Belum; demo persisten dengan capability yang dapat diuji |

### Rincian per Domain

#### 1. Flight Operations (10 halaman)

- ✅ Flight Requests (List, Create, Detail, Edit)
- ✅ Flight Orders Board
- ✅ Flight Order Detail (6 tab)
- ✅ Manifest Control
- ✅ Fuel Control
- ✅ Maintenance Handoff
- ✅ Manifest Worklist
- ✅ Operational Assurance
- ✅ Flight Actual & Closure
- ✅ Station Operations (9 sub-halaman)

#### 2. Ticketing, Commercial, dan Marketing

- ✅ Booking Portal (Penumpang, Kargo, Konsultasi)
- ✅ Passenger Manifest
- ✅ Cargo Tracking
- ✅ Ticketing Finance (Ledger)
- ✅ Ticketing Management
- ✅ Customer Account Detail: contacts, financial read model, credit commands, rates/contracts/documents/activity/history
- ✅ Commercial Agent Detail: contacts, lifecycle, effective commission rules, rates/contracts/activity/history
- ✅ Fare & Rate Card Detail: effective period, deterministic selection, versioning, preview, scope/tax/contract
- ✅ Contracts & Subsidies portfolio/read model

#### 3. Finance & Accounting (15 halaman)

- ✅ Finance Dashboard dari posted ledger, AR read model, dan invoice snapshot
- ✅ Accounting Workbench (6 tab)
- ✅ HPP Breakdown dari immutable invoice finance snapshot
- ✅ Trial Balance dari posted journal dan Chart of Accounts
- ✅ Invoices (List + Detail)
- ✅ Master Data: Vendors, Fuel Suppliers, Handling/Parking Suppliers, Tax Codes, Chart of Accounts, Cost Categories, Currencies, Payment Terms

#### 4. Inventory & Procurement (9 halaman)

- ✅ Inventory Dashboard
- ✅ Stock Availability
- ✅ Spare Part Catalog
- ✅ Warehouses & Bins
- ✅ Purchase Requests
- ✅ Purchase Orders
- ✅ Goods Receipts
- ✅ Movements & Cycle Counts
- ✅ Repairables & Rotables

#### 5. Corporate Assets (3 halaman)

- ✅ Overview
- ✅ Asset Register
- ✅ Maintenance Queue

#### 6. Dashboard & Master Data

- ✅ Aviation Dashboard (2 tab)
- ✅ Aircraft Management (List + Detail)
- ✅ Personnel Management
- ✅ Routes Management (List + Detail)
- ✅ Flight Capacity Profiles
- ✅ Flight Reasons
- ✅ Flight Schedule Templates
- ✅ Dangerous Goods Categories
- ✅ Stations Management
- ✅ Employees & Departments backend master/options untuk Corporate Assets

### Gap Implementasi yang Masih Teridentifikasi

1. **Station Operations Reports:** beberapa metric volume/shipment dan exception masih bernilai default ketika canonical projection belum tersedia.
2. **Contracts & Subsidies:** monitoring sudah persisten, tetapi authoring, approval, amendment/versioning, dan unbilled exposure belum lengkap.
3. **Finance:** AP aging, bank reconciliation, cash-flow forecast, budgeting, period close/reopen workbench, dan automated depreciation posting belum tersedia.
4. **HPP:** shared cost memakai revenue-share per flight; direct attribution dan policy-driven allocation run belum tersedia.
5. **Multi-currency reporting:** master currency tersedia, tetapi Finance reporting hanya mengagregasi IDR dan belum memiliki FX conversion policy.
6. **Money representation:** beberapa kolom invoice/payment legacy masih SQLite `REAL`; snapshot dan banyak subsystem baru sudah minor-unit integer.
7. **Documents:** binary dan metadata telah memiliki module, tetapi retention, malware scanning, external object storage, dan e-signature belum tersedia.
8. **Security/operations:** autentikasi masih persona demo; belum ada IdP production, MFA, production session hardening, centralized observability, backup/DR, dan offline sync.

### Catatan Kematangan Arsitektur

- **Accounting Workbench:** Kuat untuk demo dan pengujian domain: policy engine, lifecycle, audit, reversal, evidence, dan immutable posted journal
- **Invoice:** API lokal dengan approval workflow dan immutable finance snapshot
- **Master Data:** Relation-aware API dan lifecycle tersedia pada domain utama; tidak semua ancillary master memiliki halaman authoring
- **Flight Operations:** End-to-end workflow dari request hingga closure dengan business rules ketat
- **Inventory:** FIFO valuation, serial/lot tracking, cycle counting, repairable lifecycle
- **Multi-currency:** Master dan transaction currency tersedia; conversion/reporting lintas currency belum lengkap
- **Role-based Access:** Permission demo granular dengan separation of duties; identity production belum tersedia
- **Audit Trail:** Logging tersedia pada banyak aksi kritis; coverage dan retention harus diaudit sebelum produksi
- **Document Management:** Integrasi metadata/file untuk sertifikat, evidence, dan attachments

---

## KESIMPULAN

AMA Ops Interface telah menjadi demo persisten yang luas dan memiliki boundary domain yang jauh lebih jelas dibanding analisis 2025. Platform cukup matang untuk validasi workflow, UAT terkontrol, demo stakeholder, dan pengujian business rule. Platform belum boleh dinyatakan siap untuk operasional produksi hanya berdasarkan jumlah halaman atau kelengkapan UI.

**Kekuatan Utama:**

1. **End-to-end Integration:** Seluruh siklus penerbangan dari request hingga closure terintegrasi dengan finance, inventory, dan accounting
2. **Business Rules Enforcement:** Validasi ketat, separation of duties, approval workflows
3. **Audit-oriented Design:** Audit trail, evidence management, policy snapshot, immutable invoice snapshot, dan posted-journal protection
4. **Multi-station Operations:** Support untuk operasional di seluruh stasiun Papua dengan isolation dan aggregation
5. **Financial Rigor:** Accounting Workbench policy-driven, posted-ledger reporting, invoice snapshot, dan FIFO valuation
6. **Operational Readiness:** Readiness evaluation, blocker detection, dual sign-off workflows

**Area Pengembangan Aktif:**

1. Identity, database, file storage, observability, backup, dan deployment production
2. Integrasi ERP/accounting, bank, payment gateway, tax, dan external aviation systems
3. Money normalization dan multi-currency/FX policy
4. Contract/subsidy authoring, AP, reconciliation, close process, dan automated depreciation
5. Offline-first station operations dan conflict-safe synchronization

**Rekomendasi untuk Implementasi:**

1. **Phase 1 — Production Foundation:** IdP/MFA, PostgreSQL atau database production-grade, secrets, object storage, audit retention, observability, backup/DR, dan environment controls.
2. **Phase 2 — Financial Integrity:** minor-unit migration, FX policy, period close, AP/reconciliation, automated depreciation, direct cost attribution, dan allocation run.
3. **Phase 3 — Commercial Governance:** contract/subsidy authoring dan approval, amendment/versioning, canonical unbilled exposure, commission settlement integration.
4. **Phase 4 — Operational Resilience:** offline sync untuk station, conflict resolution, device/session security, performance/load test, dan disaster exercises.
5. **Phase 5 — External Integration & Analytics:** ERP/accounting, banking/payment, tax, BI warehouse, regulatory reporting, dan data quality monitoring.

Platform ini telah dirancang dengan mempertimbangkan tantangan penerbangan STOL di Papua. Langkah berikutnya bukan menambah halaman sebanyak mungkin, melainkan membuktikan integrity, security, resilience, dan auditability pada environment production.

---

**Dokumen ini disusun berdasarkan analisis mendalam terhadap seluruh kode aplikasi AMA Ops Interface.**
**Tanggal Analisis Terakhir: 27 Juli 2026**
