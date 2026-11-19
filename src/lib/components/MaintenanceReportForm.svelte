<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Alert, Button, Card, ImageUpload, Select, Textarea } from './index.js';

	type AssetOption = {
		id: number;
		label: string;
		statusLabel: string;
		locationLabel: string;
	};

	interface Props {
		values: Record<string, string>;
		fieldErrors?: Record<string, string>;
		options: { assets: AssetOption[] };
		cancelHref: ResolvedPathname;
	}

	let { values, fieldErrors = {}, options, cancelHref }: Props = $props();

	let assetOverride = $state<string | null>(null);
	const assetId = $derived(assetOverride ?? values.assetId ?? '');
	const selectedAsset = $derived(
		options.assets.find((asset) => String(asset.id) === assetId) ?? null
	);

	const types = [
		{ value: 'corrective', label: 'Corrective (perbaikan kerusakan)' },
		{ value: 'preventive', label: 'Preventive (perawatan berkala)' },
		{ value: 'other', label: 'Lainnya' }
	];

	function text(key: string): string {
		return values[key] ?? '';
	}
</script>

<form method="POST" action="?/save" enctype="multipart/form-data" class="report-form">
	<input type="hidden" name="submissionId" value={values.submissionId} />

	<Card title="Laporan kerusakan" headingLevel={2}>
		<div class="form-grid">
			<div class="full">
				{#if options.assets.length === 0}
					<Alert tone="warning" title="Tidak ada aset yang dapat dilaporkan">
						Aset yang sudah disposed, on loan, atau sedang maintenance tidak dapat dilaporkan.
					</Alert>
				{:else}
					<Select
						label="Aset"
						name="assetId"
						required
						value={assetId}
						placeholder="Pilih aset"
						options={options.assets.map((asset) => ({
							value: String(asset.id),
							label: asset.label
						}))}
						error={fieldErrors.assetId}
						onchange={(event) => (assetOverride = event.currentTarget.value)}
					/>
				{/if}
			</div>

			{#if selectedAsset}
				<div class="full">
					<Alert tone="info" title="Aset yang dilaporkan">
						{selectedAsset.label}. Lokasi:
						<strong>{selectedAsset.locationLabel}</strong>.
					</Alert>
				</div>
			{/if}

			<Select
				label="Jenis maintenance"
				name="maintenanceType"
				required
				value={text('maintenanceType') || 'corrective'}
				options={types}
				error={fieldErrors.maintenanceType}
			/>

			<div class="full">
				<Textarea
					label="Deskripsi masalah"
					name="problemDescription"
					required
					value={text('problemDescription')}
					hint="Jelaskan gejala kerusakan dan kondisi aset saat ini."
					error={fieldErrors.problemDescription}
				/>
			</div>

			<div class="full">
				<ImageUpload
					name="photo"
					label="Foto kerusakan (opsional)"
					value={null}
					hint="JPG, PNG, atau WebP maksimal 5 MB."
					error={fieldErrors.photo}
				/>
			</div>
		</div>
	</Card>

	<div class="form-actions">
		<Button type="submit">Kirim laporan</Button>
		<a class="cancel-link" href={cancelHref}>Batal</a>
	</div>
</form>

<style>
	.report-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

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
	}

	.cancel-link {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 768px) {
		.form-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
