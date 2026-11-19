export type Role = 'admin' | 'support' | 'outlet';

export type NavItem = {
	label: string;
	href: string;
};

export type NavGroup = {
	label: string;
	items: NavItem[];
};

export const ROLE_LABEL: Record<Role, string> = {
	admin: 'IT Administrator',
	support: 'IT Support',
	outlet: 'Outlet Management'
};

export const NAV_GROUPS: Record<Role, NavGroup[]> = {
	admin: [
		{
			label: 'Utama',
			items: [{ label: 'Dashboard', href: '/dashboard' }]
		},
		{
			label: 'Manajemen Aset',
			items: [
				{ label: 'Aset', href: '/assets' },
				{ label: 'Label QR', href: '/assets/labels' },
				{ label: 'Scan QR', href: '/scan' },
				{ label: 'Penempatan', href: '/assets/assignments' },
				{ label: 'Mutasi', href: '/assets/mutations' },
				{ label: 'Peminjaman', href: '/assets/loans' },
				{ label: 'Maintenance', href: '/maintenance' },
				{ label: 'Disposal', href: '/disposals' }
			]
		},
		{
			label: 'Manajemen Inventory',
			items: [
				{ label: 'Item Inventory', href: '/inventory' },
				{ label: 'Penerimaan', href: '/receiving' },
				{ label: 'Transaksi Stok', href: '/stock' },
				{ label: 'Stock Opname', href: '/opname' },
				{ label: 'Request', href: '/requests' }
			]
		},
		{
			label: 'Laporan',
			items: [{ label: 'Laporan', href: '/reports' }]
		},
		{
			label: 'Administrasi',
			items: [
				{ label: 'Master Data', href: '/admin/master-data' },
				{ label: 'Pengguna', href: '/admin/users' },
				{ label: 'Audit Log', href: '/admin/audit' },
				{ label: 'Import Data', href: '/admin/import' },
				{ label: 'UI States', href: '/dev/ui' }
			]
		}
	],
	support: [
		{
			label: 'Utama',
			items: [{ label: 'Dashboard', href: '/dashboard' }]
		},
		{
			label: 'Manajemen Aset',
			items: [
				{ label: 'Aset', href: '/assets' },
				{ label: 'Label QR', href: '/assets/labels' },
				{ label: 'Scan QR', href: '/scan' },
				{ label: 'Penempatan', href: '/assets/assignments' },
				{ label: 'Mutasi', href: '/assets/mutations' },
				{ label: 'Peminjaman', href: '/assets/loans' },
				{ label: 'Maintenance', href: '/maintenance' },
				{ label: 'Disposal', href: '/disposals' }
			]
		},
		{
			label: 'Manajemen Inventory',
			items: [
				{ label: 'Item Inventory', href: '/inventory' },
				{ label: 'Penerimaan', href: '/receiving' },
				{ label: 'Transaksi Stok', href: '/stock' },
				{ label: 'Stock Opname', href: '/opname' },
				{ label: 'Request', href: '/requests' }
			]
		},
		{
			label: 'Laporan',
			items: [{ label: 'Laporan', href: '/reports' }]
		},
		{
			label: 'Administrasi',
			items: [
				{ label: 'Master Data (Terbatas)', href: '/admin/master-data' },
				{ label: 'Audit Log (Terbatas)', href: '/admin/audit' },
				{ label: 'Import Data', href: '/admin/import' }
			]
		}
	],
	outlet: [
		{
			label: 'Utama',
			items: [{ label: 'Dashboard', href: '/dashboard' }]
		},
		{
			label: 'Aset',
			items: [
				{ label: 'Daftar Aset', href: '/assets' },
				{ label: 'Scan QR', href: '/scan' },
				{ label: 'Label QR', href: '/assets/labels' },
				{ label: 'Riwayat Penempatan', href: '/assets/assignments' },
				{ label: 'Riwayat Mutasi', href: '/assets/mutations' },
				{ label: 'Peminjaman', href: '/assets/loans' }
			]
		},
		{
			label: 'Stok',
			items: [
				{ label: 'Inventory Outlet', href: '/inventory' },
				{ label: 'Status Ketersediaan', href: '/inventory/availability' }
			]
		},
		{
			label: 'Request',
			items: [
				{ label: 'Request Saya', href: '/requests' },
				{ label: 'Buat Request', href: '/requests/new' }
			]
		},
		{
			label: 'Maintenance',
			items: [
				{ label: 'Lapor Kerusakan', href: '/maintenance/new' },
				{ label: 'Riwayat Kerusakan', href: '/maintenance' }
			]
		},
		{
			label: 'Stock Opname',
			items: [{ label: 'Pengecekan Fisik', href: '/opname' }]
		},
		{
			label: 'Laporan',
			items: [{ label: 'Laporan', href: '/reports' }]
		},
		{
			label: 'Lainnya',
			items: [{ label: 'Profil', href: '/profile' }]
		}
	]
};

export const BOTTOM_NAV: NavItem[] = [
	{ label: 'Beranda', href: '/dashboard' },
	{ label: 'Aset', href: '/assets' },
	{ label: 'Stok', href: '/inventory' },
	{ label: 'Request', href: '/requests' },
	{ label: 'Lainnya', href: '/more' }
];

export function isActivePath(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function isBottomNavActive(pathname: string, href: string): boolean {
	if (href === '/more') {
		return !BOTTOM_NAV.slice(0, 4).some((item) => isActivePath(pathname, item.href));
	}
	return isActivePath(pathname, href);
}

/**
 * Penjaga UX sementara untuk route group (app).
 * Pemeriksaan izin per service tetap menjadi tanggung jawab FND-09.
 */
export function canAccessPath(role: Role, pathname: string): boolean {
	if (role === 'admin') return true;

	const denied =
		role === 'support' ? ['/admin/users'] : ['/admin', '/receiving', '/stock', '/disposals'];

	if (denied.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
		return false;
	}

	return true;
}

export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	return parts
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}
