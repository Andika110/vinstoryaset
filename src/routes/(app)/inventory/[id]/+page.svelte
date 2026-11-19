<script lang="ts">
	import { resolve } from '$app/paths';
	import { ActivityList, Alert, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { ActivityRowData } from '#lib/dashboard.js';
	import type { PageData, PageProps } from './$types';

	let { data }: PageProps = $props();

	type Transaction = PageData['item']['transactions'][number];

	const item = $derived(data.item);
	const editHref = $derived(resolve('/(app)/inventory/[id]/edit', { id: String(item.id) }));

	const transactionRows = $derived<ActivityRowData[]>(
		item.transactions.map((entry: Transaction) => ({
			id: String(entry.id),
			title: `${entry.typeLabel} ${entry.qtyLabel}`,
			subtitle: `${entry.locationName} · ${entry.documentNumber}`,
			meta: `${entry.dateLabel} · ${entry.performedByName}`,
			badge: { label: entry.typeLabel, tone: entry.tone }
		}))
	);

	function minStockLabel(value: number | null): string {
		return value === null ? 'Tidak dipantau' : `${value.toLocaleString('id-ID')} ${item.unitName}`;
	}
</script>

<svelte:head>
	<title>{item.itemCode} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="{item.itemCode} · {item.name}"
		description="{item.categoryName} · {item.unitName}"
	>
		{#snippet actions()}
			<StatusBadge label={item.statusLabel} tone={item.statusTone} />
			{#if item.canEdit}
				<a class="button-link" href={editHref}>Edit item</a>
			{/if}
			<a class="back-link" href={resolve('/(app)/inventory')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if !item.isActive}
		<div class="notice">
			<Alert tone="info" title="Item nonaktif">
				Item ini tidak muncul di pilihan transaksi baru. Stok dan riwayat lama tetap tersimpan.
			</Alert>
		</div>
	{/if}

	{#if item.statusTone === 'danger' || item.statusTone === 'warning'}
		<div class="notice">
			<Alert
				tone={item.statusTone === 'danger' ? 'danger' : 'warning'}
				title={item.statusTone === 'danger' ? 'Stok habis' : 'Stok menipis'}
			>
				{item.outCount} lokasi tanpa stok dan {item.lowCount} lokasi berada pada atau di bawah minimum.
			</Alert>
		</div>
	{/if}

	<div class="summary-grid">
		<div class="summary-card">
			<span class="summary-label">Total stok</span>
			<span class="summary-value">{item.totalStock.toLocaleString('id-ID')} {item.unitName}</span>
		</div>
		<div class="summary-card">
			<span class="summary-label">Lokasi dipantau</span>
			<span class="summary-value">{item.balances.length}</span>
		</div>
		<div class="summary-card">
			<span class="summary-label">Status stok</span>
			<span class="summary-value">
				<StatusBadge label={item.statusLabel} tone={item.statusTone} />
			</span>
		</div>
	</div>

	<div class="detail-grid">
		<Card title="Informasi item" headingLevel={2}>
			<dl class="info-list">
				<div>
					<dt>Item Code</dt>
					<dd class="font-mono">{item.itemCode}</dd>
				</div>
				<div>
					<dt>Nama</dt>
					<dd>{item.name}</dd>
				</div>
				<div>
					<dt>Kategori</dt>
					<dd>{item.categoryName}</dd>
				</div>
				<div>
					<dt>Brand</dt>
					<dd>{item.brandName ?? '—'}</dd>
				</div>
				<div>
					<dt>Unit</dt>
					<dd>{item.unitName}</dd>
				</div>
				<div>
					<dt>Status item</dt>
					<dd>{item.isActive ? 'Aktif' : 'Nonaktif'}</dd>
				</div>
				<div class="full">
					<dt>Deskripsi</dt>
					<dd>{item.description ?? '—'}</dd>
				</div>
			</dl>
		</Card>

		<Card title="Stok per lokasi" headingLevel={2}>
			{#if item.balances.length === 0}
				<div class="empty">
					<p>Belum ada saldo stok.</p>
					<p class="text-muted">
						Stok awal diisi melalui penerimaan atau saldo awal, bukan dari form item.
					</p>
				</div>
			{:else}
				<ul class="balance-list">
					{#each item.balances as balance (balance.locationId)}
						<li>
							<div class="balance-main">
								<strong>{balance.outletName} · {balance.locationName}</strong>
								<span>Minimum: {minStockLabel(balance.minStock)}</span>
							</div>
							<div class="balance-side">
								<span class="qty">{balance.qty.toLocaleString('id-ID')} {item.unitName}</span>
								<StatusBadge label={balance.statusLabel} tone={balance.statusTone} size="sm" />
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	</div>

	<div class="timeline">
		<ActivityList
			title="Riwayat transaksi stok"
			rows={transactionRows}
			emptyTitle="Belum ada transaksi stok"
			emptyDescription="Transaksi masuk, keluar, transfer, dan penyesuaian akan tampil di sini."
		/>
	</div>
</main>

<style>
	.notice {
		margin-bottom: var(--space-4);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.button-link:hover {
		background: var(--primary-hover);
		color: var(--primary-contrast);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.summary-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-1);
	}

	.summary-label {
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.summary-value {
		font-size: var(--font-size-2xl);
		font-weight: var(--weight-semibold);
		font-variant-numeric: tabular-nums;
		line-height: 1.15;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.info-list {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-2);
		margin: 0;
	}

	.info-list div {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.info-list dt {
		color: var(--text-2);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-medium);
	}

	.info-list dd {
		margin: 0;
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}

	.balance-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.balance-list li {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) 0;
	}

	.balance-list li + li {
		border-top: 1px solid var(--border);
	}

	.balance-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.balance-main strong {
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}

	.balance-main span {
		color: var(--text-2);
		font-size: var(--font-size-xs);
	}

	.balance-side {
		display: flex;
		flex: none;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
	}

	.qty {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.empty {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-4);
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.empty p {
		margin: 0;
		font-size: var(--font-size-sm);
	}

	.timeline {
		margin-top: var(--space-4);
	}

	@media (min-width: 640px) {
		.summary-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (min-width: 900px) {
		.detail-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.info-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.info-list .full {
			grid-column: 1 / -1;
		}
	}
</style>
