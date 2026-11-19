<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'success' | 'warning' | 'danger' | 'info';

	interface Props {
		tone?: Tone;
		title?: string;
		class?: string;
		children: Snippet;
	}

	let { tone = 'info', title, class: className = '', children }: Props = $props();

	const icon = $derived(
		tone === 'success' ? '✓' : tone === 'warning' ? '!' : tone === 'danger' ? '×' : 'i'
	);
	const role = $derived(tone === 'danger' || tone === 'warning' ? 'alert' : 'status');
</script>

<div class="alert alert-{tone} {className}" {role}>
	<span class="icon" aria-hidden="true">{icon}</span>
	<div class="content">
		{#if title}
			<strong class="title">{title}</strong>
		{/if}
		<div class="body">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.alert {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border: 1px solid;
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
	}

	.icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		margin-top: 2px;
		border: 1px solid currentColor;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-bold);
		line-height: 1;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.title {
		font-weight: var(--weight-semibold);
	}

	.body {
		line-height: var(--leading-normal);
	}

	.body :global(p) {
		margin: 0;
	}

	.alert-success {
		background: var(--success-bg);
		border-color: var(--success-border);
		color: var(--success-text);
	}

	.alert-warning {
		background: var(--warning-bg);
		border-color: var(--warning-border);
		color: var(--warning-text);
	}

	.alert-danger {
		background: var(--danger-bg);
		border-color: var(--danger-border);
		color: var(--danger-text);
	}

	.alert-info {
		background: var(--info-bg);
		border-color: var(--info-border);
		color: var(--info-text);
	}
</style>
