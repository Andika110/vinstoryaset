<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Alert, Button, Card, ImageUpload, Input, Select, Textarea } from './index.js';

	type Option = {
		id: number;
		label: string;
		categoryId?: number | null;
		brandId?: number | null;
	};

	type AssetOptions = {
		categories: Option[];
		brands: Option[];
		models: Option[];
		locations: Option[];
		conditions: Option[];
	};

	interface Props {
		mode: 'create' | 'edit';
		values: Record<string, string>;
		fieldErrors?: Record<string, string>;
		options: AssetOptions;
		canSeeCost: boolean;
		photoUrl?: string | null;
		cancelHref: ResolvedPathname;
	}

	let {
		mode,
		values,
		fieldErrors = {},
		options,
		canSeeCost,
		photoUrl = null,
		cancelHref
	}: Props = $props();

	let categoryOverride = $state<string | null>(null);
	let brandOverride = $state<string | null>(null);

	const categoryId = $derived(categoryOverride ?? String(values.categoryId ?? ''));
	const brandId = $derived(brandOverride ?? String(values.brandId ?? ''));

	const modelOptions = $derived(
		options.models
			.filter(
				(model) =>
					(!categoryId || model.categoryId === Number(categoryId)) &&
					(!brandId || model.brandId === Number(brandId))
			)
			.map((model) => ({ value: String(model.id), label: model.label }))
	);

	function text(key: string): string {
		return values[key] ?? '';
	}
</script>

<form method="POST" action="?/save" enctype="multipart/form-data" class="asset-form">
	<Card title="Identitas aset" headingLevel={2}>
		<div class="form-grid">
			<Input
				label="Asset Code"
				name="assetCode"
				required
				value={text('assetCode')}
				hint="Harus unik. Contoh: LPT-0042."
				error={fieldErrors.assetCode}
			/>
			<Input label="Nama aset" name="name" required value={text('name')} error={fieldErrors.name} />
			<Select
				label="Kategori aset"
				name="categoryId"
				required
				value={text('categoryId')}
				placeholder="Pilih kategori"
				options={options.categories.map((category) => ({
					value: String(category.id),
					label: category.label
				}))}
				error={fieldErrors.categoryId}
				onchange={(event) => (categoryOverride = event.currentTarget.value)}
			/>
			<Select
				label="Brand"
				name="brandId"
				value={text('brandId')}
				placeholder="Tidak ada"
				options={options.brands.map((brand) => ({
					value: String(brand.id),
					label: brand.label
				}))}
				error={fieldErrors.brandId}
				onchange={(event) => (brandOverride = event.currentTarget.value)}
			/>
			<Select
				label="Model"
				name="modelId"
				value={text('modelId')}
				placeholder="Tidak ada"
				options={modelOptions}
				hint="Pilihan model mengikuti kategori dan brand."
				error={fieldErrors.modelId}
			/>
			<Input
				label="Serial number"
				name="serialNumber"
				value={text('serialNumber')}
				hint="Boleh kosong. Jika diisi harus unik."
				error={fieldErrors.serialNumber}
			/>
		</div>
	</Card>

	<Card title="Pembelian & garansi" headingLevel={2}>
		<div class="form-grid">
			<Input
				label="Tanggal pembelian"
				name="purchaseDate"
				type="date"
				value={text('purchaseDate')}
				error={fieldErrors.purchaseDate}
			/>
			<Input
				label="Tanggal akhir garansi"
				name="warrantyExpiration"
				type="date"
				value={text('warrantyExpiration')}
				error={fieldErrors.warrantyExpiration}
			/>
			<Input
				label="Sumber perolehan"
				name="acquisitionSource"
				value={text('acquisitionSource')}
				hint="Contoh: pembelian, hibah, transfer antar outlet."
				error={fieldErrors.acquisitionSource}
			/>
			{#if canSeeCost}
				<Input
					label="Biaya perolehan"
					name="acquisitionCost"
					type="number"
					min="0"
					step="0.01"
					inputmode="decimal"
					value={text('acquisitionCost')}
					hint="Hanya terlihat oleh IT Administrator dan IT Support."
					error={fieldErrors.acquisitionCost}
				/>
			{/if}
		</div>
	</Card>

	<Card title="Lokasi & kondisi" headingLevel={2}>
		<div class="form-grid">
			{#if mode === 'create'}
				<Select
					label="Lokasi"
					name="locationId"
					required
					value={text('locationId')}
					placeholder="Pilih lokasi"
					options={options.locations.map((location) => ({
						value: String(location.id),
						label: location.label
					}))}
					error={fieldErrors.locationId}
				/>
			{:else}
				<div class="full">
					<Alert tone="info" title="Lokasi, status, dan pemegang dikunci">
						Lokasi saat ini <strong>{text('locationLabel') || '—'}</strong>. Perubahan lokasi
						dilakukan melalui proses mutasi atau penempatan, dan status hanya berubah melalui proses
						transaksi.
					</Alert>
				</div>
			{/if}

			<Select
				label="Kondisi aset"
				name="conditionId"
				required
				value={text('conditionId')}
				placeholder="Pilih kondisi"
				options={options.conditions.map((condition) => ({
					value: String(condition.id),
					label: condition.label
				}))}
				error={fieldErrors.conditionId}
			/>
		</div>
	</Card>

	<Card title="Catatan & foto" headingLevel={2}>
		<div class="form-grid">
			<div class="full">
				<Textarea
					label="Deskripsi"
					name="description"
					value={text('description')}
					hint="Catatan tambahan tentang aset."
					error={fieldErrors.description}
				/>
			</div>
			<div class="full">
				<ImageUpload
					name="photo"
					label="Foto aset"
					value={photoUrl}
					removeField="removePhoto"
					hint="JPG, PNG, atau WebP. Gambar dikompres di browser sebelum dikirim."
					error={fieldErrors.photo}
				/>
			</div>
		</div>
	</Card>

	{#if mode === 'edit'}
		<input type="hidden" name="updatedAt" value={text('updatedAt')} />
	{/if}

	<div class="form-actions">
		<Button type="submit">Simpan</Button>
		<a class="cancel-link" href={cancelHref}>Batal</a>
	</div>
</form>

<style>
	.asset-form {
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
