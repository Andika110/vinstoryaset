<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Card,
		Checkbox,
		ConfirmDialog,
		Input,
		PageHeader,
		Select,
		Textarea
	} from '#lib/components/index.js';
	import type { PageData, PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type ActionData = {
		values?: Record<string, unknown>;
		fieldErrors?: Record<string, string>;
		error?: string;
	};

	const actionData = $derived(form as ActionData | null);
	const values = $derived<Record<string, unknown>>(actionData?.values ?? data.record ?? {});
	const fields = $derived(
		data.meta.fields.filter((field) => field.name !== 'isActive' || data.canManageActive)
	);
	const listHref = $derived(resolve('/(app)/admin/master-data/[type]', { type: data.meta.type }));
	const title = $derived(
		data.mode === 'create' ? `Tambah ${data.meta.label}` : `Edit ${data.meta.label}`
	);

	let deactivateOpen = $state(false);
	let deactivateForm = $state<HTMLFormElement | null>(null);

	function valueOf(fieldName: string): unknown {
		return values[fieldName];
	}

	function textValue(fieldName: string): string {
		const value = valueOf(fieldName);
		return value === null || value === undefined ? '' : String(value);
	}

	function checkboxValue(fieldName: string): boolean {
		if (fieldName === 'isActive' && values[fieldName] === undefined) return true;
		return values[fieldName] === true;
	}

	function selectOptions(field: PageData['meta']['fields'][number]) {
		if (!field.optionsSource) return [];
		return data.options[field.optionsSource].map((option) => ({
			value: String(option.id),
			label: option.label
		}));
	}
</script>

<svelte:head>
	<title>{title} — Master Data</title>
</svelte:head>

<main class="container page">
	<PageHeader {title} description={data.meta.description}>
		{#snippet actions()}
			<a class="back-link" href={listHref}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	<Card title="Informasi" headingLevel={2}>
		<form method="POST" action="?/save" class="form-grid">
			{#if actionData?.error}
				<div class="full">
					<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
				</div>
			{/if}

			{#each fields as field (field.name)}
				{#if field.type === 'select'}
					<Select
						label={field.label}
						name={field.name}
						options={selectOptions(field)}
						placeholder={field.required ? `Pilih ${field.label.toLowerCase()}` : 'Tidak ada'}
						required={field.required}
						value={textValue(field.name)}
						hint={field.hint}
						error={actionData?.fieldErrors?.[field.name]}
					/>
				{:else if field.type === 'textarea'}
					<div class="full">
						<Textarea
							label={field.label}
							name={field.name}
							required={field.required}
							value={textValue(field.name)}
							hint={field.hint}
							error={actionData?.fieldErrors?.[field.name]}
						/>
					</div>
				{:else if field.type === 'checkbox'}
					<div class="full">
						<Checkbox
							label={field.label}
							name={field.name}
							hint={field.hint}
							checked={checkboxValue(field.name)}
						/>
					</div>
				{:else}
					<Input
						label={field.label}
						name={field.name}
						type={field.type}
						required={field.required}
						value={textValue(field.name)}
						hint={field.hint}
						error={actionData?.fieldErrors?.[field.name]}
					/>
				{/if}
			{/each}

			<div class="full form-actions">
				<Button type="submit">Simpan</Button>
				<a class="cancel-link" href={listHref}>Batal</a>
			</div>
		</form>
	</Card>

	{#if data.canDeactivate}
		<div class="danger-zone">
			<Card title="Nonaktifkan data" headingLevel={2}>
				<div class="stack">
					<p class="text-muted">
						Data yang sudah dipakai transaksi tidak dihapus permanen. Data nonaktif tidak muncul di
						pilihan baru tetapi tetap tampil di riwayat.
					</p>
					<div>
						<Button variant="danger" onclick={() => (deactivateOpen = true)}>
							Nonaktifkan {data.meta.label}
						</Button>
					</div>
				</div>
			</Card>
		</div>
	{/if}
</main>

{#if data.canDeactivate}
	<form bind:this={deactivateForm} method="POST" action="?/deactivate" class="visually-hidden">
		<input type="hidden" name="confirm" value="1" />
	</form>

	<ConfirmDialog
		bind:open={deactivateOpen}
		title="Nonaktifkan {data.meta.label.toLowerCase()}?"
		description="Data akan ditandai nonaktif. Data historis dan referensi lama tetap tersimpan."
		confirmLabel="Nonaktifkan"
		tone="danger"
		onconfirm={() => deactivateForm?.requestSubmit()}
	/>
{/if}

<style>
	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.full {
		grid-column: 1 / -1;
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		padding-top: var(--space-2);
	}

	.back-link,
	.cancel-link {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.danger-zone {
		margin-top: var(--space-5);
	}

	@media (min-width: 768px) {
		.form-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
