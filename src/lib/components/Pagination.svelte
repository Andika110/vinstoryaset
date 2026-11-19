<script lang="ts">
	import { page as appPage } from '$app/state';
	import { resolve } from '#lib/href.js';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	interface Props {
		page: number;
		pageSize: number;
		total: number;
		pathname?: string;
		searchParams?: URLSearchParams;
	}

	let { page, pageSize, total, pathname, searchParams }: Props = $props();

	const basePath = $derived(pathname ?? appPage.url.pathname);
	const baseQuery = $derived((searchParams ?? appPage.url.searchParams).toString());
	const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
	const currentPage = $derived(Math.min(Math.max(page, 1), totalPages));
	const start = $derived(total === 0 ? 0 : (currentPage - 1) * pageSize + 1);
	const end = $derived(Math.min(currentPage * pageSize, total));

	const pageNumbers = $derived(
		[1, totalPages, currentPage - 1, currentPage, currentPage + 1]
			.filter((value) => value >= 1 && value <= totalPages)
			.filter((value, index, values) => values.indexOf(value) === index)
			.sort((a, b) => a - b)
	);

	function hrefFor(target: number): string {
		const params = new SvelteURLSearchParams(baseQuery);
		if (target <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(target));
		}
		const query = params.toString();
		return `${basePath}${query ? `?${query}` : ''}`;
	}
</script>

{#if total > 0}
	<nav class="pagination" aria-label="Navigasi halaman">
		<p class="summary">Menampilkan {start}–{end} dari {total}</p>

		{#if totalPages > 1}
			<div class="controls">
				{#if currentPage > 1}
					<a class="step" href={resolve(hrefFor(currentPage - 1))} aria-label="Halaman sebelumnya">
						← Sebelumnya
					</a>
				{:else}
					<span class="step disabled" aria-disabled="true">← Sebelumnya</span>
				{/if}

				<div class="page-numbers">
					{#each pageNumbers as number, index (number)}
						{#if index > 0 && number - pageNumbers[index - 1] > 1}
							<span class="ellipsis" aria-hidden="true">…</span>
						{/if}
						<a
							class="page-number"
							href={resolve(hrefFor(number))}
							aria-label="Halaman {number}"
							aria-current={number === currentPage ? 'page' : undefined}
						>
							{number}
						</a>
					{/each}
				</div>

				<span class="mobile-page">Halaman {currentPage} dari {totalPages}</span>

				{#if currentPage < totalPages}
					<a class="step" href={resolve(hrefFor(currentPage + 1))} aria-label="Halaman berikutnya">
						Berikutnya →
					</a>
				{:else}
					<span class="step disabled" aria-disabled="true">Berikutnya →</span>
				{/if}
			</div>
		{/if}
	</nav>
{/if}

<style>
	.pagination {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		justify-content: space-between;
		padding-top: var(--space-3);
	}

	.summary {
		margin: 0;
		color: var(--text-3);
		font-size: var(--font-size-sm);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}

	.step,
	.page-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--touch-target);
		min-width: var(--touch-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-1);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.step:hover,
	.page-number:hover {
		background: var(--surface-2);
	}

	.page-number[aria-current='page'] {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-contrast);
	}

	.disabled {
		color: var(--text-3);
		cursor: not-allowed;
	}

	.page-numbers {
		display: none;
		align-items: center;
		gap: var(--space-1);
	}

	.ellipsis {
		padding: 0 var(--space-1);
		color: var(--text-3);
	}

	.mobile-page {
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	@media (min-width: 768px) {
		.page-numbers {
			display: flex;
		}

		.mobile-page {
			display: none;
		}
	}
</style>
