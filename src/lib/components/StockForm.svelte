<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Alert, Button, Card, Input, Select, Textarea } from './index.js';

	type Option = { id: number; label: string; unitName?: string; code?: string };
	type Balance = { itemId: number; locationId: number; qty: number };

	interface Props {
		type: 'stock_out' | 'transfer' | 'adjustment';
		values: Record<string, string>;
		fieldErrors?: Record<string, string>;
		options: { items: Option[]; locations: Option[]; balances: Balance[] };
		cancelHref: ResolvedPathname;
	}

	let { type, values, fieldErrors = {}, options, cancelHref }: Props = $props();

	let itemOverride = $state<string | null>(null);
	let locationOverride = $state<string | null>(null);
	let destinationOverride = $state<string | null>(null);
	let directionOverride = $state<string | null>(null);
	let quantityOverride = $state<string | null>(null);

	const itemId = $derived(itemOverride ?? values.itemId ?? '');
	const locationId = $derived(locationOverride ?? values.locationId ?? '');
	const destinationLocationId = $derived(destinationOverride ?? values.destinationLocationId ?? '');
	const direction = $derived(directionOverride ?? values.direction ?? 'out');

	const selectedItem = $derived(options.items.find((item) => String(item.id) === itemId) ?? null);
	const selectedLocation = $derived(
		options.locations.find((location) => String(location.id) === locationId) ?? null
	);
	const selectedDestination = $derived(
		options.locations.find((location) => String(location.id) === destinationLocationId) ?? null
	);

	function balanceAt(location: string): number {
		if (!itemId || !location) return 0;
		const row = options.balances.find(
			(balance) => balance.itemId === Number(itemId) && balance.locationId === Number(location)
		);
		return row?.qty ?? 0;
	}

	const sourceStock = $derived(balanceAt(locationId));
	const destinationStock = $derived(balanceAt(destinationLocationId));
	const quantityValue = $derived(quantityOverride ?? values.quantity ?? '1');
	const quantity = $derived(Number(quantityValue || '1'));
	const showAvailability = $derived(Boolean(itemId && selectedLocation));
	const insufficient = $derived(
		type !== 'adjustment' || direction === 'out' ? quantity > sourceStock : false
	);

	function text(key: string): string {
		return values[key] ?? '';
	}
</script>

<form method="POST" action="?/save" class="stock-form">
	<input type="hidden" name="type" value={type} />
	<input type="hidden" name="submissionId" value={values.submissionId} />

	<Card title="Detail transaksi" headingLevel={2}>
		<div class="form-grid">
			<div class="full">
				<Select
					label="Item inventory"
					name="itemId"
					required
					value={itemId}
					placeholder="Pilih item"
					options={options.items.map((item) => ({
						value: String(item.id),
						label: `${item.label} (${item.unitName ?? ''})`
					}))}
					error={fieldErrors.itemId}
					onchange={(event) => (itemOverride = event.currentTarget.value)}
				/>
			</div>

			{#if type === 'transfer'}
				<Select
					label="Lokasi asal"
					name="locationId"
					required
					value={locationId}
					placeholder="Pilih lokasi asal"
					options={options.locations.map((location) => ({
						value: String(location.id),
						label: location.label
					}))}
					error={fieldErrors.locationId}
					onchange={(event) => (locationOverride = event.currentTarget.value)}
				/>
				<Select
					label="Lokasi tujuan"
					name="destinationLocationId"
					required
					value={destinationLocationId}
					placeholder="Pilih lokasi tujuan"
					options={options.locations.map((location) => ({
						value: String(location.id),
						label: location.label
					}))}
					error={fieldErrors.destinationLocationId}
					onchange={(event) => (destinationOverride = event.currentTarget.value)}
				/>
			{:else}
				<Select
					label="Lokasi"
					name="locationId"
					required
					value={locationId}
					placeholder="Pilih lokasi"
					options={options.locations.map((location) => ({
						value: String(location.id),
						label: location.label
					}))}
					error={fieldErrors.locationId}
					onchange={(event) => (locationOverride = event.currentTarget.value)}
				/>
			{/if}

			{#if type === 'adjustment'}
				<Select
					label="Arah penyesuaian"
					name="direction"
					required
					value={direction}
					options={[
						{ value: 'in', label: 'Tambah stok (+)' },
						{ value: 'out', label: 'Kurangi stok (-)' }
					]}
					onchange={(event) => (directionOverride = event.currentTarget.value)}
				/>
			{/if}

			<Input
				label="Jumlah"
				name="quantity"
				type="number"
				min="1"
				step="1"
				required
				value={quantityValue}
				error={fieldErrors.quantity}
				oninput={(event) => (quantityOverride = event.currentTarget.value)}
			/>

			{#if showAvailability}
				<div class="full">
					<Alert
						tone={insufficient ? 'danger' : sourceStock === 0 ? 'warning' : 'info'}
						title={insufficient ? 'Stok tidak mencukupi' : 'Stok tersedia'}
					>
						{selectedItem?.label ?? 'Item'} di {selectedLocation?.label ?? 'lokasi'}:
						<strong>
							{sourceStock.toLocaleString('id-ID')}
							{selectedItem?.unitName ?? 'unit'}
						</strong>.
						{#if type === 'transfer' && selectedDestination}
							Stok di tujuan: {destinationStock.toLocaleString('id-ID')}
							{selectedItem?.unitName ?? 'unit'}.
						{/if}
					</Alert>
				</div>
			{/if}

			<div class="full">
				<Textarea
					label={type === 'adjustment' ? 'Alasan penyesuaian' : 'Alasan'}
					name="reason"
					required={type === 'adjustment'}
					value={text('reason')}
					hint={type === 'adjustment'
						? 'Wajib diisi untuk penyesuaian stok.'
						: 'Opsional, misalnya barang rusak, hilang, atau pemakaian internal.'}
					error={fieldErrors.reason}
				/>
			</div>

			<div class="full">
				<Textarea label="Catatan" name="notes" value={text('notes')} error={fieldErrors.notes} />
			</div>
		</div>
	</Card>

	<div class="form-actions">
		<Button type="submit">Simpan transaksi</Button>
		<a class="cancel-link" href={cancelHref}>Batal</a>
	</div>
</form>

<style>
	.stock-form {
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
