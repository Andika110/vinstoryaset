<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import type { ListColumn } from './list-types';

	interface Props {
		columns: ListColumn<T>[];
		rows: T[];
		rowKey: (row: T) => string | number;
		actions?: Snippet<[T]>;
		caption?: string;
	}

	let { columns, rows, rowKey, actions, caption = 'Daftar data' }: Props = $props();

	function cellValue(row: T, key: string): string {
		const value = (row as Record<string, unknown>)[key];
		return value === null || value === undefined || value === '' ? '—' : String(value);
	}

	const columnCount = $derived(columns.length + (actions ? 1 : 0));
</script>

<div class="table-scroll data-table-wrapper">
	<table class="data-table">
		<caption class="visually-hidden">{caption}</caption>
		<thead>
			<tr>
				{#each columns as column (column.key)}
					<th scope="col" data-align={column.align ?? 'left'} class={column.class}>
						{column.label}
					</th>
				{/each}
				{#if actions}
					<th scope="col" class="actions-header">
						<span class="visually-hidden">Aksi</span>
					</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (rowKey(row))}
				<tr>
					{#each columns as column (column.key)}
						<td data-align={column.align ?? 'left'} class={column.class}>
							{#if column.render}
								{@render column.render(row)}
							{:else}
								{cellValue(row, column.key)}
							{/if}
						</td>
					{/each}
					{#if actions}
						<td class="actions-cell">{@render actions(row)}</td>
					{/if}
				</tr>
			{:else}
				<tr>
					<td colspan={columnCount} class="empty-row">Tidak ada data.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.data-table-wrapper {
		display: none;
	}

	.table-scroll {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.data-table {
		width: 100%;
		min-width: 640px;
		border-collapse: collapse;
	}

	th,
	td {
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: middle;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--surface-2);
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
		white-space: nowrap;
	}

	tbody tr:last-child td {
		border-bottom: 0;
	}

	tbody tr:hover {
		background: var(--surface-2);
	}

	[data-align='right'] {
		text-align: right;
	}

	[data-align='center'] {
		text-align: center;
	}

	.actions-header,
	.actions-cell {
		width: 1%;
		text-align: right;
		white-space: nowrap;
	}

	.empty-row {
		padding: var(--space-6);
		color: var(--text-3);
		text-align: center;
	}

	@media (min-width: 768px) {
		.data-table-wrapper {
			display: block;
		}
	}
</style>
