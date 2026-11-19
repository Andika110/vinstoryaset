<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import type { ListColumn } from './list-types';

	interface Props {
		columns: ListColumn<T>[];
		rows: T[];
		rowKey: (row: T) => string | number;
		actions?: Snippet<[T]>;
	}

	let { columns, rows, rowKey, actions }: Props = $props();

	const primary = $derived(columns.find((column) => column.mobilePrimary) ?? columns[0]);
	const details = $derived(
		columns.filter((column) => column.mobile && column.key !== primary?.key)
	);

	function cellValue(row: T, key: string): string {
		const value = (row as Record<string, unknown>)[key];
		return value === null || value === undefined || value === '' ? '—' : String(value);
	}
</script>

<div class="mobile-list">
	{#each rows as row (rowKey(row))}
		<article class="mobile-card">
			<header class="mobile-card-header">
				<h3>
					{#if primary}
						{#if primary.render}
							{@render primary.render(row)}
						{:else}
							{cellValue(row, primary.key)}
						{/if}
					{:else}
						—
					{/if}
				</h3>
			</header>

			{#if details.length > 0}
				<dl>
					{#each details as column (column.key)}
						<div>
							<dt>{column.label}</dt>
							<dd>
								{#if column.render}
									{@render column.render(row)}
								{:else}
									{cellValue(row, column.key)}
								{/if}
							</dd>
						</div>
					{/each}
				</dl>
			{/if}

			{#if actions}
				<footer class="mobile-card-actions">
					{@render actions(row)}
				</footer>
			{/if}
		</article>
	{/each}
</div>

<style>
	.mobile-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.mobile-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-1);
	}

	.mobile-card-header h3 {
		margin: 0;
		font-size: var(--font-size-base);
		font-weight: var(--weight-semibold);
		line-height: var(--leading-tight);
	}

	dl {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
	}

	dl > div {
		display: grid;
		grid-template-columns: minmax(96px, 40%) minmax(0, 1fr);
		gap: var(--space-3);
		align-items: baseline;
	}

	dt {
		color: var(--text-3);
		font-size: var(--font-size-sm);
	}

	dd {
		margin: 0;
		color: var(--text-1);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		overflow-wrap: anywhere;
	}

	.mobile-card-actions {
		padding-top: var(--space-3);
		border-top: 1px solid var(--border);
	}

	@media (min-width: 768px) {
		.mobile-list {
			display: none;
		}
	}
</style>
