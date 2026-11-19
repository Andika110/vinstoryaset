<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
	type Size = 'sm' | 'md' | 'lg';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		size?: Size;
		loading?: boolean;
		block?: boolean;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		block = false,
		type = 'button',
		disabled = false,
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<button
	{...rest}
	{type}
	disabled={disabled || loading}
	aria-busy={loading ? 'true' : undefined}
	class="btn btn-{variant} btn-{size} {block ? 'btn-block' : ''} {className}"
>
	{#if loading}
		<span class="spinner" aria-hidden="true"></span>
		<span class="visually-hidden">Sedang memproses</span>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		font-weight: var(--weight-medium);
		line-height: 1;
		text-align: center;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease),
			color var(--motion-fast) var(--motion-ease);
	}

	.btn:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.btn-sm {
		min-height: var(--touch-target-dense);
		padding: 0 var(--space-3);
		font-size: var(--font-size-sm);
	}

	.btn-lg {
		min-height: 48px;
		padding: 0 var(--space-5);
		font-size: var(--font-size-lg);
	}

	.btn-block {
		width: 100%;
	}

	.btn-primary {
		background: var(--primary);
		color: var(--primary-contrast);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--primary-hover);
	}

	.btn-primary:active:not(:disabled) {
		background: var(--primary-active);
	}

	.btn-secondary {
		background: var(--surface);
		border-color: var(--border-strong);
		color: var(--text-1);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--surface-2);
	}

	.btn-danger {
		background: var(--danger);
		color: var(--danger-contrast);
	}

	.btn-danger:hover:not(:disabled) {
		filter: brightness(0.92);
	}

	.btn-ghost {
		background: transparent;
		color: var(--primary);
	}

	.btn-ghost:hover:not(:disabled) {
		background: var(--primary-soft);
		color: var(--primary-soft-text);
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: var(--radius-full);
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
