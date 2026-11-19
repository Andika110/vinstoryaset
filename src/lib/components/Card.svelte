<script lang="ts">
	import type { Snippet } from 'svelte';

	type As = 'article' | 'section' | 'div';
	type Padding = 'none' | 'sm' | 'md' | 'lg';

	interface Props {
		as?: As;
		title?: string;
		description?: string;
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		padding?: Padding;
		class?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let {
		as = 'article',
		title,
		description,
		headingLevel = 2,
		padding = 'md',
		class: className = '',
		children,
		footer
	}: Props = $props();
</script>

<svelte:element this={as} class="card padding-{padding} {className}">
	{#if title || description}
		<header class="card-header">
			{#if title}
				<svelte:element this={`h${headingLevel}`} class="card-title">{title}</svelte:element>
			{/if}
			{#if description}
				<p class="card-description">{description}</p>
			{/if}
		</header>
	{/if}

	<div class="card-body">
		{@render children()}
	</div>

	{#if footer}
		<footer class="card-footer">
			{@render footer()}
		</footer>
	{/if}
</svelte:element>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-1);
	}

	.padding-none {
		padding: 0;
	}

	.padding-sm {
		padding: var(--space-3);
	}

	.padding-md {
		padding: var(--space-4);
	}

	.padding-lg {
		padding: var(--space-5);
	}

	.card-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.card-title {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: var(--weight-semibold);
		line-height: var(--leading-tight);
	}

	.card-description {
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.card-body {
		min-width: 0;
	}

	.card-footer {
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
	}
</style>
