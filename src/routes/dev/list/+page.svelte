<script lang="ts">
	import { resolve } from '#lib/href.js';
	import {
		DataTable,
		EmptyState,
		LoadingState,
		MobileDataCard,
		NoResultState,
		PageHeader,
		Pagination,
		SearchFilter
	} from '#lib/components/index.js';
	import type { ListColumn } from '#lib/components/list-types.js';
	import type { PageData, PageProps } from './$types';

	let { data }: PageProps = $props();

	type Row = PageData['items'][number];

	const columns: ListColumn<Row>[] = [
		{ key: 'code', label: 'Asset Code', mobilePrimary: true, class: 'font-mono' },
		{ key: 'name', label: 'Nama', mobile: true },
		{ key: 'location', label: 'Lokasi', mobile: true },
		{ key: 'status', label: 'Status', mobile: true },
		{ key: 'condition', label: 'Kondisi', mobile: true },
		{ key: 'updatedAt', label: 'Diperbarui', align: 'right' }
	];

	const statusFilter = $derived([
		{
			name: 'status',
			label: 'Status',
			value: data.status,
			options: [
				{ value: '', label: 'Semua status' },
				...data.statusOptions.map((status) => ({ value: status, label: status }))
			]
		}
	]);

	const hasFilter = $derived(Boolean(data.search || data.status));
</script>

<svelte:head>
	<title>Demo Daftar — Aset &amp; Inventory IT</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="container page">
	<PageHeader
		title="Demo daftar"
		description="Data contoh dengan pencarian, filter, dan pagination server-side."
	/>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari kode atau nama aset…"
		filters={statusFilter}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.demo === 'loading'}
			<LoadingState rows={4} />
		{:else if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/dev/list')} />
			{:else}
				<EmptyState
					title="Belum ada aset"
					description="Data contoh tidak sedang ditampilkan. Muat kembali data contoh untuk melihat tabel dan card."
				>
					{#snippet action()}
						<a class="state-link" href={resolve('/dev/list')}>Muat data contoh</a>
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			<h2 class="visually-hidden">Daftar aset</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.code}>
				{#snippet actions(row)}
					<a class="row-action" href={resolve('/(app)/assets')} aria-label="Detail {row.code}">
						Detail
					</a>
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.code}>
				{#snippet actions(row)}
					<a class="row-action" href={resolve('/(app)/assets')} aria-label="Detail {row.code}">
						Detail
					</a>
				{/snippet}
			</MobileDataCard>

			<Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
		{/if}
	</div>

	<p class="demo-hint text-subtle">
		Demo state:
		<a href={resolve('/dev/list?demo=empty')}>empty</a> ·
		<a href={resolve('/dev/list?demo=loading')}>loading</a> · ketik pencarian yang tidak ada untuk no-result.
	</p>
</main>

<style>
	.list-area {
		margin-top: var(--space-5);
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

	.state-link {
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

	.state-link:hover {
		background: var(--primary-hover);
		color: var(--primary-contrast);
	}

	.demo-hint {
		margin-top: var(--space-4);
	}

	.demo-hint a {
		font-weight: var(--weight-medium);
	}
</style>
