<script lang="ts">
	import AppShell from '#lib/components/AppShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<AppShell role={data.user.role} userName={data.user.name} scopeLabel={data.user.scopeLabel}>
	{@render children()}
</AppShell>
