<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import FormField from './FormField.svelte';

	type InputType =
		'text' | 'email' | 'password' | 'number' | 'date' | 'search' | 'tel' | 'url' | 'time';

	interface Props extends Omit<HTMLInputAttributes, 'value' | 'type' | 'required'> {
		label?: string;
		hint?: string;
		error?: string;
		type?: InputType;
		value?: string | number;
		required?: boolean;
	}

	let {
		label,
		hint,
		error,
		type = 'text',
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
		<input
			{...rest}
			id={fieldId}
			{type}
			bind:value
			{required}
			class="input {className}"
			aria-describedby={describedBy}
			aria-invalid={invalid ? 'true' : undefined}
		/>
	{/snippet}
</FormField>

<style>
	.input {
		width: 100%;
	}
</style>
