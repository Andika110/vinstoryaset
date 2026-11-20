<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '#lib/href.js';
	import { BOTTOM_NAV, isBottomNavActive } from '#lib/navigation.js';
	import NavIcon from './NavIcon.svelte';

	interface Props {
		activePath?: string;
	}

	let { activePath = page.url.pathname }: Props = $props();

	const icons: Record<string, string> = {
		'/dashboard': 'dashboard',
		'/assets': 'box',
		'/inventory': 'package',
		'/requests': 'request',
		'/more': 'more'
	};

	function iconFor(href: string): string {
		return icons[href] ?? 'circle';
	}
</script>

<nav class="bottom-nav" aria-label="Navigasi utama mobile">
	<ul>
		{#each BOTTOM_NAV as item (item.href)}
			<li>
				<a
					href={resolve(item.href)}
					aria-current={isBottomNavActive(activePath, item.href) ? 'page' : undefined}
				>
					<span class="icon" aria-hidden="true">
						<NavIcon name={iconFor(item.href)} size={20} />
					</span>
					<span class="label">{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.bottom-nav {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: var(--z-header);
		border-top: 1px solid var(--border);
		background: var(--surface);
		padding-bottom: env(safe-area-inset-bottom);
	}

	ul {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: 60px;
		padding: var(--space-1) var(--space-1);
		border-top: 3px solid transparent;
		color: var(--text-3);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-medium);
		text-align: center;
		text-decoration: none;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 32px;
		height: 24px;
		border-radius: var(--radius-full);
		transition:
			background var(--motion-fast) var(--motion-ease),
			color var(--motion-fast) var(--motion-ease);
	}

	a[aria-current='page'] {
		border-top-color: var(--primary);
		color: var(--primary);
		font-weight: var(--weight-semibold);
	}

	a[aria-current='page'] .icon {
		background: var(--primary-soft);
		color: var(--primary-soft-text);
	}

	.label {
		overflow: hidden;
		max-width: 100%;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.icon {
			transition: none;
		}
	}

	@media (min-width: 768px) {
		.bottom-nav {
			display: none;
		}
	}
</style>
