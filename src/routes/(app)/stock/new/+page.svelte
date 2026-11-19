<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import { Alert, PageHeader } from '#lib/components/index.js';
	import StockForm from '#lib/components/StockForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type StockType = 'stock_out' | 'transfer' | 'adjustment';

	const actionData = $derived(
		form as {
			values?: Record<string, string>;
			fieldErrors?: Record<string, string>;
			error?: string;
		} | null
	);

	const type = $derived<StockType>(
		actionData?.values?.type === 'transfer'
			? 'transfer'
			: actionData?.values?.type === 'adjustment'
				? 'adjustment'
				: data.type
	);

	const titles: Record<StockType, string> = {
		stock_out: 'Stock Out',
		transfer: 'Transfer Stok',
		adjustment: 'Penyesuaian Stok'
	};

	const descriptions: Record<StockType, string> = {
		stock_out: 'Kurangi stok item pada satu lokasi dengan alasan yang jelas.',
		transfer: 'Pindahkan stok item antar lokasi dalam satu transaksi.',
		adjustment: 'Sesuaikan stok karena selisih opname, barang rusak, atau koreksi.'
	};

	const values = $derived(
		actionData?.values ?? {
			type: data.type,
			itemId: '',
			locationId: '',
			destinationLocationId: '',
			quantity: '1',
			direction: 'out',
			reason: '',
			notes: '',
			submissionId: data.submissionId
		}
	);

	const tabs = [
		{ type: 'stock_out' as const, label: 'Stock Out' },
		{ type: 'transfer' as const, label: 'Transfer' },
		{ type: 'adjustment' as const, label: 'Penyesuaian' }
	];
</script>

<svelte:head>
	<title>{titles[type]} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader title={titles[type]} description={descriptions[type]}>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/stock')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	<nav class="type-tabs" aria-label="Jenis transaksi stok">
		{#each tabs as tab (tab.type)}
			<a
				href={resolveHref(`/stock/new?type=${tab.type}`)}
				class:active={type === tab.type}
				aria-current={type === tab.type ? 'page' : undefined}
			>
				{tab.label}
			</a>
		{/each}
	</nav>

	{#if actionData?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
		</div>
	{/if}

	<StockForm
		{type}
		{values}
		fieldErrors={actionData?.fieldErrors}
		options={data.options}
		cancelHref={resolve('/(app)/stock')}
	/>
</main>

<style>
	.type-tabs {
		display: flex;
		gap: var(--space-1);
		margin-bottom: var(--space-5);
		padding-bottom: var(--space-1);
		border-bottom: 1px solid var(--border);
		overflow-x: auto;
	}

	.type-tabs a {
		display: inline-flex;
		flex: none;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border-bottom: 3px solid transparent;
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
		white-space: nowrap;
	}

	.type-tabs a:hover {
		color: var(--text-1);
	}

	.type-tabs a.active {
		border-bottom-color: var(--primary);
		color: var(--primary);
	}

	.form-alert {
		margin-bottom: var(--space-4);
	}

	.back-link {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}
</style>
