# Panduan Uji Manual — Aset & Inventory IT

Panduan ini untuk **review aplikasi production build** di:

```text
http://localhost:5173
```

Gunakan data uji berprefix **`UJI-`** agar mudah dikenali. Jangan memakai data
pelanggan asli selama review.

---

## 0. Persiapan

1. Buka `http://localhost:5173/healthz`. Pastikan hasilnya:
   ```json
   { "status": "ok", "checks": { "app": "ok", "database": "ok" } }
   ```
2. Siapkan dua browser/profile:
   - Browser A: IT Administrator.
   - Browser B: Outlet Management.
3. Siapkan catatan hasil uji:
   | No  | Langkah     | Hasil yang diharapkan | Aktual | Status |
   | --- | ----------- | --------------------- | ------ | ------ |
   | 1   | Login admin | masuk dashboard       |        |        |
4. Akun:
   - Admin: `admin` + password yang sudah Anda ganti.
   - Outlet: `outlet` + password dari `.env` (`SEED_OUTLET_PASSWORD`).
   - Support: buat sendiri pada langkah berikut.

> Jika admin masih memakai password sementara, login lalu ganti password terlebih dulu.

---

## 1. Autentikasi & peran

### 1.1 Login admin

1. Buka `/login`.
2. Isi `admin` dan password.
3. Jika diminta, ganti password.
4. Pastikan masuk ke `/dashboard` dan menu Administrasi tampil.

**Harus berhasil:** dashboard admin memuat ringkasan, tanpa error.

### 1.2 Buat akun IT Support

1. Buka `/admin/users/new`.
2. Buat user:
   - Username: `uji-support`
   - Nama: `UJI Support`
   - Role: **IT Support**
   - Password: password sementara yang kuat
   - Aktif: ya
3. Simpan.
4. Logout, login sebagai `uji-support`.
5. Ganti password jika diminta.

**Harus berhasil:** Support dapat melihat aset, inventory, request, laporan, audit
terbatas, dan **tidak** melihat menu Pengguna.

### 1.3 Cek batas akses

Login sebagai Outlet, lalu coba buka langsung:

| URL             | Hasil yang diharapkan   |
| --------------- | ----------------------- |
| `/admin/users`  | 403 / tidak punya akses |
| `/admin/import` | 403                     |
| `/disposals`    | 403                     |
| `/receiving`    | 403                     |
| `/stock`        | 403                     |
| `/admin/audit`  | 403                     |

**Harus berhasil:** tidak ada data HO/outlet lain yang terbuka.

---

## 2. Master data

Login admin.

1. Buka `/admin/master-data`.
2. Cek kartu master data: Aset, Inventory, Organisasi, Vendor, Sistem.
3. Buka **Organisasi → Lokasi**.
4. Tambah lokasi:
   - Outlet: Head Office
   - Kode: `UJI-HO-1`
   - Nama: `UJI Ruang IT`
   - Aktif: ya
5. Buka **Organisasi → Employee**.
6. Tambah employee:
   - Kode: `UJI-EMP-1`
   - Nama: `UJI Karyawan`
   - Outlet: Head Office
   - Department: IT
   - Aktif: ya

**Harus berhasil:** data baru muncul di daftar dan bisa dibuka detailnya.

---

## 3. Siklus aset

### 3.1 Buat aset

1. Buka `/assets/new`.
2. Isi:
   - Asset Code: `UJI-AST-1`
   - Nama: `UJI Laptop`
   - Kategori: Laptop
   - Brand/Model: pilih yang tersedia (opsional)
   - Serial Number: `UJI-SN-1`
   - Tanggal pembelian: hari ini
   - Lokasi: `UJI Ruang IT`
   - Kondisi: Baik
   - Nilai perolehan: `12000000` (hanya Admin/Support)
3. Simpan.
4. Buka detail aset.

**Harus berhasil:** status `Available`; biaya terlihat untuk Admin/Support.

5. Buat aset kedua `UJI-AST-2` di lokasi `HO-WH`/Warehouse.

### 3.2 Penempatan aset

1. Buka `/assets/assignments/new`.
2. Pilih `UJI-AST-1`, lokasi `UJI Ruang IT`, employee `UJI Karyawan`.
3. Simpan.

**Harus berhasil:** status aset berubah `In Use`; riwayat penempatan bertambah;
audit `asset_assigned` tercatat.

### 3.3 Mutasi aset

1. Buka `/assets/mutations/new`.
2. Pindahkan `UJI-AST-1` dari `UJI Ruang IT` ke `HO-WH`.
3. Isi alasan, simpan.

**Harus berhasil:** lokasi aset berubah; riwayat mutasi tampil; status tetap sesuai.

### 3.4 Peminjaman

1. Buka `/assets/loans/new`.
2. Pilih `UJI-AST-2`, isi peminjam `UJI Peminjam`, tanggal pinjam hari ini,
   rencana kembali +7 hari, kondisi awal Baik.
3. Simpan.
4. Buka detail loan, lakukan **Pengembalian** dengan kondisi Baik.

**Harus berhasil:**

- status aset menjadi `On Loan` saat dipinjam;
- setelah kembali menjadi `Available` atau `Damaged` sesuai kondisi;
- riwayat peminjaman dan audit bertambah.

### 3.5 Uji aset On Loan tidak boleh disposal

1. Pinjamkan lagi `UJI-AST-2`.
2. Buka `/disposals/new` dan coba pilih `UJI-AST-2`.
3. Jika tombol/opsi tidak tersedia, itu benar; jika bisa dipilih, simpan.

**Harus berhasil:** sistem menolak dengan pesan aset sedang dipinjam. Kembalikan loan
setelah uji.

### 3.6 Maintenance

1. Buka `/maintenance/new`.
2. Laporkan kerusakan `UJI-AST-2`: masalah `UJI keyboard rusak`, tipe corrective,
   lokasi sesuai.
3. Simpan.
4. Sebagai Support/Admin, proses maintenance dan selesaikan.

**Harus berhasil:** status maintenance berubah `Dilaporkan → Dikerjakan → Selesai`;
riwayat aset bertambah; status aset kembali sesuai.

### 3.7 Disposal

1. Buka `/disposals/new`.
2. Disposal `UJI-AST-1`, alasan **Rusak berat**, kondisi akhir Rusak,
   keterangan `UJI disposal`.
3. Simpan.
4. Buka detail disposal.
5. Coba edit/hapus dari UI.

**Harus berhasil:**

- aset menjadi `Disposed` dan read-only;
- riwayat aset tetap ada;
- tidak ada tombol edit/hapus;
- Admin dapat membatalkan disposal dengan alasan; aset kembali ke status sebelumnya.

### 3.8 Label QR & scanner

1. Buka `/assets/labels`.
2. Pilih beberapa aset, klik **Cetak label**.
3. Periksa preview: kode, nama, QR.
4. Buka `/scan`.
5. Gunakan input manual `UJI-AST-2` (jika kamera tidak tersedia).

**Harus berhasil:** ringkasan aset tampil; kode aset HO tidak tampil saat login outlet;
ringkasan tidak memuat biaya.

---

## 4. Inventory

Login admin/support.

### 4.1 Buat item

1. Buka `/inventory/new`.
2. Isi:
   - Item Code: `UJI-ITEM-1`
   - Nama: `UJI Kabel LAN`
   - Kategori: Computer Components/Consumables
   - Satuan: pcs
3. Simpan.

### 4.2 Stock in (receiving)

1. Buka `/receiving/new`.
2. Jenis: Purchase.
3. Lokasi: `UJI Ruang IT`.
4. Item: `UJI-ITEM-1`.
5. Qty: `20`, biaya: `5000`.
6. Simpan.

**Harus berhasil:** saldo `20`; riwayat transaksi menampilkan stock in.

### 4.3 Stock out

1. Buka `/stock/new?type=stock_out`.
2. Item `UJI-ITEM-1`, lokasi `UJI Ruang IT`, qty `5`, alasan `UJI pemakaian`.
3. Simpan.

**Harus berhasil:** saldo menjadi `15`; ledger menampilkan -5.

### 4.4 Transfer

1. Buka `/stock/new?type=transfer`.
2. Dari `UJI Ruang IT` ke `HO-WH`, qty `5`.
3. Simpan.

**Harus berhasil:** saldo asal `10`, tujuan `5`.

### 4.5 Adjustment

1. Buka `/stock/new?type=adjustment`.
2. Sesuaikan stok dengan alasan yang jelas.
3. Simpan.

**Harus berhasil:** saldo berubah dan ledger bertambah; tidak ada saldo negatif.

### 4.6 Uji stok tidak cukup

1. Stock out qty `9999`.
2. Simpan.

**Harus berhasil:** ditolak dengan pesan `Stok tidak mencukupi...`; saldo tidak berubah.

---

## 5. Request outlet

1. Login sebagai Outlet.
2. Buka `/requests/new`.
3. Tambahkan `UJI-ITEM-1`, qty `5`, alasan `UJI request`.
4. Kirim.
5. Logout, login Support.
6. Buka `/requests`, buka request UJI.
7. Proses/fulfill sebagian atau seluruhnya.
8. Login Outlet lagi, buka request.

**Harus berhasil:**

- Outlet hanya melihat request miliknya;
- Support dapat memproses;
- status berubah `Submitted → Processing → Partially Fulfilled/Fulfilled`;
- stok berkurang sesuai fulfillment;
- Outlet tidak dapat memproses request.

---

## 6. Stock opname

### 6.1 Sesi aset

1. Login Support/Admin.
2. Buka `/opname/new`.
3. Lokasi `UJI Ruang IT`, jenis **Aset**, simpan sebagai draft.
4. Buka detail, klik **Mulai sesi**.
5. Pastikan daftar aset muncul dengan system qty.
6. Buka **Isi hitung**:
   - satu aset `Sesuai`,
   - satu aset `Tidak ditemukan`,
   - satu aset `Kondisi berbeda` + kondisi fisik.
7. Simpan progres.
8. Selesaikan sesi.

**Harus berhasil:**

- item belum dicek menahan penyelesaian;
- setelah semua dicek, status `Completed` dan read-only;
- variance dihitung;
- stok tidak berubah otomatis.

### 6.3 Mode scan & autosave (aset)

1. Login Support/Admin.
2. Buat sesi opname aset di lokasi yang punya aset + `Mulai sesi`.
3. Buka **Isi hitung**.
4. Uji Opsi 2:
   - filter **Belum dicek**, cari kode aset;
   - ketuk **Sesuai** → baris berubah status tanpa reload;
   - ketuk **Batalkan** → kembali belum dicek;
   - **Ubah** → isi kondisi berbeda + catatan → **Simpan**.
5. Uji Opsi 1:
   - ketuk **Mulai scan**;
   - ketik kode aset di “Atau ketik kode aset” → **Cek**;
   - baris ditandai sesuai, progress naik, toast muncul;
   - scan ulang kode yang sama → toast “sudah dicek”;
   - scan kode aset di lokasi lain → toast “Bukan di sesi ini”;
   - scan kode tidak dikenal → toast “Tidak ditemukan”.
6. Uji tanpa JavaScript (matikan JS di browser):
   - ketuk **Sesuai** / **Simpan** per baris → progres tetap tersimpan.

**Harus berhasil:**

- tidak ada kehilangan input saat reload;
- autosave per item;
- progress bar sticky;
- kamera memerlukan HTTPS/localhost (di produksi via Cloudflare Tunnel).

---

## 7. Laporan & export

1. Buka `/reports`.
2. Buka beberapa laporan:
   - Daftar Aset
   - Stok Saat Ini
   - Peminjaman
   - Maintenance
   - Disposal
3. Terapkan filter status/lokasi/tanggal.
4. Coba filter yang tidak menghasilkan data.
5. Download **CSV** dan buka di Excel.
6. Download **XLSX** dan buka di Excel.

**Harus berhasil:**

- filter tersimpan di URL;
- data sesuai filter;
- empty state tampil;
- CSV/XLSX dapat dibuka;
- outlet hanya menerima data outletnya;
- kolom biaya internal tidak tampil untuk outlet.

---

## 8. Import data

1. Buka `/admin/import`.
2. Pilih **Lokasi**.
3. Download template CSV/XLSX.
4. Isi satu baris valid (prefix `UJI-IMP-`) dan satu baris invalid.
5. Upload.
6. Periksa preview valid/invalid.
7. Konfirmasi.
8. Buka hasil, download file error.
9. Coba upload file yang sama lagi.

**Harus berhasil:**

- belum ada data tersimpan sebelum konfirmasi;
- hanya baris valid yang masuk;
- error CSV hanya berisi baris gagal;
- upload ulang mendeteksi duplikat;
- outlet tidak dapat membuka modul import.

---

## 9. Audit log

1. Login Admin, buka `/admin/audit`.
2. Cari aksi yang baru dilakukan (mis. `asset_assigned`, `stock_out_created`).
3. Filter modul/tanggal/aksi.
4. Buka detail audit.
5. Login Support, buka audit.

**Harus berhasil:**

- Admin melihat semua modul;
- Support hanya modul operasional;
- detail menampilkan before/after;
- password/token/secret tidak tampil (terredaksi);
- tidak ada tombol edit/hapus;
- Outlet mendapat 403.

---

## 10. UI, responsive & error

1. Perkecil browser ke lebar ±360px.
2. Cek halaman daftar: tabel berubah menjadi card, tidak ada scroll horizontal halaman.
3. Cek tombol/input/tombol aksi minimal 44px.
4. Gunakan keyboard:
   - Tab: fokus terlihat;
   - skip link;
   - Esc pada dialog.
5. Buka URL tidak ada: `/halaman-tidak-ada` → 404 ramah.
6. Login outlet lalu buka `/admin/users` → 403 ramah.
7. Logout, lalu buka `/dashboard` langsung → diarahkan ke login.
8. Cek `/healthz` → `200` dan database `ok`.

---

## 11. Automated checks

Jalankan di terminal dari `D:\INVENTORYASET_APP`:

```powershell
bun run check
bun run lint
bun run test
bun run build
```

Catatan: `bun run test` memakai database test terpisah `inventory_test`, bukan database
review.

---

## 12. Format laporan bug

```text
Judul:
Halaman/URL:
Peran:
Langkah reproduksi:
1.
2.
3.

Hasil aktual:
Hasil yang diharapkan:
Browser/ukuran layar:
Screenshot:
Kode referensi (jika error 500):
```

Prioritas:

- **P0** — data bocor/hilang, stok negatif, tidak bisa login, error 500 pada alur utama.
- **P1** — fitur utama gagal, validasi salah, scope outlet bocor.
- **P2** — tampilan/label/UX, responsive, pesan kurang jelas.

---

## 13. Urutan uji yang disarankan

Jika waktu terbatas, lakukan urutan ini:

1. Login & role.
2. Buat aset.
3. Receiving → stock out.
4. Request outlet.
5. Laporan CSV.
6. Audit.
7. Stock opname.
8. Disposal + cancel.
9. Import.
10. QR/scan.
11. Responsive/error.

Setelah selesai, minta saya membersihkan data berprefix `UJI-` jika diperlukan.
