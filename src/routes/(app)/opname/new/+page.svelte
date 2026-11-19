<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, Button, Card, PageHeader, Select, Textarea } from '#lib/components/index.js';
	import type { SelectOption } from '#lib/components/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const locationOptions = $derived<SelectOption[]>([
		{ value: '', label: 'Pilih lokasi' },
		...data.options.locations.map((location) => ({
			value: String(location.id),
			label: location.label
		}))
	]);

	const typeOptions: SelectOption[] = [
		{ value: 'asset', label: 'Aset' },
		{ value: 'inventory', label: 'Item Inventory' }
	];
</script>

<svelte:head>
	<title>Buat sesi opname — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Buat sesi opname"
		description="Sesi dibuat sebagai draft. Daftar item diambil saat sesi dimulai."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/opname')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	<Card title="Informasi sesi" headingLevel={2}>
		{#if form?.error}
			<div class="form-alert">
				<Alert tone="danger" title="Gagal membuat sesi">{form.error}</Alert>
			</div>
		{/if}

		<form method="POST" class="form-grid">
			<div class="full">
				<Select
					label="Lokasi"
					name="locationId"
					required
					options={locationOptions}
					value={form?.values?.locationId ?? ''}
				/>
			</div>
			<div class="full">
				<Select
					label="Jenis opname"
					name="itemType"
					required
					options={typeOptions}
					value={form?.values?.itemType ?? 'asset'}
				/>
			</div>
			<div class="full">
				<Textarea
					label="Catatan"
					name="notes"
					rows={3}
					placeholder="Opsional, mis. jadwal atau petugas"
					value={form?.values?.notes ?? ''}
				/>
			</div>
			<div class="full actions">
				<Button type="submit">Buat draft</Button>
			</div>
		</form>

		<p class="hint">
			Setelah draft dibuat, buka detail sesi lalu tekan <strong>Mulai sesi</strong> untuk mengambil snapshot
			aset/item pada lokasi tersebut.
		</p>
	</Card>
</main>

<style>
	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.full {
		min-width: 0;
	}

	.form-alert {
		margin-bottom: var(--space-4);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}

	.hint {
		margin: var(--space-4) 0 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 900px) {
		.form-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
