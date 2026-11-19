<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import { Alert, Button, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const actionError = $derived((form as { error?: string } | null)?.error);

	const opname = $derived(data.opname);
	const summary = $derived(data.summary);
	const countHref = $derived(resolve('/(app)/opname/[id]/count', { id: String(opname.id) }));
	const adjustmentHref = $derived(resolveHref('/stock/new?type=adjustment'));
	const progressPercent = $derived(
		summary.total > 0 ? Math.round((summary.checked / summary.total) * 100) : 0
	);

	function varianceLabel(value: number | null): string {
		if (value === null) return '—';
		if (value === 0) return '0';
		return value > 0 ? `+${value}` : String(value);
	}
</script>

<svelte:head>
	<title>{opname.opnameNumber} — Stock Opname</title>
</svelte:head>

<main class="container page">
	<PageHeader title={opname.opnameNumber} description="{opname.outletName} · {opname.locationName}">
		{#snippet actions()}
			<StatusBadge label={opname.statusLabel} tone={opname.statusTone} />
			<a class="back-link" href={resolve('/(app)/opname')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if data.notice.created}
		<div class="notice">
			<Alert tone="success" title="Draft dibuat">Mulai sesi untuk mengambil snapshot item.</Alert>
		</div>
	{/if}
	{#if data.notice.started}
		<div class="notice">
			<Alert tone="success" title="Sesi dimulai">Snapshot daftar item berhasil dibuat.</Alert>
		</div>
	{/if}
	{#if data.notice.completed}
		<div class="notice">
			<Alert tone="success" title="Sesi selesai">Hasil opname sekarang read-only.</Alert>
		</div>
	{/if}
	{#if data.notice.cancelled}
		<div class="notice">
			<Alert tone="warning" title="Sesi dibatalkan">Sesi ini tidak dapat diubah lagi.</Alert>
		</div>
	{/if}
	{#if actionError}
		<div class="notice"><Alert tone="danger" title="Aksi gagal">{actionError}</Alert></div>
	{/if}

	<Card>
		<dl class="meta-grid">
			<div>
				<dt>Jenis</dt>
				<dd>{opname.itemTypeLabel}</dd>
			</div>
			<div>
				<dt>Dibuat oleh</dt>
				<dd>{opname.createdByName}</dd>
			</div>
			<div>
				<dt>Dibuat</dt>
				<dd>{opname.createdAtLabel}</dd>
			</div>
			<div>
				<dt>Mulai</dt>
				<dd>{opname.startedAtLabel}</dd>
			</div>
			<div>
				<dt>Selesai</dt>
				<dd>{opname.completedAtLabel}</dd>
			</div>
			<div>
				<dt>Catatan</dt>
				<dd>{opname.notes ?? '—'}</dd>
			</div>
		</dl>

		<div class="progress-block">
			<div class="progress-head">
				<span>Progres pengecekan</span>
				<strong>{summary.checked}/{summary.total} item ({progressPercent}%)</strong>
			</div>
			<div
				class="progress-track"
				role="progressbar"
				aria-valuemin="0"
				aria-valuemax={summary.total}
				aria-valuenow={summary.checked}
			>
				<span style="width: {progressPercent}%"></span>
			</div>
		</div>

		<div class="summary-grid">
			<div><span class="summary-label">Total item</span><strong>{summary.total}</strong></div>
			<div><span class="summary-label">Sudah dicek</span><strong>{summary.checked}</strong></div>
			<div><span class="summary-label">Belum dicek</span><strong>{summary.unchecked}</strong></div>
			<div><span class="summary-label">Selisih qty</span><strong>{summary.variance}</strong></div>
			<div>
				<span class="summary-label">Tidak ditemukan</span><strong>{summary.notFound}</strong>
			</div>
			<div>
				<span class="summary-label">Kondisi berbeda</span><strong>
					{summary.conditionChanged}
				</strong>
			</div>
		</div>
	</Card>

	{#if opname.status === 'draft'}
		<div class="notice">
			<Alert tone="info" title="Sesi masih draft">
				Daftar aset/item akan diambil sebagai snapshot saat sesi dimulai. Setelah itu jumlah sistem
				tidak berubah walaupun stok berubah.
			</Alert>
		</div>
		{#if data.canManage}
			<form method="POST" action="?/start" class="inline-form">
				<Button type="submit">Mulai sesi</Button>
			</form>
		{/if}
	{:else if opname.status === 'in_progress'}
		<div class="notice">
			<Alert tone="info" title="Pengecekan berlangsung">
				Outlet dapat mengisi hasil hitung untuk sesi ini. Menyimpan progres tidak mengubah stok.
			</Alert>
		</div>
		<div class="action-bar">
			{#if data.canCount}
				<a class="button-link" href={countHref}>Isi / lanjutkan hitung</a>
			{/if}
			{#if data.canManage}
				<form method="POST" action="?/complete">
					<Button type="submit" disabled={summary.unchecked > 0}>Selesaikan sesi</Button>
				</form>
			{/if}
		</div>
		{#if data.canManage && summary.unchecked > 0}
			<p class="hint">
				Lengkapi {summary.unchecked} item yang belum dicek sebelum menyelesaikan sesi.
			</p>
		{/if}
	{:else if opname.status === 'completed'}
		<div class="notice">
			<Alert tone="success" title="Sesi selesai">
				Hasil opname bersifat read-only. Selisih tidak mengubah stok secara otomatis.
			</Alert>
		</div>
		{#if data.canManage}
			<div class="action-bar">
				<a class="button-link" href={adjustmentHref}>Buat penyesuaian stok</a>
			</div>
		{/if}
	{:else}
		<div class="notice">
			<Alert tone="warning" title="Sesi dibatalkan">Tidak ada perubahan stok dari sesi ini.</Alert>
		</div>
	{/if}

	{#if opname.status !== 'draft'}
		<section class="lines" aria-labelledby="lines-heading">
			<h2 id="lines-heading">
				{opname.status === 'in_progress' ? 'Hasil sementara' : 'Hasil pengecekan'}
			</h2>

			{#if data.lines.length === 0}
				<Alert tone="info" title="Belum ada item">Snapshot item belum tersedia.</Alert>
			{:else}
				<div class="table-scroll desktop-only">
					<table class="lines-table">
						<thead>
							<tr>
								<th scope="col">Item</th>
								<th scope="col" class="numeric">Sistem</th>
								<th scope="col" class="numeric">Fisik</th>
								<th scope="col" class="numeric">Selisih</th>
								<th scope="col">Hasil</th>
								<th scope="col">Kondisi</th>
								<th scope="col">Dicek</th>
								<th scope="col">Catatan</th>
							</tr>
						</thead>
						<tbody>
							{#each data.lines as line (line.id)}
								<tr>
									<td>
										<span class="font-mono item-code">{line.itemCode}</span>
										<span class="item-name">{line.itemName}</span>
									</td>
									<td class="numeric">
										{line.systemQty}{line.unitName ? ` ${line.unitName}` : ''}
									</td>
									<td class="numeric">{line.physicalQty ?? '—'}</td>
									<td class="numeric">{varianceLabel(line.variance)}</td>
									<td><StatusBadge label={line.resultLabel} tone={line.resultTone} size="sm" /></td>
									<td>
										{#if line.itemType === 'asset'}
											{line.systemConditionName ?? '—'} → {line.physicalConditionName ?? '—'}
										{:else}
											—
										{/if}
									</td>
									<td class="checked">
										{#if line.checkedByName}
											{line.checkedByName}<br /><span class="subtle">{line.checkedAtLabel}</span>
										{:else}
											—
										{/if}
									</td>
									<td class="notes">{line.notes ?? '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<ul class="line-cards">
					{#each data.lines as line (line.id)}
						<li>
							<article class="line-card">
								<div class="line-head">
									<div>
										<span class="font-mono item-code">{line.itemCode}</span>
										<strong>{line.itemName}</strong>
									</div>
									<StatusBadge label={line.resultLabel} tone={line.resultTone} size="sm" />
								</div>
								<dl class="line-meta">
									<div>
										<dt>Sistem</dt>
										<dd>{line.systemQty}{line.unitName ? ` ${line.unitName}` : ''}</dd>
									</div>
									<div>
										<dt>Fisik</dt>
										<dd>{line.physicalQty ?? '—'}</dd>
									</div>
									<div>
										<dt>Selisih</dt>
										<dd>{varianceLabel(line.variance)}</dd>
									</div>
									{#if line.itemType === 'asset'}
										<div>
											<dt>Kondisi</dt>
											<dd>
												{line.systemConditionName ?? '—'} → {line.physicalConditionName ?? '—'}
											</dd>
										</div>
									{/if}
									<div>
										<dt>Dicek</dt>
										<dd>{line.checkedByName ?? '—'}</dd>
									</div>
									<div>
										<dt>Waktu</dt>
										<dd>{line.checkedAtLabel}</dd>
									</div>
									{#if line.notes}<div class="full">
											<dt>Catatan</dt>
											<dd>{line.notes}</dd>
										</div>{/if}
								</dl>
							</article>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	{#if data.canManage && (opname.status === 'draft' || opname.status === 'in_progress')}
		<section class="cancel" aria-labelledby="cancel-heading">
			<h2 id="cancel-heading">Batalkan sesi</h2>
			<p class="hint">
				Sesi yang dibatalkan tidak dapat dilanjutkan. Tindakan ini tercatat di audit.
			</p>
			<form
				method="POST"
				action="?/cancel"
				class="cancel-form"
				onsubmit={(event) => {
					if (!confirm('Batalkan sesi opname ini?')) event.preventDefault();
				}}
			>
				<label for="cancel-reason">Alasan pembatalan</label>
				<input
					id="cancel-reason"
					name="reason"
					type="text"
					required
					minlength="3"
					maxlength="200"
				/>
				<Button type="submit" variant="danger">Batalkan sesi</Button>
			</form>
		</section>
	{/if}
</main>

<style>
	.notice {
		margin: var(--space-4) 0;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
		margin: 0;
	}

	.meta-grid dt {
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.meta-grid dd {
		margin: 2px 0 0;
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}

	.progress-block {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.progress-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
	}

	.progress-track {
		height: 8px;
		margin-top: var(--space-2);
		overflow: hidden;
		border-radius: var(--radius-full);
		background: var(--surface-3);
	}

	.progress-track span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--primary);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-3);
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.summary-label {
		display: block;
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.summary-grid strong {
		font-size: var(--font-size-lg);
	}

	.inline-form {
		margin: 0;
	}

	.action-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		margin: var(--space-3) 0;
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

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.hint {
		margin: var(--space-2) 0 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.lines {
		margin-top: var(--space-6);
	}

	.lines h2 {
		margin: 0 0 var(--space-3);
		font-size: var(--font-size-lg);
	}

	.table-scroll {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.lines-table {
		width: 100%;
		min-width: 900px;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	.lines-table th,
	.lines-table td {
		padding: var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}

	.lines-table th {
		background: var(--surface-2);
		font-weight: var(--weight-semibold);
		white-space: nowrap;
	}

	.lines-table tbody tr:last-child td {
		border-bottom: 0;
	}

	.numeric {
		text-align: right;
		white-space: nowrap;
	}

	.item-code {
		display: block;
		color: var(--text-2);
		font-size: var(--font-size-xs);
	}

	.item-name {
		display: block;
		min-width: 180px;
	}

	.checked {
		white-space: nowrap;
	}

	.subtle {
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.notes {
		min-width: 160px;
		max-width: 260px;
		overflow-wrap: anywhere;
	}

	.line-cards {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.line-card {
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.line-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.line-meta {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
		margin: var(--space-3) 0 0;
	}

	.line-meta dt {
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.line-meta dd {
		margin: 0;
		font-size: var(--font-size-sm);
	}

	.line-meta .full {
		grid-column: 1 / -1;
	}

	.cancel {
		margin-top: var(--space-6);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.cancel h2 {
		margin: 0 0 var(--space-2);
		font-size: var(--font-size-base);
	}

	.cancel-form {
		display: grid;
		gap: var(--space-2);
		max-width: 480px;
		margin-top: var(--space-3);
	}

	.cancel-form label {
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.cancel-form input {
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-1);
		font-size: var(--font-size-base);
	}

	.cancel-form :global(.btn) {
		justify-self: start;
	}

	@media (min-width: 768px) {
		.line-cards {
			display: none;
		}

		.meta-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.summary-grid {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	@media (max-width: 767px) {
		.desktop-only {
			display: none;
		}
	}
</style>
