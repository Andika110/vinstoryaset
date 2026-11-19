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
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const listHref = $derived(resolve('/(app)/admin/master-data/[type]', { type: data.meta.type }));
	const createHref = $derived(
		resolve('/(app)/admin/master-data/[type]/[id]', { type: data.meta.type, id: 'new' })
	);
</script>

<svelte:head>
	<title>{data.meta.pluralLabel} — Master Data</title>
</svelte:head>

<main class="container page">
	<PageHeader title={data.meta.pluralLabel} description={data.meta.description}>
		{#snippet actions()}
			{#if data.canCreate}
				<a class="button-link" href={createHref}>Tambah {data.meta.label}</a>
			{/if}
			<a class="back-link" href={resolve('/(app)/admin/master-data')}>Kembali ke overview</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari {data.meta.label.toLowerCase()}…"
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if data.search}
				<NoResultState pathname={listHref} />
			{:else}
				<EmptyState
					title="Belum ada {data.meta.label.toLowerCase()}"
					description="Tambahkan data referensi pertama untuk modul ini."
				>
					{#snippet action()}
						{#if data.canCreate}
							<a class="button-link" href={createHref}>Tambah {data.meta.label}</a>
						{/if}
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = data.meta.columns}

			<h2 class="visually-hidden">Daftar {data.meta.pluralLabel}</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => String(row.id)}>
				{#snippet actions(row)}
					{#if data.canEdit}
						<a
							class="row-action"
							href={resolve('/(app)/admin/master-data/[type]/[id]', {
								type: data.meta.type,
								id: String(row.id)
							})}
							aria-label="Edit {String(row.name)}"
						>
							Edit
						</a>
					{/if}
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => String(row.id)}>
				{#snippet actions(row)}
					{#if data.canEdit}
						<a
							class="row-action"
							href={resolve('/(app)/admin/master-data/[type]/[id]', {
								type: data.meta.type,
								id: String(row.id)
							})}
							aria-label="Edit {String(row.name)}"
						>
							Edit
						</a>
					{/if}
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
