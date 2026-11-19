<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import {
		EmptyState,
		NoResultState,
		PageHeader,
		Pagination,
		SearchFilter,
		StatusBadge
	} from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let selected = $state<number[]>([]);

	const filters = $derived([
		{
			name: 'category',
			label: 'Kategori',
			value: data.category,
			options: [
				{ value: '', label: 'Semua kategori' },
				...data.filters.categories.map((category) => ({
					value: String(category.id),
					label: category.label
				}))
			]
		},
		{
			name: 'location',
			label: 'Lokasi',
			value: data.location,
			options: [
				{ value: '', label: 'Semua lokasi' },
				...data.filters.locations.map((location) => ({
					value: String(location.id),
					label: location.label
				}))
			]
		},
		{
			name: 'status',
			label: 'Status',
			value: data.status,
			options: [
				{ value: '', label: 'Semua status' },
				...data.statuses.map((status) => ({ value: status.value, label: status.label }))
			]
		}
	]);

	const hasFilter = $derived(Boolean(data.search || data.category || data.location || data.status));
	const pageIds = $derived(data.items.map((item) => item.id));
	const allSelected = $derived(pageIds.length > 0 && pageIds.every((id) => selected.includes(id)));
	const printHref = $derived(
		resolveHref(
			selected.length > 0 ? `/assets/labels/print?ids=${selected.join(',')}` : '/assets/labels'
		)
	);

	function toggle(id: number): void {
		selected = selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id];
	}

	function toggleAll(): void {
		if (allSelected) {
			selected = selected.filter((id) => !pageIds.includes(id));
			return;
		}
		selected = [...new Set([...selected, ...pageIds])];
	}

	function preventWhenEmpty(event: MouseEvent): void {
		if (selected.length === 0) event.preventDefault();
	}
</script>

<svelte:head>
	<title>Label QR Aset — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Label QR Aset"
		description="Pilih aset lalu cetak label QR berisi Asset Code untuk mempercepat stock opname."
	>
		{#snippet actions()}
			<a class="button-link secondary" href={resolve('/(app)/scan')}>Scan QR</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari kode, nama, atau serial number…"
		{filters}
		resultCount={data.total}
	/>

	<div class="selection-bar">
		<p>
			<strong>{selected.length}</strong> aset dipilih
			{#if selected.length > 0}
				<button type="button" class="text-button" onclick={() => (selected = [])}>
					Hapus pilihan
				</button>
			{/if}
		</p>
		<a
			class="button-link"
			class:disabled={selected.length === 0}
			href={printHref}
			target="_blank"
			rel="noopener"
			aria-disabled={selected.length === 0}
			onclick={preventWhenEmpty}
		>
			Cetak label ({selected.length})
		</a>
	</div>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/assets/labels')} />
			{:else}
				<EmptyState
					title="Belum ada aset"
					description="Daftarkan aset terlebih dahulu sebelum mencetak label QR."
				/>
			{/if}
		{:else}
			<div class="table-scroll desktop-only">
				<table class="label-table">
					<thead>
						<tr>
							<th scope="col" class="check-cell">
								<input
									type="checkbox"
									checked={allSelected}
									onchange={toggleAll}
									aria-label="Pilih semua aset pada halaman ini"
								/>
							</th>
							<th scope="col">Kode</th>
							<th scope="col">Nama</th>
							<th scope="col">Kategori</th>
							<th scope="col">Lokasi</th>
							<th scope="col">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.items as asset (asset.id)}
							<tr class:selected={selected.includes(asset.id)}>
								<td class="check-cell">
									<input
										type="checkbox"
										checked={selected.includes(asset.id)}
										onchange={() => toggle(asset.id)}
										aria-label="Pilih {asset.assetCode}"
									/>
								</td>
								<td class="font-mono">{asset.assetCode}</td>
								<td>{asset.name}</td>
								<td>{asset.categoryName}</td>
								<td>{asset.outletName} · {asset.locationName}</td>
								<td><StatusBadge label={asset.statusLabel} tone={asset.statusTone} size="sm" /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<ul class="mobile-list">
				{#each data.items as asset (asset.id)}
					<li>
						<label class="asset-card" class:selected={selected.includes(asset.id)}>
							<input
								type="checkbox"
								checked={selected.includes(asset.id)}
								onchange={() => toggle(asset.id)}
							/>
							<span class="asset-card-body">
								<span class="asset-code font-mono">{asset.assetCode}</span>
								<strong>{asset.name}</strong>
								<span class="asset-meta">{asset.categoryName}</span>
								<span class="asset-meta">{asset.outletName} · {asset.locationName}</span>
								<StatusBadge label={asset.statusLabel} tone={asset.statusTone} size="sm" />
							</span>
						</label>
					</li>
				{/each}
			</ul>

			<Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
		{/if}
	</div>
</main>

<style>
	.selection-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-top: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.selection-bar p {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		margin: 0;
		font-size: var(--font-size-sm);
	}

	.text-button {
		padding: 0;
		border: 0;
		background: none;
		color: var(--primary);
		font-size: var(--font-size-sm);
		text-decoration: underline;
		cursor: pointer;
	}

	.list-area {
		margin-top: var(--space-4);
	}

	.table-scroll {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.label-table {
		width: 100%;
		min-width: 760px;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	.label-table th,
	.label-table td {
		padding: var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}

	.label-table th {
		background: var(--surface-2);
		font-weight: var(--weight-semibold);
		white-space: nowrap;
	}

	.label-table tbody tr:last-child td {
		border-bottom: 0;
	}

	.label-table tr.selected {
		background: var(--primary-soft);
	}

	.check-cell {
		width: 1%;
		white-space: nowrap;
	}

	.check-cell input,
	.asset-card input {
		width: 20px;
		height: 20px;
		accent-color: var(--primary);
	}

	.mobile-list {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.asset-card {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		cursor: pointer;
	}

	.asset-card.selected {
		border-color: var(--primary);
		background: var(--primary-soft);
	}

	.asset-card-body {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.asset-card-body strong {
		overflow-wrap: anywhere;
	}

	.asset-code {
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.asset-meta {
		color: var(--text-2);
		font-size: var(--font-size-xs);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border: 1px solid var(--primary);
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
	}

	.button-link.secondary {
		background: var(--surface);
		color: var(--primary);
	}

	.button-link.disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	@media (max-width: 767px) {
		.desktop-only {
			display: none;
		}
	}

	@media (min-width: 768px) {
		.mobile-list {
			display: none;
		}
	}
</style>
