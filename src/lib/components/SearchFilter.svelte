<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '#lib/href.js';
	import Button from './Button.svelte';
	import type { SearchFilterConfig } from './list-types';

	interface Props {
		search?: string;
		searchPlaceholder?: string;
		filters?: SearchFilterConfig[];
		resultCount?: number;
	}

	let { search = '', searchPlaceholder = 'Cari…', filters = [], resultCount }: Props = $props();

	const uid = $props.id();
	const hasActiveFilter = $derived(Boolean(search || filters.some((filter) => filter.value)));
</script>

<form method="GET" role="search" class="filter-toolbar">
	<div class="filter-field search-field">
		<label for={`${uid}-search`}>Cari</label>
		<input
			id={`${uid}-search`}
			name="search"
			type="search"
			value={search}
			placeholder={searchPlaceholder}
		/>
	</div>

	{#each filters as filter (filter.name)}
		<div class="filter-field">
			<label for={`${uid}-${filter.name}`}>{filter.label}</label>
			{#if filter.type === 'date'}
				<input id={`${uid}-${filter.name}`} name={filter.name} type="date" value={filter.value} />
			{:else}
				<select id={`${uid}-${filter.name}`} name={filter.name} value={filter.value}>
					{#each filter.options as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			{/if}
		</div>
	{/each}

	<div class="filter-actions">
		<Button type="submit" variant="secondary" size="sm">Terapkan</Button>
		{#if hasActiveFilter}
			<a href={resolve(page.url.pathname)}>Reset filter</a>
		{/if}
	</div>

	{#if resultCount !== undefined}
		<p class="result-count" aria-live="polite">{resultCount} data</p>
	{/if}
</form>

<style>
	.filter-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-3);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.filter-field {
		display: flex;
		flex: 1 1 160px;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.search-field {
		flex: 2 1 240px;
	}

	label {
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.filter-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.filter-actions a {
		font-size: var(--font-size-sm);
	}

	.result-count {
		flex-basis: 100%;
		margin: 0;
		color: var(--text-3);
		font-size: var(--font-size-sm);
	}

	@media (min-width: 768px) {
		.result-count {
			flex-basis: auto;
			margin-left: auto;
		}
	}
</style>
