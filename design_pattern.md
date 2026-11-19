# Design Pattern: IT Asset & Inventory Management System

**Pendamping:** `ARCHITECTURE.md` · **Stack:** Bun, SvelteKit, PostgreSQL, Drizzle ORM · **Prinsip:** pakai pattern hanya jika menyelesaikan masalah nyata di PRD; satu developer, satu monolit.

---

## 1. Ringkasan

| #   | Pattern                              | Masalah yang diselesaikan                   | Dipakai di                       | Tahap |
| --- | ------------------------------------ | ------------------------------------------- | -------------------------------- | ----- |
| 1   | Layered architecture + service layer | Aturan bisnis tersebar di halaman           | Seluruh modul                    | 1     |
| 2   | Unit of Work (`withAudit`)           | Data berubah tanpa catatan audit            | Semua operasi tulis              | 1     |
| 3   | Append-only ledger + saldo           | Stok tidak bisa dilacak/dijelaskan          | Inventory, stock opname          | 1     |
| 4   | Atomic conditional update            | Stok negatif saat dua orang bersamaan       | Stock out, transfer              | 1     |
| 5   | **State machine**                    | Status aset/request berubah sembarangan     | Aset, loan, maintenance, request | 1–2   |
| 6   | **Query module per domain**          | Query yang sama ditulis berulang            | Daftar, laporan, dashboard       | 1     |
| 7   | **Policy (`can`)**                   | Aturan izin tersebar di banyak `if`         | Semua service                    | 1     |
| 8   | **DTO / mapper**                     | Kolom internal bocor ke browser             | Semua `load`                     | 1     |
| 9   | Document number generator            | Nomor dokumen ganda/bolong                  | Receipt, Request, Loan, dst.     | 1–2   |
| 10  | Idempotency token                    | Form terkirim dua kali di jaringan HP       | Semua form transaksi             | 1     |
| 11  | RBAC + scoping outlet                | Outlet melihat data outlet lain             | Semua query                      | 1     |
| 12  | Soft delete + snapshot               | Riwayat hilang saat master berubah          | Aset, master data                | 1     |
| 13  | Domain error                         | Kegagalan bisnis bercampur error sistem     | Service → route                  | 1     |
| 14  | Derived state                        | Status yang bisa dihitung disimpan dan basi | Loan _Overdue_, stok minimum     | 2     |
| 15  | Invariant check                      | Saldo dan ledger diam-diam berbeda          | Inventory                        | 1     |

Pattern 1–4 dan 11–13 sudah dijelaskan di `ARCHITECTURE.md`, di sini hanya diringkas. Pattern **5–10 dan 14–15** adalah tambahan beserta contoh kodenya.

---

## 2. Pattern yang sudah ada (ringkas)

**Layered + service layer.** Alur: `route (load/actions)` → `service` → `query module` → PostgreSQL. Route hanya memvalidasi input dan menerjemahkan hasil. Service memegang aturan bisnis, izin, dan transaksi.

**Append-only ledger.** `stock_transactions` hanya ditambah. Koreksi dibuat sebagai transaksi _adjustment_ dengan alasan. Setiap baris menyimpan `signed_qty` (positif untuk masuk, negatif untuk keluar). Transfer antar lokasi = dua baris (Transfer Out dan Transfer In) dalam satu transaksi database. Ini memenuhi aturan PRD bahwa stok tidak boleh diubah tanpa transaksi.

**Atomic conditional update.** Pengurangan stok memakai satu `UPDATE ... WHERE qty >= n`. Jika tidak ada baris yang terubah, stok tidak cukup. Tidak perlu kunci manual.

**RBAC + scoping outlet.** Peran dipetakan ke izin, lalu setiap query dibatasi `outlet_id` untuk peran outlet.

**Soft delete + snapshot.** Aset yang dilepas menjadi `disposed`, bukan dihapus. Nama lokasi dan pemegang disalin ke baris transaksi.

**Domain error.** `DomainError(kode, pesan)` untuk kegagalan yang bisa dijelaskan ke pengguna. Error lain dicatat ke log dan ditampilkan sebagai pesan umum.

---

## 3. State machine untuk status

### 3.1 Masalah

PRD punya empat set status: aset, peminjaman, maintenance, dan request barang. Tanpa aturan transisi yang terpusat, hal seperti ini bisa terjadi: aset `Disposed` dipinjam, maintenance `Completed` dibuka lagi, atau request `Fulfilled` dibatalkan.

### 3.2 Tabel transisi (usulan, mohon dikonfirmasi)

**Aset**

| Dari              | Boleh ke                                              | Pemicu                                                     |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| Available         | In Use, On Loan, Under Maintenance, Damaged, Disposed | assignment, pinjam, maintenance, lapor rusak, disposal     |
| In Use            | Available, Under Maintenance, Damaged, Disposed       | dikembalikan ke gudang, maintenance, lapor rusak, disposal |
| On Loan           | Available, Damaged                                    | pengembalian (kondisi baik / rusak)                        |
| Under Maintenance | Available, In Use, Damaged, Disposed                  | maintenance selesai / tidak bisa diperbaiki                |
| Damaged           | Under Maintenance, Disposed                           | mulai perbaikan / disposal                                 |
| Disposed          | _(final)_                                             | —                                                          |

Aset `On Loan` tidak langsung bisa di-dispose. Peminjamannya harus ditutup atau dibatalkan dulu (aturan sederhana yang bisa dilonggarkan, mis. untuk perangkat hilang).

**Peminjaman**

| Dari                | Boleh ke            |
| ------------------- | ------------------- |
| Borrowed            | Returned, Cancelled |
| Returned, Cancelled | _(final)_           |

`Overdue` **tidak disimpan** (lihat pattern 14).

**Maintenance**

| Dari                 | Boleh ke                            |
| -------------------- | ----------------------------------- |
| Reported             | In Progress, Cancelled              |
| In Progress          | Waiting Parts, Completed, Cancelled |
| Waiting Parts        | In Progress, Cancelled              |
| Completed, Cancelled | _(final)_                           |

**Request barang**

| Dari                           | Boleh ke                                            |
| ------------------------------ | --------------------------------------------------- |
| Submitted                      | Processing, Rejected, Cancelled                     |
| Processing                     | Partially Fulfilled, Fulfilled, Rejected, Cancelled |
| Partially Fulfilled            | Partially Fulfilled, Fulfilled, Cancelled           |
| Fulfilled, Rejected, Cancelled | _(final)_                                           |

### 3.3 Sinkron status aset dengan proses

Status aset diubah **oleh service proses terkait**, bukan diedit bebas:

- Pinjam → aset `On Loan`; kembali → `Available`.
- Maintenance mulai (`In Progress`) → aset `Under Maintenance`, dengan **status sebelumnya disimpan** di record maintenance; selesai/batal → status dikembalikan ke nilai itu.
- Disposal → aset `Disposed` (final).

### 3.4 Kode

```ts
// $lib/server/domain/transitions.ts
export type AssetStatus =
	'available' | 'in_use' | 'on_loan' | 'under_maintenance' | 'damaged' | 'disposed';

export const ASSET_TRANSITIONS: Record<AssetStatus, readonly AssetStatus[]> = {
	available: ['in_use', 'on_loan', 'under_maintenance', 'damaged', 'disposed'],
	in_use: ['available', 'under_maintenance', 'damaged', 'disposed'],
	on_loan: ['available', 'damaged'],
	under_maintenance: ['available', 'in_use', 'damaged', 'disposed'],
	damaged: ['under_maintenance', 'disposed'],
	disposed: []
};

export function assertTransition<S extends string>(
	table: Record<S, readonly S[]>,
	from: S,
	to: S,
	label: string
): void {
	if (!table[from].includes(to)) {
		throw new DomainError('TRANSISI_TIDAK_VALID', `${label}: ${from} → ${to} tidak diizinkan.`);
	}
}
```

Tabel yang sama dipakai UI untuk menampilkan hanya aksi yang valid (mis. tombol "Pinjamkan" hanya muncul jika `on_loan` ada di daftar tujuan), tetapi **penegakan tetap di service**.

---

## 4. Query module per domain (repository ringan)

Bukan repository penuh dengan interface dan implementasi ganda, cukup satu modul fungsi per domain yang menampung query yang dipakai berulang. Tujuannya: satu tempat untuk filter outlet, mudah dites, dan service tetap pendek.

```ts
// $lib/server/db/queries/assets.ts
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = typeof db | Tx;

export const assetQueries = {
	// dipakai sebelum mengubah status: kunci baris agar dua pinjaman bersamaan tidak lolos
	async getForUpdate(tx: Tx, id: number) {
		const [row] = await tx.select().from(assets).where(eq(assets.id, id)).for('update');
		return row ?? null;
	},

	async list(q: DbOrTx, scope: Scope, f: AssetFilter) {
		return q
			.select()
			.from(assets)
			.innerJoin(locations, eq(assets.locationId, locations.id))
			.where(
				and(
					scope.outletId ? eq(locations.outletId, scope.outletId) : undefined,
					f.status ? eq(assets.status, f.status) : undefined,
					f.search
						? or(ilike(assets.code, `%${f.search}%`), ilike(assets.name, `%${f.search}%`))
						: undefined
				)
			)
			.orderBy(desc(assets.updatedAt))
			.limit(f.pageSize)
			.offset(f.page * f.pageSize);
	}
};
```

Aturan: **filter outlet hanya ditulis di modul query**, lewat `scope` yang dibuat dari user. Service tidak menyusun `where` outlet sendiri.

---

## 5. Unit of Work: `withAudit`

Setiap operasi yang mengubah data wajib lewat satu pembungkus: membuka transaksi, menjalankan perubahan, dan menulis audit di transaksi yang sama. Jika tidak ada satu pun entri audit, pembungkus menolak (menangkap kasus "lupa audit").

```ts
// $lib/server/audit.ts
export type AuditEntry = {
	recordId: string;
	action: string;
	module: string;
	previousValue?: unknown;
	newValue?: unknown;
};

export async function withAudit<T>(
	user: AuthUser,
	fn: (tx: Tx, audit: (e: AuditEntry) => void) => Promise<T>
): Promise<T> {
	return db.transaction(async (tx) => {
		const entries: AuditEntry[] = [];
		const result = await fn(tx, (e) => entries.push(e));
		if (entries.length === 0) throw new Error('Operasi tulis tanpa entri audit.');
		await tx.insert(auditLogs).values(entries.map((e) => ({ ...e, userId: user.id })));
		return result;
	});
}
```

Karena aplikasi berjalan dengan role database yang hanya boleh `INSERT`/`SELECT` pada `audit_logs`, log tidak bisa diubah lewat aplikasi.

---

## 6. Policy: `can(user, action, resource)`

Matriks PRD memberi izin kasar per peran. Aturan yang bergantung pada data (milik outlet mana, status apa) diletakkan sebagai fungsi policy, bukan `if` di tiap service.

```ts
// $lib/server/auth/permissions.ts
export function can(user: AuthUser, action: string, resource?: Resource): boolean {
	const perms = PERMISSIONS[user.role];
	if (perms.includes('*')) return true;
	if (!perms.some((p) => p === action || p === `${action}:own`)) return false;

	// izin ':own' berarti hanya untuk outlet milik user
	if (!perms.includes(action) && resource?.outletId !== user.outletId) return false;

	// aturan kontekstual
	if (action === 'request:cancel' && user.role === 'outlet') {
		return resource?.status === 'submitted';
	}
	return true;
}

export function assertCan(user: AuthUser, action: string, resource?: Resource) {
	if (!can(user, action, resource))
		throw new DomainError('DILARANG', 'Anda tidak punya akses untuk aksi ini.');
}
```

Jika resource milik outlet lain, jawaban ke pengguna sebaiknya "tidak ditemukan", bukan "dilarang", agar keberadaan data tidak bocor.

---

## 7. DTO / mapper

Data yang dikirim ke browser dipisah dari bentuk tabel. Manfaatnya: kolom internal (mis. biaya perolehan, id internal) tidak ikut terkirim, label status sudah siap tampil, dan UI mendapat flag aksi yang boleh dilakukan.

```ts
// $lib/server/dto/assets.ts
export function toAssetListItem(row: AssetRow, user: AuthUser) {
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		status: row.status,
		statusLabel: STATUS_LABEL[row.status],
		locationName: row.locationName,
		actions: {
			edit: can(user, 'asset:write', row),
			borrow: can(user, 'loan:write', row) && ASSET_TRANSITIONS[row.status].includes('on_loan')
		}
	};
}
```

Flag `actions` hanya untuk tampilan. Keputusan akhir tetap di service.

---

## 8. Document number generator

PRD memuat banyak nomor dokumen: Receipt, Mutation, Loan, Maintenance, Disposal, Request. Nomor dibuat di dalam transaksi yang sama dengan dokumennya. Jika transaksi gagal, nomor ikut batal, jadi tidak ada nomor bolong.

```ts
// tabel: doc_counters(kind text, year int, last int, primary key (kind, year))
export async function nextNumber(tx: Tx, kind: 'REQ' | 'LN' | 'MUT' | 'MNT' | 'DSP' | 'RCV') {
	const year = new Date().getFullYear();
	const [row] = await tx
		.insert(docCounters)
		.values({ kind, year, last: 1 })
		.onConflictDoUpdate({
			target: [docCounters.kind, docCounters.year],
			set: { last: sql`${docCounters.last} + 1` }
		})
		.returning({ last: docCounters.last });
	return `${kind}-${year}-${String(row.last).padStart(4, '0')}`; // REQ-2026-0001
}
```

Baris counter terkunci sampai transaksi selesai. Pada beban ini hal itu tidak berdampak.

---

## 9. Idempotency token

Setiap form yang membuat transaksi membawa `submission_id` (UUID dibuat saat halaman dibuka). Kolom itu diberi unique index pada tabel dokumen. Kiriman kedua dengan ID yang sama tidak membuat data baru, melainkan menampilkan hasil yang sudah ada.

```ts
const inserted = await tx
	.insert(loans)
	.values({ ...data, submissionId })
	.onConflictDoNothing({ target: loans.submissionId })
	.returning();
if (inserted.length === 0) return await loanQueries.getBySubmission(tx, submissionId); // kiriman ganda
```

---

## 10. Derived state

Status yang bisa dihitung dari data lain **tidak disimpan**, supaya tidak pernah basi dan tidak butuh cron.

- **Loan Overdue:** `status = 'borrowed' AND expected_return_date < current_date`. Dihitung di query/DTO, lalu ditampilkan sebagai badge "Terlambat n hari".
- **Stok minimum/kosong:** `qty <= min_stock` dan `qty = 0`, dihitung saat query dashboard.
- **Stok aktual:** tetap disimpan di `stock_balances` demi kecepatan, tetapi dijaga oleh invariant check (pattern berikut).

---

## 11. Invariant check (ledger vs saldo)

PRD meminta stok aktual dapat dihitung dari transaksi. Karena saldo disimpan terpisah, buat pemeriksaan bahwa keduanya selalu sama. Jalankan di pengujian otomatis dan sebagai halaman admin ("Cek integritas stok").

```sql
SELECT b.item_id, b.location_id, b.qty AS saldo,
       COALESCE(SUM(t.signed_qty), 0) AS dari_ledger
FROM stock_balances b
LEFT JOIN stock_transactions t USING (item_id, location_id)
GROUP BY b.item_id, b.location_id, b.qty
HAVING b.qty <> COALESCE(SUM(t.signed_qty), 0);
```

Hasil harus kosong. Jika tidak, ada bug yang menulis saldo tanpa ledger. Karena itu pengaturan saldo hanya boleh dari service stok.

---

## 12. Contoh utuh: "Pinjamkan aset"

Semua pattern bekerja bersama dalam satu alur.

```ts
// routes/(app)/assets/[id]/+page.server.ts
export const actions = {
	borrow: async ({ request, locals, params }) => {
		const input = parse(BorrowSchema, await request.formData()); // validasi di route
		try {
			await loanService.borrow(locals.user, Number(params.id), input);
		} catch (e) {
			if (e instanceof DomainError) return fail(400, { code: e.code, message: e.message });
			throw e; // error sistem → log
		}
	}
};

// $lib/server/services/loans.ts
export async function borrow(user: AuthUser, assetId: number, input: BorrowInput) {
	assertCan(user, 'loan:write'); // 1. policy
	return withAudit(user, async (tx, audit) => {
		// 2. transaksi + audit
		const asset = await assetQueries.getForUpdate(tx, assetId); // 3. kunci baris aset
		if (!asset) throw new DomainError('TIDAK_DITEMUKAN', 'Aset tidak ditemukan.');
		assertTransition(ASSET_TRANSITIONS, asset.status, 'on_loan', 'Aset'); // 4. state machine

		const loanNumber = await nextNumber(tx, 'LN'); // 5. nomor dokumen
		const [loan] = await tx
			.insert(loans)
			.values({
				// 6. idempotency via unique key
				loanNumber,
				assetId,
				borrowerId: input.borrowerId,
				expectedReturnDate: input.expectedReturnDate,
				conditionBefore: asset.condition,
				submissionId: input.submissionId
			})
			.onConflictDoNothing({ target: loans.submissionId })
			.returning();
		if (!loan) return; // kiriman ganda

		await tx.update(assets).set({ status: 'on_loan' }).where(eq(assets.id, assetId));
		audit({
			module: 'loan',
			action: 'borrow',
			recordId: String(loan.id),
			previousValue: { status: asset.status },
			newValue: { status: 'on_loan', loanNumber }
		});
	});
}
```

Urutan ini disengaja: izin → transaksi → kunci → validasi transisi → tulis → audit.

---

## 13. Yang sengaja tidak dipakai

| Pattern                                             | Alasan                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Microservices, message broker, event sourcing penuh | Terlalu berat untuk satu developer dan 100 pengguna/hari. Ledger stok sudah memberi manfaat utama event sourcing. |
| Repository dengan interface + implementasi ganda    | Hanya satu database. Modul query sudah cukup dan mudah dites.                                                     |
| Dependency injection container                      | Fungsi biasa dan impor modul cukup.                                                                               |
| Pattern GoF (Factory, Observer, Visitor, dst.)      | Tidak ada masalah di PRD yang membutuhkannya.                                                                     |
| CQRS terpisah                                       | Query laporan langsung ke tabel yang sama sudah cepat pada skala ini.                                             |

Tinjau ulang jika pengguna atau modul bertambah banyak.

---

## 14. Daftar periksa code review

- [ ] Route tidak berisi query atau aturan bisnis
- [ ] Setiap operasi tulis lewat `withAudit`
- [ ] Setiap perubahan status lewat `assertTransition`
- [ ] Baris aset/stok dikunci (`for('update')` atau update bersyarat) sebelum diubah
- [ ] Service memanggil `assertCan` dan query memakai `scope` outlet
- [ ] Data ke browser lewat DTO, tanpa kolom internal
- [ ] Form transaksi membawa `submission_id`
- [ ] Nomor dokumen dibuat di transaksi yang sama
- [ ] Tidak ada `DELETE` pada data transaksional; stok tidak diubah tanpa ledger
- [ ] Invariant check stok lulus
- [ ] Tes: dua permintaan paralel tidak menghasilkan stok negatif atau dua pinjaman untuk satu aset
