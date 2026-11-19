<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import { Alert, Card, EmptyState, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const batch = $derived(data.batch);
	const failedRows = $derived(data.failedRows);
	const uploadHref = $derived(resolveHref(`/admin/import/${data.type.key}`));
	const errorHref = $derived(resolveHref(`/admin/import/batch/${batch.id}/errors?format=csv`));
</script>

<svelte:head>
	<title>Hasil import {batch.batchNumber} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader title="Hasil import" description="{batch.typeLabel} · {batch.batchNumber}">
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/admin/import')}>Kembali ke Import Data</a>
		{/snippet}
	</PageHeader>

	<Card>
		<div class="head">
			<div>
				<span class="label">Status batch</span>
				<StatusBadge label={batch.statusLabel} tone={batch.statusTone} />
			</div>
			<div>
				<span class="label">Waktu</span>
				<strong>{batch.createdAtLabel}</strong>
			</div>
			<div>
				<span class="label">Diimpor oleh</span>
				<strong>{batch.createdByName}</strong>
			</div>
		</div>

		<div class="summary">
			<div>
				<span class="label">Total baris</span>
				<strong class="value">{batch.totalRows}</strong>
			</div>
			<div>
				<span class="label">Berhasil</span>
				<strong class="value success">{batch.successCount}</strong>
			</div>
			<div>
				<span class="label">Gagal</span>
				<strong class="value danger">{batch.failedCount}</strong>
			</div>
		</div>

		{#if batch.failedCount > 0}
			<div class="alert-block">
				<Alert tone="warning" title="Sebagian baris tidak diimpor">
					Perbaiki baris gagal menggunakan file error, lalu unggah ulang. Baris yang sudah berhasil
					tidak perlu disertakan kembali karena akan terdeteksi sebagai duplikat.
				</Alert>
			</div>
		{:else}
			<div class="alert-block">
				<Alert tone="success" title="Import selesai">Seluruh baris berhasil disimpan.</Alert>
			</div>
		{/if}

		<div class="actions">
			{#if batch.failedCount > 0}
				<a class="button-link" href={errorHref}>Download file error (.csv)</a>
			{/if}
			<a class="button-link secondary" href={uploadHref}>Import {data.type.label} lagi</a>
			<a class="button-link secondary" href={resolve('/(app)/admin/audit')}>Lihat audit log</a>
		</div>
	</Card>

	<section class="failed" aria-labelledby="failed-heading">
		<h2 id="failed-heading">Baris gagal</h2>

		{#if failedRows.length === 0}
			<EmptyState
				title="Tidak ada baris gagal"
				description="Semua baris pada batch ini berhasil diimpor."
			/>
		{:else}
			<div class="table-scroll">
				<table class="failed-table">
					<thead>
						<tr>
							<th scope="col">Baris</th>
							{#each data.columns as column (column.key)}
								<th scope="col">{column.label}</th>
							{/each}
							<th scope="col">Alasan gagal</th>
						</tr>
					</thead>
					<tbody>
						{#each failedRows as row (row.rowNumber)}
							<tr>
								<td class="numeric">{row.rowNumber}</td>
								{#each data.columns as column (column.key)}
									<td>{row.values[column.key] || '—'}</td>
								{/each}
								<td class="reason">{row.message ?? 'Tidak diketahui'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</main>

<style>
	.head {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.label {
		display: block;
		margin-bottom: 2px;
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-3);
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.value {
		display: block;
		font-size: var(--font-size-xl);
	}

	.value.success {
		color: var(--success-text);
	}

	.value.danger {
		color: var(--danger-text);
	}

	.alert-block {
		margin-top: var(--space-4);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border: 1px solid var(--primary);
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
	}

	.button-link.secondary {
		background: var(--surface);
		color: var(--primary);
	}

	.failed {
		margin-top: var(--space-6);
	}

	.failed h2 {
		margin: 0 0 var(--space-3);
		font-size: var(--font-size-lg);
	}

	.table-scroll {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.failed-table {
		width: 100%;
		min-width: 900px;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	.failed-table th,
	.failed-table td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
		white-space: nowrap;
	}

	.failed-table th {
		background: var(--surface-2);
		font-weight: var(--weight-semibold);
	}

	.failed-table tbody tr:last-child td {
		border-bottom: 0;
	}

	.failed-table .numeric {
		text-align: right;
	}

	.failed-table .reason {
		min-width: 240px;
		max-width: 380px;
		color: var(--danger-text);
		white-space: normal;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 900px) {
		.head {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
