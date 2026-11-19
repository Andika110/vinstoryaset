<script lang="ts">
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import {
		Alert,
		Button,
		Card,
		ConfirmDialog,
		PageHeader,
		StatusBadge
	} from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const disposal = $derived(data.disposal);
	const assetHref = $derived(resolve('/(app)/assets/[id]', { id: String(disposal.assetId) }));
	const auditHref = $derived(resolveHref(`/admin/audit?module=disposal&search=${disposal.id}`));
	const actionError = $derived((form as { error?: string } | null)?.error);

	let cancelOpen = $state(false);
	let cancelReason = $state('');
	let cancelError = $state('');
	let cancelSubmitting = $state(false);
	let cancelForm = $state<HTMLFormElement | null>(null);

	function openCancel(): void {
		cancelReason = '';
		cancelError = '';
		cancelOpen = true;
	}

	function closeCancel(): void {
		cancelOpen = false;
		cancelError = '';
	}

	function submitCancel(): void {
		if (cancelReason.trim().length < 3) {
			cancelError = 'Alasan pembatalan wajib diisi minimal 3 karakter.';
			return;
		}
		cancelSubmitting = true;
		cancelForm?.requestSubmit();
	}
</script>

<svelte:head>
	<title>{disposal.disposalNumber} — Disposal Aset</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title={disposal.disposalNumber}
		description="{disposal.assetCode} · {disposal.assetName}"
	>
		{#snippet actions()}
			<StatusBadge label={disposal.statusLabel} tone={disposal.statusTone} />
			<a class="back-link" href={resolve('/(app)/disposals')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if data.notice.created}
		<div class="notice">
			<Alert tone="success" title="Disposal dicatat">
				Aset sudah berstatus Disposed. Riwayat aset tetap tersimpan.
			</Alert>
		</div>
	{/if}
	{#if data.notice.cancelled}
		<div class="notice">
			<Alert tone="success" title="Disposal dibatalkan">
				Status aset dikembalikan ke {disposal.previousAssetStatusLabel}. Record disposal tetap
				tersimpan.
			</Alert>
		</div>
	{/if}
	{#if actionError}
		<div class="notice"><Alert tone="danger" title="Aksi gagal">{actionError}</Alert></div>
	{/if}
	{#if disposal.status === 'cancelled'}
		<div class="notice">
			<Alert tone="warning" title="Disposal dibatalkan">
				{disposal.cancelledReason ?? 'Tanpa alasan'} — {disposal.cancelledByName ?? '—'} · {disposal.cancelledAtLabel}
			</Alert>
		</div>
	{/if}

	<div class="layout">
		<Card title="Detail disposal" headingLevel={2}>
			<dl class="meta-grid">
				<div>
					<dt>Aset</dt>
					<dd><a href={assetHref}>{disposal.assetCode}</a> · {disposal.assetName}</dd>
				</div>
				<div>
					<dt>Kategori</dt>
					<dd>{disposal.categoryName}</dd>
				</div>
				<div>
					<dt>Serial number</dt>
					<dd>{disposal.serialNumber ?? '—'}</dd>
				</div>
				<div>
					<dt>Lokasi</dt>
					<dd>{disposal.outletName} · {disposal.locationName}</dd>
				</div>
				<div>
					<dt>Tanggal disposal</dt>
					<dd>{disposal.disposalDateLabel}</dd>
				</div>
				<div>
					<dt>Alasan</dt>
					<dd>{disposal.reasonLabel}</dd>
				</div>
				<div>
					<dt>Kondisi akhir</dt>
					<dd>{disposal.finalConditionName}</dd>
				</div>
				<div>
					<dt>Status aset</dt>
					<dd>{disposal.assetStatusLabel}</dd>
				</div>
				<div>
					<dt>Status sebelumnya</dt>
					<dd>{disposal.previousAssetStatusLabel}</dd>
				</div>
				<div>
					<dt>Dicatat oleh</dt>
					<dd>{disposal.recordedByName}</dd>
				</div>
				<div>
					<dt>Waktu dicatat</dt>
					<dd>{disposal.createdAtLabel}</dd>
				</div>
				<div class="full">
					<dt>Keterangan</dt>
					<dd>{disposal.description ?? '—'}</dd>
				</div>
			</dl>

			<div class="actions">
				<a class="button-link secondary" href={assetHref}>Lihat aset</a>
				<a class="button-link secondary" href={auditHref}>Lihat audit</a>
				{#if data.canCancel}
					<Button type="button" variant="danger" onclick={openCancel}>Batalkan disposal</Button>
				{/if}
			</div>
		</Card>

		<Card title="Timeline" headingLevel={2}>
			<ol class="timeline">
				{#each data.timeline as entry (entry.id)}
					<li class="timeline-item tone-{entry.tone}">
						<span class="dot" aria-hidden="true"></span>
						<div>
							<strong>{entry.title}</strong>
							<p>{entry.description}</p>
							<span class="meta">{entry.meta}</span>
						</div>
					</li>
				{/each}
			</ol>
		</Card>
	</div>

	{#if data.canCancel}
		<form bind:this={cancelForm} method="POST" action="?/cancel" class="visually-hidden">
			<input type="hidden" name="reason" value={cancelReason} />
		</form>

		<ConfirmDialog
			bind:open={cancelOpen}
			title="Batalkan disposal?"
			description="Status aset akan dikembalikan ke {disposal.previousAssetStatusLabel}. Record disposal tidak dihapus dan pembatalan tercatat di audit."
			confirmLabel="Batalkan disposal"
			tone="danger"
			loading={cancelSubmitting}
			onconfirm={submitCancel}
			oncancel={closeCancel}
		>
			<label class="cancel-label" for="cancel-reason">Alasan pembatalan</label>
			<textarea
				id="cancel-reason"
				rows="3"
				maxlength="500"
				bind:value={cancelReason}
				class="cancel-input"
				aria-invalid={cancelError ? 'true' : undefined}></textarea>
			{#if cancelError}
				<p class="cancel-error" role="alert">{cancelError}</p>
			{/if}
		</ConfirmDialog>
	{/if}
</main>

<style>
	.notice {
		margin-bottom: var(--space-4);
	}

	.layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.meta-grid {
		display: grid;
		grid-template-columns: 1fr;
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
		background: var(--surface);
		color: var(--primary);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
	}

	.timeline {
		display: grid;
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.timeline-item {
		display: grid;
		grid-template-columns: 12px minmax(0, 1fr);
		gap: var(--space-3);
	}

	.timeline-item .dot {
		width: 10px;
		height: 10px;
		margin-top: 4px;
		border-radius: var(--radius-full);
		background: var(--neutral-text);
	}

	.timeline-item.tone-info .dot {
		background: var(--info-text);
	}

	.timeline-item.tone-danger .dot {
		background: var(--danger-text);
	}

	.timeline-item.tone-warning .dot {
		background: var(--warning-text);
	}

	.timeline-item p {
		margin: 2px 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.timeline-item .meta {
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

	.cancel-label {
		display: block;
		margin-bottom: var(--space-2);
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.cancel-input {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-1);
		font-size: var(--font-size-base);
	}

	.cancel-error {
		margin: var(--space-2) 0 0;
		color: var(--danger-text);
		font-size: var(--font-size-sm);
	}

	@media (min-width: 768px) {
		.meta-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.meta-grid .full {
			grid-column: 1 / -1;
		}
	}

	@media (min-width: 1100px) {
		.layout {
			grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
			align-items: start;
		}
	}
</style>
