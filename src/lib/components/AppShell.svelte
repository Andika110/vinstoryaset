<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import BottomNav from './BottomNav.svelte';
	import Sidebar from './Sidebar.svelte';
	import { getInitials, ROLE_LABEL, type Role } from '#lib/navigation.js';

	interface Props {
		role: Role;
		userName: string;
		scopeLabel: string;
		activePath?: string;
		children: Snippet;
	}

	let { role, userName, scopeLabel, activePath, children }: Props = $props();

	const initials = $derived(getInitials(userName));
</script>

<a class="skip-link" href="#main-content">Lewati ke konten utama</a>

<div class="app-shell">
	<Sidebar {role} {userName} {scopeLabel} {activePath} />

	<div class="app-body">
		<header class="topbar">
			<a class="mobile-brand" href={resolve('/(app)/dashboard')}>
				<span class="brand-mark" aria-hidden="true">IT</span>
				<span>Aset &amp; Inventory</span>
			</a>

			<div class="topbar-meta">
				<span class="scope-pill">
					<span class="scope-dot" aria-hidden="true"></span>
					<span class="visually-hidden">Cakupan data: </span>
					<span class="scope-text">{scopeLabel}</span>
				</span>
				<span class="role-pill">{ROLE_LABEL[role]}</span>
				<span class="avatar" aria-hidden="true">{initials}</span>
			</div>
		</header>

		<main id="main-content" class="app-main" tabindex="-1">
			<div class="app-content">
				{@render children()}
			</div>
		</main>
	</div>

	<BottomNav {activePath} />
</div>

<style>
	.app-shell {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		min-height: 100dvh;
		background: var(--bg);
	}

	.app-body {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 64px;
		padding: var(--space-2) var(--gutter);
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}

	.mobile-brand {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		color: var(--text-1);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
		text-decoration: none;
		white-space: nowrap;
	}

	.brand-mark {
		display: grid;
		flex: none;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-bold);
	}

	.topbar-meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.scope-pill {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		max-width: 180px;
		padding: 4px var(--space-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--surface-2);
		color: var(--text-2);
		font-size: var(--font-size-xs);
		white-space: nowrap;
	}

	.scope-text {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.scope-dot {
		flex: none;
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--success);
	}

	.role-pill {
		display: none;
		color: var(--text-3);
		font-size: var(--font-size-xs);
		white-space: nowrap;
	}

	.avatar {
		display: grid;
		flex: none;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background: var(--surface-2);
		color: var(--text-1);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-semibold);
	}

	.app-main {
		flex: 1;
		min-width: 0;
		padding-bottom: calc(72px + env(safe-area-inset-bottom));
	}

	.app-main:focus {
		outline: none;
	}

	.app-content {
		width: 100%;
		max-width: var(--container-max);
		margin-inline: auto;
		padding: var(--space-4) var(--gutter) var(--space-6);
	}

	@media (min-width: 768px) {
		.app-shell {
			grid-template-columns: 248px minmax(0, 1fr);
		}

		.topbar {
			padding-inline: var(--gutter-md);
		}

		.mobile-brand {
			display: none;
		}

		.role-pill {
			display: inline;
		}

		.app-main {
			padding-bottom: 0;
		}

		.app-content {
			padding: var(--space-6) var(--gutter-md) var(--space-7);
		}
	}

	@media (min-width: 1024px) {
		.topbar {
			padding-inline: var(--gutter-lg);
		}

		.app-content {
			padding-inline: var(--gutter-lg);
		}
	}
</style>
