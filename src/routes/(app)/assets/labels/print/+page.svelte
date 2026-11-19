<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, PageHeader } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Cetak Label QR — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<div class="no-print">
		<PageHeader
			title="Cetak label QR"
			description="{data.assets.length} label siap dicetak pada kertas A4 (grid 3 kolom)."
		>
			{#snippet actions()}
				<a class="button-link secondary" href={resolve('/(app)/assets/labels')}>
					Kembali pilih aset
				</a>
			{/snippet}
		</PageHeader>

		{#if data.assets.length === 0}
			<Alert tone="warning" title="Tidak ada aset terpilih">
				Pilih minimal satu aset pada halaman Label QR Aset, lalu tekan Cetak label.
			</Alert>
		{:else}
			{#if data.requested > data.assets.length}
				<Alert tone="info" title="Sebagian aset tidak dicetak">
					{data.requested - data.assets.length} aset dilewati karena di luar cakupan akses atau melebihi
					batas 100 label per cetak.
				</Alert>
			{/if}
			<div class="toolbar">
				<button type="button" class="button-link" onclick={() => window.print()}>
					Cetak sekarang
				</button>
				<p>
					Atur ukuran kertas <strong>A4</strong>, margin <strong>default</strong>, dan skala
					<strong>100%</strong>. Label berukuran 60 × 35 mm.
				</p>
			</div>
		{/if}
	</div>

	{#if data.assets.length > 0}
		<section class="sheet" aria-label="Lembar label QR">
			{#each data.assets as asset (asset.id)}
				<article class="label">
					<div class="qr">
						<img src={asset.qrDataUrl} alt="QR {asset.assetCode}" width="128" height="128" />
					</div>
					<div class="label-text">
						<strong class="label-code">{asset.assetCode}</strong>
						<span class="label-name">{asset.name}</span>
						<span class="label-meta">{asset.categoryName}</span>
						<span class="label-meta">{asset.outletName} · {asset.locationName}</span>
					</div>
				</article>
			{/each}
		</section>
	{/if}
</main>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		margin: var(--space-4) 0;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.toolbar p {
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
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
		cursor: pointer;
	}

	.button-link.secondary {
		background: var(--surface);
		color: var(--primary);
	}

	.sheet {
		display: grid;
		grid-template-columns: repeat(3, 60mm);
		gap: 4mm;
		align-content: start;
		justify-content: start;
		margin-top: var(--space-4);
		padding: 4mm;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: #ffffff;
		color: #000000;
	}

	.label {
		display: flex;
		gap: 2.5mm;
		box-sizing: border-box;
		width: 60mm;
		height: 35mm;
		padding: 2.5mm;
		border: 1px dashed #b0b0b0;
		background: #ffffff;
		color: #000000;
		overflow: hidden;
		break-inside: avoid;
		page-break-inside: avoid;
	}

	.qr {
		flex: 0 0 27mm;
		width: 27mm;
		height: 27mm;
	}

	.qr :global(img) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.label-text {
		display: flex;
		flex-direction: column;
		gap: 0.8mm;
		min-width: 0;
		overflow: hidden;
	}

	.label-code {
		font-family: var(--font-mono);
		font-size: 9pt;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	.label-name {
		display: -webkit-box;
		overflow: hidden;
		font-size: 7.5pt;
		line-height: 1.2;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.label-meta {
		overflow: hidden;
		font-size: 6.5pt;
		line-height: 1.2;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@page {
		size: A4;
		margin: 10mm;
	}

	@media print {
		:global(.sidebar),
		:global(.topbar),
		:global(.bottom-nav),
		:global(.skip-link),
		.no-print {
			display: none !important;
		}

		:global(.app-shell) {
			display: block;
		}

		:global(.app-main),
		:global(.app-content) {
			margin: 0 !important;
			padding: 0 !important;
			max-width: none !important;
		}

		:global(body) {
			background: #ffffff;
		}

		.page {
			max-width: none;
			margin: 0;
			padding: 0;
		}

		.sheet {
			margin: 0;
			padding: 0;
			border: 0;
			border-radius: 0;
			gap: 4mm;
		}

		.label {
			border-color: #d0d0d0;
		}
	}
</style>
