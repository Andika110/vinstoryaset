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

	const values = $derived(actionData?.values ?? {});
	const isActive = $derived(actionData?.isActive ?? true);
	const minStocks = $derived(actionData?.minStocks ?? {});
</script>

<svelte:head>
	<title>Tambah item inventory — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Tambah item inventory"
		description="Daftarkan item baru beserta kategori, unit, dan minimum stok per lokasi."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/inventory')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
		</div>
	{/if}

	<InventoryFormFields
		{values}
		fieldErrors={actionData?.fieldErrors}
		options={data.options}
		{isActive}
		{minStocks}
		quantities={{}}
		cancelHref={resolve('/(app)/inventory')}
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
