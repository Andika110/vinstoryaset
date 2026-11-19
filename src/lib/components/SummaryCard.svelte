<script lang="ts">
	import type { ResolvedPathname } from '$app/types';

	type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

	interface Props {
		label: string;
		value: number | string;
		href: ResolvedPathname;
		tone?: Tone;
		hint?: string;
		loading?: boolean;
	}

	let { label, value, href, tone = 'neutral', hint, loading = false }: Props = $props();

	const displayValue = $derived(typeof value === 'number' ? value.toLocaleString('id-ID') : value);
</script>

<a class="summary-card tone-{tone}" {href} aria-busy={loading ? 'true' : undefined}>
	<span class="summary-label">{label}</span>
	{#if loading}
		<span class="value-skeleton" aria-hidden="true"></span>
		<span class="visually-hidden">Memuat {label}</span>
	{:else}
		<span class="summary-value">{displayValue}</span>
	{/if}
	{#if hint}
		<span class="summary-hint">{hint}</span>
	{/if}
</a>

<style>
	.summary-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-height: 104px;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-left-width: 4px;
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-1);
		color: var(--text-1);
		text-decoration: none;
		transition:
			border-color var(--motion-fast) var(--motion-ease),
			background-color var(--motion-fast) var(--motion-ease);
	}

	.summary-card:hover {
		background: var(--surface-2);
	}

	.summary-card:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}

	.summary-label {
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		line-height: var(--leading-normal);
	}

	.summary-value {
		font-size: clamp(var(--font-size-2xl), 7vw, var(--font-size-3xl));
		font-weight: var(--weight-semibold);
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
		overflow-wrap: anywhere;
	}

	.summary-hint {
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.tone-neutral {
		border-left-color: var(--border-strong);
	}

	.tone-success {
		border-left-color: var(--success);
	}

	.tone-success .summary-value {
		color: var(--success-text);
	}

	.tone-warning {
		border-left-color: var(--warning);
	}

	.tone-warning .summary-value {
		color: var(--warning-text);
	}

	.tone-danger {
		border-left-color: var(--danger);
	}

	.tone-danger .summary-value {
		color: var(--danger-text);
	}

	.tone-info {
		border-left-color: var(--info);
	}

	.tone-info .summary-value {
		color: var(--info-text);
	}

	.value-skeleton {
		width: 3ch;
		height: 2rem;
		border-radius: var(--radius-sm);
		background: linear-gradient(
			90deg,
			var(--surface-2) 0%,
			var(--border) 50%,
			var(--surface-2) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.4s linear infinite;
	}

	@keyframes shimmer {
		to {
			background-position: -200% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.value-skeleton {
			animation: none;
		}
	}
</style>
