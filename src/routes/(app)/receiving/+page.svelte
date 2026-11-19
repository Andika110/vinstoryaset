<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		DataTable,
		EmptyState,
		MobileDataCard,
		NoResultState,
		PageHeader,
		Pagination,
		SearchFilter,
		StatusBadge
	} from '#lib/components/index.js';
	import type { PageData, PageProps } from './$types';

	let { data }: PageProps = $props();

	type Row = PageData['items'][number];

	const filters = $derived([
		{
			name: 'type',
			label: 'Jenis',
			value: data.type,
			options: [
				{ value: '', label: 'Semua jenis' },
				{ value: 'purchase', label: 'Purchase' },
				{ value: 'opening_balance', label: 'Saldo Awal' },
				{ value: 'transfer_in', label: 'Transfer Masuk' },
				{ value: 'other', label: 'Lainnya' }
			]
		},
		{ name: 'from', label: 'Dari tanggal', value: data.from, options: [], type: 'date' as const },
		{ name: 'to', label: 'Sampai tanggal', value: data.to, options: [], type: 'date' as const }
	]);

	const hasFilter = $derived(Boolean(data.search || data.type || data.from || data.to));
</script>

<svelte:head>
	<title>Penerimaan — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet typeCell(row: Row)}
	<StatusBadge label={row.typeLabel} tone={row.typeTone} />
{/snippet}

{#snippet quantityCell(row: Row)}
	<span class="qty">{row.totalQuantity.toLocaleString('id-ID')}</span>
	<span class="muted">({row.lineCount} baris)</span>
{/snippet}

<main class="container page">
	<PageHeader
		title="Penerimaan"
		description="Riwayat penerimaan aset dan inventory yang masuk ke gudang atau outlet."
	>
		{#snippet actions()}
			<a class="button-link" href={resolve('/(app)/receiving/new')}>Tambah penerimaan</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari nomor receipt, supplier, atau referensi…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/receiving')} />
			{:else}
				<EmptyState
					title="Belum ada penerimaan"
					description="Catat penerimaan aset atau inventory pertama untuk menambah stok dan aset baru."
				>
					{#snippet action()}
						<a class="button-link" href={resolve('/(app)/receiving/new')}>Tambah penerimaan</a>
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'receiptNumber', label: 'Receipt', class: 'font-mono' },
				{ key: 'receiptDateLabel', label: 'Tanggal', mobile: true },
				{ key: 'typeLabel', label: 'Jenis', mobile: true, render: typeCell },
				{ key: 'supplierName', label: 'Supplier', mobile: true },
				{ key: 'locationName', label: 'Lokasi', mobile: true },
				{ key: 'totalQuantity', label: 'Jumlah', mobile: true, render: quantityCell }
			]}

			<h2 class="visually-hidden">Daftar penerimaan</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/receiving/[id]', { id: String(row.id) })}
						aria-label="Detail penerimaan {row.receiptNumber}"
					>
						Detail
					</a>
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/receiving/[id]', { id: String(row.id) })}
						aria-label="Detail penerimaan {row.receiptNumber}"
					>
						Detail
					</a>
				{/snippet}
			</MobileDataCard>

			<Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
		{/if}
	</div>
</main>

<style>
	.list-area {
		margin-top: var(--space-5);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.button-link:hover {
		background: var(--primary-hover);
		color: var(--primary-contrast);
	}

	.qty {
		font-weight: var(--weight-semibold);
		font-variant-numeric: tabular-nums;
	}

	.muted {
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.row-action {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-2);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}
</style>
