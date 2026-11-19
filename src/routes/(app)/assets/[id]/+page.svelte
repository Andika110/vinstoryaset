<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { resolve as resolveHref } from '#lib/href.js';
	import { ActivityList, Alert, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { ActivityRowData } from '#lib/dashboard.js';
	import type { PageData, PageProps } from './$types';

	let { data }: PageProps = $props();

	type HistoryEntry = PageData['history']['timeline'][number];
	type ActionItem = {
		key: string;
		label: string;
		description: string;
		feature?: string;
		href?: ResolvedPathname;
	};

	const asset = $derived(data.asset);
	const editHref = $derived(resolve('/(app)/assets/[id]/edit', { id: String(asset.id) }));

	const dateFormatter = new Intl.DateTimeFormat('id-ID', {
		dateStyle: 'medium',
		timeZone: 'Asia/Jakarta'
	});
	const currencyFormatter = new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 2
	});

	function formatDate(value: string | null): string {
		if (!value) return '—';
		const date = new Date(`${value}T00:00:00+07:00`);
		return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
	}

	function formatCost(value: string | null): string {
		if (!value) return '—';
		const parsed = Number(value);
		return Number.isFinite(parsed) ? currencyFormatter.format(parsed) : value;
	}

	const entries = $derived(
		data.activeTab === 'mutasi'
			? data.history.movements
			: data.activeTab === 'maintenance'
				? data.history.maintenances
				: data.activeTab === 'peminjaman'
					? data.history.loans
					: data.history.timeline
	);

	const listTitle = $derived(
		data.activeTab === 'mutasi'
			? 'Riwayat mutasi'
			: data.activeTab === 'maintenance'
				? 'Riwayat maintenance'
				: data.activeTab === 'peminjaman'
					? 'Riwayat peminjaman'
					: 'Riwayat aset'
	);

	const emptyTitle = $derived(
		data.activeTab === 'mutasi'
			? 'Belum ada mutasi'
			: data.activeTab === 'maintenance'
				? 'Belum ada maintenance'
				: data.activeTab === 'peminjaman'
					? 'Belum ada peminjaman'
					: 'Belum ada riwayat'
	);

	const historyRows = $derived<ActivityRowData[]>(
		entries.map((entry: HistoryEntry) => ({
			id: entry.id,
			title: entry.title,
			subtitle: entry.description || undefined,
			meta: entry.meta,
			badge: { label: entry.typeLabel, tone: entry.tone }
		}))
	);

	const actionItems = $derived<ActionItem[]>(
		[
			{
				key: 'assign',
				label: 'Penempatan',
				description: 'Tempatkan aset ke karyawan atau lokasi.',
				href: resolveHref(`/assets/assignments/new?asset=${asset.id}`)
			},
			{
				key: 'mutate',
				label: 'Mutasi',
				description: 'Pindahkan aset antar lokasi.',
				href: resolveHref(`/assets/mutations/new?asset=${asset.id}`)
			},
			{
				key: 'borrow',
				label: 'Peminjaman',
				description: 'Pinjamkan aset kepada peminjam.',
				href: resolveHref(`/assets/loans/new?asset=${asset.id}`)
			},
			{
				key: 'maintain',
				label: 'Maintenance',
				description: 'Laporkan kerusakan atau mulai perbaikan aset.',
				href: resolveHref(`/maintenance/new?asset=${asset.id}`)
			},
			{
				key: 'dispose',
				label: 'Disposal',
				description: 'Catat penghapusan aset.',
				feature: 'FEAT-14'
			}
		].filter((item) => data.actions[item.key as keyof typeof data.actions])
	);
</script>

<svelte:head>
	<title>{asset.assetCode} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="{asset.assetCode} · {asset.name}"
		description="{asset.outletName} · {asset.locationName}"
	>
		{#snippet actions()}
			<div class="header-badges">
				<StatusBadge label={asset.statusLabel} tone={asset.statusTone} />
			</div>
			{#if data.actions.edit}
				<a class="button-link" href={editHref}>Edit aset</a>
			{/if}
			<a
				class="back-link"
				href={resolveHref(`/assets/labels/print?ids=${asset.id}`)}
				target="_blank"
				rel="noopener"
			>
				Cetak label
			</a>
			{#if data.actions.dispose}
				<a class="back-link" href={resolveHref(`/disposals/new?asset=${asset.id}`)}>
					Buat disposal
				</a>
			{/if}
			<a class="back-link" href={resolve('/(app)/assets')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if asset.status === 'disposed'}
		<div class="notice">
			<Alert tone="info" title="Aset disposed">
				Aset ini sudah dihapus dari inventaris aktif. Seluruh data dan riwayat bersifat read-only.
			</Alert>
		</div>
	{/if}

	<nav class="tabs" aria-label="Bagian detail aset">
		{#each data.tabs as tab (tab.key)}
			<a
				href={tab.href}
				class:active={data.activeTab === tab.key}
				aria-current={data.activeTab === tab.key ? 'page' : undefined}
			>
				{tab.label}
				{#if tab.count !== undefined}
					<span class="tab-count">{tab.count}</span>
				{/if}
			</a>
		{/each}
	</nav>

	{#if data.activeTab === 'ringkasan'}
		<div class="detail-grid">
			<Card title="Identitas aset" headingLevel={2}>
				<dl class="info-list">
					<div>
						<dt>Asset Code</dt>
						<dd class="font-mono">{asset.assetCode}</dd>
					</div>
					<div>
						<dt>Nama</dt>
						<dd>{asset.name}</dd>
					</div>
					<div>
						<dt>Kategori</dt>
						<dd>{asset.categoryName}</dd>
					</div>
					<div>
						<dt>Brand</dt>
						<dd>{asset.brandName ?? '—'}</dd>
					</div>
					<div>
						<dt>Model</dt>
						<dd>{asset.modelName ?? '—'}</dd>
					</div>
					<div>
						<dt>Serial number</dt>
						<dd class="font-mono">{asset.serialNumber ?? '—'}</dd>
					</div>
					<div class="full">
						<dt>Deskripsi</dt>
						<dd>{asset.description ?? '—'}</dd>
					</div>
				</dl>
			</Card>

			<Card title="Pembelian & garansi" headingLevel={2}>
				<dl class="info-list">
					<div>
						<dt>Tanggal pembelian</dt>
						<dd>{formatDate(asset.purchaseDate)}</dd>
					</div>
					<div>
						<dt>Akhir garansi</dt>
						<dd>{formatDate(asset.warrantyExpiration)}</dd>
					</div>
					<div>
						<dt>Sumber perolehan</dt>
						<dd>{asset.acquisitionSource ?? '—'}</dd>
					</div>
					{#if data.canSeeCost}
						<div>
							<dt>Biaya perolehan</dt>
							<dd>{formatCost(asset.acquisitionCost)}</dd>
						</div>
					{/if}
				</dl>
			</Card>

			<Card title="Lokasi & kondisi" headingLevel={2}>
				<dl class="info-list">
					<div>
						<dt>Outlet</dt>
						<dd>{asset.outletName}</dd>
					</div>
					<div>
						<dt>Lokasi</dt>
						<dd>{asset.locationName}</dd>
					</div>
					<div>
						<dt>Pemegang</dt>
						<dd>{asset.assignedEmployeeName ?? 'Belum ditempatkan'}</dd>
					</div>
					<div>
						<dt>Kondisi</dt>
						<dd>{asset.conditionName}</dd>
					</div>
					<div>
						<dt>Status</dt>
						<dd><StatusBadge label={asset.statusLabel} tone={asset.statusTone} /></dd>
					</div>
				</dl>
			</Card>

			<Card title="Foto aset" headingLevel={2}>
				{#if asset.photoUrl}
					<img class="asset-photo" src={asset.photoUrl} alt="Foto {asset.name}" />
				{:else}
					<div class="photo-placeholder">
						<span>Belum ada foto aset</span>
						{#if data.actions.edit}
							<a href={editHref}>Tambahkan foto</a>
						{/if}
					</div>
				{/if}
			</Card>

			<Card title="Aksi aset" headingLevel={2}>
				{#if asset.status === 'disposed'}
					<p class="text-muted">Tidak ada aksi yang tersedia untuk aset disposed.</p>
				{:else if actionItems.length === 0}
					<p class="text-muted">Tidak ada aksi yang valid untuk status ini.</p>
				{:else}
					<ul class="action-list">
						{#each actionItems as item (item.key)}
							<li>
								{#if item.href}
									<a class="action-row" href={item.href}>
										<div>
											<strong>{item.label}</strong>
											<span>{item.description}</span>
										</div>
										<span class="action-cta">Mulai</span>
									</a>
								{:else}
									<div class="action-row">
										<div>
											<strong>{item.label}</strong>
											<span>{item.description}</span>
										</div>
										<span class="soon">{item.feature}</span>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
					<p class="text-muted action-note">
						Aksi transaksi aktif setelah modul terkait dibangun. Status aset tidak dapat diubah
						langsung dari halaman ini.
					</p>
				{/if}
			</Card>
		</div>
	{:else}
		{#if data.activeTab === 'riwayat'}
			<div class="history-filters" aria-label="Filter jenis riwayat">
				{#each data.historyFilters as filter (filter.key)}
					<a
						href={filter.href}
						class:active={data.historyType === filter.key}
						aria-current={data.historyType === filter.key ? 'true' : undefined}
					>
						{filter.label}
					</a>
				{/each}
			</div>
		{/if}

		<ActivityList
			title={listTitle}
			rows={historyRows}
			{emptyTitle}
			emptyDescription="Riwayat akan tampil setelah ada proses penempatan, mutasi, maintenance, atau peminjaman."
		/>
	{/if}

	<p class="meta">Terakhir diperbarui {asset.updatedAt}</p>
</main>

<style>
	.header-badges {
		display: flex;
		align-items: center;
	}

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

	.tabs {
		display: flex;
		gap: var(--space-1);
		margin-bottom: var(--space-5);
		padding-bottom: var(--space-1);
		border-bottom: 1px solid var(--border);
		overflow-x: auto;
	}

	.tabs a {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border-bottom: 3px solid transparent;
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
		white-space: nowrap;
	}

	.tabs a:hover {
		color: var(--text-1);
	}

	.tabs a.active {
		border-bottom-color: var(--primary);
		color: var(--primary);
	}

	.tab-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		min-height: 22px;
		padding: 0 var(--space-1);
		border-radius: var(--radius-full);
		background: var(--surface-2);
		color: var(--text-2);
		font-size: var(--font-size-xs);
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

	.asset-photo {
		width: 100%;
		max-height: 360px;
		border-radius: var(--radius-md);
		object-fit: contain;
		background: var(--surface-2);
	}

	.photo-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: 140px;
		padding: var(--space-4);
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface-2);
		color: var(--text-2);
		font-size: var(--font-size-sm);
		text-align: center;
	}

	.action-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.action-list li {
		display: block;
	}

	.action-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface-2);
		color: var(--text-1);
		text-decoration: none;
	}

	a.action-row:hover {
		border-color: var(--primary);
		background: var(--primary-soft);
	}

	.action-row div {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.action-row strong {
		font-size: var(--font-size-sm);
	}

	.action-row span {
		color: var(--text-2);
		font-size: var(--font-size-xs);
	}

	.action-cta {
		flex: none;
		color: var(--primary) !important;
		font-size: var(--font-size-sm) !important;
		font-weight: var(--weight-semibold);
	}

	.soon {
		flex: none;
		color: var(--text-3) !important;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs) !important;
	}

	.action-note {
		margin: var(--space-3) 0 0;
		font-size: var(--font-size-xs);
	}

	.history-filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.history-filters a {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-full);
		background: var(--surface);
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.history-filters a.active {
		border-color: var(--primary);
		background: var(--primary-soft);
		color: var(--primary-soft-text);
	}

	.meta {
		margin: var(--space-5) 0 0;
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	@media (min-width: 768px) {
		.info-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.info-list .full {
			grid-column: 1 / -1;
		}

		.detail-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
