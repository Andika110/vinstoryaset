<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Alert, Button, Card, Input } from '#lib/components/index.js';
	import { MESSAGES } from '#lib/messages.js';
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
	<title>Masuk — Aset &amp; Inventory IT</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="auth-header">
	<div class="brand">
		<span class="brand-mark" aria-hidden="true">IT</span>
		<span>Aset &amp; Inventory</span>
	</div>
	<h1>Masuk ke aplikasi</h1>
	<p class="text-muted">Gunakan akun yang diberikan oleh IT Administrator.</p>
</header>

{#if !form?.error}
	{#if data.reason === 'expired'}
		<Alert tone="warning" title="Sesi berakhir">
			{MESSAGES.sessionExpired}
		</Alert>
	{:else if data.reason === 'logout'}
		<Alert tone="info" title="Anda telah keluar">Sesi aktif sudah diakhiri.</Alert>
	{/if}
{/if}

<Card padding="lg">
	<form method="POST" use:enhance={submit} class="stack">
		<input type="hidden" name="next" value={data.next} />

		{#if form?.error}
			<Alert tone="danger" title="Tidak dapat masuk">{form.error}</Alert>
		{/if}

		<Input
			label="Username atau email"
			name="identifier"
			autocomplete="username"
			placeholder="contoh: admin"
			required
			value={form?.identifier ?? ''}
			error={form?.fieldErrors?.identifier}
		/>

		<Input
			label="Password"
			name="password"
			type="password"
			autocomplete="current-password"
			required
			error={form?.fieldErrors?.password}
		/>

		<Button type="submit" block loading={submitting}>Masuk</Button>
	</form>
</Card>

<p class="auth-footer">
	<a href={resolve('/')}>Kembali ke halaman utama</a>
</p>

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
		margin: 0;
		text-align: center;
		font-size: var(--font-size-sm);
	}
</style>
