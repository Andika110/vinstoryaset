<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ActivityList,
		Alert,
		Button,
		Card,
		Input,
		PageHeader,
		Select,
		StatusBadge,
		Textarea
	} from '#lib/components/index.js';
	import type { ActivityRowData } from '#lib/dashboard.js';
	import type { PageData, PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type TimelineEntry = PageData['maintenance']['timeline'][number];
	type PartRow = { key: number; itemId: string; qty: string };

	const actionData = $derived(
		form as {
			error?: string;
			fieldErrors?: Record<string, string>;
		} | null
	);

	const maintenance = $derived(data.maintenance);
	const assetHref = $derived(resolve('/(app)/assets/[id]', { id: String(maintenance.assetId) }));
	const canStart = $derived(maintenance.allowedNext.includes('in_progress'));
	const canWait = $derived(maintenance.allowedNext.includes('waiting_parts'));
	const canComplete = $derived(maintenance.allowedNext.includes('completed'));
	const canCancel = $derived(maintenance.allowedNext.includes('cancelled'));

	const timelineRows = $derived<ActivityRowData[]>(
		maintenance.timeline.map((entry: TimelineEntry) => ({
			id: entry.id,
			title: entry.label,
			subtitle: entry.description,
			meta: entry.meta,
			badge: { label: entry.label, tone: entry.tone }
		}))
	);

	let partRows = $state<PartRow[]>([]);
	let partKey = $state(0);

	function addPart(): void {
		partKey += 1;
		partRows = [...partRows, { key: partKey, itemId: '', qty: '1' }];
	}

	function removePart(key: number): void {
		partRows = partRows.filter((row) => row.key !== key);
	}
</script>

<svelte:head>
	<title>{maintenance.maintenanceNumber} — Maintenance</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title={maintenance.maintenanceNumber}
		description="{maintenance.assetCode} · {maintenance.problemDescription}"
	>
		{#snippet actions()}
			<StatusBadge label={maintenance.statusLabel} tone={maintenance.statusTone} />
			<a class="button-link" href={assetHref}>Lihat aset</a>
			<a class="back-link" href={resolve('/(app)/maintenance')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="notice">
			<Alert tone="danger" title="Gagal memproses">{actionData.error}</Alert>
		</div>
	{/if}

	<div class="detail-grid">
		<Card title="Informasi maintenance" headingLevel={2}>
			<dl class="info-list">
				<div>
					<dt>Nomor</dt>
					<dd class="font-mono">{maintenance.maintenanceNumber}</dd>
				</div>
				<div>
					<dt>Status</dt>
					<dd><StatusBadge label={maintenance.statusLabel} tone={maintenance.statusTone} /></dd>
				</div>
				<div>
					<dt>Aset</dt>
					<dd><a href={assetHref}>{maintenance.assetCode} · {maintenance.assetName}</a></dd>
				</div>
				<div>
					<dt>Status aset</dt>
					<dd>{maintenance.assetStatusLabel}</dd>
				</div>
				<div>
					<dt>Pelapor</dt>
					<dd>{maintenance.reportedByName}</dd>
				</div>
				<div>
					<dt>Lokasi</dt>
					<dd>{maintenance.outletName} · {maintenance.locationName}</dd>
				</div>
				<div>
					<dt>Jenis</dt>
					<dd>{maintenance.maintenanceTypeLabel}</dd>
				</div>
				<div>
					<dt>Teknisi</dt>
					<dd>{maintenance.technician ?? '—'}</dd>
				</div>
				<div>
					<dt>Tanggal mulai</dt>
					<dd>{maintenance.startDateLabel ?? '—'}</dd>
				</div>
				<div>
					<dt>Tanggal selesai</dt>
					<dd>{maintenance.completionDateLabel ?? '—'}</dd>
				</div>
				{#if maintenance.canSeeCost}
					<div>
						<dt>Biaya perbaikan</dt>
						<dd>
							{maintenance.repairCost
								? `Rp ${Number(maintenance.repairCost).toLocaleString('id-ID')}`
								: '—'}
						</dd>
					</div>
					<div>
						<dt>Vendor</dt>
						<dd>{maintenance.vendor ?? '—'}</dd>
					</div>
				{/if}
				<div class="full">
					<dt>Masalah</dt>
					<dd>{maintenance.problemDescription}</dd>
				</div>
				<div class="full">
					<dt>Perbaikan</dt>
					<dd>{maintenance.repairDescription ?? '—'}</dd>
				</div>
				{#if maintenance.cancelledReason}
					<div class="full">
						<dt>Alasan batal</dt>
						<dd>{maintenance.cancelledReason}</dd>
					</div>
				{/if}
				<div>
					<dt>Dilaporkan</dt>
					<dd>{maintenance.createdAtLabel}</dd>
				</div>
			</dl>
		</Card>

		{#if maintenance.photoUrl}
			<Card title="Foto kerusakan" headingLevel={2}>
				<img class="maintenance-photo" src={maintenance.photoUrl} alt="Foto kerusakan aset" />
			</Card>
		{:else}
			<Card title="Spare part" headingLevel={2}>
				{#if maintenance.parts.length === 0}
					<p class="text-muted">Belum ada spare part yang dipakai.</p>
				{:else}
					<ul class="part-list">
						{#each maintenance.parts as part (part.id)}
							<li>
								<span>{part.itemCode} · {part.itemName}</span>
								<strong>{part.quantity} {part.unitName}</strong>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		{/if}
	</div>

	{#if maintenance.photoUrl}
		<div class="parts-section">
			<Card title="Spare part" headingLevel={2}>
				{#if maintenance.parts.length === 0}
					<p class="text-muted">Belum ada spare part yang dipakai.</p>
				{:else}
					<ul class="part-list">
						{#each maintenance.parts as part (part.id)}
							<li>
								<span>{part.itemCode} · {part.itemName}</span>
								<strong>{part.quantity} {part.unitName}</strong>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		</div>
	{/if}

	<div class="timeline">
		<ActivityList
			title="Timeline maintenance"
			rows={timelineRows}
			emptyTitle="Belum ada riwayat"
			emptyDescription="Perubahan status akan tampil di sini."
		/>
	</div>

	{#if maintenance.canProcess && (canStart || canWait || canComplete || canCancel)}
		<div class="process-grid">
			{#if canStart}
				<Card title="Mulai / lanjutkan perbaikan" headingLevel={2}>
					<form method="POST" action="?/start" class="form-grid">
						<Input
							label="Teknisi"
							name="technician"
							value={maintenance.technician ?? ''}
							placeholder="Nama teknisi"
						/>
						<Input
							label="Tanggal mulai"
							name="startDate"
							type="date"
							value={maintenance.returnDefaults.startDate}
						/>
						<div class="full">
							<Button type="submit">Mulai perbaikan</Button>
						</div>
					</form>
				</Card>
			{/if}

			{#if canWait}
				<Card title="Menunggu spare part" headingLevel={2}>
					<p class="text-muted">
						Tandai maintenance menunggu spare part. Aset tetap berstatus Under Maintenance.
					</p>
					<form method="POST" action="?/waiting">
						<Button type="submit" variant="secondary">Tandai menunggu spare part</Button>
					</form>
				</Card>
			{/if}

			{#if canComplete}
				<Card title="Selesaikan perbaikan" headingLevel={2}>
					<form method="POST" action="?/complete" class="form-grid">
						<Input
							label="Tanggal selesai"
							name="completionDate"
							type="date"
							required
							value={maintenance.returnDefaults.completionDate}
							error={actionData?.fieldErrors?.completionDate}
						/>
						{#if maintenance.canSeeCost}
							<Input
								label="Biaya perbaikan"
								name="repairCost"
								type="number"
								min="0"
								step="0.01"
								value={maintenance.repairCost ?? ''}
							/>
							<Input label="Vendor" name="vendor" value={maintenance.vendor ?? ''} />
						{/if}
						<div class="full">
							<Textarea
								label="Deskripsi perbaikan"
								name="repairDescription"
								required
								value={maintenance.repairDescription ?? ''}
								error={actionData?.fieldErrors?.repairDescription}
							/>
						</div>

						<div class="full parts-editor">
							<div class="parts-head">
								<strong>Spare part yang dipakai</strong>
								<Button type="button" variant="secondary" size="sm" onclick={addPart}>
									Tambah spare part
								</Button>
							</div>
							{#if partRows.length === 0}
								<p class="text-muted">Tidak ada spare part.</p>
							{:else}
								{#each partRows as row (row.key)}
									<div class="part-row">
										<Select
											label="Item"
											name="partItemId"
											value={row.itemId}
											placeholder="Pilih item"
											options={maintenance.partOptions.map((item) => ({
												value: String(item.id),
												label: item.label
											}))}
											onchange={(event) => (row.itemId = event.currentTarget.value)}
										/>
										<Input
											label="Qty"
											name="partQty"
											type="number"
											min="1"
											step="1"
											value={row.qty}
											oninput={(event) => (row.qty = event.currentTarget.value)}
										/>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onclick={() => removePart(row.key)}
										>
											Hapus
										</Button>
									</div>
								{/each}
							{/if}
							<p class="text-muted">
								Spare part mengurangi stok di lokasi maintenance dan dicatat sebagai Stock Out.
							</p>
						</div>

						<div class="full">
							<Button type="submit">Selesaikan maintenance</Button>
						</div>
					</form>
				</Card>
			{/if}

			{#if canCancel}
				<Card title="Batalkan maintenance" headingLevel={2}>
					<form method="POST" action="?/cancel" class="form-grid">
						<div class="full">
							<Textarea
								label="Alasan pembatalan"
								name="cancelledReason"
								required
								value=""
								error={actionData?.fieldErrors?.cancelledReason}
							/>
						</div>
						<div class="full">
							<Button type="submit" variant="danger">Batalkan maintenance</Button>
						</div>
					</form>
				</Card>
			{/if}
		</div>
	{:else if !maintenance.canProcess && maintenance.status === 'reported'}
		<p class="readonly-note">
			Laporan Anda sedang menunggu diproses oleh IT Support. Anda dapat memantau status di halaman
			ini.
		</p>
	{:else if !maintenance.canProcess}
		<p class="readonly-note">
			Anda hanya dapat melihat detail maintenance ini. Proses perbaikan dilakukan oleh IT Support.
		</p>
	{:else}
		<p class="readonly-note">
			Maintenance berstatus {maintenance.statusLabel.toLowerCase()} dan bersifat read-only.
		</p>
	{/if}
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

	.maintenance-photo {
		width: 100%;
		max-height: 360px;
		border-radius: var(--radius-md);
		object-fit: contain;
		background: var(--surface-2);
	}

	.part-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.part-list li {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-2) 0;
		font-size: var(--font-size-sm);
	}

	.part-list li + li {
		border-top: 1px solid var(--border);
	}

	.part-list strong {
		flex: none;
		font-variant-numeric: tabular-nums;
	}

	.parts-section,
	.timeline {
		margin-top: var(--space-4);
	}

	.process-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		margin-top: var(--space-4);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.full {
		grid-column: 1 / -1;
	}

	.parts-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
	}

	.parts-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.part-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 100px auto;
		align-items: end;
		gap: var(--space-2);
	}

	.readonly-note {
		margin: var(--space-5) 0 0;
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	@media (min-width: 768px) {
		.form-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.process-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
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
