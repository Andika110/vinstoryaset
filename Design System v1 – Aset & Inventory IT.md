# Design system v1

Aplikasi aset dan inventory IT untuk IT Admin, IT Support, dan Outlet Management. Dirancang mobile-first, dengan dua warna utama (Teal dan Slate) dan kontras teks yang lolos WCAG 2.1 AA.

## 1. Warna

Dua warna utama: **Teal** untuk aksi dan identitas, **Slate** untuk teks, garis, dan latar. Hijau, kuning, dan merah hanya muncul sebagai warna status dan umpan balik, tidak pernah sebagai warna merek. Status selalu disertai label teks, jadi warna bukan satu-satunya pembawa makna.

### Teal (utama)

### Slate (utama)

### Status

### Rasio kontras (dihitung langsung dari token)

| Pasangan | Mode | Rasio | Hasil |
| -------- | ---- | ----- | ----- |

Syarat AA: teks biasa 4,5:1; komponen UI dan batas input 3:1. Teks pada tombol nonaktif dikecualikan oleh WCAG.

## 2. Tipografi

IBM Plex Sans untuk antarmuka, IBM Plex Mono khusus untuk Asset Code, Serial Number, dan nomor request agar karakter mirip (0/O, 1/l) mudah dibedakan. Ukuran dasar 16px; field input wajib 16px agar iOS tidak memperbesar layar saat fokus.

| Token | Ukuran | Peran | Contoh |
| ----- | ------ | ----- | ------ |

## 3. Spasi, bentuk, dan layout

| **Radius**         | `sm 4` badge kecil · `md 8` tombol, input · `lg 12` kartu · `full` badge pil                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bayangan**       | `shadow-1` kartu · `shadow-2` menu dan dialog (hanya dua tingkat)                                                                          |
| **Breakpoint**     | Dasar \<768 (1 kolom, bottom nav) · `md 768` tabel muncul, nav samping ringkas · `lg 1024` sidebar penuh · `xl 1280` lebar konten maksimum |
| **Gutter halaman** | 16px (dasar) · 24px (md) · 32px (lg)                                                                                                       |
| **Target sentuh**  | Minimal 44×44px; tombol kecil 36px hanya di dalam tabel padat desktop                                                                      |
| **Gerak**          | 140ms, hanya untuk respons aksi; hormati `prefers-reduced-motion`                                                                          |

## 4. Komponen

### Tombol

Satu tombol primer per layar. Di mobile, tombol aksi utama form dibuat selebar layar (`btn-block`). Label berupa kata kerja: “Simpan aset”, bukan “Submit”.

### Input dan form

Asset CodeHarus unik. Contoh: LPT-0042.

Serial Number

Tanggal garansi berakhirTanggal sudah lewat. Pilih tanggal setelah hari ini.

Lokasi

Deskripsi

[x] Perangkat ini masih bergaransi

### Badge status

Status aset

AvailableIn UseOn LoanUnder MaintenanceDamagedDisposed

Status permintaan barang

SubmittedProcessingPartially FulfilledFulfilledRejectedCancelled

### Alert

**Aset tersimpan**

LPT-0042 sekarang berstatus In Use di Union Outlet A.

**Stok menipis**

Thermal Paper tersisa 3 roll di Head Office, batas minimum 5.

**Stok tidak cukup**

Permintaan 10 patch cord, stok tersedia 6. Kurangi jumlah atau pilih lokasi lain.

### Kartu dan daftar aset (mobile jadi kartu, desktop jadi tabel)

| Asset Code | Nama | Lokasi | Status |
| ---------- | ---- | ------ | ------ |

### Navigasi bawah (mobile)

**Aset**

Daftar aset outlet Anda.

[Beranda](#beranda) [Aset](#aset) [Stok](#stok) [Request](#request)

Maksimal 5 tujuan. Di layar ≥768px, pola yang sama menjadi sidebar. Menu Admin (pengguna, audit log) masuk ke tab “Lainnya” atau sidebar.

## 5. Token siap pakai (CSS)

```

```

### Aturan singkat

Pakai token peran (`--primary`, `--text-2`, `--border-strong`), bukan hex langsung, supaya mode gelap tetap lolos AA. Teks di bawah 14px hanya untuk keterangan tambahan, bukan informasi penting. Fokus keyboard selalu terlihat (outline 3px). Peran pengguna tidak mengubah tampilan, hanya mengubah menu dan aksi yang tersedia.
