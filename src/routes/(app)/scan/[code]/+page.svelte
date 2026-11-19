<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import { Alert, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const asset = $derived(data.asset);
	const detailHref = $derived(resolve('/(app)/assets/[id]', { id: String(asset.id) }));
	const printHref = $derived(resolveHref(`/assets/labels/print?ids=${asset.id}`));
</script>

<svelte:head>
	<title>{asset.assetCode} — Hasil scan</title>
</svelte:head>

<main class="container page">
	<PageHeader title="Hasil scan" description="Aset ditemukan dari kode QR.">
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/scan')}>Scan lagi</a>
		{/snippet}
	</PageHeader>

	<Card>
		<div class="summary-head">
			<div>
				<p class="eyebrow font-mono">{asset.assetCode}</p>
				<h2>{asset.name}</h2>
				<p class="muted">{asset.outletName} · {asset.locationName}</p>
			</div>
			<StatusBadge label={asset.statusLabel} tone={asset.statusTone} />
		</div>

		<dl class="info-grid">
			<div>
				<dt>Kode aset</dt>
				<dd class="font-mono">{asset.assetCode}</dd>
			</div>
			<div>
				<dt>Kategori</dt>
				<dd>{asset.categoryName}</dd>
			</div>
			<div>
				<dt>Serial number</dt>
				<dd>{asset.serialNumber ?? '—'}</dd>
			</div>
			<div>
				<dt>Kondisi</dt>
				<dd>{asset.conditionName}</dd>
			</div>
			<div>
				<dt>Outlet</dt>
				<dd>{asset.outletName}</dd>
			</div>
			<div>
				<dt>Lokasi</dt>
				<dd>{asset.locationName}</dd>
			</div>
		</dl>

		<div class="actions">
			<a class="button-link" href={detailHref}>Buka detail aset</a>
			<a class="button-link secondary" href={printHref}>Cetak label QR</a>
		</div>
	</Card>

	<div class="notice">
		<Alert tone="info" title="Akses sesuai cakupan">
			Ringkasan ini tidak memuat informasi biaya. Jika aset berada di luar outlet Anda, sistem akan
			menampilkan halaman tidak ditemukan.
		</Alert>
	</div>
</main>

<style>
	.summary-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.eyebrow {
		margin: 0 0 var(--space-1);
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.summary-head h2 {
		margin: 0;
		font-size: var(--font-size-xl);
		overflow-wrap: anywhere;
	}

	.muted {
		margin: var(--space-1) 0 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
		margin: var(--space-4) 0 0;
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.info-grid dt {
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.info-grid dd {
		margin: 2px 0 0;
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
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

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.notice {
		margin-top: var(--space-4);
	}

	@media (min-width: 768px) {
		.info-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
