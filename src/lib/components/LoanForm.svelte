<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Alert, Button, Card, Input, Select, Textarea } from './index.js';

	type AssetOption = { id: number; label: string; locationLabel: string };
	type EmployeeOption = { id: number; label: string; fullName: string };
	type Option = { id: number; label: string };

	interface Props {
		values: Record<string, string>;
		fieldErrors?: Record<string, string>;
		options: { assets: AssetOption[]; employees: EmployeeOption[]; conditions: Option[] };
		cancelHref: ResolvedPathname;
	}

	let { values, fieldErrors = {}, options, cancelHref }: Props = $props();

	let assetOverride = $state<string | null>(null);
	let borrowerOverride = $state<string | null>(null);

	const assetId = $derived(assetOverride ?? values.assetId ?? '');
	const borrowerName = $derived(borrowerOverride ?? values.borrowerName ?? '');
	const selectedAsset = $derived(
		options.assets.find((asset) => String(asset.id) === assetId) ?? null
	);

	function text(key: string): string {
		return values[key] ?? '';
	}

	function onEmployeeChange(value: string): void {
		const employee = options.employees.find((item) => String(item.id) === value);
		if (employee) borrowerOverride = employee.fullName;
	}
</script>

<form method="POST" action="?/save" class="loan-form">
	<input type="hidden" name="submissionId" value={values.submissionId} />

	<Card title="Detail peminjaman" headingLevel={2}>
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
					<Alert tone="info" title="Aset tersedia">
						{selectedAsset.label}. Lokasi saat ini:
						<strong>{selectedAsset.locationLabel}</strong>.
					</Alert>
				</div>
			{/if}

			<Select
				label="Employee peminjam"
				name="employeeId"
				value={text('employeeId')}
				placeholder="Tidak ada / peminjam eksternal"
				options={options.employees.map((employee) => ({
					value: String(employee.id),
					label: employee.label
				}))}
				hint="Opsional. Nama peminjam tetap wajib diisi."
				error={fieldErrors.employeeId}
				onchange={(event) => onEmployeeChange(event.currentTarget.value)}
			/>

			<Input
				label="Nama peminjam"
				name="borrowerName"
				required
				value={borrowerName}
				error={fieldErrors.borrowerName}
				oninput={(event) => (borrowerOverride = event.currentTarget.value)}
			/>

			<Input
				label="Tanggal pinjam"
				name="borrowingDate"
				type="date"
				required
				value={text('borrowingDate')}
				error={fieldErrors.borrowingDate}
			/>

			<Input
				label="Rencana tanggal kembali"
				name="expectedReturnDate"
				type="date"
				required
				value={text('expectedReturnDate')}
				error={fieldErrors.expectedReturnDate}
			/>

			<Select
				label="Kondisi awal"
				name="conditionBeforeId"
				required
				value={text('conditionBeforeId')}
				placeholder="Pilih kondisi"
				options={options.conditions.map((condition) => ({
					value: String(condition.id),
					label: condition.label
				}))}
				error={fieldErrors.conditionBeforeId}
			/>

			<div class="full">
				<Textarea label="Catatan" name="notes" value={text('notes')} error={fieldErrors.notes} />
			</div>
		</div>
	</Card>

	<div class="form-actions">
		<Button type="submit">Simpan peminjaman</Button>
		<a class="cancel-link" href={cancelHref}>Batal</a>
	</div>
</form>

<style>
	.loan-form {
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
