<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, PageHeader } from '#lib/components/index.js';
	import RequestForm from '#lib/components/RequestForm.svelte';
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
			reason: '',
			notes: '',
			submissionId: data.submissionId
		}
	);
</script>

<svelte:head>
	<title>Buat request — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Buat request"
		description="Ajukan beberapa item inventory sekaligus untuk outlet Anda."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/requests')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
		</div>
	{/if}

	<RequestForm
		{values}
		fieldErrors={actionData?.fieldErrors}
		options={data.options}
		cancelHref={resolve('/(app)/requests')}
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
