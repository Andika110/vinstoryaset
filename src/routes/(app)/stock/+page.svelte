<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
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
				{ value: 'stock_in', label: 'Stock In' },
				{ value: 'stock_out', label: 'Stock Out' },
				{ value: 'transfer', label: 'Transfer' },
				{ value: 'adjustment', label: 'Penyesuaian' },
				{ value: 'opening_balance', label: 'Saldo Awal' }
			]
		},
		{
			name: 'location',
			label: 'Lokasi',
			value: data.location,
			options: [
				{ value: '', label: 'Semua lokasi' },
				...data.filters.locations.map((location) => ({
					value: String(location.id),
					label: location.label
				}))
			]
		},
		{ name: 'from', label: 'Dari tanggal', value: data.from, options: [], type: 'date' as const },
		{ name: 'to', label: 'Sampai tanggal', value: data.to, options: [], type: 'date' as const }
	]);

	const hasFilter = $derived(
		Boolean(data.search || data.type || data.location || data.from || data.to)
	);
</script>

<svelte:head>
	<title>Transaksi Stok — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet typeCell(row: Row)}
	<StatusBadge label={row.typeLabel} tone={row.typeTone} />
{/snippet}

<main class="container page">
	<PageHeader
		title="Transaksi Stok"
		description="Riwayat pergerakan stok inventory: masuk, keluar, transfer, dan penyesuaian."
	>
		{#snippet actions()}
			<a class="button-link" href={resolveHref('/stock/new?type=stock_out')}>Stock Out</a>
			<a class="button-link secondary" href={resolveHref('/stock/new?type=transfer')}>Transfer</a>
			<a class="button-link secondary" href={resolveHref('/stock/new?type=adjustment')}>
				Penyesuaian
			</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari nomor dokumen atau item…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/stock')} />
			{:else}
				<EmptyState
					title="Belum ada transaksi stok"
					description="Transaksi stok keluar, transfer, penyesuaian, dan penerimaan akan tampil di sini."
				>
					{#snippet action()}
						<a class="button-link" href={resolveHref('/stock/new?type=stock_out')}>
							Buat Stock Out
						</a>
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'documentNumber', label: 'Dokumen', class: 'font-mono' },
				{ key: 'dateLabel', label: 'Tanggal', mobile: true },
				{ key: 'typeLabel', label: 'Jenis', mobile: true, render: typeCell },
				{ key: 'itemSummary', label: 'Item', mobilePrimary: true },
				{ key: 'locationLabel', label: 'Lokasi', mobile: true },
				{ key: 'performedByName', label: 'Oleh', mobile: true }
			]}

			<h2 class="visually-hidden">Daftar transaksi stok</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/stock/[id]', { id: String(row.id) })}
						aria-label="Detail transaksi {row.documentNumber}"
					>
						Detail
					</a>
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/stock/[id]', { id: String(row.id) })}
						aria-label="Detail transaksi {row.documentNumber}"
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
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.button-link.secondary {
		border: 1px solid var(--border-strong);
		background: var(--surface);
		color: var(--text-1);
	}

	.button-link:hover {
		background: var(--primary-hover);
		color: var(--primary-contrast);
	}

	.button-link.secondary:hover {
		background: var(--surface-2);
		color: var(--text-1);
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
