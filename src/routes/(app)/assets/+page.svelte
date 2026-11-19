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
			name: 'status',
			label: 'Status',
			value: data.status,
			options: [
				{ value: '', label: 'Semua status' },
				...data.statuses.map((status) => ({ value: status.value, label: status.label }))
			]
		}
	]);

	const hasFilter = $derived(Boolean(data.search || data.category || data.location || data.status));
</script>

<svelte:head>
	<title>Aset — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet statusCell(row: Row)}
	<StatusBadge label={row.statusLabel} tone={row.statusTone} />
{/snippet}

{#snippet detailLink(row: Row)}
	<a
		class="row-action"
		href={resolve('/(app)/assets/[id]', { id: String(row.id) })}
		aria-label="Detail aset {row.assetCode}"
	>
		Detail
	</a>
{/snippet}

<main class="container page">
	<PageHeader title="Aset" description="Daftar aset IT sesuai cakupan akses Anda.">
		{#snippet actions()}
			{#if data.canCreate}
				<a class="button-link" href={resolve('/(app)/assets/new')}>Tambah aset</a>
			{/if}
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari kode, nama, atau serial number…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/assets')} />
			{:else}
				<EmptyState
					title="Belum ada aset"
					description="Daftarkan aset pertama untuk mulai mencatat inventaris IT."
				>
					{#snippet action()}
						{#if data.canCreate}
							<a class="button-link" href={resolve('/(app)/assets/new')}>Tambah aset</a>
						{/if}
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'assetCode', label: 'Kode', class: 'font-mono' },
				{ key: 'name', label: 'Nama', mobilePrimary: true },
				{ key: 'categoryName', label: 'Kategori', mobile: true },
				{ key: 'locationName', label: 'Lokasi', mobile: true },
				{ key: 'status', label: 'Status', mobile: true, render: statusCell },
				{ key: 'conditionName', label: 'Kondisi', mobile: true }
			]}

			<h2 class="visually-hidden">Daftar aset</h2>

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
