import type { PageServerLoad } from './$types';

type DemoAsset = {
	code: string;
	name: string;
	location: string;
	status: string;
	condition: string;
	updatedAt: string;
};

const statuses = ['Available', 'In Use', 'On Loan', 'Under Maintenance', 'Damaged', 'Disposed'];
const locations = ['Head Office', 'Union Outlet A', 'Union Outlet B'];
const conditions = ['Baik', 'Cukup', 'Rusak'];

const demoAssets: DemoAsset[] = Array.from({ length: 57 }, (_, index) => {
	const number = index + 1;
	return {
		code: `LPT-${String(number).padStart(4, '0')}`,
		name: `Laptop Demo ${number}`,
		location: locations[index % locations.length],
		status: statuses[index % statuses.length],
		condition: conditions[index % conditions.length],
		updatedAt: `2026-11-${String((index % 28) + 1).padStart(2, '0')}`
	};
});

export const load: PageServerLoad = ({ url }) => {
	const search = (url.searchParams.get('search') ?? '').trim();
	const status = url.searchParams.get('status') ?? '';
	const demo = url.searchParams.get('demo') ?? '';
	const requestedPageSize = Number(url.searchParams.get('pageSize') ?? 10);
	const pageSize = Math.min(
		50,
		Math.max(5, Number.isFinite(requestedPageSize) ? requestedPageSize : 10)
	);
	const requestedPage = Number(url.searchParams.get('page') ?? 1);

	let filtered = demoAssets;

	if (search) {
		const normalized = search.toLowerCase();
		filtered = filtered.filter(
			(asset) =>
				asset.code.toLowerCase().includes(normalized) ||
				asset.name.toLowerCase().includes(normalized)
		);
	}

	if (status) {
		filtered = filtered.filter((asset) => asset.status === status);
	}

	if (demo === 'empty') {
		filtered = [];
	}

	const total = filtered.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(
		Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
		totalPages
	);
	const items = filtered.slice((page - 1) * pageSize, page * pageSize);

	return {
		items,
		page,
		pageSize,
		total,
		search,
		status,
		demo,
		statusOptions: statuses
	};
};
