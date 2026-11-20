<script lang="ts">
	import { page } from '$app/state';
	import { onMount, tick, untrack } from 'svelte';
	import { resolve } from '#lib/href.js';
	import {
		getInitials,
		isActivePath,
		NAV_GROUPS,
		ROLE_LABEL,
		type NavItem,
		type Role
	} from '#lib/navigation.js';
	import Button from './Button.svelte';
	import NavIcon from './NavIcon.svelte';

	const GROUP_STATE_KEY = 'inventory:sidebar-groups';

	interface Props {
		role: Role;
		userName: string;
		scopeLabel: string;
		activePath?: string;
		collapsed?: boolean;
	}

	let {
		role,
		userName,
		scopeLabel,
		activePath = page.url.pathname,
		collapsed = false
	}: Props = $props();

	const groups = $derived(NAV_GROUPS[role]);
	const initials = $derived(getInitials(userName));
	let openGroups = $state<Record<string, boolean>>(defaultOpenState());
	let groupsReady = $state(false);
	let navEl = $state<HTMLElement | null>(null);
	let scrollToken = 0;

	function groupIsActive(items: NavItem[]): boolean {
		return items.some((item) => isActivePath(activePath, item.href));
	}

	function defaultOpenState(): Record<string, boolean> {
		const collapsible = groups.filter((group) => group.items.length > 1);
		const active = collapsible.filter((group) => groupIsActive(group.items));
		const source = active.length > 0 ? active : collapsible;
		return Object.fromEntries(source.map((group) => [group.label, true]));
	}

	onMount(() => {
		try {
			const stored = localStorage.getItem(GROUP_STATE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as Record<string, unknown>;
				const next: Record<string, boolean> = {};
				for (const [key, value] of Object.entries(parsed)) {
					if (typeof value === 'boolean') next[key] = value;
				}
				openGroups = next;
			}
		} catch {
			// Abaikan state tersimpan yang rusak.
		}
		groupsReady = true;
	});

	$effect(() => {
		if (!groupsReady) return;
		localStorage.setItem(GROUP_STATE_KEY, JSON.stringify(openGroups));
	});

	$effect(() => {
		if (!groupsReady || !navEl || !activePath) return;

		const current = untrack(() => openGroups);
		const next = { ...current };
		let changed = false;

		for (const group of groups) {
			if (group.items.length < 2) continue;
			if (groupIsActive(group.items) && !next[group.label]) {
				next[group.label] = true;
				changed = true;
			}
		}

		if (changed) openGroups = next;

		const token = ++scrollToken;
		void tick().then(() => {
			if (token !== scrollToken) return;
			navEl?.querySelector<HTMLElement>('.nav-link[aria-current="page"]')?.scrollIntoView({
				block: 'nearest'
			});
		});
	});

	function groupOpen(label: string): boolean {
		return openGroups[label] ?? false;
	}

	function toggleGroup(label: string, event: Event): void {
		const element = event.currentTarget as HTMLDetailsElement;
		openGroups = { ...openGroups, [label]: element.open };
	}

	const icons: Record<string, string> = {
		'/dashboard': 'dashboard',
		'/assets': 'box',
		'/assets/labels': 'qr',
		'/scan': 'scan',
		'/assets/assignments': 'assign',
		'/assets/mutations': 'swap',
		'/assets/loans': 'loan',
		'/maintenance': 'wrench',
		'/maintenance/new': 'wrench',
		'/disposals': 'trash',
		'/inventory': 'package',
		'/inventory/availability': 'check',
		'/receiving': 'receiving',
		'/stock': 'layers',
		'/opname': 'clipboard',
		'/requests': 'request',
		'/requests/new': 'request',
		'/reports': 'chart',
		'/admin/master-data': 'sliders',
		'/admin/users': 'users',
		'/admin/audit': 'shield',
		'/admin/import': 'upload',
		'/dev/ui': 'layout',
		'/profile': 'user'
	};

	function iconFor(href: string): string {
		if (icons[href]) return icons[href];
		if (href.startsWith('/assets/')) return 'box';
		if (href.startsWith('/inventory/')) return 'package';
		if (href.startsWith('/reports/')) return 'chart';
		if (href.startsWith('/admin/')) return 'sliders';
		return 'circle';
	}
</script>

{#snippet navLink(item: NavItem)}
	<a
		href={resolve(item.href)}
		class="nav-link"
		title={item.label}
		aria-label={item.label}
		aria-current={isActivePath(activePath, item.href) ? 'page' : undefined}
	>
		<NavIcon name={iconFor(item.href)} />
		<span>{item.label}</span>
	</a>
{/snippet}

<aside class="sidebar" class:collapsed>
	<a class="brand" href={resolve('/(app)/dashboard')}>
		<span class="brand-mark" aria-hidden="true">IT</span>
		<span class="brand-text">
			<strong>Aset &amp; Inventory</strong>
			<span>IT Management</span>
		</span>
		<span class="visually-hidden">Dashboard</span>
	</a>

	<nav class="nav" aria-label="Navigasi utama" bind:this={navEl}>
		{#if collapsed}
			{#each groups as group (group.label)}
				<div class="nav-group">
					<ul>
						{#each group.items as item (item.href)}
							<li>{@render navLink(item)}</li>
						{/each}
					</ul>
				</div>
			{/each}
		{:else}
			{#each groups as group (group.label)}
				{#if group.items.length === 1}
					<div class="nav-single">{@render navLink(group.items[0])}</div>
				{:else}
					<details
						class="nav-group"
						open={groupOpen(group.label)}
						class:active={groupIsActive(group.items)}
						ontoggle={(event) => toggleGroup(group.label, event)}
					>
						<summary>
							<span>{group.label}</span>
							<svg
								class="chevron"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="m6 9 6 6 6-6"></path>
							</svg>
						</summary>
						<ul>
							{#each group.items as item (item.href)}
								<li>{@render navLink(item)}</li>
							{/each}
						</ul>
					</details>
				{/if}
			{/each}
		{/if}
	</nav>

	<div class="sidebar-footer">
		<div class="scope">
			<span class="scope-dot" aria-hidden="true"></span>
			<span>{scopeLabel}</span>
		</div>
		<div class="user">
			<span class="avatar" aria-hidden="true">{initials}</span>
			<span class="user-text">
				<strong>{userName}</strong>
				<span>{ROLE_LABEL[role]}</span>
			</span>
		</div>
		<form method="POST" action="/logout" class="logout-form">
			<Button type="submit" variant="ghost" size="sm" block>Keluar</Button>
		</form>
	</div>
</aside>

<style>
	.sidebar {
		display: none;
		flex-direction: column;
		width: 248px;
		height: 100dvh;
		position: sticky;
		top: 0;
		border-right: 1px solid var(--border);
		background: var(--surface);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--border-strong) transparent;
		transition: width var(--motion-fast) var(--motion-ease);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 76px;
		padding: var(--space-4) var(--space-4) var(--space-3);
		color: var(--text-1);
		text-decoration: none;
	}

	.brand-mark {
		display: grid;
		flex: none;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		background: var(--text-1);
		color: var(--surface);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-bold);
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: var(--leading-tight);
	}

	.brand-text strong {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
	}

	.brand-text span {
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.nav {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-3) var(--space-5);
	}

	.nav-single {
		padding-bottom: var(--space-1);
	}

	.nav-single:not(:first-child) {
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
	}

	.nav-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-group summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: 44px;
		padding: 0 var(--space-2);
		border-radius: var(--radius-sm);
		color: var(--text-3);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		list-style: none;
	}

	.nav-group summary::-webkit-details-marker {
		display: none;
	}

	.nav-group summary:hover {
		color: var(--text-1);
	}

	.nav-group.active summary {
		color: var(--text-2);
	}

	.chevron {
		flex: none;
		opacity: 0.55;
		transition: transform var(--motion-fast) var(--motion-ease);
	}

	.nav-group:not([open]) .chevron {
		transform: rotate(-90deg);
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 1px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 44px;
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.nav-link :global(svg) {
		flex: none;
		color: var(--text-3);
	}

	.nav-link:hover {
		background: var(--surface-2);
		color: var(--text-1);
	}

	.nav-link:hover :global(svg) {
		color: var(--text-1);
	}

	.nav-link[aria-current='page'] {
		background: var(--primary-soft);
		color: var(--primary-soft-text);
		font-weight: var(--weight-semibold);
	}

	.nav-link[aria-current='page'] :global(svg) {
		color: var(--primary-soft-text);
	}

	.sidebar-footer {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		border-top: 1px solid var(--border);
	}

	.scope {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-2);
		font-size: var(--font-size-xs);
	}

	.scope-dot {
		flex: none;
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--success);
	}

	.user {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
	}

	.avatar {
		display: grid;
		flex: none;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		background: var(--surface-2);
		color: var(--text-1);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-semibold);
	}

	.user-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: var(--leading-tight);
	}

	.user-text strong {
		overflow: hidden;
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.user-text span {
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.logout-form {
		margin-top: var(--space-1);
	}

	.sidebar.collapsed {
		width: 72px;
	}

	.collapsed .brand {
		justify-content: center;
		padding-inline: var(--space-2);
	}

	.collapsed .brand-text,
	.collapsed .nav-link span,
	.collapsed .scope span:not(.scope-dot),
	.collapsed .user-text,
	.collapsed .logout-form {
		display: none;
	}

	.collapsed .nav {
		padding: var(--space-3) var(--space-2);
		gap: var(--space-2);
	}

	.collapsed .nav-group {
		gap: var(--space-1);
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
	}

	.collapsed .nav-group:first-child {
		padding-top: 0;
		border-top: 0;
	}

	.collapsed .nav-link {
		justify-content: center;
		width: 44px;
		height: 44px;
		margin-inline: auto;
		padding: 0;
	}

	.collapsed .sidebar-footer {
		align-items: center;
		padding: var(--space-3) var(--space-2);
	}

	.collapsed .user {
		justify-content: center;
	}

	@media (min-width: 768px) {
		.sidebar {
			display: flex;
		}
	}
</style>
