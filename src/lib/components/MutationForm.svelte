<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Alert, Button, Card, Input, Select, Textarea } from './index.js';

	type AssetOption = {
		id: number;
		label: string;
		assetCode: string;
		name: string;
		currentLocationId: number;
		currentLocationLabel: string;
	};

	type LocationOption = { id: number; label: string };

	interface Props {
		values: Record<string, string>;
		fieldErrors?: Record<string, string>;
		options: { assets: AssetOption[]; locations: LocationOption[] };
		cancelHref: ResolvedPathname;
	}

	let { values, fieldErrors = {}, options, cancelHref }: Props = $props();

	let assetOverride = $state<string | null>(null);
	const assetId = $derived(assetOverride ?? values.assetId ?? '');
	const selectedAsset = $derived(
		options.assets.find((asset) => String(asset.id) === assetId) ?? null
	);

	function text(key: string): string {
		return values[key] ?? '';
	}
</script>

<form method="POST" action="?/save" class="mutation-form">
	<input type="hidden" name="submissionId" value={values.submissionId} />

	<Card title="Detail mutasi" headingLevel={2}>
		<div class="form-grid">
			<div class="full">
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
			</div>

			{#if selectedAsset}
				<div class="full">
					<Alert tone="info" title="Lokasi sumber">
						{selectedAsset.assetCode} · {selectedAsset.name} saat ini berada di
						<strong>{selectedAsset.currentLocationLabel}</strong>.
					</Alert>
				</div>
			{/if}

			<Select
				label="Lokasi tujuan"
				name="destinationLocationId"
				required
				value={text('destinationLocationId')}
				placeholder="Pilih lokasi tujuan"
				options={options.locations.map((location) => ({
					value: String(location.id),
					label: location.label
				}))}
				hint="Harus berbeda dari lokasi sumber."
				error={fieldErrors.destinationLocationId}
			/>

			<Input
				label="Tanggal mutasi"
				name="mutationDate"
				type="date"
				required
				value={text('mutationDate')}
				error={fieldErrors.mutationDate}
			/>

			<Input
				label="Diterima oleh"
				name="receivedByName"
				value={text('receivedByName')}
				hint="Nama penerima di lokasi tujuan (data, bukan approval)."
				error={fieldErrors.receivedByName}
			/>

			<div class="full">
				<Textarea
					label="Alasan mutasi"
					name="reason"
					value={text('reason')}
					hint="Contoh: kebutuhan operasional outlet, relokasi perangkat."
					error={fieldErrors.reason}
				/>
			</div>

			<div class="full">
				<Textarea label="Catatan" name="notes" value={text('notes')} error={fieldErrors.notes} />
			</div>
		</div>
	</Card>

	<div class="form-actions">
		<Button type="submit">Simpan mutasi</Button>
		<a class="cancel-link" href={cancelHref}>Batal</a>
	</div>
</form>

<style>
	.mutation-form {
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
