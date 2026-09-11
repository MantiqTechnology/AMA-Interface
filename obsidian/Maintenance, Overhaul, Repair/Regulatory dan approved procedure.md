# Hasil riset awal regulasi dan dokumen MRO Indonesia

Saya menemukan bahwa 12 item tersebut terbagi menjadi dua kelompok:

1. **Peraturan dan petunjuk regulator yang dapat dicari secara publik**, seperti CASR, Staff Instruction, Advisory Circular, dan regulasi tanda tangan elektronik.

2. **Dokumen terkendali milik operator atau AMO**, seperti AAMP yang disetujui, General Maintenance Manual, AMO Manual, MEL operator, prosedur inspeksi, dan authorization matrix.

Kelompok kedua tidak dapat direkonstruksi hanya dari peraturan publik. Dokumen tersebut harus diperoleh dari **controlled document system milik operator/AMO**, lengkap dengan halaman persetujuan, revision status, List of Effective Pages, dan surat approval/acceptance DGCA.

Ada satu pembaruan penting: **PM 33 Tahun 2022/CASR Part 119** sekarang mengatur sertifikasi pengoperasian pesawat untuk kegiatan angkutan udara. Regulasi tersebut mencabut ketentuan sertifikasi pada Subpart A dan B dari Part 121 dan Part 135, tetapi bukan berarti seluruh ketentuan maintenance Part 121/135 otomatis tidak berlaku. Untuk maintenance, SI DGCA masih merujuk CASR Part 43, Part 91 Subpart E, Part 121 Subpart L, serta Part 135 Subpart L. Karena itu, applicability harus ditentukan menggunakan **CASR terkonsolidasi, AOC, Operations Specifications, dan approved manuals operator**, bukan hanya berdasarkan nama regulasinya. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/detail?data=DCDJAnNlSYvAlo1cmiYb2u4p87DbWcICK4Ewz7UOimec4Oa4S33uNSm4kqmRmrvqPz8n1fMf9DDD28m8GL5TJ7xa4TvA9ZgfW208LLpwOF8hOuGitTUTkLghs79OEu6dhz8GAdYXe76fMis5CXGaKYugCF&utm_source=chatgpt.com 'pm 33 tahun 2022'))

---

# A. Peta hierarki dokumen MRO

Urutan otoritas yang sebaiknya digunakan:

```text
Undang-Undang Nomor 1 Tahun 2009 tentang Penerbangan
        ↓
CASR Part 43, 91, 119, 121, 135, 145, 65, 21
        ↓
DGCA Staff Instructions dan Advisory Circulars
        ↓
AOC / AMO Certificate / Operations Specifications
        ↓
Approved or Accepted Manuals
        ↓
AAMP / MEL / CDL / Reliability Program
        ↓
Company procedures dan work instructions
        ↓
Forms, job cards, technical records, release records
        ↓
Bukti pelaksanaan dan audit trail
```

Sistem MRO tidak boleh langsung menerjemahkan satu paragraf CASR menjadi tombol atau rule tanpa melihat dokumen turunannya. CASR menetapkan kewajiban umum, sedangkan manual, Ops Specs, AAMP, MEL, dan prosedur perusahaan menentukan bagaimana kewajiban itu dilaksanakan untuk organisasi dan armada tertentu.

---

# 1. CASR Part 43 dan Part 145

## 1.1 CASR Part 43

Portal regulasi DJPU mencantumkan CASR Part 43 Amendment 1 dengan judul **Maintenance, Preventive Maintenance, Rebuilding and Alteration**. Secara fungsi, Part 43 menjadi dasar untuk:

- pelaksanaan maintenance dan alteration;

- siapa yang dapat melaksanakan pekerjaan;

- standar pelaksanaan pekerjaan;

- pencatatan maintenance;

- inspection records;

- approval for return to service;

- major repair dan major alteration. ([Kemenhub](https://imsis-djpu.kemenhub.go.id/PortalDKPPU/ReadRegulation.php?id=YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM%3D&utm_source=chatgpt.com 'CASR'))

Prinsip pentingnya adalah pekerjaan harus menggunakan metode, teknik, praktik, dan material yang dapat diterima DGCA. Setelah pekerjaan selesai, kondisi produk harus setidaknya setara dengan kondisi awalnya atau kondisi setelah perubahan yang benar dari sisi kualitas yang memengaruhi airworthiness. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=J47QfR7gqPr6rwQ6m04s9H48bn8ZZjwN24DujnEvumJ84ToiD8WeZO78X3cjSRENFt4eaTFepmWeJ8QiPoXiXmK64eRSRmYi8Rw4Uoak5NqxRG8Zk1pywxBsuKklANjvJHdU60RHGEsJvuDAiGTKCplJyt4DgZ2MoLHqJDjFJc0QhVfrBrOqZf7RAVT0B1oCLl4XYUBjvGYPz1JYV8ffzYGItkCK&utm_source=chatgpt.com '(ADVISORY CIRCULAR CASR 21-11) TENTANG ...'))

### Informasi yang perlu diekstrak dari Part 43

Untuk kepentingan business rule dan UI:

| Area                    | Data atau kontrol sistem                                                  |
| ----------------------- | ------------------------------------------------------------------------- |
| Person authorized       | Siapa yang dapat perform, supervise, inspect, dan approve                 |
| Maintenance data        | AMM, SRM, CMM, EO, AD, SB atau data approved lain                         |
| Work performed          | Deskripsi pekerjaan atau referensi task yang jelas                        |
| Completion              | Tanggal dan waktu penyelesaian                                            |
| Performer               | Identitas orang yang mengerjakan                                          |
| Approval                | Identitas, certificate number, signature, dan scope pihak yang menyetujui |
| Inspection              | Jenis dan lingkup inspection, hasil, total time bila relevan              |
| Major repair/alteration | Approved data dan formulir yang diperlukan                                |
| Return to service       | Pernyataan release serta limitation yang masih berlaku                    |

SI DGCA untuk maintenance records menyebut bahwa record pekerjaan minimal memuat deskripsi pekerjaan atau referensi data yang dapat diterima, tanggal penyelesaian, serta signature dan certificate number pihak yang menyetujui aircraft untuk return to service.

### Dampak ke aplikasi

Aplikasi tidak boleh menganggap pekerjaan selesai hanya karena status diubah menjadi `Completed`. Penyelesaian yang sah setidaknya perlu membedakan:

```text
Physical Work Completed
Technician Sign-off Completed
Inspection Completed
Record Completed
Eligible for Return to Service
Released to Service
```

---

## 1.2 CASR Part 145

CASR Part 145 mengatur **Approved Maintenance Organization**. Basisnya berasal dari KM 17 Tahun 2009, kemudian mengalami perubahan, antara lain melalui PM 164 Tahun 2015 dan PM 57 Tahun 2017. Prosedur sertifikasi, perpanjangan, dan perubahan AMO dalam negeri juga diperbarui melalui KP 262 Tahun 2021, yang di JDIH berstatus berlaku. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=GONL9uCLVBiKZr60iBi8ij4Z7SjnOmwDu4ZCadONCnq54TrHBZtji7Q8cNrzO8diqM8MMzD9c3qVd4p87DNPOyNp8m6wumhrb6X8Rh0yzemStLJQvaqE0n0ukLsUmsOE1jR14mx2ER82WMJ7F47aXbfOnTJWNy07uu2TY3AmJyNehW7fLt4aKab28vr61D14guqzLeByBB6hqYgaoL3rAhkyZoVT&utm_source=chatgpt.com 'peraturan menteri perhubungan republik indonesia'))

Part 145 tidak hanya mengatur “bengkel pesawat”, tetapi keseluruhan sistem organisasi, seperti:

- certificate dan ratings;

- Operations Specifications;

- capability list;

- accountable manager;

- nominated persons;

- organization structure;

- maintenance personnel;

- supervisors dan inspectors;

- return-to-service personnel;

- facilities;

- tools dan measuring/test equipment;

- technical data;

- maintenance records;

- AMO Manual;

- Quality Control Manual;

- training program;

- quality system;

- contracted maintenance;

- work away from approved location;

- reporting dan surveillance.

AMO yang mengerjakan pesawat milik operator Part 121 atau Part 135 tetap harus mengikuti maintenance program dan bagian manual operator yang relevan. AMO tidak dapat mengganti requirement operator dengan prosedur internalnya sendiri. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=GONL9uCLVBiKZr60iBi8ij4Z7SjnOmwDu4ZCadONCnq54TrHBZtji7Q8cNrzO8diqM8MMzD9c3qVd4p87DNPOyNp8m6wumhrb6X8Rh0yzemStLJQvaqE0n0ukLsUmsOE1jR14mx2ER82WMJ7F47aXbfOnTJWNy07uu2TY3AmJyNehW7fLt4aKab28vr61D14guqzLeByBB6hqYgaoL3rAhkyZoVT&utm_source=chatgpt.com 'peraturan menteri perhubungan republik indonesia'))

### Dokumen Part 145 yang harus diperoleh

Untuk menilai AMO atau membuat modul vendor/AMO:

1. AMO Certificate.

2. Operations Specifications.

3. Ratings dan limitations.

4. Capability List.

5. Daftar approved locations.

6. Satellite facility approval bila ada.

7. AMO Manual.

8. Quality Control Manual.

9. Training Program Manual.

10. Organization chart.

11. Personnel roster.

12. Return-to-service authorization list.

13. Inspection authorization list.

14. Approved subcontractor list.

15. Calibration system.

16. Contract maintenance procedures.

17. Work-away-from-station procedure.

18. Manual approval dan revision history.

Audit DGCA untuk AMO memeriksa antara lain management, manual, training records, maintenance records, facilities, tools, equipment, parts, material, contract arrangement, production planning, maintenance process, serta work away from fixed location.

### Implikasi sistem

Setiap work order harus diperiksa terhadap:

```text
AMO certificate valid?
Rating sesuai?
Aircraft/component termasuk capability?
Lokasi kerja diperbolehkan?
Approved data tersedia?
Personnel berwenang?
Tools dan material valid?
Customer/operator procedure tersedia?
```

Status `AMO Active` saja tidak cukup untuk mengizinkan pekerjaan.

---

# 2. CASR Part 91, 119, 121, dan 135 yang relevan

## 2.1 Part 91

CASR Part 91 mengatur general operating and flight rules. Dalam konteks MRO, bagian yang paling berkaitan adalah Subpart E mengenai maintenance, preventive maintenance, alteration, inspection, serta tanggung jawab owner/operator terhadap airworthiness. SI evaluasi maintenance program secara langsung merujuk Part 91 Subpart E. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/detail?data=59FCInJzb58JMh59iLxLr78Rfx75R2ENk8n4FE5fHm9E8gkKrBnlakw4aA8c78m26S4p6oyiljcR98WzlZgdQHsv4jn24T9LqPz8lxv6SrIx4FG4xbPsVHhTS5VFFrNt1E7FFXYFj9PpgjiL1hVh36FCxv 'Peraturan Menteri Perhubungan Nomor PM 94 Tahun 2015'))

JDIH menampilkan PM 94 Tahun 2015 beserta perubahan melalui PM 81 Tahun 2017. Namun beberapa tampilan indeks JDIH memperlihatkan status yang tidak sepenuhnya konsisten antara “berlaku” dan “dicabut”. Karena itu, untuk legal register proyek, salinan terkonsolidasi harus dikonfirmasi kepada DGCA atau inspector yang menangani operator. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/detail?data=59FCInJzb58JMh59iLxLr78Rfx75R2ENk8n4FE5fHm9E8gkKrBnlakw4aA8c78m26S4p6oyiljcR98WzlZgdQHsv4jn24T9LqPz8lxv6SrIx4FG4xbPsVHhTS5VFFrNt1E7FFXYFj9PpgjiL1hVh36FCxv 'Peraturan Menteri Perhubungan Nomor PM 94 Tahun 2015'))

## 2.2 Part 119

PM 33 Tahun 2022/CASR Part 119 mengatur:

- sertifikasi pengoperasian;

- AOC dan Operating Certificate;

- pengawasan;

- sanksi administratif;

- kerangka sertifikasi operator Part 121/135.

PM 33 Tahun 2022 mencabut ketentuan Subpart A dan B yang sebelumnya berada di Part 121 dan Part 135, karena sertifikasinya dipusatkan ke Part 119. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/detail?data=DCDJAnNlSYvAlo1cmiYb2u4p87DbWcICK4Ewz7UOimec4Oa4S33uNSm4kqmRmrvqPz8n1fMf9DDD28m8GL5TJ7xa4TvA9ZgfW208LLpwOF8hOuGitTUTkLghs79OEu6dhz8GAdYXe76fMis5CXGaKYugCF&utm_source=chatgpt.com 'pm 33 tahun 2022'))

## 2.3 Part 121

Part 121 ditujukan untuk domestic, flag, dan supplemental air carriers. Basis yang ditemukan adalah PM 28 Tahun 2013, dengan perubahan keempat melalui PM 61 Tahun 2017. Untuk MRO, fokus utamanya berada pada ketentuan maintenance, maintenance organization, maintenance program, records, mechanical reliability, serta release yang berada di subbagian maintenance, bukan lagi subbagian sertifikasi yang telah dipindahkan ke Part 119. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=5rFMPYmbanxFMOH6zs66gp8Qfr9RkHC5L4Tu6HMmZ2S14PW5sXcoVCa4Uq71zm6U454TtqMWU6osa8W7ZjnV5G2F4uXVoQ9VdA44ZI0WMX4YZ3H8xn3jk7ne3Ap3aFEwUuDD8POTu2gELMJ0ptPmqiw0P605A22Pjqq2n5XtiR4zvRQlBJt2N9L4CwVKJveomwNYIH92jc3G6SBx4AoWmpanNKi80qreGzxLZa92a2NT0r4Nis&utm_source=chatgpt.com 'persyaratan sertifikasi dan operasi bagi perusahaan ...'))

## 2.4 Part 135

Part 135 terkait operasi commuter dan charter. Sumber resmi DGCA yang ditemukan merujuk KM 18 Tahun 2002, sebagaimana diubah terakhir pada sumber tersebut melalui PM 63 Tahun 2017. Subpart sertifikasinya telah dipindahkan ke Part 119, sementara requirement operasional dan maintenance yang tidak dicabut tetap perlu diperiksa pada salinan terkonsolidasi. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=Clm7Ce3Gu7gH5OQLbudL1f4fVE0pE5xKR8Rl6Vkdfhgr4UoonTdDbjF8mz6RhNJA7Z8QfpGi6JLP648gwAKLkGXJ4ua5fcbmpho8n1hIR8fZO59iue5Stgt6IIAu13zGJFi96SqEYfcYHJ5LDENrR8FSkMBFJl6dXSBOfJLhvQcPp15nKMIKZbnwcnN4dGz0HGzw2z5LmweYWCXt79IeouOkCZok&utm_source=chatgpt.com 'PERATURAN DIREKTUR JENDERAL PERHUBUNGAN UDARA ...'))

## Cara menentukan applicability yang benar

Jangan menentukan Part 121 atau 135 hanya dari:

- jumlah kursi;

- jenis pesawat;

- rute perintis;

- operasi reguler atau tidak reguler;

- asumsi berdasarkan profil perusahaan.

Gunakan dokumen berikut:

```text
AOC / Operating Certificate
Operations Specifications
Aircraft listing
Authorized areas of operation
Kinds of operations
Maintenance authorization
Approved maintenance arrangement
Special authorizations
```

Untuk aplikasi, sebaiknya ada `Regulatory Profile` per operator:

```text
Operator
├── Certificate type
├── Applicable CASR parts
├── Operations Specifications
├── Fleet applicability
├── Special operations
├── Approved maintenance provider
└── Effective regulation/manual revisions
```

---

# 3. Approved Maintenance Program atau AAMP

DGCA menerbitkan KP 062 Tahun 2018/SI 8900-3.327 mengenai evaluasi Maintenance Program operator. SI tersebut berstatus berlaku di JDIH dan secara eksplisit merujuk Part 43, Part 91 Subpart E, Part 121 Subpart L, serta Part 135 Subpart L. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=EnGA4EBlU1VE9E6YZy1EpP4TojVk3XrNc4E0xk9q4K8a4DrwYuxvCeR48aTHj9j4OF8m4cIqmecGf48eKUbuRiKc4JG3rlhw5I28bMhA440Xju00ys6wm7Wg66kILkhZq0pPC5otOKCGm3WB6AHnfrmhov5uTLMEUK5FBEks3xf528S530BtTWWtfd75adgllUB5SZLRKJzJkHI41378JnIPFjur&utm_source=chatgpt.com 'PERATURAN DIREKTUR JENDERAL PERHUBUNGAN UDARA ...'))

## Fungsi AAMP

AAMP menjelaskan:

> **Apa yang harus dirawat, berdasarkan dasar teknis apa, pada interval berapa, dan untuk konfigurasi pesawat mana.**

AAMP tidak sama dengan GMM:

- **AAMP:** apa dan kapan maintenance dilakukan.

- **GMM/CMM:** bagaimana organisasi mengelola dan mengendalikan maintenance.

- **Job Card:** bagaimana suatu pekerjaan individual dieksekusi dan direkam.

## Kandungan AAMP yang seharusnya tersedia

### Identitas dan applicability

- operator;

- aircraft type/model;

- engine, propeller, APU applicability;

- registration atau effectivity range;

- configuration;

- maintenance program number;

- revision;

- approval date;

- approval reference;

- List of Effective Pages;

- amendment record;

- distribution list.

### Basis penyusunan

- Maintenance Review Board Report;

- Maintenance Planning Document;

- manufacturer maintenance manuals;

- Certification Maintenance Requirements;

- Airworthiness Limitations;

- structural inspection program;

- applicable AD;

- operator experience;

- reliability findings;

- local environment dan utilization pattern.

### Task content

Setiap task idealnya memuat:

```text
Task ID
Task title
ATA chapter
Applicability
Source document
Source revision
Initial threshold
Repeat interval
Interval unit
FH / FC / calendar / combination
Tolerance
Access requirement
Skill/trade
Man-hours
Required inspection
Related parts/tools
Special condition
```

### Jenis task

- lubrication dan servicing;

- operational check;

- functional check;

- general visual inspection;

- detailed inspection;

- special detailed inspection;

- restoration;

- discard;

- overhaul;

- structural inspection;

- zonal inspection;

- corrosion prevention and control;

- life-limited component replacement;

- engine/APU/propeller tasks;

- special operation maintenance.

### Mandatory dan airworthiness-related items

- Airworthiness Limitations;

- Certification Maintenance Requirements;

- safe-life limits;

- damage-tolerance inspections;

- life-limited parts;

- AD repetitive requirements;

- mandatory structural tasks;

- fuel tank safety requirements bila applicable.

### Abnormal occurrence inspection

Program juga perlu menangani event seperti:

- hard landing;

- overweight landing;

- lightning strike;

- severe turbulence;

- bird strike;

- propeller strike;

- high-energy rejected takeoff atau braking event;

- operation outside approved limits.

SI DGCA juga mensyaratkan maintenance program dikembangkan dengan mempertimbangkan human-factor principles.

## Reliability linkage

KP 144 Tahun 2018/SI 8900-3.6 membahas Reliability Control Program. Reliability digunakan untuk memastikan maintenance program tetap efektif menjaga aircraft dalam kondisi airworthy. Program tersebut relevan antara lain ketika maintenance program menggunakan pendekatan MSG-3, condition monitoring, atau ketika MPD/MRBR mensyaratkannya. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=FrlwYJUyOKZHNOy5by1rk24UooXIQU6Yq8W8suoa9FgO48bzZFELX0M4Oa4S3517kD8geA4oH1VPH4OTNZN0VswP8n3CHaTPm6w4vXBEfknqXp3RW7cB9paAkGuo9Y9tCiHDIksKKyj72vJJJwM8urTxVtHuzZPKlnvyG4m4yWS4nxgwLCYNaGfTY0rIi3q3dcc5ffINlQtzj7tOSB7sLDYhIUSL&utm_source=chatgpt.com 'digunakan sebagai bimbingan Inspektur Direktorat ...'))

## Kontrol sistem AAMP

Sistem due-control harus mendukung:

```text
Due = threshold/interval − current utilization
```

Namun engine tidak boleh hanya menghitung angka. Ia juga harus memperhitungkan:

- FH, FC, dan calendar secara paralel;

- whichever occurs first;

- tolerance;

- last accomplishment;

- partial accomplishment;

- phased task;

- modification status;

- component installation history;

- task supersession;

- temporary revision;

- program revision effectivity;

- approved deviation;

- escalation authorization;

- forecast utilization.

AAMP tidak boleh diedit langsung seperti spreadsheet biasa. Perubahan harus melalui:

```text
Draft
→ Engineering Review
→ Reliability/Quality Review
→ Authorized Approval
→ DGCA Approval/Acceptance bila required
→ Effective Date
→ Fleet Effectivity
→ Controlled Distribution
```

---

# 4. AMO Manual/MOE atau manual organisasi setara

Istilah **MOE—Maintenance Organisation Exposition** lebih umum dalam sistem EASA. Dalam konteks CASR Indonesia, istilah yang ditemukan adalah:

- AMO Manual;

- Quality Control Manual;

- Training Program Manual;

- manual terkait lainnya.

Prinsipnya serupa, tetapi sistem dan dokumen Anda harus mengikuti nama serta approval basis yang benar-benar tercantum dalam certificate dan manual DGCA, bukan mengganti istilah internal menjadi “MOE” hanya karena digunakan oleh vendor asing. DGCA mengharuskan AMO memelihara manual yang current, mendistribusikannya, serta memastikan revisinya sama dengan copy yang tersedia di DGCA.

## Struktur AMO Manual yang perlu dicari

### Bagian organisasi

- accountable manager statement;

- safety and quality policy;

- nominated persons;

- organizational chart;

- duties dan responsibilities;

- delegation/deputy arrangements;

- communication dengan DGCA;

- scope dan limitations.

Accountable manager bertanggung jawab memastikan resource tersedia agar maintenance dapat dilakukan sesuai standar Part 145. Organisasi juga perlu memiliki maintenance man-hour plan dan mekanisme reassessment bila actual staffing lebih rendah dari rencana.

### Certificate dan capability

- certificate ratings;

- Operations Specifications;

- capability-list management;

- penambahan/pengurangan capability;

- self-evaluation sebelum menambah capability;

- approval authority;

- aircraft/component limitations.

### Personnel

- recruitment;

- qualification;

- training;

- recurrent training;

- human factors;

- continuation training;

- OJT;

- competency assessment;

- supervisors;

- inspectors;

- NDT personnel;

- certifying/RTS personnel;

- roster control.

### Facilities

- hangar;

- workshops;

- environmental condition;

- lighting;

- storage;

- segregated quarantine;

- flammable/hazardous materials;

- ESD protection;

- remote/line station facilities.

### Maintenance control

- work-order acceptance;

- contract review;

- customer work scope;

- production planning;

- work-pack creation;

- job-card issuance;

- shift handover;

- task interruption;

- maintenance data control;

- parts/tool issue;

- defect/finding;

- non-routine work;

- reinspection;

- final inspection;

- release.

### Work away from station

Prosedur work away harus menjelaskan:

- kondisi temporary atau recurring;

- notification atau approval DGCA;

- scope pekerjaan;

- tools dan forms;

- qualified personnel;

- inspector availability;

- approved technical data;

- parts/material control;

- record return;

- customer/operator acceptance.

DGCA surveillance secara khusus memeriksa pengendalian tools, forms, qualified personnel, quality system, approved data, dan records untuk pekerjaan di luar fixed location.

---

# 5. General Maintenance Manual

General Maintenance Manual atau Company Maintenance Manual adalah manual level operator.

Tujuan utamanya:

> **Menjelaskan bagaimana operator mengendalikan continuing airworthiness dan maintenance atas seluruh pesawatnya, baik pekerjaan dilakukan sendiri maupun oleh AMO kontrak.**

## Isi yang perlu diminta

### Organization and responsibility

- accountable executive;

- maintenance director/manager;

- maintenance control;

- engineering;

- planning;

- technical records;

- reliability;

- quality;

- material;

- station maintenance;

- contracted maintenance;

- authority dan delegation.

### Maintenance planning

- AAMP control;

- utilization collection;

- due forecasting;

- maintenance planning;

- work-package preparation;

- tolerance;

- escalation;

- bridging check;

- aircraft induction;

- lease-return requirements.

### Technical operations

- technical log;

- defect reporting;

- pilot reports;

- maintenance action;

- repetitive defect;

- troubleshooting;

- deferred maintenance;

- line maintenance;

- base maintenance;

- AOG recovery;

- maintenance away from home base.

### Contracted maintenance

- AMO selection;

- certificate verification;

- capability verification;

- contract review;

- operator procedures supplied to AMO;

- quality surveillance;

- record delivery;

- findings and corrective actions;

- release acceptance.

Walaupun maintenance dilakukan oleh provider eksternal, records tersebut tetap menjadi records operator dan tanggung jawab operator tidak otomatis berpindah.

### Continuing analysis and surveillance

- reliability program;

- performance standards;

- alert levels;

- repeat defect monitoring;

- component removal trends;

- engine condition monitoring;

- MEL ageing;

- audit provider;

- corrective action;

- management review.

### Special operations

Jika applicable:

- RVSM;

- ETOPS;

- CAT II/III;

- PBN;

- special airport/environment;

- extended overwater;

- low-visibility operation.

Untuk RVSM, DGCA guidance mensyaratkan evaluasi dan approval terhadap maintenance program dan prosedur operator yang relevan. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=4Wyhib5bMrWJHKyE3mEqDH4TwQtXZk9rC4uTPM7Wryra49XlxnDJhUQ4eSkvxBWUxG4ec1jjhdXba4fWVFmPHMBS4Dybsrxefqi4pAfp5P36Os3k4xXkJGmpNAMBaA2Dplb4BWr8uvZJyh6LbZmX2aItOU94PTBAgttRi64YqWTWPFdO3va6NVcXxry95oyMuAS0YfC1rlax90fNHFrIB4SOo6K6&utm_source=chatgpt.com '(RVSM) (ISSUANCEAND SURVEILLANCE FOR ...'))

---

# 6. Quality dan inspection procedure

DGCA mendefinisikan QCM sebagai manual yang menjelaskan inspection dan quality-control system serta prosedur yang digunakan AMO. Part 145 surveillance juga memeriksa quality system, internal audit, records, facilities, maintenance process, subcontracting, dan work away from station.

## Quality Assurance dan Quality Control harus dibedakan

### Quality Control

Berkaitan langsung dengan produk dan pekerjaan:

- receiving inspection;

- preliminary inspection;

- hidden-damage inspection;

- in-process inspection;

- Required Inspection Item;

- independent inspection;

- final inspection;

- functional test;

- conformity;

- return-to-service inspection.

### Quality Assurance

Berkaitan dengan efektivitas sistem:

- internal audit;

- surveillance;

- compliance monitoring;

- auditor independence;

- finding classification;

- root-cause analysis;

- corrective action;

- preventive action;

- effectiveness review;

- management feedback.

## Prosedur inspeksi yang harus ada

### Receiving inspection

- purchase order match;

- part number;

- serial/batch/lot;

- quantity;

- physical condition;

- release certificate;

- traceability;

- shelf life;

- packaging;

- shipping damage;

- suspect unapproved parts;

- quarantine decision.

### Preliminary inspection

Dilakukan sebelum pekerjaan untuk mengidentifikasi:

- actual condition;

- prior repair;

- missing parts;

- corrosion;

- damage;

- contamination;

- incomplete records;

- discrepancy dengan work scope.

### In-process inspection

- inspection point;

- hold point;

- measurement;

- tolerance;

- inspector;

- result;

- rework requirement;

- reference data.

### Required atau independent inspection

Sistem harus memastikan:

- task memang memerlukan inspection;

- inspector memiliki authorization;

- independence requirement terpenuhi;

- orang yang sama tidak melakukan dua fungsi bila prosedur melarang;

- sign-off dilakukan setelah langkah yang diperiksa;

- rework mengembalikan task ke inspection.

### Final inspection

Memastikan:

- seluruh task complete;

- non-routine closed;

- tools removed;

- panels restored;

- parts and fasteners accounted for;

- leaks/function tested;

- records complete;

- release statement sesuai;

- outstanding limitations terlihat.

### Quality finding workflow

```text
Finding Raised
→ Containment
→ Responsible Owner
→ Root Cause
→ Corrective Action Plan
→ Implementation
→ Evidence Review
→ Effectiveness Check
→ Closure
```

Jangan menggunakan tombol `Close Finding` tanpa root cause, evidence, reviewer, dan effectiveness evaluation untuk finding yang signifikan.

---

# 7. Technical record procedure

KP 060 Tahun 2018/SI 8900-3.329 mengatur evaluasi maintenance-records system operator. JDIH menandainya berlaku. SI tersebut menyatakan sistem dapat berbentuk elektronik, tetapi manual operator harus menjelaskan generation, storage, retention, retrieval, responsible persons, serta cara records disediakan untuk DGCA. Ambiguitas dalam prosedur tidak dapat diterima. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/index?kelompok=5&page=44&per-page=12&style=row%2F1000&utm_source=chatgpt.com 'Peraturan - JDIH Kemenhub - Kementerian Perhubungan'))

## Jenis records yang perlu dikelola

### Transactional records

- aircraft technical log;

- pilot defect report;

- maintenance action;

- work order;

- work package;

- routine job card;

- non-routine job card;

- inspection record;

- component change;

- material issue;

- tool use;

- maintenance release;

- CRS/RTS record.

### Current-status records

- total airframe FH/FC;

- engine/APU/propeller utilization;

- life-limited-parts status;

- time since overhaul;

- current inspection status;

- AD applicability dan compliance;

- repetitive AD next due;

- major alterations;

- major repairs;

- component status;

- deferred defect status;

- maintenance program due status.

SI DGCA menyebut AD status record harus menunjukkan AD number dan revision, applicability, date/time atau cycle of compliance, method of compliance, serta next action untuk repetitive AD.

## Retention

Jangan menetapkan satu retention period untuk semua records.

Contoh dari SI DGCA:

- inspection work packages/routine/non-routine tertentu disimpan dua tahun atau hingga diulang/digantikan pekerjaan lain;

- major repair records dapat memiliki ketentuan dua tahun atau sampai superseded;

- major-alteration records dipertahankan bersama aircraft dan ditransfer saat aircraft dijual;

- total time, life-limited status, overhaul status, dan inspection status termasuk records yang mengikuti pesawat atau dipertahankan hingga superseded sesuai kategorinya.

Karena itu, aplikasi perlu mempunyai **retention policy per record type**, bukan hard-delete global.

## Minimum technical-record metadata

```text
Record ID
Aircraft/component identity
Record type
Source transaction
Work description
Approved-data reference
Effective revision
Date/time
Performer
Inspector
Approver
Certificate/license
Authorization
Signature
Station/location
Attachments
Correction/amendment history
Retention category
Transfer status
```

## Koreksi record

Signed record tidak boleh diedit diam-diam. Gunakan:

```text
Original Record
→ Amendment Requested
→ Reason
→ Corrected Value
→ Authorized Review
→ New Revision
```

Keduanya harus tetap tersedia dalam audit trail.

---

# 8. Electronic record dan electronic signature procedure

DGCA SI 8900-3.329 secara eksplisit mengizinkan records system berbentuk elektronik, tetapi mensyaratkan manual menjelaskan sistem dan prosedur generation, storage, retention, preservation, dan retrieval. Sistem harus menghasilkan records yang akurat dan dapat diambil kembali untuk audit.

Di luar regulasi aviasi, PP 71 Tahun 2019 mengatur sistem dan transaksi elektronik, sedangkan Permenkominfo 11 Tahun 2022 mengatur tata kelola sertifikasi elektronik. Permenkominfo tersebut juga mencakup preservasi jangka panjang agar validitas tanda tangan atau segel elektronik tetap dapat dibuktikan meskipun certificate kedaluwarsa atau teknologi berubah. ([JDIH Kemkomdigi](https://jdih.komdigi.go.id/produk_hukum/view/id/695/t/peraturan%2Bpemerintah%2Bnomor%2B71%2Btahun%2B2019?utm_source=chatgpt.com 'Peraturan Pemerintah Nomor 71 Tahun 2019'))

Namun:

> **Keabsahan tanda tangan elektronik secara umum tidak otomatis berarti tanda tangan tersebut diterima sebagai maintenance release atau CRS oleh DGCA.**

Prosedur aviasi tetap harus:

- tercantum dalam approved/accepted manual;

- diterima oleh regulator;

- hanya digunakan oleh personel yang memiliki license dan company authorization;

- mempunyai meaning of signature yang jelas;

- mempertahankan integrity record.

FAA AC 120-78B dapat digunakan sebagai benchmark untuk electronic signature, electronic recordkeeping, dan electronic manuals, tetapi AC tersebut bukan regulasi Indonesia dan bukan pengganti approval DGCA. EASA Part-145 recordkeeping juga dapat digunakan sebagai benchmark tambahan. ([Federal Aviation Administration](https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1043396?utm_source=chatgpt.com 'AC 120-78B - Electronic Signatures ...'))

## Isi electronic-record procedure

### Identity dan authentication

- unique user identity;

- no shared account;

- strong authentication;

- session control;

- account lifecycle;

- credential revocation;

- identity proofing;

- link ke personnel record.

### Authorization

- active license;

- company authorization;

- aircraft/type scope;

- task scope;

- station scope;

- expiry;

- suspension;

- training validity;

- conflict-of-duty check.

### Signature meaning

Sistem harus membedakan:

```text
Performed By
Checked By
Inspected By
Accepted By
Approved By
Released By
```

Satu tombol `Sign` tanpa pernyataan yang ditandatangani berisiko besar.

### Integrity

- signed payload snapshot;

- document/task revision;

- timestamp;

- record hash atau integrity evidence;

- immutable audit event;

- attachment integrity;

- no silent overwrite;

- validation status.

### Certificate dan preservation

- certificate issuer;

- certificate serial;

- validity period;

- revocation status;

- timestamp evidence;

- preservation evidence;

- long-term validation.

### Availability

- backup;

- disaster recovery;

- tested restoration;

- readable export;

- regulator access;

- migration plan;

- vendor exit plan;

- archival format.

### Offline operation

Offline signing harus ditentukan secara eksplisit:

- jenis sign-off yang boleh offline;

- data yang harus sudah tersedia;

- local identity assurance;

- trusted device;

- local timestamp;

- signed payload;

- pending-sync state;

- conflict handling;

- prohibition terhadap final release bila server validation wajib;

- reconciliation audit.

Gunakan state yang jujur:

```text
Saved Locally
Signed Locally
Pending Synchronization
Synchronized
Conflict Requires Review
Rejected by Server Validation
```

Jangan menampilkan `Completed` ketika record baru tersimpan di tablet.

---

# 9. MEL/CDL procedure

KP 523 Tahun 2015/SI 8900-4.4 mengatur prosedur development, review, dan approval Minimum Equipment List serta Configuration Deviation List. ([JDIH Dephub](https://jdih.dephub.go.id/peraturan/detail?data=3jXturvQ7Vw3am4nXBivTL4juV9NElXE84ZA0iUDsHVC4qAmiwwtZX08m37GEVNZmI4Es2mRuicbM8MMzmWjFWWO8W2SaBgnIc24vXOPXicHkO9pPVcLKZMBYGoWZoCBfZLuDGdCXcrhC7lGPK25UTnZlq&utm_source=chatgpt.com 'Peraturan Direktur Jenderal Perhubungan Udara Nomor'))

## MEL

MEL merupakan dokumen operator dan aircraft-specific yang menentukan kondisi tertentu ketika aircraft dapat dioperasikan sementara dengan equipment yang inoperative, sepanjang seluruh limitation dan procedure yang dipersyaratkan dipenuhi.

MEL bukan:

- daftar defect umum;

- izin otomatis untuk terbang;

- alasan bebas untuk menunda defect;

- pengganti engineering assessment;

- pengganti maintenance release.

## Data MEL yang perlu dimodelkan

```text
MEL reference
ATA chapter
Item title
Aircraft applicability
MEL/MMEL revision
Category/rectification interval
Deferral start
Expiry calculation
Number installed
Number required
Remarks/exceptions
Operational procedure
Maintenance procedure
Placard
Operational limitation
Performance impact
Repetitive inspection
Responsible roles
Approval evidence
Extension authority if permitted
Closure reference
```

## MEL workflow

```text
Defect Raised
→ Technical Assessment
→ MEL Applicability Confirmed
→ Category and Expiry Calculated
→ O Procedure Completed
→ M Procedure Completed
→ Placard Installed
→ Restriction Communicated
→ Authorized Deferral
→ Daily/Recurring Control
→ Rectification
→ Inspection/Operational Test
→ MEL Closure
```

Sistem harus mencegah deferral ketika:

- MEL revision tidak applicable;

- item tidak terdaftar;

- conditions tidak terpenuhi;

- expiry lewat;

- O/M procedure incomplete;

- authorization tidak valid;

- operational restriction tidak diterima;

- item merupakan no-go condition.

## CDL

CDL berkaitan dengan operasi aircraft dengan external part tertentu yang hilang atau menyimpang dari konfigurasi standar, sesuai approved configuration-deviation data.

CDL record perlu memuat:

- missing/deviated item;

- configuration applicability;

- performance penalty;

- fuel penalty;

- weight limitation;

- speed limitation;

- route/weather limitation;

- inspection requirement;

- rectification requirement;

- AFM/CDL reference;

- operational acceptance.

Dalam UI, MEL dan CDL dapat berada dalam modul yang sama, tetapi tipe, limitation, sumber approval, dan perhitungan operational impact harus tetap dibedakan.

---

# 10. Defect rectification dan deferral procedure

## Defect lifecycle

```text
Reported
→ Validated
→ Assessed
→ Rectification Planned
→ In Progress
→ Inspection/Test
→ Rectified
→ Record Review
→ Closed
```

Alternatifnya:

```text
Reported
→ Assessed
→ Eligible for Deferral
→ MEL/CDL/Approved Basis Applied
→ Deferred
→ Monitored
→ Rectified
→ Closed
```

## Sumber defect

- pilot technical log;

- pre-flight/transit check;

- scheduled inspection;

- job-card finding;

- component shop report;

- reliability alert;

- cabin log;

- ground handling report;

- engine trend;

- repetitive defect analysis.

## Data defect minimum

```text
Defect ID
Aircraft
Date/time and station
Reporter
Source
ATA
Description
Flight phase
Operational impact
Safety impact
Evidence
Repeat-defect indicator
Assessment
Approved-data reference
Rectify/defer decision
MEL/CDL linkage
Owner
Due/expiry
Maintenance action
Part changes
Test result
Inspector
Closure authority
```

## Assessment questions

1. Apakah kondisi memengaruhi airworthiness?

2. Apakah aircraft harus grounded?

3. Apakah approved troubleshooting data tersedia?

4. Apakah defect tercakup MEL/CDL?

5. Apakah seluruh conditions dan limitations dapat dipenuhi?

6. Apakah defect berulang?

7. Apakah engineering order diperlukan?

8. Apakah component replacement atau repair diperlukan?

9. Apakah independent inspection diperlukan?

10. Apakah operations control harus diberi tahu?

## Repeat defect

Sistem sebaiknya mendeteksi:

- ATA atau system sama;

- gejala serupa;

- aircraft sama;

- interval waktu tertentu;

- penggunaan part yang sama;

- previous troubleshooting;

- repeated removal;

- no-fault-found pattern.

Repeat defect tidak boleh hanya ditandai berdasarkan text matching. Harus dapat direview dan dikonfirmasi oleh engineering/reliability.

## Deferral governance

Deferral hanya boleh dilakukan berdasarkan approved basis, misalnya:

- approved MEL;

- CDL;

- approved maintenance procedure;

- engineering disposition yang sah;

- regulatory authorization yang applicable.

Business rule harus memblokir pilihan `Defer` bila user tidak memilih basis, authorization, interval, dan limitation.

---

# 11. Material, tooling, calibration, dan certification procedure

## 11.1 Material dan parts

AC CASR 21-11 membahas eligibility, quality, dan identification of replacement parts. Installer harus memastikan part acceptable untuk dipasang dan installation dilakukan menggunakan data yang sesuai. Continued-airworthiness responsibility tetap berada pada owner/operator sebagaimana dirujuk dalam ketentuan Part 91, 121, dan 135. ([JDIH Dephub](https://jdih.dephub.go.id/api/media?data=J47QfR7gqPr6rwQ6m04s9H48bn8ZZjwN24DujnEvumJ84ToiD8WeZO78X3cjSRENFt4eaTFepmWeJ8QiPoXiXmK64eRSRmYi8Rw4Uoak5NqxRG8Zk1pywxBsuKklANjvJHdU60RHGEsJvuDAiGTKCplJyt4DgZ2MoLHqJDjFJc0QhVfrBrOqZf7RAVT0B1oCLl4XYUBjvGYPz1JYV8ffzYGItkCK&utm_source=chatgpt.com '(ADVISORY CIRCULAR CASR 21-11) TENTANG ...'))

## Receiving-control fields

```text
Part number
Description
Serial number
Batch/lot
Quantity
Manufacturer
Supplier
Purchase order
Release certificate
Certificate issuer
Certificate number
Condition
Shelf-life expiry
Manufacture date
Traceability chain
Storage requirement
Hazardous/ESD status
Inspection result
Quarantine status
```

## Status material

Gunakan status eksplisit:

```text
Pending Receiving Inspection
Serviceable
Reserved
Issued
Installed
Removed
Unserviceable
Quarantine
Rejected
Scrapped
Returned to Vendor
Sent for Repair
```

Jangan hanya menggunakan `Available` dan `Unavailable`.

## Segregation dan storage

DGCA surveillance memeriksa:

- OEM environmental requirement;

- temperature;

- humidity;

- static protection;

- ultraviolet exposure;

- basic part identity;

- separation serviceable/unserviceable;

- rejected atau questionable part;

- shelf-life;

- protection during storage dan transport.

## Installation eligibility gate

Sebelum install, sistem harus memeriksa:

```text
Part number applicable?
Modification configuration compatible?
Part status serviceable?
Certificate valid?
Traceability complete?
Shelf life valid?
Life remaining sufficient?
Required inspection completed?
Aircraft position compatible?
Interchangeability approved?
```

---

## 11.2 Tools dan GSE

Tool record perlu memuat:

- tool ID;

- part/model;

- serial number;

- tool type;

- owner;

- location;

- serviceability;

- calibration required;

- last calibration;

- next due;

- calibration standard;

- certificate;

- limitation;

- issue/return history;

- associated work;

- damage/loss report.

## Calibration

DGCA audit guidance memeriksa apakah:

- measuring/test equipment dikalibrasi sesuai interval dan manual;

- calibration traceable ke standard yang acceptable bagi DGCA;

- standard dapat berasal dari manufacturer, KAN, atau national authority yang relevan;

- status alat baru diperiksa sebelum digunakan;

- recall system tersedia;

- employee-owned equipment ikut dikendalikan;

- daftar equipment mencakup ID, serial, calibration date, dan next due;

- non-calibrated tool tidak dapat dipakai tanpa sengaja;

- calibration records dipertahankan sesuai procedure; audit guidance tersebut menyebut setidaknya dua tahun.

Tool dengan calibration expired harus otomatis:

```text
Unavailable for Airworthiness Determination
```

Bukan hanya diberi badge kuning.

## Out-of-tolerance calibration

Prosedur harus mengatur:

1. tool dinyatakan out of tolerance;

2. ditentukan periode suspect sejak last known valid calibration;

3. dicari seluruh maintenance task yang menggunakan tool tersebut;

4. engineering/quality melakukan impact assessment;

5. affected aircraft/component diperiksa ulang bila diperlukan;

6. record keputusan disimpan;

7. customer/operator diberi tahu jika applicable.

---

## 11.3 Personnel certification

Sistem perlu membedakan:

- government-issued license;

- aircraft rating;

- company authorization;

- AMO authorization;

- task/process qualification;

- training;

- competence assessment;

- recency;

- medical atau requirement lain bila applicable.

License valid tidak otomatis berarti seseorang boleh menandatangani seluruh task dalam perusahaan.

---

# 12. Authorization matrix

SI 8900-6.9 mensyaratkan AMO memelihara roster personel management, supervisory, inspection, dan personel yang dapat menandatangani maintenance release. Roster harus memuat qualification dan authority, dapat disimpan secara kertas atau elektronik, serta dapat diakses DGCA. Perubahan karena termination, reassignment, perubahan duty/scope, atau penambahan personel harus tercermin dalam roster dalam lima hari kerja.

## Informasi dalam authorization matrix

```text
Personnel ID
Full name
Employment status
Position
Base/station
License number
License category
Aircraft rating
License expiry
Company authorization number
Authorization type
Aircraft/fleet scope
Component scope
Task/process scope
Inspection authority
RII/independent inspection authority
CRS/RTS authority
NDT/welding/special-process qualification
Issue date
Expiry date
Training prerequisites
Recency requirements
Limitations
Suspension status
Approving manager
Specimen signature/stamp
Revision history
```

## Contoh matriks

| Personel           | Perform | Inspect | Independent inspection |   RTS | Fleet | Station |
| ------------------ | ------: | ------: | ---------------------: | ----: | ----- | ------- |
| Technician A       |      Ya |   Tidak |                  Tidak | Tidak | ATR72 | WAM     |
| Inspector B        |      Ya |      Ya |           Ya, terbatas | Tidak | ATR72 | WAM     |
| Certifying Staff C |      Ya |      Ya |           Sesuai scope |    Ya | ATR72 | WAM/JAY |

Matriks tersebut tidak boleh menjadi spreadsheet statis tanpa effective date dan revision history.

## Runtime authorization check

Setiap sign-off harus mengevaluasi:

```text
User authenticated?
Employment active?
License valid?
Company authorization valid?
Aircraft type included?
Task/process included?
Station included?
Required training current?
Recency fulfilled?
Independent-inspection rule fulfilled?
Authorization not suspended?
Record revision still current?
```

Jika satu kondisi gagal, sistem harus menolak signature dan menjelaskan penyebab spesifiknya.

---

# B. Hubungan antardokumen

| Keputusan sistem                      | Sumber otoritatif utama                               |
| ------------------------------------- | ----------------------------------------------------- |
| Task apa yang harus dilakukan         | AAMP, AD, SB, approved engineering data               |
| Kapan task jatuh tempo                | AAMP dan utilization record                           |
| Bagaimana task dilakukan              | AMM/CMM/SRM/EO/job instruction                        |
| Siapa yang boleh melakukan            | Part 65, AMO Manual, authorization matrix             |
| Di mana pekerjaan boleh dilakukan     | AMO Certificate, Ops Specs, capability/location       |
| Material apa yang eligible            | IPC, approved data, receiving/parts procedure         |
| Tool apa yang dapat digunakan         | Job instruction dan calibration procedure             |
| Kapan defect dapat ditunda            | Approved MEL/CDL dan deferral procedure               |
| Siapa yang dapat inspect              | QCM dan authorization matrix                          |
| Kapan dapat release                   | Part 43, Part 145, operator manual, release procedure |
| Apa yang harus disimpan               | CASR dan technical-record procedure                   |
| Bagaimana tanda tangan elektronik sah | Approved electronic-record/signature procedure        |

---

# C. Dokumen yang harus diminta dari operator/AMO

## Prioritas P0 — wajib sebelum mengklaim sistem sesuai kebutuhan operasional

1. AOC/Operating Certificate.

2. Operations Specifications.

3. Aircraft registration dan fleet configuration.

4. AMO Certificate seluruh provider.

5. AMO ratings, Ops Specs, dan capability list.

6. Current approved AAMP.

7. Current approved MEL/CDL.

8. General/Company Maintenance Manual.

9. AMO Manual dan QCM.

10. Technical records procedure.

11. Authorization matrix.

12. Sample technical log.

13. Sample work package dan job card.

14. Sample maintenance release/CRS.

15. Sample defect dan deferred-defect record.

16. Sample material release certificate.

17. Sample calibration certificate.

18. Controlled-document master list.

## Prioritas P1 — diperlukan untuk rule engine dan workflow lengkap

- reliability program;

- CASS procedure;

- AD/SB procedure;

- LLP procedure;

- component-control procedure;

- inspection/RII procedure;

- non-routine procedure;

- shift-handover procedure;

- work-away-from-station procedure;

- vendor approval procedure;

- parts pool/borrowing procedure;

- AOG procedure;

- engineering-order procedure;

- major repair/alteration procedure;

- electronic signature procedure;

- offline/contingency procedure.

## Prioritas P2 — diperlukan untuk production readiness dan audit

- training records;

- competency assessment;

- audit reports;

- corrective-action records;

- retention matrix;

- disaster-recovery test;

- data migration procedure;

- interface-control documents;

- user-access review;

- backup evidence;

- regulator findings;

- past reliability reports;

- past repeat-defect analysis;

- manual revision distribution evidence.

---

# D. Struktur modul aplikasi yang berasal dari riset ini

```text
1. Regulatory & Controlled Documents
2. Aircraft Configuration and Utilization
3. Maintenance Program and Due Control
4. Work Packages and Job Cards
5. Defects, Findings, MEL and CDL
6. Materials and Component Control
7. Tools, GSE and Calibration
8. Personnel Qualifications and Authorization
9. Inspection and Quality
10. Technical Records
11. Technical Release / CRS
12. Reliability and CASS
13. Audit Trail and Electronic Signature
14. Offline Synchronization and Data Integrity
```

## Release gate minimum

Aircraft tidak dapat dianggap eligible for release bila salah satu kondisi berikut belum terpenuhi:

- mandatory job card incomplete;

- inspection incomplete;

- open finding tanpa disposition;

- MEL/CDL condition tidak terpenuhi;

- MEL expired;

- part tidak eligible;

- installed component traceability tidak lengkap;

- required tool calibration invalid;

- technical record belum lengkap;

- personel tidak authorized;

- approved-data revision tidak valid;

- work package belum signed;

- configuration tidak konsisten;

- unresolved synchronization conflict pada record kritis.

---

# Kesimpulan utama

Dari seluruh hasil riset, 12 dokumen tersebut bukan 12 dokumen yang berdiri sendiri. Mereka membentuk satu rantai kontrol:

```text
Regulation
→ Organizational approval
→ Approved program/manual
→ Procedure
→ Authorized personnel
→ Controlled execution
→ Inspection
→ Release
→ Retained evidence
```

Untuk proyek MRO, jangan menyebut aplikasi **“compliant CASR”** hanya karena sudah mempunyai menu AAMP, MEL, job card, dan electronic signature. Kredibilitas compliance baru mulai terbentuk ketika setiap business rule dapat ditelusuri ke:

1. regulasi yang applicable;

2. approved manual/program;

3. aircraft atau organization applicability;

4. authorized role;

5. bukti yang harus dihasilkan;

6. audit trail;

7. acceptance atau approval DGCA yang relevan.

Tahap paling efektif berikutnya adalah membangun **Regulatory and Manual Traceability Register** yang memetakan seluruh requirement di atas menjadi business rule, fitur aplikasi, data wajib, authorized role, dan evidence output.
