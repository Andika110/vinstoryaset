<script lang="ts">
	interface Props {
		label?: string;
		rows?: number;
	}

	let { label = 'Memuat data…', rows = 3 }: Props = $props();
	const items = $derived(Array.from({ length: Math.max(1, rows) }, (_, index) => index));
</script>

<div class="loading-state" role="status" aria-live="polite" aria-busy="true">
	<span class="visually-hidden">{label}</span>
	{#each items as item (item)}
		<div class="skeleton-card" data-row={item} aria-hidden="true">
			<div class="line title"></div>
			<div class="line"></div>
			<div class="line short"></div>
		</div>
	{/each}
</div>

<style>
	.loading-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.skeleton-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.line {
		height: 12px;
		border-radius: var(--radius-sm);
		background: var(--surface-3);
		animation: pulse 1.2s ease-in-out infinite;
	}

	.line.title {
		width: 40%;
		height: 16px;
	}

	.line.short {
		width: 65%;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.45;
		}
	}
</style>
