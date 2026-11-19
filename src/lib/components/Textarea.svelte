<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import FormField from './FormField.svelte';

	interface Props extends Omit<HTMLTextareaAttributes, 'value' | 'required'> {
		label?: string;
		hint?: string;
		error?: string;
		value?: string;
		required?: boolean;
	}

	let {
		label,
		hint,
		error,
		value = $bindable(''),
		id,
		required = false,
		rows = 4,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? uid);
</script>

<FormField id={fieldId} {label} {hint} {error} {required}>
	{#snippet children({ describedBy, invalid })}
		<textarea
			{...rest}
			id={fieldId}
			bind:value
			{required}
			{rows}
			class="textarea {className}"
			aria-describedby={describedBy}
			aria-invalid={invalid ? 'true' : undefined}></textarea>
	{/snippet}
</FormField>

<style>
	.textarea {
		width: 100%;
	}
</style>
