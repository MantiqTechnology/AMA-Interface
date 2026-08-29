# Backlog Remediasi Berbasis Risiko

Urutan ini memprioritaskan keselamatan, data integrity, dan kredibilitas presentasi. Estimasi adalah ukuran relatif, bukan jadwal kontraktual.

## Gate 0 — Sebelum demo PT AMA

| Urutan | Action                                                                        | Owner utama       | Ukuran | Acceptance                                                                 |
| -----: | ----------------------------------------------------------------------------- | ----------------- | ------ | -------------------------------------------------------------------------- |
|      1 | Nonaktifkan DevTools di demo/non-dev dan upgrade Nuxt/dependency critical     | Platform          | S–M    | `pnpm audit --prod` tidak memiliki critical; tidak ada DevTools toggle/RPC |
|      2 | Batasi demo ke localhost/private network dan dokumentasikan no-real-data      | Platform/PM       | S      | Port tidak bind publik; presenter checklist signed                         |
|      3 | Ganti notifikasi GA/QZ/JT dengan honest empty state/AMA fixture berlabel demo | Frontend/Ops      | S      | Tidak ada airline/station asing; View All bekerja atau hilang              |
|      4 | Hide excluded/frontend-only modules dan Uploads pada demo profile             | Frontend/Platform | S      | Persona hanya melihat scope presentasi                                     |
|      5 | Perbaiki lima E2E drift tanpa melemahkan safety blocker                       | QA/Frontend       | M      | 21/21 selected E2E lulus; departure test assert action absent saat blocked |
|      6 | Perbaiki lint ignore `.vercel` dan jadikan clean command repeatable           | Platform          | S      | `pnpm lint` exit 0 pada checkout + generated artifacts                     |
|      7 | Rehearse/reset/backup scripted data state                                     | QA/Ops            | S      | Dua full rehearsal berturut-turut tanpa manual DB edit                     |

## Gate 1 — Sebelum demo dapat diakses jaringan luar

| Urutan | Action                                                             | Owner utama       | Ukuran | Acceptance                                                                |
| -----: | ------------------------------------------------------------------ | ----------------- | ------ | ------------------------------------------------------------------------- |
|      1 | Ganti default anonymous admin dengan authenticated deny-by-default | Security/Backend  | L      | Tanpa session seluruh protected API 401; role tidak ditentukan client     |
|      2 | Lindungi seluruh upload APIs                                       | Security/Backend  | L      | Permission, owner/station scope, MIME/size/AV scan, audit, object storage |
|      3 | Implement document owner resolver per type                         | Backend/Ops       | L      | Negative tests flight/aircraft/personnel lintas station lulus             |
|      4 | Terapkan server permission matrix ke seluruh master-data/API       | Backend           | L      | Route inventory menunjukkan 100% handler protected/explicitly public      |
|      5 | Tambahkan CSRF/session hardening/rate limits/security headers      | Security/Platform | M–L    | Penetration checklist dan automated negative tests lulus                  |

## Gate 2 — Sebelum pilot/UAT operasional

| Urutan | Action                                                                 | Owner utama          | Ukuran | Acceptance                                                                     |
| -----: | ---------------------------------------------------------------------- | -------------------- | ------ | ------------------------------------------------------------------------------ |
|      1 | Migrasi SQLite ke PostgreSQL dengan migration dan transaction strategy | Data/Backend         | XL     | Restart/multi-instance consistency, migration rollback, load/concurrency tests |
|      2 | S3-compatible document storage + retention + presigned access          | Platform/Security    | L      | No public raw upload path; retention/access audit verified                     |
|      3 | Backup/restore/DR + observability                                      | Platform             | L      | Restore drill, RPO/RTO, logs/traces/alerts/runbook                             |
|      4 | Stabilkan full test suite dan race workers                             | QA/Backend           | L      | Full suite closes normally within resource budget; concurrency tests green     |
|      5 | Refactor flight/MRO god services behind characterization tests         | Architecture/Backend | XL     | Typed commands, state machine, repository/transaction boundaries               |
|      6 | Accessibility and responsive remediation                               | Frontend/UX          | L      | Keyboard/axe/visual regression 360–1440; no clipped critical action            |
|      7 | Canonical locale/time/unit service                                     | Frontend/Domain      | M      | WIT/WITA/WIB explicit; dates/weights/fuel/currency consistent                  |
|      8 | Complete supplier/service/cost/journal lineage                         | Ops/Finance/Backend  | L      | Request → confirmation → actual → invoice/handoff → posted journal trace       |

## Gate 3 — Sebelum production claim

| Urutan | Action                                          | Owner utama                | Ukuran | Acceptance                                                                       |
| -----: | ----------------------------------------------- | -------------------------- | ------ | -------------------------------------------------------------------------------- |
|      1 | AOC/OpSpecs/manual traceability workshop        | AMA accountable roles + BA | L      | Signed authority/state/retention matrix per operation/aircraft                   |
|      2 | Configurable PIC/FOO/dispatch/release rules     | Ops/Backend                | XL     | Change-impact re-evaluation, withdrawal/re-release, authority snapshots          |
|      3 | MEL/deferred defect full lifecycle              | Maintenance/Backend        | XL     | Category/interval/expiry/extension/placard/ops-procedure/audit validated         |
|      4 | RII/dual sign-off/RTS authority configuration   | Maintenance/Quality        | XL     | Task-based segregation and authorization expiry negative tests                   |
|      5 | SMS end-to-end                                  | Safety/Quality/Security    | XL     | Confidential reporting, hazard/risk, FRAT, CAPA, effectiveness, SPI, MOR         |
|      6 | Aviation Security scoped module                 | AVSEC/Security             | XL     | Need-to-know, chain-of-custody, restricted evidence, audit per approved program  |
|      7 | Offline station subsystem                       | Architecture/Station/QA    | XL     | Encrypted scoped cache, queue, idempotency, replay validation, conflict UI/audit |
|      8 | Formal security/performance/reliability testing | Independent assurance      | L–XL   | Pen test, load/soak/failover, packet-loss/offline, recovery evidence             |

## Offline delivery sequence yang aman

1. Read-only station cache dengan explicit staleness.
2. Local drafts untuk notes/checklist/evidence; tidak dianggap submitted.
3. Stable operation ID, device/session/station scope, schema version.
4. Sync endpoint yang mengulang authorization, validation, transition, version checks.
5. Status `queued/syncing/accepted/conflict/failed` dan sync audit.
6. Failure tests: response lost after commit, duplicate retry, out-of-order, clock skew, authority expired, record closed.
7. Hanya setelah itu pertimbangkan manifest/fuel/station mutations terbatas.
8. Departure/arrival/closure, technical release, approval, posting, payment tetap online-only kecuali SOP dan safety case khusus disetujui.

## Definition of done lintas backlog

- Source, runtime, dan negative test evidence tersedia.
- Action bertahan setelah refresh/restart sesuai deployment topology.
- Authorization diuji server-side, bukan hanya visibility UI.
- Critical mutation atomic dengan audit; failure tidak berubah menjadi success.
- Conflict/double-submit/idempotency diuji.
- Copy menjelaskan blocker, owner, next action, dan recovery.
- Data demo jelas dibedakan dari calculated/transactional/real data.
- Dokumentasi dan implementation diperbarui bersama; mismatch tidak dibiarkan menjadi “tribal knowledge”.
