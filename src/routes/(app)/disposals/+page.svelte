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
			name: 'reason',
			label: 'Alasan',
			value: data.reason,
			options: [
				{ value: '', label: 'Semua alasan' },
				...data.filters.reasons.map((reason) => ({ value: reason.value, label: reason.label }))
			]
		},
		{
			name: 'status',
			label: 'Status',
			value: data.status,
			options: [
				{ value: '', label: 'Semua status' },
				...data.filters.statuses.map((status) => ({ value: status.value, label: status.label }))
			]
		},
		{ name: 'from', label: 'Dari tanggal', value: data.from, options: [], type: 'date' as const },
		{ name: 'to', label: 'Sampai tanggal', value: data.to, options: [], type: 'date' as const }
	]);

	const hasFilter = $derived(
		Boolean(data.search || data.reason || data.status || data.from || data.to)
	);
</script>

<svelte:head>
	<title>Disposal Aset — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet statusCell(row: Row)}
	<StatusBadge label={row.statusLabel} tone={row.statusTone} size="sm" />
{/snippet}

{#snippet detailLink(row: Row)}
	<a
		class="row-action"
		href={resolve('/(app)/disposals/[id]', { id: String(row.id) })}
		aria-label="Detail disposal {row.disposalNumber}"
	>
		Detail
	</a>
{/snippet}

<main class="container page">
	<PageHeader
		title="Disposal Aset"
		description="Riwayat aset yang dihentikan secara final. Data aset dan riwayatnya tetap tersimpan."
	>
		{#snippet actions()}
			<a class="button-link" href={resolve('/(app)/disposals/new')}>Buat disposal</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari nomor disposal, kode aset, atau nama aset…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/disposals')} />
			{:else}
				<EmptyState
					title="Belum ada disposal"
					description="Catat disposal ketika aset sudah tidak digunakan atau tidak ekonomis diperbaiki."
				>
					{#snippet action()}
						<a class="button-link" href={resolve('/(app)/disposals/new')}>Buat disposal</a>
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'disposalNumber', label: 'Nomor', class: 'font-mono' },
				{ key: 'assetCode', label: 'Aset', mobilePrimary: true, class: 'font-mono' },
				{ key: 'assetName', label: 'Nama Aset', mobile: true },
				{ key: 'disposalDateLabel', label: 'Tanggal', mobile: true },
				{ key: 'reasonLabel', label: 'Alasan', mobile: true },
				{ key: 'status', label: 'Status', mobile: true, render: statusCell },
				{ key: 'recordedByName', label: 'Dicatat oleh', mobile: true }
			]}

			<h2 class="visually-hidden">Daftar disposal</h2>

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
