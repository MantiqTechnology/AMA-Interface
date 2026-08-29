# Audit Kesiapan Demo AMA Ops Interface

Tanggal audit: 24 Agustus 2026  
Baseline: branch `demo`, commit `b5673c8aa1d592d990a1caccf3f361fc7a546e71`, working tree aktif  
Keputusan: **CONDITIONAL GO untuk demo lokal/privat yang sangat terkontrol; NO-GO untuk demo publik dan NO-GO untuk production**  
Skor kesiapan: **54/100**

## Kesimpulan eksekutif

Aplikasi sudah menunjukkan kedalaman domain yang nyata pada Flight Operations, Station Operations, MRO, Inventory, Finance, approval, dan audit evidence. Database demo dapat di-reset secara repeatable, integrity check SQLite lulus, transaksi keuangan dan record maintenance memiliki beberapa guard imutabilitas yang kuat, build produksi serta typecheck lulus, dan 10/10 skenario Station Operations terpilih lulus di browser termasuk persistence setelah reload dan station-scope API.

Namun aplikasi belum boleh memberi kesan siap produksi. Runtime default memberi pengunjung tanpa autentikasi persona `Demo Admin` dengan permission wildcard; endpoint upload tidak memiliki pemeriksaan permission; dokumen non-inventory tidak menerapkan station scope; DevTools aktif dan dependency audit menemukan advisory remote-command-execution kritis; database produksi/Vercel default berada di `/tmp`; offline/sync tidak tersedia; modul SMS dan Aviation Security yang diwajibkan baseline bisnis belum ada; dan mobile layout yang pernah dicapture menunjukkan clipping berat.

Karena itu presentasi kepada PT AMA hanya layak jika dijalankan pada laptop lokal atau jaringan privat, tanpa data nyata, dengan alur yang sudah direhearsal, persona yang dikunci secara prosedural, dan disclosure eksplisit bahwa autentikasi, offline sync, SMS, AVSEC, object storage, backup/DR, dan sertifikasi compliance belum production-ready.

Jika URL dapat diakses internet atau jaringan klien yang tidak dipercaya, keputusan otomatis menjadi **NO-GO**.

## Scorecard

| Dimensi                             |   Bobot |  Nilai | Ringkasan                                                                                      |
| ----------------------------------- | ------: | -----: | ---------------------------------------------------------------------------------------------- |
| Safety dan integritas data          |      25 |     16 | Guard MRO/GL baik; SMS/AVSEC dan validasi manual AMA belum lengkap                             |
| Cakupan fungsi dan integrasi        |      20 |     15 | Flight–Station–MRO–Inventory–Finance luas; sebagian fixture/copy/test sudah drift              |
| Access, security, authorization     |      15 |      3 | Default anonymous admin, upload terbuka, document station-scope bocor                          |
| Resilience, offline, deployment     |      10 |      1 | Tidak ada service worker/cache/queue; reload offline gagal; SQLite `/tmp`                      |
| UX, responsive, accessibility       |      10 |      5 | Station desktop/tablet cukup kuat; mobile clipping dan kontrol icon-only masih banyak          |
| Engineering quality dan testability |      10 |      7 | Typecheck/build lulus; lint entry point rusak, suite OOM, dua race test gagal                  |
| Kredibilitas data demo              |      10 |      7 | Seed kaya dan disclosure telemetry baik; notifikasi maskapai lain dan label mock merusak trust |
| **Total**                           | **100** | **54** | **Conditional Go, controlled demo only**                                                       |

## Blocker utama

1. **F-001 — default anonymous super-admin.** Cookie role yang hilang jatuh ke Demo Admin dan permission `*`.
2. **F-002 — upload API terbuka.** Metadata, file, create, delete, dan receipt upload tidak diproteksi permission.
3. **F-003 — station isolation dokumen tidak lengkap.** Flight/aircraft/personnel/station/vendor/customer documents selalu lolos owner access.
4. **F-004 — dependency kritis + DevTools aktif.** `pnpm audit --prod` menemukan 1 critical dan 18 high; DevTools rentan aktif pada config.
5. **F-005 — offline station operation tidak tersedia.** Tidak ada service worker/cache/action queue; offline reload menghasilkan `ERR_INTERNET_DISCONNECTED` dan body kosong.
6. **F-006 — persistence deployment tidak dapat dipercaya.** Production/Vercel default memakai SQLite di `/tmp`.
7. **F-007/F-008 — SMS dan Aviation Security tidak terimplementasi.** Ini gap requirement, bukan sekadar page yang belum dipoles.
8. **F-009 — UI notifikasi memalsukan konteks operator.** Fallback menampilkan GA, QZ, JT, CGK, SUB, serta tombol “View All” mati.
9. **F-010 — mobile layout gagal secara visual.** Screenshot 390 px memperlihatkan konten terpotong/bertumpuk.
10. **F-011 — quality gate tidak stabil.** Suite penuh OOM; dua concurrency test tidak menghasilkan output worker; lint default memindai `.vercel`.

Rincian lengkap tersedia di [findings.md](./findings.md).

## Syarat wajib sebelum presentasi PT AMA

- Jalankan hanya pada `127.0.0.1` atau jaringan privat yang dibatasi; jangan gunakan deployment publik.
- Jangan unggah dokumen nyata, data personal, manifest nyata, credential, atau record maintenance aktual.
- Nonaktifkan DevTools dan upgrade dependency kritis sebelum laptop masuk jaringan PT AMA.
- Pastikan API dashboard mengembalikan alert agar fallback GA/QZ/JT tidak muncul, atau perbaiki fallback sebelum demo.
- Ikuti [demo-runbook.md](./demo-runbook.md); hindari free exploration pada Flight Request selector lama dan area yang ditandai mock.
- Nyatakan di opening slide bahwa ini prototype demo berbasis persona, bukan sistem certified/approved/production.
- Jangan mendemokan offline sebagai fitur. Tunjukkan sebagai roadmap dengan batas mutasi kritis yang jelas.
- Dapatkan konfirmasi PT AMA atas AOC/OpSpecs/manual untuk operational control, PIC/FOO authority, MEL/deferred defect, RII/dual sign-off, retention, dan station scope.

## Bukti positif yang perlu ditonjolkan

- Reset/seed dua kali berhasil dan menghasilkan skenario verifikasi.
- `PRAGMA integrity_check = ok`, tidak ada foreign-key violation.
- 21 posted journals seimbang; tidak ada posted journal tanpa actor/waktu pada database audit.
- Trigger database menjaga journal posted, inventory movement finalized, MRO sign-off, inspection attempt, release, dan audit pack tetap immutable.
- Accounting integration memakai `transaction().immediate()`.
- Station Operations E2E: 10/10 lulus, termasuk evidence persistence setelah reload dan enforcement station scope.
- Flight following menyatakan telemetry simulasi dan bukan certified surveillance/navigation data.

## Isi audit pack

- [findings.md](./findings.md) — seluruh temuan dan klasifikasi.
- [traceability-matrix.md](./traceability-matrix.md) — status modul dan use case A–W.
- [test-evidence.md](./test-evidence.md) — hasil command, runtime, dan database checks.
- [demo-runbook.md](./demo-runbook.md) — alur aman untuk presentasi.
- [remediation-backlog.md](./remediation-backlog.md) — backlog berurutan berdasarkan risiko.
- [regulatory-baseline.md](./regulatory-baseline.md) — baseline sumber primer dan batas interpretasi compliance.

## Scope dan batas audit

Scope mencakup modul yang diminta dan mengecualikan Ticketing, CRM & Marketing, HRIS, dan Corporate Asset. Modul yang dikecualikan hanya disebut ketika navigasi global atau dependency langsung memengaruhi kredibilitas dan access control area in-scope.

Audit dilakukan terhadap working tree aktif, bukan commit bersih. Hash diff tracked saat baseline adalah `18a6357f35ac672a69b2697de09bfd27432744d3abe5a1f4a1093bc2e910c77d`. Perubahan yang sudah ada milik pengguna dan tidak diubah oleh audit ini. Hasil tidak merupakan legal opinion, sertifikasi kelaikudaraan, approval DGCA, atau validasi formal manual PT AMA.
