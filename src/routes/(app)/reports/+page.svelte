<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Laporan — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Laporan"
		description="Laporan aset, inventory, dan operasional sesuai cakupan akses Anda."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/dashboard')}>Kembali ke dashboard</a>
		{/snippet}
	</PageHeader>

	<div class="groups">
		{#each data.groups as group (group.category)}
			<section class="group" aria-labelledby={`report-group-${group.category}`}>
				<h2 id={`report-group-${group.category}`}>{group.category}</h2>
				<div class="report-grid">
					{#each group.reports as report (report.key)}
						<a class="report-card" href={resolve('/(app)/reports/[key]', { key: report.key })}>
							<span class="report-head">
								<strong>{report.title}</strong>
								{#if report.advanced}
									<span class="advanced">Lanjutan</span>
								{/if}
							</span>
							<span class="report-desc">{report.description}</span>
							<span class="open">Buka laporan →</span>
						</a>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</main>

<style>
	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.group h2 {
		margin: 0 0 var(--space-3);
		font-size: var(--font-size-xl);
	}

	.report-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.report-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-1);
		color: var(--text-1);
		text-decoration: none;
	}

	.report-card:hover {
		border-color: var(--primary);
		background: var(--primary-soft);
	}

	.report-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.report-head strong {
		font-size: var(--font-size-base);
	}

	.advanced {
		flex: none;
		padding: 1px var(--space-2);
		border-radius: var(--radius-full);
		background: var(--warning-bg);
		color: var(--warning-text);
		font-size: var(--font-size-xs);
		font-weight: var(--weight-medium);
	}

	.report-desc {
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.open {
		margin-top: auto;
		color: var(--primary);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.back-link {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 768px) {
		.report-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1100px) {
		.report-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
