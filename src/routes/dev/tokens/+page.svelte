<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Design Tokens — Aset &amp; Inventory IT</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="container page stack">
	<header class="stack">
		<h1>Design tokens</h1>
		<p class="text-muted">
			Halaman verifikasi FND-02. Semua contoh memakai token peran dari
			<code class="font-mono">tokens.css</code>.
		</p>
	</header>

	<section class="stack" aria-labelledby="colors-title">
		<h2 id="colors-title">Warna</h2>
		<div class="swatch-grid">
			{#each [{ name: 'primary', token: '--primary', note: '5.47:1 dengan teks putih' }, { name: 'primary-soft', token: '--primary-soft', note: 'Latar lembut' }, { name: 'text-1', token: '--text-1', note: '17.06:1 di bg' }, { name: 'text-2', token: '--text-2', note: '7.24:1 di bg' }, { name: 'text-3', token: '--text-3', note: '4.55:1 di bg' }, { name: 'border-strong', token: '--border-strong', note: '4.76:1 di putih' }] as color (color.token)}
				<article class="swatch">
					<div class="swatch-color" style="background: var({color.token})"></div>
					<div>
						<strong>{color.name}</strong>
						<p class="text-subtle font-mono">{color.token}</p>
						<p class="text-subtle">{color.note}</p>
					</div>
				</article>
			{/each}
		</div>

		<h3>Status</h3>
		<div class="badge-row">
			<span class="badge badge-success">Available</span>
			<span class="badge badge-warning">Stok menipis</span>
			<span class="badge badge-danger">Damaged</span>
			<span class="badge badge-info">Processing</span>
			<span class="badge badge-neutral">Draft</span>
		</div>
	</section>

	<section class="stack" aria-labelledby="type-title">
		<h2 id="type-title">Tipografi</h2>
		<div class="type-sample">
			<p class="type-label">IBM Plex Sans · 36/30/24/20/18/16/14/12</p>
			<p class="type-4xl">Aset &amp; Inventory</p>
			<p class="type-3xl">Aset &amp; Inventory</p>
			<p class="type-2xl">Aset &amp; Inventory</p>
			<p class="type-xl">Aset &amp; Inventory</p>
			<p class="type-lg">Aset &amp; Inventory</p>
			<p class="type-base">Aset &amp; Inventory</p>
			<p class="type-sm text-muted">Aset &amp; Inventory</p>
			<p class="type-xs text-subtle">Keterangan tambahan</p>
			<p class="font-mono">LPT-0042 · REQ-2026-0001 · SN-88X21</p>
		</div>
	</section>

	<section class="stack" aria-labelledby="space-title">
		<h2 id="space-title">Spacing</h2>
		<div class="space-list">
			{#each [{ token: '--space-1', size: '4' }, { token: '--space-2', size: '8' }, { token: '--space-3', size: '12' }, { token: '--space-4', size: '16' }, { token: '--space-5', size: '24' }, { token: '--space-6', size: '32' }, { token: '--space-7', size: '48' }, { token: '--space-8', size: '64' }] as space (space.token)}
				<div class="space-row">
					<code class="font-mono">{space.token}</code>
					<div class="space-bar" style="width: var({space.token})"></div>
					<span class="text-subtle">{space.size}px</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="stack" aria-labelledby="shape-title">
		<h2 id="shape-title">Radius &amp; shadow</h2>
		<div class="shape-row">
			<div class="shape-box radius-sm">sm 4</div>
			<div class="shape-box radius-md">md 8</div>
			<div class="shape-box radius-lg">lg 12</div>
			<div class="shape-box shadow-1">shadow-1</div>
			<div class="shape-box shadow-2">shadow-2</div>
		</div>
	</section>

	<section class="stack" aria-labelledby="form-title">
		<h2 id="form-title">Form &amp; fokus</h2>
		<div class="form-grid">
			<div>
				<label for="demo-name">Nama aset</label>
				<input id="demo-name" placeholder="Contoh: Laptop Finance" />
			</div>
			<div>
				<label for="demo-status">Status</label>
				<select id="demo-status">
					<option>Available</option>
					<option>In Use</option>
				</select>
			</div>
			<div class="full">
				<label for="demo-note">Catatan</label>
				<textarea id="demo-note" placeholder="Deskripsi singkat"></textarea>
			</div>
			<div class="cluster">
				<button type="button">Simpan aset</button>
				<button type="button" disabled>Menyimpan…</button>
				<a href={resolve('/dev/tokens')}>Tautan fokus</a>
			</div>
		</div>
		<p class="text-subtle">
			Input minimal 16px dan tinggi 44px. Fokus keyboard memakai outline 3px yang terlihat.
		</p>
	</section>
</main>

<style>
	.swatch-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.swatch {
		display: grid;
		grid-template-columns: 72px 1fr;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.swatch-color {
		height: 56px;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}

	.badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		min-height: 28px;
		padding: 2px var(--space-3);
		border: 1px solid transparent;
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.badge-success {
		background: var(--success-bg);
		border-color: var(--success-border);
		color: var(--success-text);
	}

	.badge-warning {
		background: var(--warning-bg);
		border-color: var(--warning-border);
		color: var(--warning-text);
	}

	.badge-danger {
		background: var(--danger-bg);
		border-color: var(--danger-border);
		color: var(--danger-text);
	}

	.badge-info {
		background: var(--info-bg);
		border-color: var(--info-border);
		color: var(--info-text);
	}

	.badge-neutral {
		background: var(--neutral-bg);
		border-color: var(--neutral-border);
		color: var(--neutral-text);
	}

	.type-sample {
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.type-label {
		margin-bottom: var(--space-3);
		color: var(--text-3);
		font-size: var(--font-size-sm);
	}

	.type-4xl {
		font-size: var(--font-size-4xl);
		line-height: var(--leading-tight);
	}

	.type-3xl {
		font-size: var(--font-size-3xl);
	}

	.type-2xl {
		font-size: var(--font-size-2xl);
	}

	.type-xl {
		font-size: var(--font-size-xl);
	}

	.type-lg {
		font-size: var(--font-size-lg);
	}

	.type-base {
		font-size: var(--font-size-base);
	}

	.type-sm {
		font-size: var(--font-size-sm);
	}

	.type-xs {
		font-size: var(--font-size-xs);
	}

	.space-list {
		display: grid;
		gap: var(--space-2);
	}

	.space-row {
		display: grid;
		grid-template-columns: 88px 1fr auto;
		gap: var(--space-3);
		align-items: center;
	}

	.space-bar {
		height: 12px;
		border-radius: var(--radius-full);
		background: var(--primary);
	}

	.shape-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.shape-box {
		display: grid;
		place-items: center;
		min-width: 96px;
		min-height: 72px;
		padding: var(--space-3);
		border: 1px solid var(--border);
		background: var(--surface);
		text-align: center;
		font-size: var(--font-size-sm);
	}

	.radius-sm {
		border-radius: var(--radius-sm);
	}

	.radius-md {
		border-radius: var(--radius-md);
	}

	.radius-lg {
		border-radius: var(--radius-lg);
	}

	.shadow-1 {
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-1);
	}

	.shadow-2 {
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-2);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.full {
		grid-column: 1 / -1;
	}

	@media (min-width: 768px) {
		.swatch-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.form-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.swatch-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
