<script lang="ts">
	import { resolve } from '$app/paths';
	import { Alert, AppShell, Button, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import { ROLE_LABEL, type Role } from '#lib/navigation.js';

	const roles: Role[] = ['admin', 'support', 'outlet'];

	let role = $state<Role>('admin');

	const userName = $derived(
		role === 'admin' ? 'Demo Administrator' : role === 'support' ? 'Demo IT Support' : 'Demo Outlet'
	);
	const scopeLabel = $derived(role === 'outlet' ? 'Union Outlet A' : 'Semua Lokasi');
</script>

<svelte:head>
	<title>Demo AppShell — Aset &amp; Inventory IT</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AppShell {role} {userName} {scopeLabel} activePath="/dashboard">
	<PageHeader
		title="Demo AppShell"
		description="Ganti peran untuk melihat menu, indikator outlet, dan navigasi yang berbeda."
	>
		{#snippet actions()}
			{#each roles as option (option)}
				<Button
					size="sm"
					variant={role === option ? 'primary' : 'secondary'}
					aria-pressed={role === option}
					onclick={() => (role = option)}
				>
					{ROLE_LABEL[option]}
				</Button>
			{/each}
		{/snippet}
	</PageHeader>

	<Alert tone="info" title="Demo FND-04">
		Autentikasi dan pemeriksaan izin per service akan dihubungkan pada FND-09. Halaman ini
		menampilkan shell dan navigasi dengan data demo.
	</Alert>

	<div class="demo-grid">
		<Card title="Peran aktif" headingLevel={2}>
			<StatusBadge label={ROLE_LABEL[role]} tone="info" />
			<p class="text-muted">Cakupan: {scopeLabel}</p>
		</Card>
		<Card title="Navigasi" headingLevel={2}>
			<p class="text-muted">
				Sidebar tampil pada layar ≥768px. Bottom navigation tampil pada layar &lt;768px dengan lima
				tujuan.
			</p>
		</Card>
		<Card title="Halaman nyata" headingLevel={2}>
			<p class="text-muted">Buka shell dengan route sebenarnya:</p>
			<p><a href={resolve('/(app)/dashboard')}>Buka /dashboard</a></p>
		</Card>
	</div>
</AppShell>

<style>
	.demo-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		margin-top: var(--space-5);
	}

	@media (min-width: 768px) {
		.demo-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
