# Menjalankan & Menghentikan Server Aplikasi

Dokumen ini khusus untuk **menjalankan, mengecek, dan menghentikan server** Aset &
Inventory IT. Untuk deploy produksi lengkap (service Windows, Cloudflare Tunnel,
backup, restore), lihat `DEPLOYMENT.md`.

---

## 1. Ringkasan mode menjalankan

| Mode                | Perintah                               | Penggunaan                                          |
| ------------------- | -------------------------------------- | --------------------------------------------------- |
| Development         | `bun run dev`                          | Coding, hot reload                                  |
| Production lokal    | `bun run build` lalu `bun run preview` | Review hasil build                                  |
| Detached/background | `Start-Process`                        | Review yang harus tetap hidup saat terminal ditutup |
| Service Windows     | NSSM                                   | Produksi PC kantor                                  |
| Cloudflare Tunnel   | `cloudflared` service                  | Akses publik HTTPS                                  |

---

## 2. Prasyarat

### 2.1 Bun

Cek:

```powershell
bun --version
```

Jika `bun` tidak dikenali, gunakan path executable langsung. Di mesin ini:

```text
C:\Users\ANDIKA\AppData\Local\Author Software\nvm\installs\v26.13.0\node_modules\bun\bin\bun.exe
```

### 2.2 PostgreSQL

```powershell
Get-Service postgresql-x64-18
```

Status harus `Running`.

Cek database:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
  -h 127.0.0.1 -U inventory_owner -d inventory -c "select 1;"
```

### 2.3 `.env`

File `D:\INVENTORYASET_APP\.env` harus ada.

Nilai penting:

```dotenv
PORT=5173
HOST=127.0.0.1
ORIGIN=http://localhost:5173
DATABASE_URL=...
DATABASE_URL_MIGRATE=...
SESSION_SECRET=...
UPLOAD_DIR=./data/uploads
LOG_DIR=./data/logs
```

**Penting:** `ORIGIN` harus sama dengan alamat browser.

- Jika membuka `http://localhost:5173`, `ORIGIN=http://localhost:5173`.
- Jika membuka `http://127.0.0.1:5173`, `ORIGIN=http://127.0.0.1:5173`.
- Jika memakai domain, `ORIGIN=https://domain-anda`.

Jika tidak sama, login/form akan mendapat **403 CSRF**.

### 2.4 Dependency & database

```powershell
cd D:\INVENTORYASET_APP
bun install --frozen-lockfile
bun run db:migrate
```

`db:migrate` hanya diperlukan saat ada migrasi baru atau database baru.

---

## 3. Menjalankan mode development

Dari folder aplikasi:

```powershell
cd D:\INVENTORYASET_APP
bun run dev -- --port 5173 --host 127.0.0.1
```

Buka:

```text
http://localhost:5173
```

Ciri mode ini:

- hot reload;
- error development lebih detail;
- proses berjalan di terminal;
- berhenti saat terminal ditutup atau `Ctrl+C`.

Hentikan dengan:

```text
Ctrl + C
```

Jika port dipakai proses lain:

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen
```

Hentikan proses yang benar saja, lalu jalankan ulang.

---

## 4. Menjalankan production build secara lokal

### 4.1 Build

```powershell
cd D:\INVENTORYASET_APP
bun run build
```

Output ada di folder `build/`.

### 4.2 Jalankan

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '5173'
bun run preview
```

`bun run preview` adalah alias `bun ./build`.

Atau langsung:

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '5173'
bun ./build
```

Buka:

```text
http://localhost:5173
```

Hentikan dengan `Ctrl+C`.

> Jangan mengubah `PORT` tanpa menyesuaikan `ORIGIN` di `.env`.

---

## 5. Menjalankan sebagai proses background/detached

Cara ini dipakai untuk review agar server tetap hidup walaupun terminal ditutup.

```powershell
$bun = 'C:\Users\ANDIKA\AppData\Local\Author Software\nvm\installs\v26.13.0\node_modules\bun\bin\bun.exe'
$app = 'D:\INVENTORYASET_APP'
$logDir = Join-Path $app 'data\logs'
New-Item -ItemType Directory -Force $logDir | Out-Null

$env:HOST = '127.0.0.1'
$env:PORT = '5173'

$proc = Start-Process `
  -FilePath $bun `
  -ArgumentList './build' `
  -WorkingDirectory $app `
  -WindowStyle Hidden `
  -RedirectStandardOutput "$logDir\review-out.log" `
  -RedirectStandardError "$logDir\review-error.log" `
  -PassThru

$proc.Id | Set-Content "$env:TEMP\inventory-review.pid"
Write-Output "Server PID: $($proc.Id)"
```

Cek:

```powershell
Invoke-RestMethod http://localhost:5173/healthz
```

Hasil sehat:

```json
{ "status": "ok", "checks": { "app": "ok", "database": "ok" } }
```

Log proses:

```text
D:\INVENTORYASET_APP\data\logs\review-out.log
D:\INVENTORYASET_APP\data\logs\review-error.log
```

---

## 6. Cek status server

### Cek port

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

### Cek proses

```powershell
$pidFile = "$env:TEMP\inventory-review.pid"
if (Test-Path $pidFile) {
  Get-Process -Id (Get-Content $pidFile) -ErrorAction SilentlyContinue
}
```

### Cek health

```powershell
Invoke-RestMethod http://localhost:5173/healthz
```

Arti status:

| Hasil                     | Arti                                |
| ------------------------- | ----------------------------------- |
| `200` + `database: ok`    | Aplikasi & database sehat           |
| `503` + `database: error` | Aplikasi hidup, database bermasalah |
| Koneksi ditolak           | Server tidak berjalan               |

### Cek halaman login

Buka:

```text
http://localhost:5173/login
```

---

## 7. Menghentikan server

### 7.1 Mode development / production di terminal

Tekan:

```text
Ctrl + C
```

### 7.2 Proses background yang punya PID file

```powershell
$pidFile = "$env:TEMP\inventory-review.pid"
if (Test-Path $pidFile) {
  $serverPid = Get-Content $pidFile
  if (Get-Process -Id $serverPid -ErrorAction SilentlyContinue) {
    Stop-Process -Id $serverPid -Force
    Write-Output "Server PID $serverPid dihentikan."
  }
  Remove-Item $pidFile -Force
} else {
  Write-Output "PID file tidak ditemukan."
}
```

### 7.3 Hentikan berdasarkan port

Gunakan jika PID file hilang.

```powershell
$conn = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $conn.OwningProcess | Select-Object -Unique | ForEach-Object {
    Write-Output "Menghentikan PID $_"
    Stop-Process -Id $_ -Force
  }
} else {
  Write-Output "Tidak ada server di port 5173."
}
```

**Periksa PID sebelum menghentikan** agar tidak mematikan proses lain.

### 7.4 Service Windows produksi

Jika memakai NSSM:

```powershell
Stop-Service InventoryAset
Get-Service InventoryAset
```

Jalankan lagi:

```powershell
Start-Service InventoryAset
```

Restart:

```powershell
Restart-Service InventoryAset
```

### 7.5 Cloudflare Tunnel

Jika memakai service:

```powershell
Stop-Service cloudflared
Start-Service cloudflared
Restart-Service cloudflared
```

Hentikan tunnel saja **tidak** mematikan aplikasi lokal.

---

## 8. Log

| Log                  | Lokasi                                           |
| -------------------- | ------------------------------------------------ |
| Aplikasi terstruktur | `data/logs/app.log`                              |
| Rotasi aplikasi      | `data/logs/app.log.1`, `.2`, …                   |
| Output proses review | `data/logs/review-out.log`                       |
| Error proses review  | `data/logs/review-error.log`                     |
| Service NSSM         | `data/logs/service-out.log`, `service-error.log` |

Lihat log terakhir:

```powershell
Get-Content D:\INVENTORYASET_APP\data\logs\app.log -Tail 30
```

Cari kode referensi error:

```powershell
Select-String -Path D:\INVENTORYASET_APP\data\logs\app.log `
  -Pattern "REF-XXXXXXXX"
```

Rotasi default: 5 MB × 5 file. Ubah lewat `LOG_MAX_BYTES` dan `LOG_MAX_FILES`.

---

## 9. Troubleshooting

### Port sudah dipakai

Gejala: `EADDRINUSE` / server langsung berhenti.

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen
```

Hentikan PID aplikasi lama, lalu jalankan ulang.

### Login/form 403

Penyebab paling umum: `ORIGIN` tidak sama dengan URL browser.

Contoh:

- Buka `http://localhost:5173`, `ORIGIN` harus `http://localhost:5173`.
- Jangan membuka `127.0.0.1` jika `ORIGIN` memakai `localhost`.

Perbaiki `.env`, lalu restart server.

### `/healthz` 503

Database tidak dapat diakses.

```powershell
Get-Service postgresql-x64-18
```

Pastikan service Running dan `DATABASE_URL` benar.

### Server berhenti sendiri

- Jalankan dari terminal untuk melihat error langsung:
  ```powershell
  $env:HOST='127.0.0.1'; $env:PORT='5173'; bun ./build
  ```
- Periksa `data/logs/review-error.log`.
- Pastikan folder `build/` ada. Jika tidak:
  ```powershell
  bun run build
  ```

### `bun` tidak ditemukan

Gunakan path lengkap `bun.exe`, atau tambahkan folder Bun ke `PATH`.

### Perubahan kode tidak muncul di production build

Production menjalankan folder `build/`. Setelah mengubah kode:

```powershell
bun run build
```

lalu restart server.

---

## 10. Checklist singkat

### Mulai

- [ ] PostgreSQL Running.
- [ ] `.env` ada dan `ORIGIN` sesuai URL.
- [ ] Build tersedia atau mode dev dipilih.
- [ ] Port 5173 bebas.
- [ ] Server dijalankan.
- [ ] `/healthz` mengembalikan `status: ok`.
- [ ] `/login` dapat dibuka.

### Berhenti

- [ ] Catat PID/port server.
- [ ] Hentikan proses aplikasi saja.
- [ ] Pastikan port 5173 tidak lagi listening.
- [ ] Hapus PID file jika memakai mode background.
- [ ] PostgreSQL/Cloudflare tidak ikut dimatikan kecuali memang diinginkan.

---

## 11. Perintah cepat

### Development

```powershell
cd D:\INVENTORYASET_APP
bun run dev -- --port 5173 --host 127.0.0.1
```

### Production lokal

```powershell
cd D:\INVENTORYASET_APP
bun run build
$env:HOST='127.0.0.1'; $env:PORT='5173'; bun run preview
```

### Stop berdasarkan port

```powershell
$conn=Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if($conn){ $conn.OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force } }
```

### Health

```powershell
Invoke-RestMethod http://localhost:5173/healthz
```

---

Untuk deployment produksi, service Windows, Cloudflare Tunnel, backup, dan restore,
lanjutkan ke `DEPLOYMENT.md`.
