<script lang="ts">
	import { asset } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import Button from './Button.svelte';
	import FormField from './FormField.svelte';

	interface Props {
		name: string;
		label?: string;
		hint?: string;
		error?: string;
		accept?: string;
		maxSizeMB?: number;
		required?: boolean;
		disabled?: boolean;
		templatePath?: string;
		templateLabel?: string;
		onchange?: (file: File | null) => void;
	}

	let {
		name,
		label = 'File data',
		hint = 'Format .xlsx, .xls, atau .csv.',
		error,
		accept = '.xlsx,.xls,.csv',
		maxSizeMB = 10,
		required = false,
		disabled = false,
		templatePath,
		templateLabel = 'Unduh template',
		onchange
	}: Props = $props();

	const uid = $props.id();
	const fieldId = `${uid}-file`;
	let input = $state<HTMLInputElement | null>(null);
	let localError = $state('');
	let selectedName = $state<string | null>(null);
	let selectedSize = $state<number | null>(null);
	let dragging = $state(false);

	const displayError = $derived(error || localError);
	const extensions = $derived(
		accept
			.split(',')
			.map((part) => part.trim().replace(/^\./, '').toLowerCase())
			.filter((part) => part.length > 0 && !part.includes('/'))
	);

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function validate(file: File): string | null {
		const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
		const allowed = extensions.length > 0 ? extensions : ['xlsx', 'xls', 'csv'];
		if (!allowed.includes(extension)) {
			return `Format file harus ${allowed.map((item) => `.${item}`).join(', ')}.`;
		}
		if (file.size > maxSizeMB * 1024 * 1024) {
			return `Ukuran file maksimal ${maxSizeMB} MB.`;
		}
		return null;
	}

	function handleFile(file: File | null): void {
		if (!file) return;
		const validation = validate(file);
		if (validation) {
			localError = validation;
			if (input) input.value = '';
			return;
		}
		localError = '';
		selectedName = file.name;
		selectedSize = file.size;
		onchange?.(file);
	}

	function clearSelection(): void {
		if (input) input.value = '';
		selectedName = null;
		selectedSize = null;
		localError = '';
		onchange?.(null);
	}

	function handleDrop(event: DragEvent): void {
		event.preventDefault();
		dragging = false;
		if (disabled) return;
		void handleFile(event.dataTransfer?.files?.[0] ?? null);
	}
</script>

<FormField id={fieldId} {label} {hint} error={displayError} {required}>
	{#snippet children({ describedBy, invalid })}
		<input
			bind:this={input}
			id={fieldId}
			{name}
			type="file"
			{accept}
			class="visually-hidden"
			{required}
			{disabled}
			aria-describedby={describedBy}
			aria-invalid={invalid ? 'true' : undefined}
			onchange={(event) => handleFile(event.currentTarget.files?.[0] ?? null)}
		/>

		<label
			for={fieldId}
			class="dropzone"
			class:dragging
			class:disabled
			ondragover={(event) => {
				event.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={handleDrop}
		>
			<span>{selectedName ?? 'Pilih file atau tarik ke sini'}</span>
			<span class="dropzone-hint">
				{selectedSize !== null ? formatSize(selectedSize) : `Maksimal ${maxSizeMB} MB`}
			</span>
		</label>

		{#if selectedName}
			<div class="file-meta">
				<strong>{selectedName}</strong>
				{#if selectedSize !== null}
					<span class="text-subtle">{formatSize(selectedSize)}</span>
				{/if}
				<Button type="button" variant="ghost" size="sm" onclick={clearSelection} {disabled}>
					Hapus
				</Button>
			</div>
		{/if}

		{#if templatePath}
			<p class="template-link">
				<a href={asset(templatePath as unknown as AssetPath)} download>{templateLabel}</a>
			</p>
		{/if}
	{/snippet}
</FormField>

<style>
	.dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		min-height: 96px;
		padding: var(--space-4);
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface-2);
		color: var(--text-1);
		font-size: var(--font-size-sm);
		text-align: center;
		cursor: pointer;
		transition:
			border-color var(--motion-fast) var(--motion-ease),
			background-color var(--motion-fast) var(--motion-ease);
	}

	.dropzone:hover,
	.dropzone.dragging {
		border-color: var(--primary);
		background: var(--primary-soft);
	}

	.dropzone.disabled {
		cursor: not-allowed;
		opacity: 0.65;
	}

	.dropzone-hint {
		color: var(--text-2);
		font-size: var(--font-size-xs);
	}

	.file-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}

	.template-link {
		margin: 0;
		font-size: var(--font-size-sm);
	}
</style>
