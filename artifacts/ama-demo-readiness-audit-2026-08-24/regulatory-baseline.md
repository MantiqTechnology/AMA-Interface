# Baseline Regulasi dan Prinsip Audit untuk Demo AMA Ops Interface

Tanggal penelusuran: 24 Agustus 2026. Dokumen ini adalah baseline audit produk, bukan pendapat hukum, bukti sertifikasi, atau pernyataan bahwa AMA Ops Interface memenuhi peraturan. Kesesuaian akhir harus divalidasi PT AMA terhadap AOC, Operations Specifications (OpSpecs), manual operasi/perawatan/keamanan yang disahkan, jenis pesawat, dan jenis operasi yang benar-benar berlaku.

## Cara menggunakan baseline

- **Kewajiban terverifikasi** berarti teks sumber resmi menyatakan kewajiban atau tanggung jawab yang relevan. Audit aplikasi tetap hanya dapat menilai apakah sistem mendukung proses tersebut, bukan mengesahkan kepatuhan operator.
- **Prinsip audit umum** adalah kontrol teknis yang masuk akal untuk menjaga integritas dan keterlacakan sistem, tetapi tidak diklaim sebagai kewajiban penerbangan Indonesia kecuali disebutkan secara eksplisit.
- Ketentuan khusus operator dapat lebih ketat daripada baseline ini. Jangan menyimpulkan bahwa sebuah action boleh dilakukan hanya karena UI menyediakannya.

## 1. Operational control dan flight release

### Kewajiban terverifikasi

CASR Part 135 pada PM 152 Tahun 2015, yang di JDIH masih ditandai **berlaku**, membedakan tanggung jawab Flight Operations Officer (FOO), pilot-in-command (PIC), dan Director of Operations pada sistem dispatch; PIC meninjau dokumen dispatch dan menandatangani penerimaan flight release. Dokumen penerbangan tertentu harus disimpan sekurang-kurangnya 90 hari, dan operator bertanggung jawab memastikan fasilitas komunikasi untuk flight watch/flight following tersedia dan serviceable. Setelah flight release diterbitkan dan belum ditarik sebelum take-off, PIC memiliki kewenangan akhir atas departure, continuation, diversion, atau termination. Flight release juga dapat menjadi tidak berlaku karena delay, pergantian crew, duty-time exceedance, kejadian yang memengaruhi maintenance release, diversion, atau perubahan material pada cuaca/kondisi operasi. Sumber: [JDIH PM 152 Tahun 2015](https://jdih.dephub.go.id/peraturan/detail?data=8kl2z0gqD1iLmHdISeRZYh8WAAabx6gFC4vQhPi8XsF14jx6CWewgP048guuoykXZc4kmt6RL48DR8MPngfNUcTp4eXwGbaGZhV4UtzUlR0yh6GM5gcnTBGV08oQGeN4wxNrKC1IGA47sZL8GzuPnC433U) dan [lampiran resmi, CASR 135.601, hlm. 44–47 PDF](https://jdih.dephub.go.id/api/media?data=4vNLZgtD4BX10Qo0li6Iqg4EvhCLHLcQw8Qh9NnfZSTe48XsU9KKuxB8mz6lGk3BAJ4p72LTqmDZc8QeZHAnVpzy4pAeZrxZlvX4TtrM3oKBev42jdCwHJAAs6p2FRido52k2DMD8J9FPdZJvg0OljGQcG1BuyeoWehlMIr4oG8l4o373if2o42Omkn5leovJ8ryoBDa3PBb5FYY05MKKNZeKDed).

CASR Part 91 menempatkan PIC sebagai pihak yang secara langsung bertanggung jawab dan memiliki final authority atas operasi dan keamanan pesawat, serta mewajibkan PIC menghentikan penerbangan ketika timbul kondisi mekanis, elektris, atau struktural yang tidak laik. Sumber: [PM 94 Tahun 2015, CASR 91.3 dan 91.7, hlm. 4 PDF](https://jdih.dephub.go.id/api/media?data=7Y3zxiHZ6Kq9blJ6xpnuib4Ob7RnkfBou48dIkMatvKo4q6gD5whEs24Ur9LP8bw9a4ZFPmoEmSH24DqdKGpMhdR4eUI9ywkpd58my3oWgQgVwI5tzE3aqreLLb56xR6JCI9KIbE91OFCXyGEkZXczWj629hAQoK6FBwHIgXSEmzGu7O8lGeYsPFKQ60RcoJhNBTvy5wtRCZiRBerK5HOPT27H3J).

PM 63 Tahun 2017 adalah perubahan kesepuluh CASR Part 135 dan masih ditandai **berlaku** oleh JDIH. Ia menegaskan bahwa OpSpecs memuat otorisasi, kondisi, dan batasan, serta bahwa alokasi operational control, dispatch/flight following, maintenance, dan penandatanganan maintenance release harus jelas pada pengaturan lease. Sumber: [daftar resmi JDIH PM 63 Tahun 2017](https://jdih.dephub.go.id/peraturan/index?PencarianPeraturanForm%5BjenisPeraturan%5D=104&jenisDetail=9&kelompok=5&page=8&pencarian-cepat-button=Cari&per-page=12&style=row) dan [lampiran resmi, CASR 135.27/135.41, hlm. 13–18 PDF](https://jdih.dephub.go.id/api/media?data=IB6SzTFcmHHJoNY8xZs30p8MNDVjGOjmo8cMZNteuJaD8bLBo5YowEe4vTHaUqGRsv4DqeZbuFbYv4EwwsVRqs7g4EudGHE76TC8ggiMbX6yEaIV7ArcUzCIF1sOlXuecqHL8lkZZgjQ37hA8Fxoz5aANLFtxkCglRPxJGlDeswrQzMV8jnxpkeYtJFDdnpxCI7AmMHx9Njdeyn5jHkPDuecAyqI).

Petunjuk inspeksi operational control DGCA yang berlaku untuk operator Part 121 dan operator komuter Part 135 menilai kejelasan tanggung jawab, kecukupan personel berkualifikasi, manual/fasilitas, ketersediaan informasi untuk planning/control/conduct of flight, kesesuaian fungsi terhadap lingkungan operasi, serta emergency/contingency plan. Sumber: [JDIH KP 158 Tahun 2018—SI 8900-6.12](https://jdih.dephub.go.id/peraturan/detail?data=A9rYy88kkJF4PIZ9Rux8ZG8QeXP7FrQzC8QfrCm3bZTM8QlDxxMy0fK8bUDfWYLsDk8X6AyOO6JiU8LQylnyF0d78gj3Y9QBF8F4qAZrj0bd3NGnbNdYnZiAmEkj8zRoS8alJyTtetYW8qk0w0QA6ramn8).

### Implikasi audit aplikasi

- Flight release harus merekam identitas/otoritas penanda tangan, waktu, versi data yang disetujui, kondisi dasar, dan acceptance PIC; riwayat tidak boleh berubah diam-diam setelah sign-off.
- Perubahan crew, aircraft, duty status, weather/operational basis, diversion, atau airworthiness status setelah release harus memicu blocker, withdrawal, atau re-release yang eksplisit—bukan sekadar mengganti field.
- UI tidak boleh mengaburkan final authority PIC atau memberikan persona demo kewenangan yang melampaui OpSpecs/manual PT AMA.
- Self-dispatch dan pengecualian FOO **tidak boleh diasumsikan**. Periksa persis jenis pesawat, berat, jenis operasi, OpSpecs, dan manual PT AMA.

## 2. Maintenance record, release-to-service, dan segregasi kewenangan

### Kewajiban terverifikasi

CASR 91.405 mewajibkan operator memastikan personel maintenance membuat entry yang sesuai pada maintenance record untuk menunjukkan pesawat telah disetujui kembali beroperasi. CASR 91.407 melarang pengoperasian setelah maintenance/preventive maintenance/rebuilding/alteration kecuali pesawat telah approved for return to service oleh orang yang berwenang menurut CASR 43.7 dan entry CASR 43.9/43.11 telah dibuat. Sumber: [PM 94 Tahun 2015, CASR 91.405 dan 91.407, hlm. 62–63 PDF](https://jdih.dephub.go.id/api/media?data=7Y3zxiHZ6Kq9blJ6xpnuib4Ob7RnkfBou48dIkMatvKo4q6gD5whEs24Ur9LP8bw9a4ZFPmoEmSH24DqdKGpMhdR4eUI9ywkpd58my3oWgQgVwI5tzE3aqreLLb56xR6JCI9KIb1w8Fl5Cs1gnFdn42M0mfSrfMCjkKFNPj59C1TJ3JLBqfdpGSPY1rBwe74qwDh2KMCUU0sL5LGdfMsCfBsgr9rrGkZX9nw8EsxlxGOTSsK6MfDuEo20AC).

CASR 91.417 mengharuskan record antara lain berisi deskripsi pekerjaan, tanggal penyelesaian, tanda tangan dan nomor sertifikat orang yang menyetujui return to service; juga current status untuk life-limited parts, overhaul, inspection, dan Airworthiness Directives. Sebagian record disimpan sampai pekerjaan diulang/digantikan atau dua tahun; status tertentu mengikuti pesawat saat dijual; daftar defect disimpan sampai diperbaiki dan pesawat approved for return to service; record harus tersedia untuk inspeksi DGCA. Sumber: [PM 94 Tahun 2015, CASR 91.417, hlm. 67–68 PDF](https://jdih.dephub.go.id/api/media?data=7Y3zxiHZ6Kq9blJ6xpnuib4Ob7RnkfBou48dIkMatvKo4q6gD5whEs24Ur9LP8bw9a4ZFPmoEmSH24DqdKGpMhdR4eUI9ywkpd58my3oWgQgVwI5tzE3aqreLLb56xR6JCI9KIb1w8Fl5Cs1gnFdn42M0mfSrfMCjkKFNPj59C1TJ3JLBqfdpGSPY1rBwe74qwDh2KMCUU0sL5LGdfMsCfBsgr9rrGkZX9nw8EsxlxGOTSsK6MfDuEo20AC).

Pedoman resmi DGCA menjelaskan bahwa maintenance release ditandatangani orang yang tersertifikasi dan berkualifikasi untuk fungsi terkait; entry harus memuat uraian pekerjaan sesuai persyaratan CASR Part 43. Dokumen yang hanya menyatakan part number cocok dengan purchase order bukan bukti acceptability atau release-to-service. Untuk used/life-limited parts, status time/cycle harus disubstansiasi dengan history. Sumber: [DGCA Staff Instruction tentang Approval for Return to Service dan Aeronautical Product Records, hlm. 13–16 PDF](https://jdih.dephub.go.id/api/media?data=J47QfR7gqPr6rwQ6m04s9H48bn8ZZjwN24DujnEvumJ84ToiD8WeZO78X3cjSRENFt4eaTFepmWeJ8QiPoXiXmK64eRSRmYi8Rw4Uoak5NqxRG8Zk1pywxBsuKklANjvJHdU60RHGEsJvuDAiGTKCplJyt4DgZ2MoLHqJDjFJc0QhVfrBrOqZf7RAVT0B1oCLl4XYUBjvGYPz1JYV8ffzYGItkCK).

Petunjuk inspeksi maintenance DGCA mengharuskan sistem record AMO ditinjau akurasi/kelengkapannya sebelum return to service dan mempertahankan record sekurang-kurangnya dua tahun. Pedoman yang sama menilai pemisahan/identifikasi serviceable dan unserviceable parts, current life-limited status, traceability ke approved source, serta kontrol revisi manual, form, dan technical data. Sumber: [DGCA KP 064 Tahun 2018—SI 8900-6.9, khususnya hlm. 55–66 PDF](https://jdih.dephub.go.id/api/media?data=4vKtAtteWrmKThIe0keS3u8QmITj2K3Kl4JJvdoVAJHj8X1GYxdtQzn4ub8fcDih2T4vQhQ4klhEu4JDTguLnczG4ktKgHdmkoC4JIcmVK82rvLnkxPrgWMDSHKRwf6D49iEJu3YrwWbnzd6NEMzsPX3TE1M131wRvNQU2gCK6cUYA8qAmFclJvwyQjHgXi3oEjVkP7fSek2UXMOWGdVjKxVyd1g).

Checklist inspeksi resmi juga menghubungkan technical/maintenance log dengan MEL, deferred-item list, weight-and-balance report, approved maintenance program, work package, component/life-limited status, AD/SB, serta damage/repair/alteration status. Keberadaan UI checklist saja bukan bukti bahwa hubungan tersebut valid. Sumber: [DGCA KP 294 Tahun 2017—SI 8900-6.1, hlm. 39–41 PDF](https://jdih.dephub.go.id/api/media?data=EhUOHj6AfIoGMNXkhY30Vp4EqWnyMI57C4JIdScjGRyo4ebnzYKgzWF8cNsF2X7ate8RmPQRqxfub4Es2q4xlBHs4Evgszuyqry8bMRbkqiNXfJt6KueSFWrZ089dkxQV37r2EvhiWk1jc63RYPOPp2C1gBKc6X0xDGdoD3D5pmvymu5J9ILd625guc4J1gf5ZkZ9yKNEferRfUiYIpKQE9rMZDm).

### Implikasi audit aplikasi

- Enforce authorization berdasarkan license/certificate, rating/scope, employer/AMO/AOC authorization, expiry, station/base, serta task/aircraft type—bukan role name generik saja.
- Pisahkan secara eksplisit `work performed`, inspection/required inspection item bila berlaku, dan `approved for return to service`; simpan actor, authority reference, timestamp, outcome, serta alasan rejection/reopen.
- Sistem harus mencegah technical release bila defect/open task/required inspection/part trace/maintenance program item yang relevan belum selesai atau belum disetujui.
- **Batas interpretasi:** sumber di atas tidak menetapkan blanket rule bahwa performer dan releaser selalu dua orang berbeda untuk setiap pekerjaan. Dual sign-off atau independent inspection harus diturunkan dari task category, Required Inspection Item, approved maintenance program, MOE/CMM, dan authorization PT AMA. Aplikasi tetap harus mampu mengonfigurasi serta membuktikan segregasi tersebut ketika diwajibkan.

## 3. Safety Management System (SMS) dan quality/safety assurance

### Kewajiban terverifikasi

Baseline terkini adalah **PM 2 Tahun 2026**, berlaku sejak 3 Februari 2026 dan secara resmi mencabut PM 62 Tahun 2017. Sumber: [JDIH PM 2 Tahun 2026](https://jdih.dephub.go.id/peraturan/detail?data=4LpmKGgtWBd2OBGogOWPct4vUorcpsLWZ4uPlgZwQNI98bNm1yZV8U84eajElHe78u49WjKLXvA0M4eWbTK9wG0Y48dI7PIqbyf4OcfbuwsuVX6u3oInIWQs4IaLJmpmBX1m9Gr0ldEr0iULGMu3Se1Y2z).

Menurut penjelasan resmi Ditjen Perhubungan Udara, PM 2 Tahun 2026 mewajibkan penyedia jasa membangun dan mengimplementasikan SMS yang mencakup kebijakan/tujuan/sumber daya, safety risk management, safety assurance, dan safety promotion. Ia juga menekankan mandatory dan voluntary safety reporting serta perlindungan data dan informasi keselamatan. Sumber: [Ditjen Hubud—Sosialisasi PM 2 Tahun 2026](https://hubud.kemenhub.go.id/berita/4846).

Lampiran PM 2 Tahun 2026 §§19.11–19.13 mensyaratkan kebijakan yang ditandatangani accountable executive, prosedur safety reporting, dan kejelasan accountability/responsibility/authority termasuk level manajemen yang menerima tolerable safety risk. §§19.37–19.39 mengharuskan reporting system menjadi bagian hazard identification, prosedur akses, perlindungan data/informasi, aksesibilitas bagi personel, dan data-quality check atas konsistensi informasi awal dengan database. Sumber: [teks resmi PM 2 Tahun 2026, hlm. 14–15 dan 21–22 PDF](https://peraturan.go.id/files/permenhub-no-2-tahun-2026.pdf).

### Implikasi audit aplikasi

- Modul safety harus menunjukkan siklus lengkap report → triage → hazard linkage → risk assessment → mitigation/action owner → effectiveness review → closure/reopen, bukan hanya register insiden.
- Pastikan dukungan untuk mandatory dan voluntary reporting, pembatasan akses, perlindungan identitas/informasi sensitif, serta jejak siapa yang melihat atau mengubah record.
- Quality/safety assurance perlu menunjukkan audit/inspection/finding, corrective action, due date, evidence, verification of effectiveness, dan escalation. Dashboard harus dapat ditelusuri ke transaksi dan tidak menyamarkan data kosong sebagai kinerja baik.
- Tidak boleh menampilkan badge atau copy yang menyiratkan SMS “approved/compliant” tanpa bukti pengesahan dan scope yang sesuai.

## 4. Aviation security

### Kewajiban terverifikasi

PM 9 Tahun 2024 tentang Keamanan Penerbangan Nasional berstatus **berlaku** sejak 18 April 2024. Sumber: [JDIH PM 9 Tahun 2024](https://jdih.dephub.go.id/peraturan/detail?data=FlTtpS9qBpZDX5dZtL3EI94jxKYlDGFOy49ab799WFQg8LRCRh2lgV18cNcKPdMTH68m8TSBHkWGP4EwyBoADi424pFqTUBz2n84KBpzuRzl0T1xkrG1XSU1VGd7EFztF54eDag8ZAdmw3ICLCNtCcpSP9).

Pedoman resmi yang merujuk PM 9 Tahun 2024 dan KM 39 Tahun 2024 mewajibkan badan usaha angkutan udara dan pemangku kepentingan terkait menerapkan pedoman penyusunan/pengesahan program keamanan serta menyesuaikan programnya. Sumber: [Keputusan Dirjen—Pedoman Penyusunan dan Tata Cara Pengesahan Program Keamanan Penerbangan](https://jdih.dephub.go.id/api/media?data=LtswJFzrQJs5wA6509CgF88hkDONZLWZL4TqEocCO4hg4uWDKCc9q1C4uXGprgX2h94q6uZAACyhT4jtEPZg2FV34aDl2d4mpAT8X58LYBvw1aEhoWBVRhWmAGJTY6v8nAjA3bDCjbFNIRfKv6UyU6fQd27GRHdBJTHvS4Jx8i55LFcu3F08YLPazH96NHeeaSElnW97jbZeM8iSeAHvNkjBuujs).

PM 80 Tahun 2017, yang juga masih ditandai **berlaku** oleh JDIH, mengharuskan perlindungan confidentiality, integrity, dan availability sistem TIK/data rawan terkait penerbangan dari serangan siber, internal quality control, corrective action, serta pengawasan keamanan yang independen dari entitas pelaksana. Terapkan bersama baseline PM 9/2024 dan program keamanan PT AMA yang berlaku; bila ada konflik, regulasi/program yang lebih baru dan disahkan harus menjadi rujukan. Sumber: [JDIH PM 80 Tahun 2017](https://jdih.dephub.go.id/peraturan/detail?data=EJFYoEKU4Lx0cCj2Q3LAFQ8bRd83SsD7V8LKm778H3Hl4vX9zYil89Y4PUZXU8p60u8bRdRwPNNXm4qDNS3BtxYY4TrJJS4CBh34uQoZJSETGkIyNkiHNvxd97PzczS4tJg1APMjXD1m2qk1QCCJcxRYyA).

### Implikasi audit aplikasi

- Access control harus mengikuti need-to-know dan station/flight scope. Jangan menampilkan prosedur keamanan sensitif, credential, screening detail, security incident, atau dokumen terbatas kepada persona demo umum.
- Audit manifest/baggage/cargo/security workflow harus menilai chain of custody, actor authorization, exception handling, dan preservation of evidence tanpa menyalin prosedur keamanan sensitif ke laporan publik.
- Demo tidak boleh mengklaim kesesuaian program keamanan hanya berdasarkan keberadaan halaman “Aviation Security”. Cocokkan dengan program keamanan PT AMA yang berlaku dan hanya dalam sesi berotorisasi.

## 5. Auditability dan integritas record

### Kewajiban terverifikasi

Kewajiban record penerbangan di atas bersifat domain-specific: flight documents tertentu sekurang-kurangnya 90 hari (CASR 135.601), sedangkan maintenance record mengikuti kategori dan periode CASR 91.417. Karena itu kebijakan retensi tunggal untuk semua tabel tidak memadai, dan penghapusan data harus mempertahankan record yang diwajibkan serta keterkaitan historisnya.

### Prinsip audit teknis umum

OWASP merekomendasikan application logging yang mencatat “when, where, who, what”, termasuk intended action, object, result, dan reason; sumber event lintas trust zone perlu dianggap tidak tepercaya, dan log perlu dilindungi dari modifikasi/penghapusan serta akses log ikut dicatat. Ini **bukan peraturan penerbangan Indonesia**, tetapi baseline teknis yang relevan untuk audit trail. Sumber: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

Kriteria audit produk:

- Action kritis menyimpan actor dan authority yang dipakai saat kejadian, persona/station context, timestamp server, business-effective time, entity/version before-after, reason, source device/request, outcome, dan correlation/interaction ID.
- Approval/release/post/reverse/void tidak boleh hard-delete atau overwrite history; koreksi dilakukan sebagai event baru yang mereferensikan event sebelumnya.
- Client tidak boleh menentukan sendiri identity, role, approval state, audit actor, atau authoritative timestamp.
- Audit record harus ikut transaksi bisnis atau mempunyai failure handling yang tidak mengubah operasi kritis menjadi sukses tanpa audit.
- Export/report harus dapat ditelusuri ke source record dan versi data; fixture demo ditandai jelas dan tidak dicampur dengan hasil transaksi nyata.

## 6. Offline/limited-connectivity data integrity

### Status regulasi

Dalam sumber penerbangan resmi yang ditelusuri, tidak ditemukan ketentuan yang mewajibkan AMA Ops Interface menyediakan mode offline tertentu atau algoritme conflict resolution tertentu. Karena itu semua butir di bawah adalah **prinsip audit teknis umum**, bukan kewajiban CASR yang terverifikasi. Namun, konektivitas terbatas tidak mengurangi kewajiban domain atas authority, record, release, dan data integrity.

### Prinsip audit teknis umum

W3C menjelaskan bahwa Service Workers dapat mengintersepsi fetch dan memakai cache untuk pengalaman yang tetap bekerja offline, tetapi caching sendiri bukan bukti bahwa transaksi bisnis aman atau tersinkronisasi. Sumber: [W3C Service Workers](https://www.w3.org/TR/service-workers/).

W3C IndexedDB menetapkan transaksi lokal sebagai kumpulan operasi yang atomic dan durable; abort harus me-rollback perubahan, dan commit harus menulis seluruh perubahan atau tidak sama sekali. W3C juga membedakan durability `strict` dan `relaxed`, serta menyarankan `strict` ketika mengurangi risiko kehilangan data lebih penting daripada performa/baterai. Ini baseline implementasi web, bukan mandat bahwa aplikasi harus menggunakan IndexedDB. Sumber: [W3C Indexed Database API 3.0 §2.7](https://www.w3.org/TR/IndexedDB/#transactions).

Kriteria audit produk:

- Tampilkan status yang jujur dan berbeda untuk `local draft`, `queued`, `syncing`, `server accepted`, `conflict`, dan `failed`; queued tidak boleh ditampilkan sebagai approved/released/posted.
- Setiap mutasi offline memiliki stable client operation ID/idempotency key, actor/station/device context, local event time, server receipt time, payload/schema version, dependency, retry count, dan final outcome.
- Retry/reconnect tidak boleh membuat duplicate manifest person, fuel uplift, stock issue, defect, sign-off, journal, atau payment event.
- Server wajib mengulang authorization, validation, state-transition, concurrency/version, dan readiness/airworthiness checks saat menerima queue; validasi lokal hanya feedback awal.
- Konflik safety/airworthiness/finance tidak boleh diselesaikan dengan silent last-write-wins. Tampilkan perbedaan, owner penyelesaian, alasan, dan audit event resolusi.
- Uji crash/power loss di tengah local commit, network drop sebelum/selama/setelah server commit, response hilang setelah server sukses, queue out-of-order, clock skew, credential/authority kedaluwarsa, record sudah closed/released, schema upgrade dengan pending queue, serta dua station mengubah entity yang sama.
- Cache data sensitif harus mengikuti least privilege, session/persona switch harus membersihkan atau mengisolasi cache, dan logout/revocation harus mencegah akses offline yang tidak lagi berwenang.

## 7. Minimum acceptance gate untuk demo

Temuan berikut seharusnya menjadi blocker atau disclosure keras pada demo readiness:

- release/departure tetap dapat dilakukan setelah data dasar berubah tanpa re-evaluation;
- persona tanpa authority dapat approve, release, post, reverse, atau melihat data security/safety sensitif;
- maintenance release dapat dibuat tanpa authority yang berlaku, work evidence, atau required sign-off;
- refresh/restart/reconnect menghilangkan atau menggandakan transaksi;
- aplikasi menampilkan queued/local state sebagai server-accepted atau final;
- audit trail dapat diedit/hapus biasa, actor dapat dipalsukan dari client, atau action kritis sukses ketika audit insert gagal;
- SMS/quality/security dashboard menampilkan angka simulasi tanpa penandaan atau tidak dapat ditelusuri ke record sumber;
- materi demo menyatakan “compliant”, “approved”, “certified”, atau “production-ready” tanpa validasi formal yang sesuai.

## Catatan verifikasi lanjutan

- Verifikasi apakah PT AMA beroperasi terutama di bawah CASR Part 135, jenis/berat tiap pesawat, serta apakah pilot-self-dispatch diotorisasi. Jangan menggeneralisasi klausul Part 135 ke operasi Part 121 atau operasi lain.
- Dapatkan OpSpecs dan manual PT AMA versi berlaku untuk memetakan role FOO/PIC/OCC, flight-release validity, Required Inspection Items, maintenance authorization, MEL/deferred defect, dual sign-off, record retention, dan station security.
- Dokumen keamanan yang sensitif tidak boleh dimasukkan ke artifact audit umum; cukup catat kontrol, scope, dan hasil verifikasinya.
