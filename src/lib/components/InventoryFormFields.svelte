<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Alert, Button, Card, Checkbox, Input, Select, Textarea } from './index.js';

	type Option = { id: number; label: string };

	interface Props {
		values: Record<string, string>;
		fieldErrors?: Record<string, string>;
		options: {
			categories: Option[];
			brands: Option[];
			units: Option[];
			locations: Option[];
		};
		isActive: boolean;
		minStocks: Record<string, number | null>;
		quantities: Record<string, number>;
		cancelHref: ResolvedPathname;
	}

	let {
		values,
		fieldErrors = {},
		options,
		isActive,
		minStocks,
		quantities,
		cancelHref
	}: Props = $props();

	function text(key: string): string {
		return values[key] ?? '';
	}

	function minStockValue(locationId: number): string {
		const value = minStocks[String(locationId)];
		return value === null || value === undefined ? '' : String(value);
	}
</script>

<form method="POST" action="?/save" class="inventory-form">
	<Card title="Informasi item" headingLevel={2}>
		<div class="form-grid">
			<Input
				label="Item Code"
				name="itemCode"
				required
				value={text('itemCode')}
				hint="Harus unik. Contoh: TONER-HP-85A."
				error={fieldErrors.itemCode}
			/>
			<Input label="Nama item" name="name" required value={text('name')} error={fieldErrors.name} />
			<Select
				label="Kategori"
				name="categoryId"
				required
				value={text('categoryId')}
				placeholder="Pilih kategori"
				options={options.categories.map((category) => ({
					value: String(category.id),
					label: category.label
				}))}
				error={fieldErrors.categoryId}
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
			/>
			<Select
				label="Unit"
				name="unitId"
				required
				value={text('unitId')}
				placeholder="Pilih unit"
				options={options.units.map((unit) => ({
					value: String(unit.id),
					label: unit.label
				}))}
				error={fieldErrors.unitId}
			/>
			<div class="checkbox-wrap">
				<Checkbox
					label="Item aktif"
					name="isActive"
					checked={isActive}
					hint="Item nonaktif tidak muncul di pilihan transaksi baru."
				/>
			</div>
			<div class="full">
				<Textarea
					label="Deskripsi"
					name="description"
					value={text('description')}
					hint="Catatan tambahan tentang item."
					error={fieldErrors.description}
				/>
			</div>
		</div>
	</Card>

	<Card title="Minimum stok per lokasi" headingLevel={2}>
		<div class="stack">
			<Alert tone="info" title="Minimum stok bersifat opsional">
				Kosongkan jika lokasi tidak dipantau. Nilai minimum tidak mengubah stok saat ini; stok hanya
				berubah melalui penerimaan atau transaksi stok.
			</Alert>

			{#if options.locations.length === 0}
				<p class="text-muted">Belum ada lokasi aktif untuk diatur.</p>
			{:else}
				<div class="min-grid">
					{#each options.locations as location (location.id)}
						{@const qty = quantities[String(location.id)] ?? 0}
						<Input
							label={location.label}
							name={`minStock_${location.id}`}
							type="number"
							min="0"
							step="1"
							inputmode="numeric"
							value={minStockValue(location.id)}
							hint={`Stok saat ini: ${qty.toLocaleString('id-ID')}`}
							error={fieldErrors[`minStock_${location.id}`]}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</Card>

	<div class="form-actions">
		<Button type="submit">Simpan</Button>
		<a class="cancel-link" href={cancelHref}>Batal</a>
	</div>
</form>

<style>
	.inventory-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.min-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.full {
		grid-column: 1 / -1;
	}

	.checkbox-wrap {
		display: flex;
		align-items: flex-end;
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
		.form-grid,
		.min-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
