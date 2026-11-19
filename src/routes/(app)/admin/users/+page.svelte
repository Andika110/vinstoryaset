<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		DataTable,
		EmptyState,
		MobileDataCard,
		NoResultState,
		PageHeader,
		Pagination,
		SearchFilter,
		StatusBadge
	} from '#lib/components/index.js';
	import { ROLE_LABEL } from '#lib/navigation.js';
	import type { PageData, PageProps } from './$types';

	let { data }: PageProps = $props();

	type Row = PageData['items'][number];

	const filters = $derived([
		{
			name: 'role',
			label: 'Role',
			value: data.role,
			options: [
				{ value: '', label: 'Semua role' },
				{ value: 'admin', label: 'IT Administrator' },
				{ value: 'support', label: 'IT Support' },
				{ value: 'outlet', label: 'Outlet Management' }
			]
		},
		{
			name: 'outlet',
			label: 'Outlet',
			value: data.outlet,
			options: [
				{ value: '', label: 'Semua outlet' },
				...data.outlets.map((outlet) => ({ value: String(outlet.id), label: outlet.name }))
			]
		},
		{
			name: 'status',
			label: 'Status',
			value: data.status,
			options: [
				{ value: '', label: 'Semua status' },
				{ value: 'active', label: 'Aktif' },
				{ value: 'inactive', label: 'Nonaktif' }
			]
		}
	]);

	const hasFilter = $derived(Boolean(data.search || data.role || data.outlet || data.status));
</script>

<svelte:head>
	<title>Pengguna — Aset &amp; Inventory IT</title>
</svelte:head>

{#snippet statusCell(row: Row)}
	<StatusBadge
		label={row.isActive ? 'Aktif' : 'Nonaktif'}
		tone={row.isActive ? 'success' : 'neutral'}
		dot={row.isActive}
	/>
{/snippet}

{#snippet roleCell(row: Row)}
	{ROLE_LABEL[row.role]}
{/snippet}

<main class="container page">
	<PageHeader title="Pengguna" description="Kelola akun, peran, outlet, status, dan sesi pengguna.">
		{#snippet actions()}
			<a class="button-link" href={resolve('/(app)/admin/users/new')}>Tambah pengguna</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari username, email, atau nama…"
		{filters}
		resultCount={data.total}
	/>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/admin/users')} />
			{:else}
				<EmptyState
					title="Belum ada pengguna"
					description="Tambahkan akun pertama untuk mulai mengelola akses aplikasi."
				>
					{#snippet action()}
						<a class="button-link" href={resolve('/(app)/admin/users/new')}> Tambah pengguna </a>
					{/snippet}
				</EmptyState>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'username', label: 'Username', mobilePrimary: true, class: 'font-mono' },
				{ key: 'fullName', label: 'Nama', mobile: true },
				{ key: 'email', label: 'Email', mobile: true },
				{ key: 'role', label: 'Role', mobile: true, render: roleCell },
				{ key: 'outletName', label: 'Outlet', mobile: true },
				{ key: 'isActive', label: 'Status', mobile: true, render: statusCell }
			]}

			<h2 class="visually-hidden">Daftar pengguna</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/admin/users/[id]', { id: String(row.id) })}
						aria-label="Detail pengguna {row.username}"
					>
						Detail
					</a>
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/admin/users/[id]', { id: String(row.id) })}
						aria-label="Detail pengguna {row.username}"
					>
						Detail
					</a>
				{/snippet}
			</MobileDataCard>

			<Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
		{/if}
	</div>
</main>

<style>
	.list-area {
		margin-top: var(--space-5);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		border-radius: var(--radius-md);
		background: var(--primary);
		color: var(--primary-contrast);
		font-weight: var(--weight-medium);
		text-decoration: none;
	}

	.button-link:hover {
		background: var(--primary-hover);
		color: var(--primary-contrast);
	}

	.row-action {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		padding: 0 var(--space-2);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}
</style>
