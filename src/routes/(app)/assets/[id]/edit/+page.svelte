<script lang="ts">
	import { resolve } from '$app/paths';
	import AssetFormFields from '#lib/components/AssetFormFields.svelte';
	import { Alert, PageHeader } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const actionData = $derived(
		form as {
			values?: Record<string, string>;
			fieldErrors?: Record<string, string>;
			error?: string;
		} | null
	);

	const values = $derived(actionData?.values ?? data.values);
	const detailHref = $derived(resolve('/(app)/assets/[id]', { id: String(data.asset.id) }));
</script>

<svelte:head>
	<title>Edit {data.asset.assetCode} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title={data.readOnly ? 'Aset tidak dapat diedit' : `Edit ${data.asset.assetCode}`}
		description={data.readOnly
			? 'Aset yang sudah disposed bersifat read-only.'
			: 'Perbarui identitas, pembelian, kondisi, deskripsi, dan foto aset.'}
	>
		{#snippet actions()}
			<a class="back-link" href={detailHref}>Kembali ke detail</a>
		{/snippet}
	</PageHeader>

	{#if data.readOnly}
		<Alert tone="warning" title="Aset disposed">
			Aset <strong>{data.asset.assetCode}</strong> sudah disposed dan tidak dapat diubah. Riwayat aset
			tetap dapat dilihat pada halaman detail.
		</Alert>
	{:else}
		{#if actionData?.error}
			<div class="form-alert">
				<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
			</div>
		{/if}

		<AssetFormFields
			mode="edit"
			{values}
			fieldErrors={actionData?.fieldErrors}
			options={data.options}
			canSeeCost={data.canSeeCost}
			photoUrl={data.asset.photoUrl}
			cancelHref={detailHref}
		/>
	{/if}
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
