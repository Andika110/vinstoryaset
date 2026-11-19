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

	const values = $derived(
		form?.values ?? {
			username: data.user.username,
			email: data.user.email,
			fullName: data.user.fullName,
			role: data.user.role,
			outletId: data.user.outletId,
			isActive: data.user.isActive
		}
	);

	const detailHref = $derived(resolve('/(app)/admin/users/[id]', { id: String(data.user.id) }));
</script>

<svelte:head>
	<title>Edit Pengguna — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Edit pengguna"
		description="Perbarui profil, role, outlet, atau status akun {data.user.username}."
	>
		{#snippet actions()}
			<a class="back-link" href={detailHref}>Kembali ke detail</a>
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
				value={values.username}
				error={form?.fieldErrors?.username}
			/>
			<Input
				label="Nama lengkap"
				name="fullName"
				autocomplete="name"
				required
				value={values.fullName}
				error={form?.fieldErrors?.fullName}
			/>
			<Input
				label="Email"
				name="email"
				type="email"
				autocomplete="email"
				required
				value={values.email}
				error={form?.fieldErrors?.email}
			/>
			<Select
				label="Role"
				name="role"
				options={roleOptions}
				required
				value={values.role}
				error={form?.fieldErrors?.role}
			/>
			<Select
				label="Outlet"
				name="outletId"
				options={outletOptions}
				hint="Wajib untuk role Outlet Management."
				value={values.outletId != null ? String(values.outletId) : ''}
				error={form?.fieldErrors?.outletId}
			/>
			<div class="full">
				<Checkbox
					label="Akun aktif"
					name="isActive"
					hint="Menonaktifkan akun akan mencabut sesi aktif dan mencegah login."
					checked={values.isActive}
				/>
			</div>
			<div class="full form-actions">
				<Button type="submit">Simpan perubahan</Button>
				<a class="cancel-link" href={detailHref}>Batal</a>
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
