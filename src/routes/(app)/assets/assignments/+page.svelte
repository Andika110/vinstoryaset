<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		DataTable,
		EmptyState,
		MobileDataCard,
		NoResultState,
		PageHeader,
		Pagination,
		SearchFilter
	} from '#lib/components/index.js';
	import type { PageData, PageProps } from './$types';

	let { data }: PageProps = $props();

	type Row = PageData['items'][number];

	const filters = $derived([
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
			name: 'employee',
			label: 'Employee',
			value: data.employee,
			options: [
				{ value: '', label: 'Semua employee' },
				...data.filters.employees.map((employee) => ({
					value: String(employee.id),
					label: employee.label
				}))
			]
		},
		{
			name: 'from',
			label: 'Dari tanggal',
			value: data.from,
			options: [],
			type: 'date' as const
		},
		{
			name: 'to',
			label: 'Sampai tanggal',
			value: data.to,
			options: [],
			type: 'date' as const
		}
	]);

	const hasFilter = $derived(
		Boolean(data.search || data.location || data.employee || data.from || data.to)
	);
</script>

<svelte:head>
	<title>Penempatan — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet assetCell(row: Row)}
	<a class="asset-link" href={resolve('/(app)/assets/[id]', { id: String(row.assetId) })}>
		{row.assetLabel}
	</a>
{/snippet}

<main class="container page">
	<PageHeader
		title="Penempatan"
		description="Riwayat penempatan aset ke karyawan, department, dan lokasi."
	>
		{#snippet actions()}
			{#if data.canCreate}
				<a class="button-link" href={resolve('/(app)/assets/assignments/new')}>
					Tambah penempatan
				</a>
			{/if}
			<a class="back-link" href={resolve('/(app)/assets')}>Kembali ke aset</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari nomor, kode, atau nama aset…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/assets/assignments')} />
			{:else}
				<EmptyState
					title="Belum ada penempatan"
					description="Penempatan aset ke karyawan atau lokasi akan tercatat di sini."
				>
					{#snippet action()}
						{#if data.canCreate}
							<a class="button-link" href={resolve('/(app)/assets/assignments/new')}>
								Tambah penempatan
							</a>
						{/if}
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'movementNumber', label: 'Nomor', class: 'font-mono' },
				{ key: 'dateLabel', label: 'Tanggal', mobile: true },
				{ key: 'assetLabel', label: 'Aset', mobilePrimary: true, render: assetCell },
				{ key: 'fromLabel', label: 'Dari', mobile: true },
				{ key: 'toLabel', label: 'Ke', mobile: true },
				{ key: 'performedByName', label: 'Oleh' }
			]}

			<h2 class="visually-hidden">Daftar penempatan</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/assets/[id]', { id: String(row.assetId) })}
						aria-label="Detail aset {row.assetCode}"
					>
						Aset
					</a>
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/assets/[id]', { id: String(row.assetId) })}
						aria-label="Detail aset {row.assetCode}"
					>
						Aset
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
