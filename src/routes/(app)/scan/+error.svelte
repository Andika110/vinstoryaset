<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const message = $derived(page.error?.message ?? 'Kode QR tidak valid atau aset tidak ditemukan.');
</script>

<svelte:head>
	<title>Scan tidak ditemukan — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page scan-error">
	<p class="status">{page.status}</p>
	<h1>Aset tidak ditemukan</h1>
	<p class="text-muted">{message}</p>

	<form method="GET" action={resolve('/(app)/scan')} class="manual-form">
		<label for="error-code">Coba Asset Code lain</label>
		<input
			id="error-code"
			name="code"
			type="text"
			autocomplete="off"
			placeholder="Contoh: AST-2026-0001"
		/>
		<button type="submit" class="button-link">Buka aset</button>
	</form>

	<div class="actions">
		<a href={resolve('/(app)/scan')}>Kembali ke scanner</a>
		<a href={resolve('/(app)/dashboard')}>Dashboard</a>
	</div>
</main>

<style>
	.scan-error {
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

	h1 {
		margin: 0;
	}

	.manual-form {
		display: grid;
		gap: var(--space-2);
		width: 100%;
		max-width: 420px;
		margin-top: var(--space-2);
	}

	.manual-form label {
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.manual-form input {
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-1);
		font-family: var(--font-mono);
		font-size: var(--font-size-base);
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
		font-family: inherit;
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
		cursor: pointer;
		justify-self: start;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		margin-top: var(--space-2);
	}
</style>
