<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Card,
		DataTable,
		EmptyState,
		PageHeader,
		Pagination,
		StatusBadge
	} from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Import Data — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Import Data"
		description="Tambahkan data awal dari file Excel atau CSV. Data hanya disimpan setelah dikonfirmasi."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/admin/audit')}>Lihat audit log</a>
		{/snippet}
	</PageHeader>

	<section aria-labelledby="import-type-heading">
		<h2 id="import-type-heading" class="section-title">Pilih jenis data</h2>
		<ul class="type-grid">
			{#each data.types as type (type.key)}
				<li>
					<Card>
						<h3 class="type-title">{type.label}</h3>
						<p class="type-description">{type.description}</p>
						<p class="type-meta">
							{type.columns.filter((column) => column.required).length} kolom wajib ·
							{type.columns.length} kolom total
						</p>
						<a class="type-link" href={resolve('/(app)/admin/import/[type]', { type: type.key })}>
							Upload {type.label}
						</a>
					</Card>
				</li>
			{/each}
		</ul>
	</section>

	<section class="history" aria-labelledby="history-heading">
		<h2 id="history-heading" class="section-title">Riwayat impor</h2>

		{#if data.history.total === 0}
			<EmptyState
				title="Belum ada impor"
				description="Riwayat batch akan muncul setelah Anda mengonfirmasi impor pertama."
			/>
		{:else}
			{@const columns = [
				{ key: 'createdAtLabel', label: 'Tanggal', mobile: true },
				{ key: 'batchNumber', label: 'Batch', class: 'font-mono' },
				{ key: 'typeLabel', label: 'Jenis', mobile: true },
				{ key: 'successCount', label: 'Sukses', align: 'right' as const },
				{ key: 'failedCount', label: 'Gagal', align: 'right' as const }
			]}

			<DataTable {columns} rows={data.history.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<div class="row-actions">
						<StatusBadge label={row.statusLabel} tone={row.statusTone} size="sm" />
						<a
							class="row-link"
							href={resolve('/(app)/admin/import/batch/[id]', { id: String(row.id) })}
						>
							Detail
						</a>
					</div>
				{/snippet}
			</DataTable>

			<ul class="history-cards">
				{#each data.history.items as row (row.id)}
					<li>
						<Card>
							<div class="history-head">
								<strong>{row.typeLabel}</strong>
								<StatusBadge label={row.statusLabel} tone={row.statusTone} size="sm" />
							</div>
							<p class="history-meta font-mono">{row.batchNumber}</p>
							<p class="history-meta">
								{row.createdAtLabel} · {row.createdByName}
							</p>
							<p class="history-meta">
								{row.successCount} sukses / {row.failedCount} gagal dari {row.totalRows} baris
							</p>
							<a
								class="row-link"
								href={resolve('/(app)/admin/import/batch/[id]', { id: String(row.id) })}
							>
								Lihat hasil
							</a>
						</Card>
					</li>
				{/each}
			</ul>

			<Pagination
				page={data.history.page}
				pageSize={data.history.pageSize}
				total={data.history.total}
			/>
		{/if}
	</section>
</main>

<style>
	.section-title {
		margin: 0 0 var(--space-3);
		font-size: var(--font-size-lg);
	}

	.type-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.type-title {
		margin: 0;
		font-size: var(--font-size-base);
	}

	.type-description {
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.type-meta {
		margin: 0;
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.type-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
	}

	.history {
		margin-top: var(--space-6);
	}

	.history-cards {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.history-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.history-meta {
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.row-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.row-link,
	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 768px) {
		.type-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.history-cards {
			display: none;
		}
	}

	@media (min-width: 1100px) {
		.type-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
