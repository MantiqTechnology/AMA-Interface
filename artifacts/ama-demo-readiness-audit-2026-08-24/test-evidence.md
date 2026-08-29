# Bukti Pengujian dan Runtime

Tanggal: 24 Agustus 2026, timezone Asia/Jakarta  
Node: `v22.23.1`  
pnpm: `10.17.1`  
Nuxt build: `3.21.8`

## Ringkasan

| Pemeriksaan                            | Hasil                    | Interpretasi                                                                                                |
| -------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                       | Lulus                    | Type-level Nuxt/Vue check bersih pada baseline                                                              |
| Production build, heap 6 GB            | Lulus                    | Output 63.9 MB, gzip 8.36 MB; warning chunk >500 KB, client chunk terbesar sekitar 965 KB                   |
| `pnpm lint`                            | Gagal                    | 17,467 masalah karena `.vercel/output` ikut dipindai                                                        |
| `eslint app server shared tests`       | Lulus dengan 252 warning | Source tidak memiliki lint error, tetapi explicit `any` masih banyak                                        |
| Full `pnpm test`                       | Gagal/incomplete         | Beberapa worker mencapai heap sekitar 4 GB dan OOM; runner tidak selesai normal                             |
| Resource concurrency test terisolasi   | 6 lulus, 2 gagal         | Dua true-parallel reservation test: worker tidak menghasilkan JSON                                          |
| Selected Playwright E2E                | 16 lulus, 5 gagal        | Pola sama pada fixture audit dan fixture resmi; sebagian besar kegagalan adalah test-selector/fixture drift |
| Station Operations E2E subset          | 10/10 lulus              | Page, dialog, station switch, persistence reload, scope server, network dashboard                           |
| `pnpm audit --prod --audit-level high` | Gagal                    | 23 advisory: 1 critical, 18 high, 4 moderate                                                                |
| Demo reset dua kali                    | Lulus                    | Verification scenarios berhasil di-seed pada database terisolasi                                            |
| SQLite integrity/FK                    | Lulus                    | `integrity_check=ok`, 0 foreign-key violation                                                               |
| Offline browser probe                  | Gagal mendukung offline  | 0 service worker, 0 cache, reload offline `ERR_INTERNET_DISCONNECTED`, body kosong                          |
| Runtime server warnings                | Gagal bersih             | Unresolved `NuxtLink`/`DocumentPanel`, null async-data result, duplicate key with incompatible handler      |

## Detail build dan static quality

Production build selesai dengan exit code 0. Vite memperingatkan beberapa chunks lebih besar dari 500 KB setelah minification. Untuk pengguna station dengan bandwidth terbatas, ini berdampak langsung pada waktu startup, bukan sekadar debt internal.

Lint command didefinisikan sebagai `eslint .` pada `package.json:26`. Ignore config di `eslint.config.mjs:6-14` mencakup `.nuxt`, `.output`, `node_modules`, dan beberapa folder lain, tetapi tidak `.vercel`. Akibatnya artefak build Vercel menghasilkan 17,205 error dan 262 warning. Saat hanya source dijalankan, exit code 0 dengan 252 warning.

Pencarian wajib:

```text
rg '\bany\b|as any|@ts-ignore|@ts-expect-error' app server shared tests
330 match
```

Angka ini mencakup occurrence dalam test/copy/type serta bukan semuanya defect. Contoh explicit unsafe typing yang nyata berada di `server/services/flight-operations-verification.service.ts:1114`, `:2185`, `:2190`, `:3972`, `:3976`, dan `:4408`.

## Detail test

Full suite dijalankan dengan database, document manifest, upload manifest, dan build directory terisolasi. Beberapa child process mencapai default V8 heap sekitar 4 GB lalu fatal OOM. Runner harus dihentikan setelah tidak dapat menutup normal.

Tes terisolasi:

```text
tests/services/resource-v21-material-lifecycle.test.ts
6 passed, 2 failed
```

Kegagalan berada pada test “prevents true parallel serialized reservation” dan “prevents true parallel non-serialized quantity over-reservation”; keduanya berhenti di `tests/services/resource-v21-material-lifecycle.test.ts:99` karena worker tidak menghasilkan JSON. Ini belum membuktikan over-reservation terjadi, tetapi juga berarti kontrol race-condition belum memiliki evidence test hijau. Status: **PERLU VERIFIKASI SOURCE/RUNTIME**.

Selected browser suite dijalankan dua kali: pertama pada database audit terisolasi, lalu pada webServer/seed resmi `playwright.config.ts`. Kedua run menghasilkan 16 passed/5 failed dengan pola sama.

- Finance desktop gagal karena test mengharapkan flight Agustus sementara UI memilih seeded period Juli. Snapshot menunjukkan profitability dan posted-GL dimensions tetap render. Ini **test/fixture drift**, bukan bukti perhitungan backend salah (`tests/e2e/finance-phase-two.spec.ts:33-43`).
- Flight Request wizard gagal karena selector mengharapkan label lama `DJJ-WMX (DJJ -> WMX)`, sedangkan UI saat ini menampilkan label kaya `DJJ -> WMX | Jayapura -> Wamena ...`. Planning option benar-benar tersedia. Ini **test-selector drift** (`tests/e2e/flight-requests.spec.ts:17-28`).
- Departure dialog test mengharapkan tombol Record Departure pada flight dengan empat operational blockers. UI secara benar hanya menawarkan Close Check-in dan menunjukkan blockers. Ini **test expectation tidak lagi aman** (`tests/e2e/flight-requests.spec.ts:41-55`).
- Inventory test mengharapkan “Reservasi”, UI saat ini memakai “Reservasi stok” dan table/action benar-benar render. Ini **test-selector drift** (`tests/e2e/inventory.spec.ts:118-130`).
- MRO acceptance mengharapkan heading lama “Ringkasan Maintenance”; UI saat ini menggunakan “Pusat Kendali MRO” dan content/data render. Ini **test-selector drift** (`tests/e2e/mro-demo-v3-acceptance.spec.ts:143-159`).

Walaupun empat dari lima kegagalan browser tidak membuktikan feature break, test acceptance yang merah tetap mengurangi kepercayaan demo karena regression gate tidak sinkron dengan UI.

## Database evidence

Database: `/tmp/ama-readiness-audit-reset.sqlite`

```text
PRAGMA integrity_check                              ok
PRAGMA foreign_key_check                           0 violation
tables                                             257
flights                                            18
posted journals                                    21
unbalanced posted journals                         0
posted journals missing actor/time                 0
technical releases                                 7
maintenance audit rows                             23
flight audit rows                                  12
finance audit rows                                 40
```

Ini adalah fixture demo, bukan volume/performance test dan bukan bukti semua transaksi selalu audited.

## Runtime authorization probes

Server audit lokal: Nuxt dev pada `127.0.0.1:3470`, database terisolasi.

| Request                               | Persona/cookie       | Hasil                                |
| ------------------------------------- | -------------------- | ------------------------------------ |
| `GET /api/auth/session`               | Tanpa cookie         | 200, `Demo Admin`, `demoMode=true`   |
| `GET /api/uploads`                    | Tanpa cookie         | 200, seluruh 23 metadata upload      |
| `GET /api/master-data/aircraft`       | Tanpa cookie         | 200, 11 aircraft                     |
| `GET /api/master-data/aircraft`       | Station Admin        | 200, 11 aircraft                     |
| `GET /api/documents?ownerType=flight` | Station Admin/WMX    | 200, 3 dokumen flight lintas konteks |
| `GET /api/uploads`                    | Inventory Controller | 200, seluruh 23 metadata upload      |

Probe bersifat read-only. Tidak ada data real yang diunggah atau dihapus.

## Runtime framework warnings

Saat server audit dihentikan, buffered log memperlihatkan warning yang terjadi selama probe:

- `NuxtLink` gagal di-resolve berulang pada Dashboard (`app/pages/dashboard.vue:886-891`).
- `DocumentPanel` gagal di-resolve pada Flight detail (`app/pages/flights/[id]/index.vue:2019-2021`).
- `useAsyncData` Flight Request mengembalikan null ketika route belum dipilih dan diperingatkan dapat diduplikasi saat client hydration (`app/pages/flights/requests/new.vue:568-576`).
- Key `customers-options` dipakai oleh dua handler berbeda (`app/pages/flights/requests/new.vue:530-533`, `app/features/commercial/customers/CustomerSelect.vue:20-27`).

Warning ini tidak membuat build gagal, tetapi merupakan runtime defect evidence dan dimasukkan sebagai F-021.

## Runtime offline probe

Chromium membuka Station Operations secara online, kemudian context diputus dan halaman direload:

```json
{
  "serviceWorkers": 0,
  "cacheNames": [],
  "offlineText": "",
  "reloadError": "net::ERR_INTERNET_DISCONNECTED"
}
```

Hasil konsisten dengan disclosure roadmap bahwa offline mode belum tersedia di `docs/roadmap-enterprise-mvp.md:23` dan arsitekturnya baru didefinisikan di `:1027-1069`.

## Visual evidence

Screenshot yang diperiksa:

- `artifacts/ui-power-bi-audit/screenshots/mobile-390-dashboard.png`: judul, filters, cards, dan content terpotong/bertumpuk.
- `artifacts/ui-power-bi-audit/screenshots/mobile-390-flight-following.png`: content utama terpotong, layout tidak dapat digunakan dengan andal.
- `artifacts/ui-power-bi-audit/screenshots/desktop-1440-flight-following.png`: peta/monitor menyisakan area kosong sangat besar; simulasi disclosure ada.
- `artifacts/ui-capture/station-tablet/station-operations-board--full.png`: struktur dan prioritas operasional cukup baik, tetapi beberapa label KPI pecah per suku kata pada card sempit.

Screenshot adalah evidence yang sudah tersedia pada working tree dan tanggal pembuatannya tidak diverifikasi ulang. Temuan visual yang mengandalkan gambar ini harus diretest setelah layout diperbaiki.
