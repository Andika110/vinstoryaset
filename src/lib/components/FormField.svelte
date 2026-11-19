<script lang="ts">
	import type { Snippet } from 'svelte';

	type FieldParams = {
		id: string;
		describedBy: string | undefined;
		invalid: boolean;
	};

	interface Props {
		id?: string;
		label?: string;
		hint?: string;
		error?: string;
		required?: boolean;
		class?: string;
		children: Snippet<[FieldParams]>;
	}

	let {
		id,
		label,
		hint,
		error,
		required = false,
		class: className = '',
		children
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? uid);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="form-field {className}">
	{#if label}
		<label for={fieldId}>
			{label}
			{#if required}
				<span class="required" aria-hidden="true">*</span>
				<span class="visually-hidden">wajib diisi</span>
			{/if}
		</label>
	{/if}

	{@render children({ id: fieldId, describedBy, invalid: Boolean(error) })}

	{#if hint}
		<p id={hintId} class="hint">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} class="error" role="alert">{error}</p>
	{/if}
</div>

<style>
	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	label {
		margin-bottom: 0;
	}

	.required {
		margin-left: 2px;
		color: var(--danger-text);
	}

	.hint {
		margin: 0;
		color: var(--text-3);
		font-size: var(--font-size-sm);
	}

	.error {
		margin: 0;
		color: var(--danger-text);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}
</style>
