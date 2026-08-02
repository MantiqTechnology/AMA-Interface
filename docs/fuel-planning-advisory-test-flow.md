# Fuel Planning Advisory Test Flow

Dokumen ini dipakai untuk mengetes flow `Fuel Planning Advisory` dari master data sampai flight closure. Jalankan dari demo DB bersih supaya nomor, status, dan data seed mudah dibandingkan.

```bash
pnpm demo:reset
pnpm dev
```

Gunakan role switcher di header:

- `Demo Admin` untuk setup master data.
- `OCC` untuk membuat flight, readiness, approval, scheduling, departure, landing.
- `Station Admin` untuk station task/signoff.
- `Maintenance Manager` untuk maintenance handoff.
- `Director` jika approval flight membutuhkan role approval.

## Master Data Yang Dipakai

Data ini sudah ada di seed setelah migrasi terbaru. Cek dan edit bila ingin memastikan nilainya.

### Aircraft

Menu: `/master-data/aircraft`

Gunakan aircraft `PK-AMB` atau `PK-AMA`.

| Field                         | PK-AMB demo value                                             |
| ----------------------------- | ------------------------------------------------------------- |
| Registration                  | `PK-AMB`                                                      |
| Aircraft type                 | `Cessna Caravan 208B`                                         |
| Fuel type                     | `AVTUR`                                                       |
| Engine category               | `TURBINE`                                                     |
| Usable fuel capacity L        | `1257`                                                        |
| Fuel capacity basis           | `USABLE`                                                      |
| Cruise burn L/hour            | `180`                                                         |
| Holding burn L/hour           | `180`                                                         |
| Taxi burn L/hour              | `120`                                                         |
| Fuel profile source           | `DEMO`                                                        |
| Fuel profile effective from   | `2026-01-01`                                                  |
| Fuel profile reference        | `Demo advisory profile; validate against AMA AFM/POH records` |
| Fuel profile is advisory only | `true`                                                        |

Checkpoint:

- Buka detail aircraft.
- Pastikan profil fuel tidak kosong.
- Pastikan kapasitas yang dipakai adalah `usable fuel capacity`, bukan total tank dikurangi expansion space.

### Route

Menu: `/master-data/routes`

Gunakan route `DJJ-WMX`.

| Field              | Value     |
| ------------------ | --------- |
| Route code         | `DJJ-WMX` |
| Origin             | `DJJ`     |
| Destination        | `WMX`     |
| Estimated duration | `55 min`  |
| Distance           | `250 km`  |
| Restriction        | `NONE`    |

Checkpoint:

- Buka detail route.
- Pastikan route active dan distance/duration configured.
- Reverse route `WMX-DJJ` juga tersedia untuk return scenario.

### Fuel Policy

Policy aktif dibuat otomatis oleh migration.

| Field                               | Value                           |
| ----------------------------------- | ------------------------------- |
| Name                                | `CASR 135.637 Advisory Default` |
| Regulatory basis                    | `CASR_135_637`                  |
| Contingency percent                 | `5`                             |
| Minimum contingency holding minutes | `5`                             |
| Turbine final reserve minutes       | `30`                            |
| Reciprocating final reserve minutes | `45`                            |
| No-alternate holding minutes        | `15`                            |
| Low margin minutes                  | `15`                            |

## Scenario 1: Complete Flight With Valid Block Fuel

Tujuan: membuktikan advisory menghitung block fuel dari `fuel on board + uplift`, menampilkan breakdown CASR, lalu flight bisa berjalan sampai closure memakai workflow yang ada.

### 1. Create Flight

Menu: `/flights`

Create direct flight/order dengan data:

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Flight date         | `2026-07-14`                 |
| Flight type         | `CHARTER`                    |
| Service type        | `CHARTER_CARGO`              |
| Priority            | `NORMAL`                     |
| Route               | `DJJ-WMX`                    |
| Customer            | `Papua Logistics`            |
| Aircraft            | `PK-AMB`                     |
| PIC                 | seeded valid PIC             |
| Co-pilot            | seeded valid co-pilot        |
| Scheduled departure | `2026-07-14 10:00 WIT`       |
| Scheduled arrival   | `2026-07-14 11:00 WIT`       |
| Remarks             | `Fuel planning advisory UAT` |

Checkpoint di flight detail:

- Tab `Overview`: flight information muncul dengan route `DJJ -> WMX`.
- Tab `Assignment`: aircraft `PK-AMB` dan crew terisi.
- Tab `Readiness`: sebagian check masih pending sampai fuel/manifest/station/approval lengkap.

### 2. Create Fuel Request

Menu: `/flights/fuel`

Tambah fuel request untuk flight tadi:

| Field                         | Value                                      |
| ----------------------------- | ------------------------------------------ |
| Flight                        | flight yang baru dibuat                    |
| Supplier                      | `Pertamina DJJ` atau supplier AVTUR seeded |
| Fuel type                     | `AVTUR`                                    |
| Requested quantity litre      | `220`                                      |
| Fuel on board before uplift L | `180`                                      |
| Defuel quantity L             | `0`                                        |
| Reference price per litre     | kosong atau seeded price                   |

Lalu jalankan action:

1. `Approve`
2. `Uplift`, isi `Actual uplift litre = 220`
3. `Post`

Expected calculation:

```text
Available block fuel = 180 + 220 - 0 = 400 L
Taxi fuel            = 15 L jika planned taxi fuel diisi, atau burn taxi default dari profile
Trip fuel            = 180 L untuk durasi 60 menit dan burn 180 L/hour
Contingency          = max(5% trip, 5-minute holding) = max(9 L, 15 L) = 15 L
No-alternate fuel    = 15-minute holding = 45 L
Final reserve        = turbine 30-minute holding = 90 L
Required block fuel  = 345 L jika taxi fuel 15 L
Margin               = 55 L atau sekitar 18 menit
```

Checkpoint:

- Buka flight detail `/flights/{id}`.
- Tab `Overview`, panel `Fuel Planning Advisory`:
  - Status `ENOUGH_FOR_PLANNED_LEG`.
  - `Available block fuel` sekitar `400 L`.
  - `Required block fuel` sekitar `345 L`.
  - `Operational margin` sekitar `55 L`.
  - `Fuel source` berisi kombinasi fuel on board + actual uplift.
  - Tidak ada warning `FUEL_QUANTITY_IS_UPLIFT_ONLY`.
- Tab `Related Records`, panel `Fuel Request`:
  - Supplier, requested, required block fuel, dan margin muncul.

### 3. Manifest And Station Readiness

Menu:

- `/flights/{id}/manifest`
- `/flights/station-operations/{id}`

Data minimal:

| Area                | Value                                                   |
| ------------------- | ------------------------------------------------------- |
| Passenger manifest  | kosong boleh jika service cargo tidak membutuhkan pax   |
| Cargo manifest      | masukkan cargo ringan, contoh `Medical cargo`, `250 kg` |
| DG                  | `No DG` atau `NOT_APPLICABLE`                           |
| Origin handling     | verify/signoff                                          |
| Destination signoff | verify/signoff setelah landing/closure phase            |

Checkpoint:

- Tab `Readiness`: `MANIFEST_APPROVED`, `FUEL_CONFIRMED`, dan station checks bergerak ke `PASS` atau tidak lagi blocking.
- Tab `History`: ada audit untuk readiness/evaluate actions.

### 4. Run Operational Actions

Di flight detail:

1. `Run Readiness Check`
2. `Approve Flight`
3. `Schedule`
4. `Open Check-in`
5. `Close Check-in / Load Intake`
6. `Evaluate Departure Assurance`
7. `Mark Ready for Departure`
8. `Record Departure`
9. `Record Landing`
10. `Start Closure`

Checkpoint per tab:

- `Overview`: lifecycle strip bergerak sampai `PENDING_CLOSURE`.
- `Readiness`: departure assurance checks tidak blocking.
- `History`: status transitions tercatat berurutan.
- `Records`: fuel sudah `POSTED`.

### 5. Closure Data

Menu:

- `/flights/maintenance`
- `/flights/station-operations/{id}`
- `/flights/actual-closure`

Tambahkan data minimum:

| Area                     | Value                                        |
| ------------------------ | -------------------------------------------- |
| Maintenance handoff      | status approved, aircraft sama dengan flight |
| Station cost             | contoh handling/parking cost approved        |
| Actual reconciliation    | pax/cargo actual sesuai manifest             |
| Actual departure/arrival | sudah diisi lewat Record Departure/Landing   |
| Fuel                     | sudah `POSTED`                               |

Lalu di flight detail klik `Close Flight`.

Checkpoint:

- Status menjadi `CLOSED`.
- Tab `Records`: fuel, station cost, maintenance handoff tampil.
- Tab `History`: action `CLOSE` tercatat.
- Finance/invoice draft dapat dicek jika commercial closure memenuhi data invoice.

## Scenario 2: Uplift-Only Warning

Tujuan: memastikan sistem tidak salah menganggap uplift/request sebagai total fuel tersedia.

Create flight kedua dengan data mirip Scenario 1, tapi fuel request cukup:

| Field                         | Value  |
| ----------------------------- | ------ |
| Requested quantity litre      | `220`  |
| Fuel on board before uplift L | kosong |
| Confirmed block fuel L        | kosong |
| Measured fuel on board L      | kosong |

Jika melakukan uplift, isi:

| Field           | Value |
| --------------- | ----- |
| Actual uplift L | `220` |

Checkpoint:

- Tab `Overview`, panel `Fuel Planning Advisory`:
  - `Fuel source` tetap fallback/request/uplift-only.
  - Warning `FUEL_QUANTITY_IS_UPLIFT_ONLY` muncul.
  - Reviewer tidak boleh membaca `220 L` sebagai total fuel tersedia tanpa fuel-on-board/confirmed block fuel.
- Gunakan scenario ini untuk demo risk explanation, bukan untuk closure utama.

## Checklist Dokumentasi UAT

Ambil screenshot atau catatan dari tab berikut:

| Page/tab                           | Yang dicek                                                     |
| ---------------------------------- | -------------------------------------------------------------- |
| `/master-data/aircraft`            | Fuel profile per tail number terisi dan advisory-only jelas    |
| `/master-data/routes`              | Duration, distance, reverse route, restriction                 |
| `/flights/{id}` tab `Overview`     | Fuel Planning Advisory, component breakdown, warnings          |
| `/flights/{id}` tab `Readiness`    | Fuel confirmed tetap workflow-based, bukan legal dispatch gate |
| `/flights/{id}` tab `Assignment`   | Aircraft dan crew sesuai                                       |
| `/flights/{id}` tab `Records`      | Fuel request, station costs, maintenance handoff               |
| `/flights/{id}` tab `History`      | Status transition dan action audit                             |
| `/flights/fuel`                    | Request, approve, uplift, post                                 |
| `/flights/station-operations/{id}` | Origin/destination station verification                        |
| `/flights/actual-closure`          | Reconciliation sebelum close                                   |

## Expected Notes For Demo

- Advisory ini bukan legal dispatch release.
- Uplift adalah fuel yang ditambahkan, bukan total fuel onboard.
- CASR-style component breakdown lebih penting daripada hanya menaikkan reserve percent.
- Published usable capacity dipakai langsung; tidak ada double deduction 2% expansion space.
- Return/refuel scenario adalah planning aid, bukan jaminan legal round-trip dispatch.
