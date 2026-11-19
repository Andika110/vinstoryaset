<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Card, StatusBadge } from './index.js';
	import type { ActivityRowData } from '#lib/dashboard.js';

	interface Props {
		title: string;
		description?: string;
		rows: ActivityRowData[];
		emptyTitle: string;
		emptyDescription?: string;
		viewHref?: ResolvedPathname;
		viewLabel?: string;
		loading?: boolean;
	}

	let {
		title,
		description,
		rows,
		emptyTitle,
		emptyDescription,
		viewHref,
		viewLabel,
		loading = false
	}: Props = $props();
</script>

{#snippet rowBody(row: ActivityRowData)}
	<span class="row-head">
		<span class="row-title">{row.title}</span>
		{#if row.badge}
			<StatusBadge label={row.badge.label} tone={row.badge.tone} size="sm" />
		{/if}
	</span>
	{#if row.subtitle}
		<span class="row-subtitle">{row.subtitle}</span>
	{/if}
	{#if row.meta}
		<span class="row-meta">{row.meta}</span>
	{/if}
{/snippet}

<Card {title} {description}>
	{#if loading}
		<ul class="rows" aria-busy="true" aria-label="Memuat {title}">
			{#each [1, 2, 3] as item (item)}
				<li class="skeleton-row" aria-hidden="true">
					<span class="skeleton-line"></span>
					<span class="skeleton-line short"></span>
				</li>
			{/each}
		</ul>
	{:else if rows.length === 0}
		<div class="empty">
			<p class="empty-title">{emptyTitle}</p>
			{#if emptyDescription}
				<p class="empty-description">{emptyDescription}</p>
			{/if}
		</div>
	{:else}
		<ul class="rows">
			{#each rows as row (row.id)}
				<li>
					{#if row.href}
						<a class="row row-link" href={row.href}>
							{@render rowBody(row)}
							<span class="chevron" aria-hidden="true">›</span>
						</a>
					{:else}
						<div class="row">
							{@render rowBody(row)}
						</div>
					{/if}
				</li>
			{/each}
		</ul>

		{#if viewHref && viewLabel}
			<a class="view-link" href={viewHref}>
				{viewLabel} <span aria-hidden="true">→</span>
			</a>
		{/if}
	{/if}
</Card>

<style>
	.rows {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.rows > li + li {
		border-top: 1px solid var(--border);
	}

	.row {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-3) 0;
		color: var(--text-1);
		text-decoration: none;
	}

	.row-link {
		margin: 0 calc(var(--space-2) * -1);
		padding-inline: var(--space-2);
		border-radius: var(--radius-md);
	}

	.row-link:hover {
		background: var(--surface-2);
	}

	.row-link:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}

	.row-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-2);
		min-width: 0;
	}

	.row-title {
		flex: 1;
		min-width: 0;
		font-size: var(--font-size-base);
		font-weight: var(--weight-medium);
		line-height: var(--leading-normal);
		overflow-wrap: anywhere;
	}

	.row-subtitle {
		color: var(--text-2);
		font-size: var(--font-size-sm);
		line-height: var(--leading-normal);
		overflow-wrap: anywhere;
	}

	.row-meta {
		color: var(--text-3);
		font-size: var(--font-size-xs);
		font-variant-numeric: tabular-nums;
	}

	.row-link .row-head,
	.row-link .row-subtitle,
	.row-link .row-meta {
		padding-right: var(--space-4);
	}

	.chevron {
		position: absolute;
		top: var(--space-3);
		right: var(--space-1);
		color: var(--text-3);
		font-size: var(--font-size-lg);
		line-height: 1;
	}

	.empty {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-5) var(--space-3);
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.empty-title {
		margin: 0;
		font-size: var(--font-size-base);
		font-weight: var(--weight-medium);
	}

	.empty-description {
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.view-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.skeleton-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) 0;
	}

	.skeleton-line {
		width: 100%;
		height: 0.85rem;
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

	.skeleton-line.short {
		width: 55%;
	}

	@keyframes shimmer {
		to {
			background-position: -200% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-line {
			animation: none;
		}
	}
</style>
