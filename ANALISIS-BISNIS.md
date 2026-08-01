# Analisis Bisnis Aplikasi — PT AMA Ops Interface

**Operator:** PT Asman Motor Air (AMA) — Operator penerbangan STOL di Papua  
**Platform:** Nuxt 3 / Vue 3 / Vuetify  
**Status:** Demo persisten aktif dalam pengembangan  
**Jumlah halaman:** 92 halaman Vue  
**Tanggal analisis:** 27 Juli 2026

---

## Ringkasan Eksekutif

AMA Ops Interface adalah platform operasional terpadu yang mencakup seluruh siklus penerbangan STOL di Papua — mulai dari permintaan penerbangan (flight request), kesiapan operasi (readiness), manifest penumpan dan kargo, pengendalian bahan bakar, operasi stasiun, penutupan penerbangan, hingga penagihan dan pelaporan keuangan.

Sistem ini dirancang untuk mengatasi tantangan unik penerbangan di wilayah terpencil Papua: konektivitas terbatas, jarak antar-station yang jauh, kebutuhan koordinasi multi-peran (OCC, station agent, pilot, finance), serta kepatuhan terhadap regulasi penerbangan.

### Pembaruan Cakupan Juli 2026

Audit ulang terhadap 92 halaman, 382 handler API, 28 feature service, schema, migration, dan test menunjukkan beberapa perubahan besar sejak dokumen awal:

- **Commercial Master telah diperluas:** Customer Account, Commercial Agent, Fare & Rate Card, dan Personnel Detail kini memiliki halaman enterprise bertab, relation summary, lifecycle command, audit/history, documents, serta read model lintas domain.
- **Contracts & Subsidies telah ditambahkan:** route `/marketing/contracts-subsidies` menyediakan portfolio contract, program subsidi, absorption, linked rates, documents, activity, dan audit history.
- **Finance reporting tidak lagi statis:** Dashboard, Trial Balance, dan HPP membaca posted journal, Chart of Accounts, invoice/payment, serta immutable invoice finance snapshot melalui API lokal.
- **Pricing lebih aman:** Rate Card mendukung effective period, lifecycle, deterministic selection, ambiguity guard, versioning untuk rate aktif yang pernah dipakai, dan backend preview.
- **Personnel lebih aman secara operasional:** readiness dihitung dari employment, availability, primary license, medical certificate, dan qualification; flying hours berasal dari Flight Operations.
- **Customer credit dipisahkan dari accounting:** credit limit tetap konfigurasi Customer, sedangkan exposure berasal dari invoice/payment read model dan credit hold menggunakan command beralasan.
- **Agent commission dipisahkan dari Finance:** konfigurasi komisi menggunakan basis points/fixed minor amount dan snapshot rule tersedia untuk transaksi; settlement tetap boundary Finance.

### Interpretasi Status

Istilah **fungsional penuh** dalam dokumen ini berarti alur demo lokal memiliki UI, API, validasi, dan persistence yang dapat dijalankan. Istilah tersebut tidak berarti otomatis siap produksi. Autentikasi masih berbasis persona demo, database utama masih SQLite, integrasi eksternal belum tersedia, dan beberapa representasi uang lama masih memerlukan normalisasi.

---

## 1. HALAMAN UTAMA & DASHBOARD

### 1.1 Login / Halaman Awal — `/`

**Status implementasi:** Fungsional (Demo)  
**Pengguna utama:** Seluruh personel operasional

**Business Value:**

- Menyediakan titik masuk tunggal ke seluruh platform operasional AMA
- Mendukung mode demo untuk keperluan presentasi dan pelatihan
- Mengenal peran pengguna sejak awal (Flight Coordinator sebagai default persona)

**Fungsionalitas:**

- Halaman masuk dengan satu klik — tanpa autentikasi nyata karena ini prototipe demo
- Menampilkan identitas persona default (Nadia Latuperissa — Flight Coordinator)
- Menyediakan akses langsung ke modul pemesanan penumpang dan kargo dari halaman masuk
- Panel visual yang menampilkan branding PT AMA dan ringkasan papan demo

**Data yang Ditampilkan:**

- Identitas perusahaan dan persona pengguna
- Ringkasan singkat data demo (jumlah permintaan, pemblokir, penerbangan aktif)

---

### 1.2 Aviation Dashboard — `/dashboard`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** OCC Duty Manager, Manajemen Operasional, Direksi

**Business Value:**

- Memberikan visibilitas real-time terhadap seluruh operasional penerbangan AMA dalam satu layar
- Memungkinkan pengambilan keputusan cepat berdasarkan KPI operasional: penerbangan aktif, pemblokir kritis, ketersediaan armada, dan keterlambatan
- Mendukung pengawasan multi-station sekaligus — krusial untuk jaringan penerbangan STOL Papua yang tersebar
- Tab Manajemen menyediakan gambaran tren kinerja, utilisasi armada, dan metrik komersial untuk tingkat eksekutif

**Fungsionalitas:**

- **Tab Operations Overview** menampilkan enam KPI utama: jumlah permintaan penerbangan, yang siap disetujui, penerbangan terblokir/kritis, penerbangan aktif, armada tersedia, dan penerbangan tertunda
- Panel "Action Required" menyoroti hingga tiga prioritas tertinggi untuk OCC, dengan tingkat keparahan dan tautan langsung ke penerbangan terkait
- Grafik donat kesiapan penerbangan menunjukkan proporsi penerbangan yang siap, perlu tinjauan, terblokir, dan selesai
- Matriks ketersediaan armada menampilkan setiap pesawat beserta lokasi, status kelaikan, dan jadwal perawatan berikutnya
- Papan status penerbangan (Flight Status Board) mengelompokkan penerbangan ke dalam lima lajur: Planned, Blocked, Active, Landed, Closed/Exception — masing-masing menampilkan kartu penerbangan dengan jadwal, aktual, keterlambatan, dan persentase kesiapan
- Analisis pemblokir: diagram batang horizontal yang mengklasifikasikan akar masalah (bahan bakar, kru, penanganan stasiun, ketersediaan pesawat, manifest)
- Matriks kesiapan stasiun menunjukkan kapabilitas setiap stasiun: ketersediaan bahan bakar, penanganan darat, parkir, dan catatan operasional
- **Tab Management Overview** menyajikan: metrik keuangan (pendapatan, biaya operasional, margin bruto, faktur, pembayaran), tren penyelesaian penerbangan, ketepatan waktu, alasan keterlambatan, utilisasi armada per pesawat, permintaan vs konfirmasi bahan bakar per stasiun, aktivitas rute, dan kinerja stasiun

**Data yang Ditampilkan:**

- Status seluruh penerbangan dalam berbagai tahap siklus hidup
- KPI operasional dan komersial yang diperbarui secara real-time
- Kelaikan dan lokasi setiap pesawat dalam armada
- Kapabilitas dan status operasional setiap stasiun
- Metrik keuangan: pendapatan, biaya, margin, dan piutang
- Filter berdasarkan tanggal operasi, stasiun, dan jenis operasi (Terjadwal, Sewa, Kargo, Medevac)

**Interaksi & Business Rules:**

- Filter dinamis berdasarkan tanggal operasi, stasiun asal/tujuan, dan kategori penerbangan
- Panel kontrol tampilan memungkinkan pengguna menyembunyikan/menampilkan bagian dashboard tertentu
- Setiap kartu penerbangan langsung dapat diklik untuk membuka detail penerbangan
- Pembaruan data manual melalui tombol refresh

---

## 2. FLIGHT OPERATIONS — INTI OPERASIONAL PENERBANGAN

### 2.1 Flight Requests (Permintaan Penerbangan) — `/flights/requests`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Staff OCC, Flight Coordinator, Operator Charter

**Business Value:**

- Menjadi pintu masuk seluruh permintaan penerbangan ke dalam sistem — baik dari korporat, terjadwal, kargo, maupun medevac
- Memisahkan fase perencanaan (permintaan) dari fase operasional (perintah penerbangan), memastikan setiap penerbangan melalui proses persetujuan yang tertib
- Ringkasan status (Draft, Submitted, Converted, Rejected) memberikan visibilitas instan tentang beban kerja persetujuan

**Fungsionalitas:**

- Daftar seluruh permintaan penerbangan dengan nomor permintaan, rute, pelanggan, pesawat yang diusulkan, prioritas, dan status
- Pencarian berdasarkan nama permintaan, pelanggan, atau rute
- Penyaringan berdasarkan status permintaan
- Pembuatan permintaan baru melalui wizard lima langkah
- Pengajuan permintaan dari status Draft ke review operasional
- Penyuntingan permintaan yang masih Draft atau yang ditolak
- Pembukaan detail permintaan untuk tinjauan lengkap

**Data yang Ditampilkan:**

- Nomor dan tanggal permintaan penerbangan
- Rute asal-tujuan dan jenis layanan (Charter Cargo, Charter Passenger, Scheduled, Medevac, Positioning)
- Nama pelanggan, registrasi pesawat, dan nama pilot
- Prioritas penerbangan (Normal, High, Emergency)
- Status alur permintaan

**Interaksi & Business Rules:**

- Hanya permintaan berstatus Draft atau Rejected yang dapat disunting
- Pengajuan permintaan memicu alur persetujuan — pembuat tidak dapat menyetujui permintaan sendiri
- Permintaan yang disetujui secara otomatis menciptakan Flight Order terpisah

---

### 2.2 Buat Permintaan Penerbangan — `/flights/requests/new`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Staff OCC, Flight Coordinator

**Business Value:**

- Wizard terstruktur lima langkah memastikan tidak ada informasi kritis yang terlewat saat membuat permintaan penerbangan baru — krusial untuk lingkungan operasional Papua di mana kesalahan perencanaan bisa berakibat fatal
- Pratinjau tarif otomatis membantu estimasi pendapatan sejak fase perencanaan
- Deteksi kapasitas dan kelaikan pesawat sejak dini mencegah pemblokir di kemudian hari

**Fungsionalitas:**

- **Langkah 1 — Informasi Dasar:** Tanggal penerbangan, kategori penerbangan (Charter/Passenger/Cargo), jenis layanan, rute, pelanggan, jadwal perkiraan keberangkatan/kedatangan, sumber permintaan, prioritas, dan catatan operasional. Mendukung pemilihan templat jadwal untuk penerbangan berulang.
- **Langkah 2 — Penugasan Pesawat & Kru:** Pemilihan pesawat dengan pratinjau kelaikan dan kapasitas, penunjukan Pilot in Command (PIC) dan Co-pilot dari kandidat yang tersedia berdasarkan konteks perencanaan. Sistem mendeteksi peringatan: posisi pesawat tidak sesuai rute, lisensi PIC hampir kedaluwarsa, ketersediaan kru bermasalah.
- **Langkah 3 — Persiapan Manifest:** Estimasi jumlah penumpang dan berat kargo, kategori kargo (General, Perishable, Medical Supplies, AOG Parts, Dangerous Goods, Mail, Baggage), pemilihan profil kapasitas, dan penandaan barang berbahaya. Validasi kapasitas terhadap pesawat atau profil kapasitas yang dipilih.
- **Langkah 4 — Bahan Bakar & Stasiun:** Jenis bahan bakar (AVTUR, Jet A-1), volume permintaan, pemasok bahan bakar, penyedia penanganan darat, kebutuhan parkir, penanganan di tujuan, jenis penagihan, dan estimasi pendapatan. Pratinjau tarif otomatis menghitung estimasi berdasarkan rute, jenis layanan, dan pelanggan.
- **Langkah 5 — Tinjauan & Kirim:** Ringkasan lengkap seluruh input, pratinjau kesiapan (readiness preview), dan opsi simpan sebagai Draft atau langsung kirim untuk persetujuan.

**Data yang Ditampilkan:**

- Konteks perencanaan rute: kelayakan rute, kandidat kru, kandidat pesawat, templat jadwal, dan profil kapasitas
- Peringatan dan pemblokir dari sistem perencanaan
- Pratinjau tarif yang cocok berdasarkan parameter penerbangan

**Interaksi & Business Rules:**

- Validasi per langkah: tidak dapat lanjut tanpa data wajib (rute, jadwal, pelanggan untuk layanan komersial)
- Pemblokir perencanaan mencegah penyimpanan — pengguna harus menyelesaikan semua pemblokir terlebih dahulu
- Peringatan tidak memblokir tetapi ditampilkan di langkah tinjauan
- Estimasi pendapatan otomatis diisi dari pratinjau tarif yang cocok
- Profil kapasitas disesuaikan otomatis berdasarkan rute, pesawat, dan jenis layanan

---

### 2.3 Detail Permintaan Penerbangan — `/flights/requests/[id]`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Flight Coordinator, Operation Manager/Director

**Business Value:**

- Menyajikan informasi lengkap satu permintaan penerbangan beserta alur persetujuannya
- Mendukung pemisahan tugas (separation of duties): pembuat permintaan tidak dapat menyetujui permintaan sendiri
- Alur visual permintaan (Draft → Submitted → Approved → Converted) memberikan kejelasan status

**Fungsionalitas:**

- Informasi penerbangan lengkap: tanggal, rute, prioritas, jadwal, sumber permintaan, pelanggan, jenis penagihan, estimasi pendapatan
- Detail penugasan: pesawat, PIC, co-pilot, estimasi penumpang dan kargo, bahan bakar, barang berbahaya, kebutuhan parkir dan penanganan
- Tombol keputusan untuk persona berwenang: Setujui & Buat Pesanan, Tolak, atau Minta Revisi — masing-masing dengan alasan wajib
- Setelah disetujui, sistem membuat Flight Order baru dan menyediakan tautan langsung
- Alur status visual di panel samping

**Data yang Ditampilkan:**

- Seluruh data permintaan dari pembuatan hingga keputusan
- Catatan operasional dan alasan keputusan

**Interaksi & Business Rules:**

- Persona Director dapat mengambil keputusan; pembuat permintaan tidak dapat menyetujui permintaan sendiri
- Persetujuan menciptakan Flight Order baru yang terhubung
- Penolakan dan permintaan revisi memerlukan alasan tertulis
- Permintaan yang ditolak dapat disunting dan diajukan ulang

---

### 2.4 Flight Operations Board (Papan Penerbangan) — `/flights`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** OCC, Flight Coordinator, Operation Manager

**Business Value:**

- Pusat komando operasional utama — menampilkan seluruh Flight Order dari tahap kesiapan hingga penutupan
- Kartu ringkasan per status (Draft, Pending Readiness, Blocked, Ready for Approval, Scheduled, In Progress, Landed, Pending Closure) memberikan gambaran beban kerja operasional seketika
- Mendukung penyaringan multi-dimensi untuk menemukan penerbangan yang relevan

**Fungsionalitas:**

- Delapan kartu KPI status yang menghitung jumlah penerbangan per tahap siklus hidup
- Panel filter: pencarian teks, status penerbangan, jenis penerbangan, rute, dan pesawat
- Tabel operasional penerbangan dengan detail nomor penerbangan, rute, pesawat, status, dan persentase kesiapan
- Tombol cepat ke pembuatan permintaan penerbangan baru
- Penyegaran data manual

**Data yang Ditampilkan:**

- Nomor penerbangan, rute asal-tujuan, registrasi pesawat, status operasional terkini, persentase kesiapan
- Ringkasan jumlah per status

---

### 2.5 Flight Order Detail (Detail Pesanan Penerbangan) — `/flights/[id]`

**Status implementasi:** Fungsional penuh (sangat kompleks — 6 tab)  
**Pengguna utama:** OCC, Flight Coordinator, Operation Manager, Station Agent, Finance Reviewer

**Business Value:**

- Workspace komando tunggal untuk satu penerbangan — menggabungkan seluruh informasi operasional, komersial, dan keuangan dalam satu tampilan terstruktur
- Siklus hidup 12 tahap (Draft hingga Closed) dengan kontrol aksi yang ketat memastikan kepatuhan operasional
- Sistem kesiapan (readiness) multi-kategori (Aircraft, Crew, Manifest, Fuel, Station, Finance, Documents) memberikan jaminan kualitas sebelum penerbangan disetujui
- Deteksi konflik penugasan dan peringatan ketersediaan kru/pesawat
- Pemisahan tugas: pembuat permintaan tidak menyetujui, peninjau keuangan tidak mengubah data aktual

**Fungsionalitas:**

**Header & Ringkasan:**

- Nomor penerbangan, nomor pesanan, status terkini, rute, jenis layanan
- Tanggal penerbangan, jadwal keberangkatan/kedatangan, registrasi pesawat, nama PIC, progress kesiapan
- Strip status cepat: Manifest, Bahan Bakar, Penanganan, Keuangan
- Tombol aksi dinamis yang berubah sesuai status (Submit Order, Run Readiness Check, Approve, Schedule, Open/Close Check-in, Evaluate Departure Assurance, Record Departure, Record Landing, Start/Complete Closure)
- Menu aksi tambahan: batalkan penerbangan, alihkan (divert), buka kembali untuk koreksi

**Tab 1 — Overview:**

- Informasi penerbangan: nomor, jenis, tanggal, durasi, asal-tujuan, pelanggan, sumber permintaan, prioritas, catatan
- Ringkasan pesawat & kru: registrasi, tipe, kapasitas, stasiun terkini, kelaikan, jenis bahan bakar, jadwal perawatan, anggota kru
- Snapshot operasional: jumlah penumpang, berat kargo vs kapasitas, volume bahan bakar, penanganan stasiun, kesiapan, pemilik persetujuan, status penutupan, estimasi pendapatan
- Panel peringatan dan pengecualian (blocking issues) yang dapat diklik untuk detail
- Visualisasi siklus hidup mini

**Tab 2 — Readiness:**

- Ringkasan kesiapan keseluruhan: jumlah selesai dari total, status, jumlah pemblokir dan peringatan
- Pemeriksaan kesiapan terkelompok dalam tujuh kategori: Aircraft, Crew, Manifest, Fuel, Station, Finance, Documents
- Setiap pemeriksaan menampilkan nama, catatan hasil, dan status (Pass/Fail/Pending/Not Applicable)
- Tombol "Run Readiness Check" untuk mengevaluasi ulang kesiapan
- Klik pada pemeriksaan membuka drawer detail isu

**Tab 3 — Assignment:**

- Penugasan pesawat: registrasi, tipe, pabrikan, stasiun, kapasitas, jadwal perawatan
- Daftar pesawat alternatif dengan rekomendasi berdasarkan kelaikan
- Penugasan kru: peran, nama, kode karyawan, masa berlaku lisensi dan medis, stasiun, status ketersediaan
- Detektor konflik di panel samping: menampilkan pemblokir penugasan dengan rekomendasi tindakan
- Catatan dispatch dan instruksi kru
- Tombol "Change Aircraft" untuk mengubah penugasan pesawat (hanya pada status tertentu)

**Tab 4 — Status & Approval:**

- Linimasa siklus hidup 12 tahap dengan indikator tahap aktif dan selesai
- Tahap persetujuan: jenis persetujuan, peran penugasan, waktu permintaan, dan status
- Status terkini dan aksi berikutnya yang diizinkan
- Catatan pemisahan tugas

**Tab 5 — Related Records:**

- Panel terpisah untuk: Manifest Penumpang, Manifest Kargo, Permintaan Bahan Bakar, Penanganan Stasiun, dan Actual Penerbangan
- Setiap panel menampilkan ringkasan data dan tautan ke modul terkait
- Manifest penumpang: jumlah vs kapasitas, berat bagasi, status check-in
- Manifest kargo: berat vs kapasitas, jumlah AWB, status barang berbahaya
- Bahan bakar: pemasok, volume diminta/disetujui, estimasi biaya
- Penanganan stasiun: daftar layanan dengan status konfirmasi dan estimasi biaya
- Actual: waktu keberangkatan dan kedatangan sebenarnya

**Tab 6 — History:**

- Riwayat perubahan status penerbangan dengan aktor, waktu, dan tipe aksi
- Filter: All, Status changes, Approval actions, Readiness evaluations

**Data yang Ditampilkan:**

- Seluruh aspek operasional satu penerbangan: komersial, penugasan, kesiapan, biaya, manifest, dan riwayat
- Estimasi pendapatan vs biaya operasional (bahan bakar + stasiun + perawatan) untuk margin estimasi
- Persentase kesiapan dan detail pemblokir per kategori

**Interaksi & Business Rules:**

- Aksi tersedia berdasarkan status terkini dan izin pengguna (authorization)
- Pembuat permintaan tidak dapat menyetujui penerbangan yang sama
- Penutup penerbangan memerlukan seluruh prasyarat terpenuhi: actual departure/arrival, manifest final, actual fuel uplift, approved station cost, approved maintenance handoff
- Kontrol konkurensi: aksi tertentu (close check-in, mark ready for departure) memerlukan timestamp terkini untuk mencegah konflik
- Perubahan pesawat memicu evaluasi ulang kesiapan
- Perubahan data komersial juga memicu evaluasi ulang kesiapan

---

### 2.6 Manifest Control — `/flights/[id]/manifest`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** OCC Staff, Load Controller, Flight Coordinator

**Business Value:**

- Mengendalikan manifest penumpang dan kargo sebagai data muatan resmi penerbangan — penting untuk keselamatan dan kepatuhan regulasi
- Alur submit-approve-lock menjamin integritas data manifest sebelum penerbangan
- Tinjauan barang berbahaya (Dangerous Goods) terintegrasi dengan keputusan penerimaan/penolakan

**Fungsionalitas:**

- Dua kartu manifest terpisah: Penumpang/Pasien dan Kargo
- Setiap manifest menampilkan jumlah item, versi, status submit, dan status kunci
- Tabel penumpang: nama, identitas, nomor kursi, berat total (penumpang + bagasi)
- Tabel kargo: deskripsi, berat aktual, kategori barang berbahaya, status keputusan DG
- Alur aksi manifest: Submit to OCC → Approve → Lock Final, dengan opsi Reject dan Unlock (memerlukan alasan)
- Pratinjau kargo kosong: jika manifest dikirim tanpa item, sistem meminta deklarasi alasan (empty load declaration)
- Panel Departure Assurance di sisi kanan: daftar pemeriksaan keberangkatan dan tombol evaluasi
- Keputusan DG: terima atau tolak dengan alasan dan referensi bukti

**Data yang Ditampilkan:**

- Daftar penumpang dengan identitas, kursi, dan berat
- Daftar kargo dengan kategori barang berbahaya dan status penerimaan
- Versi manifest dan riwayat penolakan

**Interaksi & Business Rules:**

- Pemisahan peran: "may prepare" (pengisi) dan "may review" (peninjau) — peninjau tidak dapat mengisi dan sebaliknya
- Semua aksi memerlukan versi yang sesuai (optimistic concurrency) untuk mencegah konflik
- Reject dan Unlock memerlukan alasan tertulis
- Keputusan DG memerlukan alasan dan referensi bukti

---

### 2.7 Fuel Control (Pengendalian Bahan Bakar) — `/flights/fuel`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** OCC, Fuel Controller, Finance

**Business Value:**

- Mengelola siklus lengkap permintaan bahan bakar: permintaan → persetujuan → uplift aktual → posting keuangan
- Memastikan setiap penerbangan memiliki alokasi bahan bakar yang tepat sebelum operasional
- Menjembatani operasional dan keuangan dengan handoff biaya bahan bakar ke sistem billing

**Fungsionalitas:**

- Tabel daftar seluruh permintaan bahan bakar lintas penerbangan
- Kolom: penerbangan, pemasok, jenis bahan bakar, volume diminta, disetujui, aktual, total biaya, status
- Aksi per baris: Setujui (dari REQUESTED → APPROVED), catat Uplift (dari APPROVED → UPLIFTED dengan volume dan harga aktual), Posting ke keuangan (dari UPLIFTED → POSTED)
- Tautan langsung ke detail penerbangan terkait

**Data yang Ditampilkan:**

- Volume bahan bakar dalam liter pada setiap tahap: diminta, disetujui, aktual
- Biaya total berdasarkan harga per liter dan volume aktual
- Status alur: Requested, Approved, Uplifted, Posted

**Interaksi & Business Rules:**

- Alur bertahap: hanya dapat uplift setelah disetujui, hanya dapat posting setelah uplift tercatat
- Setiap aksi memperbarui status secara instan

---

### 2.8 Readiness Worklist — `/flights/readiness`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** OCC, Flight Coordinator, Operation Manager

**Business Value:**

- Worklist terpusat untuk penerbangan yang membutuhkan evaluasi kesiapan atau persetujuan
- Memisahkan penerbangan yang menunggu evaluasi kesiapan dari yang siap berangkat

**Fungsionalitas:**

- Daftar penerbangan berstatus PENDING_READINESS, BLOCKED, atau READY_FOR_APPROVAL
- Daftar terpisah untuk penerbangan berstatus CHECK_IN_CLOSED atau READY_FOR_DEPARTURE (siap berangkat)
- Aksi cepat: jalankan evaluasi kesiapan atau setujui penerbangan langsung dari worklist
- Pencarian berdasarkan teks bebas

**Data yang Ditampilkan:**

- Nomor penerbangan, rute, status, persentase kesiapan, dan alasan pemblokir

---

### 2.9 Actual Closure — `/flights/actual-closure`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** OCC, Flight Coordinator

**Business Value:**

- Worklist untuk memandu penerbangan melalui tahap-tahap akhir: dari keberangkatan hingga penutupan resmi
- Memastikan setiap penerbangan melalui seluruh tahap pencatatan actual sebelum ditutup

**Fungsionalitas:**

- Daftar penerbangan aktif (SCHEDULED hingga PENDING_CLOSURE, termasuk DIVERTED)
- Setiap baris menampilkan aksi berikutnya yang tersedia: Open Check-in, Depart, Land, Pending Closure, Diversion Closure, Close
- Pencatatan waktu aktual keberangkatan dan kedatangan melalui dialog
- Aksi langsung dari worklist untuk mempercepat penutupan

**Data yang Ditampilkan:**

- Status terkini, jadwal vs aktual, dan aksi yang diperlukan untuk setiap penerbangan aktif

---

### 2.10 Maintenance Handoff — `/flights/maintenance`

**Status implementasi:** Fungsional penuh (sangat kompleks)  
**Pengguna utama:** OCC, Maintenance Controller, Inventory/Parts Manager

**Business Value:**

- Menjembatani temuan teknis dari operasional penerbangan ke tim perawatan
- Mengintegrasikan penggunaan suku cadang dari inventori ke dalam catatan perawatan penerbangan
- Mendukung kategorisasi perawatan (Routine, Minor Repair, Heavy Maintenance, Major Replacement)

**Fungsionalitas:**

- Daftar handoff perawatan dari seluruh penerbangan
- Filter: pencarian, tanggal, stasiun, kelaikan, dan status
- Dialog pengeluaran suku cadang (part issue): pemilihan gudang, kategori perawatan, alasan, dan detail suku cadang (part, jumlah, nomor seri)
- Setiap handoff menampilkan estimasi biaya perawatan dan status persetujuan
- Integrasi dengan inventori: pilihan suku cadang berdasarkan ketersediaan di gudang

**Data yang Ditampilkan:**

- Nomor penerbangan, deskripsi temuan, kategori perawatan, biaya estimasi, status handoff
- Detail suku cadang yang digunakan: nomor part, jumlah, nomor seri, catatan

**Interaksi & Business Rules:**

- Pengeluaran suku cadang mengurangi stok inventori secara real-time
- Hanya personel dengan izin maintenance.handoff.update yang dapat menyetujui

---

### 2.11 Flight Following (Pemantauan Penerbangan) — `/ops/flight-following`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** OCC Duty Manager, Flight Follower

**Business Value:**

- Linimasa operasional langsung dari catatan penerbangan — memungkinkan OCC memantau seluruh penerbangan aktif secara real-time
- Indikator urgensi (kritis, peringatan, normal) membantu memprioritaskan perhatian
- Informasi keterlambatan dan alasan pemblokir langsung terlihat

**Fungsionalitas:**

- Tabel menyeluruh seluruh penerbangan dengan kolom: penerbangan, rute, jadwal/aktual keberangkatan, jadwal/aktual kedatangan, pesawat, status, keterlambatan, kesiapan, aksi berikutnya
- Filter: tanggal penerbangan, status, dan stasiun
- Kode warna urgensi: merah untuk kritis, kuning untuk peringatan, hijau untuk normal
- Tautan langsung ke detail penerbangan

**Data yang Ditampilkan:**

- Waktu terjadwal vs aktual (WIT — Waktu Indonesia Timur)
- Persentase kesiapan progress bar
- Alasan pemblokir dan aksi berikutnya yang diperlukan

---

## 3. STATION OPERATIONS (OPERASI STASIUN)

### 3.1 Station Operations Dashboard — `/flights/station-operations`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Station Agent, Station Manager, OCC

**Business Value:**

- Dashboard operasional per stasiun untuk hari operasi tertentu — penting untuk station agent di lokasi terpencil yang mengelola beberapa penerbangan simultan
- KPI real-time: penerbangan masuk/keluar, penerbangan perlu tindakan, penumpang check-in/boarded, layanan tertunda, biaya tertunda
- Priority Flight Board menampilkan penerbangan yang membutuhkan perhatian pertama, diurutkan berdasarkan kesiapan dan keterlambatan
- Attention Queue menunjukkan jumlah item yang memerlukan tindak lanjut di masing-masing area: verifikasi, layanan, biaya, kesiapan penerbangan

**Fungsionalitas:**

- Enam kartu KPI: Inbound, Outbound, Needing Action, Pax Check-in/Boarded, Pending Services, Pending Costs
- Priority Flight Board: tabel prioritas dengan waktu, nomor penerbangan, rute, status, kesiapan, penumpang/kargo
- Attention Queue: daftar item perhatian dengan tautan ke area terkait
- Panel Penumpang & Kargo: checked-in, boarded, load factor, berat kargo, jumlah kiriman
- Panel Layanan & Biaya: requested, confirmed, completed services; draft, submitted, approved costs

**Data yang Ditampilkan:**

- Data operasional stasiun terfilter berdasarkan tanggal operasi dan stasiun yang dipilih
- Status kesiapan setiap penerbangan di stasiun tersebut

---

### 3.2 Station Flight Workspace — `/flights/station-operations/[flightId]`

**Status implementasi:** Fungsional penuh (sangat kompleks — 6 tab)  
**Pengguna utama:** Station Agent, OCC, Verifikator

**Business Value:**

- Workspace terpadu untuk mengelola seluruh aspek operasional satu penerbangan di tingkat stasiun
- Sistem fase operasi (Origin Departure, Destination Arrival, Destination Closure) memastikan penyelesaian tugas secara berurutan
- Verifikasi berbasis bukti (evidence-based) dengan dukungan unggah dokumen
- Dual sign-off: verifikasi stasiun harus selesai sebelum persetujuan OCC — memastikan akuntabilitas berlapis

**Fungsionalitas:**

**Ringkasan Penerbangan:**

- Jadwal dan aktual keberangkatan/kedatangan, tipe pesawat, beban penumpang, berat kargo
- Pemilihan fase operasional dengan progress bar dan chip status

**Tab 1 — Tasks:**

- Daftar tugas verifikasi per fase: penanganan origin/destination, sign-off stasiun, dll.
- Setiap tugas menampilkan status, kode tugas, stasiun, versi, jumlah bukti, dan keputusan stasiun/OCC
- Aksi: Start, Verify, Reject (masing-masing dengan permission guard)
- Deteksi pemblokir: tugas yang memerlukan bukti belum memiliki bukti, tugas handling harus dikonfirmasi sebelum sign-off
- Panel readiness fase dan status sign-off di sisi kanan

**Tab 2 — Services:**

- Layanan stasiun terkait penerbangan: handling, parking, dll.
- Status: Requested, Confirmed, Completed, Rejected, Cancelled
- Aksi: Konfirmasi atau Tolak layanan
- Tarif referensi dan nama pemasok

**Tab 3 — Evidence & Sign-off:**

- Register bukti dokumen yang diunggah untuk tugas-tugas di fase terpilih
- Setiap bukti: nama file, tugas terkait, waktu unggah, catatan, dan tautan untuk melihat file
- Panel dual sign-off: status keputusan stasiun dan OCC, dengan tombol OCC Approve

**Tab 4 — Costs:**

- Biaya stasiun terkait penerbangan: kategori, vendor, deskripsi, jumlah, status
- Status: Draft, Submitted, Approved, Rejected, Void
- Aksi: Submit dari Draft, Approve dari Submitted
- Catatan bahwa kepemilikan akuntansi tetap di Accounting Workbench

**Tab 5 — Reconciliation:**

- Rekonsiliasi beban aktual: penumpang planned vs aktual, kargo planned vs aktual, no-show passengers, offloaded cargo
- Deteksi selisih dan kewajiban catatan selisih
- Simpan rekonsiliasi dengan validasi

**Tab 6 — Audit:**

- Jejak audit lengkap: aktor, peran, modul, aksi, status sebelum/sesudah, alasan, timestamp

**Data yang Ditampilkan:**

- Seluruh aspek operasional stasiun untuk satu penerbangan: tugas, layanan, bukti, biaya, rekonsiliasi, dan jejak audit

**Interaksi & Business Rules:**

- Verifikasi memerlukan bukti terlampir untuk tugas yang mewajibkan bukti
- Sign-off stasiun harus selesai sebelum OCC dapat menyetujui
- Selisih rekonsiliasi memerlukan catatan penjelasan
- Setiap aksi memerlukan versi yang sesuai (optimistic concurrency)
- Permission guards pada setiap aksi

---

### 3.3 Station Services Board — `/flights/station-operations/services`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Station Agent, OCC

**Business Value:**

- Papan harian seluruh layanan stasiun (handling, parking) untuk semua penerbangan
- Memudahkan koordinasi dengan vendor penanganan darat

**Fungsionalitas:**

- Tabel layanan: penerbangan, jenis, pemasok, tarif referensi, status
- Filter: pencarian, jenis (HANDLING/PARKING), status
- Aksi konfirmasi langsung dari papan
- Tombol "Create Service" untuk menambah layanan baru
- Tautan ke workspace penerbangan untuk detail

---

### 3.4 Station Costs Board — `/flights/station-operations/costs`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Station Agent, Finance, OCC

**Business Value:**

- Papan harian seluruh biaya operasional stasiun — penting untuk pengendalian biaya di tingkat stasiun
- Alur: Draft → Submitted → Approved, dengan penolakan sebagai opsi

**Fungsionalitas:**

- Tabel biaya: penerbangan, kategori, vendor, deskripsi, jumlah, status
- Filter: pencarian dan status
- Aksi: Create Cost, Submit, Approve
- Tautan ke workspace penerbangan untuk detail

---

### 3.5 Operational Verification — `/flights/station-operations/verification`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Verifikator Operasional, OCC

**Business Value:**

- Papan terpusat untuk seluruh tugas verifikasi operasional lintas penerbangan
- Memastikan setiap tugas diverifikasi dengan bukti yang memadai sebelum ditandatangani

**Fungsionalitas:**

- Tabel tugas verifikasi: penerbangan, kode tugas, judul, fase, status
- Filter: pencarian, fase, status
- Aksi: Start, Verify, Reject dengan manajemen bukti
- Tautan ke workspace penerbangan untuk konteks lengkap

---

### 3.6 Station Audit Trail — `/flights/station-operations/audit`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Auditor, Compliance, OCC

**Business Value:**

- Jejak audit lengkap seluruh aksi operasional stasiun — penting untuk kepatuhan regulasi penerbangan dan audit internal

**Fungsionalitas:**

- Tabel log audit: waktu, aktor, peran, modul, aksi, status sebelum/sesudah, alasan
- Tidak ada aksi yang dapat dilakukan — halaman ini read-only untuk keperluan audit

---

### 3.7 Station Reports — `/flights/station-operations/reports`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Station Manager, OCC, Manajemen

**Business Value:**

- Laporan operasional stasiun: rekap harian penerbangan, layanan, biaya, dan verifikasi
- Mendukung evaluasi kinerja stasiun dan identifikasi area perbaikan

**Fungsionalitas:**

- Ringkasan operasional harian dengan metrik kunci
- breakdown penerbangan, layanan, dan biaya
- Status verifikasi dan penyelesaian tugas

---

## 4. TICKETING (PENJUALAN TIKET & KARGO)

### 4.1 Booking Portal — `/ticketing/booking`

**Status implementasi:** Fungsional (komponen feature)  
**Pengguna utama:** Agent Ticketing, Staff Commercial

**Business Value:**

- Portal pemesanan terpadu untuk penumpang dan kargo — titik masuk komersial utama
- Mengintegrasikan ketersediaan penerbangan dengan proses booking

**Fungsionalitas:**

- Portal pemesanan yang menggabungkan alur penumpang dan kargo
- Komponen feature BookingPortal yang menangani seluruh logika pemesanan

---

### 4.2 Passenger Manifest — `/ticketing/passenger`

**Status implementasi:** Fungsional (komponen feature)  
**Pengguna utama:** Agent Ticketing, Check-in Agent

**Business Value:**

- Manajemen manifest penumpang dari pemesanan hingga check-in
- Mendukung penugasan kursi dan pencatatan berat penumpang/bagasi

**Fungsionalitas:**

- Komponen PassengerManifestPage yang menangani daftar penumpang, penugasan kursi, dan status check-in

---

### 4.3 Cargo Tracking — `/ticketing/cargo`

**Status implementasi:** Fungsional (komponen feature)  
**Pengguna utama:** Agent Kargo, Warehouse Staff

**Business Value:**

- Pelacakan kargo dari penerimaan hingga pemuatan
- Manajemen Air Waybill (AWB) dan kategorisasi barang berbahaya

**Fungsionalitas:**

- Komponen CargoTrackingPage yang menangani pelacakan kiriman kargo

---

### 4.4 Ticketing Finance — `/ticketing/finance`

**Status implementasi:** Fungsional (komponen feature)  
**Pengguna utama:** Finance, Commercial Manager

**Business Value:**

- Rekonsiliasi keuangan dari aktivitas ticketing: pendapatan tiket dan kargo
- Menjembatani data komersial ke sistem billing

---

### 4.5 Ticketing Management — `/ticketing/management`

**Status implementasi:** Fungsional (komponen feature)  
**Pengguna utama:** Commercial Manager, Manajemen

**Business Value:**

- Dashboard manajemen ticketing: volume penjualan, rute terpopuler, dan metrik komersial

---

### 4.6 Commercial Contracts & Subsidies — `/marketing/contracts-subsidies`

**Status implementasi:** Fungsional read model persisten  
**Pengguna utama:** Commercial Manager, Finance Reviewer, Direksi

**Business Value:**

- Menyatukan portfolio customer contract, agent contract, dan rate-linked contract tanpa membuat source of truth kontrak kedua
- Memantau program subsidi berdasarkan allocated, recognized consumption, remaining budget, dan absorption
- Menyoroti contract yang akan berakhir dan renewal yang membutuhkan review
- Menjaga batas Finance: invoice, payment, dan journal tidak dapat diubah dari halaman ini

**Fungsionalitas:**

- Delapan tab: Overview, Contracts, Subsidies, Absorption, Rates & Terms, Documents, Activity, History
- Lazy loading per tab dan active tab pada query parameter
- Portfolio contract dengan partner, effective period, status, renewal, linked rate, subsidy, dan document
- Program subsidi dengan sponsor, scope layanan/rute, budget minor-unit, absorption, lifecycle, dan `asOf`
- Consumption ledger read-only berdasarkan source transaction dan status recognition
- Documents dari Uploads/Documents, activity dari business projection, dan history dari audit log

**Batasan:**

- Modul saat ini berorientasi monitoring/read model; create/update contract dan subsidy program belum menjadi workbench transaksi lengkap
- `unbilledExposureMinor` belum memiliki projection canonical dan saat ini dapat bernilai `null`

## 5. FINANCE (KEUANGAN)

### 5.1 Finance Dashboard — `/finance/dashboard`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Finance Manager, Direksi, Accounting

**Business Value:**

- Ringkasan posted ledger, receivable risk, cash position, dan profitabilitas operasional dalam satu tampilan
- Kontrol cepat terhadap Trial Balance, accounting exceptions, status periode, dan posted journals
- Margin per lini bisnis berdasarkan immutable invoice finance snapshot
- Analisis pendapatan rute dari invoice snapshot yang terhubung ke Flight Operations
- Panel tindakan untuk overdue receivable, exception Accounting, dan absorption contract/subsidy

**Data yang Ditampilkan:**

- KPI: recognized revenue, operating expense, net result, cash position, overdue receivable
- Status kontrol ledger dan accounting period
- Margin per lini bisnis (Charter, Passenger, Cargo)
- Peringkat rute berdasarkan pendapatan
- Item tindakan dengan tingkat urgensi

**Source of Truth dan Rules:**

- Revenue/expense/cash berasal dari journal lines berstatus `POSTED`
- Overdue AR berasal dari invoice dan payment, bukan field dashboard
- HPP berasal dari `invoice_finance_snapshots`
- Dashboard hanya mengagregasi IDR dan tidak menjumlahkan mata uang berbeda

---

### 5.2 Breakdown HPP — `/finance/hpp`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Finance Manager, Accounting, Analisis Biaya

**Business Value:**

- Membandingkan revenue, operational cost, gross profit, dan gross margin per lini bisnis
- Menelusuri komposisi canonical fuel, station services, dan maintenance cost
- Mempertahankan total immutable invoice snapshot saat shared flight cost dialokasikan
- Mendukung keputusan pricing tanpa menulis ulang invoice atau posted journal

**Data yang Ditampilkan:**

- Pendapatan, HPP, gross profit, dan gross margin per lini bisnis
- Breakdown biaya: fuel, station services, dan maintenance
- Perbandingan gross margin dalam format diagram batang
- Metode alokasi eksplisit: revenue share per flight

---

### 5.3 Accounting Workbench — `/finance/accounting`

**Status implementasi:** Fungsional penuh (sangat kompleks — 6 tab)  
**Pengguna utama:** Accounting Staff, Finance Manager, Auditor

**Business Value:**

- Workbench akuntansi berbasis kebijakan (policy-driven) — menjembatani event operasional ke jurnal umum
- Antrian posting terpusat untuk jurnal yang menunggu persetujuan atau posting
- Pendeteksian pengecualian (exceptions) akuntansi secara otomatis
- Kebijakan akuntansi yang dapat dikonfigurasi dan diaudit
- Komponen aset dengan pratinjau depresiasi

**Fungsionalitas:**

**Empat Kartu Ringkasan:** Posting Queue, Posted Journals, Open Exceptions, Asset Components

**Tab 1 — Posting Queue:**

- Daftar jurnal berstatus Draft, Pending Approval, atau Approved
- Aksi: Submit, Approve, Post — masing-masing dengan permission guard
- Proses event inventori: memicu pembuatan jurnal dari transaksi inventori
- Kebijakan akuntansi ditampilkan untuk konteks

**Tab 2 — General Journal:**

- Daftar jurnal yang sudah posted atau reversed
- Filter berdasarkan status
- Aksi: Reverse (untuk jurnal posted yang belum direvers)
- Buka detail jurnal dengan jejak lengkap

**Tab 3 — General Ledger:**

- Daftar baris buku besar dengan filter berdasarkan jurnal
- Tautan ke detail jurnal terkait

**Tab 4 — Exceptions:**

- Daftar pengecualian akuntansi (OPEN status)
- Filter berdasarkan status

**Tab 5 — Policies:**

- Daftar kebijakan akuntansi yang aktif

**Tab 6 — Asset Components:**

- Daftar aset dengan pratinjau depresiasi
- Buka detail jurnal terkait atau pratinjau jadwal depresiasi

**Data yang Ditampilkan:**

- Jurnal: nomor, deskripsi, status, debit/kredit, referensi
- Buku besar: akun, jurnal, debit, kredit, saldo
- Pengecualian: deskripsi, status, sumber
- Kebijakan: nama, deskripsi, status aktif
- Aset: nomor aset, nilai perolehan, akumulasi depresiasi, nilai buku

**Interaksi & Business Rules:**

- Alur jurnal: Draft → Submit → Pending Approval → Approve → Post
- Reverse hanya untuk jurnal POSTED yang belum direvers
- Process inventory events menciptakan jurnal baru dari transaksi inventori
- Permission guard: finance.accounting.post diperlukan untuk posting dan proses event
- Self-approval dihindari: pembuat tidak menyetujui jurnal sendiri

---

### 5.4 Trial Balance (Neraca Saldo) — `/finance/trial-balance`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Accounting, Finance Manager, Auditor

**Business Value:**

- Validasi posisi saldo akun terhadap saldo normal Chart of Accounts
- Deteksi saldo abnormal (bertentangan dengan posisi normal) dan kas negatif
- Ekspor CSV untuk audit eksternal atau analisis lanjutan

**Data yang Ditampilkan:**

- Seluruh akun dalam Chart of Accounts dengan: kode, nama, kategori (Aset, Kewajiban, Ekuitas, Pendapatan, Beban), debit, kredit, saldo normal, saldo aktual
- Total debit dan kredit dengan indikator balance/tidak balance
- Jumlah saldo abnormal dan kas negatif
- Subtotal per kategori

**Interaksi & Business Rules:**

- Pencarian berdasarkan kode atau nama akun
- Filter berdasarkan kategori
- Ekspor CSV
- Kolom dapat dilipat per kategori
- Indikator visual: hijau untuk balance, merah untuk tidak balance, ikon peringatan untuk abnormal
- Hanya posted journal sampai akhir accounting period yang masuk perhitungan
- Saldo akun mengikuti normal balance Chart of Accounts
- Data dihitung backend dan tidak disimpan sebagai saldo editable kedua

---

## 6. INVOICES (PENAGIHAN)

### 6.1 Invoice List — `/invoices`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Finance, Billing Staff, Commercial Manager

**Business Value:**

- Daftar faktur penerbangan yang telah ditutup (closed-flight) dengan pendapatan, biaya operasional, dan margin
- Memantau status penagihan: Draft, Issued, Partially Paid, Paid, Overdue, Void
- Metrik cepat: jumlah faktur, total pendapatan, margin, dan saldo tertunggak

**Fungsionalitas:**

- Tabel faktur: nomor, pelanggan/penerbangan, pendapatan, biaya, margin, pajak/total, jatuh tempo, status
- Filter: pencarian teks, status, pelanggan, jatuh tempo (All/Upcoming/Overdue)
- Kartu metrik: jumlah, pendapatan terlihat, margin terlihat, saldo terlihat
- Badge jumlah filter aktif
- Tampilan responsif: tabel di desktop, kartu di mobile

**Data yang Ditampilkan:**

- Nomor faktur, pelanggan, penerbangan terkait, rute
- Pendapatan, biaya operasional, margin bruto
- Pajak, total, saldo tertunggak
- Tanggal jatuh tempo dan status pembayaran

---

### 6.2 Invoice Detail — `/invoices/[id]`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Finance, Billing Staff, Finance Reviewer

**Business Value:**

- Detail lengkap satu faktur: lini pendapatan, biaya operasional, pajak, pembayaran, dan linimasa handoff keuangan
- Persetujuan faktur dengan pemisahan tugas: pembuat tidak dapat menyetujui faktur sendiri

**Fungsionalitas:**

- Empat kartu KPI: Revenue, Operational Cost, Gross Margin, Balance Due
- Tabel Revenue Lines: sumber, deskripsi, jumlah, basis, pajak, total
- Panel Operational Cost: breakdown Fuel, Station, Maintenance
- Panel Billing: subtotal, pajak, paid, tanggal terbit, jatuh tempo
- Finance Handoff Timeline: event handoff dari operasional ke keuangan
- Payments: daftar pembayaran dengan referensi, tanggal, dan jumlah
- Tombol Approve Invoice (hanya untuk status Draft dan dengan izin)

**Data yang Ditampilkan:**

- Seluruh lini pendapatan dengan detail sumber, pajak, dan total
- Breakdown biaya operasional
- Linimasa handoff keuangan
- Riwayat pembayaran

**Interaksi & Business Rules:**

- Approval: hanya untuk status Draft, pembuat tidak dapat menyetujui sendiri
- Tanggal jatuh tempo mengikuti syarat pembayaran pelanggan, dengan fallback 14 hari

---

## 7. INVENTORY (PENGENDALIAN PERSEDIAAN)

### 7.1 Inventory Dashboard — `/inventory`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Inventory Manager, Procurement, Maintenance

**Business Value:**

- Pusat kendali inventori suku cadang dan material penerbangan
- Delapan KPI: available parts, low stock, expiring lots, certificate alerts, quarantine, open PR, open PO, FIFO valuation
- Gerakan inventori terbaru untuk audit trail

**Data yang Ditampilkan:**

- Statistik inventori real-time
- Daftar gerakan terbaru: nomor gerakan, tipe, stasiun, alasan, status, waktu

**Interaksi & Business Rules:**

- Valuasi FIFO hanya terlihat untuk pengguna dengan izin inventory.valuation.read

---

### 7.2 Stock Availability — `/inventory/stock`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Inventory Staff, Maintenance, Procurement

**Business Value:**

- Ketersediaan stok suku cadang per lokasi (gudang/bin) — kritis untuk menjaga kelaikan pesawat
- Transfer dan penyesuaian stok langsung dari tampilan
- Pelacakan lot dan tanggal kedaluwarsa

**Fungsionalitas:**

- Tabel stok: part number, lokasi (gudang/stasiun/bin), lot/kedaluwarsa, kondisi, on-hand, available, nilai FIFO
- Filter: pencarian, gudang, low stock only
- Aksi Transfer: pilih bin tujuan, jumlah, nomor seri (untuk pelacakan serial), alasan
- Aksi Adjustment: selisih jumlah, biaya unit, alasan

**Data yang Ditampilkan:**

- Part number, nama, lokasi lengkap, nomor lot, tanggal kedaluwarsa, kondisi, unit of measure
- Jumlah on-hand dan available
- Nilai FIFO (tergantung izin)

**Interaksi & Business Rules:**

- Transfer memerlukan bin tujuan, jumlah valid, dan alasan
- Untuk pelacakan SERIAL: nomor seri harus dipilih sesuai jumlah
- Adjustment hanya untuk pelacakan QUANTITY (bukan SERIAL)
- Permission guard: inventory.transfer dan inventory.adjust

---

### 7.3 Halaman Inventori Lainnya

Berikut halaman inventori tambahan yang melengkapi ekosistem pengendalian persediaan:

| Halaman           | Route                          | Deskripsi Singkat                                            |
| ----------------- | ------------------------------ | ------------------------------------------------------------ |
| Movements         | `/inventory/movements`         | Audit trail seluruh pergerakan inventori                     |
| Parts             | `/inventory/parts`             | Katalog suku cadang (master data)                            |
| Purchase Requests | `/inventory/purchase-requests` | Permintaan pembelian suku cadang                             |
| Purchase Orders   | `/inventory/purchase-orders`   | Pesanan pembelian ke vendor                                  |
| Receipts          | `/inventory/receipts`          | Penerimaan barang dari PO                                    |
| Repairables       | `/inventory/repairables`       | Pelacakan suku cadang yang dapat diperbaiki (serial-tracked) |
| Warehouses        | `/inventory/warehouses`        | Master data gudang dan bin                                   |

---

## 8. CORPORATE ASSETS (ASET KANTOR)

### 8.1 Asset Overview — `/asset-management/overview`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Asset Manager, Finance, Maintenance

**Business Value:**

- Pandangan keseluruhan aset korporat (non-pesawat): kendaraan, peralatan bandara, gedung, dll.
- Status operasional: total aset, serviceable, under maintenance, audit discrepancies
- Peringatan asuransi: polis yang akan kedaluwarsa dalam 30 hari dan yang sudah kedaluwarsa
- Pandangan keuangan (read-only dari Accounting): kapitalisasi aset, nilai perolehan, nilai buku

**Data yang Ditampilkan:**

- KPI operasional aset
- Status asuransi
- Proyeksi keuangan dari Accounting (jika izin tersedia)

---

### 8.2 Maintenance Queue — `/asset-management/maintenance`

**Status implementasi:** Fungsional penuh  
**Pengguna utama:** Asset Manager, Maintenance

**Business Value:**

- Antrian work order perawatan aset korporat
- Stok hanya dikonsumsi melalui pengeluaran suku cadang dari inventori

**Fungsionalitas:**

- Tabel work order: nomor, aset, stasiun, prioritas, status, ringkasan
- Tautan ke detail aset

---

### 8.3 Asset Register — `/asset-management/register`

**Status implementasi:** Fungsional  
**Pengguna utama:** Asset Manager

**Business Value:**

- Katalog seluruh aset korporat dengan detail kelengkapan

---

### 8.4 Asset Detail — `/asset-management/assets/[id]`

**Status implementasi:** Fungsional  
**Pengguna utama:** Asset Manager, Maintenance

**Business Value:**

- Detail lengkap satu aset korporat: spesifikasi, riwayat perawatan, dan status keuangan

---

## 9. MASTER DATA (DATA INDUK)

Master data memiliki 19 kelompok route utama yang menjadi fondasi modul operasional, komersial, dan keuangan. Sebagian besar memiliki halaman list dan detail; Employees/Departments saat ini tersedia sebagai backend master/options untuk Corporate Assets tetapi belum memiliki halaman Vue tersendiri.

| Entitas                    | Route                                     | Deskripsi Bisnis                                                                                                        |
| -------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Aircraft                   | `/master-data/aircraft`                   | Katalog pesawat: registrasi, tipe, kapasitas, kelaikan                                                                  |
| Stations                   | `/master-data/stations`                   | Stasiun penerbangan: kode, nama, kapabilitas (fuel, handling, parking)                                                  |
| Routes                     | `/master-data/routes`                     | Rute penerbangan: asal-tujuan, jarak, waktu tempuh                                                                      |
| Customers                  | `/master-data/customers`                  | Customer account, contacts, payment term, credit configuration, Finance exposure, contracts, notes, dan history         |
| Personnel                  | `/master-data/personnel`                  | Kru: historical licenses/medical, qualifications, readiness, flying-hours read model, documents, dan audit              |
| Agents                     | `/master-data/agents`                     | Commercial channel, contacts, lifecycle, effective commission rules, rates, contracts, activity, dan audit              |
| Vendors                    | `/master-data/vendors`                    | Vendor/pemasok jasa dan barang                                                                                          |
| Cost Categories            | `/master-data/cost-categories`            | Kategori biaya operasional                                                                                              |
| Currencies                 | `/master-data/currencies`                 | Mata uang yang digunakan dalam transaksi                                                                                |
| Payment Terms              | `/master-data/payment-terms`              | Syarat pembayaran pelanggan                                                                                             |
| Tax Codes                  | `/master-data/tax-codes`                  | Kode pajak dan tarif                                                                                                    |
| Fuel Suppliers             | `/master-data/fuel-suppliers`             | Pemasok bahan bakar per stasiun                                                                                         |
| Handling/Parking Suppliers | `/master-data/handling-parking-suppliers` | Pemasok jasa penanganan darat dan parkir                                                                                |
| Flight Reasons             | `/master-data/flight-reasons`             | Alasan/kategori penerbangan                                                                                             |
| Flight Schedule Templates  | `/master-data/flight-schedule-templates`  | Templat jadwal penerbangan berulang                                                                                     |
| Flight Capacity Profiles   | `/master-data/flight-capacity-profiles`   | Profil kapasitas per rute-pesawat-layanan                                                                               |
| Chart of Accounts          | `/master-data/chart-of-accounts`          | Bagan akun (COA) untuk akuntansi                                                                                        |
| Rates                      | `/master-data/rates`                      | Effective-dated dan versioned pricing, deterministic selection, backend preview, contract/channel coverage, dan history |
| DG Categories              | `/master-data/dg-categories`              | Kategori barang berbahaya (Dangerous Goods)                                                                             |

### 9.1 Detail Customer Account

Halaman detail Customer memiliki tab Overview, Contacts, Financial, Rates & Terms, Documents, Contracts, Activity, Notes, dan History. Payment Term ditampilkan sebagai relation summary; current exposure dihitung dari invoice/payment; available credit dihitung backend; dan credit hold ditempatkan/dilepas melalui command dengan alasan serta audit.

### 9.2 Detail Commercial Agent

Halaman detail Agent membedakan Station, Customer/Partner, Personnel, Contact, Rates, Contracts, dan Finance. Commission rule memiliki effective period, basis points atau fixed minor amount, status lifecycle, version, serta snapshot calculation. Suspended/archived agent diblokir untuk penggunaan baru sesuai lifecycle guard.

### 9.3 Detail Fare & Rate Card

Halaman Rate Card menampilkan relation summary Station, Customer, Agent, Contract, Currency, dan Tax. Backend menyediakan preview money-safe, scope validation, ambiguity detection `RATE_SELECTION_AMBIGUOUS`, lifecycle command, duplicate flow, dan version creation untuk rate aktif yang sudah digunakan.

### 9.4 Detail Personnel

License dan medical disimpan sebagai record historis terpisah. Readiness tidak hanya melihat availability, tetapi employment, license, medical, dan qualification. Flying hours berasal dari completed Flight Operations; document dan history berasal dari modul canonical terkait.

---

## 10. HALAMAN PENDUKUNG

### 10.1 File Uploads — `/uploads`

**Status implementasi:** Fungsional  
**Pengguna utama:** Seluruh pengguna yang mengunggah dokumen

**Business Value:**

- Manajemen file unggahan untuk bukti operasional, dokumen pendukung, dan lampiran

**Fungsionalitas:**

- Unggah file baru dengan drag-and-drop atau pemilihan file
- Daftar file yang telah diunggah: nama, ukuran, waktu unggah
- Hapus file yang tidak diperlukan

---

### 10.2 Admin Access Demo — `/admin/access-demo`

**Status implementasi:** Fungsional (Demo)  
**Pengguna utama:** Administrator, Demo Operator

**Business Value:**

- Mengelola persona dan izin pengguna untuk keperluan demo
- Mendemonstrasikan bagaimana pemisahan tugas dan kontrol akses bekerja dalam sistem

---

## RINGKASAN STATUS IMPLEMENTASI

| Kelompok route filesystem | Jumlah halaman Vue | Catatan                                                                              |
| ------------------------- | :----------------: | ------------------------------------------------------------------------------------ |
| Root & Dashboard          |         2          | Login/demo entry dan Aviation Dashboard                                              |
| Flight Operations         |         22         | Termasuk requests, manifest, readiness, closure, maintenance, dan Station Operations |
| Ops                       |         3          | Flight Following dan 2 compatibility redirect                                        |
| Ticketing                 |         5          | Booking, passenger, cargo, ledger, management                                        |
| Finance                   |         4          | Dashboard, Accounting, HPP, Trial Balance                                            |
| Invoices                  |         2          | List dan detail                                                                      |
| Inventory                 |         9          | Dashboard ditambah 8 workbench                                                       |
| Corporate Assets          |         4          | Overview, register, maintenance, detail                                              |
| Master Data               |         38         | 19 kelompok route list/detail                                                        |
| Marketing                 |         1          | Contracts & Subsidies                                                                |
| Admin & Uploads           |         2          | Access demo dan document upload                                                      |
| **TOTAL**                 |       **92**       | Dihitung langsung dari `app/pages/**/*.vue`                                          |

### Catatan:

- **Halaman redirect** (2): `/ops/flights/[id]` dan `/ops/flight-closure/[id]` mengarahkan ke `/flights/[id]`
- **Halaman redirect** (1): `/flights/aircraft` mengarahkan ke `/master-data/aircraft`
- **Manifest Worklist**: `/flights/manifest` sudah menjadi worklist persisten yang memfilter flight aktif dan membuka workspace manifest per flight.
- **Komponen feature** (5 halaman ticketing): Menggunakan komponen feature terpisah yang diimpor langsung; logika bisnis ada di dalam komponen tersebut
- **Data aplikasi**: alur utama menggunakan Nuxt Server API dan SQLite lokal yang di-seed untuk skenario demo; bukan backend produksi AMA.
- **Finance Dashboard, HPP, dan Trial Balance** sudah menggunakan reporting service persisten. Ketiganya tidak lagi bergantung pada `useFinanceDemoData`.
- **Contracts & Subsidies** saat ini merupakan portfolio/read model; workbench authoring kontrak dan program subsidi masih menjadi pengembangan lanjutan.
- **Multi-currency** tersedia pada master dan transaksi tertentu, tetapi reporting Finance saat ini hanya mengagregasi IDR tanpa FX conversion.
- **Money legacy**: beberapa kolom header invoice/payment masih menggunakan SQLite `REAL`; line item dan finance snapshot sudah menggunakan integer minor-unit. Normalisasi end-to-end masih diperlukan.

---

## CATATAN ARSITEKTUR BISNIS

### Alur Operasional End-to-End:

```
Permintaan Penerbangan → Persetujuan → Flight Order → Readiness Check →
Penugasan Pesawat & Kru → Persetujuan → Penjadwalan → Check-in →
Departure Assurance → Keberangkatan → Kedatangan → Penutupan →
Rekonsiliasi → Penagihan (Invoice) → Pembayaran
```

### Pemisahan Tugas (Separation of Duties):

- Pembuat permintaan ≠ Penyetuju permintaan
- Peninjau manifest ≠ Pengisi manifest
- Pembuat faktur ≠ Penyetuju faktur
- Verifikasi stasiun harus selesai sebelum persetujuan OCC
- Peninjau keuangan tidak dapat mengubah data aktual penerbangan

### Integrasi antar Modul:

- **Flight Operations** ↔ **Manifest** ↔ **Fuel** ↔ **Station Ops** ↔ **Maintenance** → **Invoices** → **Accounting**
- **Inventory** ↔ **Maintenance** (pengeluaran suku cadang)
- **Accounting** ↔ **Inventory Events** (jurnal otomatis dari transaksi inventori)
- **Customer** ↔ **Finance AR Read Model** (exposure read-only; credit limit tetap konfigurasi Customer)
- **Agent** ↔ **Ticketing/Booking** (agent dan commission policy snapshot; settlement tetap Finance)
- **Rate Card** ↔ **Flight Planning/Ticketing/Cargo** (effective selection dan transaction snapshot)
- **Contracts & Subsidies** ↔ **Customer/Agent/Rate/Documents** (portfolio dan absorption read model)
- **Personnel** ↔ **Flight Operations** (assignment/flying hours tanpa duplikasi source of truth)
- **Master Data** → Seluruh modul (referensi data induk)
- **Ticketing** → **Flight Operations** (booking menciptakan permintaan penerbangan)

### Gap dan Prioritas Lanjutan

1. Ganti demo persona authentication dengan identity provider, session production, dan enforcement scope yang diaudit.
2. Migrasikan seluruh nilai uang legacy ke integer minor-unit atau decimal database yang konsisten.
3. Tambahkan policy FX dan grouped reporting untuk transaksi multi-currency; jangan menjumlahkan currency secara langsung.
4. Bangun contract/subsidy authoring workflow, approval, amendment/versioning, dan canonical unbilled exposure.
5. Tambahkan direct cost attribution atau allocation run berpolicy untuk HPP; revenue-share saat ini adalah metode eksplisit sementara.
6. Tambahkan period close/reopen workflow, bank reconciliation, AP aging, cash-flow forecast, dan automated depreciation posting.
7. Tambahkan offline/sync strategy untuk station dengan konektivitas terbatas serta observability, backup, disaster recovery, dan retention policy.
