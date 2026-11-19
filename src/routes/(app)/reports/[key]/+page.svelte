<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import {
		DataTable,
		EmptyState,
		MobileDataCard,
		PageHeader,
		Pagination
	} from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const hasFilter = $derived(
		Boolean(
			data.filters.from ||
			data.filters.to ||
			data.filters.locationId ||
			data.filters.categoryId ||
			data.filters.itemId ||
			data.filters.outletId ||
			data.filters.status
		)
	);

	const exportParams = $derived.by(() => {
		const params: string[] = [];
		if (data.filters.from) params.push(`from=${encodeURIComponent(data.filters.from)}`);
		if (data.filters.to) params.push(`to=${encodeURIComponent(data.filters.to)}`);
		if (data.filters.locationId) params.push(`location=${data.filters.locationId}`);
		if (data.filters.categoryId) params.push(`category=${data.filters.categoryId}`);
		if (data.filters.itemId) params.push(`item=${data.filters.itemId}`);
		if (data.filters.outletId) params.push(`outlet=${data.filters.outletId}`);
		if (data.filters.status) params.push(`status=${encodeURIComponent(data.filters.status)}`);
		return params.join('&');
	});

	const csvHref = $derived(
		resolveHref(`/reports/${data.definition.key}/export?${exportParams}&format=csv`)
	);
	const xlsxHref = $derived(
		resolveHref(`/reports/${data.definition.key}/export?${exportParams}&format=xlsx`)
	);
</script>

<svelte:head>
	<title>{data.definition.title} — Laporan</title>
</svelte:head>

<main class="container page">
	<PageHeader title={data.definition.title} description={data.definition.description}>
		{#snippet actions()}
			<a class="button-link secondary" href={csvHref}>Export CSV</a>
			<a class="button-link secondary" href={xlsxHref}>Export Excel</a>
			<a class="back-link" href={resolve('/(app)/reports')}>Kembali ke laporan</a>
		{/snippet}
	</PageHeader>

	<form class="report-filter" method="GET">
		{#if data.definition.filters.includes('from')}
			<label>
				<span>Dari tanggal</span>
				<input type="date" name="from" value={data.filters.from ?? ''} />
			</label>
		{/if}
		{#if data.definition.filters.includes('to')}
			<label>
				<span>Sampai tanggal</span>
				<input type="date" name="to" value={data.filters.to ?? ''} />
			</label>
		{/if}
		{#if data.definition.filters.includes('location')}
			<label>
				<span>Lokasi</span>
				<select name="location">
					<option value="">Semua lokasi</option>
					{#each data.options.locations as location (location.id)}
						<option value={location.id} selected={data.filters.locationId === location.id}>
							{location.label}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if data.definition.filters.includes('category')}
			<label>
				<span>Kategori</span>
				<select name="category">
					<option value="">Semua kategori</option>
					{#each data.options.categories as category (category.id)}
						<option value={category.id} selected={data.filters.categoryId === category.id}>
							{category.label}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if data.definition.filters.includes('item')}
			<label>
				<span>Item</span>
				<select name="item">
					<option value="">Semua item</option>
					{#each data.options.items as item (item.id)}
						<option value={item.id} selected={data.filters.itemId === item.id}>
							{item.label}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if data.definition.filters.includes('outlet')}
			<label>
				<span>Outlet</span>
				<select name="outlet">
					<option value="">Semua outlet</option>
					{#each data.options.outlets as outlet (outlet.id)}
						<option value={outlet.id} selected={data.filters.outletId === outlet.id}>
							{outlet.label}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if data.definition.filters.includes('status')}
			<label>
				<span>Status</span>
				<select name="status">
					<option value="">Semua status</option>
					{#each data.options.statuses as status (status.value)}
						<option value={status.value} selected={data.filters.status === status.value}>
							{status.label}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		<div class="filter-actions">
			<button type="submit" class="button-link">Terapkan</button>
			{#if hasFilter}
				<a href={resolve('/(app)/reports/[key]', { key: data.definition.key })}>Reset</a>
			{/if}
		</div>
	</form>

	<div class="summary">
		{#each data.summary as item (item)}
			<span class="chip">{item}</span>
		{/each}
		<span class="total">{data.total.toLocaleString('id-ID')} baris</span>
	</div>

	<div class="report-area">
		{#if data.total === 0}
			<EmptyState
				title="Tidak ada data"
				description="Tidak ada data yang sesuai filter. Ubah atau reset filter untuk melihat hasil lain."
			/>
		{:else}
			{@const columns = data.columns.map((column) => ({
				key: column.key,
				label: column.label,
				align: column.align
			}))}

			<h2 class="visually-hidden">{data.definition.title}</h2>

			<DataTable {columns} rows={data.rows} rowKey={(row) => JSON.stringify(row)} />

			<MobileDataCard {columns} rows={data.rows} rowKey={(row) => JSON.stringify(row)} />

			<Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
		{/if}
	</div>
</main>

<style>
	.button-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.button-link.secondary {
		border-color: var(--border-strong);
		background: var(--surface);
		color: var(--text-1);
	}

	.button-link:hover {
		background: var(--primary-hover);
		color: var(--primary-contrast);
	}

	.button-link.secondary:hover {
		background: var(--surface-2);
		color: var(--text-1);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.report-filter {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.report-filter label {
		display: flex;
		flex: 1 1 160px;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.report-filter span {
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.filter-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.filter-actions a {
		font-size: var(--font-size-sm);
	}

	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.chip {
		padding: 2px var(--space-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--surface-2);
		color: var(--text-2);
		font-size: var(--font-size-xs);
	}

	.total {
		margin-left: auto;
		color: var(--text-3);
		font-size: var(--font-size-sm);
	}

	.report-area {
		margin-top: var(--space-5);
	}
</style>
