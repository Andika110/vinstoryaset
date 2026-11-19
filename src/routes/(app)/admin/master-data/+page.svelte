<script lang="ts">
	import { resolve } from '$app/paths';
	import { PageHeader } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const groups = $derived.by(() => {
		const order = ['Aset', 'Inventory', 'Organisasi', 'Vendor', 'Sistem'];
		return order
			.map((label) => ({
				label,
				modules: data.modules.filter((module) => module.group === label)
			}))
			.filter((group) => group.modules.length > 0);
	});
</script>

<svelte:head>
	<title>Master Data — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Master Data"
		description="Kelola data referensi aset, inventory, organisasi, vendor, dan status sistem."
	/>

	<div class="groups">
		{#each groups as group (group.label)}
			<section class="group" aria-labelledby={`group-${group.label}`}>
				<h2 id={`group-${group.label}`}>{group.label}</h2>
				<div class="module-grid">
					{#each group.modules as module (module.type)}
						<article class="module-card">
							<div class="module-head">
								<h3>{module.label}</h3>
								<span class="count">{module.count}</span>
							</div>
							<p>{module.description}</p>
							<a
								href={module.type === 'inventory-item'
									? resolve('/(app)/inventory')
									: resolve('/(app)/admin/master-data/[type]', { type: module.type })}
							>
								Kelola
							</a>
						</article>
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
		margin-bottom: var(--space-3);
		font-size: var(--font-size-xl);
	}

	.module-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.module-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-1);
	}

	.module-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.module-head h3 {
		margin: 0;
		font-size: var(--font-size-base);
	}

	.count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 28px;
		min-height: 28px;
		padding: 0 var(--space-2);
		border-radius: var(--radius-full);
		background: var(--surface-2);
		color: var(--text-2);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
	}

	.module-card p {
		flex: 1;
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.module-card a {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-semibold);
	}

	@media (min-width: 768px) {
		.module-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.module-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
