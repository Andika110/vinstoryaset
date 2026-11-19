<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { MESSAGES } from '#lib/messages.js';

	const messages: Record<number, { title: string; body: string }> = {
		401: {
			title: 'Sesi tidak valid',
			body: 'Silakan login kembali untuk melanjutkan.'
		},
		403: {
			title: 'Tidak punya akses',
			body: 'Anda tidak memiliki akses ke halaman ini. Hubungi IT Administrator jika Anda merasa ini keliru.'
		},
		404: {
			title: 'Tidak ditemukan',
			body: 'Halaman atau data yang Anda cari tidak tersedia.'
		},
		429: {
			title: 'Terlalu banyak permintaan',
			body: 'Silakan tunggu sebentar lalu coba lagi.'
		},
		500: {
			title: 'Terjadi kesalahan sistem',
			body: MESSAGES.systemError
		}
	};

	const info = $derived(
		messages[page.status] ?? {
			title: 'Terjadi kesalahan',
			body: 'Permintaan tidak dapat diproses.'
		}
	);

	const detail = $derived.by(() => {
		if (page.status >= 500) return null;
		const text = page.error?.message?.trim();
		if (!text) return null;
		if (/^(not found|forbidden|internal error|unauthorized)$/i.test(text)) return null;
		return text;
	});

	const reference = $derived(page.status >= 500 ? page.error?.reference : undefined);
</script>

<svelte:head>
	<title>{info.title} — Aset &amp; Inventory IT</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="container page error-page">
	<p class="status">{page.status}</p>
	<h1>{info.title}</h1>
	<p class="text-muted">{detail ?? info.body}</p>
	{#if reference}
		<p class="reference">
			Kode referensi: <code>{reference}</code>
		</p>
	{/if}
	<div class="actions">
		<a class="button-link" href={resolve('/(app)/dashboard')}>Kembali ke dashboard</a>
		<a href={resolve('/')}>Halaman utama</a>
	</div>
</main>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-3);
		max-width: 640px;
	}

	.status {
		margin: 0;
		color: var(--primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
	}

	.reference {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface-2);
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.reference code {
		font-family: var(--font-mono);
		font-weight: var(--weight-semibold);
	}

	h1 {
		margin: 0;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		margin-top: var(--space-3);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.button-link:hover {
		background: var(--primary-hover);
		color: var(--primary-contrast);
	}
</style>
