# Runbook Demo Terkontrol untuk PT AMA

## Keputusan penggunaan

Runbook ini hanya berlaku untuk **demo lokal/privat dengan data sintetis**. Jangan gunakan untuk operasi penerbangan nyata, release, maintenance record resmi, keputusan keselamatan, posting keuangan nyata, atau penyimpanan dokumen PT AMA.

## Gate H-24 sampai H-1

1. Gunakan commit/working-tree yang sama dengan rehearsal. Catat hash commit dan hash diff.
2. Upgrade/nonaktifkan DevTools dan selesaikan critical advisory sebelum laptop tersambung jaringan PT AMA.
3. Jalankan demo pada `127.0.0.1`; jangan expose port ke Wi-Fi umum.
4. Gunakan database dan manifests terisolasi. Jalankan `pnpm demo:reset` satu kali, lalu rehearsal penuh.
5. Jalankan minimum gate:
   - `pnpm typecheck`
   - source-only ESLint sampai `pnpm lint` diperbaiki
   - production build
   - Station Operations E2E
   - focused Flight/MRO/Inventory/Finance API tests yang sudah dibuat stable
6. Pastikan notifikasi dashboard tidak jatuh ke fallback GA/QZ/JT.
7. Tutup/hide menu Ticketing, CRM, HRIS, Corporate Asset, dan Uploads dari demo persona.
8. Simpan screen recording atau screenshots jalur sukses sebagai fallback bila runtime bermasalah.
9. Siapkan hotspot/cable cadangan, tetapi demo tidak boleh bergantung internet.
10. Jangan menyalin dokumen keamanan, credential, atau data PT AMA ke laptop demo.

## Opening disclosure yang disarankan

> AMA Ops Interface yang ditampilkan adalah prototype terintegrasi dengan data sintetis dan persona demo. Fokus sesi adalah validasi proses bisnis dan kontrol operasional. Autentikasi production, offline sync, SMS, Aviation Security, object storage, backup/DR, dan compliance formal masih membutuhkan desain serta validasi bersama PT AMA berdasarkan AOC, OpSpecs, dan manual yang berlaku.

## Jalur presentasi 35–45 menit

### 1. Operational overview — 4 menit

Persona: Director atau Demo Admin pada laptop privat.

- Buka dashboard dan jelaskan KPI berasal dari canonical operational data.
- Tunjukkan label demo environment.
- Jangan membuka notification fallback bila API alert kosong.
- Hindari klaim real-time tracking; Flight Following adalah simulated telemetry.

### 2. Station Operations — 10 menit

Persona: Station Admin WMX.

- Buka Station Operations pada seeded operational date.
- Tunjukkan inbound/outbound, action queue, services, verification, actual/closure, technical handoff, costs, report, dan audit.
- Lakukan satu verification evidence yang sudah direhearsal, refresh, lalu tunjukkan persistence.
- Switch station hanya sesuai role/skenario. Jelaskan bahwa endpoint ini memiliki station-scope evidence, tetapi document scope masih perlu remediation.

Ini adalah anchor demo yang paling stabil: 10/10 selected E2E lulus.

### 3. Departure assurance — 6 menit

Persona: OCC.

- Buka flight dengan readiness blockers.
- Tunjukkan perbedaan Planning Readiness dan final Departure Assurance.
- Tekankan bahwa action departure tidak tersedia selama blocker aktif.
- Jangan bypass readiness untuk mengejar jalur “happy path”. Gunakan flight fixture yang memang sudah ready bila ingin merekam actual departure.
- Nyatakan PIC/FOO/final authority masih harus dikunci dari OpSpecs/manual AMA.

### 4. MRO dan material control — 10 menit

Persona sequence: Maintenance Manager → Inventory Controller → Technician/Inspector → Certifying Staff.

- Buka command center “Pusat Kendali MRO”.
- Tunjukkan defect, work package, job card, resource blocker, material demand, inspection, eligibility snapshot, dan technical release.
- Tunjukkan actor/authority/evidence dan audit timeline.
- Jalankan secara sequential saja. Jangan mendemokan concurrent reservation sampai race tests hijau.
- Jangan mengatakan semua task selalu membutuhkan dua orang; jelaskan configuration menurut task/RII/manual.

### 5. Finance lineage — 8 menit

Persona: Finance Reviewer/Director.

- Tunjukkan handoff dari source event ke Accounting Workbench.
- Buka posted journal, debit/credit, dimension flight/route/station, trial balance, dan profitability.
- Tekankan posted journals immutable dan harus balance.
- Gunakan period Juli sesuai seeded fixture saat ini; jangan mengandalkan test yang masih mengharapkan Agustus.
- Jangan jalankan posting demo berulang tanpa reset/rehearsal.

### 6. Roadmap dan limitations — 5 menit

- Tampilkan matrix gap, bukan page palsu.
- Offline: local draft/queue/conflict/replay adalah roadmap; current reload offline gagal.
- SMS/AVSEC: butuh workshop tertutup dan manual/program AMA.
- Production platform: IdP/MFA, PostgreSQL, S3, audit coverage, backup/DR, observability, security hardening.

## Area yang tidak boleh dibuka bebas

- `/uploads` dan document download selama access control belum diperbaiki.
- Role switch di depan audiens tanpa penjelasan bahwa itu demo-only.
- Flight Request flow dengan selector automation lama; manual rehearsal wajib.
- Supplier master/ground-service flow yang berlabel mock kecuali konteksnya roadmap.
- Mobile 390 px untuk dashboard/flight following.
- Ticketing, CRM & Marketing, HRIS, Corporate Asset.
- DevTools overlay/toggle.

## Recovery saat demo

| Masalah                 | Respons aman                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Page kosong/error       | Jangan spam submit; screenshot evidence + pindah ke alur berikutnya                    |
| Seed/state berubah      | Gunakan backup database demo yang sudah direhearsal; reset hanya saat break            |
| Action disabled         | Baca blocker dan jadikan contoh safety gating; jangan edit DB manual                   |
| Network terputus        | Jelaskan current offline gap; jangan mengklaim queued/synced                           |
| Wrong persona           | Kembali ke role selector demo; jelaskan production akan memakai authenticated identity |
| Wrong accounting period | Pilih period seeded Juli; jangan memalsukan angka                                      |
| Upload/document issue   | Lewati modul; jangan gunakan data real sebagai workaround                              |

## Gate setelah demo

- Hapus database/manifests/screenshots yang berisi input sesi jika ada, menggunakan prosedur aman.
- Catat pertanyaan PT AMA sebagai requirement candidate, bukan commitment langsung.
- Pisahkan temuan yang memerlukan AOC/OpSpecs/manual dari bug software.
- Jangan membagikan URL demo aktif atau artifact yang memuat security-sensitive details.
