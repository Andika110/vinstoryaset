<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '#lib/href.js';
	import { getInitials, isActivePath, NAV_GROUPS, ROLE_LABEL, type Role } from '#lib/navigation.js';
	import Button from './Button.svelte';

	interface Props {
		role: Role;
		userName: string;
		scopeLabel: string;
		activePath?: string;
	}

	let { role, userName, scopeLabel, activePath = page.url.pathname }: Props = $props();

	const groups = $derived(NAV_GROUPS[role]);
	const initials = $derived(getInitials(userName));
</script>

<aside class="sidebar">
	<a class="brand" href={resolve('/(app)/dashboard')}>
		<span class="brand-mark" aria-hidden="true">IT</span>
		<span class="brand-text">
			<strong>Aset &amp; Inventory</strong>
			<span>IT Management</span>
		</span>
	</a>

	<nav class="nav" aria-label="Navigasi utama">
		{#each groups as group (group.label)}
			<div class="nav-group">
				<p class="nav-group-label">{group.label}</p>
				<ul>
					{#each group.items as item (item.href)}
						<li>
							<a
								href={resolve(item.href)}
								class="nav-link"
								aria-current={isActivePath(activePath, item.href) ? 'page' : undefined}
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
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
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 72px;
		padding: var(--space-4);
		border-bottom: 1px solid var(--border);
		color: var(--text-1);
		text-decoration: none;
	}

	.brand-mark {
		display: grid;
		flex: none;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
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
		padding: var(--space-4) var(--space-3);
	}

	.nav-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.nav-group-label {
		margin: 0;
		padding: 0 var(--space-2);
		color: var(--text-3);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.nav-link {
		display: flex;
		align-items: center;
		min-height: 40px;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.nav-link:hover {
		background: var(--surface-2);
		color: var(--text-1);
	}

	.nav-link[aria-current='page'] {
		background: var(--primary-soft);
		color: var(--primary-soft-text);
		font-weight: var(--weight-semibold);
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

	@media (min-width: 768px) {
		.sidebar {
			display: flex;
		}
	}
</style>
