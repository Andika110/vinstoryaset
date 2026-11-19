# Deployment — Aset & Inventory IT (FND-12)

Panduan ini untuk **deploy sendiri di PC kantor Windows**. Aplikasi tetap berjalan di
`127.0.0.1`; hanya Cloudflare Tunnel yang keluar ke internet. Jangan membuka port
aplikasi atau PostgreSQL di router.

> Status: panduan siap dipakai. FND-12 baru boleh ditandai **Done** setelah langkah
> verifikasi di bagian akhir benar-benar dijalankan di PC produksi.

---

## 0. Ringkasan arsitektur

```text
Internet → Cloudflare (HTTPS) → cloudflared → 127.0.0.1:3000
                                                   │
                                                   ├─ Bun + SvelteKit (service Windows)
                                                   ├─ PostgreSQL 18 (localhost:5432)
                                                   └─ data/uploads + data/logs
```

- Hanya `cloudflared` yang berkomunikasi ke internet.
- Aplikasi dan PostgreSQL hanya listen di localhost.
- Backup harian disalin ke penyimpanan di luar PC.

---

## 1. Sebelum mulai

Siapkan:

- Akses Administrator ke PC.
- Folder aplikasi: `D:\INVENTORYASET_APP`.
- Bun terpasang. Di mesin ini path executable-nya:
  `C:\Users\ANDIKA\AppData\Local\Author Software\nvm\installs\v26.13.0\node_modules\bun\bin\bun.exe`
- PostgreSQL 18 dengan service `postgresql-x64-18`.
- `psql`/`pg_dump` di:
  `C:\Program Files\PostgreSQL\18\bin\`
- Cloudflared di:
  `C:\Program Files (x86)\cloudflared\cloudflared.exe`
- Domain/subdomain, misal `inventory.example.com`.
- Password DB owner dan password role aplikasi yang kuat.
- Folder backup, misal `D:\BACKUP_INVENTORY`.

**Jangan menyalin password ke Git, chat, atau file `.md` ini.** Simpan di `.env`
dan file password manager.

### Backup dulu sebelum perubahan

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force D:\BACKUP_INVENTORY | Out-Null
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  -h 127.0.0.1 -U inventory_owner -Fc `
  -f "D:\BACKUP_INVENTORY\inventory-before-deploy-$stamp.dump" inventory
Compress-Archive -Path "D:\INVENTORYASET_APP\data\uploads\*" `
  -DestinationPath "D:\BACKUP_INVENTORY\uploads-before-deploy-$stamp.zip" -Force
```

Jika `uploads` masih kosong, zip boleh dilewati.

---

## 2. Konfigurasi `.env` produksi

Edit `D:\INVENTORYASET_APP\.env` (bukan `.env.example`):

```dotenv
PORT=3000
HOST=127.0.0.1
ORIGIN=https://inventory.example.com

DATABASE_URL=postgres://inventory_app:PASSWORD_APP@127.0.0.1:5432/inventory
DATABASE_URL_MIGRATE=postgres://inventory_owner:PASSWORD_OWNER@127.0.0.1:5432/inventory

SESSION_SECRET=ISI_RANDOM_MINIMAL_32_BYTE
UPLOAD_DIR=D:/INVENTORYASET_APP/data/uploads
LOG_DIR=D:/INVENTORYASET_APP/data/logs
LOG_LEVEL=info
LOG_MAX_BYTES=5242880
LOG_MAX_FILES=5

SEED_ADMIN_USERNAME=admin
SEED_ADMIN_EMAIL=admin@example.local
SEED_ADMIN_NAME=IT Administrator
SEED_ADMIN_PASSWORD=PASSWORD_AWAL_YANG_KUAT
SEED_SAMPLE_DATA=false
SEED_OUTLET_USERNAME=outlet
SEED_OUTLET_EMAIL=outlet@example.local
SEED_OUTLET_NAME=Outlet Management Demo
SEED_OUTLET_PASSWORD=PASSWORD_OUTLET_YANG_KUAT
```

Catatan:

- `ORIGIN` **wajib** sama persis dengan URL publik Cloudflare, termasuk `https://`.
  Jika tidak, proteksi CSRF SvelteKit akan menolak form login.
- Gunakan path absolut untuk `UPLOAD_DIR` dan `LOG_DIR` pada service Windows.
- `SEED_SAMPLE_DATA=false` untuk produksi.
- Buat `SESSION_SECRET` acak, misalnya:
  `bun -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`.
- Batasi izin file `.env` hanya untuk akun service/Administrator.

---

## 3. Siapkan database dan migrasi

Buka PowerShell sebagai Administrator.

```powershell
$PSQL = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$env:PGPASSWORD = "PASSWORD_OWNER"

# Cek role aplikasi
& $PSQL -h 127.0.0.1 -U inventory_owner -d inventory -c "\du"

# Jika role belum ada (hanya sekali):
& $PSQL -h 127.0.0.1 -U inventory_owner -d inventory -c `
  "CREATE ROLE inventory_app LOGIN PASSWORD 'PASSWORD_APP';"
```

Pastikan PostgreSQL hanya listen localhost. Edit
`C:\Program Files\PostgreSQL\18\data\postgresql.conf`:

```conf
listen_addresses = 'localhost'
```

Di `pg_hba.conf`, gunakan `scram-sha-256` untuk koneksi lokal. Restart service:

```powershell
Restart-Service postgresql-x64-18
```

Lalu jalankan migrasi dari folder aplikasi:

```powershell
Set-Location D:\INVENTORYASET_APP
$env:DATABASE_URL_MIGRATE = "postgres://inventory_owner:PASSWORD_OWNER@127.0.0.1:5432/inventory"
bunx drizzle-kit migrate
```

Jika ini instalasi baru dan admin belum ada, jalankan seed satu kali:

```powershell
$env:SEED_ADMIN_PASSWORD = "PASSWORD_AWAL_YANG_KUAT"
bun run db:seed
```

**Jangan** menjalankan seed berulang di produksi jika data sudah ada.

---

## 4. Build aplikasi

```powershell
Set-Location D:\INVENTORYASET_APP
bun install --frozen-lockfile
bun run check
bun run lint
bun run build
```

Untuk production, test dapat dijalankan sebelum deploy di mesin development:

```powershell
bun run test
```

`bun run test` memakai database test terpisah `inventory_test`; jangan diarahkan ke
database produksi.

Simpan build lama untuk rollback:

```powershell
$release = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force "D:\RELEASES\$release" | Out-Null
Copy-Item -Recurse build "D:\RELEASES\$release\build"
Copy-Item package.json,bun.lock "D:\RELEASES\$release\"
```

---

## 5. Jalankan aplikasi sebagai service Windows

### Opsi A — NSSM (disarankan)

Install NSSM (sekali):

```powershell
winget install NSSM.NSSM
```

Install service:

```powershell
$BUN = "C:\Users\ANDIKA\AppData\Local\Author Software\nvm\installs\v26.13.0\node_modules\bun\bin\bun.exe"

nssm install InventoryAset "$BUN" ".\build"
nssm set InventoryAset AppDirectory "D:\INVENTORYASET_APP"
nssm set InventoryAset Start SERVICE_AUTO_START
nssm set InventoryAset AppStdout "D:\INVENTORYASET_APP\data\logs\service-out.log"
nssm set InventoryAset AppStderr "D:\INVENTORYASET_APP\data\logs\service-error.log"
nssm set InventoryAset AppRotateFiles 1
nssm set InventoryAset AppRotateBytes 10485760
nssm start InventoryAset
```

Cek:

```powershell
Get-Service InventoryAset
Get-NetTCPConnection -LocalPort 3000 -State Listen
Invoke-RestMethod http://127.0.0.1:3000/healthz
```

Hasil yang benar:

```json
{ "status": "ok", "checks": { "app": "ok", "database": "ok" } }
```

### Opsi B — Task Scheduler (tanpa NSSM)

Buat task “InventoryAset”:

- Trigger: **At startup**
- Action: Start program
  `C:\Users\ANDIKA\AppData\Local\Author Software\nvm\installs\v26.13.0\node_modules\bun\bin\bun.exe`
- Arguments: `.\build`
- Start in: `D:\INVENTORYASET_APP`
- Run with highest privileges
- Restart on failure: 1 menit, 3 kali

NSSM lebih disarankan karena otomatis restart dan mengelola proses.

> Jangan menutup terminal sebagai cara menjalankan produksi. Service harus tetap hidup
> setelah logout/reboot.

---

## 6. Cloudflare Tunnel

Jalankan sekali untuk login:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel login
```

Buat tunnel:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel create inventory-aset
```

Catat UUID tunnel. Buat
`C:\Users\ANDIKA\.cloudflared\config.yml`:

```yaml
tunnel: UUID-TUNNEL
credentials-file: C:\Users\ANDIKA\.cloudflared\UUID-TUNNEL.json

ingress:
  - hostname: inventory.example.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

Buat DNS route:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel route dns inventory-aset inventory.example.com
```

Tes manual:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run inventory-aset
```

Buka `https://inventory.example.com`. Jika sudah benar, hentikan proses manual lalu
install sebagai service (PowerShell Administrator):

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" service install
Start-Service cloudflared
Get-Service cloudflared
```

Setelah domain aktif, pastikan `.env` berisi:

```dotenv
ORIGIN=https://inventory.example.com
```

Restart service aplikasi:

```powershell
Restart-Service InventoryAset
```

Opsional tetapi disarankan: tambahkan **Cloudflare Access** untuk membatasi siapa yang
boleh mencapai halaman login.

---

## 7. Firewall dan hardening

- Jangan buat port forwarding di router.
- Pastikan Windows Firewall memblokir inbound `3000` dan `5432` dari jaringan.
- Cek listener:

```powershell
Get-NetTCPConnection -LocalPort 3000,5432 -State Listen
```

`LocalAddress` harus `127.0.0.1` atau `::1`, bukan `0.0.0.0`.

- PostgreSQL hanya `localhost` dan `scram-sha-256`.
- `.env` tidak masuk Git dan hanya bisa dibaca Administrator/service account.
- Admin wajib mengganti password saat login pertama.
- Jangan mengaktifkan `SEED_SAMPLE_DATA` di produksi.
- Backup disimpan di luar PC dan dilindungi.

---

## 8. Backup harian

Buat folder `D:\BACKUP_INVENTORY`. Simpan script berikut sebagai
`D:\INVENTORYASET_APP\scripts\backup-production.ps1`:

```powershell
$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = 'D:\BACKUP_INVENTORY'
$appDir = 'D:\INVENTORYASET_APP'
New-Item -ItemType Directory -Force $backupDir | Out-Null
New-Item -ItemType Directory -Force "$backupDir\logs" | Out-Null

$env:PGPASSWORD = 'PASSWORD_OWNER'
$dump = Join-Path $backupDir "inventory-$stamp.dump"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  -h 127.0.0.1 -U inventory_owner -Fc -f $dump inventory

if (Test-Path "$appDir\data\uploads") {
  Compress-Archive -Path "$appDir\data\uploads\*" `
    -DestinationPath "$backupDir\uploads-$stamp.zip" -Force
}

# Simpan 14 backup harian terakhir
Get-ChildItem $backupDir -Filter 'inventory-*.dump' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 14 |
  Remove-Item -Force

Get-ChildItem $backupDir -Filter 'uploads-*.zip' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 14 |
  Remove-Item -Force

"Backup selesai $stamp" | Out-File "$backupDir\logs\backup.log" -Append
```

Jadwalkan lewat Task Scheduler:

- Nama: `InventoryAset-Backup`
- Trigger: harian 01:00
- Action: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\INVENTORYASET_APP\scripts\backup-production.ps1"`
- Run with highest privileges

Salin folder backup ke penyimpanan lain secara berkala:

```powershell
robocopy D:\BACKUP_INVENTORY \\NAS\Backup\INVENTORY /MIR /R:2 /W:5
```

**Uji restore minimal 3 bulan sekali.** Backup yang belum pernah direstore belum bisa
dianggap aman.

---

## 9. Restore

Contoh restore ke database yang sama. **Hentikan aplikasi dulu.**

```powershell
Stop-Service InventoryAset

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  -h 127.0.0.1 -U inventory_owner -Fc `
  -f "D:\BACKUP_INVENTORY\inventory-before-restore-$stamp.dump" inventory

& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" `
  -h 127.0.0.1 -U inventory_owner -d inventory `
  --clean --if-exists --no-owner `
  "D:\BACKUP_INVENTORY\inventory-YYYYMMDD-HHMMSS.dump"

# Jika ada file upload:
Expand-Archive "D:\BACKUP_INVENTORY\uploads-YYYYMMDD-HHMMSS.zip" `
  -DestinationPath "D:\INVENTORYASET_APP\data\uploads" -Force

Start-Service InventoryAset
Invoke-RestMethod http://127.0.0.1:3000/healthz
```

Setelah restore:

- Login sebagai admin.
- Cek beberapa aset, stok, dan audit log.
- Cek `/healthz` dari domain publik.
- Jika ada masalah, hentikan service dan restore backup sebelumnya.

---

## 10. Monitoring dan log

- Uptime monitor eksternal ke `https://inventory.example.com/healthz`.
  - `200` + `database: ok` = sehat.
  - `503` = aplikasi hidup tetapi database bermasalah.
- Log aplikasi: `D:\INVENTORYASET_APP\data\logs\app.log`.
- Rotasi default: 5 MB × 5 file. Ubah lewat `LOG_MAX_BYTES` dan `LOG_MAX_FILES`.
- Cari error berdasarkan kode referensi:

```powershell
Select-String -Path "D:\INVENTORYASET_APP\data\logs\app.log" `
  -Pattern "REF-XXXXXXXX"
```

- Log service NSSM ada di `data\logs\service-*.log` dan ikut rotasi.
- Audit bisnis ada di tabel `audit_logs`, bukan di file log.

---

## 11. Rollback aplikasi

Jika build baru bermasalah:

```powershell
Stop-Service InventoryAset
# Ganti isi folder build dengan release sebelumnya
Remove-Item -Recurse -Force D:\INVENTORYASET_APP\build
Copy-Item -Recurse D:\RELEASES\YYYYMMDD-HHMMSS\build D:\INVENTORYASET_APP\build
Start-Service InventoryAset
Invoke-RestMethod http://127.0.0.1:3000/healthz
```

Rollback database hanya jika migrasi benar-benar bermasalah. Gunakan backup yang
diambil sebelum deploy.

---

## 12. Checklist verifikasi FND-12

- [ ] `.env` produksi berisi `ORIGIN` domain HTTPS dan `HOST=127.0.0.1`.
- [ ] Migrasi berhasil dan admin dapat login.
- [ ] Password admin awal sudah diganti.
- [ ] Service `InventoryAset` berjalan otomatis setelah reboot.
- [ ] `http://127.0.0.1:3000/healthz` mengembalikan status `ok`.
- [ ] Cloudflare Tunnel aktif dan domain HTTPS dapat dibuka.
- [ ] `5432` dan `3000` tidak terbuka ke jaringan.
- [ ] Login, create asset, stock out, request, laporan, dan audit dapat dipakai.
- [ ] Log `app.log` bertambah dan rotasi berjalan.
- [ ] Backup otomatis berjalan dan file dump bisa dibuka.
- [ ] Restore diuji ke database terpisah.
- [ ] Salinan backup ada di perangkat/penyimpanan lain.
- [ ] Tidak ada password/token di Git atau dokumen publik.

Setelah semua checklist di atas lulus, baru FND-12 dapat ditandai **Done**.
