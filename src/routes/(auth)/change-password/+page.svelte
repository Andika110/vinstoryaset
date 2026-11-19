<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { Alert, Button, Card, Input } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);

	const submit: SubmitFunction = () => {
		submitting = true;

		return async ({ update }) => {
			await update();
			submitting = false;
		};
	};
</script>

<svelte:head>
	<title>Ganti Password — Aset &amp; Inventory IT</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="auth-header">
	<div class="brand">
		<span class="brand-mark" aria-hidden="true">IT</span>
		<span>Aset &amp; Inventory</span>
	</div>
	<h1>Ganti password</h1>
	<p class="text-muted">
		Halo {data.name}. Password awal harus diganti sebelum Anda menggunakan aplikasi.
	</p>
</header>

<Card padding="lg">
	<form method="POST" use:enhance={submit} class="stack">
		<input type="hidden" name="next" value={data.next} />

		{#if form?.error}
			<Alert tone="danger" title="Password belum berubah">{form.error}</Alert>
		{/if}

		<Input
			label="Password baru"
			name="password"
			type="password"
			autocomplete="new-password"
			hint="Minimal 8 karakter."
			required
			error={form?.fieldErrors?.password}
		/>

		<Input
			label="Konfirmasi password baru"
			name="confirmPassword"
			type="password"
			autocomplete="new-password"
			required
			error={form?.fieldErrors?.confirmPassword}
		/>

		<Button type="submit" block loading={submitting}>Simpan password</Button>
	</form>
</Card>

<div class="auth-footer">
	<form method="POST" action="/logout">
		<Button type="submit" variant="ghost" size="sm">Keluar</Button>
	</form>
</div>

<style>
	.auth-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-bold);
	}

	h1 {
		margin: 0;
		font-size: var(--font-size-2xl);
	}

	.auth-footer {
		display: flex;
		justify-content: center;
	}
</style>
