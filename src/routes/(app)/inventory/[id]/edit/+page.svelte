<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, PageHeader } from '#lib/components/index.js';
	import InventoryFormFields from '#lib/components/InventoryFormFields.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const actionData = $derived(
		form as {
			values?: Record<string, string>;
			fieldErrors?: Record<string, string>;
			error?: string;
			isActive?: boolean;
			minStocks?: Record<string, number | null>;
		} | null
	);

	const values = $derived(actionData?.values ?? data.values);
	const isActive = $derived(actionData?.isActive ?? data.isActive);
	const minStocks = $derived(actionData?.minStocks ?? data.minStocks);
	const detailHref = $derived(resolve('/(app)/inventory/[id]', { id: String(data.item.id) }));
</script>

<svelte:head>
	<title>Edit {data.item.itemCode} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Edit {data.item.itemCode}"
		description="Perbarui informasi item dan minimum stok per lokasi."
	>
		{#snippet actions()}
			<a class="back-link" href={detailHref}>Kembali ke detail</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
		</div>
	{/if}

	{#if !data.isActive}
		<div class="form-alert">
			<Alert tone="info" title="Item nonaktif">
				Item ini nonaktif dan tidak muncul di pilihan transaksi baru. Aktifkan kembali jika akan
				digunakan.
			</Alert>
		</div>
	{/if}

	<InventoryFormFields
		{values}
		fieldErrors={actionData?.fieldErrors}
		options={data.options}
		{isActive}
		{minStocks}
		quantities={data.quantities}
		cancelHref={detailHref}
	/>
</main>

<style>
	.form-alert {
		margin-bottom: var(--space-4);
	}

	.back-link {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}
</style>
