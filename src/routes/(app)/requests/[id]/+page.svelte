<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ActivityList,
		Alert,
		Button,
		Card,
		ConfirmDialog,
		Input,
		PageHeader,
		Select,
		StatusBadge,
		Textarea
	} from '#lib/components/index.js';
	import type { ActivityRowData } from '#lib/dashboard.js';
	import type { PageData, PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type TimelineEntry = PageData['request']['timeline'][number];

	const actionData = $derived(
		form as {
			error?: string;
			fieldErrors?: Record<string, string>;
		} | null
	);

	const request = $derived(data.request);

	const timelineRows = $derived<ActivityRowData[]>(
		request.timeline.map((entry: TimelineEntry) => ({
			id: entry.id,
			title: entry.label,
			subtitle: entry.description,
			meta: entry.meta,
			badge: { label: entry.label, tone: entry.tone }
		}))
	);

	let sourceOverride = $state<string | null>(null);
	const sourceLocationId = $derived(sourceOverride ?? '');

	function stockAt(itemId: number): number | null {
		if (!sourceLocationId) return null;
		const row = request.balances.find(
			(balance) => balance.itemId === itemId && balance.locationId === Number(sourceLocationId)
		);
		return row?.qty ?? 0;
	}

	let cancelOpen = $state(false);
	let cancelForm = $state<HTMLFormElement | null>(null);
</script>

<svelte:head>
	<title>{request.requestNumber} — Request</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title={request.requestNumber}
		description="{request.outletName} · {request.createdAtLabel}"
	>
		{#snippet actions()}
			<StatusBadge label={request.statusLabel} tone={request.statusTone} />
			<a class="back-link" href={resolve('/(app)/requests')}>
				{request.status === 'submitted' ? 'Kembali ke daftar' : 'Kembali ke inbox'}
			</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.error}
		<div class="notice">
			<Alert tone="danger" title="Gagal memproses">{actionData.error}</Alert>
		</div>
	{/if}

	<div class="detail-grid">
		<Card title="Informasi request" headingLevel={2}>
			<dl class="info-list">
				<div>
					<dt>Nomor</dt>
					<dd class="font-mono">{request.requestNumber}</dd>
				</div>
				<div>
					<dt>Status</dt>
					<dd><StatusBadge label={request.statusLabel} tone={request.statusTone} /></dd>
				</div>
				<div>
					<dt>Outlet</dt>
					<dd>{request.outletName}</dd>
				</div>
				<div>
					<dt>Diminta oleh</dt>
					<dd>{request.requestedByName}</dd>
				</div>
				<div>
					<dt>Diajukan</dt>
					<dd>{request.createdAtLabel}</dd>
				</div>
				<div>
					<dt>Diperbarui</dt>
					<dd>{request.updatedAtLabel}</dd>
				</div>
				<div>
					<dt>Total item</dt>
					<dd>{request.totalRequested.toLocaleString('id-ID')}</dd>
				</div>
				<div>
					<dt>Total terpenuhi</dt>
					<dd>{request.totalFulfilled.toLocaleString('id-ID')}</dd>
				</div>
				<div class="full">
					<dt>Alasan</dt>
					<dd>{request.reason ?? '—'}</dd>
				</div>
				<div class="full">
					<dt>Catatan</dt>
					<dd>{request.notes ?? '—'}</dd>
				</div>
				{#if request.rejectionReason}
					<div class="full">
						<dt>Alasan ditolak</dt>
						<dd>{request.rejectionReason}</dd>
					</div>
				{/if}
			</dl>
		</Card>

		<Card title="Item request" headingLevel={2}>
			<ul class="line-list">
				{#each request.lines as line (line.id)}
					<li>
						<div class="line-main">
							<a
								class="line-title"
								href={resolve('/(app)/inventory/[id]', { id: String(line.itemId) })}
							>
								{line.itemCode} · {line.itemName}
							</a>
							<span class="line-meta">
								Diminta {line.requestedQty}
								{line.unitName} · Terpenuhi {line.fulfilledQty}
								{line.unitName} · Sisa {line.remainingQty}
								{line.unitName}
								{#if line.notes}
									· {line.notes}
								{/if}
							</span>
						</div>
						<StatusBadge
							label={line.remainingQty === 0 ? 'Terpenuhi' : 'Sebagian'}
							tone={line.remainingQty === 0 ? 'success' : 'warning'}
							size="sm"
						/>
					</li>
				{/each}
			</ul>
		</Card>
	</div>

	<div class="timeline">
		<ActivityList
			title="Timeline request"
			rows={timelineRows}
			emptyTitle="Belum ada riwayat"
			emptyDescription="Status dan fulfillment akan tampil di sini."
		/>
	</div>

	{#if request.canProcess || request.canFulfill || request.canReject}
		<div class="process-grid">
			{#if request.canProcess}
				<Card title="Mulai proses" headingLevel={2}>
					<p class="text-muted">Tandai request sedang diproses sebelum melakukan fulfillment.</p>
					<form method="POST" action="?/proses">
						<Button type="submit">Mulai proses</Button>
					</form>
				</Card>
			{/if}

			{#if request.canFulfill}
				<Card title="Fulfillment" headingLevel={2}>
					<form method="POST" action="?/fulfill" class="fulfill-form">
						<input
							type="hidden"
							name="submissionId"
							value={request.fulfillmentDefaults.submissionId}
						/>
						<Select
							label="Lokasi stok"
							name="sourceLocationId"
							required
							value={sourceLocationId}
							placeholder="Pilih lokasi sumber stok"
							options={request.sourceLocations.map((location) => ({
								value: String(location.id),
								label: location.label
							}))}
							hint="Stok diambil dari lokasi ini dan dicatat sebagai Stock Out."
							error={actionData?.fieldErrors?.sourceLocationId}
							onchange={(event) => (sourceOverride = event.currentTarget.value)}
						/>

						<ul class="fulfill-lines">
							{#each request.lines as line (line.id)}
								{@const stock = stockAt(line.itemId)}
								<li>
									<div class="fulfill-line-main">
										<strong>{line.itemCode} · {line.itemName}</strong>
										<span>
											Sisa {line.remainingQty}
											{line.unitName}
											{#if stock !== null}
												· stok di lokasi: {stock} {line.unitName}
											{/if}
										</span>
									</div>
									<Input
										label="Qty fulfillment"
										name={`fulfill_${line.id}`}
										type="number"
										min="0"
										max={line.remainingQty}
										step="1"
										value="0"
									/>
								</li>
							{/each}
						</ul>

						<Button type="submit">Simpan fulfillment</Button>
						<p class="text-muted">
							Jika semua baris terpenuhi, status menjadi Selesai; jika sebagian, status menjadi
							Terpenuhi Sebagian.
						</p>
					</form>
				</Card>
			{/if}

			{#if request.canReject}
				<Card title="Tolak request" headingLevel={2}>
					<form method="POST" action="?/tolak" class="reject-form">
						<Textarea
							label="Alasan penolakan"
							name="rejectionReason"
							required
							value=""
							error={actionData?.fieldErrors?.rejectionReason}
						/>
						<Button type="submit" variant="danger">Tolak request</Button>
					</form>
				</Card>
			{/if}
		</div>
	{/if}

	{#if request.canCancel}
		<Card title="Batalkan request" headingLevel={2}>
			<p class="text-muted">
				Request masih menunggu dan dapat dibatalkan. Setelah diproses IT Support, request tidak
				dapat dibatalkan sendiri.
			</p>
			<Button variant="danger" onclick={() => (cancelOpen = true)}>Batalkan request</Button>
		</Card>
	{:else if !request.canProcess && !request.canFulfill && !request.canReject}
		<p class="readonly-note">
			Request berstatus {request.statusLabel.toLowerCase()} dan bersifat read-only.
		</p>
	{/if}
</main>

<form bind:this={cancelForm} method="POST" action="?/batalkan" class="visually-hidden">
	<input type="hidden" name="confirm" value="1" />
</form>

<ConfirmDialog
	bind:open={cancelOpen}
	title="Batalkan request?"
	description="Request akan ditandai Dibatalkan. Tindakan ini tidak menghapus riwayat."
	confirmLabel="Batalkan request"
	tone="danger"
	onconfirm={() => cancelForm?.requestSubmit()}
/>

<style>
	.notice {
		margin-bottom: var(--space-4);
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

	.timeline {
		margin-top: var(--space-4);
	}

	.process-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		margin-top: var(--space-4);
	}

	.fulfill-form,
	.reject-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.fulfill-lines {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.fulfill-lines li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 140px;
		gap: var(--space-3);
		align-items: end;
		padding: var(--space-2) 0;
	}

	.fulfill-lines li + li {
		border-top: 1px solid var(--border);
	}

	.fulfill-line-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.fulfill-line-main strong {
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}

	.fulfill-line-main span {
		color: var(--text-2);
		font-size: var(--font-size-xs);
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
