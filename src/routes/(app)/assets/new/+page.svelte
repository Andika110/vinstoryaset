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

	const values = $derived(actionData?.values ?? {});
</script>

<svelte:head>
	<title>Tambah aset — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Tambah aset"
		description="Daftarkan aset baru dengan identitas, pembelian, lokasi, kondisi, dan foto."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/assets')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
		</div>
	{/if}

	<AssetFormFields
		mode="create"
		{values}
		fieldErrors={actionData?.fieldErrors}
		options={data.options}
		canSeeCost={data.canSeeCost}
		cancelHref={resolve('/(app)/assets')}
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
