/** Pesan baku yang dipakai lintas UI dan service. */
export const MESSAGES = {
	sessionExpired: 'Sesi Anda telah berakhir. Silakan login kembali.',
	noPermission: 'Anda tidak punya akses untuk aksi ini.',
	notFound: 'Data tidak ditemukan.',
	systemError: 'Terjadi kesalahan sistem. Silakan coba lagi beberapa saat lagi.',
	stockInsufficient: (available: number, requested: number) =>
		`Stok tidak mencukupi. Tersedia ${available}, diminta ${requested}.`,
	duplicate: (label: string) => `${label} sudah digunakan.`,
	invalidTransition: (label: string, from: string, to: string) =>
		`Status ${label} tidak dapat berubah dari ${from} ke ${to}.`
} as const;
