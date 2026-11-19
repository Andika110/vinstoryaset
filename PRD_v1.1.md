# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## IT Asset & Inventory Management System

**Versi:** 1.1  
**Status:** Draft (revisi dari v1.0)  
**Jenis Produk:** Internal Business Application  
**Target Pengguna:** IT Administrator, IT Support, dan Outlet Management  
**Platform:** Web Application (Responsive, mobile-first; dipakai dari HP dan desktop)  
**Cakupan:** Head Office dan seluruh outlet perusahaan

> **Catatan revisi v1.1.** Perubahan ditandai **[Baru]** (bagian baru) atau **[Revisi]** (isi lama diperjelas). Tidak ada fitur v1.0 yang dihapus. Ringkasan perubahan:
>
> | #   | Bagian       | Perubahan                                            | Alasan                                                               |
> | --- | ------------ | ---------------------------------------------------- | -------------------------------------------------------------------- |
> | 1   | 2.1, 2.2     | Perbaikan istilah "penghapusan aset" dan salah ketik | Menghindari salah tafsir sebagai hapus permanen                      |
> | 2   | 2.3          | Definisi "Terbatas", "Melaporkan", "Membantu"        | Istilah di matriks belum bisa diimplementasi                         |
> | 3   | 2.4          | Autentikasi dan manajemen pengguna                   | Belum ada di v1.0                                                    |
> | 4   | 3.2–3.11     | Aturan bisnis tambahan per modul                     | Celah dan tumpang tindih antar modul                                 |
> | 5   | 3.14         | Aturan status dan transisi                           | Status aset, peminjaman, maintenance, request belum saling terhubung |
> | 6   | 3.15         | Impor data awal (P0)                                 | Target 95% aset terdaftar tidak realistis tanpa impor massal         |
> | 7   | 3.16         | Label QR (P2, opsional)                              | Mempercepat stock opname dari HP                                     |
> | 8   | 5.1, 6, 7, 8 | Baseline target, asumsi, prioritas, kriteria selesai | Audit log dasar dan impor harus ada sejak Tahap 1                    |
> | 9   | 9, 10        | Persyaratan non-fungsional dan keputusan terbuka     | Belum ada di v1.0                                                    |

---

# 1. TUJUAN

## 1.1 Latar Belakang

Saat ini perusahaan belum memiliki sistem terpusat untuk mengelola aset dan inventory IT.

Pencatatan perangkat, stok barang, mutasi, maintenance, dan kebutuhan IT outlet belum terintegrasi dalam satu aplikasi.

Hal ini dapat menyebabkan:

- Kesulitan mengetahui jumlah dan lokasi aset IT.
- Kesulitan melacak perangkat yang digunakan oleh outlet atau karyawan.
- Tidak adanya riwayat mutasi aset yang terpusat.
- Kesulitan memantau stok spare part dan barang habis pakai.
- Riwayat maintenance dan kerusakan perangkat tidak terdokumentasi dengan baik.
- Kesulitan melakukan stock opname.
- Tidak tersedianya laporan kondisi aset dan inventory secara cepat.

Diperlukan sebuah sistem terpusat yang dapat digunakan oleh tim IT Support untuk mengelola seluruh siklus hidup aset dan inventory IT perusahaan.

## 1.2 Tujuan Produk

Membangun aplikasi internal yang berfungsi sebagai pusat pengelolaan aset dan inventory IT perusahaan.

Tujuan utama:

1. Menyediakan database aset IT yang terpusat.
2. Mengelola inventory dan stok spare part seluruh lokasi.
3. Mencatat penerimaan dan pengeluaran barang.
4. Melacak penempatan dan mutasi aset antar-outlet.
5. Mengelola peminjaman dan pengembalian perangkat.
6. Mendokumentasikan maintenance dan riwayat perbaikan.
7. Melakukan stock opname secara berkala.
8. Mengelola permintaan barang dari outlet kepada IT Support.
9. Menyediakan dashboard dan laporan manajemen.

## 1.3 Visi Produk

Menjadikan aplikasi sebagai Single Source of Truth untuk seluruh data aset dan inventory IT perusahaan.

---

# 2. PENGGUNA

## 2.1 Jenis Pengguna

### A. IT Administrator

Pengguna dengan akses tertinggi dalam sistem.

Tanggung jawab:

- Mengelola seluruh data aset.
- Mengelola data inventory.
- Mengelola master data.
- Mengelola akun pengguna dan hak akses.
- Melihat seluruh lokasi.
- Mengakses seluruh laporan.
- Mengelola konfigurasi sistem.
- Melihat audit log.

### B. IT Support

Pengguna operasional yang menjalankan aktivitas pengelolaan aset dan inventory.

Tanggung jawab:

- Mendaftarkan aset baru.
- Mencatat penerimaan barang.
- Mengelola stok inventory.
- Mengelola penempatan aset.
- Melakukan mutasi aset.
- Mengelola peminjaman dan pengembalian.
- Mencatat maintenance.
- Melakukan stock opname.
- Mencatat disposal aset (**[Revisi]** aset diberi status Disposed, datanya tidak dihapus).
- Memproses permintaan barang dari outlet.

### C. Outlet Management

Pengguna yang bertugas memantau kebutuhan dan aset IT di outlet masing-masing.

Tanggung jawab:

- Melihat daftar aset IT di outlet.
- Melihat informasi kondisi perangkat.
- Melihat status inventory outlet.
- Mengajukan permintaan barang ke IT Support.
- Melihat status permintaan barang.
- Melaporkan kerusakan perangkat.
- Membantu proses pengecekan aset atau stock opname di outlet.
- Melihat riwayat mutasi aset di outlet.

Setiap akun Outlet Management harus terhubung dengan outlet tertentu sehingga tidak dapat mengakses data operasional outlet lain.

## 2.2 Matriks Hak Akses

| Fitur                        | IT Admin | IT Support | Outlet Management |
| ---------------------------- | -------- | ---------- | ----------------- |
| Dashboard seluruh perusahaan | Ya       | Ya         | Tidak             |
| Dashboard outlet sendiri     | Ya       | Ya         | Ya                |
| Kelola pengguna              | Ya       | Tidak      | Tidak             |
| Kelola master data           | Ya       | Terbatas   | Tidak             |
| Registrasi aset              | Ya       | Ya         | Tidak             |
| Melihat aset                 | Semua    | Semua      | Outlet sendiri    |
| Mutasi aset                  | Ya       | Ya         | Melihat           |
| Kelola inventory             | Ya       | Ya         | Melihat           |
| Stock in/out                 | Ya       | Ya         | Tidak             |
| Permintaan barang            | Ya       | Memproses  | Mengajukan        |
| Peminjaman/pengembalian      | Ya       | Ya         | Melihat           |
| Maintenance                  | Ya       | Ya         | Melaporkan        |
| Stock opname                 | Ya       | Ya         | Membantu          |
| Disposal aset                | Ya       | Ya         | Tidak             |
| Laporan                      | Semua    | Semua      | Outlet sendiri    |
| Audit log                    | Ya       | Terbatas   | Tidak             |

**Catatan:** Sistem versi awal tidak menggunakan workflow approval. Aktivitas operasional dapat langsung diproses oleh pengguna yang memiliki hak akses. Seluruh perubahan tetap tercatat dalam audit log.

## 2.3 Definisi istilah pada matriks hak akses **[Baru]**

| Istilah di matriks                        | Definisi                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kelola master data: IT Support "Terbatas" | Dapat menambah dan mengubah Brand, Model, Asset Category, Inventory Category, Inventory Item, Supplier, Employee, dan Unit of Measurement. Tidak dapat mengelola Location, Outlet, Department, Asset Condition, Asset Status, dan tidak dapat menonaktifkan master data. |
| Audit log: IT Support "Terbatas"          | Hanya melihat log modul operasional (aset, inventory, peminjaman, maintenance, request, stock opname, disposal). Tidak melihat log pengguna dan hak akses.                                                                                                               |
| Maintenance: Outlet "Melaporkan"          | Membuat laporan kerusakan untuk aset di outletnya (status Reported). Tidak dapat memproses atau menutup maintenance.                                                                                                                                                     |
| Stock opname: Outlet "Membantu"           | Menginput hasil pengecekan fisik pada sesi yang dibuat IT Support untuk lokasi outletnya. Tidak dapat membuat atau menyelesaikan sesi, dan tidak dapat membuat adjustment.                                                                                               |
| "Melihat" untuk Outlet                    | Hanya baca, terbatas pada outlet sendiri.                                                                                                                                                                                                                                |
| Biaya perolehan dan biaya perbaikan       | Hanya terlihat oleh IT Administrator dan IT Support.                                                                                                                                                                                                                     |

## 2.4 Autentikasi dan manajemen pengguna **[Baru]**

- Pengguna masuk dengan username atau email dan password.
- IT Administrator membuat akun, menetapkan peran dan outlet (outlet wajib untuk Outlet Management), menonaktifkan akun (akun tidak dihapus), dan mengatur ulang password.
- Password minimal 8 karakter. Setelah direset, pengguna wajib menggantinya saat login pertama.
- Sesi berakhir setelah 7 hari tanpa aktivitas. IT Administrator dapat mencabut sesi pengguna.
- Percobaan login gagal beruntun dibatasi sementara.
- Employee/Asset Custodian pada master data **bukan** akun pengguna. Karyawan dapat memegang aset tanpa memiliki akun.

---

# 3. FITUR UTAMA

## 3.1 Dashboard

Dashboard menjadi halaman utama setelah pengguna login.

### Informasi yang ditampilkan:

**Asset Overview**

- Total aset IT.
- Aset aktif.
- Aset rusak.
- Aset dalam maintenance.
- Aset yang dipinjam.
- Aset yang sudah disposed.

**Inventory Overview**

- Total jenis inventory.
- Total item tersedia.
- Item dengan stok minimum.
- Item dengan stok kosong.

**Operational Overview**

- Permintaan barang terbaru.
- Mutasi aset terbaru.
- Maintenance yang sedang berlangsung.
- Peminjaman yang belum dikembalikan.
- Aktivitas inventory terbaru.

Dashboard IT Administrator dan IT Support menampilkan ringkasan seluruh lokasi.

Dashboard Outlet Management hanya menampilkan data outlet masing-masing.

## 3.2 Master Data Management

Digunakan sebagai dasar pengelolaan seluruh data.

### Master data yang diperlukan:

1. Asset Category
2. Inventory Category
3. Brand
4. Model
5. Location
6. Outlet
7. Department
8. Employee / Asset Custodian
9. Unit of Measurement
10. Asset Condition
11. Asset Status
12. Inventory Item
13. Supplier / Vendor (referensi penerimaan barang)

### Struktur lokasi

Contoh:

- Head Office
  - IT Room
  - Warehouse
  - Finance Department
- Union Outlet A
  - Office
  - Cashier Area
  - Kitchen
  - Bar
  - Storage
- Union Outlet B
  - Office
  - Cashier Area
  - Kitchen
  - Bar
  - Storage

Lokasi harus dapat ditambahkan tanpa mengubah struktur utama sistem.

**[Baru] Aturan master data:**

- Master data yang sudah dipakai transaksi tidak dapat dihapus, hanya dinonaktifkan. Master yang nonaktif tidak muncul di pilihan baru tetapi tetap tampil di riwayat.
- Setiap lokasi terikat ke satu outlet (atau Head Office) sebagai induknya, sehingga pembatasan data per outlet berlaku untuk seluruh area di dalamnya.
- Nilai awal Asset Condition: Baik, Cukup, Rusak (dapat diubah IT Administrator).

## 3.3 IT Asset Management

Fitur utama untuk mengelola aset individual.

### Contoh aset

- Desktop PC
- Laptop
- POS Terminal
- Monitor
- Printer
- Server
- Router
- Switch
- Access Point
- CCTV Camera
- NVR
- UPS
- Barcode Scanner
- Cash Drawer

### Data aset

Setiap aset memiliki informasi:

- Asset ID
- Asset Code
- Asset Name
- Category
- Brand
- Model
- Serial Number
- Purchase Date
- Warranty Expiration
- Acquisition Source
- Acquisition Cost (opsional)
- Current Location
- Assigned Employee
- Asset Condition
- Asset Status
- Description
- Photo
- Created Date
- Updated Date

Asset Code harus unik.

Serial Number dapat kosong apabila perangkat tidak memiliki serial number.

### Status aset

- Available
- In Use
- On Loan
- Under Maintenance
- Damaged
- Disposed

### Kriteria fungsional

- Pengguna dapat mendaftarkan aset baru.
- Pengguna dapat memperbarui informasi aset sesuai hak akses.
- Pengguna dapat mencari aset berdasarkan kode, nama, serial number, kategori, atau lokasi.
- Pengguna dapat melihat riwayat aset.
- Aset tidak boleh dihapus permanen apabila sudah memiliki riwayat transaksi.
- **[Baru]** Perubahan Asset Status dilakukan oleh proses terkait (penempatan, peminjaman, maintenance, disposal) sesuai aturan pada bagian 3.14, bukan diedit bebas.
- **[Baru]** Foto: format JPG, PNG, atau WebP, maksimal 5 MB per file, dikompresi saat disimpan.

## 3.4 IT Inventory Management

Digunakan untuk barang yang dikelola berdasarkan jumlah stok.

### Contoh inventory

**Network Equipment**

- LAN Cable
- RJ45 Connector
- LAN Keystone
- Patch Cord

**Computer Components**

- RAM
- SSD
- HDD
- Power Supply

**Peripheral**

- Keyboard
- Mouse
- USB Hub

**Consumables**

- Printer Toner
- Thermal Paper
- Label
- Cleaning Equipment

### Data inventory

- Item Code
- Item Name
- Category
- Brand
- Unit
- Minimum Stock
- Current Stock
- Description
- Created Date
- Updated Date

### Fitur utama

- Menambahkan item inventory.
- Melakukan stock in.
- Melakukan stock out.
- Melakukan transfer stok antar-lokasi.
- Melakukan stock adjustment dengan alasan.
- Melihat riwayat transaksi.
- Memantau minimum stock.
- Melihat stok berdasarkan lokasi.

### Aturan penting

Stok tidak boleh diubah secara langsung tanpa transaksi.

Setiap perubahan harus menghasilkan catatan inventory transaction.

Contoh:

| Tanggal    | Item      | Lokasi   | Jenis       | Qty |
| ---------- | --------- | -------- | ----------- | --: |
| 01/11/2026 | Kabel LAN | HO       | Stock In    | 100 |
| 02/11/2026 | Kabel LAN | HO       | Stock Out   |  20 |
| 03/11/2026 | Kabel LAN | Outlet A | Transfer In |  10 |

Sistem harus dapat menghitung stok aktual berdasarkan transaksi yang tercatat.

**[Baru] Aturan tambahan:**

- Jenis transaksi: Opening Balance, Stock In, Stock Out, Transfer Out, Transfer In, Adjustment (tambah/kurang, wajib alasan).
- Transfer antar-lokasi menghasilkan dua catatan (Transfer Out dan Transfer In) sebagai satu kesatuan.
- Stok tidak boleh bernilai negatif. Stock Out atau Transfer yang melebihi stok ditolak dengan pesan yang jelas.
- Koreksi dilakukan dengan transaksi baru, bukan mengubah atau menghapus transaksi lama.
- Current Stock adalah hasil dari transaksi dan tidak dapat diinput langsung.
- Minimum Stock ditetapkan per item per lokasi (opsional; kosong berarti tidak dipantau).

## 3.5 Asset Receiving

Digunakan untuk mencatat penerimaan barang baru.

### Alur:

1. IT Support menerima perangkat atau barang.
2. Memilih jenis penerimaan.
3. Menginput detail barang.
4. Menentukan lokasi penyimpanan.
5. Jika berupa aset, sistem membuat Asset Code.
6. Jika berupa inventory, sistem menambahkan stok.
7. Transaksi penerimaan disimpan.

Jenis penerimaan:

- Purchase
- Opening Balance
- Transfer In (barang masuk dari luar sistem; perpindahan antar-lokasi di dalam sistem memakai fitur Transfer pada 3.4)
- Other

**[Revisi]** Opening Balance juga dapat dibuat melalui impor data awal (3.15).

Data penerimaan:

- Receipt Number
- Receipt Date
- Supplier (opsional)
- Item
- Quantity
- Location
- Reference Number
- Notes
- Received By

## 3.6 Asset Assignment & Mutation

Digunakan untuk mencatat penempatan dan perpindahan aset.

### Asset Assignment

Contoh:

Laptop IT-001 ditempatkan di Head Office dan digunakan oleh karyawan tertentu.

Data assignment:

- Asset
- Employee
- Department
- Location
- Assignment Date
- Notes

### Asset Mutation

Contoh:

PC POS dari Outlet A dipindahkan ke Outlet B.

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

### Aturan:

- Setiap mutasi harus tercatat.
- Lokasi aset berubah setelah mutasi diselesaikan.
- Riwayat lokasi sebelumnya tidak boleh hilang.
- Sistem menyimpan tanggal dan pengguna yang melakukan mutasi.
- **[Baru]** Pada v1, mutasi berlangsung satu langkah (tanpa approval). Nama penerima dicatat sebagai data (Received By), bukan sebagai tahap konfirmasi terpisah.
- **[Baru]** Penempatan aset kepada karyawan mengubah status menjadi In Use. Penempatan di lokasi tanpa karyawan (mis. gudang) berstatus Available.
- **[Baru]** Aset berstatus Disposed tidak dapat dimutasi atau ditempatkan.

## 3.7 Borrowing & Returning

Mengelola peminjaman perangkat IT.

Contoh:

- Laptop
- Monitor
- Projector
- Printer
- Network Equipment

Data peminjaman:

- Loan Number
- Asset
- Borrower
- Borrowing Date
- Expected Return Date
- Actual Return Date
- Condition Before
- Condition After
- Notes
- Status

Status:

- Borrowed
- Returned
- Overdue
- Cancelled

Sistem harus memberikan indikator ketika barang melewati tanggal pengembalian.

**[Baru] Aturan tambahan:**

- Status Overdue dihitung otomatis (Borrowed dan melewati Expected Return Date), bukan diisi manual.
- Hanya aset berstatus Available yang dapat dipinjam. Satu aset hanya dapat memiliki satu peminjaman aktif.
- Saat pengembalian, Condition After wajib diisi. Jika kondisi Rusak, status aset menjadi Damaged, selain itu menjadi Available.

## 3.8 Maintenance Management

Mencatat kerusakan dan aktivitas perbaikan perangkat.

### Contoh:

- PC tidak menyala.
- Printer mengalami paper jam.
- POS mengalami kerusakan.
- Router mengalami gangguan.
- Access Point tidak dapat digunakan.

Data maintenance:

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
- Repair Cost (opsional)
- Vendor (opsional)
- Status

Status:

- Reported
- In Progress
- Waiting Parts
- Completed
- Cancelled

### Fitur:

- Melaporkan kerusakan.
- Memproses maintenance.
- Mencatat tindakan perbaikan.
- Mencatat penggantian spare part.
- Melihat riwayat perbaikan.
- Menghitung frekuensi kerusakan perangkat.

**[Baru] Aturan tambahan:**

- Laporan kerusakan dari outlet berstatus Reported dan membuat aset berstatus Damaged.
- Saat maintenance In Progress, aset berstatus Under Maintenance. Status aset sebelumnya disimpan agar dapat dipulihkan saat Completed atau Cancelled.
- Repair Cost dan Vendor hanya terlihat oleh IT Administrator dan IT Support.

## 3.9 Stock Opname

Digunakan untuk mencocokkan kondisi fisik aset dan stok dengan data sistem.

### Alur:

1. IT Support membuat sesi stock opname.
2. Menentukan lokasi.
3. Sistem menampilkan daftar aset atau inventory.
4. Petugas melakukan pengecekan fisik.
5. Petugas menginput hasil pemeriksaan.
6. Sistem membandingkan jumlah fisik dengan jumlah sistem.
7. Selisih dicatat.
8. Penyesuaian inventory dapat dibuat melalui stock adjustment dengan alasan.

### Informasi hasil:

- Item
- System Quantity
- Physical Quantity
- Variance
- Condition
- Notes
- Checked By
- Checked Date

Untuk aset individual, pemeriksaan harus mencocokkan Asset Code dan kondisi fisik perangkat.

**[Baru] Aturan tambahan:**

- Status sesi: Draft, In Progress, Completed, Cancelled.
- Hasil pemeriksaan aset individual: Ditemukan sesuai, Ditemukan di lokasi lain, Kondisi berbeda, Tidak ditemukan.
- System Quantity disimpan sebagai snapshot saat item mulai dihitung, sehingga Variance tetap dapat dijelaskan walau ada transaksi sesudahnya.
- Stock Adjustment akibat selisih dibuat manual oleh IT Support dengan alasan, bukan otomatis saat sesi selesai.
- Sesi yang sudah Completed tidak dapat diubah.

## 3.10 Asset Disposal

Digunakan untuk mencatat aset yang sudah tidak digunakan.

Contoh:

- Perangkat rusak berat.
- Perangkat sudah tidak ekonomis diperbaiki.
- Perangkat hilang.
- Perangkat sudah tidak dibutuhkan.

Data disposal:

- Disposal Number
- Asset
- Disposal Date
- Disposal Reason
- Final Condition
- Description
- Recorded By

Aset yang disposed tidak boleh lagi diperlakukan sebagai aset aktif.

**[Baru] Aturan tambahan:**

- Disposal Reason dipilih dari daftar: Rusak berat, Tidak ekonomis diperbaiki, Hilang, Tidak dibutuhkan, Lainnya (dengan keterangan).
- Disposed bersifat final. Jika salah input, hanya IT Administrator dapat membatalkannya dengan catatan alasan, dan pembatalan tercatat di audit log.
- Aset yang sedang dipinjam harus diselesaikan atau dibatalkan peminjamannya sebelum di-disposal.

Riwayat aset tetap tersimpan.

## 3.11 Outlet Item Request

Digunakan oleh Outlet Management untuk mengajukan kebutuhan inventory kepada IT Support.

### Alur:

1. Outlet Management membuka halaman Request.
2. Memilih barang yang dibutuhkan.
3. Menginput jumlah.
4. Menambahkan alasan permintaan.
5. Mengirim permintaan.
6. IT Support melihat permintaan masuk.
7. IT Support memproses permintaan.
8. Stok dikurangi melalui transaksi stock out ketika barang benar-benar dikeluarkan.
9. Status permintaan diperbarui.

### Data request:

- Request Number
- Request Date
- Outlet
- Requested By
- Item
- Requested Quantity
- Fulfilled Quantity
- Reason
- Status
- Processed By
- Notes

Status:

- Submitted
- Processing
- Partially Fulfilled
- Fulfilled
- Rejected
- Cancelled

Tidak ada approval workflow. Request langsung masuk ke antrean pekerjaan IT Support.

**[Baru] Aturan tambahan:**

- Satu request dapat berisi beberapa baris barang. Setiap baris punya Requested Quantity dan Fulfilled Quantity sendiri.
- Fulfilled Quantity bertambah hanya melalui transaksi Stock Out yang terkait dengan request tersebut.
- Outlet Management dapat membatalkan request miliknya selama masih Submitted. IT Support dapat menolak (Rejected) dengan alasan wajib.
- Outlet hanya melihat barang yang boleh diminta dan status stok secara umum, bukan rincian stok lokasi lain.

## 3.12 Reporting & Analytics

Sistem harus menyediakan laporan yang dapat difilter berdasarkan lokasi dan tanggal.

### Asset Reports

- Asset List
- Asset by Category
- Asset by Location
- Asset by Status
- Asset by Condition
- Asset Assignment History
- Asset Mutation History
- Asset Maintenance History
- Asset Disposal Report

### Inventory Reports

- Current Stock
- Stock by Location
- Stock In Report
- Stock Out Report
- Stock Transfer Report
- Stock Adjustment Report
- Low Stock Report
- Inventory Transaction History

### Operational Reports

- Borrowing Report
- Overdue Loan Report
- Maintenance Report
- Stock Opname Report
- Outlet Request Report

### Export

Laporan minimal mendukung:

- Excel
- CSV

## 3.13 Audit Log

Setiap aktivitas penting harus tercatat.

Data audit log:

- User
- Action
- Module
- Record ID
- Previous Value
- New Value
- Timestamp

Aktivitas yang wajib dicatat:

- Pembuatan aset.
- Perubahan data aset.
- Mutasi aset.
- Stock in/out.
- Stock adjustment.
- Peminjaman dan pengembalian.
- Maintenance.
- Disposal.
- Perubahan hak akses.

Audit log tidak dapat diubah atau dihapus melalui antarmuka pengguna biasa.

**[Baru]** Audit log juga mencatat pembuatan dan penonaktifan pengguna serta pencabutan sesi. Setiap perubahan data dan catatan audit-nya harus tersimpan bersamaan (keduanya berhasil atau keduanya gagal). Retensi audit log: lihat bagian 9.

## 3.14 Aturan status dan transisi **[Baru]**

Perubahan status hanya boleh mengikuti tabel berikut. Transisi yang tidak tercantum ditolak sistem.

**Asset Status**

| Dari              | Boleh ke                                              | Pemicu                                                       |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Available         | In Use, On Loan, Under Maintenance, Damaged, Disposed | penempatan, peminjaman, maintenance, laporan rusak, disposal |
| In Use            | Available, Under Maintenance, Damaged, Disposed       | dikembalikan ke gudang, maintenance, laporan rusak, disposal |
| On Loan           | Available, Damaged                                    | pengembalian                                                 |
| Under Maintenance | Available, In Use, Damaged, Disposed                  | maintenance selesai atau tidak dapat diperbaiki              |
| Damaged           | Under Maintenance, Disposed                           | mulai perbaikan atau disposal                                |
| Disposed          | (final)                                               |                                                              |

**Loan Status**

| Dari                | Boleh ke            |
| ------------------- | ------------------- |
| Borrowed            | Returned, Cancelled |
| Returned, Cancelled | (final)             |

**Maintenance Status**

| Dari                 | Boleh ke                            |
| -------------------- | ----------------------------------- |
| Reported             | In Progress, Cancelled              |
| In Progress          | Waiting Parts, Completed, Cancelled |
| Waiting Parts        | In Progress, Cancelled              |
| Completed, Cancelled | (final)                             |

**Request Status**

| Dari                           | Boleh ke                                            |
| ------------------------------ | --------------------------------------------------- |
| Submitted                      | Processing, Rejected, Cancelled                     |
| Processing                     | Partially Fulfilled, Fulfilled, Rejected, Cancelled |
| Partially Fulfilled            | Partially Fulfilled, Fulfilled, Cancelled           |
| Fulfilled, Rejected, Cancelled | (final)                                             |

## 3.15 Impor data awal **[Baru, P0]**

Target kelengkapan data (5.1) membutuhkan pemuatan data massal. Impor menggunakan file Excel atau CSV dengan templat yang disediakan sistem.

- Data yang dapat diimpor: lokasi, karyawan, aset, item inventory, dan saldo awal stok (menghasilkan transaksi Opening Balance).
- Alur: unggah file, pratinjau dan validasi, tinjau baris yang bermasalah, konfirmasi, lalu simpan. Tidak ada data yang tersimpan sebelum konfirmasi.
- Validasi minimal: Asset Code unik, kategori dan lokasi dikenal, format tanggal benar.
- Laporan hasil impor menyebut baris yang berhasil dan yang ditolak beserta alasannya. Baris yang ditolak dapat diperbaiki dan diimpor ulang.
- Impor v1 hanya menambah data baru, tidak menimpa data yang sudah ada.
- Hanya IT Administrator dan IT Support yang dapat mengimpor. Setiap impor tercatat di audit log.

## 3.16 Label QR dan pemindaian **[Baru, P2, opsional]**

Pengembangan lanjutan setelah penggunaan dasar stabil: cetak label QR berisi Asset Code, lalu pindai dengan kamera HP untuk membuka detail aset dan mempercepat stock opname. Tidak termasuk v1.

---

# 4. DI LUAR SCOPE

Untuk menjaga agar sistem tetap fokus dan realistis dikembangkan oleh satu developer, beberapa fitur berikut tidak termasuk dalam versi awal.

## 4.1 Financial Management

Tidak termasuk:

- General Ledger.
- Accounting.
- Depreciation Calculation.
- Asset Revaluation.
- Financial Statement.
- Fixed Asset Accounting.

Sistem hanya menyimpan data aset dan informasi biaya akuisisi/perbaikan secara operasional.

## 4.2 Procurement Management

Tidak termasuk:

- Purchase Order Management.
- Purchasing Approval.
- Supplier Payment.
- Invoice Management.
- Procurement Workflow.

Pencatatan penerimaan barang tetap tersedia, tetapi bukan sistem pembelian lengkap.

## 4.3 Enterprise Integration

Tidak termasuk dalam versi awal:

- Integrasi SAP.
- Integrasi Finance System.
- Integrasi POS.
- Integrasi HRIS.
- Integrasi Accounting Software.
- RPA untuk mengambil data dari sistem lain.

Sistem dapat menggunakan import/export Excel sebagai jalur pertukaran data awal.

## 4.4 Advanced Approval Workflow

Tidak termasuk:

- Approval mutasi aset.
- Approval permintaan barang.
- Approval disposal.
- Multi-level approval.
- Digital signature approval.

Semua proses operasional mengikuti hak akses pengguna tanpa approval berjenjang.

## 4.5 Advanced IT Management

Tidak termasuk:

- Remote Desktop Management.
- Endpoint Monitoring.
- Device Management / MDM.
- Network Monitoring.
- Antivirus Management.
- Automated Device Discovery.
- Helpdesk Ticketing System lengkap dengan SLA.

---

# 5. KRITERIA SUKSES

Keberhasilan aplikasi akan dinilai dari kelengkapan data, keterlacakan transaksi, kemudahan operasional, dan penggunaan sistem.

## 5.1 Asset Data Coverage

Target:

- Minimal 95% aset IT aktif yang diketahui perusahaan sudah terdaftar. **[Revisi]** Baseline yang dipakai adalah daftar hasil inventarisasi awal yang disepakati sebelum go-live, bukan perkiraan.
- Setiap aset memiliki Asset Code unik.
- Setiap aset memiliki lokasi dan status.
- Riwayat penempatan aset dapat ditelusuri.

## 5.2 Inventory Accuracy

Target:

- Seluruh transaksi stock in dan stock out tercatat.
- Seluruh stok dapat dilihat berdasarkan lokasi.
- Sistem dapat mendeteksi stok minimum.
- Selisih stock opname dapat dilacak dan dijelaskan.

Target akurasi stok awal: minimal 95%, kemudian ditingkatkan melalui stock opname berkala.

## 5.3 Operational Traceability

Target:

- 100% mutasi aset tercatat.
- 100% peminjaman perangkat memiliki catatan.
- 100% pengembalian perangkat tercatat.
- Riwayat maintenance tersedia untuk setiap aset yang pernah diperbaiki.
- Aset yang sudah disposed tetap memiliki histori.

## 5.4 Outlet Management

Target:

- Seluruh outlet dapat melihat data aset miliknya.
- Permintaan barang dapat dibuat melalui sistem.
- IT Support dapat melihat dan memproses seluruh permintaan.
- Status permintaan dapat dipantau tanpa komunikasi manual berulang.

## 5.5 Reporting

Target:

- Laporan aset dapat ditampilkan berdasarkan outlet.
- Laporan inventory dapat ditampilkan berdasarkan lokasi.
- Laporan maintenance dan mutasi dapat diakses kapan saja.
- Export Excel/CSV dapat dilakukan tanpa proses penggabungan data manual.
- Pembuatan laporan rutin dapat diselesaikan dalam waktu kurang dari 5 menit setelah data tersedia.

## 5.6 Adoption

Target:

- IT Support menggunakan aplikasi sebagai sistem pencatatan utama.
- Outlet Management menggunakan aplikasi untuk melihat aset dan mengajukan kebutuhan.
- Tidak ada pencatatan transaksi operasional baru yang hanya disimpan di luar sistem sebagai proses utama.

---

# 6. ASUMSI DAN ATURAN BISNIS

1. Aplikasi digunakan oleh satu perusahaan dengan banyak outlet dan satu atau lebih lokasi Head Office.
2. Sistem menjadi database terpusat untuk pengelolaan aset dan inventory IT.
3. IT Asset dan IT Inventory merupakan dua jenis pengelolaan yang berbeda.
4. Satu aset individual memiliki satu Asset Code.
5. Inventory menggunakan pengelolaan jumlah stok berdasarkan lokasi.
6. Semua perpindahan stok harus tercatat dalam inventory transaction.
7. Semua mutasi aset harus tercatat dalam asset mutation history.
8. Data transaksi historis tidak boleh hilang akibat perubahan data master.
9. Outlet Management hanya bisa mengakses data outlet yang menjadi tanggung jawabnya.
10. Tidak ada approval workflow dalam versi awal.
11. Sistem menyediakan mekanisme import dan export Excel/CSV untuk membantu pemindahan data awal.
12. Penghapusan data transaksi secara permanen tidak diperbolehkan melalui aplikasi biasa.
13. **[Baru]** Aplikasi dipakai dengan satu mata uang (Rupiah) dan satu zona waktu tampilan (Asia/Jakarta) secara default.
14. **[Baru]** Antarmuka berbahasa Indonesia.
15. **[Baru]** Server awal berupa PC di kantor. Aplikasi harus dapat dipindahkan ke server lain tanpa mengubah data atau fitur.
16. **[Baru]** Karyawan pada master data tidak otomatis memiliki akun pengguna.

---

# 7. PRIORITAS IMPLEMENTASI

Seluruh fitur di atas merupakan target produk, tetapi tidak harus dibangun sekaligus.

Untuk solo developer, implementasi direkomendasikan dalam tahapan berikut.

| Tahap | Modul                            | Prioritas |
| ----- | -------------------------------- | --------- |
| 1     | Authentication & Role Management | P0        |
| 1     | Master Data                      | P0        |
| 1     | Asset Management                 | P0        |
| 1     | Inventory Management             | P0        |
| 1     | Receiving & Stock Transaction    | P0        |
| 1     | Location & Assignment            | P0        |
| 1     | Basic Dashboard & Reports        | P0        |
| 1     | Audit Log dasar                  | P0        |
| 1     | Impor Data Awal (Excel/CSV)      | P0        |
| 2     | Asset Mutation                   | P1        |
| 2     | Borrowing & Returning            | P1        |
| 2     | Maintenance Management           | P1        |
| 2     | Outlet Item Request              | P1        |
| 3     | Stock Opname                     | P1        |
| 3     | Asset Disposal                   | P1        |
| 3     | Advanced Reports                 | P2        |
| 3     | Label QR dan Pemindaian          | P2        |
| 3     | Audit Log Enhancement            | P1        |

**Definisi prioritas:**

- P0: Wajib tersedia agar sistem bisa mulai dipakai.
- P1: Wajib untuk melengkapi proses operasional.
- P2: Pengembangan lanjutan setelah penggunaan dasar stabil.

---

# 8. DEFINITION OF DONE

Aplikasi dapat dianggap siap digunakan pada tahap operasional apabila:

- Login dan role-based access berjalan.
- Data Head Office dan seluruh outlet dapat dikelola.
- IT Asset dapat diregistrasikan dan dilacak.
- Inventory dapat dikelola berdasarkan lokasi.
- Stock in dan stock out menghasilkan histori transaksi.
- Penempatan serta mutasi aset dapat dicatat.
- Peminjaman dan pengembalian dapat dilacak.
- Maintenance dapat dicatat.
- Outlet dapat mengajukan permintaan barang.
- Stock opname dapat dilakukan.
- Disposal dapat dicatat tanpa menghilangkan riwayat aset.
- Laporan dapat diekspor.
- Aktivitas penting tercatat dalam audit log.
- Backup dan mekanisme pemulihan database sudah diuji.
- **[Baru]** Impor data awal berhasil dan hasilnya dicocokkan dengan daftar inventarisasi.
- **[Baru]** Isolasi data antar-outlet diuji dengan akun nyata untuk setiap peran.
- **[Baru]** Dua Stock Out bersamaan pada stok yang sama tidak menghasilkan stok negatif.
- **[Baru]** Aplikasi menyala kembali sendiri setelah server dimatikan paksa.
- **[Baru]** Aplikasi dapat dipakai dengan nyaman di HP dari jaringan di luar kantor.

---

# 9. PERSYARATAN NON-FUNGSIONAL **[Baru]**

Angka di bawah adalah target awal dan dapat disesuaikan.

| Area              | Persyaratan                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kapasitas         | Sekitar 100 pengguna per hari. Daftar dengan puluhan ribu baris tetap responsif melalui pagination dan pencarian.                                                          |
| Performa          | Halaman daftar dan detail terbuka kurang dari 2 detik pada jaringan seluler 4G.                                                                                            |
| Ketersediaan      | Target tersedia setiap hari. Pemeliharaan terencana di luar jam operasional. Pulih otomatis setelah mati listrik.                                                          |
| Backup            | Harian, dengan salinan di luar server. Target kehilangan data maksimal 24 jam (RPO) dan pemulihan dalam 4 jam kerja (RTO). Uji pemulihan sebelum go-live dan tiap kuartal. |
| Keamanan          | HTTPS, password disimpan dengan hash, pembatasan login gagal, otorisasi di sisi server, isolasi data per outlet, validasi tipe dan ukuran file unggahan.                   |
| Kompatibilitas    | Dua versi terakhir Chrome, Edge, dan Safari (iOS). Layar HP mulai 360 px. Target sentuh minimal 44 px.                                                                     |
| Aksesibilitas     | Kontras teks memenuhi WCAG 2.1 AA, fokus keyboard terlihat.                                                                                                                |
| Bahasa dan format | Antarmuka Bahasa Indonesia, tanggal dd/mm/yyyy, mata uang Rupiah, zona waktu Asia/Jakarta secara default.                                                                  |
| Retensi data      | Transaksi tidak dihapus. Audit log disimpan minimal 3 tahun (lihat keputusan terbuka).                                                                                     |
| Pemeliharaan      | Skema database dimigrasi dengan skrip terversi, serta prosedur deploy dan backup terdokumentasi.                                                                           |

---

# 10. KEPUTUSAN TERBUKA **[Baru]**

Perlu jawaban pemilik produk. Nilai bawaan tertulis sebagai usulan yang dipakai sementara.

| #   | Pertanyaan                                                                | Usulan sementara                                    |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | Minimum Stock per item atau per lokasi?                                   | Per item per lokasi, opsional                       |
| 2   | Mutasi satu langkah atau dua langkah (dikirim lalu diterima)?             | Satu langkah                                        |
| 3   | Daftar nilai Asset Condition                                              | Baik, Cukup, Rusak                                  |
| 4   | Siapa yang boleh melihat biaya perolehan dan perbaikan?                   | IT Administrator dan IT Support                     |
| 5   | Disposal aset yang sedang dipinjam (mis. hilang)                          | Harus tutup peminjaman dulu                         |
| 6   | Label status memakai Bahasa Indonesia atau Inggris?                       | Istilah Inggris seperti di PRD, dengan UI Indonesia |
| 7   | Lama retensi audit log                                                    | 3 tahun                                             |
| 8   | Outlet di zona waktu berbeda (WIB, WITA, WIT)?                            | Satu zona waktu tampilan, Asia/Jakarta              |
| 9   | Apakah satu akun Outlet Management boleh mencakup lebih dari satu outlet? | Satu akun satu outlet                               |

---

**END OF DOCUMENT**
