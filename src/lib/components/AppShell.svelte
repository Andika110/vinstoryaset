<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import BottomNav from './BottomNav.svelte';
	import Breadcrumbs from './Breadcrumbs.svelte';
	import NavIcon from './NavIcon.svelte';
	import Sidebar from './Sidebar.svelte';
	import { getInitials, ROLE_LABEL, type Role } from '#lib/navigation.js';

	const SIDEBAR_STATE_KEY = 'inventory:sidebar-collapsed';

	interface Props {
		role: Role;
		userName: string;
		scopeLabel: string;
		activePath?: string;
		children: Snippet;
	}

	let { role, userName, scopeLabel, activePath, children }: Props = $props();

	let sidebarCollapsed = $state(false);
	let sidebarReady = $state(false);
	let accountOpen = $state(false);
	let accountEl = $state<HTMLDivElement | null>(null);
	const initials = $derived(getInitials(userName));
	const currentPath = $derived(activePath ?? page.url.pathname);

	onMount(() => {
		try {
			sidebarCollapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === '1';
		} catch {
			// Abaikan localStorage yang tidak tersedia.
		}
		sidebarReady = true;

		function closeAccountOnOutsideClick(event: MouseEvent): void {
			if (!accountOpen || !accountEl) return;
			if (!accountEl.contains(event.target as Node)) accountOpen = false;
		}

		function closeAccountOnEscape(event: KeyboardEvent): void {
			if (event.key !== 'Escape' || !accountOpen) return;
			accountOpen = false;
			accountEl?.querySelector('button')?.focus();
		}

		document.addEventListener('click', closeAccountOnOutsideClick);
		document.addEventListener('keydown', closeAccountOnEscape);
		return () => {
			document.removeEventListener('click', closeAccountOnOutsideClick);
			document.removeEventListener('keydown', closeAccountOnEscape);
		};
	});

	$effect(() => {
		if (!sidebarReady) return;
		localStorage.setItem(SIDEBAR_STATE_KEY, sidebarCollapsed ? '1' : '0');
	});
</script>

<a class="skip-link" href="#main-content">Lewati ke konten utama</a>

<div class="app-shell" class:sidebar-collapsed={sidebarCollapsed}>
	<Sidebar {role} {userName} {scopeLabel} activePath={currentPath} collapsed={sidebarCollapsed} />

	<div class="app-body">
		<header class="topbar">
			<div class="topbar-left">
				<button
					type="button"
					class="icon-button menu-button"
					aria-label={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
					aria-expanded={!sidebarCollapsed}
					onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
				>
					<NavIcon name="menu" size={20} />
				</button>

				<a class="mobile-brand" href={resolve('/(app)/dashboard')}>
					<span class="brand-mark" aria-hidden="true">IT</span>
					<span>Aset &amp; Inventory</span>
				</a>

				<div class="desktop-breadcrumb">
					<Breadcrumbs {role} pathname={currentPath} />
				</div>
			</div>

			<div class="topbar-actions">
				<form class="topbar-search" method="GET" action={resolve('/(app)/assets')} role="search">
					<button type="submit" class="search-submit" aria-label="Cari aset">
						<NavIcon name="search" size={16} />
					</button>
					<input
						type="search"
						name="search"
						placeholder="Cari aset: kode, nama, serial"
						aria-label="Cari aset berdasarkan kode, nama, atau nomor seri"
					/>
				</form>

				<span class="scope-pill">
					<span class="scope-dot" aria-hidden="true"></span>
					<span class="visually-hidden">Cakupan data: </span>
					<span class="scope-text">{scopeLabel}</span>
				</span>

				<a
					class="icon-button topbar-icon"
					href={resolve('/(app)/profile')}
					aria-label="Profil dan pengaturan"
					title="Profil dan pengaturan"
				>
					<NavIcon name="settings" size={19} />
				</a>

				{#if role !== 'outlet'}
					<a
						class="icon-button topbar-icon"
						href={resolve('/(app)/admin/audit')}
						aria-label="Audit log"
						title="Audit log"
					>
						<NavIcon name="shield" size={19} />
					</a>
				{/if}

				<div class="account" bind:this={accountEl}>
					<button
						type="button"
						class="avatar"
						aria-label="{initials} · {userName} · {ROLE_LABEL[role]}"
						aria-expanded={accountOpen}
						aria-controls="account-menu"
						onclick={() => (accountOpen = !accountOpen)}
					>
						{initials}
					</button>

					{#if accountOpen}
						<div id="account-menu" class="account-popover">
							<div class="account-summary">
								<strong>{userName}</strong>
								<span>{ROLE_LABEL[role]}</span>
								<span>{scopeLabel}</span>
							</div>
							<a
								class="account-item"
								href={resolve('/(app)/profile')}
								onclick={() => (accountOpen = false)}
							>
								Profil dan pengaturan
							</a>
							<form method="POST" action="/logout">
								<button type="submit" class="account-item account-logout">Keluar</button>
							</form>
						</div>
					{/if}
				</div>
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
		transition: grid-template-columns var(--motion-fast) var(--motion-ease);
	}

	@media (prefers-reduced-motion: reduce) {
		.app-shell {
			transition: none;
		}
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
		min-height: 68px;
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

	.mobile-brand > span:last-child {
		overflow: hidden;
		text-overflow: ellipsis;
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

	.topbar-left {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.topbar-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		min-width: 0;
	}

	.menu-button {
		display: none;
	}

	.desktop-breadcrumb {
		display: none;
		min-width: 0;
	}

	.topbar-search {
		display: none;
		align-items: center;
		gap: var(--space-1);
		height: 44px;
		padding: 0 var(--space-2) 0 var(--space-1);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface-2);
		color: var(--text-3);
	}

	.topbar-search:focus-within {
		border-color: var(--primary);
		background: var(--surface);
	}

	.search-submit {
		display: grid;
		flex: none;
		place-items: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-3);
		cursor: pointer;
	}

	.search-submit:hover {
		color: var(--text-1);
	}

	.topbar-search input {
		width: 180px;
		min-height: 0;
		padding: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--text-1);
		font-size: var(--font-size-sm);
	}

	.topbar-search input::placeholder {
		color: var(--text-3);
	}

	.icon-button {
		display: grid;
		flex: none;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-2);
		cursor: pointer;
	}

	.icon-button:hover {
		background: var(--surface-2);
		color: var(--text-1);
	}

	.topbar-icon {
		display: none;
	}

	.scope-pill {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		max-width: 150px;
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

	.avatar {
		display: grid;
		flex: none;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-full);
		background: var(--surface-2);
		color: var(--text-1);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-semibold);
		text-decoration: none;
		cursor: pointer;
	}

	.avatar:hover {
		background: var(--surface-3);
	}

	.account {
		position: relative;
	}

	.account-popover {
		position: absolute;
		top: calc(100% + var(--space-2));
		right: 0;
		z-index: var(--z-toast);
		width: 232px;
		padding: var(--space-1);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-2);
	}

	.account-summary {
		display: grid;
		gap: 2px;
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border);
		margin-bottom: var(--space-1);
	}

	.account-summary strong {
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}

	.account-summary span {
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.account-item {
		display: flex;
		align-items: center;
		width: 100%;
		min-height: 44px;
		padding: 0 var(--space-3);
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-2);
		font-size: var(--font-size-sm);
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}

	.account-item:hover {
		background: var(--surface-2);
		color: var(--text-1);
	}

	.account-logout {
		color: var(--danger-text);
	}

	.account form {
		margin: 0;
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

		.app-shell.sidebar-collapsed {
			grid-template-columns: 72px minmax(0, 1fr);
		}

		.topbar {
			padding-inline: var(--gutter-md);
		}

		.menu-button,
		.topbar-icon {
			display: grid;
		}

		.desktop-breadcrumb {
			display: block;
		}

		.mobile-brand {
			display: none;
		}

		.app-main {
			padding-bottom: 0;
		}

		.app-content {
			padding: var(--space-6) var(--gutter-md) var(--space-7);
		}
	}

	@media (min-width: 900px) {
		.topbar-search {
			display: flex;
		}
	}

	@media (max-width: 399px) {
		.scope-pill {
			max-width: 112px;
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
