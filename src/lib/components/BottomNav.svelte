<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '#lib/href.js';
	import { BOTTOM_NAV, isBottomNavActive } from '#lib/navigation.js';

	interface Props {
		activePath?: string;
	}

	let { activePath = page.url.pathname }: Props = $props();
</script>

<nav class="bottom-nav" aria-label="Navigasi utama mobile">
	<ul>
		{#each BOTTOM_NAV as item (item.href)}
			<li>
				<a
					href={resolve(item.href)}
					aria-current={isBottomNavActive(activePath, item.href) ? 'page' : undefined}
				>
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
		align-items: center;
		justify-content: center;
		min-height: 56px;
		padding: var(--space-1) var(--space-1);
		border-top: 3px solid transparent;
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-align: center;
		text-decoration: none;
	}

	a[aria-current='page'] {
		border-top-color: var(--primary);
		color: var(--primary);
		font-weight: var(--weight-semibold);
	}

	.label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (min-width: 768px) {
		.bottom-nav {
			display: none;
		}
	}
</style>
