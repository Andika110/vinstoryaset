import type { Snippet } from 'svelte';

export type ListColumn<T> = {
	key: string;
	label: string;
	render?: Snippet<[T]>;
	align?: 'left' | 'center' | 'right';
	class?: string;
	mobile?: boolean;
	mobilePrimary?: boolean;
};

export type SearchFilterOption = {
	value: string;
	label: string;
};

export type SearchFilterConfig = {
	name: string;
	label: string;
	value: string;
	options: SearchFilterOption[];
	type?: 'select' | 'date';
};

export type ListResult<T> = {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
};
