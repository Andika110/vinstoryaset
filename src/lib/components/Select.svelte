<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import type { SelectOption } from './types';
	import FormField from './FormField.svelte';

	interface Props extends Omit<HTMLSelectAttributes, 'value' | 'multiple' | 'size' | 'required'> {
		label?: string;
		hint?: string;
		error?: string;
		options: SelectOption[];
		placeholder?: string;
		value?: string;
		required?: boolean;
	}

	let {
		label,
		hint,
		error,
		options,
		placeholder,
		value = $bindable(''),
		id,
		required = false,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? uid);
</script>

<FormField id={fieldId} {label} {hint} {error} {required}>
	{#snippet children({ describedBy, invalid })}
		<select
			{...rest}
			id={fieldId}
			bind:value
			{required}
			class="select {className}"
			aria-describedby={describedBy}
			aria-invalid={invalid ? 'true' : undefined}
		>
			{#if placeholder}
				<option value="" disabled={required}>{placeholder}</option>
			{/if}
			{#each options as option (option.value)}
				<option value={option.value} disabled={option.disabled}>{option.label}</option>
			{/each}
		</select>
	{/snippet}
</FormField>

<style>
	.select {
		width: 100%;
	}
</style>
