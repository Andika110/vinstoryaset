<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Alert, Button, Card, Input, Select, Textarea } from './index.js';

	type Option = { id: number; label: string };
	type ModelOption = Option & { categoryId: number; brandId: number | null };
	type ItemOption = Option & { unitName: string };

	type ReceivingOptions = {
		suppliers: Option[];
		locations: Option[];
		inventoryItems: ItemOption[];
		categories: Option[];
		brands: Option[];
		models: ModelOption[];
		conditions: Option[];
	};

	interface Props {
		values: Record<string, string>;
		fieldErrors?: Record<string, string>;
		options: ReceivingOptions;
		cancelHref: ResolvedPathname;
	}

	let { values, fieldErrors = {}, options, cancelHref }: Props = $props();

	const receivingTypes = [
		{ value: 'purchase', label: 'Purchase' },
		{ value: 'opening_balance', label: 'Saldo Awal' },
		{ value: 'transfer_in', label: 'Transfer Masuk (luar sistem)' },
		{ value: 'other', label: 'Lainnya' }
	];

	let lineTypeOverride = $state<string | null>(null);
	let categoryOverride = $state<string | null>(null);
	let brandOverride = $state<string | null>(null);

	const lineType = $derived(lineTypeOverride ?? values.lineType ?? 'asset');
	const categoryId = $derived(categoryOverride ?? values.categoryId ?? '');
	const brandId = $derived(brandOverride ?? values.brandId ?? '');

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

<form method="POST" action="?/save" class="receiving-form">
	<input type="hidden" name="submissionId" value={values.submissionId} />

	<Card title="Informasi penerimaan" headingLevel={2}>
		<div class="form-grid">
			<Select
				label="Jenis penerimaan"
				name="receivingType"
				required
				value={text('receivingType') || 'purchase'}
				options={receivingTypes}
				error={fieldErrors.receivingType}
			/>
			<Input
				label="Tanggal penerimaan"
				name="receiptDate"
				type="date"
				required
				value={text('receiptDate')}
				error={fieldErrors.receiptDate}
			/>
			<Select
				label="Supplier"
				name="supplierId"
				value={text('supplierId')}
				placeholder="Tidak ada"
				options={options.suppliers.map((supplier) => ({
					value: String(supplier.id),
					label: supplier.label
				}))}
				hint="Supplier hanya referensi, bukan modul procurement."
				error={fieldErrors.supplierId}
			/>
			<Select
				label="Lokasi penerimaan"
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
			<Input
				label="Nomor referensi"
				name="referenceNumber"
				value={text('referenceNumber')}
				hint="Nomor PO, surat jalan, atau dokumen sumber."
				error={fieldErrors.referenceNumber}
			/>
			<div class="full">
				<Textarea
					label="Catatan"
					name="notes"
					value={text('notes')}
					hint="Catatan tambahan untuk penerimaan ini."
					error={fieldErrors.notes}
				/>
			</div>
		</div>
	</Card>

	<Card title="Item yang diterima" headingLevel={2}>
		<div class="stack">
			<Select
				label="Jenis item"
				name="lineType"
				required
				value={lineType}
				options={[
					{ value: 'asset', label: 'IT Asset (membuat record aset)' },
					{ value: 'inventory', label: 'Inventory (menambah stok)' }
				]}
				onchange={(event) => (lineTypeOverride = event.currentTarget.value)}
			/>

			{#if lineType === 'inventory'}
				<Alert tone="info" title="Penerimaan inventory">
					Stok item di lokasi tujuan bertambah sebesar jumlah yang diterima dan satu transaksi Stock
					In dibuat. Buka item setelah disimpan untuk melihat stok dan riwayatnya.
				</Alert>
				<div class="form-grid">
					<div class="full">
						<Select
							label="Item inventory"
							name="inventoryItemId"
							required
							value={text('inventoryItemId')}
							placeholder="Pilih item"
							options={options.inventoryItems.map((item) => ({
								value: String(item.id),
								label: `${item.label} (${item.unitName})`
							}))}
							error={fieldErrors.inventoryItemId}
						/>
					</div>
					<Input
						label="Jumlah"
						name="quantity"
						type="number"
						min="1"
						step="1"
						required
						value={text('quantity') || '1'}
						error={fieldErrors.quantity}
					/>
					<Input
						label="Biaya satuan"
						name="unitCost"
						type="number"
						min="0"
						step="0.01"
						inputmode="decimal"
						value={text('unitCost')}
						hint="Opsional. Hanya untuk catatan penerimaan."
						error={fieldErrors.unitCost}
					/>
				</div>
			{:else}
				<Alert tone="info" title="Penerimaan IT Asset">
					Setiap unit akan dibuat sebagai aset individual dengan Asset Code otomatis dan status
					Available. Serial number hanya dapat diisi jika jumlah 1 unit.
				</Alert>
				<div class="form-grid">
					<Input
						label="Nama aset"
						name="assetName"
						required
						value={text('assetName')}
						error={fieldErrors.assetName}
					/>
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
					<Input
						label="Jumlah unit"
						name="quantity"
						type="number"
						min="1"
						step="1"
						required
						value={text('quantity') || '1'}
						error={fieldErrors.quantity}
					/>
					<Input
						label="Serial number"
						name="serialNumber"
						value={text('serialNumber')}
						hint="Opsional. Hanya jika jumlah 1 unit."
						error={fieldErrors.serialNumber}
					/>
					<Input
						label="Akhir garansi"
						name="warrantyExpiration"
						type="date"
						value={text('warrantyExpiration')}
						error={fieldErrors.warrantyExpiration}
					/>
					<Input
						label="Biaya perolehan per unit"
						name="unitCost"
						type="number"
						min="0"
						step="0.01"
						inputmode="decimal"
						value={text('unitCost')}
						hint="Opsional. Disimpan pada masing-masing aset."
						error={fieldErrors.unitCost}
					/>
					<div class="full">
						<Textarea
							label="Deskripsi aset"
							name="assetDescription"
							value={text('assetDescription')}
							hint="Catatan tambahan untuk aset yang dibuat."
							error={fieldErrors.assetDescription}
						/>
					</div>
				</div>
			{/if}
		</div>
	</Card>

	<div class="form-actions">
		<Button type="submit">Simpan penerimaan</Button>
		<a class="cancel-link" href={cancelHref}>Batal</a>
	</div>
</form>

<style>
	.receiving-form {
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

	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
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
