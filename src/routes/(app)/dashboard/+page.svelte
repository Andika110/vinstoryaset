<script lang="ts">
	import { navigating } from '$app/state';
	import { ActivityList, Alert, Card, PageHeader, SummaryCard } from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const isLoading = $derived(navigating.to?.url.pathname === '/dashboard');
</script>

<svelte:head>
	<title>Dashboard — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Dashboard"
		description={`${data.dashboard.greeting}. Ringkasan ${data.dashboard.scopeLabel}.`}
	>
		{#snippet actions()}
			{#each data.dashboard.quickActions as action (action.href)}
				<a class="button-link" class:primary={action.variant === 'primary'} href={action.href}>
					{action.label}
				</a>
			{/each}
		{/snippet}
	</PageHeader>

	{#if data.dashboard.warnings.status === 'ok'}
		{#if data.dashboard.warnings.data.length > 0}
			<div class="warnings">
				{#each data.dashboard.warnings.data as warning (warning.title)}
					<Alert tone={warning.tone} title={warning.title}>
						<p>
							{warning.description}
							<a class="warning-link" href={warning.href}>Lihat</a>
						</p>
					</Alert>
				{/each}
			</div>
		{/if}
	{:else}
		<Alert tone="danger" title="Peringatan tidak tersedia">
			Sebagian peringatan gagal dimuat. Muat ulang halaman untuk mencoba lagi.
		</Alert>
	{/if}

	<div class="sections">
		{#each data.dashboard.sections as section, index (section.title)}
			<section class="dash-section" aria-labelledby={`dashboard-section-${index}`}>
				<div class="section-head">
					<h2 id={`dashboard-section-${index}`}>{section.title}</h2>
					{#if section.description}
						<p>{section.description}</p>
					{/if}
				</div>

				{#if section.cards}
					{#if section.cards.status === 'error'}
						<Card title="Ringkasan tidak tersedia" headingLevel={3}>
							<Alert tone="danger" title="Gagal memuat ringkasan">
								Data ringkasan tidak dapat dimuat. Coba muat ulang halaman.
							</Alert>
						</Card>
					{:else}
						<div class="summary-grid">
							{#each section.cards.data as card (card.label)}
								<SummaryCard
									label={card.label}
									value={card.value}
									href={card.href}
									tone={card.tone}
									hint={card.hint}
									loading={isLoading}
								/>
							{/each}
						</div>
					{/if}
				{/if}

				{#if section.lists}
					<div class="list-grid">
						{#each section.lists as list, listIndex (listIndex)}
							{#if list.status === 'error'}
								<Card title={list.label ?? 'Widget'} headingLevel={3}>
									<Alert tone="danger" title="Gagal memuat widget">
										Data tidak dapat dimuat. Coba muat ulang halaman.
									</Alert>
								</Card>
							{:else}
								<ActivityList
									title={list.data.title}
									description={list.data.description}
									rows={list.data.rows}
									emptyTitle={list.data.emptyTitle}
									emptyDescription={list.data.emptyDescription}
									viewHref={list.data.viewHref}
									viewLabel={list.data.viewLabel}
									loading={isLoading}
								/>
							{/if}
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	</div>
</main>

<style>
	.warnings {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-5);
	}

	.warning-link {
		font-weight: var(--weight-semibold);
		text-decoration: underline;
	}

	.sections {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.dash-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.section-head {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.section-head h2 {
		margin: 0;
		font-size: var(--font-size-xl);
		line-height: var(--leading-tight);
	}

	.section-head p {
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.list-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-1);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.button-link:hover {
		background: var(--surface-2);
	}

	.button-link.primary {
		border-color: transparent;
		background: var(--primary);
		color: var(--primary-contrast);
	}

	.button-link.primary:hover {
		background: var(--primary-hover);
	}

	@media (min-width: 640px) {
		.summary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 900px) {
		.summary-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.list-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1280px) {
		.summary-grid {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}
</style>
