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
				{ value: 'borrowed', label: 'Dipinjam' },
				{ value: 'overdue', label: 'Terlambat' },
				{ value: 'returned', label: 'Dikembalikan' },
				{ value: 'cancelled', label: 'Dibatalkan' }
			]
		},
		{ name: 'from', label: 'Dari tanggal', value: data.from, options: [], type: 'date' as const },
		{ name: 'to', label: 'Sampai tanggal', value: data.to, options: [], type: 'date' as const }
	]);

	const hasFilter = $derived(Boolean(data.search || data.status || data.from || data.to));
</script>

<svelte:head>
	<title>Peminjaman — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet assetCell(row: Row)}
	<a class="asset-link" href={resolve('/(app)/assets/[id]', { id: String(row.assetId) })}>
		{row.assetCode} · {row.assetName}
	</a>
{/snippet}

{#snippet statusCell(row: Row)}
	<StatusBadge label={row.overdueLabel ?? row.statusLabel} tone={row.statusTone} />
{/snippet}

<main class="container page">
	<PageHeader
		title="Peminjaman"
		description="Riwayat peminjaman aset, status, dan keterlambatan pengembalian."
	>
		{#snippet actions()}
			{#if data.canCreate}
				<a class="button-link" href={resolve('/(app)/assets/loans/new')}>Tambah peminjaman</a>
			{/if}
			<a class="back-link" href={resolve('/(app)/assets')}>Kembali ke aset</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari nomor pinjam, aset, atau peminjam…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/assets/loans')} />
			{:else}
				<EmptyState
					title="Belum ada peminjaman"
					description="Peminjaman aset akan tercatat di sini beserta status pengembaliannya."
				>
					{#snippet action()}
						{#if data.canCreate}
							<a class="button-link" href={resolve('/(app)/assets/loans/new')}>
								Tambah peminjaman
							</a>
						{/if}
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'loanNumber', label: 'Nomor', class: 'font-mono' },
				{ key: 'assetCode', label: 'Aset', mobilePrimary: true, render: assetCell },
				{ key: 'borrowerName', label: 'Peminjam', mobile: true },
				{ key: 'borrowingDateLabel', label: 'Pinjam', mobile: true },
				{ key: 'expectedReturnDateLabel', label: 'Rencana kembali', mobile: true },
				{ key: 'statusLabel', label: 'Status', mobile: true, render: statusCell }
			]}

			<h2 class="visually-hidden">Daftar peminjaman</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/assets/loans/[id]', { id: String(row.id) })}
						aria-label="Detail peminjaman {row.loanNumber}"
					>
						Detail
					</a>
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/assets/loans/[id]', { id: String(row.id) })}
						aria-label="Detail peminjaman {row.loanNumber}"
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
