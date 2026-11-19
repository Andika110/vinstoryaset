<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, Card, PageHeader } from '#lib/components/index.js';
	import { ROLE_LABEL } from '#lib/navigation.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const log = $derived(data.log);

	function json(value: unknown): string {
		if (value === null || value === undefined) return '';
		return JSON.stringify(value, null, 2);
	}
</script>

<svelte:head>
	<title>Audit #{log.id} — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader title="Audit #{log.id}" description="{log.action} · {log.module}">
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/admin/audit')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	<div class="notice">
		<Alert tone="info" title="Read-only">
			Audit log bersifat append-only. Tidak ada aksi edit atau hapus pada halaman ini.
		</Alert>
	</div>

	<Card title="Event detail" headingLevel={2}>
		<dl class="info-list">
			<div>
				<dt>Waktu</dt>
				<dd>{log.createdAtLabel}</dd>
			</div>
			<div>
				<dt>Pengguna</dt>
				<dd>{log.userName} ({log.username})</dd>
			</div>
			<div>
				<dt>Role</dt>
				<dd>{ROLE_LABEL[log.role as keyof typeof ROLE_LABEL] ?? log.role}</dd>
			</div>
			<div>
				<dt>Aksi</dt>
				<dd class="font-mono">{log.action}</dd>
			</div>
			<div>
				<dt>Modul</dt>
				<dd class="font-mono">{log.module}</dd>
			</div>
			<div>
				<dt>Record ID</dt>
				<dd class="font-mono">{log.recordId ?? '—'}</dd>
			</div>
		</dl>
	</Card>

	<div class="viewer-grid">
		<Card title="Sebelum" headingLevel={2}>
			{#if log.previousValue === null || log.previousValue === undefined}
				<p class="text-muted">Tidak ada nilai sebelumnya.</p>
			{:else}
				<pre>{json(log.previousValue)}</pre>
			{/if}
		</Card>

		<Card title="Sesudah" headingLevel={2}>
			{#if log.newValue === null || log.newValue === undefined}
				<p class="text-muted">Tidak ada nilai sesudah.</p>
			{:else}
				<pre>{json(log.newValue)}</pre>
			{/if}
		</Card>
	</div>
</main>

<style>
	.notice {
		margin-bottom: var(--space-4);
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

	.viewer-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		margin-top: var(--space-4);
	}

	pre {
		max-height: 480px;
		margin: 0;
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface-2);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		line-height: var(--leading-normal);
		overflow: auto;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 900px) {
		.info-list {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.viewer-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
