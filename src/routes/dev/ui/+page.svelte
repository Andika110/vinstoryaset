<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Card,
		Checkbox,
		ConfirmDialog,
		EmptyState,
		Input,
		LoadingState,
		NoResultState,
		Select,
		StatusBadge,
		Textarea,
		Toast
	} from '#lib/components/index.js';
	import { MESSAGES } from '#lib/messages.js';
	import type { SelectOption } from '#lib/components/types.js';

	let loading = $state(false);
	let name = $state('');
	let role = $state('');
	let notes = $state('');
	let agree = $state(false);
	let nameError = $state('');
	let submitted = $state(false);
	let confirmOpen = $state(false);
	let toastOpen = $state(false);

	const statuses = [
		{ label: 'Available', tone: 'success' as const },
		{ label: 'In Use', tone: 'info' as const },
		{ label: 'On Loan', tone: 'warning' as const },
		{ label: 'Damaged', tone: 'danger' as const },
		{ label: 'Disposed', tone: 'neutral' as const }
	];

	const roles: SelectOption[] = [
		{ value: 'admin', label: 'IT Administrator' },
		{ value: 'support', label: 'IT Support' },
		{ value: 'outlet', label: 'Outlet Management' }
	];

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitted = false;
		nameError = name.trim() ? '' : 'Nama pengguna wajib diisi.';

		if (nameError) return;
		submitted = true;
	}
</script>

<svelte:head>
	<title>UI Kit — Aset &amp; Inventory IT</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="container page stack">
	<header class="stack">
		<p><a href={resolve('/')}>← Kembali</a></p>
		<h1>UI kit</h1>
		<p class="text-muted">
			Verifikasi FND-03 dan FND-15. Semua komponen memakai token peran, state standar, serta
			mendukung keyboard dan screen reader.
		</p>
	</header>

	<section class="stack" aria-labelledby="button-title">
		<h2 id="button-title">Button</h2>
		<Card>
			<div class="stack">
				<div class="cluster">
					<Button>Simpan aset</Button>
					<Button variant="secondary">Batal</Button>
					<Button variant="danger">Hapus</Button>
					<Button variant="ghost">Lihat detail</Button>
				</div>

				<div class="cluster">
					<Button size="sm">Kecil</Button>
					<Button size="md">Sedang</Button>
					<Button size="lg">Besar</Button>
					<Button disabled>Nonaktif</Button>
				</div>

				<div class="cluster">
					<Button {loading}>Simpan aset</Button>
					<Button variant="secondary" onclick={() => (loading = !loading)}>
						{loading ? 'Matikan loading' : 'Tampilkan loading'}
					</Button>
				</div>

				<Button block>Simpan aset (block)</Button>
			</div>
		</Card>
	</section>

	<section class="stack" aria-labelledby="badge-title">
		<h2 id="badge-title">Status badge</h2>
		<Card>
			<div class="stack">
				<div class="cluster">
					<StatusBadge label="Available" tone="success" />
					<StatusBadge label="In Use" tone="info" />
					<StatusBadge label="On Loan" tone="info" />
					<StatusBadge label="Under Maintenance" tone="warning" />
					<StatusBadge label="Damaged" tone="danger" />
					<StatusBadge label="Disposed" tone="neutral" />
				</div>
				<div class="cluster">
					<StatusBadge label="Submitted" tone="info" />
					<StatusBadge label="Processing" tone="warning" />
					<StatusBadge label="Partially Fulfilled" tone="warning" />
					<StatusBadge label="Fulfilled" tone="success" />
					<StatusBadge label="Rejected" tone="danger" />
					<StatusBadge label="Cancelled" tone="neutral" />
				</div>
				<div class="cluster">
					<StatusBadge label="Tanpa dot" tone="neutral" dot={false} />
					<StatusBadge label="Kecil" tone="success" size="sm" />
				</div>
			</div>
		</Card>
	</section>

	<section class="stack" aria-labelledby="alert-title">
		<h2 id="alert-title">Alert</h2>
		<div class="stack">
			<Alert tone="success" title="Aset tersimpan">
				LPT-0042 sekarang berstatus In Use di Union Outlet A.
			</Alert>
			<Alert tone="warning" title="Stok menipis">
				Thermal Paper tersisa 3 roll di Head Office, batas minimum 5.
			</Alert>
			<Alert tone="danger" title="Stok tidak cukup">
				Permintaan 10 patch cord, stok tersedia 6. Kurangi jumlah atau pilih lokasi lain.
			</Alert>
			<Alert tone="info" title="Sesi berakhir">
				Sesi Anda telah berakhir. Silakan login kembali.
			</Alert>
		</div>
	</section>

	<section class="stack" aria-labelledby="form-title">
		<h2 id="form-title">Form</h2>
		<Card
			title="Contoh form"
			description="Validasi tampil tepat di field yang bermasalah."
			headingLevel={3}
		>
			<form class="form-grid" novalidate onsubmit={handleSubmit}>
				<Input
					label="Nama pengguna"
					name="name"
					placeholder="Contoh: Andika"
					hint="Nama yang tampil di aplikasi."
					required
					bind:value={name}
					error={nameError}
				/>
				<Input
					label="Jumlah aset"
					name="quantity"
					type="number"
					value={1}
					min={1}
					max={99}
					hint="Gunakan angka antara 1 dan 99."
				/>
				<Input label="Tanggal pembelian" name="purchase_date" type="date" />
				<Select
					label="Peran"
					name="role"
					placeholder="Pilih peran"
					options={roles}
					required
					bind:value={role}
				/>
				<div class="full">
					<Textarea
						label="Catatan"
						name="notes"
						placeholder="Tambahkan catatan opsional"
						hint="Maksimal 500 karakter."
						bind:value={notes}
					/>
				</div>
				<div class="full">
					<Checkbox
						label="Saya sudah memeriksa data sebelum menyimpan"
						hint="Centang untuk mengonfirmasi."
						bind:checked={agree}
					/>
				</div>
				<div class="full cluster">
					<Button type="submit">Simpan pengguna</Button>
					<Button variant="secondary" type="reset">Reset</Button>
				</div>
				{#if submitted}
					<div class="full">
						<Alert tone="success" title="Berhasil">Data contoh berhasil divalidasi.</Alert>
					</div>
				{/if}
			</form>
		</Card>
	</section>

	<section class="stack" aria-labelledby="card-title">
		<h2 id="card-title">Card</h2>
		<div class="card-grid">
			<Card title="Ringkasan aset" description="Contoh summary card." headingLevel={3}>
				<p class="metric">128</p>
				<p class="text-muted">Aset aktif di seluruh lokasi.</p>
			</Card>
			<Card title="Dengan footer" headingLevel={3}>
				<p class="text-muted">Card dapat memiliki footer untuk aksi.</p>
				{#snippet footer()}
					<Button variant="secondary" size="sm">Lihat semua</Button>
				{/snippet}
			</Card>
		</div>
	</section>
	<section class="stack" aria-labelledby="states-title">
		<h2 id="states-title">Global UI states</h2>
		<p class="text-muted">
			Semua halaman wajib memakai komponen state dari FND-05/FND-06. Status selalu memakai teks,
			bukan hanya warna.
		</p>

		<div class="table-scroll">
			<table>
				<thead>
					<tr><th scope="col">Kondisi</th><th scope="col">Pesan baku</th></tr>
				</thead>
				<tbody>
					<tr><td>Stok kurang</td><td>{MESSAGES.stockInsufficient(3, 5)}</td></tr>
					<tr><td>Kode duplikat</td><td>{MESSAGES.duplicate('Asset Code')}</td></tr>
					<tr>
						<td>Transisi invalid</td><td>
							{MESSAGES.invalidTransition('aset', 'On Loan', 'Disposed')}
						</td>
					</tr>
					<tr><td>Sesi berakhir</td><td>{MESSAGES.sessionExpired}</td></tr>
					<tr><td>Tidak punya akses</td><td>{MESSAGES.noPermission}</td></tr>
					<tr><td>Data tidak ditemukan</td><td>{MESSAGES.notFound}</td></tr>
					<tr><td>Error sistem</td><td>{MESSAGES.systemError}</td></tr>
				</tbody>
			</table>
		</div>

		<div class="state-grid">
			<Card title="Loading" headingLevel={3}><LoadingState rows={2} /></Card>

			<Card title="Empty" headingLevel={3}>
				<EmptyState
					title="Belum ada aset"
					description="Daftarkan aset pertama untuk mulai mencatat inventaris IT."
				/>
			</Card>

			<Card title="No search result" headingLevel={3}>
				<NoResultState pathname="/dev/ui" />
			</Card>

			<Card title="Validation error" headingLevel={3}>
				<Input
					label="Asset Code"
					name="example-code"
					value="AST-001"
					error="Asset Code sudah digunakan."
				/>
				<Button type="submit" disabled>Simpan</Button>
			</Card>

			<Card title="Business error" headingLevel={3}>
				<Alert tone="danger" title="Stok tidak mencukupi">
					{MESSAGES.stockInsufficient(3, 5)}
				</Alert>
			</Card>

			<Card title="System error" headingLevel={3}>
				<Alert tone="danger" title="Terjadi kesalahan sistem">
					{MESSAGES.systemError} Kode referensi: <code>REF-8DE2F82D</code>
				</Alert>
			</Card>

			<Card title="Submitting" headingLevel={3}>
				<div class="cluster">
					<Button type="button" loading>Menyimpan</Button>
					<Button type="button" disabled>Nonaktif selama proses</Button>
				</div>
			</Card>

			<Card title="Success" headingLevel={3}>
				<Alert tone="success" title="Berhasil disimpan">Perubahan sudah tersimpan.</Alert>
			</Card>

			<Card title="Read only" headingLevel={3}>
				<StatusBadge label="Completed" tone="success" />
				<p class="text-muted">Data final tidak memiliki aksi edit atau hapus.</p>
			</Card>

			<Card title="No permission" headingLevel={3}>
				<Alert tone="warning" title="Tidak punya akses">
					{MESSAGES.noPermission} Hubungi IT Administrator jika Anda merasa ini keliru.
				</Alert>
			</Card>

			<Card title="Not found" headingLevel={3}>
				<Alert tone="info" title="Tidak ditemukan">{MESSAGES.notFound}</Alert>
			</Card>

			<Card title="Status badge" headingLevel={3}>
				<div class="badge-row">
					{#each statuses as status (status.label)}
						<StatusBadge label={status.label} tone={status.tone} />
					{/each}
				</div>
				<p class="text-muted">Status selalu memakai teks, bukan hanya warna.</p>
			</Card>

			<Card title="Dialog & toast" headingLevel={3}>
				<div class="badge-row">
					<Button type="button" variant="danger" onclick={() => (confirmOpen = true)}>
						Buka ConfirmDialog
					</Button>
					<Button type="button" variant="secondary" onclick={() => (toastOpen = true)}>
						Tampilkan Toast
					</Button>
				</div>
			</Card>
		</div>
	</section>

	<section class="stack" aria-labelledby="responsive-title">
		<h2 id="responsive-title">Responsive & aksesibilitas</h2>
		<div class="state-grid">
			<Card title="Kolom utama card mobile" headingLevel={3}>
				<ul class="checklist">
					<li>Satu kolom utama: kode atau nama record.</li>
					<li>Maksimal 2–3 metadata pendukung; sisanya di halaman detail.</li>
					<li>Status memakai badge teks + titik, bukan warna saja.</li>
					<li>Aksi utama menjadi tautan dengan tinggi minimal 44px.</li>
				</ul>
			</Card>
			<Card title="Target sentuh 44px" headingLevel={3}>
				<div class="cluster">
					<button type="button" class="demo-touch">Aksi utama</button>
					<a href="#states-title" class="demo-link">Tautan aksi</a>
				</div>
				<p class="text-muted">
					Semua tombol, input, dan tautan aksi minimal 44 × 44 px pada layar 360px.
				</p>
			</Card>
			<Card title="Checklist WCAG 2.1 AA" headingLevel={3}>
				<ul class="checklist">
					<li>Fokus terlihat jelas (`:focus-visible`).</li>
					<li>Navigasi keyboard dan skip link tersedia.</li>
					<li>Label form selalu terhubung ke input.</li>
					<li>Error diberi teks, bukan hanya warna.</li>
					<li>Hormati `prefers-reduced-motion`.</li>
					<li>Kontras teks memenuhi AA dan informasi tidak hanya lewat warna.</li>
				</ul>
			</Card>
		</div>
	</section>
</main>

<Toast bind:open={toastOpen} tone="success" title="Berhasil" message="Contoh notifikasi sukses." />
<ConfirmDialog
	bind:open={confirmOpen}
	title="Contoh konfirmasi"
	description="Dialog menahan fokus, dapat ditutup dengan Esc, dan tidak dapat ditutup saat proses berjalan."
	confirmLabel="Konfirmasi"
	tone="danger"
	onconfirm={() => {
		confirmOpen = false;
	}}
	oncancel={() => {
		confirmOpen = false;
	}}
/>

<style>
	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.card-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.metric {
		margin: 0;
		font-size: var(--font-size-3xl);
		font-weight: var(--weight-semibold);
		line-height: var(--leading-tight);
	}

	.table-scroll {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	table {
		width: 100%;
		min-width: 520px;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	th,
	td {
		padding: var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}

	th {
		background: var(--surface-2);
		font-weight: var(--weight-semibold);
	}

	tbody tr:last-child td {
		border-bottom: 0;
	}

	.state-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.badge-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}

	.checklist {
		display: grid;
		gap: var(--space-2);
		margin: 0;
		padding-left: var(--space-4);
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.demo-touch,
	.demo-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--touch-target);
		min-width: var(--touch-target);
		padding: 0 var(--space-4);
		border: 1px solid var(--primary);
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
	}

	.demo-link {
		background: var(--surface);
		color: var(--primary);
	}

	code {
		font-family: var(--font-mono);
	}

	.full {
		grid-column: 1 / -1;
	}

	@media (min-width: 768px) {
		.form-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.card-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.state-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
