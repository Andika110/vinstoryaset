# Jira Backlog — IT Asset & Inventory Management

**Project:** [SCRUM — Aset/Inventory Management](https://andikasitindaon198.atlassian.net/jira/software/projects/SCRUM/boards/1)  
**Sumber:** `Design_UI.md` (FEAT-01..FEAT-19), `PRD_v1.1.md`, `ARCHITECTURE.md`, `design_pattern.md`, `Design System v1`  
**Status:** backlog lengkap (120 issue) ada di Jira; FND-01..FND-09, FEAT-01, FEAT-02, FEAT-03, FEAT-04, FEAT-05, FEAT-06, FEAT-07, FEAT-08, FEAT-09, FEAT-10, FEAT-11, FEAT-12, FEAT-13, FEAT-14, FEAT-15, FEAT-16, FEAT-17, FEAT-18, dan FEAT-19 sudah **Done**.

## Ringkasan

| Tipe           |  Jumlah |
| -------------- | ------: |
| Epic           |      20 |
| Task (fondasi) |      15 |
| Story (fitur)  |      85 |
| **Total**      | **120** |

Semua issue memakai label `backlog-v1` agar mudah dicari:

```text
project = SCRUM AND labels = backlog-v1 ORDER BY key ASC
```

## Epic & jumlah Story

| Kode    | Epic                                  | Key      |   Story | Prioritas |
| ------- | ------------------------------------- | -------- | ------: | --------- |
| FND     | Fondasi Platform, UI Kit & Deployment | SCRUM-6  | 15 task | P0        |
| FEAT-01 | Authentication & Session              | SCRUM-7  |       5 | P0        |
| FEAT-02 | User Management                       | SCRUM-5  |       5 | P0        |
| FEAT-03 | Dashboard                             | SCRUM-9  |       4 | P0        |
| FEAT-04 | Master Data Management                | SCRUM-8  |       7 | P0        |
| FEAT-05 | IT Asset Management                   | SCRUM-12 |       5 | P0        |
| FEAT-06 | Asset Assignment                      | SCRUM-10 |       2 | P0        |
| FEAT-07 | Asset Mutation                        | SCRUM-14 |       3 | P1        |
| FEAT-08 | IT Inventory Management               | SCRUM-13 |       4 | P0        |
| FEAT-09 | Asset Receiving                       | SCRUM-11 |       4 | P0        |
| FEAT-10 | Stock Transaction Management          | SCRUM-15 |       6 | P0        |
| FEAT-11 | Borrowing & Returning                 | SCRUM-17 |       4 | P1        |
| FEAT-12 | Maintenance Management                | SCRUM-18 |       4 | P1        |
| FEAT-13 | Stock Opname                          | SCRUM-16 |       4 | P1        |
| FEAT-14 | Asset Disposal                        | SCRUM-19 |       4 | P1        |
| FEAT-15 | Outlet Item Request                   | SCRUM-20 |       5 | P1        |
| FEAT-16 | Reporting & Analytics                 | SCRUM-23 |       7 | P0/P2     |
| FEAT-17 | Audit Log                             | SCRUM-21 |       3 | P0/P1     |
| FEAT-18 | Data Import                           | SCRUM-24 |       6 | P0        |
| FEAT-19 | QR Label & Scanner                    | SCRUM-22 |       3 | P2        |

## Urutan eksekusi yang disarankan

### Tahap 0 — Fondasi (wajib lebih dulu)

1. `FND-01` Setup proyek SvelteKit + Bun + TypeScript
2. `FND-02` Design token & global styles
3. `FND-03` UI kit dasar
4. `FND-04` AppShell & navigasi per role
5. `FND-05` Komponen daftar & state
6. `FND-06` Dialog, feedback & file upload
7. `FND-07` PostgreSQL + Drizzle + migrasi
8. `FND-08` Skema database inti & seed
9. `FND-09` Auth core, permission & outlet scope
10. `FND-10` Service patterns (audit, state machine, nomor dokumen, idempotency)
11. `FND-11` Error handling, security headers & healthz
12. `FND-12` Deployment, tunnel, backup & restore
13. `FND-13` Observability & logging
14. `FND-14` Test setup & jalur kritis
15. `FND-15` Standar global UI states & aksesibilitas

### Tahap 1 — MVP (P0)

FEAT-01 → FEAT-02 → FEAT-03 → FEAT-04 → FEAT-05 → FEAT-06 → FEAT-08 → FEAT-09 → FEAT-10 → FEAT-16 (laporan dasar) → FEAT-17 (audit dasar) → FEAT-18 (import).

### Tahap 2 — Operasional (P1)

FEAT-07 → FEAT-11 → FEAT-12 → FEAT-15.

### Tahap 3 — Penyempurnaan

FEAT-13 → FEAT-14 → laporan lanjutan FEAT-16 → audit enhancement FEAT-17 → FEAT-19 (opsional).

## Sprint 1 — Fondasi & Authentication

**Board:** SCRUM board · **Status:** future sprint (belum dimulai)  
**Tanggal:** 3 Desember 2026 – 16 Desember 2026  
**Goal:** Fondasi aplikasi siap dipakai: repo, design system, database, auth core, dan alur login/role berjalan end-to-end.

| Key      | Issue                                                                 |
| -------- | --------------------------------------------------------------------- |
| SCRUM-27 | [FND-01] Setup proyek SvelteKit + Bun + TypeScript                    |
| SCRUM-25 | [FND-02] Design token & global styles                                 |
| SCRUM-26 | [FND-03] UI kit dasar                                                 |
| SCRUM-28 | [FND-04] AppShell, Sidebar, BottomNav, PageHeader & navigasi per role |
| SCRUM-29 | [FND-05] Komponen daftar & state                                      |
| SCRUM-30 | [FND-06] ConfirmDialog, feedback & FileUpload                         |
| SCRUM-31 | [FND-07] PostgreSQL, Docker Compose, Drizzle & migrasi                |
| SCRUM-32 | [FND-08] Skema database inti & seed                                   |
| SCRUM-34 | [FND-09] Auth core, permission & outlet scope                         |
| SCRUM-42 | [FEAT-01-01] Halaman login + form action                              |
| SCRUM-43 | [FEAT-01-02] Siklus sesi, logout & kedaluwarsa                        |
| SCRUM-40 | [FEAT-01-03] First login – wajib ganti password                       |
| SCRUM-41 | [FEAT-01-04] Pembatasan login & akun nonaktif                         |
| SCRUM-45 | [FEAT-01-05] Route guard & pesan akses                                |

Sprint 0 yang sedang aktif tidak diubah.

### Progress Sprint 1

| Key      | Issue                                            | Status |
| -------- | ------------------------------------------------ | ------ |
| SCRUM-27 | FND-01 Setup proyek SvelteKit + Bun + TypeScript | Done   |
| SCRUM-31 | FND-07 PostgreSQL native, Drizzle & migrasi      | Done   |
| SCRUM-25 | FND-02 Design token & global styles              | Done   |
| SCRUM-26 | FND-03 UI kit dasar                              | Done   |
| SCRUM-28 | FND-04 AppShell, Sidebar, BottomNav, PageHeader  | Done   |
| SCRUM-32 | FND-08 Skema database inti & seed data awal      | Done   |
| SCRUM-34 | FND-09 Auth core, permission matrix & scope      | Done   |
| SCRUM-33 | FND-11 Error handling, security headers & health | Done   |
| SCRUM-35 | FND-10 Service patterns & idempotency            | Done   |
| SCRUM-38 | FND-14 Test setup & pengujian jalur kritis       | Done   |
| SCRUM-37 | FND-15 UI states, aksesibilitas & responsive     | Done   |
| SCRUM-39 | FND-13 Observability & structured logging        | Done   |
| SCRUM-7  | FEAT-01 Authentication & Session (5 story)       | Done   |
| SCRUM-29 | FND-05 Komponen daftar & state                   | Done   |
| SCRUM-5  | FEAT-02 User Management (5 story)                | Done   |
| SCRUM-30 | FND-06 ConfirmDialog, Toast & FileUpload         | Done   |
| SCRUM-9  | FEAT-03 Dashboard (4 story)                      | Done   |
| SCRUM-8  | FEAT-04 Master Data Management (7 story)         | Done   |
| SCRUM-12 | FEAT-05 IT Asset Management (5 story)            | Done   |
| SCRUM-10 | FEAT-06 Asset Assignment (2 story)               | Done   |
| SCRUM-13 | FEAT-08 IT Inventory Management (4 story)        | Done   |
| SCRUM-11 | FEAT-09 Asset Receiving (4 story)                | Done   |
| SCRUM-15 | FEAT-10 Stock Transaction Management (6 story)   | Done   |
| SCRUM-14 | FEAT-07 Asset Mutation (3 story)                 | Done   |
| SCRUM-17 | FEAT-11 Borrowing & Returning (4 story)          | Done   |
| SCRUM-18 | FEAT-12 Maintenance Management (4 story)         | Done   |
| SCRUM-20 | FEAT-15 Outlet Item Request (5 story)            | Done   |
| SCRUM-16 | FEAT-13 Stock Opname (4 story)                   | Done   |
| SCRUM-19 | FEAT-14 Asset Disposal (4 story)                 | Done   |
| SCRUM-23 | FEAT-16 Reporting & Analytics (7 story)          | Done   |
| SCRUM-21 | FEAT-17 Audit Log (3 story)                      | Done   |
| SCRUM-24 | FEAT-18 Data Import (6 story)                    | Done   |
| SCRUM-22 | FEAT-19 QR Label & Scanner (3 story)             | Done   |

### FEAT-03 — Dashboard

| Key      | Story                                                                    | Status |
| -------- | ------------------------------------------------------------------------ | ------ |
| SCRUM-51 | FEAT-03-01 Dashboard IT Administrator                                    | Done   |
| SCRUM-53 | FEAT-03-02 Dashboard IT Support – antrean pekerjaan                      | Done   |
| SCRUM-52 | FEAT-03-03 Dashboard Outlet Management                                   | Done   |
| SCRUM-50 | FEAT-03-04 Komponen dashboard bersama: SummaryCard, ActivityList & state | Done   |

Catatan implementasi:

- `src/lib/server/services/dashboard.ts` memuat agregat aset, inventory, request,
  maintenance, peminjaman, mutasi, dan transaksi stok. Setiap widget dibungkus loader
  aman sehingga error satu widget tidak menjatuhkan halaman.
- `src/lib/dashboard.ts` menyimpan tipe view model yang dipakai server dan komponen.
- `SummaryCard` dan `ActivityList` reusable dengan state loading skeleton, empty, dan
  error; angka memakai `tabular-nums` dan layout satu kolom di mobile.
- Role outlet memakai `scopeToUser()` pada seluruh query; parameter URL tidak membuka
  data outlet lain dan kolom biaya tidak pernah diambil.
- Peringatan stok minimum, stok habis, dan peminjaman terlambat tampil di atas widget.
- Tautan kartu/baris membawa filter atau pencarian ke halaman modul tujuan.

### FEAT-04 — Master Data Management

| Key      | Story                                                                               | Status |
| -------- | ----------------------------------------------------------------------------------- | ------ |
| SCRUM-55 | FEAT-04-01 Master Data Overview & navigasi modul                                    | Done   |
| SCRUM-56 | FEAT-04-02 Master data list: search, filter status & pagination                     | Done   |
| SCRUM-54 | FEAT-04-03 Create/edit master data & validasi duplikat                              | Done   |
| SCRUM-57 | FEAT-04-04 Outlet & hierarki Location                                               | Done   |
| SCRUM-58 | FEAT-04-05 Employee & Department management                                         | Done   |
| SCRUM-60 | FEAT-04-06 Master atribut aset & inventory (kategori, brand, model, condition, UoM) | Done   |
| SCRUM-59 | FEAT-04-07 Hak akses master data & aturan nonaktif (tanpa hard delete)              | Done   |

Catatan implementasi:

- Registry `MASTER_TYPES` di `src/lib/server/services/master-data.ts` menjadi satu sumber
  untuk metadata list/form, label, kolom, dan batas akses.
- Route generik: `/admin/master-data/[type]` dan `/admin/master-data/[type]/[id]`.
- `Asset Status` hanya membaca enum PostgreSQL dan tidak punya route tambah/edit.
- Support mendapat subset tulis; outlet ditolak 403 di server.
- Tidak ada hard delete: aksi nonaktif mengisi `is_active=false` dan menulis audit.
- Named action `?/save` dan `?/deactivate` dipakai agar tidak bentrok dengan aturan
  SvelteKit “default action + named action”.
- Deteksi duplikat memeriksa `errno` PostgreSQL 23505 pada rantai `cause` error driver.

### FEAT-05 — IT Asset Management

| Key      | Story                                                                | Status |
| -------- | -------------------------------------------------------------------- | ------ |
| SCRUM-62 | FEAT-05-01 Asset list dengan pencarian, filter & pagination          | Done   |
| SCRUM-61 | FEAT-05-02 Create asset + upload foto & validasi unik                | Done   |
| SCRUM-64 | FEAT-05-03 Edit asset & atribut yang dikunci                         | Done   |
| SCRUM-63 | FEAT-05-04 Asset detail, tab & action menu sesuai transisi           | Done   |
| SCRUM-65 | FEAT-05-05 Asset history: movement, maintenance & borrowing timeline | Done   |

Catatan implementasi:

- `src/lib/server/services/assets.ts` menangani list, detail, create, edit, foto, dan
  riwayat dengan scope outlet di server.
- `src/lib/server/domain/transitions.ts` memuat `ASSET_TRANSITIONS`, label, tone, dan
  `assertTransition` sesuai `design_pattern.md`.
- List memakai filter kategori/lokasi/status di URL dan pagination server-side; kolom
  biaya tidak pernah diambil untuk role outlet.
- Create memvalidasi kode unik dan serial unik (jika diisi), menyimpan foto lewat
  `UPLOAD_DIR`, dan menulis audit `asset_created`.
- Edit mengunci status/lokasi/pemegang, menolak aset disposed, memakai optimistic check
  `updatedAt` (409 bila berubah), dan menulis audit `asset_updated`.
- Detail memiliki tab Ringkasan, Mutasi, Maintenance, Peminjaman, dan Riwayat gabungan
  dengan filter; foto dilayani route terautentikasi `/assets/[id]/photo`.
- Aksi pada action menu mengikuti state machine; modul transaksi ditandai FEAT terkait
  sampai fiturnya dibangun.
- Detail/foto di luar scope outlet dijawab 404.

### FEAT-06 — Asset Assignment

| Key      | Story                                                  | Status |
| -------- | ------------------------------------------------------ | ------ |
| SCRUM-68 | FEAT-06-01 Form asset assignment + sinkronisasi status | Done   |
| SCRUM-66 | FEAT-06-02 Assignment history per aset & global        | Done   |

Catatan implementasi:

- `src/lib/server/services/assignments.ts` menangani form options, validasi, transaksi
  penempatan, riwayat global, dan filter.
- Status aset disinkronkan: dengan employee → `in_use`, tanpa employee → `available`.
  Hanya aset `available`/`in_use` yang dapat ditempatkan; status lain ditolak.
- Employee, department, dan lokasi tujuan wajib satu outlet.
- Baris aset dikunci `for update`, movement dan audit ditulis dalam transaksi yang sama.
- `submission_id` pada `asset_movements` (migrasi `0004_deep_magik`) membuat submit ganda
  idempoten.
- `/assets/assignments` menampilkan riwayat dengan filter tanggal/lokasi/employee,
  pencarian, pagination, dan scope outlet.
- Action menu aset sekarang menautkan `Penempatan` ke form; outlet hanya dapat melihat
  riwayat, tidak membuat penempatan.

### FEAT-08 — IT Inventory Management

| Key      | Story                                                                | Status |
| -------- | -------------------------------------------------------------------- | ------ |
| SCRUM-72 | FEAT-08-01 Inventory item list + filter stok                         | Done   |
| SCRUM-71 | FEAT-08-02 Create/edit inventory item                                | Done   |
| SCRUM-74 | FEAT-08-03 Inventory detail: stok total, breakdown lokasi & timeline | Done   |
| SCRUM-73 | FEAT-08-04 Minimum stock per item per lokasi                         | Done   |

Catatan implementasi:

- `src/lib/server/services/inventory.ts` menangani list agregat stok, detail, create,
  edit, minimum stok, dan timeline transaksi.
- List memakai agregat `stock_balances` + `min_stock`; filter kategori/lokasi/status
  stok tersimpan di URL dan outlet hanya melihat saldo outletnya.
- Form item tidak pernah menulis quantity; stok awal tetap melalui receiving/opening
  balance. Minimum stok per lokasi diatur lewat form dan dicatat sebagai
  `inventory_min_stock_updated`.
- Item nonaktif tetap tampil di list dengan penanda, tetapi tidak muncul di pilihan
  transaksi baru.
- Detail menampilkan total stok, breakdown per lokasi, warning low/out, dan timeline
  transaksi read-only dengan scope outlet.
- Item Code duplikat ditolak dengan pesan “Item Code sudah digunakan.”.

### FEAT-09 — Asset Receiving

| Key      | Story                                                    | Status |
| -------- | -------------------------------------------------------- | ------ |
| SCRUM-75 | FEAT-09-01 Receiving list & filter jenis/tanggal         | Done   |
| SCRUM-78 | FEAT-09-02 Create receiving – IT Asset (auto Asset Code) | Done   |
| SCRUM-77 | FEAT-09-03 Create receiving – Inventory (Stock In)       | Done   |
| SCRUM-76 | FEAT-09-04 Receiving detail & ringkasan                  | Done   |

Catatan implementasi:

- `src/lib/server/services/receivings.ts` menangani list, form options, create, dan
  detail receiving.
- Satu receipt berisi satu baris penerimaan (MVP): inventory (item + qty) atau aset
  (identitas + qty unit).
- Penerimaan inventory menambah `stock_balances`, membuat `stock_documents` stock_in
  (`STI-YYYY-####`), dan satu `stock_transactions` dalam transaksi yang sama.
- Penerimaan aset membuat satu record aset per unit dengan Asset Code otomatis
  `AST-YYYY-####`, status `Available`, dan satu baris receipt per aset.
- Receipt number `RCV-YYYY-####` unik; idempotensi memakai `submissionId`.
- Validasi qty > 0, item aktif, supplier/lokasi aktif, dan serial hanya untuk qty 1.
- Detail read-only menampilkan ringkasan unit, asset units, inventory qty, dan tautan
  ke aset/item. Outlet tidak memiliki akses (403).

### FEAT-10 — Stock Transaction Management

| Key      | Story                                                 | Status |
| -------- | ----------------------------------------------------- | ------ |
| SCRUM-79 | FEAT-10-01 Stock transaction list & filter            | Done   |
| SCRUM-80 | FEAT-10-02 Stock Out form + indikator ketersediaan    | Done   |
| SCRUM-81 | FEAT-10-03 Stock Transfer antar-lokasi (dua ledger)   | Done   |
| SCRUM-82 | FEAT-10-04 Stock Adjustment dengan alasan wajib       | Done   |
| SCRUM-84 | FEAT-10-05 Stock transaction detail & referensi audit | Done   |
| SCRUM-83 | FEAT-10-06 Invariant stok & pengujian konkurensi      | Done   |

Catatan implementasi:

- `src/lib/server/services/stock.ts` menangani list, form options, Stock Out, Transfer,
  Adjustment, detail, dan ledger.
- `src/lib/server/services/stock-form.ts` memvalidasi form per jenis transaksi.
- Saldo dikunci `SELECT ... FOR UPDATE` sebelum validasi/update; transfer mengunci dua
  lokasi dalam urutan ID yang konsisten.
- Stock Out/Transfer/Adjustment memakai satu transaksi database bersama dokumen, baris
  ledger, perubahan saldo, dan audit.
- Nomor dokumen `SOT/TRF/ADJ-YYYY-####`; idempotensi `submissionId`.
- Adjustment mewajibkan alasan dan menolak stok negatif. Transfer membuat dua baris
  ledger (`transfer_out` dan `transfer_in`).
- List mencakup dokumen Stock In dari penerimaan; detail menampilkan referensi receipt.
- Detail read-only; outlet 403.

### FEAT-07 — Asset Mutation

| Key      | Story                                                     | Status |
| -------- | --------------------------------------------------------- | ------ |
| SCRUM-67 | FEAT-07-01 Mutation list dengan filter tanggal & lokasi   | Done   |
| SCRUM-70 | FEAT-07-02 Create mutation satu langkah + validasi lokasi | Done   |
| SCRUM-69 | FEAT-07-03 Mutation detail + movement timeline            | Done   |

Catatan implementasi:

- `src/lib/server/services/mutations.ts` menangani list, form options, create, detail,
  dan timeline.
- Form memilih aset dan lokasi tujuan; lokasi sumber otomatis. Aset Disposed/On Loan
  ditolak; lokasi asal=tujuan ditolak.
- Baris aset dikunci, lokasi aset diperbarui, movement bertipe mutation dengan nomor
  `MUT-YYYY-####`, snapshot lokasi/pemegang, dan audit `asset_mutated` ditulis dalam satu
  transaksi.
- Idempotensi memakai `submissionId` pada `asset_movements`.
- List mendukung pencarian nomor/kode/nama aset, filter lokasi dan tanggal, pagination,
  serta scope outlet.
- Detail menampilkan seluruh field mutasi dan timeline penempatan/mutasi aset; read-only
  dan out-of-scope 404.
- Action menu Mutasi pada detail aset aktif.

### FEAT-11 — Borrowing & Returning

| Key      | Story                                                   | Status |
| -------- | ------------------------------------------------------- | ------ |
| SCRUM-88 | FEAT-11-01 Loan list + indikator overdue turunan        | Done   |
| SCRUM-86 | FEAT-11-02 Create loan untuk aset Available             | Done   |
| SCRUM-87 | FEAT-11-04 Form pengembalian aset + kondisi akhir wajib | Done   |
| SCRUM-85 | FEAT-11-03 Loan detail + informasi peminjam             | Done   |

Catatan implementasi:

- `src/lib/server/services/loans.ts` menangani list, form options, create, detail,
  return, cancel, dan perhitungan overdue.
- Hanya aset `available` yang dapat dipinjam; baris aset dan loan dikunci, status aset
  berubah `on_loan`, nomor `LN-YYYY-####`, audit, dan idempotensi `submissionId`.
- Overdue dihitung dari `expected_return_date` (tidak disimpan); badge menampilkan jumlah
  hari.
- Pengembalian mewajibkan kondisi akhir; kondisi mengandung “Rusak” → aset `damaged`,
  selain itu → `available`; loan menjadi `returned`.
- Pembatalan loan borrowed mengembalikan aset ke `available` dan status `cancelled`.
- Outlet dapat melihat loan aset outletnya (read-only), tidak dapat create/return/cancel.
- Action menu Peminjaman pada detail aset aktif.

### FEAT-12 — Maintenance Management

| Key      | Story                                                                    | Status |
| -------- | ------------------------------------------------------------------------ | ------ |
| SCRUM-90 | FEAT-12-01 Maintenance list dengan filter status/lokasi/tanggal          | Done   |
| SCRUM-89 | FEAT-12-02 Report damage / create maintenance                            | Done   |
| SCRUM-91 | FEAT-12-03 Maintenance detail + timeline & attachment                    | Done   |
| SCRUM-92 | FEAT-12-04 Process maintenance: status, teknisi, spare part & completion | Done   |

Catatan implementasi:

- `src/lib/server/services/maintenance.ts` menangani list, report, detail, proses status,
  spare part, pembatalan, timeline, dan foto.
- Migrasi `0005_lonely_molecule_man` menambah `photo_path` dan `cancelled_reason` pada
  `asset_maintenances`.
- Laporan kerusakan membuat aset `damaged`, status maintenance `reported`, nomor
  `MNT-YYYY-####`, audit, dan idempotensi submissionId.
- Proses mengikuti transisi reported → in_progress → waiting_parts → completed/cancelled.
  Saat in progress aset `under_maintenance`; selesai/batal mengembalikan status aset
  sebelumnya.
- Spare part saat completion mengurangi stok lokasi maintenance, membuat Stock Out +
  ledger, dan mencatat `maintenance_parts` dalam satu transaksi.
- Outlet hanya melihat maintenance aset outletnya; cost/vendor disaring dan aksi proses
  ditolak 403. Foto dilayani route terautentikasi.
- Audit status/spare part/stock tercatat.

### FEAT-15 — Outlet Item Request

| Key       | Story                                                               | Status |
| --------- | ------------------------------------------------------------------- | ------ |
| SCRUM-101 | FEAT-15-01 Request list – Outlet (hanya milik sendiri)              | Done   |
| SCRUM-103 | FEAT-15-02 Request inbox – IT Support                               | Done   |
| SCRUM-102 | FEAT-15-03 Create request dengan banyak baris item                  | Done   |
| SCRUM-104 | FEAT-15-04 Request detail – Outlet + pembatalan                     | Done   |
| SCRUM-108 | FEAT-15-05 Request processing – fulfillment sebagian/penuh & reject | Done   |

Catatan implementasi:

- `src/lib/server/services/requests.ts` menangani list, form options, create, detail,
  process, fulfill, reject, dan cancel.
- Outlet scope dari sesi (`outlet_id`), bukan input; outlet lain dijawab 404. Admin/
  Support melihat inbox seluruh outlet dengan filter outlet/status/tanggal.
- Create request multi-baris: header + lines dalam satu transaksi, nomor
  `REQ-YYYY-####`, audit, idempotensi submissionId. Stok yang ditampilkan hanya total
  umum, bukan rincian lokasi.
- Processing: Submitted → Processing → Partially Fulfilled/Fulfilled, reject dengan alasan
  wajib, cancel hanya oleh outlet saat Submitted.
- Fulfillment memilih lokasi sumber, memvalidasi sisa qty dan stok, membuat satu Stock
  Out terkait request + ledger, lalu memperbarui fulfilled qty dan status.
- Idempotensi fulfillment memakai submissionId Stock Out.
- Data biaya tidak relevan pada modul ini.

### FEAT-16 — Reporting & Analytics

| Key       | Story                                                 | Status |
| --------- | ----------------------------------------------------- | ------ |
| SCRUM-107 | FEAT-16-01 Reports overview & navigasi kategori       | Done   |
| SCRUM-105 | FEAT-16-02 Asset reports (9 jenis) dengan filter      | Done   |
| SCRUM-106 | FEAT-16-03 Inventory reports + low stock              | Done   |
| SCRUM-112 | FEAT-16-04 Operational reports                        | Done   |
| SCRUM-111 | FEAT-16-05 Template report detail reusable            | Done   |
| SCRUM-109 | FEAT-16-06 Export CSV streaming sesuai filter & scope | Done   |
| SCRUM-110 | FEAT-16-07 Export Excel (.xlsx)                       | Done   |

Catatan implementasi:

- Definisi 22 laporan terpusat di `src/lib/server/services/reports.ts` (9 aset, 8
  inventory, 5 operasional) dengan kolom, filter, dan status option per laporan.
- Overview hanya memuat konfigurasi (tanpa query berat) dan menandai laporan lanjutan.
- Detail `/reports/[key]` memakai satu template: filter summary, tabel desktop/mobile,
  pagination, empty state, dan export. Filter tersimpan di URL.
- Scope outlet diterapkan pada query dan export; kolom biaya internal disaring dari
  outlet.
- Export CSV memakai ReadableStream + BOM; export XLSX memakai ExcelJS dan membatasi
  50.000 baris. Filter dan scope sama dengan tampilan.
- Dependency baru: `exceljs`.

### FEAT-17 — Audit Log

| Key       | Story                                                        | Status |
| --------- | ------------------------------------------------------------ | ------ |
| SCRUM-116 | FEAT-17-01 Audit log list dengan filter & pagination         | Done   |
| SCRUM-114 | FEAT-17-02 Audit log detail + before/after viewer            | Done   |
| SCRUM-115 | FEAT-17-03 Kebijakan akses, imutabilitas & retensi audit log | Done   |

Catatan implementasi:

- `src/lib/server/services/audit-log.ts` menangani list, filter, pagination, detail, dan
  redaksi nilai sensitif.
- Admin melihat semua modul; Support hanya modul operasional (asset, assignment, mutation,
  loan, maintenance, stock, receiving, inventory, request); Outlet 403. Detail modul
  terlarang untuk Support dijawab 404.
- Viewer JSON menampilkan before/after; key password/token/secret/hash/credential/
  authorization/cookie diredaksi `[REDACTED]`.
- Tidak ada aksi edit/delete di UI. Privilege DB `inventory_app` pada `audit_logs` hanya
  SELECT/INSERT (migrasi `0002_audit_privileges`).
- Retensi minimal 3 tahun didokumentasikan di README; arsip/pemeliharaan di level database.
- Perubahan role/outlet/status user, reset password, dan pencabutan sesi sudah diaudit.

### FEAT-18 — Data Import

| Key       | Story                                                   | Status |
| --------- | ------------------------------------------------------- | ------ |
| SCRUM-113 | FEAT-18-01 Import overview & riwayat batch              | Done   |
| SCRUM-119 | FEAT-18-02 Download template Excel/CSV per jenis data   | Done   |
| SCRUM-117 | FEAT-18-03 Upload & parsing file Excel/CSV              | Done   |
| SCRUM-120 | FEAT-18-04 Preview & validasi per baris                 | Done   |
| SCRUM-118 | FEAT-18-05 Konfirmasi impor: add-only & opening balance | Done   |
| SCRUM-121 | FEAT-18-06 Import result, error file & riwayat          | Done   |

Catatan implementasi:

- Registry lima jenis impor dan validator terpusat di
  `src/lib/server/services/imports.ts`; template CSV/XLSX dibangun dari definisi kolom
  yang sama.
- Upload membatasi `.csv`/`.xlsx`, 5 MB, dan 2.000 baris; CSV mendukung delimiter koma
  atau titik koma serta field ber-quote. Parsing tidak menulis data.
- Pratinjau disimpan sementara di memori server (30 menit, terikat pengguna); baris
  invalid menampilkan alasan per baris.
- Konfirmasi berjalan dalam satu transaksi: hanya baris valid yang ditulis, batch dan
  baris hasil disimpan, audit `module=import` ditulis. Saldo awal membuat dokumen
  `opening_balance` + ledger + saldo. Konfirmasi ganda idempoten.
- Riwayat batch di `/admin/import`, hasil di `/admin/import/batch/[id]`, error file CSV
  di `/admin/import/batch/[id]/errors`.
- Akses Admin/Support; Outlet 403. Tabel `import_batches`/`import_batch_rows` dibuat pada
  migrasi `0006_outstanding_micromax`; migrasi `0007_import_privileges` mencabut
  `UPDATE`/`DELETE`/`TRUNCATE` sehingga role runtime hanya `SELECT`/`INSERT`.

### FEAT-19 — QR Label & Scanner

| Key       | Story                                           | Status |
| --------- | ----------------------------------------------- | ------ |
| SCRUM-123 | FEAT-19-01 Asset QR label print                 | Done   |
| SCRUM-124 | FEAT-19-02 QR scanner mobile dengan izin kamera | Done   |
| SCRUM-122 | FEAT-19-03 Scanned asset detail & scope check   | Done   |

Catatan implementasi:

- `src/lib/server/services/qr.ts` menyediakan ringkasan aset per kode dan daftar aset
  untuk label, keduanya memakai `scopeToUser` sehingga outlet hanya mendapat asetnya.
- `/assets/labels` menampilkan daftar aset dengan filter dan pilihan single/bulk.
  `/assets/labels/print?ids=...` membuat QR (library `qrcode`) berisi Asset Code dan
  layout A4 grid 3 kolom (label 60 × 35 mm, maksimal 100 label). CSS print menyembunyikan
  chrome aplikasi; tautan cetak juga ada di detail aset.
- `/scan` memakai `getUserMedia` + `jsqr`, dengan state izin ditolak, kamera tidak
  tersedia, konteks tidak aman, QR invalid, dan input manual. Gambar kamera tidak
  disimpan. Kamera memerlukan HTTPS/localhost.
- `/scan/[code]` menampilkan ringkasan aset sesuai cakupan; aset outlet lain 404 dan
  ringkasan tidak memuat biaya. Tautan detail mengikuti aturan akses aset.
- Dependensi baru: `qrcode` dan `jsqr`. Fitur tetap P2 dan tidak memengaruhi modul lain.

### FEAT-13 — Stock Opname

| Key      | Story                                                    | Status |
| -------- | -------------------------------------------------------- | ------ |
| SCRUM-93 | FEAT-13-01 Stock opname list & filter sesi               | Done   |
| SCRUM-94 | FEAT-13-02 Create opname session oleh IT Support         | Done   |
| SCRUM-96 | FEAT-13-03 Opname counting: checklist aset/inventory     | Done   |
| SCRUM-95 | FEAT-13-04 Opname result, variance & completed read-only | Done   |

Catatan implementasi:

- `src/lib/server/services/opnames.ts` menangani list/filter, create draft, start snapshot,
  save counting, complete, cancel, summary variance, dan scope outlet.
- Create menghasilkan Draft; start membuat snapshot aset (selain disposed) atau saldo
  inventory aktif pada lokasi. Snapshot `system_qty` tidak berubah setelah itu.
- Counting memakai `opname_lines`; save hanya mengisi physical qty/result/condition/notes
  dan tidak menyentuh `stock_balances`/`stock_transactions`.
- Completed hanya bisa jika semua item dicek; setelah Completed read-only. Selisih
  ditindaklanjuti lewat tautan Stock Adjustment, bukan adjustment otomatis.
- Cancel untuk Draft/In Progress dengan alasan wajib; audit `module=opname` untuk create,
  start, complete, dan cancel. Support dapat melihat audit modul ini.
- Outlet hanya dapat melihat/mengisi sesi outletnya; create/start/complete/cancel ditolak.

### FEAT-14 — Asset Disposal

| Key       | Story                                                    | Status |
| --------- | -------------------------------------------------------- | ------ |
| SCRUM-99  | FEAT-14-01 Disposal list & filter                        | Done   |
| SCRUM-97  | FEAT-14-02 Create disposal dengan alasan & kondisi akhir | Done   |
| SCRUM-98  | FEAT-14-03 Disposal detail & timeline                    | Done   |
| SCRUM-100 | FEAT-14-04 Cancel disposal (IT Administrator) + alasan   | Done   |

Catatan implementasi:

- `src/lib/server/services/disposals.ts` menangani list/filter, form options, create,
  detail + timeline, dan cancel.
- Create menolak aset On Loan, menyimpan `previous_asset_status`, mengubah aset menjadi
  Disposed final, membuat nomor `DSP-...`, mendukung `submissionId` idempoten, dan menulis
  audit `disposal_created`.
- Detail menampilkan field lengkap + timeline dan read-only; tersedia tautan aset/audit.
- Cancel hanya Admin, wajib alasan, mengembalikan status aset sebelumnya, menandai
  disposal cancelled (record tetap ada), dan menulis audit `disposal_cancelled`.
- List/detail hanya Admin/Support; outlet 403. Daftar aset/laporan tetap menampilkan aset
  Disposed. Audit `module=disposal` dapat dilihat Support.

## Konvensi issue

- **Priority:** P0 = High, P1 = Medium, P2 = Low.
- **Label:** `backlog-v1`, `feat-XX`, `story`/`task`, prioritas (`p0`/`p1`/`p2`), area (`auth`, `asset`, `stock`, dll.).
- **Hierarki:** Epic → Story/Task. Tidak memakai Subtask agar backlog tetap ringan untuk solo developer.
- **Definition of Ready:** scope, acceptance criteria, role, dependensi, dan referensi dokumen sudah tercantum di setiap issue.
- **Definition of Done tambahan:** otorisasi di server, audit di transaksi yang sama, state loading/empty/error, responsive 360px, dan test untuk jalur kritis.

## Catatan

- Issue contoh lama (`SCRUM-1`..`SCRUM-4`) tidak diubah.
- Semua issue baru berada di backlog; sprint planning tetap dilakukan manual.
- Jika perlu regenerasi atau pembersihan, filter dengan label `backlog-v1`.
