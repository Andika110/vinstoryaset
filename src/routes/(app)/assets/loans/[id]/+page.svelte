<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Card,
		ConfirmDialog,
		Input,
		PageHeader,
		Select,
		StatusBadge,
		Textarea
	} from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type ActionData = {
		error?: string;
		fieldErrors?: Record<string, string>;
	};

	const actionData = $derived(form as ActionData | null);
	const loan = $derived(data.loan);
	const assetHref = $derived(resolve('/(app)/assets/[id]', { id: String(loan.assetId) }));

	let cancelOpen = $state(false);
	let cancelForm = $state<HTMLFormElement | null>(null);
</script>

<svelte:head>
	<title>{loan.loanNumber} — Peminjaman</title>
</svelte:head>

<main class="container page">
	<PageHeader title={loan.loanNumber} description="{loan.assetCode} · {loan.borrowerName}">
		{#snippet actions()}
			<StatusBadge label={loan.statusLabel} tone={loan.statusTone} />
			<a class="button-link" href={assetHref}>Lihat aset</a>
			<a class="back-link" href={resolve('/(app)/assets/loans')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="notice">
			<Alert tone="danger" title="Gagal memproses">{actionData.error}</Alert>
		</div>
	{/if}

	{#if loan.overdueLabel}
		<div class="notice">
			<Alert tone="danger" title={loan.overdueLabel}>
				Peminjaman melewati rencana kembali {loan.expectedReturnDateLabel}. Segera catat
				pengembalian atau tindak lanjuti peminjam.
			</Alert>
		</div>
	{/if}

	<div class="detail-grid">
		<Card title="Informasi peminjaman" headingLevel={2}>
			<dl class="info-list">
				<div>
					<dt>Nomor</dt>
					<dd class="font-mono">{loan.loanNumber}</dd>
				</div>
				<div>
					<dt>Status</dt>
					<dd><StatusBadge label={loan.statusLabel} tone={loan.statusTone} /></dd>
				</div>
				<div>
					<dt>Aset</dt>
					<dd><a href={assetHref}>{loan.assetCode} · {loan.assetName}</a></dd>
				</div>
				<div>
					<dt>Status aset</dt>
					<dd>{loan.assetStatusLabel}</dd>
				</div>
				<div>
					<dt>Lokasi</dt>
					<dd>{loan.outletName} · {loan.locationName}</dd>
				</div>
				<div>
					<dt>Tanggal pinjam</dt>
					<dd>{loan.borrowingDateLabel}</dd>
				</div>
				<div>
					<dt>Rencana kembali</dt>
					<dd>{loan.expectedReturnDateLabel}</dd>
				</div>
				<div>
					<dt>Aktual kembali</dt>
					<dd>{loan.actualReturnDateLabel ?? '—'}</dd>
				</div>
				<div>
					<dt>Kondisi awal</dt>
					<dd>{loan.conditionBeforeName}</dd>
				</div>
				<div>
					<dt>Kondisi setelah</dt>
					<dd>{loan.conditionAfterName ?? '—'}</dd>
				</div>
				<div>
					<dt>Dicatat oleh</dt>
					<dd>{loan.processedByName}</dd>
				</div>
				<div>
					<dt>Dibuat</dt>
					<dd>{loan.createdAtLabel}</dd>
				</div>
				<div class="full">
					<dt>Catatan</dt>
					<dd>{loan.notes ?? '—'}</dd>
				</div>
			</dl>
		</Card>

		<Card title="Informasi peminjam" headingLevel={2}>
			<dl class="info-list">
				<div>
					<dt>Nama peminjam</dt>
					<dd>{loan.borrowerName}</dd>
				</div>
				<div>
					<dt>Employee</dt>
					<dd>{loan.borrowerEmployeeName ?? 'Tidak terhubung employee'}</dd>
				</div>
				<div>
					<dt>Kode employee</dt>
					<dd class="font-mono">{loan.borrowerEmployeeCode ?? '—'}</dd>
				</div>
			</dl>
			{#if !loan.canReturn && loan.status === 'borrowed'}
				<p class="text-muted read-note">
					Anda hanya dapat melihat peminjaman ini. Pengembalian dilakukan oleh IT Administrator atau
					IT Support.
				</p>
			{/if}
		</Card>
	</div>

	{#if loan.canReturn}
		<div class="action-grid">
			<Card title="Catat pengembalian" headingLevel={2}>
				<form method="POST" action="?/kembalikan" class="return-form">
					<Input
						label="Tanggal kembali"
						name="actualReturnDate"
						type="date"
						required
						value={loan.returnDefaults.actualReturnDate}
						error={actionData?.fieldErrors?.actualReturnDate}
					/>
					<Select
						label="Kondisi setelah kembali"
						name="conditionAfterId"
						required
						value=""
						placeholder="Pilih kondisi"
						options={loan.returnOptions.map((condition) => ({
							value: String(condition.id),
							label: condition.label
						}))}
						hint="Kondisi Rusak membuat status aset menjadi Damaged; kondisi lain menjadi Available."
						error={actionData?.fieldErrors?.conditionAfterId}
					/>
					<div class="full">
						<Textarea label="Catatan pengembalian" name="notes" value="" />
					</div>
					<div class="full">
						<Button type="submit">Simpan pengembalian</Button>
					</div>
				</form>
			</Card>

			{#if loan.canCancel}
				<Card title="Batalkan peminjaman" headingLevel={2}>
					<p class="text-muted">
						Batalkan peminjaman jika aset tidak jadi dipinjam. Aset akan kembali berstatus Available
						dan peminjaman ditandai Dibatalkan.
					</p>
					<div>
						<Button variant="danger" onclick={() => (cancelOpen = true)}>
							Batalkan peminjaman
						</Button>
					</div>
				</Card>
			{/if}
		</div>
	{:else if loan.status !== 'borrowed'}
		<p class="readonly-note">
			Peminjaman berstatus {loan.statusLabel.toLowerCase()} dan bersifat read-only. Riwayat tetap tersimpan.
		</p>
	{/if}
</main>

<form bind:this={cancelForm} method="POST" action="?/batalkan" class="visually-hidden">
	<input type="hidden" name="confirm" value="1" />
</form>

<ConfirmDialog
	bind:open={cancelOpen}
	title="Batalkan peminjaman?"
	description="Aset akan kembali berstatus Available. Tindakan ini tidak menghapus riwayat."
	confirmLabel="Batalkan peminjaman"
	tone="danger"
	onconfirm={() => cancelForm?.requestSubmit()}
/>

<style>
	.notice {
		margin-bottom: var(--space-4);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.button-link:hover {
		background: var(--primary-hover);
		color: var(--primary-contrast);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.info-list {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-2);
		margin: 0;
	}

	.info-list div {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.info-list dt {
		color: var(--text-2);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-medium);
	}

	.info-list dd {
		margin: 0;
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}

	.action-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		margin-top: var(--space-4);
	}

	.return-form {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.full {
		grid-column: 1 / -1;
	}

	.read-note {
		margin: var(--space-3) 0 0;
		font-size: var(--font-size-sm);
	}

	.readonly-note {
		margin: var(--space-5) 0 0;
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	@media (min-width: 768px) {
		.action-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 900px) {
		.detail-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.info-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.info-list .full {
			grid-column: 1 / -1;
		}
	}
</style>
