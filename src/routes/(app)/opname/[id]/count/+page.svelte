<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Card,
		EmptyState,
		PageHeader,
		QrScanner,
		StatusBadge,
		Toast
	} from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Line = (typeof data)['lines'][number];
	type Summary = (typeof data)['summary'];
	type Tone = 'success' | 'warning' | 'danger' | 'info';

	const detailHref = $derived(resolve('/(app)/opname/[id]', { id: String(data.opname.id) }));
	const endpoint = $derived(`/opname/${data.opname.id}/count/save`);

	// svelte-ignore state_referenced_locally
	let lines = $state(data.lines);
	// svelte-ignore state_referenced_locally
	let summary = $state(data.summary);
	// svelte-ignore state_referenced_locally
	let filter = $state<'unchecked' | 'issues' | 'all'>(
		data.summary.unchecked > 0 ? 'unchecked' : 'all'
	);
	let search = $state('');
	let savingId = $state<number | null>(null);
	let editing = $state<Record<number, boolean>>({});
	let qtyDraft = $state<Record<number, number>>({});
	let toastOpen = $state(false);
	let toastTone = $state<Tone>('success');
	let toastTitle = $state('');
	let toastMessage = $state('');
	let scanOpen = $state(false);
	let scanBusy = $state(false);
	let lastScan = $state<{
		line: Line;
		alreadyChecked: boolean;
		message: string;
	} | null>(null);

	$effect(() => {
		lines = data.lines;
		summary = data.summary;
	});

	const progressPercent = $derived(
		summary.total > 0 ? Math.round((summary.checked / summary.total) * 100) : 0
	);

	const issueCount = $derived(
		lines.filter(
			(line) =>
				line.isChecked &&
				(line.result === 'not_found' ||
					line.result === 'other_location' ||
					line.result === 'condition_changed' ||
					(line.variance !== null && line.variance !== 0))
		).length
	);

	const filtered = $derived.by(() => {
		const term = search.trim().toLowerCase();
		return lines.filter((line) => {
			if (filter === 'unchecked' && line.isChecked) return false;
			if (
				filter === 'issues' &&
				!(
					line.isChecked &&
					(line.result === 'not_found' ||
						line.result === 'other_location' ||
						line.result === 'condition_changed' ||
						(line.variance !== null && line.variance !== 0))
				)
			)
				return false;
			if (!term) return true;
			return (
				line.itemCode.toLowerCase().includes(term) || line.itemName.toLowerCase().includes(term)
			);
		});
	});

	function showToast(tone: Tone, title: string, message: string): void {
		toastTone = tone;
		toastTitle = title;
		toastMessage = message;
		toastOpen = true;
	}

	function applyLine(updated: Line): void {
		lines = lines.map((line) => (line.id === updated.id ? updated : line));
	}

	async function sendForm(
		body: FormData
	): Promise<{ ok: boolean; error?: string; line?: Line; summary?: Summary; outcome?: unknown }> {
		const lineIdRaw = body.get('lineId');
		const lineId = lineIdRaw ? Number(lineIdRaw) : null;
		if (lineId !== null && Number.isInteger(lineId)) savingId = lineId;
		try {
			const res = await fetch(endpoint, { method: 'POST', body });
			const json = await res.json();
			if (!res.ok || !json.ok) {
				showToast('danger', 'Gagal menyimpan', json.error ?? 'Perubahan tidak tersimpan.');
				return json;
			}
			if (json.line) applyLine(json.line);
			if (json.summary) summary = json.summary;
			return json;
		} catch {
			showToast('danger', 'Koneksi gagal', 'Periksa jaringan, lalu coba lagi.');
			return { ok: false, error: 'Koneksi gagal' };
		} finally {
			savingId = null;
		}
	}

	function submitQuick(event: SubmitEvent): void {
		event.preventDefault();
		void sendForm(new FormData(event.currentTarget as HTMLFormElement));
	}

	function openEdit(line: Line): void {
		editing = { ...editing, [line.id]: true };
		qtyDraft = { ...qtyDraft, [line.id]: line.physicalQty ?? 0 };
	}

	function closeEdit(lineId: number): void {
		editing = { ...editing, [lineId]: false };
	}

	function setQty(lineId: number, value: number): void {
		qtyDraft = { ...qtyDraft, [lineId]: Math.max(0, value) };
	}

	async function undoLine(line: Line): Promise<void> {
		const body = new FormData();
		body.set('intent', 'undo');
		body.set('lineId', String(line.id));
		body.set('notes', line.notes ?? '');
		const json = await sendForm(body);
		if (json.ok) showToast('info', 'Diurungkan', `${line.itemCode} kembali belum dicek.`);
	}

	async function handleScan(code: string): Promise<void> {
		if (scanBusy) return;
		scanBusy = true;
		try {
			const body = new FormData();
			body.set('intent', 'scan');
			body.set('code', code);
			const json = await sendForm(body);
			if (!json.ok) return;
			const outcome = json.outcome as
				| {
						kind: 'matched';
						code: string;
						line: Line;
						summary: Summary;
						alreadyChecked: boolean;
				  }
				| { kind: 'outside'; code: string; asset: { assetCode: string; locationName: string } }
				| { kind: 'unknown'; code: string }
				| undefined;
			if (outcome?.kind === 'matched') {
				lastScan = {
					line: outcome.line,
					alreadyChecked: outcome.alreadyChecked,
					message: outcome.alreadyChecked
						? `${outcome.code} sudah dicek sebelumnya.`
						: `${outcome.code} ditandai sesuai.`
				};
				if (outcome.alreadyChecked) {
					showToast('warning', 'Sudah dicek', `${outcome.code} sudah dicek sebelumnya.`);
				} else {
					showToast('success', 'Tersimpan', `${outcome.code} ditandai sesuai.`);
					if (typeof navigator !== 'undefined') navigator.vibrate?.(60);
				}
				if (outcome.summary) summary = outcome.summary;
				applyLine(outcome.line);
			} else if (outcome?.kind === 'outside') {
				showToast(
					'warning',
					'Bukan di sesi ini',
					`${outcome.asset.assetCode} terdaftar di ${outcome.asset.locationName}.`
				);
				lastScan = {
					line: lines[0],
					alreadyChecked: false,
					message: `${outcome.asset.assetCode} bukan bagian dari sesi ini.`
				};
			} else {
				showToast(
					'danger',
					'Tidak ditemukan',
					`Kode ${code} tidak dikenal atau di luar cakupan Anda.`
				);
			}
		} finally {
			scanBusy = false;
		}
	}

	const actionError = $derived((form as { error?: string; lineId?: number } | null)?.error);
</script>

<svelte:head>
	<title>Hitung {data.opname.opnameNumber} — Stock Opname</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Pengecekan fisik"
		description="{data.opname.opnameNumber} · {data.opname.outletName} · {data.opname.locationName}"
	>
		{#snippet actions()}
			<StatusBadge label={data.opname.statusLabel} tone={data.opname.statusTone} />
			<a class="back-link" href={detailHref}>Kembali ke detail</a>
		{/snippet}
	</PageHeader>

	{#if form?.lineSaved}
		<div class="notice">
			<Alert tone="success" title="Progres disimpan">Perubahan baris tersimpan.</Alert>
		</div>
	{/if}
	{#if actionError}
		<div class="notice">
			<Alert tone="danger" title="Gagal menyimpan">{actionError}</Alert>
		</div>
	{/if}

	<div class="progress-sticky">
		<div class="progress-head">
			<span>{summary.checked}/{summary.total} item dicek</span>
			<strong>{progressPercent}%</strong>
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

	<Alert tone="info" title="Snapshot sistem">
		Jumlah sistem diambil saat sesi dimulai dan tidak berubah. Menyimpan hasil hitung tidak mengubah
		stok; selisih ditindaklanjuti lewat penyesuaian stok terpisah.
	</Alert>

	{#if data.canScan}
		<Card title="Mode scan" description="Scan label QR aset untuk menandai sesuai secara otomatis.">
			<div class="scan-head">
				<Button variant={scanOpen ? 'secondary' : 'primary'} onclick={() => (scanOpen = !scanOpen)}>
					{scanOpen ? 'Tutup kamera' : 'Mulai scan'}
				</Button>
			</div>
			{#if scanOpen}
				<div class="scan-body">
					<QrScanner onDetect={handleScan} paused={scanBusy} />
					{#if lastScan}
						<div class="last-scan">
							<div>
								<strong>{lastScan.line.itemCode}</strong>
								<span>{lastScan.line.itemName}</span>
								<span class="subtle">{lastScan.message}</span>
							</div>
							{#if !lastScan.alreadyChecked && lastScan.line.isChecked && lastScan.line.result === 'matched'}
								<Button variant="secondary" size="sm" onclick={() => undoLine(lastScan!.line)}>
									Urungkan
								</Button>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</Card>
	{/if}

	<div class="filters">
		<div class="chips" role="group" aria-label="Filter item">
			<button
				type="button"
				class="chip"
				aria-pressed={filter === 'all'}
				onclick={() => (filter = 'all')}
			>
				Semua <span>{lines.length}</span>
			</button>
			<button
				type="button"
				class="chip"
				aria-pressed={filter === 'unchecked'}
				onclick={() => (filter = 'unchecked')}
			>
				Belum dicek <span>{summary.unchecked}</span>
			</button>
			<button
				type="button"
				class="chip"
				aria-pressed={filter === 'issues'}
				onclick={() => (filter = 'issues')}
			>
				Bermasalah <span>{issueCount}</span>
			</button>
		</div>
		<label class="search-field">
			<span class="visually-hidden">Cari item</span>
			<input type="search" bind:value={search} placeholder="Cari kode atau nama item" />
		</label>
	</div>

	{#if filtered.length === 0}
		<EmptyState
			title="Tidak ada item"
			description={search
				? 'Tidak ada item yang cocok dengan pencarian.'
				: filter === 'unchecked'
					? 'Semua item sudah dicek.'
					: 'Tidak ada item dengan kriteria ini.'}
		/>
	{:else}
		<ul class="line-list">
			{#each filtered as line (line.id)}
				<li>
					<article class="line-card" class:checked={line.isChecked}>
						<header class="line-head">
							<div>
								<span class="item-code">{line.itemCode}</span>
								<strong>{line.itemName}</strong>
								<p class="system-qty">
									Sistem: <strong>{line.systemQty}</strong>
									{line.unitName ?? (line.itemType === 'asset' ? 'unit' : '')}
									{#if line.itemType === 'asset' && line.systemConditionName}
										· Kondisi sistem: {line.systemConditionName}
									{/if}
								</p>
							</div>
							<StatusBadge label={line.resultLabel} tone={line.resultTone} size="sm" />
						</header>

						{#if line.itemType === 'asset'}
							{#if editing[line.id]}
								<form method="POST" action="?/saveLine" class="fields" onsubmit={submitQuick}>
									<input type="hidden" name="lineId" value={line.id} />
									<label>
										<span>Hasil pengecekan</span>
										<select name="result" value={line.result ?? ''}>
											<option value="">Belum dicek</option>
											{#each data.resultOptions as option (option.value)}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
									</label>
									<label>
										<span>Kondisi fisik</span>
										<select name="conditionId">
											<option value="">—</option>
											{#each data.conditions as condition (condition.id)}
												<option
													value={condition.id}
													selected={line.physicalConditionId === condition.id}
												>
													{condition.label}
												</option>
											{/each}
										</select>
									</label>
									<label class="notes-field">
										<span>Catatan</span>
										<input
											name="notes"
											type="text"
											maxlength="500"
											value={line.notes ?? ''}
											placeholder="Opsional"
										/>
									</label>
									<div class="form-actions">
										<Button type="submit" loading={savingId === line.id}>Simpan</Button>
										<Button type="button" variant="ghost" onclick={() => closeEdit(line.id)}>
											Batal
										</Button>
									</div>
								</form>
							{:else}
								<div class="quick-actions">
									{#if !line.isChecked}
										<form method="POST" action="?/saveLine" onsubmit={submitQuick}>
											<input type="hidden" name="lineId" value={line.id} />
											<input type="hidden" name="result" value="matched" />
											<input type="hidden" name="conditionId" value="" />
											<input type="hidden" name="notes" value={line.notes ?? ''} />
											<Button type="submit" size="sm" loading={savingId === line.id}>Sesuai</Button>
										</form>
										<form method="POST" action="?/saveLine" onsubmit={submitQuick}>
											<input type="hidden" name="lineId" value={line.id} />
											<input type="hidden" name="result" value="not_found" />
											<input type="hidden" name="conditionId" value="" />
											<input type="hidden" name="notes" value={line.notes ?? ''} />
											<Button
												type="submit"
												size="sm"
												variant="danger"
												loading={savingId === line.id}
											>
												Tidak ditemukan
											</Button>
										</form>
									{/if}
									<Button
										type="button"
										size="sm"
										variant="secondary"
										onclick={() => openEdit(line)}
									>
										{line.isChecked ? 'Ubah' : 'Detail'}
									</Button>
									{#if line.isChecked}
										<Button
											type="button"
											size="sm"
											variant="ghost"
											onclick={() => undoLine(line)}
											disabled={savingId === line.id}
										>
											Batalkan
										</Button>
									{/if}
								</div>
								{#if line.isChecked}
									<dl class="line-meta">
										{#if line.itemType === 'asset'}
											<div>
												<dt>Kondisi</dt>
												<dd>
													{line.systemConditionName ?? '—'} → {line.physicalConditionName ?? '—'}
												</dd>
											</div>
										{/if}
										<div>
											<dt>Dicek oleh</dt>
											<dd>{line.checkedByName ?? '—'}</dd>
										</div>
										<div>
											<dt>Waktu</dt>
											<dd>{line.checkedAtLabel}</dd>
										</div>
										{#if line.notes}
											<div class="full">
												<dt>Catatan</dt>
												<dd>{line.notes}</dd>
											</div>
										{/if}
									</dl>
								{/if}
							{/if}
						{:else}
							{#if editing[line.id]}
								<form method="POST" action="?/saveLine" class="fields" onsubmit={submitQuick}>
									<input type="hidden" name="lineId" value={line.id} />
									<input type="hidden" name="result" value="" />
									<label>
										<span>Jumlah fisik</span>
										<div class="qty-row">
											<button
												type="button"
												class="qty-step"
												onclick={() =>
													setQty(line.id, (qtyDraft[line.id] ?? line.physicalQty ?? 0) - 1)}
											>
												−
											</button>
											<input
												name="physicalQty"
												type="number"
												min="0"
												step="1"
												inputmode="numeric"
												value={qtyDraft[line.id] ?? line.physicalQty ?? ''}
											/>
											<button
												type="button"
												class="qty-step"
												onclick={() =>
													setQty(line.id, (qtyDraft[line.id] ?? line.physicalQty ?? 0) + 1)}
											>
												+
											</button>
										</div>
									</label>
									<label class="notes-field">
										<span>Catatan</span>
										<input
											name="notes"
											type="text"
											maxlength="500"
											value={line.notes ?? ''}
											placeholder="Opsional"
										/>
									</label>
									<div class="form-actions">
										<Button type="submit" loading={savingId === line.id}>Simpan</Button>
										<Button type="button" variant="ghost" onclick={() => closeEdit(line.id)}>
											Batal
										</Button>
									</div>
								</form>
							{:else}
								<div class="quick-actions">
									{#if !line.isChecked}
										<form method="POST" action="?/saveLine" onsubmit={submitQuick}>
											<input type="hidden" name="lineId" value={line.id} />
											<input type="hidden" name="result" value="" />
											<input type="hidden" name="physicalQty" value={line.systemQty} />
											<input type="hidden" name="notes" value={line.notes ?? ''} />
											<Button type="submit" size="sm" loading={savingId === line.id}>
												Sesuai (sistem)
											</Button>
										</form>
									{/if}
									<Button
										type="button"
										size="sm"
										variant="secondary"
										onclick={() => openEdit(line)}
									>
										{line.isChecked ? 'Ubah' : 'Input manual'}
									</Button>
									{#if line.isChecked}
										<Button
											type="button"
											size="sm"
											variant="ghost"
											onclick={() => undoLine(line)}
											disabled={savingId === line.id}
										>
											Batalkan
										</Button>
									{/if}
								</div>
								{#if line.isChecked}
									<dl class="line-meta">
										<div>
											<dt>Fisik</dt>
											<dd>{line.physicalQty ?? '—'} {line.unitName ?? ''}</dd>
										</div>
										<div>
											<dt>Selisih</dt>
											<dd>{line.variance ?? 0}</dd>
										</div>
										<div>
											<dt>Dicek oleh</dt>
											<dd>{line.checkedByName ?? '—'}</dd>
										</div>
										<div>
											<dt>Waktu</dt>
											<dd>{line.checkedAtLabel}</dd>
										</div>
										{#if line.notes}
											<div class="full">
												<dt>Catatan</dt>
												<dd>{line.notes}</dd>
											</div>
										{/if}
									</dl>
								{/if}
							{/if}
						{/if}
					</article>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="form-actions">
		<a class="back-link" href={detailHref}>Kembali tanpa menyimpan</a>
	</div>
</main>

<Toast bind:open={toastOpen} tone={toastTone} title={toastTitle} message={toastMessage} />

<style>
	.notice {
		margin-bottom: var(--space-4);
	}

	.progress-sticky {
		position: sticky;
		top: 0;
		z-index: var(--z-header);
		padding: var(--space-3) 0;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		margin-bottom: var(--space-4);
	}

	.progress-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--text-2);
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
		transition: width var(--motion-fast) var(--motion-ease);
	}

	.scan-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.scan-body {
		display: grid;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}

	.last-scan {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface-2);
	}

	.last-scan div {
		display: grid;
		gap: 2px;
	}

	.last-scan strong {
		font-size: var(--font-size-sm);
	}

	.last-scan span {
		font-size: var(--font-size-xs);
		color: var(--text-2);
	}

	.filters {
		display: grid;
		gap: var(--space-3);
		margin: var(--space-4) 0;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		min-height: 36px;
		padding: 0 var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--surface);
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
	}

	.chip[aria-pressed='true'] {
		border-color: var(--primary);
		background: var(--primary-soft);
		color: var(--primary-soft-text);
	}

	.chip span {
		display: inline-grid;
		place-items: center;
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		border-radius: var(--radius-full);
		background: rgb(255 255 255 / 0.5);
		font-size: var(--font-size-xs);
	}

	.search-field input {
		width: 100%;
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-1);
		font-size: var(--font-size-base);
	}

	.line-list {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.line-card {
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.line-card.checked {
		border-color: var(--success-border);
	}

	.line-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.item-code {
		display: block;
		color: var(--text-2);
		font-size: var(--font-size-xs);
		font-family: var(--font-mono);
	}

	.system-qty {
		margin: var(--space-1) 0 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.quick-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.fields {
		display: grid;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}

	.fields label {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}

	.fields label > span {
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.fields select,
	.fields input {
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-1);
		font-size: var(--font-size-base);
	}

	.notes-field {
		grid-column: 1 / -1;
	}

	.qty-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.qty-row input {
		flex: 1;
		min-width: 0;
		text-align: center;
		font-family: var(--font-mono);
	}

	.qty-step {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface-2);
		color: var(--text-1);
		font-size: var(--font-size-lg);
		font-weight: var(--weight-bold);
		cursor: pointer;
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-3);
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

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 900px) {
		.fields {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr);
		}
	}
</style>
