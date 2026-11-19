<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, PageHeader } from '#lib/components/index.js';
	import MaintenanceReportForm from '#lib/components/MaintenanceReportForm.svelte';
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
			maintenanceType: 'corrective',
			problemDescription: '',
			submissionId: data.submissionId
		}
	);
</script>

<svelte:head>
	<title>Lapor kerusakan — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Lapor kerusakan"
		description="Catat kerusakan aset agar masuk antrean maintenance."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/maintenance')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
		</div>
	{/if}

	<MaintenanceReportForm
		{values}
		fieldErrors={actionData?.fieldErrors}
		options={data.options}
		cancelHref={resolve('/(app)/maintenance')}
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
