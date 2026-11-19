<script lang="ts">
	import {
		Alert,
		Button,
		Card,
		ConfirmDialog,
		FileUpload,
		ImageUpload,
		PageHeader,
		Toast
	} from '#lib/components/index.js';

	type ToastTone = 'success' | 'warning' | 'danger' | 'info';

	let dialogOpen = $state(false);
	let dialogLoading = $state(false);
	let toastOpen = $state(false);
	let toastTone = $state<ToastTone>('success');
	let toastTitle = $state('Berhasil');
	let toastMessage = $state('Perubahan berhasil disimpan.');
	let imageBusy = $state(false);
	let imageInfo = $state('');
	let fileInfo = $state('');

	function showToast(tone: ToastTone, title: string, message: string) {
		toastTone = tone;
		toastTitle = title;
		toastMessage = message;
		toastOpen = true;
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function handleImage(file: File | null) {
		imageInfo = file
			? `${file.name} · ${formatSize(file.size)} · ${file.type || 'tipe tidak diketahui'}`
			: 'Foto dihapus.';
	}

	function handleFile(file: File | null) {
		fileInfo = file ? `${file.name} · ${formatSize(file.size)}` : 'File dihapus.';
	}

	function confirmAction() {
		dialogLoading = true;
		showToast('info', 'Memproses', 'Dialog tidak dapat ditutup sampai proses selesai.');
	}

	function finishSimulation() {
		dialogLoading = false;
		dialogOpen = false;
		showToast('success', 'Selesai', 'Aksi berhasil diproses.');
	}
</script>

<svelte:head>
	<title>Form & Upload — Aset &amp; Inventory IT</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="container page stack">
	<PageHeader
		title="Form, dialog & upload"
		description="Verifikasi FND-06: konfirmasi aksi berisiko, toast, upload gambar, dan file import."
	/>

	<Alert tone="info" title="Validasi server">
		Komponen memvalidasi tipe dan ukuran di browser. Validasi yang sama wajib diulang di server
		sebelum file disimpan.
	</Alert>

	<div class="demo-grid">
		<Card title="ConfirmDialog" headingLevel={2}>
			<div class="stack">
				<p class="text-muted">
					Dialog memakai elemen native modal, focus trap, Esc, dan backdrop. Saat loading, semua
					cara menutup dialog diblokir.
				</p>
				<div class="cluster">
					<Button variant="danger" onclick={() => (dialogOpen = true)}>Buka dialog hapus</Button>
					{#if dialogLoading}
						<Button variant="secondary" onclick={finishSimulation}>Selesaikan simulasi</Button>
					{/if}
				</div>
				{#if imageBusy}
					<p class="text-subtle">Gambar sedang diproses; tombol submit sebaiknya dinonaktifkan.</p>
				{/if}
			</div>
		</Card>

		<Card title="Toast" headingLevel={2}>
			<div class="stack">
				<p class="text-muted">Notifikasi singkat dengan auto-dismiss dan tombol tutup.</p>
				<div class="cluster">
					<Button
						variant="secondary"
						size="sm"
						onclick={() => showToast('success', 'Tersimpan', 'Data berhasil disimpan.')}
					>
						Success
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onclick={() => showToast('warning', 'Stok menipis', 'Thermal Paper tersisa 3 roll.')}
					>
						Warning
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onclick={() =>
							showToast('danger', 'Gagal', 'Stok tidak mencukupi untuk transaksi ini.')}
					>
						Error
					</Button>
				</div>
			</div>
		</Card>

		<Card title="ImageUpload" headingLevel={2}>
			<div class="stack">
				<ImageUpload
					name="photo"
					label="Foto aset"
					hint="JPG, PNG, atau WebP. Maksimal 5 MB. Gambar dikompresi ke WebP."
					bind:busy={imageBusy}
					onchange={handleImage}
				/>
				{#if imageInfo}
					<p class="text-subtle">{imageInfo}</p>
				{/if}
			</div>
		</Card>

		<Card title="FileUpload" headingLevel={2}>
			<div class="stack">
				<FileUpload
					name="import_file"
					label="File import Excel/CSV"
					hint="Format .xlsx, .xls, atau .csv. Maksimal 10 MB."
					templatePath="templates/import-template.csv"
					onchange={handleFile}
				/>
				{#if fileInfo}
					<p class="text-subtle">{fileInfo}</p>
				{/if}
			</div>
		</Card>
	</div>
</main>

<ConfirmDialog
	bind:open={dialogOpen}
	title="Hapus aset ini?"
	description="Aset akan ditandai disposed dan tidak dapat digunakan lagi. Tindakan ini tercatat di audit log."
	confirmLabel="Hapus aset"
	tone="danger"
	loading={dialogLoading}
	onconfirm={confirmAction}
	oncancel={() => (dialogLoading = false)}
>
	<p>Pastikan aset tidak sedang dipinjam dan tidak berada dalam proses maintenance.</p>
</ConfirmDialog>

<Toast bind:open={toastOpen} tone={toastTone} title={toastTitle} message={toastMessage} />

<style>
	.demo-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	@media (min-width: 768px) {
		.demo-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
