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
				{ value: 'reported', label: 'Dilaporkan' },
				{ value: 'in_progress', label: 'Dikerjakan' },
				{ value: 'waiting_parts', label: 'Menunggu Sparepart' },
				{ value: 'completed', label: 'Selesai' },
				{ value: 'cancelled', label: 'Dibatalkan' }
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
		Boolean(data.search || data.status || data.location || data.from || data.to)
	);
</script>

<svelte:head>
	<title>Maintenance — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet assetCell(row: Row)}
	<a class="asset-link" href={resolve('/(app)/assets/[id]', { id: String(row.assetId) })}>
		{row.assetCode} · {row.assetName}
	</a>
{/snippet}

{#snippet statusCell(row: Row)}
	<StatusBadge label={row.statusLabel} tone={row.statusTone} />
{/snippet}

<main class="container page">
	<PageHeader title="Maintenance" description="Laporan kerusakan dan proses perbaikan aset.">
		{#snippet actions()}
			<a class="button-link" href={resolve('/(app)/maintenance/new')}>Lapor kerusakan</a>
			<a class="back-link" href={resolve('/(app)/assets')}>Kembali ke aset</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari nomor, aset, atau deskripsi masalah…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/maintenance')} />
			{:else}
				<EmptyState
					title="Belum ada maintenance"
					description="Laporan kerusakan aset akan tampil di sini."
				>
					{#snippet action()}
						<a class="button-link" href={resolve('/(app)/maintenance/new')}> Lapor kerusakan </a>
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'maintenanceNumber', label: 'Nomor', class: 'font-mono' },
				{ key: 'assetCode', label: 'Aset', mobilePrimary: true, render: assetCell },
				{ key: 'problemDescription', label: 'Masalah', mobile: true },
				{ key: 'statusLabel', label: 'Status', mobile: true, render: statusCell },
				{ key: 'locationName', label: 'Lokasi', mobile: true },
				{ key: 'reportedAtLabel', label: 'Dilaporkan' }
			]}

			<h2 class="visually-hidden">Daftar maintenance</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/maintenance/[id]', { id: String(row.id) })}
						aria-label="Detail maintenance {row.maintenanceNumber}"
					>
						Detail
					</a>
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/maintenance/[id]', { id: String(row.id) })}
						aria-label="Detail maintenance {row.maintenanceNumber}"
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

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.asset-link {
		font-weight: var(--weight-medium);
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
