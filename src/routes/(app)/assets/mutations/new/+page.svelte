<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, PageHeader } from '#lib/components/index.js';
	import MutationForm from '#lib/components/MutationForm.svelte';
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
			assetId: data.selectedAssetId,
			destinationLocationId: '',
			mutationDate: data.defaultDate,
			reason: '',
			receivedByName: '',
			notes: '',
			submissionId: data.submissionId
		}
	);
</script>

<svelte:head>
	<title>Tambah mutasi — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Tambah mutasi"
		description="Pindahkan aset ke lokasi lain dan catat penerimanya."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/assets/mutations')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
		</div>
	{/if}

	<MutationForm
		{values}
		fieldErrors={actionData?.fieldErrors}
		options={data.options}
		cancelHref={resolve('/(app)/assets/mutations')}
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
