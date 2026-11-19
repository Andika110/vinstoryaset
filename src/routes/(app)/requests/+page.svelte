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
				{ value: 'submitted', label: 'Menunggu' },
				{ value: 'processing', label: 'Diproses' },
				{ value: 'partially_fulfilled', label: 'Terpenuhi Sebagian' },
				{ value: 'fulfilled', label: 'Selesai' },
				{ value: 'rejected', label: 'Ditolak' },
				{ value: 'cancelled', label: 'Dibatalkan' }
			]
		},
		...(data.isOutlet
			? []
			: [
					{
						name: 'outlet',
						label: 'Outlet',
						value: data.outlet,
						options: [
							{ value: '', label: 'Semua outlet' },
							...data.filters.outlets.map((outlet) => ({
								value: String(outlet.id),
								label: outlet.label
							}))
						]
					}
				]),
		{ name: 'from', label: 'Dari tanggal', value: data.from, options: [], type: 'date' as const },
		{ name: 'to', label: 'Sampai tanggal', value: data.to, options: [], type: 'date' as const }
	]);

	const hasFilter = $derived(
		Boolean(data.search || data.status || data.outlet || data.from || data.to)
	);
</script>

<svelte:head>
	<title>{data.isOutlet ? 'Request Saya' : 'Request'} — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet statusCell(row: Row)}
	<StatusBadge label={row.statusLabel} tone={row.statusTone} />
{/snippet}

{#snippet qtyCell(row: Row)}
	<span class="qty">{row.totalFulfilled.toLocaleString('id-ID')}</span>
	<span class="muted">/ {row.totalRequested.toLocaleString('id-ID')}</span>
{/snippet}

<main class="container page">
	<PageHeader
		title={data.isOutlet ? 'Request Saya' : 'Request'}
		description={data.isOutlet
			? 'Permintaan item inventory milik outlet Anda.'
			: 'Inbox request item inventory dari seluruh outlet.'}
	>
		{#snippet actions()}
			{#if data.canCreate}
				<a class="button-link" href={resolve('/(app)/requests/new')}>Buat request</a>
			{/if}
			<a class="back-link" href={resolve('/(app)/dashboard')}>Kembali ke dashboard</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari nomor request, outlet, atau alasan…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/requests')} />
			{:else}
				<EmptyState
					title="Belum ada request"
					description={data.isOutlet
						? 'Buat request pertama untuk meminta item inventory.'
						: 'Request dari outlet akan tampil di sini.'}
				>
					{#snippet action()}
						{#if data.canCreate}
							<a class="button-link" href={resolve('/(app)/requests/new')}>Buat request</a>
						{/if}
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'requestNumber', label: 'Nomor', class: 'font-mono' },
				{ key: 'outletName', label: 'Outlet', mobilePrimary: true },
				{ key: 'requestedByName', label: 'Diminta oleh', mobile: true },
				{ key: 'dateLabel', label: 'Tanggal', mobile: true },
				{ key: 'lineCount', label: 'Item', mobile: true },
				{ key: 'totalRequested', label: 'Fulfilled', mobile: true, render: qtyCell },
				{ key: 'statusLabel', label: 'Status', mobile: true, render: statusCell }
			]}

			<h2 class="visually-hidden">Daftar request</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/requests/[id]', { id: String(row.id) })}
						aria-label="Detail request {row.requestNumber}"
					>
						Detail
					</a>
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/requests/[id]', { id: String(row.id) })}
						aria-label="Detail request {row.requestNumber}"
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
