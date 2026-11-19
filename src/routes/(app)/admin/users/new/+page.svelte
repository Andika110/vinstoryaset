<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Card,
		Checkbox,
		Input,
		PageHeader,
		Select
	} from '#lib/components/index.js';
	import type { SelectOption } from '#lib/components/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const roleOptions: SelectOption[] = [
		{ value: 'admin', label: 'IT Administrator' },
		{ value: 'support', label: 'IT Support' },
		{ value: 'outlet', label: 'Outlet Management' }
	];

	const outletOptions = $derived<SelectOption[]>([
		{ value: '', label: 'Tidak terkait outlet' },
		...data.outlets.map((outlet) => ({
			value: String(outlet.id),
			label: `${outlet.name} (${outlet.code})`
		}))
	]);
</script>

<svelte:head>
	<title>Tambah Pengguna — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Tambah pengguna"
		description="Buat akun baru dan tentukan peran serta outletnya."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/admin/users')}>Kembali ke daftar</a>
		{/snippet}
	</PageHeader>

	<Card title="Informasi akun" headingLevel={2}>
		<form method="POST" class="form-grid">
			{#if form?.error}
				<div class="full">
					<Alert tone="danger" title="Gagal menyimpan">{form.error}</Alert>
				</div>
			{/if}

			<Input
				label="Username"
				name="username"
				autocomplete="username"
				required
				value={form?.values?.username ?? ''}
				error={form?.fieldErrors?.username}
			/>
			<Input
				label="Nama lengkap"
				name="fullName"
				autocomplete="name"
				required
				value={form?.values?.fullName ?? ''}
				error={form?.fieldErrors?.fullName}
			/>
			<Input
				label="Email"
				name="email"
				type="email"
				autocomplete="email"
				required
				value={form?.values?.email ?? ''}
				error={form?.fieldErrors?.email}
			/>
			<Input
				label="Password awal"
				name="password"
				type="password"
				autocomplete="new-password"
				hint="Minimal 8 karakter. Pengguna wajib mengganti saat login pertama."
				required
				error={form?.fieldErrors?.password}
			/>
			<Select
				label="Role"
				name="role"
				options={roleOptions}
				required
				value={form?.values?.role ?? 'support'}
				error={form?.fieldErrors?.role}
			/>
			<Select
				label="Outlet"
				name="outletId"
				options={outletOptions}
				hint="Wajib untuk role Outlet Management."
				value={form?.values?.outletId != null ? String(form.values.outletId) : ''}
				error={form?.fieldErrors?.outletId}
			/>
			<div class="full">
				<Checkbox
					label="Akun aktif"
					name="isActive"
					hint="Akun nonaktif tidak dapat login."
					checked={form?.values?.isActive ?? true}
				/>
			</div>
			<div class="full form-actions">
				<Button type="submit">Simpan pengguna</Button>
				<a class="cancel-link" href={resolve('/(app)/admin/users')}>Batal</a>
			</div>
		</form>
	</Card>
</main>

<style>
	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.full {
		grid-column: 1 / -1;
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		padding-top: var(--space-2);
	}

	.back-link,
	.cancel-link {
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 768px) {
		.form-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
