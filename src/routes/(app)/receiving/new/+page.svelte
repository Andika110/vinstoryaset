<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, PageHeader } from '#lib/components/index.js';
	import ReceivingForm from '#lib/components/ReceivingForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const actionData = $derived(
		form as {
			values?: Record<string, string>;
			fieldErrors?: Record<string, string>;
			error?: string;
		} | null
	);

	const values = $derived(
		actionData?.values ?? {
			receivingType: 'purchase',
			receiptDate: data.defaultDate,
			supplierId: '',
			locationId: '',
			referenceNumber: '',
			notes: '',
			lineType: 'asset',
			inventoryItemId: '',
			quantity: '1',
			unitCost: '',
			assetName: '',
			categoryId: '',
			brandId: '',
			modelId: '',
			conditionId: '',
			serialNumber: '',
			warrantyExpiration: '',
			assetDescription: '',
			submissionId: data.submissionId
		}
	);
</script>

<svelte:head>
	<title>Tambah penerimaan — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Tambah penerimaan"
		description="Catat penerimaan aset baru atau tambahan stok inventory."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/receiving')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
		</div>
	{/if}

	<ReceivingForm
		{values}
		fieldErrors={actionData?.fieldErrors}
		options={data.options}
		cancelHref={resolve('/(app)/receiving')}
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
