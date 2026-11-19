import type { ResolvedPathname } from '$app/types';
import type { Role } from '#lib/navigation.js';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Setiap widget dimuat terpisah supaya satu kegagalan tidak menjatuhkan halaman. */
export type Widget<T> = { status: 'ok'; data: T } | { status: 'error'; label?: string };

export type SummaryCardData = {
	label: string;
	value: number;
	href: ResolvedPathname;
	tone?: BadgeTone;
	hint?: string;
};

export type ActivityBadge = {
	label: string;
	tone: BadgeTone;
};

export type ActivityRowData = {
	id: string;
	title: string;
	subtitle?: string;
	meta?: string;
	badge?: ActivityBadge;
	href?: ResolvedPathname;
};

export type DashboardListData = {
	title: string;
	description?: string;
	emptyTitle: string;
	emptyDescription?: string;
	viewHref?: ResolvedPathname;
	viewLabel?: string;
	rows: ActivityRowData[];
};

export type DashboardSection = {
	title: string;
	description?: string;
	cards?: Widget<SummaryCardData[]>;
	lists?: Widget<DashboardListData>[];
};

export type WarningItem = {
	title: string;
	description: string;
	href: ResolvedPathname;
	tone: 'warning' | 'danger';
};

export type QuickAction = {
	label: string;
	href: ResolvedPathname;
	variant?: 'primary' | 'secondary';
};

export type DashboardData = {
	role: Role;
	scopeLabel: string;
	greeting: string;
	warnings: Widget<WarningItem[]>;
	sections: DashboardSection[];
	quickActions: QuickAction[];
};
