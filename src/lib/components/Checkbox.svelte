<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'type' | 'checked' | 'value'> {
		label: string;
		hint?: string;
		error?: string;
		checked?: boolean;
	}

	let {
		label,
		hint,
		error,
		checked = $bindable(false),
		id,
		required = false,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? uid);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);
	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="checkbox-field {className}">
	<label for={fieldId}>
		<input
			{...rest}
			id={fieldId}
			type="checkbox"
			bind:checked
			{required}
			aria-describedby={describedBy}
			aria-invalid={error ? 'true' : undefined}
		/>
		<span>
			{label}
			{#if required}
				<span class="required" aria-hidden="true">*</span>
				<span class="visually-hidden">wajib diisi</span>
			{/if}
		</span>
	</label>

	{#if hint}
		<p id={hintId} class="hint">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} class="error" role="alert">{error}</p>
	{/if}
</div>

<style>
	.checkbox-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	label {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--touch-target);
		margin: 0;
		cursor: pointer;
	}

	input {
		flex: none;
	}

	.required {
		margin-left: 2px;
		color: var(--danger-text);
	}

	.hint {
		margin: 0;
		padding-left: 28px;
		color: var(--text-3);
		font-size: var(--font-size-sm);
	}

	.error {
		margin: 0;
		padding-left: 28px;
		color: var(--danger-text);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}
</style>
