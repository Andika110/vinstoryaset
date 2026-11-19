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
			name: 'status',
			label: 'Status',
			value: data.status,
			options: [
				{ value: '', label: 'Semua status' },
				...data.filters.statuses.map((status) => ({
					value: status.value,
					label: status.label
				}))
			]
		},
		{
			name: 'type',
			label: 'Jenis',
			value: data.itemType,
			options: [
				{ value: '', label: 'Semua jenis' },
				...data.filters.types.map((type) => ({ value: type.value, label: type.label }))
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
		Boolean(data.search || data.status || data.itemType || data.location || data.from || data.to)
	);
</script>

<svelte:head>
	<title>Stock Opname — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet statusCell(row: Row)}
	<StatusBadge label={row.statusLabel} tone={row.statusTone} size="sm" />
{/snippet}

{#snippet progressCell(row: Row)}
	<span class="font-mono">{row.checkedLines}/{row.totalLines}</span>
{/snippet}

{#snippet detailLink(row: Row)}
	<div class="row-actions">
		<a
			class="row-action"
			href={resolve('/(app)/opname/[id]', { id: String(row.id) })}
			aria-label="Detail opname {row.opnameNumber}"
		>
			Detail
		</a>
		{#if row.status === 'in_progress'}
			<a
				class="row-action"
				href={resolve('/(app)/opname/[id]/count', { id: String(row.id) })}
				aria-label="Hitung opname {row.opnameNumber}"
			>
				Hitung
			</a>
		{/if}
	</div>
{/snippet}

<main class="container page">
	<PageHeader
		title="Stock Opname"
		description="Sesi pengecekan fisik aset dan inventory per lokasi."
	>
		{#snippet actions()}
			{#if data.canManage}
				<a class="button-link" href={resolve('/(app)/opname/new')}>Buat sesi</a>
			{/if}
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari nomor opname atau lokasi…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/opname')} />
			{:else}
				<EmptyState
					title="Belum ada sesi opname"
					description="Buat sesi untuk mulai mencocokkan stok fisik dengan sistem."
				>
					{#snippet action()}
						{#if data.canManage}
							<a class="button-link" href={resolve('/(app)/opname/new')}>Buat sesi</a>
						{/if}
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'opnameNumber', label: 'Nomor', class: 'font-mono' },
				{ key: 'locationName', label: 'Lokasi', mobilePrimary: true },
				{ key: 'outletName', label: 'Outlet', mobile: true },
				{ key: 'itemTypeLabel', label: 'Jenis', mobile: true },
				{ key: 'status', label: 'Status', mobile: true, render: statusCell },
				{ key: 'checkedLines', label: 'Progres', render: progressCell, align: 'right' as const },
				{ key: 'createdAtLabel', label: 'Dibuat', mobile: true }
			]}

			<h2 class="visually-hidden">Daftar sesi opname</h2>

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
		margin-top: var(--space-4);
	}

	.row-actions {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
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
</style>
