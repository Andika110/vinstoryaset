<script lang="ts">
	import { resolve } from '$app/paths';
	import { ActivityList, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { ActivityRowData } from '#lib/dashboard.js';
	import type { PageData, PageProps } from './$types';

	let { data }: PageProps = $props();

	type TimelineEntry = PageData['mutation']['timeline'][number];

	const mutation = $derived(data.mutation);
	const assetHref = $derived(resolve('/(app)/assets/[id]', { id: String(mutation.assetId) }));

	const timelineRows = $derived<ActivityRowData[]>(
		mutation.timeline.map((entry: TimelineEntry) => ({
			id: String(entry.id),
			title: entry.title,
			subtitle: entry.description,
			meta: entry.meta,
			badge: { label: entry.typeLabel, tone: entry.tone }
		}))
	);
</script>

<svelte:head>
	<title>{mutation.movementNumber ?? 'Mutasi'} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title={mutation.movementNumber ?? 'Mutasi aset'}
		description="{mutation.assetCode} · {mutation.mutationDateLabel}"
	>
		{#snippet actions()}
			<StatusBadge label="Mutasi" tone="warning" />
			<a class="button-link" href={assetHref}>Lihat aset</a>
			<a class="back-link" href={resolve('/(app)/assets/mutations')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	<div class="detail-grid">
		<Card title="Informasi mutasi" headingLevel={2}>
			<dl class="info-list">
				<div>
					<dt>Nomor</dt>
					<dd class="font-mono">{mutation.movementNumber ?? '—'}</dd>
				</div>
				<div>
					<dt>Tanggal</dt>
					<dd>{mutation.mutationDateLabel}</dd>
				</div>
				<div>
					<dt>Aset</dt>
					<dd><a href={assetHref}>{mutation.assetCode} · {mutation.assetName}</a></dd>
				</div>
				<div>
					<dt>Status aset</dt>
					<dd>{mutation.assetStatusLabel}</dd>
				</div>
				<div>
					<dt>Lokasi asal</dt>
					<dd>{mutation.fromLocationName ?? '—'}</dd>
				</div>
				<div>
					<dt>Lokasi tujuan</dt>
					<dd>{mutation.toLocationName ?? '—'}</dd>
				</div>
				<div>
					<dt>Pemegang asal</dt>
					<dd>{mutation.fromEmployeeName ?? '—'}</dd>
				</div>
				<div>
					<dt>Pemegang saat ini</dt>
					<dd>{mutation.toEmployeeName ?? '—'}</dd>
				</div>
				<div>
					<dt>Diterima oleh</dt>
					<dd>{mutation.receivedByName ?? '—'}</dd>
				</div>
				<div>
					<dt>Dicatat oleh</dt>
					<dd>{mutation.performedByName}</dd>
				</div>
				<div class="full">
					<dt>Alasan</dt>
					<dd>{mutation.reason ?? '—'}</dd>
				</div>
				<div class="full">
					<dt>Catatan</dt>
					<dd>{mutation.notes ?? '—'}</dd>
				</div>
				<div>
					<dt>Dibuat</dt>
					<dd>{mutation.createdAtLabel}</dd>
				</div>
			</dl>
		</Card>

		<ActivityList
			title="Timeline pergerakan aset"
			description="Penempatan dan mutasi aset ini, terbaru di atas."
			rows={timelineRows}
			emptyTitle="Belum ada pergerakan"
			emptyDescription="Riwayat penempatan dan mutasi akan tampil di sini."
		/>
	</div>

	<p class="readonly-note">
		Mutasi bersifat read-only setelah disimpan. Perpindahan berikutnya dicatat sebagai mutasi baru.
	</p>
</main>

<style>
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

	.readonly-note {
		margin: var(--space-5) 0 0;
		color: var(--text-3);
		font-size: var(--font-size-xs);
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
