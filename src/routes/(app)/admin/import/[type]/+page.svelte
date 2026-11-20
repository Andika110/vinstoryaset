<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import { Alert, Button, Card, FileUpload, PageHeader } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Import {data.type.label} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader title="Import {data.type.label}" description={data.type.description}>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/admin/import')}>Kembali ke Import Data</a>
		{/snippet}
	</PageHeader>

	<div class="layout">
		<Card title="Upload file" headingLevel={2}>
			{#if form?.error}
				<div class="form-alert">
					<Alert tone="danger" title="File tidak dapat diproses">{form.error}</Alert>
				</div>
			{/if}

			<form
				method="POST"
				enctype="multipart/form-data"
				class="upload-form"
				onsubmit={() => (submitting = true)}
			>
				<FileUpload
					name="file"
					label="File Excel atau CSV"
					hint="Format .xlsx atau .csv, maksimal 5 MB dan 2.000 baris."
					accept=".xlsx,.csv"
					maxSizeMB={5}
					required
				/>
				{#if data.type.key === 'asset' || data.type.key === 'inventory-item'}
					<label class="auto-create">
						<input type="checkbox" name="auto_create" />
						<span>
							Buat otomatis
							{#if data.type.key === 'asset'}
								kategori, kondisi, brand, dan model
							{:else}
								kategori, satuan, dan brand
							{/if}
							yang belum ada di Master Data
						</span>
					</label>
					<p class="auto-create-hint">
						{#if data.type.key === 'asset'}
							Kategori, kondisi, brand, dan model yang belum ada akan dibuat saat pratinjau.
						{:else}
							Kategori, satuan, dan brand yang belum ada akan dibuat saat pratinjau.
						{/if}
						Pembuatan tercatat di audit log.
					</p>
				{/if}
				<div class="actions">
					<Button type="submit" loading={submitting}>Upload &amp; pratinjau</Button>
				</div>
			</form>

			<div class="template">
				<p>Belum punya file? Unduh template terbaru:</p>
				<div class="template-links">
					<a
						class="button-link"
						href={resolveHref(`/admin/import/${data.type.key}/template?format=xlsx`)}
					>
						Template Excel (.xlsx)
					</a>
					<a
						class="button-link secondary"
						href={resolveHref(`/admin/import/${data.type.key}/template?format=csv`)}
					>
						Template CSV
					</a>
				</div>
			</div>
		</Card>

		<Card title="Format kolom" headingLevel={2}>
			<div class="table-scroll">
				<table class="columns-table">
					<thead>
						<tr>
							<th scope="col">Kolom</th>
							<th scope="col">Wajib</th>
							<th scope="col">Catatan</th>
						</tr>
					</thead>
					<tbody>
						{#each data.type.columns as column (column.key)}
							<tr>
								<td>{column.label}</td>
								<td>{column.required ? 'Ya' : 'Opsional'}</td>
								<td>{column.note ?? '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="rules">
				<h3>Aturan validasi</h3>
				<ul>
					{#each data.type.rules as rule (rule)}
						<li>{rule}</li>
					{/each}
					<li>Seluruh baris divalidasi sebelum data disimpan.</li>
					<li>Hanya baris valid yang akan disimpan saat konfirmasi.</li>
				</ul>
			</div>
		</Card>
	</div>
</main>

<style>
	.layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.upload-form {
		display: grid;
		gap: var(--space-3);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}

	.auto-create {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--text-2);
	}

	.auto-create input {
		margin-top: 2px;
	}

	.auto-create-hint {
		margin: -var(--space-2) 0 0 var(--space-6);
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.form-alert {
		margin-bottom: var(--space-3);
	}

	.template {
		display: grid;
		gap: var(--space-2);
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.template p {
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.template-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
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

	.table-scroll {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}

	.columns-table {
		width: 100%;
		min-width: 420px;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	.columns-table th,
	.columns-table td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}

	.columns-table th {
		background: var(--surface-2);
		font-weight: var(--weight-semibold);
		white-space: nowrap;
	}

	.columns-table tbody tr:last-child td {
		border-bottom: 0;
	}

	.rules {
		margin-top: var(--space-4);
		font-size: var(--font-size-sm);
	}

	.rules h3 {
		margin: 0 0 var(--space-2);
		font-size: var(--font-size-base);
	}

	.rules ul {
		display: grid;
		gap: var(--space-1);
		margin: 0;
		padding-left: var(--space-4);
		color: var(--text-2);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 980px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}
	}
</style>
