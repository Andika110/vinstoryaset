<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, Button, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import { ROLE_LABEL } from '#lib/navigation.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const actionData = $derived(
		form as { temporaryPassword?: string; success?: string; error?: string } | null
	);

	const editHref = $derived(resolve('/(app)/admin/users/[id]/edit', { id: String(data.user.id) }));

	const dateFormatter = new Intl.DateTimeFormat('id-ID', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Jakarta'
	});

	function formatDate(value: Date | string | null): string {
		if (!value) return '—';
		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
	}

	function deviceLabel(userAgent: string | null): string {
		if (!userAgent) return 'Perangkat tidak dikenal';
		if (/mobile/i.test(userAgent)) return 'Perangkat mobile';
		if (/windows/i.test(userAgent)) return 'Windows';
		if (/mac/i.test(userAgent)) return 'macOS';
		if (/linux/i.test(userAgent)) return 'Linux';
		return 'Browser';
	}
</script>

<svelte:head>
	<title>{data.user.fullName} — Pengguna</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title={data.user.fullName}
		description="Detail akun, status, dan sesi aktif pengguna."
	>
		{#snippet actions()}
			<a class="button-link" href={editHref}>Edit pengguna</a>
			<a class="back-link" href={resolve('/(app)/admin/users')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	{#if actionData?.temporaryPassword}
		<Alert tone="success" title="Password berhasil direset">
			Password sementara: <code class="font-mono">{actionData.temporaryPassword}</code>. Catat
			sekarang karena password ini tidak ditampilkan lagi. Semua sesi pengguna sudah dicabut dan
			pengguna wajib mengganti password saat login berikutnya.
		</Alert>
	{:else if actionData?.success}
		<Alert tone="success" title="Berhasil">{actionData.success}</Alert>
	{:else if actionData?.error}
		<Alert tone="danger" title="Gagal">{actionData.error}</Alert>
	{/if}

	<div class="detail-grid">
		<Card title="Profil" headingLevel={2}>
			<dl class="detail-list">
				<div>
					<dt>Username</dt>
					<dd class="font-mono">{data.user.username}</dd>
				</div>
				<div>
					<dt>Email</dt>
					<dd>{data.user.email}</dd>
				</div>
				<div>
					<dt>Role</dt>
					<dd>{ROLE_LABEL[data.user.role]}</dd>
				</div>
				<div>
					<dt>Outlet</dt>
					<dd>{data.user.outletName ?? '—'}</dd>
				</div>
				<div>
					<dt>Status</dt>
					<dd>
						<StatusBadge
							label={data.user.isActive ? 'Aktif' : 'Nonaktif'}
							tone={data.user.isActive ? 'success' : 'neutral'}
							dot={data.user.isActive}
						/>
					</dd>
				</div>
				<div>
					<dt>Password</dt>
					<dd>
						<StatusBadge
							label={data.user.mustChangePassword ? 'Wajib diganti' : 'Sudah diganti'}
							tone={data.user.mustChangePassword ? 'warning' : 'success'}
						/>
					</dd>
				</div>
				<div>
					<dt>Login terakhir</dt>
					<dd>{formatDate(data.user.lastLoginAt)}</dd>
				</div>
				<div>
					<dt>Dibuat</dt>
					<dd>{formatDate(data.user.createdAt)}</dd>
				</div>
			</dl>
		</Card>

		<Card title="Reset password" headingLevel={2}>
			<div class="stack">
				<p class="text-muted">
					Reset akan membuat password sementara, mencabut semua sesi aktif, dan memaksa pengguna
					mengganti password saat login berikutnya.
				</p>
				<form
					method="POST"
					action="?/resetPassword"
					onsubmit={(event) => {
						if (!confirm('Reset password pengguna ini? Semua sesi akan dicabut.')) {
							event.preventDefault();
						}
					}}
				>
					<Button type="submit" variant="secondary">Reset password</Button>
				</form>
			</div>
		</Card>
	</div>

	<Card title="Sesi aktif" headingLevel={2}>
		{#if data.user.sessions.length === 0}
			<Alert tone="info" title="Tidak ada sesi aktif">
				Pengguna ini belum memiliki sesi login yang aktif.
			</Alert>
		{:else}
			<div class="session-list">
				{#each data.user.sessions as session (session.id)}
					<article class="session-item">
						<div>
							<h3>{deviceLabel(session.userAgent)}</h3>
							<p class="text-subtle">
								IP: {session.ipAddress ?? '—'} · Login: {formatDate(session.createdAt)} · Aktif:
								{formatDate(session.lastSeenAt)}
							</p>
							<p class="text-subtle">Berakhir: {formatDate(session.expiresAt)}</p>
						</div>
						<form method="POST" action="?/revokeSession">
							<input type="hidden" name="sessionId" value={session.id} />
							<Button type="submit" variant="ghost" size="sm">Cabut sesi</Button>
						</form>
					</article>
				{/each}
			</div>

			<div class="session-footer">
				<form
					method="POST"
					action="?/revokeAllSessions"
					onsubmit={(event) => {
						if (!confirm('Cabut semua sesi aktif pengguna ini?')) {
							event.preventDefault();
						}
					}}
				>
					<Button type="submit" variant="danger" size="sm">Cabut semua sesi</Button>
				</form>
			</div>
		{/if}
	</Card>
</main>

<style>
	.detail-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.detail-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin: 0;
	}

	.detail-list > div {
		display: grid;
		grid-template-columns: minmax(120px, 35%) minmax(0, 1fr);
		gap: var(--space-3);
		align-items: baseline;
	}

	.detail-list dt {
		color: var(--text-3);
		font-size: var(--font-size-sm);
	}

	.detail-list dd {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		overflow-wrap: anywhere;
	}

	.session-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.session-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}

	.session-item h3 {
		margin: 0;
		font-size: var(--font-size-base);
	}

	.session-item p {
		margin: var(--space-1) 0 0;
	}

	.session-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--space-4);
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

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 768px) {
		.detail-grid {
			grid-template-columns: minmax(0, 1fr) minmax(280px, 0.65fr);
		}
	}
</style>
