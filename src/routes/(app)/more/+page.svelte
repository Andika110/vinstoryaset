<script lang="ts">
	import { resolve } from '#lib/href.js';
	import { Button, Card, PageHeader, StatusBadge } from '#lib/components/index.js';
	import { NAV_GROUPS, ROLE_LABEL } from '#lib/navigation.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const role = $derived(data.user.role);
	const groups = $derived(NAV_GROUPS[role]);
</script>

<PageHeader title="Lainnya" description="Menu tambahan sesuai peran dan cakupan akses Anda." />

<div class="role-row">
	<span class="text-muted">Peran aktif:</span>
	<StatusBadge label={ROLE_LABEL[role]} tone="info" />
</div>

<div class="menu-grid">
	{#each groups as group (group.label)}
		<Card title={group.label} headingLevel={2}>
			<ul>
				{#each group.items as item (item.href)}
					<li><a href={resolve(item.href)}>{item.label}</a></li>
				{/each}
			</ul>
		</Card>
	{/each}
</div>

<Card title="Sesi" headingLevel={2}>
	<p class="text-muted">Keluar dari akun ini. Sesi aktif akan dicabut.</p>
	<form method="POST" action="/logout">
		<Button type="submit" variant="secondary">Keluar</Button>
	</form>
</Card>

<style>
	.role-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.menu-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		color: var(--text-1);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	a:hover {
		background: var(--surface-2);
		color: var(--primary);
	}

	@media (min-width: 768px) {
		.menu-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.menu-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
