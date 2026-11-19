# UI Page & Component Specification

**Project:** IT Asset & Inventory Management System  
**Versi:** 1.0  
**Platform:** Web Application — Mobile First  
**Framework:** SvelteKit + Bun  
**UI:** Design System v1

Dokumen ini menerjemahkan PRD v1.1 menjadi daftar fitur, halaman, komponen UI, dan state penting. PRD v1.1 menjadi sumber kebutuhan fitur dan hak akses; Design System v1 menjadi acuan komponen visual; ARCHITECTURE.md dan design_pattern.md menjadi acuan struktur halaman, otorisasi, dan perilaku transaksi.

## 1. Standar implementasi UI

### 1.1 Layout berdasarkan perangkat

| Ukuran layar                | Layout                                            |
| --------------------------- | ------------------------------------------------- |
| Mobile, kurang dari 768px   | 1 kolom, Bottom Navigation, daftar berbentuk card |
| Tablet, mulai 768px         | Sidebar ringkas, tabel mulai ditampilkan          |
| Desktop, mulai 1024px       | Sidebar penuh, tabel dan multi-column layout      |
| Desktop besar, mulai 1280px | Konten dengan lebar maksimum                      |

Navigasi mobile maksimal lima tujuan. Navigasi yang disarankan: **Beranda, Aset, Stok, Request, Lainnya**. Menu administrasi seperti pengguna, master data, dan audit log ditempatkan di Lainnya atau sidebar desktop.

### 1.2 Komponen Design System yang digunakan

| Komponen           | Penggunaan                                         |
| ------------------ | -------------------------------------------------- |
| Button             | Simpan, tambah, edit, mutasi, proses, export       |
| Input & Form       | Text, number, date, select, textarea, checkbox     |
| Status Badge       | Status aset, inventory, maintenance, loan, request |
| Alert              | Success, warning, error                            |
| Card               | Ringkasan dashboard dan daftar mobile              |
| Table / Asset List | Daftar data desktop                                |
| Bottom Navigation  | Navigasi mobile                                    |
| Sidebar            | Navigasi desktop                                   |

### 1.3 Komposisi komponen tambahan

Komponen berikut diperlukan untuk membangun halaman lengkap. Komponen tersebut menggunakan token dan primitive Design System v1. Komponen ini merupakan komposisi tambahan, bukan komponen yang sudah didefinisikan secara eksplisit dalam Design System.

| Komponen turunan | Fungsi                                           |
| ---------------- | ------------------------------------------------ |
| Page Header      | Judul, deskripsi, dan aksi utama halaman         |
| Filter Toolbar   | Search, filter kategori, lokasi, status, tanggal |
| Pagination       | Navigasi halaman daftar                          |
| Detail Section   | Pengelompokan informasi detail                   |
| Timeline         | Riwayat perubahan aset dan transaksi             |
| Confirm Dialog   | Konfirmasi aksi yang berdampak besar             |
| File Upload      | Unggah foto, Excel, dan CSV                      |
| Import Preview   | Pratinjau dan validasi data impor                |
| Action Menu      | Aksi yang tersedia sesuai hak akses              |
| Summary Card     | Ringkasan angka dan indikator                    |
| Tab Navigation   | Pemisahan informasi detail                       |

**Catatan desain:** gunakan token Teal dan Slate, IBM Plex Sans untuk antarmuka, serta IBM Plex Mono untuk kode aset dan nomor dokumen. Status selalu menggunakan badge dengan label teks. Input menggunakan ukuran teks minimal 16px dan target sentuh minimal 44px.

## 2. Pembagian fitur dan kode

| Kode    | Fitur                        | Prioritas     |
| ------- | ---------------------------- | ------------- |
| FEAT-01 | Authentication & Session     | P0            |
| FEAT-02 | User Management              | P0            |
| FEAT-03 | Dashboard                    | P0            |
| FEAT-04 | Master Data Management       | P0            |
| FEAT-05 | IT Asset Management          | P0            |
| FEAT-06 | Asset Assignment             | P0            |
| FEAT-07 | Asset Mutation               | P1            |
| FEAT-08 | IT Inventory Management      | P0            |
| FEAT-09 | Asset Receiving              | P0            |
| FEAT-10 | Stock Transaction Management | P0            |
| FEAT-11 | Borrowing & Returning        | P1            |
| FEAT-12 | Maintenance Management       | P1            |
| FEAT-13 | Stock Opname                 | P1            |
| FEAT-14 | Asset Disposal               | P1            |
| FEAT-15 | Outlet Item Request          | P1            |
| FEAT-16 | Reporting & Analytics        | P0/P2         |
| FEAT-17 | Audit Log                    | P0/P1         |
| FEAT-18 | Data Import                  | P0            |
| FEAT-19 | QR Label & Scanner           | P2 – Opsional |

Pembagian P0, P1, dan P2 mengikuti prioritas dalam PRD v1.1. Fitur P0 menjadi target tahap pertama, sedangkan P2 tidak perlu menghambat peluncuran MVP.

## 3. Daftar halaman dan komponen UI per fitur

Keterangan:

- **[DS]** Komponen yang sudah didefinisikan Design System v1.
- **[K]** Komponen komposisi yang perlu distandardisasi menggunakan token Design System.
- State mencakup kondisi halaman dan kondisi transaksi, bukan hanya loading halaman.

### FEAT-01 — Authentication & Session

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman                  | Komponen                                                                  | State penting                                                                                                                                         |
| ---------- | ----------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| FEAT-01    | Login                         | [DS] Input email/username, password, Button; [K] Login Card               | Loading: autentikasi; kosong: form awal; error: kredensial salah / akun nonaktif / login dibatasi; submitting: tombol dinonaktifkan                   |
| FEAT-01    | First Login – Change Password | [DS] Input password, konfirmasi password, Button, Alert; [K] Form Section | Loading: validasi sesi; kosong: form awal; error: password kurang dari 8 karakter / tidak cocok; success: password berubah dan diarahkan ke dashboard |

### FEAT-02 — User Management

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman                     | Komponen                                                                          | State penting                                                                                                   |
| ---------- | -------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| FEAT-02    | User List                        | [DS] Card/Table, Status Badge; [K] Search, Role Filter, Outlet Filter, Pagination | Loading: daftar pengguna; empty: belum ada pengguna; error: gagal memuat; filtered empty: tidak ada hasil       |
| FEAT-02    | Create User                      | [DS] Input/Form, Button, Alert; [K] Role Selector, Outlet Selector                | Loading: penyimpanan; error: email/username duplikat, outlet wajib untuk Outlet Management; submitting; success |
| FEAT-02    | Edit User                        | [DS] Input/Form, Status Badge, Button                                             | Loading: data pengguna; error: gagal menyimpan; inactive: akun dinonaktifkan; success                           |
| FEAT-02    | User Detail & Session Management | [DS] Card, Badge, Button, Alert; [K] Session List, Confirm Dialog                 | Loading: detail akun; empty: tidak ada sesi aktif; error; revoke session: submitting/success                    |

Komponen khusus form pengguna:

- Username / Email
- Full Name
- Role: IT Administrator, IT Support, Outlet Management
- Outlet Assignment
- Account Status: Active / Inactive

IT Administrator dapat melakukan reset password, menonaktifkan akun, dan mencabut sesi pengguna. Karyawan pada master data tidak otomatis menjadi user aplikasi.

### FEAT-03 — Dashboard

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman                  | Komponen                                                                               | State penting                                                                                |
| ---------- | ----------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| FEAT-03    | Dashboard – IT Administrator  | [DS] Card, Status Badge, Alert; [K] Summary Card, Activity List, Chart jika diperlukan | Loading: ringkasan; empty: belum ada data; error: gagal memuat widget; warning: stok minimum |
| FEAT-03    | Dashboard – IT Support        | [DS] Card, Badge, Alert; [K] Maintenance Queue, Request Queue, Activity List           | Loading; empty: tidak ada pekerjaan; error; overdue: peminjaman terlambat                    |
| FEAT-03    | Dashboard – Outlet Management | [DS] Card, Badge, Alert, Button; [K] Asset Summary, Inventory Summary, Request Summary | Loading; empty: belum ada aset/data stok; error; warning: stok minimum outlet                |

Komponen dashboard:

**Asset Overview**

- Total Assets
- Active Assets
- Damaged Assets
- Under Maintenance
- On Loan
- Disposed

**Inventory Overview**

- Total Item Types
- Available Stock
- Low Stock
- Out of Stock

**Operational Overview**

- Recent Requests
- Recent Mutations
- Active Maintenance
- Overdue Loans
- Recent Stock Transactions

Dashboard IT Administrator dan IT Support menampilkan ringkasan seluruh lokasi. Outlet Management hanya melihat data outlet sendiri.

### FEAT-04 — Master Data Management

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman                 | Komponen                                                            | State penting                                                         |
| ---------- | ---------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| FEAT-04    | Master Data Overview         | [DS] Card, Button; [K] Module Navigation                            | Loading: master data; empty: belum ada data; error                    |
| FEAT-04    | Master Data List             | [DS] Table/Card, Badge; [K] Search, Filter, Pagination, Action Menu | Loading; empty; error; inactive data: tampil sebagai nonaktif         |
| FEAT-04    | Create / Edit Master Data    | [DS] Input/Form, Button, Alert; [K] Confirm Dialog                  | Loading; error: nama duplikat / data tidak valid; submitting; success |
| FEAT-04    | Location & Outlet Management | [DS] Card, Input, Button; [K] Hierarchical Location List            | Loading; empty; error; validation: struktur lokasi tidak valid        |

Master data yang dikelola:

| Kelompok     | Data                                                    |
| ------------ | ------------------------------------------------------- |
| Asset        | Asset Category, Brand, Model, Asset Condition           |
| Inventory    | Inventory Category, Inventory Item, Unit of Measurement |
| Organization | Outlet, Location, Department, Employee                  |
| Vendor       | Supplier                                                |
| System       | Asset Status dan nilai status sistem                    |

**Hak akses:** IT Administrator memiliki seluruh akses master data. IT Support hanya dapat mengelola Brand, Model, Category, Inventory Item, Supplier, Employee, dan Unit of Measurement.

Master data yang sudah digunakan transaksi tidak boleh dihapus permanen. Gunakan status Active/Inactive. Asset Status ditampilkan sebagai nilai sistem, bukan sebagai dropdown untuk mengubah status secara bebas.

### FEAT-05 — IT Asset Management

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman  | Komponen                                                                                                               | State penting                                                                                             |
| ---------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| FEAT-05    | Asset List    | [DS] Card mobile, Table desktop, Status Badge; [K] Search, Category Filter, Location Filter, Status Filter, Pagination | Loading; empty: belum ada aset; error; filtered empty                                                     |
| FEAT-05    | Create Asset  | [DS] Input/Form, Button, Alert; [K] Select, Date Picker, File Upload                                                   | Loading; validation error: Asset Code duplikat; serial number duplikat; upload error; submitting; success |
| FEAT-05    | Edit Asset    | [DS] Input/Form, Button, Alert                                                                                         | Loading; error; success; restricted: atribut tertentu tidak dapat diubah karena kondisi transaksional     |
| FEAT-05    | Asset Detail  | [DS] Card, Badge, Button, Alert; [K] Detail Section, Timeline, Tab Navigation, Action Menu                             | Loading; not found; error; disposed: read-only; action disabled jika transisi status tidak valid          |
| FEAT-05    | Asset History | [DS] Badge, Card; [K] Timeline, Movement List                                                                          | Loading; empty: belum ada histori; error                                                                  |

Informasi utama dalam Asset Detail:

1. Asset Information
2. Brand & Model
3. Serial Number
4. Purchase Information
5. Warranty Information
6. Current Location
7. Assigned Employee
8. Asset Condition
9. Asset Status
10. Asset Photo
11. Movement History
12. Maintenance History
13. Borrowing History

**Penting:** Status aset tidak boleh diubah melalui select biasa. Aksi yang tersedia harus mengikuti proses bisnis seperti assignment, borrowing, maintenance, dan disposal.

Biaya perolehan hanya ditampilkan kepada IT Administrator dan IT Support.

### FEAT-06 — Asset Assignment

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman          | Komponen                                                                                      | State penting                                                       |
| ---------- | --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| FEAT-06    | Asset Assignment Form | [DS] Input/Form, Button, Alert; [K] Employee Selector, Department Selector, Location Selector | Loading; validation error: aset tidak tersedia; submitting; success |
| FEAT-06    | Assignment History    | [DS] Card/Table, Badge; [K] Timeline, Filter                                                  | Loading; empty: aset belum pernah ditempatkan; error                |

Komponen form:

- Asset
- Employee
- Department
- Location
- Assignment Date
- Notes

Aturan UI:

- Penempatan dengan karyawan membuat status aset menjadi `In Use`.
- Penempatan di lokasi tanpa karyawan, seperti gudang, menghasilkan status `Available`.
- Aset `Disposed` tidak dapat ditempatkan.

### FEAT-07 — Asset Mutation

**Prioritas: P1 · Tahap 2**

| Kode fitur | Nama halaman    | Komponen                                                                                  | State penting                                                                                  |
| ---------- | --------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| FEAT-07    | Mutation List   | [DS] Table/Card, Badge; [K] Search, Date Filter, Location Filter, Pagination              | Loading; empty: belum ada mutasi; error                                                        |
| FEAT-07    | Create Mutation | [DS] Input/Form, Button, Alert; [K] Asset Selector, Source Location, Destination Location | Loading; validation error: source dan destination sama / aset tidak valid; submitting; success |
| FEAT-07    | Mutation Detail | [DS] Card, Badge, Alert; [K] Detail Section, Movement Timeline                            | Loading; not found; error; completed: read-only                                                |

Data mutasi:

- Mutation Number
- Asset
- Source Location
- Destination Location
- Transfer Date
- Reason
- Transferred By
- Received By
- Notes

Tidak menggunakan approval atau konfirmasi penerimaan sebagai tahap kedua. Nama penerima dicatat pada form.

### FEAT-08 — IT Inventory Management

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman                 | Komponen                                                                                       | State penting                                                      |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| FEAT-08    | Inventory Item List          | [DS] Card/Table, Badge; [K] Search, Category Filter, Location Filter, Stock Filter, Pagination | Loading; empty: belum ada item; error; low stock; out of stock     |
| FEAT-08    | Create / Edit Inventory Item | [DS] Input/Form, Button, Alert                                                                 | Loading; validation error: Item Code duplikat; submitting; success |
| FEAT-08    | Inventory Item Detail        | [DS] Card, Badge, Alert; [K] Stock Summary, Location Breakdown, Transaction Timeline           | Loading; empty: belum ada transaksi; error; stock warning          |

Informasi Inventory Item:

- Item Code
- Item Name
- Category
- Brand
- Unit
- Minimum Stock
- Current Stock
- Description
- Stock per Location
- Transaction History

Minimum Stock ditetapkan per item per lokasi dan bersifat opsional.

### FEAT-09 — Asset Receiving

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman     | Komponen                                                                                     | State penting                                  |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| FEAT-09    | Receiving List   | [DS] Card/Table, Badge; [K] Search, Date Filter, Receiving Type Filter, Pagination           | Loading; empty: belum ada penerimaan; error    |
| FEAT-09    | Create Receiving | [DS] Input/Form, Button, Alert; [K] Item Type Selector, Supplier Selector, Location Selector | Loading; validation error; submitting; success |
| FEAT-09    | Receiving Detail | [DS] Card, Badge, Alert; [K] Detail Section, Item List, Receipt Summary                      | Loading; not found; error                      |

Receiving Type:

- Purchase
- Opening Balance
- Transfer In (barang masuk dari luar sistem)
- Other

Perbedaan UI:

- Jika jenisnya IT Asset, sistem membuat Asset Code dan mencatat identitas aset.
- Jika jenisnya Inventory, sistem menambahkan jumlah stok dan transaksi penerimaan.
- Internal transfer antar-lokasi menggunakan FEAT-10, bukan Receiving.

### FEAT-10 — Stock Transaction Management

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman           | Komponen                                                                                              | State penting                                                      |
| ---------- | ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| FEAT-10    | Stock Transaction List | [DS] Card/Table, Badge; [K] Search, Transaction Type Filter, Location Filter, Date Filter, Pagination | Loading; empty: belum ada transaksi; error                         |
| FEAT-10    | Stock Out Form         | [DS] Input/Form, Button, Alert; [K] Item Selector, Stock Availability Indicator                       | Loading; validation error; insufficient stock; submitting; success |
| FEAT-10    | Stock Transfer Form    | [DS] Input/Form, Button, Alert; [K] Source/Destination Selector, Quantity Input                       | Loading; insufficient stock; invalid location; submitting; success |
| FEAT-10    | Stock Adjustment Form  | [DS] Input/Form, Button, Alert; [K] Adjustment Type Selector, Reason Field                            | Loading; validation error: alasan kosong; submitting; success      |
| FEAT-10    | Transaction Detail     | [DS] Card, Badge; [K] Transaction Information, Ledger Reference, Audit Information                    | Loading; not found; error                                          |

Jenis transaksi:

- Opening Balance
- Stock In
- Stock Out
- Transfer Out
- Transfer In
- Adjustment (+/-)

Stock In untuk penerimaan dicatat melalui FEAT-09.

**State yang wajib diperhatikan:**

- Stok tidak cukup.
- Stok tidak boleh negatif.
- Transaksi tidak boleh terkirim dua kali.
- Transfer menampilkan dua catatan transaksi dalam satu proses.
- Koreksi harus melalui transaksi Adjustment, bukan edit transaksi sebelumnya.

Contoh alert: **Stok tidak cukup.** Permintaan 10 Patch Cord, sedangkan stok tersedia 6.

### FEAT-11 — Borrowing & Returning

**Prioritas: P1 · Tahap 2**

| Kode fitur | Nama halaman      | Komponen                                                                                  | State penting                                                                            |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| FEAT-11    | Loan List         | [DS] Card/Table, Status Badge; [K] Search, Loan Status Filter, Overdue Filter, Pagination | Loading; empty; error; overdue                                                           |
| FEAT-11    | Create Loan       | [DS] Input/Form, Button, Alert; [K] Asset Selector, Borrower Selector, Date Picker        | Loading; validation error: aset tidak tersedia / sudah dipinjam; submitting; success     |
| FEAT-11    | Loan Detail       | [DS] Card, Badge, Alert; [K] Loan Detail, Borrower Information                            | Loading; not found; error; overdue                                                       |
| FEAT-11    | Return Asset Form | [DS] Input/Form, Button, Badge, Alert; [K] Condition Selector                             | Loading; validation error: kondisi setelah pengembalian belum diisi; submitting; success |

Status:

- Borrowed
- Returned
- Overdue
- Cancelled

Overdue dihitung otomatis dari Expected Return Date, bukan disimpan sebagai status transaksi terpisah.

Saat barang dikembalikan:

- Condition After wajib diisi.
- Kondisi Rusak menghasilkan status aset `Damaged`.
- Kondisi selain Rusak menghasilkan status `Available`.

### FEAT-12 — Maintenance Management

**Prioritas: P1 · Tahap 2**

| Kode fitur | Nama halaman                       | Komponen                                                                                 | State penting                                                 |
| ---------- | ---------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| FEAT-12    | Maintenance List                   | [DS] Card/Table, Badge; [K] Search, Status Filter, Location Filter, Date Filter          | Loading; empty; error                                         |
| FEAT-12    | Report Damage / Create Maintenance | [DS] Input/Form, Button, Alert; [K] Asset Selector, Problem Description, Photo Upload    | Loading; validation error; submitting; success                |
| FEAT-12    | Maintenance Detail                 | [DS] Card, Badge, Alert; [K] Timeline, Repair Information, Attachment Preview            | Loading; not found; error                                     |
| FEAT-12    | Process Maintenance                | [DS] Input/Form, Button, Badge; [K] Technician Selector, Parts Selector, Completion Form | Loading; validation error; waiting parts; submitting; success |

Informasi Maintenance Detail:

- Maintenance Number
- Asset
- Reported By
- Location
- Problem Description
- Maintenance Type
- Technician
- Start Date
- Completion Date
- Repair Description
- Repair Cost
- Vendor
- Status
- Spare Parts Used

Status:

- Reported
- In Progress
- Waiting Parts
- Completed
- Cancelled

Outlet Management hanya dapat membuat laporan kerusakan untuk outlet sendiri dan melihat statusnya. IT Support menangani proses maintenance dan pengeluaran spare part. Repair Cost dan Vendor tidak terlihat oleh Outlet Management.

### FEAT-13 — Stock Opname

**Prioritas: P1 · Tahap 3**

| Kode fitur | Nama halaman           | Komponen                                                                  | State penting                                       |
| ---------- | ---------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| FEAT-13    | Stock Opname List      | [DS] Card/Table, Badge; [K] Location Filter, Status Filter, Date Filter   | Loading; empty; error                               |
| FEAT-13    | Create Opname Session  | [DS] Input/Form, Button, Alert; [K] Location Selector, Item Type Selector | Loading; validation error; submitting; success      |
| FEAT-13    | Opname Counting        | [DS] Card, Input/Form, Badge, Button; [K] Item Checklist, Count Input     | Loading; empty; error; incomplete count; submitting |
| FEAT-13    | Opname Result & Detail | [DS] Card, Badge, Alert; [K] Variance Table, Summary Card                 | Loading; empty; mismatch; completed: read-only      |

Status sesi:

- Draft
- In Progress
- Completed
- Cancelled

Hasil pengecekan aset individual:

- Ditemukan sesuai
- Ditemukan di lokasi lain
- Kondisi berbeda
- Tidak ditemukan

State dan hak akses:

- IT Support dapat membuat, mengelola, dan menyelesaikan sesi.
- Outlet Management dapat menginput pengecekan fisik pada sesi yang dibuat IT Support untuk outletnya.
- Outlet tidak bisa membuat sesi, menyelesaikan sesi, atau melakukan adjustment.
- Completed tidak dapat diedit.
- Selisih stok harus ditindaklanjuti dengan Adjustment secara terpisah.

### FEAT-14 — Asset Disposal

**Prioritas: P1 · Tahap 3**

| Kode fitur | Nama halaman                 | Komponen                                                                     | State penting                                                        |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| FEAT-14    | Disposal List                | [DS] Table/Card, Badge; [K] Search, Date Filter, Reason Filter, Pagination   | Loading; empty; error                                                |
| FEAT-14    | Create Disposal              | [DS] Input/Form, Button, Alert; [K] Asset Selector, Disposal Reason Selector | Loading; validation error: aset sedang dipinjam; submitting; success |
| FEAT-14    | Disposal Detail              | [DS] Card, Badge, Alert; [K] Detail Section, Timeline                        | Loading; not found; disposed: final/read-only                        |
| FEAT-14    | Cancel Disposal (Admin Only) | [DS] Alert, Input, Button; [K] Confirm Dialog, Reason Field                  | Loading; validation error: alasan kosong; submitting; success        |

Disposal Reason:

- Rusak berat
- Tidak ekonomis diperbaiki
- Hilang
- Tidak dibutuhkan
- Lainnya

Disposal bersifat final. Pembatalan hanya tersedia untuk IT Administrator, wajib disertai alasan, dan dicatat dalam audit log.

### FEAT-15 — Outlet Item Request

**Prioritas: P1 · Tahap 2**

| Kode fitur | Nama halaman                    | Komponen                                                                                            | State penting                                                         |
| ---------- | ------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| FEAT-15    | Request List – Outlet           | [DS] Card/Table, Badge; [K] Status Filter, Date Filter                                              | Loading; empty: belum ada request; error                              |
| FEAT-15    | Request Inbox – IT Support      | [DS] Card/Table, Badge; [K] Search, Outlet Filter, Status Filter, Date Filter                       | Loading; empty: belum ada request; error                              |
| FEAT-15    | Create Request                  | [DS] Input/Form, Button, Alert; [K] Dynamic Item Rows, Quantity Input, Stock Availability Indicator | Loading; validation error; empty item; submitting; success            |
| FEAT-15    | Request Detail – Outlet         | [DS] Card, Badge, Alert; [K] Request Summary, Item List, Timeline                                   | Loading; not found; error; cancelled                                  |
| FEAT-15    | Request Processing – IT Support | [DS] Input/Form, Button, Badge, Alert; [K] Fulfillment Quantity Input, Stock Selector               | Loading; insufficient stock; partial fulfillment; submitting; success |

Komponen Create Request:

- Request Number (otomatis)
- Outlet
- Requested By
- Multiple Item Rows
- Requested Quantity
- Reason
- Notes

Status:

- Submitted
- Processing
- Partially Fulfilled
- Fulfilled
- Rejected
- Cancelled

Aturan UI:

- Outlet hanya melihat request miliknya.
- Outlet dapat membatalkan request ketika status masih Submitted.
- IT Support dapat melakukan fulfillment sebagian atau penuh.
- Rejected wajib memiliki alasan.
- Fulfilled Quantity hanya bertambah melalui Stock Out yang terkait dengan request.
- Outlet hanya melihat ketersediaan stok secara umum, bukan rincian stok outlet lain.

Tidak ada approval step.

### FEAT-16 — Reporting & Analytics

**Prioritas: P0 / P2**

| Kode fitur | Nama halaman        | Komponen                                                                          | State penting                               |
| ---------- | ------------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| FEAT-16    | Reports Overview    | [DS] Card, Button; [K] Report Category Navigation                                 | Loading; empty; error                       |
| FEAT-16    | Asset Reports       | [DS] Table, Badge; [K] Filter Toolbar, Date Range, Location Filter, Export Button | Loading; no results; error; exporting       |
| FEAT-16    | Inventory Reports   | [DS] Table, Badge, Alert; [K] Location Filter, Item Filter, Export Button         | Loading; empty; low stock; error; exporting |
| FEAT-16    | Operational Reports | [DS] Table, Badge; [K] Status Filter, Date Filter, Location Filter, Export Button | Loading; no results; error; exporting       |
| FEAT-16    | Report Detail       | [DS] Card, Table; [K] Filter Summary, Export Action                               | Loading; no results; error; export failure  |

Jenis laporan:

**Asset**

- Asset List
- Asset by Category
- Asset by Location
- Asset by Status
- Asset by Condition
- Asset Assignment History
- Asset Mutation History
- Asset Maintenance History
- Asset Disposal Report

**Inventory**

- Current Stock
- Stock by Location
- Stock In Report
- Stock Out Report
- Stock Transfer Report
- Stock Adjustment Report
- Low Stock Report
- Inventory Transaction History

**Operational**

- Borrowing Report
- Overdue Loan Report
- Maintenance Report
- Stock Opname Report
- Outlet Request Report

Export: CSV dan Excel.

Rekomendasi UI: gunakan satu template report detail yang dapat menerima jenis laporan berbeda, bukan membuat halaman desain baru untuk setiap jenis laporan.

### FEAT-17 — Audit Log

**Prioritas: P0 dasar · P1 enhancement**

| Kode fitur | Nama halaman     | Komponen                                                                                | State penting                                             |
| ---------- | ---------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| FEAT-17    | Audit Log List   | [DS] Table/Card, Badge; [K] Search, User Filter, Module Filter, Date Filter, Pagination | Loading; empty: belum ada aktivitas; error; no permission |
| FEAT-17    | Audit Log Detail | [DS] Card, Alert; [K] Before/After Value Viewer, Event Detail                           | Loading; not found; error; read-only                      |

Informasi:

- User
- Action
- Module
- Record ID
- Previous Value
- New Value
- Timestamp

Hak akses:

- IT Administrator: seluruh audit log.
- IT Support: hanya audit log modul operasional.
- Outlet Management: tidak memiliki akses.

Audit log bersifat read-only dan tidak memiliki tombol edit/delete.

### FEAT-18 — Data Import

**Prioritas: P0 · MVP**

| Kode fitur | Nama halaman                | Komponen                                                                         | State penting                                                  |
| ---------- | --------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| FEAT-18    | Import Overview             | [DS] Card, Button, Alert; [K] Import Type Selector                               | Loading; empty: belum ada impor; error                         |
| FEAT-18    | Import File Upload          | [DS] Input, Button, Alert; [K] File Upload, Template Download                    | Empty: belum ada file; invalid file; uploading; upload success |
| FEAT-18    | Import Preview & Validation | [DS] Table, Badge, Alert, Button; [K] Row Error Indicator, Preview Summary       | Loading; valid rows; invalid rows; error; ready to confirm     |
| FEAT-18    | Import Result               | [DS] Card, Badge, Alert; [K] Import Summary, Error Row List, Download Error File | Loading; success; partial success; failure; empty              |

Jenis data impor:

- Location
- Employee
- Asset
- Inventory Item
- Opening Balance Stock

Alur UI:

1. Pilih jenis data.
2. Download template.
3. Upload Excel/CSV.
4. Preview data.
5. Validasi setiap baris.
6. Tampilkan daftar baris bermasalah.
7. Konfirmasi import.
8. Tampilkan hasil import.

Aturan penting: sebelum pengguna menekan tombol konfirmasi, tidak boleh ada data yang tersimpan. Import hanya menambahkan data baru, bukan menimpa data lama.

Hanya IT Administrator dan IT Support yang memiliki akses.

### FEAT-19 — QR Label & Scanner

**Prioritas: P2 · Future / Opsional**

| Kode fitur | Nama halaman         | Komponen                                                   | State penting                                                                   |
| ---------- | -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| FEAT-19    | Asset QR Label Print | [DS] Button, Card; [K] QR Preview, Print Layout            | Loading; empty: tidak ada aset; error; print ready                              |
| FEAT-19    | QR Scanner – Mobile  | [DS] Alert, Badge, Button; [K] Camera Scanner, Scan Result | Loading: inisialisasi kamera; camera permission denied; QR invalid; asset found |
| FEAT-19    | Scanned Asset Detail | [DS] Card, Badge, Button; [K] Asset Summary                | Loading; asset not found; error; success                                        |

Fitur ini merupakan pengembangan opsional dan tidak menjadi syarat MVP.

## 4. Global UI States

State berikut harus konsisten digunakan pada seluruh halaman.

| State            | Perilaku UI                                                                        | Komponen                                  |
| ---------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| Loading          | Menampilkan indikator proses dan mencegah aksi yang belum tersedia                 | Loading indicator, Card/Table placeholder |
| Empty            | Menjelaskan bahwa belum ada data dan menawarkan aksi utama yang relevan            | Text, Button, Card                        |
| No Search Result | Memberi informasi tidak ada hasil pencarian dan opsi reset filter                  | Alert/Text, Button                        |
| Validation Error | Menampilkan pesan tepat pada field yang bermasalah                                 | Input/Form, Alert                         |
| Business Error   | Menjelaskan kegagalan aturan bisnis, misalnya stok kurang                          | Alert                                     |
| System Error     | Menampilkan pesan umum dan kode referensi, bukan detail teknis internal            | Alert                                     |
| Submitting       | Tombol dinonaktifkan sampai proses selesai; mencegah pengiriman ganda              | Button                                    |
| Success          | Memberikan feedback setelah transaksi berhasil                                     | Alert                                     |
| Read Only        | Data ditampilkan tanpa aksi perubahan                                              | Card, Badge                               |
| No Permission    | Tidak menampilkan aksi yang tidak diizinkan; akses langsung tetap diperiksa server | Access message                            |
| Not Found        | Data tidak tersedia atau tidak berada dalam cakupan akses pengguna                 | Alert/Page Message                        |

Contoh pesan UI:

| Kondisi              | Pesan                                            |
| -------------------- | ------------------------------------------------ |
| Empty assets         | Belum ada aset yang terdaftar.                   |
| Empty inventory      | Belum ada item inventory.                        |
| Stock insufficient   | Stok tidak mencukupi untuk transaksi ini.        |
| Duplicate asset code | Asset Code sudah digunakan.                      |
| Invalid transition   | Status aset tidak memungkinkan tindakan ini.     |
| Session expired      | Sesi Anda telah berakhir. Silakan login kembali. |
| System error         | Terjadi kesalahan sistem. Kode referensi: XXXX.  |

Validasi serta otorisasi dilakukan di server. UI tidak boleh menjadi satu-satunya pengaman fitur.

## 5. Navigasi aplikasi

### 5.1 IT Administrator

```text
Dashboard

Asset Management
  ├── Assets
  ├── Assignment
  ├── Mutation
  ├── Borrowing
  ├── Maintenance
  └── Disposal

Inventory Management
  ├── Inventory Items
  ├── Receiving
  ├── Stock Transactions
  ├── Stock Opname
  └── Requests

Reports

Administration
  ├── Master Data
  ├── User Management
  └── Audit Log
```

### 5.2 IT Support

```text
Dashboard

Asset Management
  ├── Assets
  ├── Assignment
  ├── Mutation
  ├── Borrowing
  ├── Maintenance
  └── Disposal

Inventory Management
  ├── Inventory Items
  ├── Receiving
  ├── Stock Transactions
  ├── Stock Opname
  └── Requests

Reports

Administration
  ├── Master Data (Limited)
  └── Audit Log (Limited)
```

### 5.3 Outlet Management

```text
Dashboard

Aset
  ├── Daftar Aset
  └── Riwayat Mutasi

Stok
  ├── Inventory Outlet
  └── Status Ketersediaan

Request
  ├── My Requests
  └── Create Request

Maintenance
  └── Report Damage

Stock Opname
  └── Physical Checking (Assigned Session)

Lainnya
  └── Profile
```

Semua navigasi dan data mengikuti role serta outlet scope. Outlet Management tidak boleh mengakses outlet lain melalui perubahan URL maupun parameter request.

## 6. Rekomendasi urutan pembuatan UI untuk solo developer

Saya menyarankan tidak langsung membuat seluruh halaman. Gunakan urutan berikut agar komponen dapat digunakan berulang.

| Urutan | Fitur   | Halaman yang dikerjakan                          |
| -----: | ------- | ------------------------------------------------ |
|      1 | FEAT-01 | Login, Change Password                           |
|      2 | FEAT-02 | User List, User Form                             |
|      3 | FEAT-03 | Dashboard                                        |
|      4 | FEAT-04 | Master Data, Location                            |
|      5 | FEAT-05 | Asset List, Asset Form, Asset Detail             |
|      6 | FEAT-06 | Assignment                                       |
|      7 | FEAT-08 | Inventory List, Inventory Form, Inventory Detail |
|      8 | FEAT-09 | Receiving                                        |
|      9 | FEAT-10 | Stock Transactions                               |
|     10 | FEAT-07 | Mutation                                         |
|     11 | FEAT-11 | Borrowing                                        |
|     12 | FEAT-12 | Maintenance                                      |
|     13 | FEAT-15 | Outlet Request                                   |
|     14 | FEAT-16 | Reports                                          |
|     15 | FEAT-17 | Audit Log                                        |
|     16 | FEAT-18 | Import                                           |
|     17 | FEAT-13 | Stock Opname                                     |
|     18 | FEAT-14 | Disposal                                         |
|     19 | FEAT-19 | QR Label & Scanner                               |

### 6.1 Komponen reusable yang sebaiknya dibangun pertama

| Komponen reusable  | Digunakan oleh                     |
| ------------------ | ---------------------------------- |
| `AppShell`         | Semua halaman setelah login        |
| `Sidebar`          | Navigasi desktop                   |
| `BottomNav`        | Navigasi mobile                    |
| `PageHeader`       | Semua halaman modul                |
| `Button`           | Semua halaman                      |
| `FormField`        | Semua form                         |
| `StatusBadge`      | Asset, Loan, Maintenance, Request  |
| `Alert`            | Semua halaman                      |
| `DataTable`        | Asset, Inventory, Users, Reports   |
| `MobileDataCard`   | Semua daftar pada mobile           |
| `SearchFilter`     | Seluruh daftar                     |
| `Pagination`       | Seluruh daftar                     |
| `ConfirmDialog`    | Mutasi, Disposal, Stock Adjustment |
| `DetailSection`    | Asset, Inventory, Maintenance      |
| `ActivityTimeline` | Asset dan transaksi                |
| `EmptyState`       | Seluruh modul                      |
| `LoadingState`     | Seluruh modul                      |
| `FileUpload`       | Asset Photo dan Data Import        |

**Keputusan arsitektur UI:** buat halaman list, detail, dan form sebagai pola yang konsisten. Jangan membuat komponen tabel, filter, form, dan status berbeda-beda di setiap fitur.

## 7. Catatan yang perlu dipastikan sebelum UI coding

Ada beberapa hal yang belum dispesifikasikan secara lengkap dalam dokumen dan perlu menjadi keputusan desain:

1. **DataTable dan Pagination:** spesifikasi visual detail belum ada di Design System v1, meskipun pagination server diwajibkan oleh arsitektur.
2. **Dialog konfirmasi:** perlu ditetapkan standar untuk Disposal, Stock Adjustment, dan pencabutan sesi.
3. **Form validation:** perlu disepakati standar pesan error, validasi field, dan error server.
4. **Upload:** perlu distandardisasi preview foto aset, validasi ukuran 5 MB, dan komponen upload Excel/CSV.
5. **Responsive table:** perlu ditetapkan kolom mana yang menjadi informasi utama pada card mobile.

Dengan rancangan ini, proyek memiliki **19 kode fitur dan daftar halaman yang dapat diturunkan menjadi backlog frontend**. Fitur P0 dapat dikembangkan terlebih dahulu, sedangkan P1 dan P2 tetap memiliki spesifikasi UI tanpa harus dibuat seluruhnya sekarang.

---

**Dokumen terkait:** `PRD_v1.1.md`, `design_pattern.md`, `ARCHITECTURE.md`, dan `Design System v1 – Aset & Inventory IT.md`.
