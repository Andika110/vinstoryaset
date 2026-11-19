<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	type Tone = 'default' | 'danger';

	interface Props {
		open?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		tone?: Tone;
		loading?: boolean;
		onconfirm?: () => void | Promise<void>;
		oncancel?: () => void;
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Konfirmasi',
		cancelLabel = 'Batal',
		tone = 'default',
		loading = false,
		onconfirm,
		oncancel,
		children
	}: Props = $props();

	const uid = $props.id();
	let dialog = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		const element = dialog;
		if (!element) return;

		if (open && !element.open) {
			element.showModal();
		} else if (!open && element.open) {
			element.close();
		}
	});

	$effect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	function requestClose(): void {
		if (loading) return;
		open = false;
		oncancel?.();
	}

	function handleCancel(event: Event): void {
		event.preventDefault();
		requestClose();
	}

	function handleClick(event: MouseEvent): void {
		if (event.target === dialog) {
			requestClose();
		}
	}

	function handleClose(): void {
		open = false;
	}
</script>

<dialog
	bind:this={dialog}
	class="confirm-dialog"
	aria-labelledby={`${uid}-title`}
	aria-describedby={description ? `${uid}-description` : undefined}
	oncancel={handleCancel}
	onclose={handleClose}
	onclick={handleClick}
>
	<div class="dialog-content">
		<header>
			<h2 id={`${uid}-title`}>{title}</h2>
			{#if description}
				<p id={`${uid}-description`} class="text-muted">{description}</p>
			{/if}
		</header>

		{#if children}
			<div class="dialog-body">
				{@render children()}
			</div>
		{/if}

		<footer>
			<Button variant="secondary" onclick={requestClose} disabled={loading} autofocus>
				{cancelLabel}
			</Button>
			<Button
				variant={tone === 'danger' ? 'danger' : 'primary'}
				onclick={() => onconfirm?.()}
				{loading}
			>
				{confirmLabel}
			</Button>
		</footer>
	</div>
</dialog>

<style>
	.confirm-dialog {
		width: min(100% - 32px, 480px);
		padding: 0;
		border: 0;
		border-radius: var(--radius-lg);
		background: transparent;
		color: var(--text-1);
	}

	.confirm-dialog::backdrop {
		background: var(--overlay);
	}

	.dialog-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-5);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-2);
	}

	h2 {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	header p {
		margin: var(--space-2) 0 0;
		font-size: var(--font-size-sm);
	}

	.dialog-body {
		font-size: var(--font-size-sm);
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-2);
		padding-top: var(--space-2);
	}

	@media (max-width: 480px) {
		footer {
			flex-direction: column-reverse;
		}

		footer :global(button) {
			width: 100%;
		}
	}
</style>
