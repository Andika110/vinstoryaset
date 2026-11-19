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
			name: 'category',
			label: 'Kategori',
			value: data.category,
			options: [
				{ value: '', label: 'Semua kategori' },
				...data.filters.categories.map((category) => ({
					value: String(category.id),
					label: category.label
				}))
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
		{
			name: 'stock',
			label: 'Status stok',
			value: data.stock,
			options: [
				{ value: '', label: 'Semua status' },
				{ value: 'available', label: 'Tersedia' },
				{ value: 'low', label: 'Menipis' },
				{ value: 'out', label: 'Habis' }
			]
		}
	]);

	const hasFilter = $derived(Boolean(data.search || data.category || data.location || data.stock));
</script>

<svelte:head>
	<title>Inventory — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet nameCell(row: Row)}
	<span class="name-cell">
		{row.name}
		{#if !row.isActive}
			<span class="inactive">Nonaktif</span>
		{/if}
	</span>
{/snippet}

{#snippet stockCell(row: Row)}
	<span class="stock-cell">{row.stock.toLocaleString('id-ID')} {row.unitName}</span>
{/snippet}

{#snippet statusCell(row: Row)}
	<StatusBadge label={row.statusLabel} tone={row.statusTone} />
{/snippet}

{#snippet detailLink(row: Row)}
	<a
		class="row-action"
		href={resolve('/(app)/inventory/[id]', { id: String(row.id) })}
		aria-label="Detail item {row.itemCode}"
	>
		Detail
	</a>
{/snippet}

<main class="container page">
	<PageHeader
		title="Inventory"
		description="Item inventory dan status stok sesuai cakupan akses Anda."
	>
		{#snippet actions()}
			{#if data.canCreate}
				<a class="button-link" href={resolve('/(app)/inventory/new')}>Tambah item</a>
			{/if}
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari kode atau nama item…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/inventory')} />
			{:else}
				<EmptyState
					title="Belum ada item inventory"
					description="Tambahkan item pertama. Stok awal diisi melalui penerimaan atau saldo awal."
				>
					{#snippet action()}
						{#if data.canCreate}
							<a class="button-link" href={resolve('/(app)/inventory/new')}>Tambah item</a>
						{/if}
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'itemCode', label: 'Kode', class: 'font-mono' },
				{ key: 'name', label: 'Nama', mobilePrimary: true, render: nameCell },
				{ key: 'categoryName', label: 'Kategori', mobile: true },
				{ key: 'brandName', label: 'Brand', mobile: true },
				{ key: 'stock', label: 'Stok', mobile: true, render: stockCell },
				{ key: 'statusLabel', label: 'Status', mobile: true, render: statusCell }
			]}

			<h2 class="visually-hidden">Daftar item inventory</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					{@render detailLink(row)}
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					{@render detailLink(row)}
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

	.name-cell {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}

	.inactive {
		padding: 1px var(--space-2);
		border-radius: var(--radius-full);
		background: var(--surface-2);
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.stock-cell {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
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
