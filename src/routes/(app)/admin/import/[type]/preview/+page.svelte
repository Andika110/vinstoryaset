<script lang="ts">
	import { resolve as resolveHref } from '#lib/href.js';
	import { Alert, Button, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);

	const preview = $derived(data.preview);
	const hasInvalid = $derived(preview.invalidCount > 0);
	const canConfirm = $derived(preview.validCount > 0);
	const uploadHref = $derived(resolveHref(`/admin/import/${preview.type.key}`));
</script>

<svelte:head>
	<title>Pratinjau import {preview.type.label} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Pratinjau import {preview.type.label}"
		description="Periksa hasil validasi sebelum menyimpan. Belum ada data yang ditulis ke database."
	>
		{#snippet actions()}
			<a class="back-link" href={uploadHref}>Upload ulang</a>
		{/snippet}
	</PageHeader>

	{#if form?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Konfirmasi gagal">{form.error}</Alert>
		</div>
	{/if}

	<Card>
		<div class="summary">
			<div>
				<span class="summary-label">File</span>
				<strong class="summary-value file-name">{preview.fileName}</strong>
			</div>
			<div>
				<span class="summary-label">Total baris</span>
				<strong class="summary-value">{preview.total}</strong>
			</div>
			<div>
				<span class="summary-label">Valid</span>
				<strong class="summary-value valid">{preview.validCount}</strong>
			</div>
			<div>
				<span class="summary-label">Invalid</span>
				<strong class="summary-value invalid">{preview.invalidCount}</strong>
			</div>
		</div>

		<p class="notice">
			Data hanya disimpan setelah tombol <strong>Konfirmasi import</strong> ditekan. Hanya baris valid
			yang akan disimpan; baris invalid dilewati dan dapat diperbaiki dari file.
		</p>

		{#if hasInvalid}
			<div class="notice-alert">
				<Alert tone="warning" title="{preview.invalidCount} baris perlu diperbaiki">
					Baris yang bermasalah tetap ditampilkan di bawah. Anda dapat melanjutkan impor baris valid
					atau memperbaiki file lalu mengunggahnya kembali.
				</Alert>
			</div>
		{/if}

		{#if preview.autoCreated && (preview.autoCreated.inventoryCategories.length || preview.autoCreated.units.length || preview.autoCreated.brands.length || preview.autoCreated.assetCategories.length || preview.autoCreated.conditions.length)}
			<div class="notice-alert">
				<Alert tone="info" title="Master data dibuat otomatis">
					{#if preview.autoCreated.inventoryCategories.length}
						Kategori inventory: {preview.autoCreated.inventoryCategories.join(', ')}.
					{/if}
					{#if preview.autoCreated.units.length}
						Satuan: {preview.autoCreated.units.join(', ')}.
					{/if}
					{#if preview.autoCreated.brands.length}
						Brand: {preview.autoCreated.brands.join(', ')}.
					{/if}
					{#if preview.autoCreated.assetCategories.length}
						Kategori aset: {preview.autoCreated.assetCategories.join(', ')}.
					{/if}
					{#if preview.autoCreated.conditions.length}
						Kondisi: {preview.autoCreated.conditions.join(', ')}.
					{/if}
					{#if preview.autoCreated.models.length}
						Model: {preview.autoCreated.models.join(', ')}.
					{/if}
				</Alert>
			</div>
		{/if}

		<form method="POST" class="confirm-form" onsubmit={() => (submitting = true)}>
			<Button type="submit" disabled={!canConfirm} loading={submitting}>
				Konfirmasi import ({preview.validCount} baris)
			</Button>
			{#if !canConfirm}
				<p class="hint">Tidak ada baris valid untuk diimpor.</p>
			{/if}
		</form>
	</Card>

	<section class="rows" aria-labelledby="rows-heading">
		<h2 id="rows-heading">Detail baris</h2>
		<div class="table-scroll">
			<table class="preview-table">
				<thead>
					<tr>
						<th scope="col">Baris</th>
						<th scope="col">Status</th>
						{#each preview.type.columns as column (column.key)}
							<th scope="col">{column.label}</th>
						{/each}
						<th scope="col">Masalah</th>
					</tr>
				</thead>
				<tbody>
					{#each preview.rows as row (row.rowNumber)}
						<tr class:invalid-row={row.errors.length > 0}>
							<td class="numeric">{row.rowNumber}</td>
							<td>
								{#if row.errors.length === 0}
									<StatusBadge label="Valid" tone="success" size="sm" />
								{:else}
									<StatusBadge label="Invalid" tone="danger" size="sm" />
								{/if}
							</td>
							{#each preview.type.columns as column (column.key)}
								<td>{row.values[column.key] || '—'}</td>
							{/each}
							<td class="error-cell">
								{row.errors.length > 0 ? row.errors.join('; ') : '—'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</main>

<style>
	.form-alert {
		margin-bottom: var(--space-4);
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}

	.summary-label {
		display: block;
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.summary-value {
		display: block;
		font-size: var(--font-size-lg);
		overflow-wrap: anywhere;
	}

	.summary-value.file-name {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.summary-value.valid {
		color: var(--success-text);
	}

	.summary-value.invalid {
		color: var(--danger-text);
	}

	.notice {
		margin: var(--space-4) 0 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.notice-alert {
		margin-top: var(--space-3);
	}

	.confirm-form {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.hint {
		margin: 0;
		color: var(--text-3);
		font-size: var(--font-size-sm);
	}

	.rows {
		margin-top: var(--space-6);
	}

	.rows h2 {
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

	.preview-table {
		width: 100%;
		min-width: 900px;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	.preview-table th,
	.preview-table td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
		white-space: nowrap;
	}

	.preview-table th {
		position: sticky;
		top: 0;
		background: var(--surface-2);
		font-weight: var(--weight-semibold);
	}

	.preview-table tbody tr:last-child td {
		border-bottom: 0;
	}

	.preview-table .invalid-row {
		background: var(--danger-bg);
	}

	.preview-table .error-cell {
		min-width: 220px;
		max-width: 360px;
		color: var(--danger-text);
		white-space: normal;
	}

	.preview-table .numeric {
		text-align: right;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 900px) {
		.summary {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
