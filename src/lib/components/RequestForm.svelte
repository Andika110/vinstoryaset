<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Alert, Button, Card, Input, Select, Textarea } from './index.js';

	type ItemOption = {
		id: number;
		label: string;
		unitName: string;
		availableStock: number;
	};

	interface Props {
		values: Record<string, string>;
		fieldErrors?: Record<string, string>;
		options: { items: ItemOption[]; outletName: string };
		cancelHref: ResolvedPathname;
	}

	let { values, fieldErrors = {}, options, cancelHref }: Props = $props();

	type Row = { key: number; itemId: string; qty: string; notes: string };
	let rowKey = $state(0);
	let rows = $state<Row[]>([{ key: 0, itemId: '', qty: '1', notes: '' }]);

	function addRow(): void {
		rowKey += 1;
		rows = [...rows, { key: rowKey, itemId: '', qty: '1', notes: '' }];
	}

	function removeRow(key: number): void {
		rows = rows.filter((row) => row.key !== key);
	}

	function itemFor(row: Row): ItemOption | null {
		return options.items.find((item) => String(item.id) === row.itemId) ?? null;
	}

	function availableLabel(row: Row): string {
		const item = itemFor(row);
		if (!item) return 'Pilih item untuk melihat ringkasan stok umum.';
		return `Stok umum: ${item.availableStock.toLocaleString('id-ID')} ${item.unitName}`;
	}

	function text(key: string): string {
		return values[key] ?? '';
	}
</script>

<form method="POST" action="?/save" class="request-form">
	<input type="hidden" name="submissionId" value={values.submissionId} />

	<Card title="Informasi request" headingLevel={2}>
		<div class="form-grid">
			<div class="full">
				<Alert tone="info" title="Request untuk outlet">
					Request dibuat untuk <strong>{options.outletName}</strong> dan akan masuk antrean IT Support.
				</Alert>
			</div>
			<div class="full">
				<Textarea
					label="Alasan request"
					name="reason"
					value={text('reason')}
					hint="Jelaskan kebutuhan atau alasan permintaan."
					error={fieldErrors.reason}
				/>
			</div>
			<div class="full">
				<Textarea label="Catatan" name="notes" value={text('notes')} error={fieldErrors.notes} />
			</div>
		</div>
	</Card>

	<Card title="Item yang diminta" headingLevel={2}>
		<div class="rows">
			{#each rows as row (row.key)}
				<div class="request-row">
					<Select
						label="Item"
						name="lineItemId"
						value={row.itemId}
						placeholder="Pilih item"
						options={options.items.map((item) => ({
							value: String(item.id),
							label: item.label
						}))}
						onchange={(event) => (row.itemId = event.currentTarget.value)}
					/>
					<Input
						label="Qty"
						name="lineQty"
						type="number"
						min="1"
						step="1"
						value={row.qty}
						hint={availableLabel(row)}
						oninput={(event) => (row.qty = event.currentTarget.value)}
					/>
					<Input
						label="Catatan item"
						name="lineNotes"
						value={row.notes}
						oninput={(event) => (row.notes = event.currentTarget.value)}
					/>
					<div class="row-action">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={rows.length === 1}
							onclick={() => removeRow(row.key)}
						>
							Hapus
						</Button>
					</div>
				</div>
			{/each}
		</div>

		<div class="add-row">
			<Button type="button" variant="secondary" size="sm" onclick={addRow}>Tambah item</Button>
		</div>

		{#if fieldErrors.lines}
			<p class="line-error">{fieldErrors.lines}</p>
		{/if}
	</Card>

	<div class="form-actions">
		<Button type="submit">Kirim request</Button>
		<a class="cancel-link" href={cancelHref}>Batal</a>
	</div>
</form>

<style>
	.request-form {
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

	.rows {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.request-row {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border);
	}

	.request-row:last-child {
		border-bottom: 0;
		padding-bottom: 0;
	}

	.row-action {
		display: flex;
		align-items: flex-end;
	}

	.add-row {
		margin-top: var(--space-3);
	}

	.line-error {
		margin: var(--space-2) 0 0;
		color: var(--danger-text);
		font-size: var(--font-size-sm);
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

		.request-row {
			grid-template-columns: minmax(0, 2fr) 140px minmax(0, 1fr) auto;
			align-items: start;
		}
	}
</style>
