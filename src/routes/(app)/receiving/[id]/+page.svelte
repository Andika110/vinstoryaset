<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { PageData, PageProps } from './$types';

	let { data }: PageProps = $props();

	type Line = PageData['receipt']['lines'][number];

	const receipt = $derived(data.receipt);
	const currency = new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 2
	});

	function formatCost(value: string | null): string {
		if (!value) return '—';
		const parsed = Number(value);
		return Number.isFinite(parsed) ? currency.format(parsed) : value;
	}

	function lineTitle(line: Line): string {
		return line.lineType === 'asset'
			? `${line.assetCode ?? '—'} · ${line.assetName ?? 'Aset'}`
			: `${line.itemCode ?? '—'} · ${line.itemName ?? 'Item'}`;
	}

	function lineHref(line: Line) {
		if (line.lineType === 'asset' && line.assetId) {
			return resolve('/(app)/assets/[id]', { id: String(line.assetId) });
		}
		if (line.lineType === 'inventory' && line.inventoryItemId) {
			return resolve('/(app)/inventory/[id]', {
				id: String(line.inventoryItemId)
			});
		}
		return null;
	}
</script>

<svelte:head>
	<title>{receipt.receiptNumber} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title={receipt.receiptNumber}
		description="{receipt.typeLabel} · {receipt.receiptDateLabel} · {receipt.outletName}"
	>
		{#snippet actions()}
			<StatusBadge label={receipt.typeLabel} tone={receipt.typeTone} />
			<a class="back-link" href={resolve('/(app)/receiving')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	<div class="summary-grid">
		<div class="summary-card">
			<span class="summary-label">Total unit</span>
			<span class="summary-value">{receipt.summary.totalUnits.toLocaleString('id-ID')}</span>
		</div>
		<div class="summary-card">
			<span class="summary-label">Aset dibuat</span>
			<span class="summary-value">{receipt.summary.assetUnits.toLocaleString('id-ID')}</span>
		</div>
		<div class="summary-card">
			<span class="summary-label">Qty inventory</span>
			<span class="summary-value">{receipt.summary.inventoryQty.toLocaleString('id-ID')}</span>
		</div>
		<div class="summary-card">
			<span class="summary-label">Baris</span>
			<span class="summary-value">{receipt.summary.lineCount.toLocaleString('id-ID')}</span>
		</div>
	</div>

	<div class="detail-grid">
		<Card title="Informasi penerimaan" headingLevel={2}>
			<dl class="info-list">
				<div>
					<dt>Receipt</dt>
					<dd class="font-mono">{receipt.receiptNumber}</dd>
				</div>
				<div>
					<dt>Tanggal</dt>
					<dd>{receipt.receiptDateLabel}</dd>
				</div>
				<div>
					<dt>Jenis</dt>
					<dd>{receipt.typeLabel}</dd>
				</div>
				<div>
					<dt>Supplier</dt>
					<dd>{receipt.supplierName ?? '—'}</dd>
				</div>
				<div>
					<dt>Lokasi</dt>
					<dd>{receipt.outletName} · {receipt.locationName}</dd>
				</div>
				<div>
					<dt>Referensi</dt>
					<dd class="font-mono">{receipt.referenceNumber ?? '—'}</dd>
				</div>
				<div>
					<dt>Diterima oleh</dt>
					<dd>{receipt.receivedByName}</dd>
				</div>
				<div>
					<dt>Dibuat</dt>
					<dd>{receipt.createdAtLabel}</dd>
				</div>
				<div class="full">
					<dt>Catatan</dt>
					<dd>{receipt.notes ?? '—'}</dd>
				</div>
			</dl>
		</Card>

		<Card title="Item diterima" headingLevel={2}>
			{#if receipt.lines.length === 0}
				<Alert tone="warning" title="Tidak ada baris penerimaan">
					Receipt ini tidak memiliki baris item.
				</Alert>
			{:else}
				<ul class="line-list">
					{#each receipt.lines as line (line.id)}
						{@const href = lineHref(line)}
						<li>
							<div class="line-main">
								<div class="line-head">
									<StatusBadge
										label={line.lineType === 'asset' ? 'Aset' : 'Inventory'}
										tone={line.lineType === 'asset' ? 'info' : 'success'}
										size="sm"
									/>
									{#if line.lineType === 'asset' && line.assetStatusLabel}
										<StatusBadge label={line.assetStatusLabel} tone="neutral" size="sm" />
									{/if}
								</div>
								{#if href}
									<a class="line-title" {href}>{lineTitle(line)}</a>
								{:else}
									<span class="line-title">{lineTitle(line)}</span>
								{/if}
								{#if line.notes}
									<span class="line-notes">{line.notes}</span>
								{/if}
							</div>
							<div class="line-side">
								<span class="qty">
									{line.quantity.toLocaleString('id-ID')}
									{line.lineType === 'inventory' ? (line.unitName ?? '') : 'unit'}
								</span>
								<span class="cost">{formatCost(line.unitCost)} / unit</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	</div>

	<p class="readonly-note">
		Receipt bersifat read-only. Perubahan stok atau aset setelah penerimaan dilakukan melalui
		transaksi lanjutan, bukan dengan mengedit receipt.
	</p>
</main>

<style>
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
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

	.line-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.line-list li {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) 0;
	}

	.line-list li + li {
		border-top: 1px solid var(--border);
	}

	.line-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.line-head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-bottom: 2px;
	}

	.line-title {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		overflow-wrap: anywhere;
	}

	.line-notes {
		color: var(--text-2);
		font-size: var(--font-size-xs);
		overflow-wrap: anywhere;
	}

	.line-side {
		display: flex;
		flex: none;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.qty {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.cost {
		color: var(--text-3);
		font-size: var(--font-size-xs);
		white-space: nowrap;
	}

	.readonly-note {
		margin: var(--space-5) 0 0;
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 900px) {
		.summary-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

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
