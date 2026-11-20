<script lang="ts">
	import { resolve } from '#lib/href.js';
	import { NAV_GROUPS, type Role } from '#lib/navigation.js';
	import NavIcon from './NavIcon.svelte';

	interface Props {
		role: Role;
		pathname: string;
	}

	let { role, pathname }: Props = $props();

	const match = $derived.by(() => {
		let best: { group: string; label: string; href: string } | null = null;
		for (const group of NAV_GROUPS[role]) {
			for (const item of group.items) {
				const isExact = pathname === item.href;
				const isChild = pathname.startsWith(`${item.href}/`);
				if (!isExact && !isChild) continue;
				if (!best || item.href.length > best.href.length) {
					best = { group: group.label, label: item.label, href: item.href };
				}
			}
		}
		return best;
	});

	const isDashboard = $derived(pathname === '/dashboard');

	const extra = $derived.by(() => {
		if (!match) return '';
		const rest = pathname.slice(match.href.length).split('/').filter(Boolean);
		if (rest.length === 0) return '';
		const last = rest[rest.length - 1];
		if (/^\d+$/.test(last)) return 'Detail';
		if (last === 'new') return 'Baru';
		if (last === 'edit') return 'Edit';
		if (last === 'export') return 'Export';
		return last
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	});
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
	<a class="home" href={resolve('/(app)/dashboard')} aria-label="Dashboard">
		<NavIcon name="home" size={16} />
	</a>

	{#if isDashboard}
		<NavIcon name="chevron-right" size={14} />
		<span class="current">Dashboard</span>
	{:else if match}
		<NavIcon name="chevron-right" size={14} />
		<span class="group">{match.group}</span>
		<NavIcon name="chevron-right" size={14} />
		<a class="current-link" href={resolve(match.href)} aria-current={extra ? undefined : 'page'}>
			{match.label}
		</a>
		{#if extra}
			<NavIcon name="chevron-right" size={14} />
			<span class="current">{extra}</span>
		{/if}
	{/if}
</nav>

<style>
	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		color: var(--text-3);
		font-size: var(--font-size-sm);
		white-space: nowrap;
	}

	.home {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		color: var(--text-3);
		text-decoration: none;
	}

	.home:hover {
		background: var(--surface-2);
		color: var(--text-1);
	}

	.group {
		overflow: hidden;
		max-width: 140px;
		color: var(--text-2);
		text-overflow: ellipsis;
	}

	.current,
	.current-link {
		overflow: hidden;
		max-width: 180px;
		color: var(--text-1);
		font-weight: var(--weight-semibold);
		text-overflow: ellipsis;
		text-decoration: none;
	}

	.current-link:hover {
		color: var(--primary);
	}
</style>
