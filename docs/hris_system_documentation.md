# 📚 Dokumentasi Sistem HRIS, ATS Rekrutmen & Penerbangan Operasional PT. AMA

Dokumen ini memuat dokumentasi teknis dan fungsional lengkap mengenai pengembangan sistem **Human Resource Information System (HRIS)**, **Applicant Tracking System (ATS) Rekrutmen**, **Roster Penerbangan**, dan **Sertifikasi Pilot/Crew** pada **PT. Associate Mission Aviation (AMA)**.

---

## 📑 Daftar Isi

1. [Ikhtisar Sistem & Arsitektur Bisnis](#1-ikhtisar-sistem--arsitektur-bisnis)
2. [Skema Database & Perubahan Tabel](#2-skema-database--perubahan-tabel)
3. [Alur Bisnis Utama (Business Process Flows)](#3-alur-bisnis-utama-business-process-flows)
4. [Katalog REST API Endpoints](#4-katalog-rest-api-endpoints)
5. [Struktur Halaman Frontend (Vue 3 / Nuxt 3)](#5-struktur-halaman-frontend-vue-3--nuxt-3)
6. [Panduan Pengujian & Verifikasi](#6-panduan-pengujian--verifikasi)

---

## 1. Ikhtisar Sistem & Arsitektur Bisnis

Sistem HRIS PT. AMA dirancang khusus untuk memenuhi kebutuhan manajemen Sumber Daya Manusia penerbangan perintis Papua yang mencakup:

- **Operasional Penerbangan & Roster**: Pengelolaan shift kerja ground crew dan penerbangan pilot/co-pilot dengan dukungan ganti shift (_shift swapping_).
- **Compliance & Lisensi Aviasi**: Pemantauan sertifikasi pilot (DGCA License, Class 1 Medical Check, Type Rating DHC-6 Twin Otter / Cessna 208B) dengan alert otomatis 90 hari sebelum kadaluarsa.
- **Master KPI & Penilaian Kinerja**: Pengelolaan template KPI dan penugasan masif (_multi-assign_) berdasar departemen.
- **Penggajian & Bank/Pajak**: Manajemen gaji pokok (_basic salary_), tunjangan jabatan, tarif terbang per jam (_flight rate_), serta rekening bank, NPWP, dan BPJS Kesehatan/TK.
- **ATS Rekrutmen & Portal Karir Publik**: Publikasi lowongan kerja publik di `/careers`, pengelolaan status lowongan (_OPEN_, _CLOSED_, _DRAFT_), penugasan interviewer, dan eksekusi pipeline seleksi pelamar.
- **Struktur Organisasi**: Pohon hirarki interaktif (_collapsible dropdown tree_) yang mengelompokkan staf berdasar pangkat posisi jabatan (_senior rank_).

---

## 2. Skema Database & Perubahan Tabel

Tabel-tabel dalam database SQLite telah diperbarui dan ditambah kolom baru sebagai berikut:

### 2.1. Tabel `employees` (Pembaruan Kolom)

Tabel utama data karyawan dengan penambahan field gaji pokok dan identitas perpajakan:

| Kolom Baru              | Tipe Data | Keterangan                            |
| :---------------------- | :-------- | :------------------------------------ |
| `basic_salary`          | INTEGER   | Gaji pokok bulanan karyawan (IDR)     |
| `position_allowance`    | INTEGER   | Tunjangan jabatan bulanan (IDR)       |
| `flight_rate_per_hour`  | INTEGER   | Tarif tunjangan terbang per jam (IDR) |
| `tax_id_number`         | TEXT      | Nomor Pokok Wajib Pajak (NPWP)        |
| `bank_name`             | TEXT      | Nama Bank (BCA, Mandiri, BNI, BRI)    |
| `bank_account_number`   | TEXT      | Nomor rekening bank                   |
| `bank_account_name`     | TEXT      | Nama pemilik rekening                 |
| `bpjs_kesehatan_number` | TEXT      | Nomor kartu BPJS Kesehatan            |
| `bpjs_tk_number`        | TEXT      | Nomor kartu BPJS Ketenagakerjaan      |

### 2.2. Tabel `hris_shift_patterns` (Master Shift & Roster)

| Kolom         | Tipe Data            | Keterangan                                              |
| :------------ | :------------------- | :------------------------------------------------------ |
| `id`          | TEXT PRIMARY KEY     | ID unik shift pattern (e.g. `shift-xxx`)                |
| `shift_code`  | TEXT UNIQUE          | Kode shift (e.g. `MORNING`, `AFTERNOON`, `FLIGHT_DUTY`) |
| `shift_name`  | TEXT                 | Nama lengkap shift                                      |
| `start_time`  | TEXT                 | Waktu mulai kerja (e.g. `06:00`)                        |
| `end_time`    | TEXT                 | Waktu selesai kerja (e.g. `14:00`)                      |
| `roster_type` | TEXT DEFAULT 'SHIFT' | Tipe roster (`SHIFT`, `FLIGHT_DUTY`, `STANDBY`, `OFF`)  |
| `color_code`  | TEXT                 | Kode warna visual shift (#HEX)                          |

### 2.3. Tabel `employee_certifications` (Sertifikasi Karyawan)

| Kolom                | Tipe Data                 | Keterangan                                             |
| :------------------- | :------------------------ | :----------------------------------------------------- |
| `id`                 | TEXT PRIMARY KEY          | ID unik sertifikasi                                    |
| `employee_id`        | TEXT REFERENCES employees | Karyawan pemilik sertifikat                            |
| `certification_type` | TEXT                      | Jenis lisensi (e.g. `DGCA_LICENSE`, `MEDICAL_CLASS_1`) |
| `certificate_number` | TEXT                      | Nomor registrasi lisensi/sertifikat                    |
| `issue_date`         | TEXT                      | Tanggal penerbitan                                     |
| `expiry_date`        | TEXT                      | Tanggal kadaluarsa                                     |
| `document_url`       | TEXT                      | Link/URL dokumen sertifikat yang diunggah              |

### 2.4. Tabel `hris_kpi_templates` (Master Template KPI)

| Kolom                | Tipe Data                   | Keterangan                         |
| :------------------- | :-------------------------- | :--------------------------------- |
| `id`                 | TEXT PRIMARY KEY            | ID unik template KPI               |
| `title`              | TEXT NOT NULL               | Judul/Nama indikator KPI           |
| `department_id`      | TEXT REFERENCES departments | Departemen sasaran                 |
| `target_description` | TEXT                        | Deskripsi target & bobot penilaian |

### 2.5. Tabel `hris_job_postings` (Master Lowongan Pekerjaan)

| Kolom             | Tipe Data                   | Keterangan                                                         |
| :---------------- | :-------------------------- | :----------------------------------------------------------------- |
| `id`              | TEXT PRIMARY KEY            | ID unik lowongan                                                   |
| `posting_number`  | TEXT UNIQUE                 | Nomor posting (e.g. `JOB00001`)                                    |
| `position_title`  | TEXT NOT NULL               | Judul posisi pekerjaan                                             |
| `department_id`   | TEXT REFERENCES departments | Departemen pengelola                                               |
| `station_id`      | TEXT REFERENCES stations    | Pangkalan stasiun kerja                                            |
| `employment_type` | TEXT                        | Status ikatan kerja (`PERMANENT`, `CONTRACT`, `PROBATION`)         |
| `vacancies`       | INTEGER DEFAULT 1           | Jumlah kuota penerimaan                                            |
| `status`          | TEXT DEFAULT 'OPEN'         | Status lowongan (`DRAFT`, `OPEN`, `CLOSED`, `CANCELLED`, `FILLED`) |

### 2.6. Tabel `hris_applicants` (Pelamar & Pipeline ATS)

| Kolom                     | Tipe Data                         | Keterangan                                            |
| :------------------------ | :-------------------------------- | :---------------------------------------------------- |
| `id`                      | TEXT PRIMARY KEY                  | ID unik pelamar                                       |
| `applicant_number`        | TEXT UNIQUE                       | Nomor pendaftaran (e.g. `APP00001`)                   |
| `job_posting_id`          | TEXT REFERENCES hris_job_postings | Reference lowongan yang dilamar                       |
| `full_name`               | TEXT NOT NULL                     | Nama lengkap pelamar                                  |
| `email`                   | TEXT                              | Email pelamar                                         |
| `phone`                   | TEXT                              | Telepon / WhatsApp                                    |
| `resume_reference`        | TEXT                              | Link/Referensi dokumen resume CV                      |
| `stage`                   | TEXT DEFAULT 'APPLIED'            | Tahap pipeline seleksi                                |
| `interviewer_employee_id` | TEXT REFERENCES employees         | Karyawan/Manager yang ditugaskan sebagai Interviewer  |
| `interview_scheduled_at`  | TEXT                              | Jadwal waktu interview                                |
| `notes`                   | TEXT                              | Catatan evaluasi/interview                            |
| `converted_employee_id`   | TEXT REFERENCES employees         | ID karyawan jika pelamar telah diterima (_onboarded_) |

---

## 3. Alur Bisnis Utama (Business Process Flows)

### 3.1. Alur Roster & Ganti Shift Karyawan

1. **Master Shift CRUD**: Admin HR mengelola master shift (jam masuk, jam keluar, tipe roster, warna visual).
2. **Assign Multi-Employee & Filter Departemen**: HR memilih departemen target, mencentang karyawan (_multi-select_), dan menetapkan roster kerja untuk tanggal tertentu.
3. **Shift Swapping / Ubah Shift**: Apabila karyawan mengajukan ganti shift, HR dapat mengedit jadwal roster individu tanpa mempengaruhi karyawan lain.

### 3.2. Alur Alert & Upload Sertifikasi Pilot/Crew

1. **Automatic 90-Day Alert**: Sistem memindai `expiry_date` sertifikasi dan menampilkan alert otomatis (_EXPIRED_, _CRITICAL_30_, _WARNING_90_) di dashboard dan halaman sertifikasi.
2. **Alert Expansion Panel Dropdown**: Banner peringatan ditampilkan dalam bentuk _dropdown panel_ agar tidak mengganggu tabel utama.
3. **Upload & Edit Sertifikasi**: Admin HR dapat mengunggah file dokumen sertifikat, memilih nama pemilik sertifikat, serta memperbarui nomor dan masa berlaku.
4. **Notify Employee**: Tombol "Kirim Notifikasi" untuk mengirimkan pengingat perpanjangan lisensi ke email/kontak karyawan.

### 3.3. Alur Master KPI & Multi-Assign Assessment

1. **CRUD Template KPI**: HR membuat standar indikator kinerja per departemen.
2. **Multi-Assign Assessment**: HR memilih departemen, menyaring daftar karyawan, dan menugaskan KPI ke beberapa karyawan sekaligus (_bulk assign_).

### 3.4. Alur Struktur Organisasi & Hirarki Jabatan

1. **Dropdown Tree Structure**: Struktur direktorat dan divisi ditampilkan dalam bentuk _Collapsible Expansion Panels_ (`VExpansionPanels`).
2. **Pengelompokan Senior Rank**: Dalam setiap departemen, staf dikelompokkan dan diurutkan berdasarkan pangkat/jabatan:
   - Rank 1: `Chief` / `Director` / `Head`
   - Rank 2: `Manager` / `Superintendent`
   - Rank 3: `Captain` / `Lead` / `Senior`
   - Rank 4: `First Officer` / `Technician` / `Staff`

### 3.5. Alur ATS Rekrutmen & Portal Karir Publik

1. **Posting Lowongan Pekerjaan**: HR membuat lowongan baru dan mengatur statusnya (`DRAFT` / `OPEN` / `CLOSED`).
2. **Public Apply (`/careers`)**: Pelamar publik melihat daftar lowongan terbuka di `/careers` dan mengisikan formulir lamaran online.
3. **Pipeline Transition & Interviewer Assignment**: HR mengubah tahap pelamar (`SCREENING` ➔ `INTERVIEW_HR` ➔ `INTERVIEW_USER` ➔ `FLIGHT_CHECK` ➔ `OFFERING` ➔ `ACCEPTED`), memilih Interviewer/Penguji dari daftar karyawan, serta mengeset jadwal interview.
4. **Auto-Onboarding**: Saat pelamar dipindahkan ke tahap `ACCEPTED`, sistem secara otomatis membuatkan akun data karyawan baru di tabel `employees`.

---

## 4. Katalog REST API Endpoints

### 4.1. Shift & Schedules Endpoints

- `GET /api/hris/schedules/shift-patterns` : Mengambil daftar master shift.
- `POST /api/hris/schedules/shift-patterns` : Membuat master shift baru.
- `PUT /api/hris/schedules/shift-patterns/:id` : Memperbarui master shift.
- `DELETE /api/hris/schedules/shift-patterns/:id` : Menghapus master shift.
- `POST /api/hris/schedules/rosters/assign` : Assign roster ke satu/banyak karyawan (_multi-assign_).

### 4.2. Sertifikasi & Lisensi Endpoints

- `GET /api/hris/certifications` : Daftar semua sertifikasi karyawan.
- `POST /api/hris/certifications` : Menambahkan/mengunggah sertifikasi baru.
- `PUT /api/hris/certifications/:id` : Memperbarui sertifikasi & dokumen.
- `DELETE /api/hris/certifications/:id` : Menghapus sertifikasi.
- `GET /api/hris/certifications/alerts` : Daftar sertifikasi yang membutuhkan perpanjangan.
- `POST /api/hris/certifications/notify` : Mengirim notifikasi perpanjangan lisensi ke karyawan.

### 4.3. Master KPI & Assessment Endpoints

- `GET /api/hris/kpi/templates` : Mengambil master template KPI.
- `POST /api/hris/kpi/templates` : Membuat template KPI baru.
- `PUT /api/hris/kpi/templates/:id` : Memperbarui template KPI.
- `DELETE /api/hris/kpi/templates/:id` : Menghapus template KPI.
- `POST /api/hris/kpi/assessments` : Multi-assign penilaian KPI ke karyawan.

### 4.4. Karyawan & Biodata Endpoints

- `GET /api/hris/employees` : Mengambil daftar karyawan (filter departemen, status).
- `POST /api/hris/employees` : Menambahkan karyawan baru secara manual.
- `GET /api/hris/employees/:id` : Detail lengkap karyawan (biodata, gaji, BPJS, NPWP, sertifikasi, kuota cuti).
- `PUT /api/hris/employees/:id` : Memperbarui biodata & gaji pokok karyawan.

### 4.5. Organisasi Endpoints

- `GET /api/hris/organization/tree` : Mengambil pohon hirarki organisasi lengkap dengan rincian karyawan per rangking jabatan.

### 4.6. ATS Rekrutmen Endpoints

- `GET /api/hris/recruitment/postings` : Daftar lowongan pekerjaan.
- `POST /api/hris/recruitment/postings` : Membuat lowongan pekerjaan baru.
- `GET /api/hris/recruitment/postings/:id` : Detail lowongan pekerjaan & statistik pelamar.
- `PUT /api/hris/recruitment/postings/:id` : Memperbarui lowongan pekerjaan & status.
- `DELETE /api/hris/recruitment/postings/:id` : Menutup/menghapus lowongan pekerjaan.
- `GET /api/hris/recruitment/applicants` : Daftar pelamar pekerjaan.
- `POST /api/hris/recruitment/applicants` : Mengirim lamaran pekerjaan (Portal Karir Publik).
- `PUT /api/hris/recruitment/applicants/:id/stage` : Update tahap pipeline pelamar, penugasan interviewer, & jadwal interview.

### 4.7. Dashboard Overview Endpoint

- `GET /api/hris/dashboard` : Ringkasan analytics HR (Total Karyawan, Presensi, Demografi Departemen & Stasiun, Alert Sertifikasi).

---

## 5. Struktur Halaman Frontend (Vue 3 / Nuxt 3)

| Path Halaman                               | Deskripsi & Komponen Utama                                                                                                                    |
| :----------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/pages/hris/index.vue`                 | Dashboard HRIS dengan analytics ringkasan KPI, distribusi departemen, status presensi, sebaran stasiun base, dan alert lisensi pilot.         |
| `app/pages/hris/schedules.vue`             | Kelola master shift, ganti shift individu, dan assign roster multi-karyawan berdasar departemen.                                              |
| `app/pages/hris/certifications.vue`        | Collapsible alert sertifikasi 90 hari, upload dokumen lisensi, filter per karyawan/posisi, dan notifikasi kadaluarsa.                         |
| `app/pages/hris/kpi/index.vue`             | Tab Master Template KPI, multi-assign penilaian KPI, dan filter departemen.                                                                   |
| `app/pages/hris/employees/index.vue`       | Direktori karyawan, modal "Tambah Karyawan Baru", serta filter departemen & status.                                                           |
| `app/pages/hris/employees/[id].vue`        | Detail profil karyawan: biodata, pengaturan Gaji Pokok/Bank/Pajak, daftar sertifikasi milik karyawan, dan kartu kuota cuti.                   |
| `app/pages/hris/organization.vue`          | Pohon struktur organisasi interaktif (_collapsible dropdown tree_) berdasar hirarki pangkat jabatan (_Chief -> Manager -> Captain -> Staff_). |
| `app/pages/hris/recruitment/index.vue`     | Dashboard ATS Rekrutmen: CRUD Lowongan Pekerjaan, pengesetan status lowongan, dan tabel pipeline pelamar.                                     |
| `app/pages/hris/recruitment/jobs/[id].vue` | Detail Lowongan Pekerjaan & papan pipeline pelamar posisi khusus.                                                                             |
| `app/pages/careers/index.vue`              | Portal Karir Publik penerbangan PT. AMA: katalog lowongan kerja berstatus _OPEN_ dan modal formulir pendaftaran online.                       |

---

## 6. Panduan Pengujian & Verifikasi

Seluruh pengujian tipe dan unit engine telah dijalankan dengan hasil lulus 100%:

- **Pemeriksaan Tipe Data (Typecheck)**:
  ```bash
  pnpm typecheck
  # Result: Nuxt Type check passed in 29.8s
  ```
- **Pengujian Unit Engine (Vitest)**:
  ```bash
  pnpm vitest run tests/services/hris.service.test.ts
  # Result: 5/5 Engine Tests Passed (100% Lulus)
  ```
