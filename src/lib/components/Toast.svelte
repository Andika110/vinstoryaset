<script lang="ts">
	import Alert from './Alert.svelte';

	type Tone = 'success' | 'warning' | 'danger' | 'info';

	interface Props {
		open?: boolean;
		tone?: Tone;
		title?: string;
		message: string;
		duration?: number;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		tone = 'info',
		title,
		message,
		duration = 5000,
		onclose
	}: Props = $props();

	$effect(() => {
		if (!open || duration <= 0) return;

		const timer = setTimeout(() => {
			open = false;
			onclose?.();
		}, duration);

		return () => clearTimeout(timer);
	});

	function close(): void {
		open = false;
		onclose?.();
	}
</script>

{#if open}
	<div class="toast" aria-live="polite">
		<Alert {tone} {title}>{message}</Alert>
		<button type="button" class="toast-close" aria-label="Tutup notifikasi" onclick={close}>
			×
		</button>
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		right: var(--space-4);
		bottom: calc(var(--touch-target) + var(--space-4));
		z-index: var(--z-toast);
		width: min(100% - 32px, 420px);
	}

	.toast :global(.alert) {
		box-shadow: var(--shadow-2);
		padding-right: var(--space-7);
	}

	.toast-close {
		position: absolute;
		top: var(--space-2);
		right: var(--space-2);
		display: grid;
		place-items: center;
		width: 44px;
		min-width: 44px;
		height: 44px;
		min-height: 44px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-full);
		background: transparent;
		color: currentColor;
		font-size: var(--font-size-lg);
		line-height: 1;
	}

	.toast-close:hover {
		background: rgb(255 255 255 / 0.35);
	}

	@media (min-width: 768px) {
		.toast {
			bottom: var(--space-4);
		}
	}
</style>
