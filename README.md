# Aset & Inventory IT

Aplikasi internal untuk mengelola aset IT dan inventory perusahaan. Proyek ini mengikuti
`PRD_v1.1.md`, `ARCHITECTURE.md`, `design_pattern.md`, `Design_UI.md`, dan Design System v1.

## Stack

| Area                      | Teknologi                           |
| ------------------------- | ----------------------------------- |
| Runtime & package manager | Bun >= 1.4                          |
| Framework                 | SvelteKit 3 + Svelte 5 (TypeScript) |
| Adapter                   | `@sveltejs/adapter-bun`             |
| Database                  | PostgreSQL 18 (native Windows)      |
| ORM                       | Drizzle ORM + drizzle-kit           |
| Lint & format             | ESLint + Prettier                   |

## Prasyarat

- Bun 1.4 atau lebih baru (`bun --version`)
- Git
- PostgreSQL 18 native service (`postgresql-x64-18`) — Docker tidak diperlukan

## Menjalankan proyek

```sh
# 1. Salin environment
copy .env.example .env

# 2. Install dependency
bun install

# 3. Jalankan development server
bun run dev
```

Buka `http://localhost:5173`.

## Script

| Perintah               | Fungsi                              |
| ---------------------- | ----------------------------------- |
| `bun run dev`          | Development server                  |
| `bun run check`        | Svelte/TypeScript check             |
| `bun run build`        | Build produksi dengan adapter Bun   |
| `bun run start`        | Jalankan hasil build (`./build`)    |
| `bun run preview`      | Alias untuk menjalankan hasil build |
| `bun run lint`         | Prettier check + ESLint             |
| `bun run format`       | Format dengan Prettier              |
| `bun run db:generate`  | Generate migrasi Drizzle            |
| `bun run db:migrate`   | Terapkan migrasi ke database        |
| `bun run db:check`     | Periksa konsistensi migrasi         |
| `bun run db:integrity` | Cek saldo stok vs ledger            |
| `bun run test`         | Unit test (Bun test)                |
| `bun run db:studio`    | Buka Drizzle Studio                 |

> `bunfig.toml` memaksa `bun run` memakai runtime Bun. Ini diperlukan karena
> `@sveltejs/adapter-bun` menolak build yang dijalankan dengan runtime Node.

## Struktur

```text
src/
├─ hooks.server.ts          # hook server (sesi & security header menyusul)
├─ lib/
│  ├─ components/           # komponen UI reusable
│  ├─ styles/               # design token & global styles
│  └─ server/               # hanya untuk kode server
│     ├─ db/schema/         # schema Drizzle per domain
│     ├─ auth/              # sesi, permission, scope outlet
│     ├─ services/          # aturan bisnis
│     ├─ dto/               # mapper data untuk browser
│     └─ domain/            # state machine, error, aturan domain
└─ routes/
   ├─ (auth)/login/         # autentikasi
   ├─ (app)/                # area setelah login
   │  ├─ dashboard/
   │  ├─ assets/
   │  ├─ inventory/
   │  ├─ stock/
   │  ├─ requests/
   │  ├─ reports/
   │  └─ admin/
   └─ healthz/              # health check
```

Folder kosong memakai `.gitkeep`. Sebagian besar isinya akan diisi pada FND-08 sampai FND-12
dan fitur FEAT-01 dan seterusnya.

> **Alias impor:** SvelteKit 3 mengganti alias `$lib` menjadi `#lib` (lihat
> `package.json` → `imports`). Kode proyek memakai `#lib`; contoh `$lib` di dokumen arsitektur
> lama perlu dibaca sebagai `#lib`.

## Design system

- `src/lib/styles/tokens.css` — palette, token peran, tipografi, spacing, radius, shadow,
  breakpoint, motion, dan struktur mode gelap.
- `src/lib/styles/global.css` — reset, tipografi dasar, form, fokus, layout container, dan
  utilitas aksesibilitas.
- Font IBM Plex Sans dan IBM Plex Mono di-self-host lewat `@fontsource` (subset Latin).
- Komponen wajib memakai token peran seperti `--primary`, `--text-2`, `--border-strong`;
  jangan menulis hex langsung di komponen.
- Mode gelap disiapkan lewat `[data-theme='dark']`; belum diaktifkan otomatis di v1.
- Halaman verifikasi token: `/dev/tokens`.

## UI kit

Komponen reusable ada di `src/lib/components/`:

| Komponen      | Fungsi                                                                |
| ------------- | --------------------------------------------------------------------- |
| `Button`      | Primary, secondary, danger, ghost; ukuran sm/md/lg; loading dan block |
| `FormField`   | Label, hint, error, dan atribut aksesibilitas untuk field             |
| `Input`       | Text, email, password, number, date, search, tel, url, time           |
| `Select`      | Dropdown dengan placeholder dan opsi                                  |
| `Textarea`    | Input teks panjang                                                    |
| `Checkbox`    | Checkbox dengan label, hint, dan error                                |
| `Alert`       | Success, warning, danger, info                                        |
| `StatusBadge` | Badge status berbasis teks dan tone                                   |
| `Card`        | Kartu dengan title, description, dan footer opsional                  |

Contoh import:

```ts
import { Button, Card, StatusBadge } from '#lib/components/index.js';
```

Halaman verifikasi visual dan interaksi: `/dev/ui`.

### State, responsive & aksesibilitas

- State standar memakai komponen FND-05/FND-06: `LoadingState`, `EmptyState`,
  `NoResultState`, `Alert`, `StatusBadge`, `Button` loading/disabled, `ConfirmDialog`,
  dan `Toast`. Contoh lengkap ada di `/dev/ui`.
- Pesan baku terpusat di `src/lib/messages.ts`: sesi berakhir, stok kurang, kode duplikat,
  transisi invalid, tidak punya akses, data tidak ditemukan, dan error sistem.
- Status tidak pernah hanya mengandalkan warna: badge selalu memiliki label teks dan
  `Alert` memiliki ikon + judul.
- Target sentuh minimal 44px (`--touch-target`), font input 16px, fokus `:focus-visible`
  3px, skip link, serta `prefers-reduced-motion` dihormati.
- Card mobile memakai satu kolom utama (kode/nama), maksimal 2–3 metadata, dan aksi
  berukuran sentuh; tabel desktop dapat di-scroll pada layar sempit.
- Layout diuji untuk lebar 360px melalui aturan container, card satu kolom, dan pemisahan
  `DataTable`/`MobileDataCard`.
- Audit aksesibilitas `/dev/ui` dengan Lighthouse: skor **Accessibility 1.0** dan
  **Best Practices 1.0**.

## Komponen daftar

Pola list memakai kontrak server-side:

```ts
type ListResult<T> = {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
};
```

Komponen:

| Komponen         | Fungsi                                                   |
| ---------------- | -------------------------------------------------------- |
| `DataTable`      | Tabel desktop dengan kolom dan aksi berbasis konfigurasi |
| `MobileDataCard` | Card mobile dari konfigurasi kolom yang sama             |
| `SearchFilter`   | Search + filter GET yang menyimpan query di URL          |
| `Pagination`     | Navigasi halaman yang mempertahankan search/filter       |
| `EmptyState`     | Kondisi belum ada data + aksi utama                      |
| `NoResultState`  | Tidak ada hasil + reset filter                           |
| `LoadingState`   | Skeleton loading                                         |

- `DataTable` dan `MobileDataCard` otomatis berganti pada breakpoint 768px.
- Kolom didefinisikan lewat `ListColumn<T>` (`key`, `label`, `mobile`, `mobilePrimary`,
  `align`, dan `render` snippet), bukan markup berbeda per fitur.
- Filter dan search memakai form GET; halaman di-reset ke 1 saat filter berubah.
- Pagination mempertahankan query yang sedang aktif dan memakai `page`, `pageSize`, `total`.
- Demo lengkap: `/dev/list`, termasuk state `empty`, `loading`, dan no-result.

## Dialog & upload

| Komponen        | Fungsi                                                                      |
| --------------- | --------------------------------------------------------------------------- |
| `ConfirmDialog` | Dialog native modal dengan focus trap, Esc, backdrop, dan varian destruktif |
| `Toast`         | Notifikasi success/warning/danger/info dengan auto-dismiss                  |
| `ImageUpload`   | Upload foto JPG/PNG/WebP, preview, kompresi WebP, dan state busy            |
| `FileUpload`    | Upload Excel/CSV dengan validasi ekstensi/ukuran dan tautan template        |

Aturan:

- `ConfirmDialog` tidak dapat ditutup lewat Esc/backdrop saat `loading=true`.
- Foto maksimal 5 MB, dikompresi di browser ke WebP (lebar maks 1600px, kualitas 0.8).
- File import maksimal 10 MB dengan ekstensi `.xlsx`, `.xls`, atau `.csv`.
- Validasi tipe/ukuran diulang di server melalui `src/lib/server/files.ts`.
- File disimpan ke `UPLOAD_DIR` dengan path `images/YYYY/MM/<uuid>.<ext>` atau
  `imports/YYYY/MM/<uuid>.<ext>`; database hanya menyimpan path, bukan blob.
- Template contoh tersedia di `static/templates/import-template.csv`.
- Demo interaktif: `/dev/forms`.

## AppShell & navigasi

- `src/lib/navigation.ts` — definisi menu per peran (`admin`, `support`, `outlet`), bottom
  navigation, dan penjaga akses route sementara.
- `AppShell`, `Sidebar`, `BottomNav`, dan `PageHeader` ada di `src/lib/components/`.
- Sidebar tampil pada layar ≥768px; bottom navigation tampil pada layar <768px dengan lima
  tujuan: Beranda, Aset, Stok, Request, Lainnya.
- Halaman aktif ditandai dengan `aria-current="page"`.
- Route group `(app)` memakai AppShell dan wajib memiliki sesi valid.
- Demo shell dan pergantian peran: `/dev/shell`.

## Autentikasi & otorisasi

- Login: `/login` · Logout: `POST /logout`.
- Cookie sesi `inventory_session`: `httpOnly`, `secure` di production, `sameSite=lax`,
  berlaku 7 hari dan diperpanjang saat aktif.
- Token sesi acak; database hanya menyimpan hash SHA-256.
- `src/lib/server/auth/session.ts` — buat/validasi/perpanjang/cabut sesi.
- `src/lib/server/auth/service.ts` — login dengan Argon2id via `Bun.password`.
- `src/lib/server/auth/permissions.ts` — `PERMISSIONS`, `can()`, `assertCan()`,
  `scopeToUser()`, `assertInScope()`.
- `src/lib/server/auth/guards.ts` — `requireUser(locals, url)` untuk load/action.
- `hooks.server.ts` — memuat sesi ke `locals.user`, memperpanjang sesi, dan memasang
  header keamanan dasar.
- Route `(app)` wajib memiliki sesi. Role outlet dibatasi ke outletnya sendiri; detail
  record di luar outlet dijawab `TIDAK_DITEMUKAN` lewat `assertInScope`.
- Semua service fitur wajib memakai `scopeToUser()` pada query daftar/laporan dan
  `assertCan()` sebelum operasi.

Fitur FEAT-01 yang sudah aktif:

- **Wajib ganti password** di `/change-password` untuk akun dengan
  `must_change_password=true`. Login dan seluruh route `(app)` akan diarahkan ke halaman ini
  sampai password diganti.
- **Pembatasan login**: maksimal 5 kegagalan per akun dan 20 per IP dalam 15 menit; akun/IP
  dikunci sementara selama 15 menit. Penghitung berada di memori proses (cukup untuk v1).
- **Pesan sesi**: sesi kedaluwarsa menampilkan “Sesi Anda telah berakhir”, logout
  menampilkan “Anda telah keluar”.
- **Validasi field**: pesan error tampil pada field username/email dan password.
- **Halaman error**: 403/404/429/500 memiliki pesan yang jelas dan tautan kembali.
- **Progressive enhancement**: form login dan ganti password tetap bekerja tanpa JavaScript,
  dengan status submitting saat JavaScript aktif.

Audit log mencatat perubahan password (`module=auth`, `action=password_changed`).

Akun demo development tersedia dari seed:

| Akun                   | Peran             | Sumber password                  |
| ---------------------- | ----------------- | -------------------------------- |
| `SEED_ADMIN_USERNAME`  | IT Administrator  | `SEED_ADMIN_PASSWORD` di `.env`  |
| `SEED_OUTLET_USERNAME` | Outlet Management | `SEED_OUTLET_PASSWORD` di `.env` |

`SEED_SAMPLE_DATA=true` membuat Union Outlet A beserta akun outlet demo.

> `ORIGIN` harus sama dengan origin yang dipakai browser. Di production, isi dengan
> domain Cloudflare Tunnel, misalnya `https://inventory.example.com`; jika tidak,
> proteksi CSRF SvelteKit akan menolak form login.

## Keamanan, error & health check

- **Header keamanan** dipasang oleh `src/hooks.server.ts` pada semua response:
  `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`,
  `Permissions-Policy`, `Cross-Origin-Opener-Policy`, dan `Cross-Origin-Resource-Policy`.
  HSTS ditambahkan hanya pada request HTTPS.
- **CSP**: `default-src 'self'`; script/style mengizinkan `'unsafe-inline'` untuk hidrasi
  SvelteKit; gambar mengizinkan `data:`/`blob:` (foto dan QR); `object-src 'none'`;
  `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'self'`. Pada development
  ditambahkan `'unsafe-eval'` dan koneksi `ws:`/`wss:` untuk Vite.
- **Kamera**: `Permissions-Policy` memakai `camera=(self)` agar scanner QR tetap berfungsi;
  mikrofon dan geolokasi dinonaktifkan.
- **Error tak terduga** ditangani `handleError`: pengguna mendapat pesan umum + kode
  referensi `REF-XXXXXXXX`, sedangkan log JSON berisi referensi, status, method, path,
  user ID, nama error, pesan, dan stack. Body request, password, token, dan isi file tidak
  dicatat. Kode referensi dapat dicari di log.
- **Halaman error** 401/403/404/429/500 ramah pengguna; detail teknis dan stack tidak
  ditampilkan. Error bisnis tetap ditampilkan pada field/alert melalui `DomainError`.
- **Health check** `GET /healthz` (tanpa login) menjalankan `select 1` ke database:
  - `200` → `{"status":"ok","checks":{"app":"ok","database":"ok"},...}`
  - `503` → `{"status":"error","checks":{"app":"ok","database":"error"},...}`
  - Response memakai `Cache-Control: no-store` dan tidak membocorkan detail error DB.

## Service patterns

- **`withAudit(actor, fn)`** di `src/lib/server/audit.ts` membuka transaksi,
  mengumpulkan entri audit lewat callback `audit(...)`, menulisnya di transaksi yang sama,
  dan membatalkan operasi bila tidak ada satu pun entri audit.
- **`DomainError(code, message)`** untuk kegagalan bisnis yang aman ditampilkan; route
  memetakannya ke field/alert. Error lain ditangani `handleError` dengan kode referensi.
- **State machine** terpusat di `src/lib/server/domain/transitions.ts`:
  aset, peminjaman, maintenance, dan request. Guard tersedia:
  `assertTransition`, `assertLoanTransition`, `assertMaintenanceTransition`,
  `assertRequestTransition`.
- **`nextNumber(tx, kind)`** di `src/lib/server/document-number.ts` memakai
  `doc_counters` per jenis+tahun. Nomor dibuat di transaksi yang sama sehingga rollback
  tidak meninggalkan nomor bolong. Kind yang tersedia antara lain
  `REQ/LN/MUT/MNT/DSP/RCV/ASG/SOT/TRF/ADJ/OB/IMP/OPN`.
- **Idempotency** di `src/lib/server/idempotency.ts`: `requireSubmissionId()` memvalidasi
  UUID; tabel transaksi memakai unique index `submission_id`. Kiriman ganda mengembalikan
  record yang sudah ada, bukan membuat data baru.
- **Invariant stok** `findStockInvariantMismatches()` di
  `src/lib/server/services/integrity.ts` membandingkan `stock_balances` dengan jumlah
  `stock_transactions`. Jalankan `bun run db:integrity`; hasil kosong berarti konsisten.
- Unit test: `tests/transitions.test.ts` dan `tests/idempotency.test.ts`
  (`bun run test`).
- **Test database**: `tests/setup.ts` memakai database terpisah `inventory_test`
  (dibuat otomatis; `inventory_owner` perlu hak `CREATEDB` atau database test sudah
  dibuat). Jika perlu: `ALTER ROLE inventory_owner CREATEDB;`. Migrasi dijalankan
  otomatis, lalu data dibersihkan dengan truncate terkontrol sebelum setiap test
  integrasi dan setelah selesai.
- **Test integrasi & smoke**: login dengan akun Admin/Outlet nyata, isolasi outlet,
  create asset, receiving (stock in), stock out, request, audit per operasi tulis,
  idempotency, rollback nomor dokumen, dan uji dua stock out paralel pada stok terbatas.
- CI minimal: `.github/workflows/ci.yml` menjalankan install, migrasi, check, lint,
  test, dan build dengan PostgreSQL service.

## Observability & structured logging

- `src/lib/server/logger.ts` menulis JSON line ke `LOG_DIR/app.log` (default
  `./data/logs/app.log`) dengan field: `timestamp`, `level`, `message`, `module`,
  `requestId`, `userId`, `method`, `path`, `status`, dan `durationMs`.
- **Request ID**: `hooks.server.ts` memakai header `x-request-id` yang valid atau membuat
  `req_<uuid>`, menyimpannya di `event.locals.requestId`, dan mengembalikannya pada
  response header `x-request-id`.
- **Error correlation**: `handleError` menulis `unhandled_error` beserta `reference`
  (`REF-XXXXXXXX`), `requestId`, user, path, dan stack ke log. UI hanya menampilkan pesan
  umum + kode referensi.
- **Redaksi**: key yang mengandung password/token/secret/hash/credential/authorization/
  cookie/body/file content diubah menjadi `[REDACTED]`; body request dan isi file tidak
  dicatat.
- **Rotasi**: default maksimal 5 MB per file dan 5 file (`app.log` → `app.log.1` …).
  Konfigurasi melalui `LOG_DIR`, `LOG_LEVEL`, `LOG_MAX_BYTES`, `LOG_MAX_FILES`.
- **Audit terpisah**: audit bisnis tetap di tabel `audit_logs` dan tidak dicampur dengan
  log debug/request.
- Health check `/healthz` hanya dicatat pada level `debug` agar tidak membanjiri log
  monitoring; error database tetap dicatat level `error`.
- Unit test redaksi dan rotasi ada di `tests/logger.test.ts`.

## User management

Hanya IT Administrator yang dapat membuka `/admin/users`; role lain mendapat 403.

- **List** `/admin/users`: pencarian username/email/nama, filter role, outlet, status,
  pagination server-side, badge aktif/nonaktif.
- **Create** `/admin/users/new`: username/email unik, nama, role, outlet, password awal,
  status akun. Outlet wajib untuk role Outlet Management.
- **Edit** `/admin/users/[id]/edit`: profil, role, outlet, dan status akun.
- **Detail** `/admin/users/[id]`: profil, status password, login terakhir, dan sesi aktif.
- **Reset password**: menghasilkan password sementara, mencabut semua sesi, dan memaksa
  ganti password saat login berikutnya. Password sementara hanya ditampilkan sekali.
- **Session management**: cabut satu sesi atau semua sesi pengguna.

Aturan pengaman:

- Username/email duplikat ditolak.
- Akun sendiri tidak dapat dinonaktifkan.
- Admin aktif terakhir tidak dapat dinonaktifkan atau diubah role-nya.
- Perubahan role/outlet/status dan reset password mencabut sesi pengguna.
- Semua aksi tercatat di audit log: `user_created`, `user_updated`, `password_reset`,
  `session_revoked`, `sessions_revoked`.

## Dashboard

Dashboard ada di `/dashboard` dan menyesuaikan peran pengguna. Semua widget memakai
service `src/lib/server/services/dashboard.ts`; tipe view model ada di
`src/lib/dashboard.ts`, dengan komponen reusable `SummaryCard` dan `ActivityList`.

- **IT Administrator** melihat ringkasan seluruh lokasi: status aset (total, digunakan,
  rusak, under maintenance, dipinjam, disposed), inventory (jenis item, stok tersedia,
  stok minimum, stok habis), serta daftar request, maintenance, peminjaman terlambat,
  mutasi, dan transaksi stok terbaru.
- **IT Support** melihat antrean kerja: maintenance aktif, request yang menunggu
  diproses, peminjaman terlambat, jumlah stok minimum, dan aktivitas stok terbaru.
- **Outlet Management** hanya melihat data outlet sendiri. Ringkasan mencakup status
  aset outlet, inventory outlet, dan request outlet. Data biaya tidak pernah dikirim ke
  browser dan parameter URL tidak dapat membuka outlet lain.

Aturan tampilan:

- Peringatan stok minimum, stok habis, dan peminjaman terlambat tampil di atas widget.
- Setiap widget dimuat terpisah. Jika satu query gagal, hanya widget itu yang
  menampilkan pesan error; halaman tetap terbuka.
- State kosong memakai pesan per widget (mis. “Belum ada request”). Saat navigasi klien,
  kartu dan daftar menampilkan skeleton, bukan spinner satu halaman.
- Kartu ringkasan membawa filter ke halaman tujuan (mis. `/assets?status=damaged`,
  `/inventory?filter=low`, `/requests?status=submitted`). Baris aktivitas membawa
  pencarian kode aset, nomor request, atau nama item.
- Angka besar memakai `tabular-nums` dan layout satu kolom di mobile, grid di desktop.

## Aset

Modul aset ada di `/assets` dan menjadi sumber data tunggal untuk aset individual.

- **List** `/assets`: pencarian kode/nama/serial, filter kategori, lokasi, dan status,
  pagination server-side. Filter tersimpan di URL. Role outlet hanya melihat aset di
  outletnya; mencoba filter lokasi outlet lain tidak membuka data tambahan.
- **Create** `/assets/new`: kode aset, nama, kategori, brand, model, serial, tanggal
  pembelian/garansi, sumber perolehan, biaya, lokasi, kondisi, deskripsi, dan foto.
  Status awal selalu `Available`. Kode unik; serial boleh kosong tetapi harus unik jika
  diisi. Foto JPG/PNG/WebP maksimal 5 MB dikompres di browser lalu divalidasi ulang di
  server.
- **Edit** `/assets/[id]/edit`: identitas, pembelian, kondisi, deskripsi, dan foto.
  Status, lokasi, dan pemegang tidak dapat diubah bebas — perubahan lokasi/status hanya
  lewat proses penempatan, mutasi, peminjaman, maintenance, atau disposal. Aset
  `Disposed` bersifat read-only. Form membawa `updatedAt` untuk optimistic check dan
  mengembalikan konflik 409 bila data sudah berubah.
- **Detail** `/assets/[id]`: identitas, brand/model, serial, pembelian, garansi, lokasi,
  pemegang, kondisi, status, foto, dan action menu. Tab: Ringkasan, Mutasi, Maintenance,
  Peminjaman, dan Riwayat gabungan dengan filter jenis riwayat.
- **Foto** `/assets/[id]/photo`: route terautentikasi dan ter-scope; file disimpan di
  `UPLOAD_DIR` dan path relatifnya saja yang masuk database.
- **Riwayat** dibaca dari `asset_movements`, `asset_maintenances`, dan `asset_loans`
  dengan snapshot nama lokasi/pemegang, diurutkan kronologis dan ditampilkan dalam zona
  waktu Asia/Jakarta.

Aturan pengaman:

- Biaya perolehan hanya dikirim ke Admin dan Support; role outlet tidak menerima field
  biaya sama sekali.
- Aksi pada action menu mengikuti `ASSET_TRANSITIONS`; aksi yang tidak valid tidak
  ditampilkan. Modul transaksi (FEAT-06/07/11/12/14) belum aktif sehingga aksi ditandai
  fitur terkait.
- Detail/foto aset di luar outlet pengguna dijawab 404.
- Create/update menulis audit `asset_created`/`asset_updated` pada transaksi yang sama.
- Upload gambar menggantikan atau menghapus file lama setelah transaksi berhasil.

## Transaksi stok

Modul transaksi stok ada di `/stock` dan hanya tersedia untuk IT Administrator dan
IT Support (outlet 403).

- **List** `/stock`: semua dokumen stok (termasuk Stock In dari penerimaan), pencarian
  nomor dokumen/item, filter jenis, lokasi, dan rentang tanggal, pagination, badge jenis,
  dan tautan detail.
- **Form** `/stock/new?type=stock_out|transfer|adjustment`:
  - **Stock Out**: item, lokasi, qty, alasan. Stok dikurangi; ditolak jika tidak cukup.
  - **Transfer**: item, lokasi asal, lokasi tujuan, qty. Dua baris ledger dibuat
    (`transfer_out` negatif dan `transfer_in` positif) dan saldo kedua lokasi diubah
    dalam satu transaksi.
  - **Penyesuaian**: item, lokasi, arah tambah/kurang, qty, dan **alasan wajib**.
    Penyesuaian negatif tidak boleh membuat stok di bawah nol.
- Form menampilkan stok tersedia untuk item/lokasi yang dipilih dan memperingatkan jika
  qty melebihi stok.
- Nomor dokumen: `SOT-YYYY-####`, `TRF-YYYY-####`, `ADJ-YYYY-####`.
- Idempotensi memakai `submissionId`; submit ganda mengembalikan dokumen yang sama tanpa
  mengubah stok lagi.
- Saldo dikunci dengan `SELECT ... FOR UPDATE` sebelum validasi dan update, sehingga dua
  transaksi bersamaan tidak menghasilkan stok negatif. Transfer mengunci kedua lokasi
  dalam urutan ID yang konsisten.
- **Detail** `/stock/[id]`: header dokumen, lokasi asal/tujuan, alasan, catatan, pelaku,
  baris ledger (item, tipe, qty bertanda, lokasi), referensi (mis. receipt penerimaan),
  dan tautan ke item. Read-only.
- Audit: `stock_out_created`, `stock_transfer_created`, `stock_adjustment_created` dengan
  qty sebelum/sesudah.
- Koreksi stok dilakukan dengan penyesuaian baru, bukan menghapus ledger.

## Penerimaan

Modul penerimaan ada di `/receiving` dan hanya tersedia untuk IT Administrator dan
IT Support (outlet mendapat 403).

- **List** `/receiving`: pencarian nomor receipt/supplier/referensi, filter jenis dan
  rentang tanggal, pagination, badge jenis, serta tautan detail. Nomor receipt memakai
  format `RCV-YYYY-####` dan unik.
- **Create** `/receiving/new`: satu receipt berisi satu baris penerimaan (MVP) dengan
  jenis `Purchase`, `Saldo Awal`, `Transfer Masuk (luar sistem)`, atau `Lainnya`,
  supplier opsional, lokasi tujuan, nomor referensi, dan catatan.
  - **Inventory**: memilih item aktif, quantity, dan biaya satuan. Dalam satu transaksi,
    `stock_balances` bertambah, `stock_documents` bertipe `stock_in` dibuat, dan satu
    `stock_transactions` ditulis. Stock In langsung terlihat di detail item.
  - **IT Asset**: mengisi identitas aset, kategori/brand/model/kondisi, quantity,
    serial (hanya jika quantity 1), garansi, biaya perolehan, dan deskripsi. Setiap unit
    dibuat sebagai aset terpisah dengan Asset Code otomatis `AST-YYYY-####` dan status
    `Available`.
- **Detail** `/receiving/[id]`: header receipt, supplier, tanggal, jenis, referensi,
  penerima, ringkasan unit/baris, serta daftar aset atau item yang diterima. Tautan
  menuju detail aset/item. Read-only; receipt tidak dapat diedit atau dihapus.
- **Idempotensi**: form membawa `submissionId`; submit ganda mengembalikan receipt yang
  sama tanpa menambah stok, dokumen, transaksi, atau aset lagi.
- **Atomicity**: receipt, baris, saldo/ledger atau aset, dan audit ditulis dalam satu
  transaksi database. Kegagalan tidak menyisakan data parsial.
- **Audit**: `receiving_created`, `asset_created` untuk setiap aset, dan
  `inventory_stock_in` untuk penerimaan inventory.

## Inventory

Modul inventory ada di `/inventory` untuk item non-aset beserta stok per lokasi.

- **List** `/inventory`: pencarian kode/nama, filter kategori, lokasi, dan status stok
  (`Tersedia`, `Menipis`, `Habis`), pagination server-side, serta badge status.
  Role outlet hanya melihat item yang memiliki saldo di outletnya.
- **Create/Edit** `/inventory/new` dan `/inventory/[id]/edit`: kode item unik, nama,
  kategori, brand, unit, deskripsi, status aktif, dan minimum stok per lokasi. Stok
  saat ini bersifat read-only dan tidak pernah diubah dari form item; stok awal diisi
  melalui penerimaan atau saldo awal (FEAT-09/10).
- **Minimum stok per lokasi** bersifat opsional. Nilai kosong berarti lokasi tidak
  dipantau. Perubahan minimum dicatat di audit `inventory_min_stock_updated` dan tidak
  mengubah quantity.
- **Detail** `/inventory/[id]`: total stok, status, peringatan stok menipis/habis,
  breakdown stok per lokasi (quantity, minimum, status), dan timeline transaksi stok.
  Total stok selalu sama dengan jumlah breakdown yang terlihat.
- **Outlet scope**: outlet hanya melihat saldo lokasi outletnya; item tanpa saldo di
  outlet dijawab 404 dan outlet tidak bisa create/edit.
- Item nonaktif tetap tampil di list dengan penanda `Nonaktif`, tetapi tidak muncul di
  pilihan transaksi baru.

Query list memakai agregat `stock_balances` + `min_stock` per lokasi. Service ada di
`src/lib/server/services/inventory.ts`; parser form di `inventory-form.ts`.

## Asset disposal

- **Daftar** `/disposals` (Admin/Support): pencarian nomor disposal/kode/nama aset,
  filter alasan, status, dan rentang tanggal, pagination, badge, empty/no-result state.
  Record disposal yang sudah selesai maupun dibatalkan tetap tampil; aset berstatus
  Disposed tetap muncul di daftar aset dan laporan.
- **Buat** `/disposals/new`: pilih aset, tanggal, alasan (Rusak berat / Tidak ekonomis
  diperbaiki / Hilang / Tidak dibutuhkan / Lainnya), kondisi akhir, dan keterangan.
  - Aset On Loan ditolak dan harus diselesaikan/dibatalkan dulu.
  - Alasan Lainnya wajib memiliki keterangan.
  - Disposal menyimpan status aset sebelumnya, mengubah aset menjadi **Disposed**
    (final), membuat nomor `DSP-...`, dan menulis audit `module=disposal`.
  - `submissionId` membuat konfirmasi ganda idempoten.
- **Detail** `/disposals/[id]`: field lengkap, aset, kondisi akhir, status sebelumnya,
  keterangan, dan timeline (aset terdaftar, disposal, pembatalan). Read-only, tanpa
  tombol edit/hapus; tersedia tautan ke aset dan audit.
- **Pembatalan** hanya untuk **IT Administrator** pada disposal berstatus Disposed:
  wajib alasan, memakai ConfirmDialog, mengembalikan aset ke status sebelumnya,
  menandai disposal `cancelled` (record tidak dihapus), dan menulis audit.
- Outlet tidak memiliki akses ke modul disposal.

## Stock opname

- **Daftar sesi** `/opname`: filter status (Draft/In Progress/Completed/Cancelled), jenis
  (Aset/Inventory), lokasi, dan rentang tanggal; pencarian nomor/lokasi; pagination.
  Outlet hanya melihat sesi untuk outletnya.
- **Buat sesi** `/opname/new` (Admin/Support): pilih lokasi dan jenis. Sesi dibuat sebagai
  **Draft**; daftar item belum diambil.
- **Mulai sesi** mengambil snapshot pada saat itu:
  - Aset: semua aset lokasi kecuali status `disposed`, `system_qty = 1`.
  - Inventory: seluruh `stock_balances` lokasi untuk item aktif, `system_qty = qty`.
  - Snapshot tidak berubah walaupun stok/aset berubah setelah sesi dimulai.
- **Pengecekan** `/opname/[id]/count`: Outlet dapat mengisi sesi in progress untuk
  outletnya; Admin/Support dapat mengisi semua.
  - Aset: hasil Sesuai / Lokasi lain / Kondisi berbeda / Tidak ditemukan, kondisi fisik, catatan.
  - Inventory: jumlah fisik dan catatan.
  - Item yang belum diisi ditandai belum dicek. Menyimpan progres tidak mengubah stok.
- **Hasil** `/opname/[id]`: ringkasan total/sudah dicek/belum dicek/selisih, tabel variance
  (sistem, fisik, selisih, hasil, kondisi, petugas, waktu), progres, dan status.
- **Selesaikan sesi** (Admin/Support) hanya jika semua item sudah dicek; status menjadi
  Completed dan read-only. Selisih **tidak** mengubah stok otomatis; Admin/Support mendapat
  tautan ke **Penyesuaian Stok** (`/stock/new?type=adjustment`).
- **Batalkan sesi** (Admin/Support) untuk draft/in progress dengan alasan wajib; status
  menjadi Cancelled dan tidak dapat dilanjutkan.
- Audit `module=opname`: create, start, complete, dan cancel. Outlet tidak dapat
  membuat, memulai, menyelesaikan, atau membatalkan sesi.

## Audit log

- **List** `/admin/audit`: audit log append-only dengan pencarian pengguna/aksi/modul/record,
  filter pengguna, modul, aksi, dan rentang tanggal, serta pagination. Filter tersimpan
  di URL.
- **Detail** `/admin/audit/[id]`: field event lengkap dan viewer JSON sebelum/sesudah.
  Nilai sensitif (password/token/secret/hash/credential/cookie) diredaksi menjadi
  `[REDACTED]`.
- **Akses**:
  - IT Administrator: seluruh modul.
  - IT Support: hanya modul operasional (`asset`, `assignment`, `mutation`, `loan`,
    `maintenance`, `stock`, `receiving`, `inventory`, `request`, `import`, `opname`,
    `disposal`). Modul lain tidak muncul di filter dan detailnya dijawab 404.
  - Outlet Management: tidak memiliki akses (403).
- **Imutabilitas**: tidak ada jalur aplikasi untuk update/delete. Migrasi
  `0002_audit_privileges` mencabut `UPDATE`, `DELETE`, `TRUNCATE` dari role
  `inventory_app`; role runtime hanya memiliki `SELECT` dan `INSERT` pada `audit_logs`.
- **Retensi**: kebijakan minimal 3 tahun. Audit lama tidak dihapus otomatis oleh
  aplikasi; arsip/pemeliharaan dilakukan di level database oleh operator.
- Perubahan akses pengguna (role/outlet/status), reset password, dan pencabutan sesi
  tercatat di audit (`module=user`/`auth`).

## Import data

- **Overview** `/admin/import`: pilihan lima jenis data (Lokasi, Karyawan, Aset, Item
  Inventory, Saldo Awal Stok) dan riwayat batch beserta status sukses/gagal.
- **Upload** `/admin/import/[type]`: unggah `.xlsx` atau `.csv` (maksimal 5 MB dan 2.000
  baris) serta unduh template terbaru:
  - `/admin/import/[type]/template?format=csv`
  - `/admin/import/[type]/template?format=xlsx` (sheet `Template` dan `Petunjuk`)
- **Pratinjau & validasi** `/admin/import/[type]/preview?token=...`: setiap baris
  divalidasi (kode duplikat, referensi kategori/lokasi/outlet, format tanggal, model,
  saldo yang sudah ada). Hasil parsing disimpan sementara di memori server selama 30
  menit; belum ada data yang ditulis ke database.
- **Konfirmasi** menyimpan hanya baris valid dalam satu transaksi database. Import
  bersifat add-only dan tidak menimpa data lama. Saldo awal membuat
  `stock_documents` bertipe `opening_balance` beserta `stock_transactions` dan
  `stock_balances`. Batch, hasil per baris, dan audit (`module=import`) ditulis dalam
  transaksi yang sama. Konfirmasi ganda mengembalikan batch yang sama.
- **Hasil** `/admin/import/batch/[id]`: ringkasan sukses/gagal, daftar baris gagal,
  unduh file error CSV (`/admin/import/batch/[id]/errors?format=csv`), dan tautan
  mengulang import.
- **Akses**: hanya IT Administrator dan IT Support. Outlet Management mendapat 403.
  Riwayat batch append-only; role runtime hanya memiliki `SELECT`/`INSERT` pada
  `import_batches` dan `import_batch_rows` (migrasi `0007_import_privileges`).
- Template dan validator memakai definisi kolom yang sama di
  `src/lib/server/services/imports.ts`.

## Label QR & scanner

- **Label QR** `/assets/labels`: daftar aset sesuai cakupan pengguna, filter
  pencarian/kategori/lokasi/status, pilih satu atau beberapa aset, lalu buka halaman cetak.
- **Cetak label** `/assets/labels/print?ids=...`: lembar A4 berisi grid label 60 × 35 mm
  (3 kolom), setiap label memuat QR berisi **Asset Code**, kode, nama, kategori, outlet,
  dan lokasi. Maksimal 100 label per cetak. Tombol cetak memakai `window.print()` dan CSS
  print menyembunyikan sidebar/topbar/bottom nav. Tautan “Cetak label” juga tersedia di
  detail aset.
- **Scanner** `/scan`: kamera diakses lewat `getUserMedia` setelah pengguna menekan
  tombol; frame didekode dengan `jsqr` tanpa menyimpan gambar.
  - State: idle, menyiapkan, aktif, izin ditolak, kamera tidak tersedia, dan konteks
    tidak aman.
  - Kamera hanya berjalan pada HTTPS atau localhost.
  - QR invalid/terlalu panjang ditolak dengan pesan; input manual selalu tersedia.
- **Hasil scan** `/scan/[code]`: ringkasan aset (kode, nama, kategori, serial, kondisi,
  outlet, lokasi, status) dan tautan ke detail aset. Query dibatasi outlet pengguna;
  aset di luar cakupan dijawab 404. Ringkasan tidak memuat nilai biaya.
- **Akses**: scanner untuk semua peran. Label QR dapat dipakai Admin/Support untuk semua
  aset dan Outlet untuk aset outletnya sendiri.
- Dependensi baru: `qrcode` (generate QR) dan `jsqr` (decode kamera).

## Laporan & export

- **Overview** `/reports`: kartu laporan per kategori Aset, Inventory, dan Operasional.
  Laporan lanjutan (disposal dan stock opname) diberi penanda `Lanjutan`.
- **Detail** `/reports/[key]`: satu template report dipakai untuk seluruh jenis laporan,
  dengan filter sesuai jenis (tanggal, lokasi, kategori, item, status, outlet),
  ringkasan filter, tabel desktop/mobile, pagination, empty state, dan tombol export.
- **Jenis laporan**:
  - Aset (9): daftar aset, per kategori/lokasi/status/kondisi, riwayat penempatan,
    mutasi, maintenance, dan disposal.
  - Inventory (8): stok saat ini, stok per lokasi, stock in/out/transfer/adjustment,
    stok minimum, dan riwayat transaksi.
  - Operasional (5): peminjaman, peminjaman terlambat, maintenance, stock opname, dan
    request outlet.
- **Scope**: outlet hanya menerima data outletnya pada tabel dan export; kolom biaya
  internal (maintenance) tidak dikirim ke outlet. Admin/Support melihat semua outlet.
- **Export CSV**: `/reports/[key]/export?format=csv` dengan filter yang sama; response
  streaming `text/csv; charset=utf-8` dan BOM untuk Excel.
- **Export Excel**: `/reports/[key]/export?format=xlsx` memakai ExcelJS, header tebal,
  nama file berisi jenis laporan + tanggal. Batas 50.000 baris per export; persempit
  filter jika melebihi.
- Laporan tidak mengubah data dan tidak menulis audit.

Dependensi baru: `exceljs` untuk export `.xlsx`.

## Request outlet

- **Outlet** membuka `/requests` untuk melihat request miliknya, membuat request di
  `/requests/new`, dan membatalkannya selama status masih `Submitted`. Outlet tidak
  pernah melihat request outlet lain.
- **Admin/Support** memakai `/requests` sebagai inbox seluruh outlet, dengan pencarian
  nomor/outlet/alasan, filter outlet, status, dan tanggal.
- **Create request**: outlet dari sesi, requested by dari sesi, beberapa baris item
  (item, qty, catatan), alasan, dan catatan. Stok yang ditampilkan hanya ringkasan umum
  total, bukan rincian lokasi/outlet lain. Item/qty kosong, qty 0, atau item duplikat
  ditolak.
- **Status**: `Submitted → Processing → Partially Fulfilled → Fulfilled`, serta
  `Rejected`/`Cancelled`. Fulfilled quantity hanya bertambah lewat Stock Out yang
  terkait request.
- **Processing** (Admin/Support):
  - `Mulai proses` mengubah status ke Processing.
  - Fulfillment memilih lokasi sumber stok dan qty per baris; qty tidak boleh melebihi
    sisa permintaan dan stok harus cukup. Satu Stock Out (`STO-YYYY-####`) dibuat untuk
    transaksi fulfillment, dengan ledger per item.
  - Jika semua baris terpenuhi → `Fulfilled`; jika sebagian → `Partially Fulfilled`.
  - Reject wajib alasan dan hanya dari `Submitted`/`Processing`.
- Outlet dapat membatalkan hanya saat `Submitted`; setelah Processing tombol tidak
  tersedia dan aksi langsung ditolak server.
- Idempotensi create (`submissionId`) dan fulfillment (`submissionId` Stock Out).
- Audit: `request_created`, `request_processing`, `request_fulfilled`,
  `request_rejected`, `request_cancelled`, `stock_out_created`.

## Maintenance

- **Riwayat** `/maintenance`: pencarian nomor/aset/masalah, filter status, lokasi, dan
  rentang tanggal, pagination, badge status. Outlet hanya melihat maintenance aset
  outletnya.
- **Lapor kerusakan** `/maintenance/new`: pilih aset (outlet hanya aset sendiri), jenis
  maintenance, deskripsi masalah wajib, dan foto opsional. Status awal `Reported`, aset
  menjadi `Damaged`, nomor `MNT-YYYY-####`, audit, idempotensi.
- **Proses** pada `/maintenance/[id]` (Admin/Support):
  - `Reported → In Progress`: teknisi + tanggal mulai; aset menjadi `Under Maintenance`.
  - `In Progress → Waiting Parts`: aset tetap under maintenance.
  - `Waiting Parts → In Progress`: melanjutkan perbaikan tanpa mengubah tanggal mulai.
  - `→ Completed`: tanggal selesai, deskripsi perbaikan wajib, biaya/vendor, dan spare
    part. Setiap spare part mengurangi stok lokasi maintenance lewat Stock Out
    (`STO-YYYY-####`) dan dicatat di `maintenance_parts` + ledger.
  - `→ Cancelled`: alasan wajib; status aset dikembalikan ke status sebelum laporan.
- Transisi ilegal ditolak server. Semua perubahan status/spare part/audit berada dalam
  satu transaksi.
- **Detail** `/maintenance/[id]`: field lengkap, foto kerusakan (route terautentikasi),
  spare part, dan timeline. Outlet tidak menerima nilai biaya/vendor dan tidak memiliki
  aksi proses.
- Migrasi `0005_lonely_molecule_man.sql` menambah `photo_path` dan `cancelled_reason` pada
  `asset_maintenances`.
- Audit: `maintenance_reported`, `maintenance_started`, `maintenance_waiting_parts`,
  `maintenance_completed`, `maintenance_cancelled`, serta `stock_out_created`.

## Peminjaman

- **Riwayat** `/assets/loans`: daftar peminjaman dengan pencarian nomor/aset/peminjam,
  filter status (Dipinjam, Terlambat, Dikembalikan, Dibatalkan) dan rentang tanggal,
  pagination. Overdue dihitung dari `expected_return_date`, bukan status tersimpan.
- **Create** `/assets/loans/new`: hanya aset berstatus `Available`; pilih employee
  opsional, nama peminjam, tanggal pinjam, rencana kembali, kondisi awal, dan catatan.
  Aset berubah menjadi `On Loan`. Nomor pinjam `LN-YYYY-####`, audit `loan_created`,
  idempotensi `submissionId`. Satu aset hanya dapat memiliki satu pinjaman aktif.
- **Detail** `/assets/loans/[id]`: header pinjaman, aset, peminjam/employee, tanggal,
  kondisi awal/setelah, catatan, dan peringatan overdue beserta jumlah hari.
  - **Pengembalian**: tanggal kembali + kondisi setelah wajib. Kondisi yang mengandung
    “Rusak” membuat aset `Damaged`; kondisi lain membuat aset `Available`. Pinjaman
    berubah menjadi `Returned`; pengembalian ganda ditolak.
  - **Pembatalan**: pinjaman `Borrowed` dapat dibatalkan; aset kembali `Available` dan
    pinjaman menjadi `Cancelled`.
  - Status final bersifat read-only; outlet hanya dapat melihat, tidak dapat
    mengembalikan/membatalkan.
- Aset `Disposed`/`On Loan`/status lain tidak dapat dipinjam.
- Audit: `loan_created`, `loan_returned`, `loan_cancelled`.

## Mutasi aset

- **Riwayat** `/assets/mutations`: daftar mutasi dengan pencarian nomor/kode/nama aset,
  filter lokasi dan rentang tanggal, pagination, dan tautan detail. Role outlet hanya
  melihat mutasi yang menyentuh lokasi outletnya.
- **Form** `/assets/mutations/new`: pilih aset, lokasi tujuan, tanggal, alasan, nama
  penerima, dan catatan. Lokasi sumber ditampilkan otomatis dari aset. `?asset=<id>`
  dapat dipakai dari detail aset.
- Mutasi berjalan satu langkah tanpa approval. Nama penerima hanya data.
- Aset `Disposed` dan `On Loan` tidak dapat dimutasi; lokasi asal dan tujuan harus
  berbeda.
- Baris aset dikunci (`for update`), lokasi aset diperbarui, movement bertipe `mutation`
  dibuat dengan nomor `MUT-YYYY-####` dan snapshot lokasi/pemegang, lalu audit
  `asset_mutated` ditulis pada transaksi yang sama.
- Form membawa `submissionId`; submit ganda tidak membuat movement kedua.
- **Detail** `/assets/mutations/[id]`: header, aset, lokasi asal/tujuan, tanggal, alasan,
  penerima, pelaku, catatan, serta timeline penempatan/mutasi aset. Read-only dan
  out-of-scope dijawab 404.
- Action menu **Mutasi** pada detail aset aktif dan hanya muncul untuk status yang valid.

## Penempatan aset

- **Riwayat** `/assets/assignments`: daftar penempatan dengan pencarian nomor/kode/nama aset,
  filter lokasi, employee, dan rentang tanggal, serta pagination. Filter tersimpan di URL.
  Role outlet hanya melihat penempatan yang menyentuh lokasi outletnya.
- **Form** `/assets/assignments/new`: pilih aset, employee (opsional), department, lokasi
  tujuan, tanggal, dan catatan. `?asset=<id>` dapat dipakai untuk memilih aset dari halaman
  detail.
- Penempatan dengan employee mengubah status menjadi `In Use`; tanpa employee menjadi
  `Available`.
- Aset yang dapat ditempatkan hanya berstatus `Available` atau `In Use`. Aset `On Loan`,
  `Under Maintenance`, `Damaged`, dan `Disposed` ditolak di server.
- Employee, department, dan lokasi tujuan harus berada di outlet yang sama.
- Setiap penempatan membuat satu `asset_movements` bertipe `assignment` dengan nomor
  `ASG-YYYY-####`, snapshot lokasi/pemegang sebelum dan sesudah, serta audit
  `asset_assigned` pada transaksi yang sama.
- Form membawa `submissionId`; submit ganda dengan token yang sama mengembalikan aset yang
  sama tanpa membuat movement kedua. Baris aset dikunci (`for update`) sebelum validasi
  status.
- Riwayat tidak dapat diubah/dihapus. Halaman detail aset menampilkan penempatan pada tab
  Mutasi/Riwayat dan action menu `Penempatan` hanya muncul jika status mengizinkan.

Migrasi `0004_deep_magik.sql` menambahkan `asset_movements.submission_id` beserta unique
index parsial untuk idempotensi.

## Master data

Overview `/admin/master-data` menampilkan kartu per modul beserta jumlah data. Halaman
detail per tipe memakai route generik `/admin/master-data/[type]` dan form
`/admin/master-data/[type]/[id]` (`new` untuk tambah).

| Tipe                 | Isi                                                        | Support |
| -------------------- | ---------------------------------------------------------- | ------- |
| `asset-category`     | Kategori aset                                              | tulis   |
| `inventory-category` | Kategori item inventory                                    | tulis   |
| `brand`              | Brand perangkat dan item                                   | tulis   |
| `asset-condition`    | Kondisi aset (mis. Baik, Rusak)                            | baca    |
| `unit`               | Satuan item (pcs, box)                                     | tulis   |
| `supplier`           | Supplier dan kontak                                        | tulis   |
| `model`              | Model aset + kategori + brand                              | tulis   |
| `department`         | Department per outlet                                      | baca    |
| `outlet`             | Head Office dan outlet                                     | baca    |
| `location`           | Lokasi hierarkis per outlet                                | baca    |
| `employee`           | Karyawan pemegang aset (bukan akun pengguna)               | tulis   |
| `asset-status`       | Status sistem read-only (enum database, tidak bisa diubah) | baca    |

Aturan:

- Admin dapat menambah, mengubah, dan menonaktifkan seluruh tipe yang dapat ditulis.
- Support hanya melihat overview terbatas dan dapat menulis tipe yang ditandai `tulis`;
  tipe lain dijawab 403 di server, bukan hanya disembunyikan di UI.
- Role outlet tidak memiliki akses ke master data (403).
- Tidak ada hard delete. Nonaktifkan mengisi `is_active=false`; data nonaktif tidak muncul
  di pilihan baru tetapi tetap tampil di daftar dan riwayat.
- Nama/kode unik divalidasi di service dan unique constraint database; pelanggaran
  dikembalikan sebagai pesan “Data dengan nama atau kode tersebut sudah ada.”
- Lokasi tidak boleh menjadi induk dirinya sendiri.
- Asset Status hanya menampilkan nilai enum; route tambah/edit mengembalikan 404.
- Setiap create/update/deactivate menulis audit log pada transaksi yang sama
  (`module=masterdata`, aksi `masterdata_created|updated|deactivated`).
- Form memakai named action `?/save` dan `?/deactivate` sehingga tetap bekerja tanpa
  JavaScript.

## Environment

Lihat `.env.example`. Variabel utama:

- `DATABASE_URL` — koneksi runtime memakai role `inventory_app`
- `DATABASE_URL_MIGRATE` — koneksi migrasi memakai role `inventory_owner`
- `SESSION_SECRET` — material rahasia sesi
- `UPLOAD_DIR` — folder foto/berkas unggahan
- `PORT`, `ORIGIN` — konfigurasi server

Jangan commit file `.env`.

## Database

Proyek memakai service PostgreSQL 18 yang sudah terpasang di Windows:

| Item          | Nilai                          |
| ------------- | ------------------------------ |
| Service       | `postgresql-x64-18`            |
| Host / port   | `127.0.0.1:5432`               |
| Database      | `inventory`                    |
| Owner migrasi | `inventory_owner`              |
| Role runtime  | `inventory_app` (hak terbatas) |

Alur migrasi:

```sh
bun run db:generate    # setelah mengubah schema
bun run db:migrate     # memakai DATABASE_URL_MIGRATE
bun run db:check
```

Migrasi tersimpan di `drizzle/` dan ikut Git. Untuk mesin baru, buat database/role terlebih
dahulu, lalu jalankan `bun run db:migrate`. Jangan memakai `drizzle-kit push` untuk produksi.

Health check database tersedia di `GET /healthz`.

## Schema & seed

Schema Drizzle berada di `src/lib/server/db/schema/` dan dibagi per domain:

| File              | Isi                                                     |
| ----------------- | ------------------------------------------------------- |
| `enums.ts`        | 16 enum status/tipe transaksi                           |
| `organization.ts` | Outlet, lokasi hierarkis, department, employee          |
| `users.ts`        | User dan session                                        |
| `master-data.ts`  | Kategori, brand, model, unit, supplier, kondisi aset    |
| `assets.ts`       | Aset, movement, loan, maintenance, spare part, disposal |
| `inventory.ts`    | Item inventory, saldo, dokumen stok, ledger stok        |
| `receiving.ts`    | Receiving dan baris penerimaan                          |
| `requests.ts`     | Request outlet dan baris request                        |
| `opnames.ts`      | Sesi stock opname dan baris pengecekan                  |
| `audit.ts`        | Audit log append-only dan doc counter                   |

Saat ini ada 32 tabel, 16 enum, dan 69 foreign key. Semua waktu memakai `timestamptz`;
tampilan aplikasi menggunakan Asia/Jakarta.

Aturan penting:

- `stock_balances.qty` tidak boleh negatif.
- `request_lines.fulfilled_qty` tidak boleh melebihi `requested_qty`.
- `assets.asset_code` unik; `serial_number` unik hanya jika terisi.
- User dengan role `outlet` wajib memiliki `outlet_id`.
- `audit_logs` untuk role `inventory_app` hanya memiliki `SELECT` dan `INSERT`.

Seed idempoten:

```sh
bun run db:seed
```

Seed membuat Head Office, tiga lokasi, tiga department, master data minimum (kategori,
brand, model, unit, kondisi), dan admin pertama. Kredensial admin diambil dari
`SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, dan `SEED_ADMIN_PASSWORD`
di `.env`. Admin wajib mengganti password saat login pertama.

## Status backlog

Backlog lengkap ada di Jira project SCRUM dan ringkasannya di `JIRA_BACKLOG.md`.
Sprint 1 berisi FND-01 sampai FND-11, FND-13, FND-14, FND-15, FEAT-01, FEAT-02,
FEAT-03, FEAT-04, FEAT-05, FEAT-06, FEAT-07, FEAT-08, FEAT-09, FEAT-10, FEAT-11,
FEAT-12, FEAT-13, FEAT-14, FEAT-15, FEAT-16, FEAT-17, FEAT-18, dan FEAT-19.

## Dokumen

- `PRD_v1.1.md` — kebutuhan produk
- `ARCHITECTURE.md` — arsitektur dan deployment
- `DEPLOYMENT.md` — langkah deploy PC kantor, Cloudflare Tunnel, backup & restore
- `design_pattern.md` — pattern transaksi, audit, stok
- `Design_UI.md` — halaman dan komponen per fitur
- `Design System v1 – Aset & Inventory IT.md` — token dan komponen visual
