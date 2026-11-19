<script lang="ts">
	type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
	type Size = 'sm' | 'md';

	interface Props {
		label: string;
		tone?: Tone;
		size?: Size;
		dot?: boolean;
		class?: string;
	}

	let { label, tone = 'neutral', size = 'md', dot = true, class: className = '' }: Props = $props();
</script>

<span class="badge badge-{tone} badge-{size} {className}">
	{#if dot}
		<span class="dot" aria-hidden="true"></span>
	{/if}
	{label}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		max-width: 100%;
		padding: 2px var(--space-3);
		border: 1px solid transparent;
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		line-height: 1.35;
		white-space: nowrap;
	}

	.badge-sm {
		padding: 1px var(--space-2);
		font-size: var(--font-size-sm);
	}

	.badge-md {
		min-height: 28px;
	}

	.dot {
		flex: none;
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background: currentColor;
	}

	.badge-success {
		background: var(--success-bg);
		border-color: var(--success-border);
		color: var(--success-text);
	}

	.badge-warning {
		background: var(--warning-bg);
		border-color: var(--warning-border);
		color: var(--warning-text);
	}

	.badge-danger {
		background: var(--danger-bg);
		border-color: var(--danger-border);
		color: var(--danger-text);
	}

	.badge-info {
		background: var(--info-bg);
		border-color: var(--info-border);
		color: var(--info-text);
	}

	.badge-neutral {
		background: var(--neutral-bg);
		border-color: var(--neutral-border);
		color: var(--neutral-text);
	}
</style>
