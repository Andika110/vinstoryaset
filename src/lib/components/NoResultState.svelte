<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '#lib/href.js';

	interface Props {
		title?: string;
		description?: string;
		pathname?: string;
		resetLabel?: string;
	}

	let {
		title = 'Tidak ada hasil',
		description = 'Coba ubah kata kunci atau filter yang digunakan.',
		pathname,
		resetLabel = 'Reset filter'
	}: Props = $props();
	const uid = $props.id();
	const resetHref = $derived(resolve(pathname ?? page.url.pathname));
</script>

<section class="no-result" aria-labelledby={`${uid}-title`}>
	<div class="state-icon" aria-hidden="true"></div>
	<h2 id={`${uid}-title`}>{title}</h2>
	<p>{description}</p>
	<div class="state-action">
		<a href={resetHref}>{resetLabel}</a>
	</div>
</section>

<style>
	.no-result {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-7) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		text-align: center;
	}

	.state-icon {
		width: 44px;
		height: 44px;
		margin-bottom: var(--space-2);
		border: 2px solid var(--border-strong);
		border-radius: var(--radius-full);
		background: var(--surface-2);
		position: relative;
	}

	.state-icon::after {
		content: '';
		position: absolute;
		right: -6px;
		bottom: -2px;
		width: 16px;
		height: 4px;
		border-radius: var(--radius-full);
		background: var(--border-strong);
		transform: rotate(45deg);
	}

	h2 {
		margin: 0;
		font-size: var(--font-size-lg);
	}

	p {
		max-width: 48ch;
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.state-action {
		margin-top: var(--space-3);
	}
</style>
