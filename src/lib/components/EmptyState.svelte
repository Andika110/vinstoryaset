<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		action?: Snippet;
	}

	let { title, description, action }: Props = $props();
	const uid = $props.id();
</script>

<section class="empty-state" aria-labelledby={`${uid}-title`}>
	<div class="state-icon" aria-hidden="true"></div>
	<h2 id={`${uid}-title`}>{title}</h2>
	{#if description}
		<p>{description}</p>
	{/if}
	{#if action}
		<div class="state-action">
			{@render action()}
		</div>
	{/if}
</section>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-7) var(--space-4);
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-lg);
		background: var(--surface);
		text-align: center;
	}

	.state-icon {
		width: 48px;
		height: 48px;
		margin-bottom: var(--space-2);
		border: 2px dashed var(--border-strong);
		border-radius: var(--radius-full);
		background: var(--surface-2);
	}

	h2 {
		margin: 0;
		font-size: var(--font-size-lg);
	}

	p {
		max-width: 48ch;
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.state-action {
		margin-top: var(--space-3);
	}
</style>
