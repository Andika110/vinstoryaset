<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, Button, PageHeader, StatusBadge } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const detailHref = $derived(resolve('/(app)/opname/[id]', { id: String(data.opname.id) }));
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

	{#if data.saved}
		<div class="notice">
			<Alert tone="success" title="Progres disimpan">
				Stok belum berubah. Lanjutkan sisa item bila ada.
			</Alert>
		</div>
	{/if}
	{#if form?.error}
		<div class="notice"><Alert tone="danger" title="Gagal menyimpan">{form.error}</Alert></div>
	{/if}

	<Alert tone="info" title="Snapshot sistem">
		Jumlah sistem diambil saat sesi dimulai dan tidak berubah. Menyimpan hasil hitung tidak mengubah
		stok; selisih ditindaklanjuti lewat penyesuaian stok terpisah.
	</Alert>

	<div class="progress-line">
		<span>{data.summary.checked}/{data.summary.total} item sudah dicek</span>
		<span>{data.summary.unchecked} belum dicek</span>
	</div>

	<form method="POST" action="?/save" class="check-form">
		<ul class="line-list">
			{#each data.lines as line (line.id)}
				<li>
					<article class="line-card" class:checked={line.isChecked}>
						<header class="line-head">
							<div>
								<span class="font-mono item-code">{line.itemCode}</span>
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
							<div class="fields">
								<label>
									<span>Hasil pengecekan</span>
									<select name={`result_${line.id}`}>
										<option value="" selected={(line.result ?? '') === ''}>Belum dicek</option>
										{#each data.resultOptions as option (option.value)}
											<option value={option.value} selected={line.result === option.value}>
												{option.label}
											</option>
										{/each}
									</select>
								</label>
								<label>
									<span>Kondisi fisik</span>
									<select name={`condition_${line.id}`}>
										<option value="" selected={line.physicalConditionId === null}>—</option>
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
										name={`notes_${line.id}`}
										type="text"
										maxlength="500"
										value={line.notes ?? ''}
										placeholder="Opsional"
									/>
								</label>
							</div>
						{:else}
							<div class="fields">
								<label>
									<span>Jumlah fisik</span>
									<input
										name={`physical_${line.id}`}
										type="number"
										min="0"
										step="1"
										value={line.physicalQty ?? ''}
										placeholder="Belum dicek"
									/>
								</label>
								<label class="notes-field">
									<span>Catatan</span>
									<input
										name={`notes_${line.id}`}
										type="text"
										maxlength="500"
										value={line.notes ?? ''}
										placeholder="Opsional"
									/>
								</label>
							</div>
						{/if}
					</article>
				</li>
			{/each}
		</ul>

		<div class="form-actions">
			<Button type="submit">Simpan progres</Button>
			<a class="back-link" href={detailHref}>Kembali tanpa menyimpan</a>
		</div>
	</form>
</main>

<style>
	.notice {
		margin-bottom: var(--space-4);
	}

	.progress-line {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--space-2);
		margin: var(--space-4) 0 var(--space-3);
		color: var(--text-2);
		font-size: var(--font-size-sm);
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
	}

	.system-qty {
		margin: var(--space-1) 0 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.fields {
		display: grid;
		grid-template-columns: 1fr;
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

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
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
