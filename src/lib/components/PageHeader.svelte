<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		actions?: Snippet;
	}

	let { title, description, actions }: Props = $props();
</script>

<header class="page-header">
	<div class="page-heading">
		<h1>{title}</h1>
		{#if description}
			<p>{description}</p>
		{/if}
	</div>

	{#if actions}
		<div class="page-actions">
			{@render actions()}
		</div>
	{/if}
</header>

<style>
	.page-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.page-heading {
		min-width: 0;
	}

	h1 {
		margin: 0;
		font-size: clamp(var(--font-size-2xl), 3.5vw, var(--font-size-3xl));
	}

	p {
		max-width: 70ch;
		margin: var(--space-1) 0 0;
		color: var(--text-2);
		font-size: var(--font-size-base);
	}

	.page-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.page-actions :global(button) {
		flex: 1 1 auto;
	}

	@media (min-width: 768px) {
		.page-header {
			flex-direction: row;
			align-items: flex-start;
			justify-content: space-between;
		}

		.page-actions {
			flex: none;
			justify-content: flex-end;
		}

		.page-actions :global(button) {
			flex: none;
		}
	}
</style>
