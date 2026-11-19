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
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const actionData = $derived(
		form as {
			values?: Record<string, string>;
			fieldErrors?: Record<string, string>;
			error?: string;
		} | null
	);

	const values = $derived(
		actionData?.values ?? {
			assetId: data.selectedAssetId,
			employeeId: '',
			departmentId: '',
			locationId: data.defaultLocationId,
			assignmentDate: data.defaultDate,
			notes: '',
			submissionId: data.submissionId
		}
	);

	let assetOverride = $state<string | null>(null);
	let locationOverride = $state<string | null>(null);
	let employeeOverride = $state<string | null>(null);
	let departmentOverride = $state<string | null>(null);

	const assetId = $derived(assetOverride ?? values.assetId ?? '');
	const locationId = $derived(locationOverride ?? values.locationId ?? '');
	const employeeId = $derived(employeeOverride ?? values.employeeId ?? '');
	const departmentId = $derived(departmentOverride ?? values.departmentId ?? '');

	const selectedAsset = $derived(
		data.options.assets.find((asset) => String(asset.id) === assetId) ?? null
	);

	function onAssetChange(value: string): void {
		assetOverride = value;
		const asset = data.options.assets.find((item) => String(item.id) === value);
		if (asset) locationOverride = String(asset.locationId);
	}

	function onEmployeeChange(value: string): void {
		employeeOverride = value;
		const employee = data.options.employees.find((item) => String(item.id) === value);
		if (employee?.departmentId) departmentOverride = String(employee.departmentId);
	}

	const noteTitle = $derived(
		selectedAsset
			? `Aset saat ini: ${selectedAsset.locationLabel}`
			: 'Pilih aset yang akan ditempatkan.'
	);
</script>

<svelte:head>
	<title>Tambah penempatan — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Tambah penempatan"
		description="Catat penempatan aset ke karyawan, department, dan lokasi."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/assets/assignments')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="form-alert">
			<Alert tone="danger" title="Gagal menyimpan">{actionData.error}</Alert>
		</div>
	{/if}

	{#if data.options.assets.length === 0}
		<div class="form-alert">
			<Alert tone="warning" title="Tidak ada aset yang dapat ditempatkan">
				Hanya aset berstatus Available atau In Use yang dapat ditempatkan. Tambahkan aset terlebih
				dahulu atau selesaikan proses peminjaman/maintenance.
			</Alert>
		</div>
	{/if}

	<Card title="Detail penempatan" headingLevel={2}>
		<form method="POST" action="?/save" class="form-grid">
			<input type="hidden" name="submissionId" value={values.submissionId} />

			<div class="full">
				<Select
					label="Aset"
					name="assetId"
					required
					value={assetId}
					placeholder="Pilih aset"
					options={data.options.assets.map((asset) => ({
						value: String(asset.id),
						label: asset.label
					}))}
					hint={noteTitle}
					error={actionData?.fieldErrors?.assetId}
					onchange={(event) => onAssetChange(event.currentTarget.value)}
				/>
			</div>

			<Select
				label="Employee"
				name="employeeId"
				value={employeeId}
				placeholder="Tanpa karyawan"
				options={data.options.employees.map((employee) => ({
					value: String(employee.id),
					label: employee.label
				}))}
				hint="Opsional. Tanpa karyawan, aset dianggap berada di lokasi/gudang dan berstatus Available."
				error={actionData?.fieldErrors?.employeeId}
				onchange={(event) => onEmployeeChange(event.currentTarget.value)}
			/>

			<Select
				label="Department"
				name="departmentId"
				value={departmentId}
				placeholder="Tidak ada"
				options={data.options.departments.map((department) => ({
					value: String(department.id),
					label: department.label
				}))}
				error={actionData?.fieldErrors?.departmentId}
			/>

			<Select
				label="Lokasi tujuan"
				name="locationId"
				required
				value={locationId}
				placeholder="Pilih lokasi"
				options={data.options.locations.map((location) => ({
					value: String(location.id),
					label: location.label
				}))}
				hint="Employee, department, dan lokasi harus berada di outlet yang sama."
				error={actionData?.fieldErrors?.locationId}
			/>

			<Input
				label="Tanggal penempatan"
				name="assignmentDate"
				type="date"
				required
				value={values.assignmentDate}
				error={actionData?.fieldErrors?.assignmentDate}
			/>

			<div class="full">
				<Textarea
					label="Catatan"
					name="notes"
					value={values.notes}
					hint="Catatan tambahan untuk penempatan ini."
					error={actionData?.fieldErrors?.notes}
				/>
			</div>

			<div class="full form-actions">
				<Button type="submit">Simpan penempatan</Button>
				<a class="cancel-link" href={resolve('/(app)/assets')}>Batal</a>
			</div>
		</form>
	</Card>
</main>

<style>
	.form-alert {
		margin-bottom: var(--space-4);
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
		padding-top: var(--space-2);
	}

	.back-link,
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
