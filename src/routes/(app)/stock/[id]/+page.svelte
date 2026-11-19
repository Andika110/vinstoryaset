<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import { Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const document = $derived(data.document);
</script>

<svelte:head>
	<title>{document.documentNumber} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title={document.documentNumber}
		description="{document.typeLabel} · {document.dateLabel}"
	>
		{#snippet actions()}
			<StatusBadge label={document.typeLabel} tone={document.typeTone} />
			<a class="back-link" href={resolve('/(app)/stock')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	<div class="summary-grid">
		<div class="summary-card">
			<span class="summary-label">Total qty</span>
			<span class="summary-value">{document.totalQty.toLocaleString('id-ID')}</span>
		</div>
		<div class="summary-card">
			<span class="summary-label">Baris ledger</span>
			<span class="summary-value">{document.lines.length}</span>
		</div>
	</div>

	<div class="detail-grid">
		<Card title="Informasi transaksi" headingLevel={2}>
			<dl class="info-list">
				<div>
					<dt>Dokumen</dt>
					<dd class="font-mono">{document.documentNumber}</dd>
				</div>
				<div>
					<dt>Jenis</dt>
					<dd>{document.typeLabel}</dd>
				</div>
				<div>
					<dt>Waktu</dt>
					<dd>{document.createdAtLabel}</dd>
				</div>
				<div>
					<dt>Oleh</dt>
					<dd>{document.performedByName}</dd>
				</div>
				{#if document.sourceLocationName}
					<div>
						<dt>Lokasi asal</dt>
						<dd>{document.sourceLocationName}</dd>
					</div>
				{/if}
				{#if document.destinationLocationName}
					<div>
						<dt>Lokasi tujuan</dt>
						<dd>{document.destinationLocationName}</dd>
					</div>
				{/if}
				{#if document.referenceLabel}
					<div>
						<dt>Referensi</dt>
						<dd>
							{#if document.referenceHref}
								<a href={resolveHref(document.referenceHref)}>{document.referenceLabel}</a>
							{:else}
								{document.referenceLabel}
							{/if}
						</dd>
					</div>
				{/if}
				<div class="full">
					<dt>Alasan</dt>
					<dd>{document.reason ?? '—'}</dd>
				</div>
				<div class="full">
					<dt>Catatan</dt>
					<dd>{document.notes ?? '—'}</dd>
				</div>
			</dl>
		</Card>

		<Card title="Baris ledger" headingLevel={2}>
			<ul class="line-list">
				{#each document.lines as line (line.id)}
					<li>
						<div class="line-main">
							<a
								class="line-title"
								href={resolve('/(app)/inventory/[id]', { id: String(line.itemId) })}
							>
								{line.itemCode} · {line.itemName}
							</a>
							<span class="line-meta">
								{line.typeLabel} · {line.locationName}
								{#if line.notes}
									· {line.notes}
								{/if}
							</span>
						</div>
						<span class:negative={line.signedQty < 0} class="qty">{line.qtyLabel}</span>
					</li>
				{/each}
			</ul>
		</Card>
	</div>

	<p class="readonly-note">
		Transaksi stok bersifat read-only. Koreksi dilakukan dengan transaksi penyesuaian baru, bukan
		dengan mengubah atau menghapus ledger.
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

	.line-title {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		overflow-wrap: anywhere;
	}

	.line-meta {
		color: var(--text-2);
		font-size: var(--font-size-xs);
		overflow-wrap: anywhere;
	}

	.qty {
		flex: none;
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		color: var(--success-text);
	}

	.qty.negative {
		color: var(--danger-text);
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
