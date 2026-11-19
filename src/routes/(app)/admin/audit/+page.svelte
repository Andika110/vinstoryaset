<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		DataTable,
		EmptyState,
		MobileDataCard,
		NoResultState,
		PageHeader,
		Pagination,
		SearchFilter
	} from '#lib/components/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const filters = $derived([
		{
			name: 'user',
			label: 'Pengguna',
			value: data.user,
			options: [
				{ value: '', label: 'Semua pengguna' },
				...data.filters.users.map((user) => ({ value: String(user.id), label: user.label }))
			]
		},
		{
			name: 'module',
			label: 'Modul',
			value: data.module,
			options: [
				{ value: '', label: 'Semua modul' },
				...data.filters.modules.map((module) => ({
					value: module.value,
					label: module.label
				}))
			]
		},
		{
			name: 'action',
			label: 'Aksi',
			value: data.action,
			options: [
				{ value: '', label: 'Semua aksi' },
				...data.filters.actions.map((action) => ({
					value: action.value,
					label: action.label
				}))
			]
		},
		{ name: 'from', label: 'Dari tanggal', value: data.from, options: [], type: 'date' as const },
		{ name: 'to', label: 'Sampai tanggal', value: data.to, options: [], type: 'date' as const }
	]);

	const hasFilter = $derived(
		Boolean(data.search || data.user || data.module || data.action || data.from || data.to)
	);
</script>

<svelte:head>
	<title>Audit Log — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Audit Log"
		description="Jejak aktivitas penting aplikasi, append-only dan read-only."
	>
		{#snippet actions()}
			<a class="back-link" href={resolve('/(app)/dashboard')}>Kembali ke dashboard</a>
		{/snippet}
	</PageHeader>

	<SearchFilter
		search={data.search}
		searchPlaceholder="Cari pengguna, aksi, modul, atau record…"
		{filters}
		resultCount={data.total}
	/>

	<p class="retention">
		Audit log tidak dapat diubah atau dihapus dari aplikasi. Retensi minimal 3 tahun; IT
		Administrator dapat melihat seluruh modul, IT Support hanya modul operasional.
	</p>

	<div class="list-area">
		{#if data.total === 0}
			{#if hasFilter}
				<NoResultState pathname={resolve('/(app)/admin/audit')} />
			{:else}
				<EmptyState
					title="Belum ada aktivitas"
					description="Aktivitas penting aplikasi akan tercatat di sini."
				/>
			{/if}
		{:else}
			{@const columns = [
				{ key: 'createdAtLabel', label: 'Waktu', mobile: true },
				{ key: 'userName', label: 'Pengguna', mobile: true },
				{ key: 'action', label: 'Aksi', mobilePrimary: true, class: 'font-mono' },
				{ key: 'module', label: 'Modul', mobile: true },
				{ key: 'recordId', label: 'Record', class: 'font-mono' }
			]}

			<h2 class="visually-hidden">Daftar audit log</h2>

			<DataTable {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/admin/audit/[id]', { id: String(row.id) })}
						aria-label="Detail audit {row.id}"
					>
						Detail
					</a>
				{/snippet}
			</DataTable>

			<MobileDataCard {columns} rows={data.items} rowKey={(row) => row.id}>
				{#snippet actions(row)}
					<a
						class="row-action"
						href={resolve('/(app)/admin/audit/[id]', { id: String(row.id) })}
						aria-label="Detail audit {row.id}"
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
		margin-top: var(--space-4);
	}

	.retention {
		margin: var(--space-3) 0 0;
		color: var(--text-3);
		font-size: var(--font-size-xs);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
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
