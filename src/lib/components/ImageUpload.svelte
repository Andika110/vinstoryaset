<script lang="ts">
	import Button from './Button.svelte';
	import FormField from './FormField.svelte';

	interface Props {
		name: string;
		label?: string;
		hint?: string;
		error?: string;
		value?: string | null;
		maxSizeMB?: number;
		required?: boolean;
		disabled?: boolean;
		busy?: boolean;
		removeField?: string;
		onchange?: (file: File | null) => void;
	}

	let {
		name,
		label = 'Foto aset',
		hint,
		error,
		value = null,
		maxSizeMB = 5,
		required = false,
		disabled = false,
		busy = $bindable(false),
		removeField,
		onchange
	}: Props = $props();

	const uid = $props.id();
	const fieldId = `${uid}-image`;
	const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
	const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

	let input = $state<HTMLInputElement | null>(null);
	let localError = $state('');
	let selectedName = $state<string | null>(null);
	let selectedSize = $state<number | null>(null);
	let objectUrl = $state<string | null>(null);
	let removed = $state(false);
	let dragging = $state(false);

	const displayError = $derived(error || localError);
	const previewSrc = $derived(removed ? null : (objectUrl ?? value));

	$effect(() => {
		return () => {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	});

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function validate(file: File): string | null {
		const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
		if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
			return 'Format file harus JPG, PNG, atau WebP.';
		}
		if (file.size > maxSizeMB * 1024 * 1024) {
			return `Ukuran gambar maksimal ${maxSizeMB} MB.`;
		}
		return null;
	}

	async function compressImage(file: File): Promise<File> {
		if (typeof createImageBitmap !== 'function') return file;

		try {
			const bitmap = await createImageBitmap(file);
			const maxWidth = 1600;
			const scale = Math.min(1, maxWidth / bitmap.width);
			const width = Math.max(1, Math.round(bitmap.width * scale));
			const height = Math.max(1, Math.round(bitmap.height * scale));
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d');
			if (!context) {
				bitmap.close();
				return file;
			}

			context.drawImage(bitmap, 0, 0, width, height);
			bitmap.close();

			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob(resolve, 'image/webp', 0.8);
			});

			if (!blob) return file;

			return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
				type: 'image/webp',
				lastModified: Date.now()
			});
		} catch {
			return file;
		}
	}

	async function handleFile(file: File | null): Promise<void> {
		if (!file) return;

		const validation = validate(file);
		if (validation) {
			localError = validation;
			if (input) input.value = '';
			return;
		}

		localError = '';
		busy = true;

		try {
			const compressed = await compressImage(file);
			const transfer = new DataTransfer();
			transfer.items.add(compressed);
			if (input) input.files = transfer.files;

			if (objectUrl) URL.revokeObjectURL(objectUrl);
			objectUrl = URL.createObjectURL(compressed);
			selectedName = compressed.name;
			selectedSize = compressed.size;
			removed = false;
			onchange?.(compressed);
		} catch {
			localError = 'Gambar gagal diproses. Coba pilih file lain.';
			if (input) input.value = '';
		} finally {
			busy = false;
		}
	}

	function clearSelection(): void {
		if (input) input.value = '';
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		objectUrl = null;
		selectedName = null;
		selectedSize = null;
		removed = true;
		localError = '';
		onchange?.(null);
	}

	function handleDrop(event: DragEvent): void {
		event.preventDefault();
		dragging = false;
		if (disabled || busy) return;
		const file = event.dataTransfer?.files?.[0] ?? null;
		void handleFile(file);
	}
</script>

<FormField id={fieldId} {label} {hint} error={displayError} {required}>
	{#snippet children({ describedBy, invalid })}
		<input
			bind:this={input}
			id={fieldId}
			{name}
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="visually-hidden"
			{required}
			disabled={disabled || busy}
			aria-describedby={describedBy}
			aria-invalid={invalid ? 'true' : undefined}
			onchange={(event) => void handleFile(event.currentTarget.files?.[0] ?? null)}
		/>

		{#if removeField && removed}
			<input type="hidden" name={removeField} value="1" />
		{/if}

		<label
			for={fieldId}
			class="dropzone"
			class:dragging
			class:disabled={disabled || busy}
			ondragover={(event) => {
				event.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={handleDrop}
		>
			{#if busy}
				<span>Mengompres gambar…</span>
			{:else if previewSrc}
				<span>Ganti foto</span>
			{:else}
				<span>Pilih foto atau tarik file ke sini</span>
			{/if}
			<span class="dropzone-hint">JPG, PNG, WebP · maksimal {maxSizeMB} MB</span>
		</label>

		{#if previewSrc}
			<div class="preview">
				<img src={previewSrc} alt="Pratinjau foto aset" />
				<div class="preview-meta">
					{#if selectedName}
						<strong>{selectedName}</strong>
						{#if selectedSize !== null}
							<span class="text-subtle">{formatSize(selectedSize)} setelah kompresi</span>
						{/if}
					{:else}
						<span class="text-subtle">Foto saat ini</span>
					{/if}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={clearSelection}
						disabled={disabled || busy}
					>
						Hapus foto
					</Button>
				</div>
			</div>
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
		min-height: 120px;
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

	.preview {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
	}

	.preview img {
		width: 96px;
		height: 96px;
		border-radius: var(--radius-sm);
		object-fit: cover;
	}

	.preview-meta {
		display: flex;
		flex: 1 1 180px;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}
</style>
