<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="auth-page">
	<main class="auth-panel">
		{@render children()}
	</main>
</div>

<style>
	.auth-page {
		display: grid;
		min-height: 100dvh;
		place-items: center;
		padding: var(--space-4);
		background: var(--bg);
	}

	.auth-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		width: 100%;
		max-width: 420px;
	}
</style>
