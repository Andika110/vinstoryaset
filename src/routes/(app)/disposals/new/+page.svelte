<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Card,
		Input,
		PageHeader,
		Select,
		Textarea
	} from '#lib/components/index.js';
	import type { SelectOption } from '#lib/components/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const selectedAsset = $derived(
		form?.values?.assetId ?? (data.selectedAssetId ? String(data.selectedAssetId) : '')
	);

	const assetOptions = $derived<SelectOption[]>([
		{ value: '', label: 'Pilih aset' },
		...data.options.assets.map((asset) => ({
			value: String(asset.id),
			label: asset.status === 'on_loan' ? `${asset.label} — On Loan` : asset.label,
			disabled: asset.status === 'on_loan'
		}))
	]);

	const conditionOptions = $derived<SelectOption[]>([
		{ value: '', label: 'Pilih kondisi akhir' },
		...data.options.conditions.map((condition) => ({
			value: String(condition.id),
			label: condition.label
		}))
	]);

	const reasonOptions: SelectOption[] = [
		{ value: '', label: 'Pilih alasan' },
		{ value: 'heavy_damage', label: 'Rusak berat' },
		{ value: 'not_economical', label: 'Tidak ekonomis diperbaiki' },
		{ value: 'lost', label: 'Hilang' },
		{ value: 'not_needed', label: 'Tidak dibutuhkan' },
		{ value: 'other', label: 'Lainnya' }
	];
</script>

<svelte:head>
	<title>Buat disposal — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Buat disposal"
		description="Disposal bersifat final: aset menjadi Disposed dan tidak dapat diaktifkan kembali tanpa pembatalan Admin."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/disposals')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if data.options.assets.length === 0}
		<Alert tone="info" title="Tidak ada aset yang dapat didisposal">
			Semua aset sudah berstatus Disposed atau belum ada aset terdaftar.
		</Alert>
	{:else}
		<Card title="Informasi disposal" headingLevel={2}>
			{#if form?.error}
				<div class="form-alert">
					<Alert tone="danger" title="Gagal menyimpan disposal">{form.error}</Alert>
				</div>
			{/if}

			<form method="POST" class="form-grid">
				<input
					type="hidden"
					name="submissionId"
					value={form?.values?.submissionId ?? data.submissionId}
				/>

				<div class="full">
					<Select
						label="Aset"
						name="assetId"
						required
						options={assetOptions}
						value={selectedAsset}
						hint="Aset On Loan harus diselesaikan atau dibatalkan dulu."
					/>
				</div>
				<Input
					label="Tanggal disposal"
					name="disposalDate"
					type="date"
					required
					value={form?.values?.disposalDate ?? data.today}
				/>
				<Select
					label="Alasan"
					name="reason"
					required
					options={reasonOptions}
					value={form?.values?.reason ?? ''}
				/>
				<div class="full">
					<Select
						label="Kondisi akhir"
						name="finalConditionId"
						required
						options={conditionOptions}
						value={form?.values?.finalConditionId ?? ''}
					/>
				</div>
				<div class="full">
					<Textarea
						label="Keterangan"
						name="description"
						rows={3}
						maxlength={500}
						placeholder="Wajib diisi untuk alasan Lainnya; opsional untuk alasan lain"
						value={form?.values?.description ?? ''}
					/>
				</div>
				<div class="full actions">
					<Button type="submit">Simpan disposal</Button>
				</div>
			</form>
		</Card>
	{/if}
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
