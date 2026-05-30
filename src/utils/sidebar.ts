export interface SidebarLink {
	type: 'link';
	isCurrent: boolean;
}

export interface SidebarGroup {
	type: 'group';
	collapsed: boolean;
	entries: SidebarEntry[];
}

export type SidebarEntry = SidebarLink | SidebarGroup;

export function flattenSidebar(sidebar: SidebarEntry[]): SidebarLink[] {
	return sidebar.flatMap((entry) =>
		entry.type === 'group' ? flattenSidebar(entry.entries) : entry
	);
}

export function isGroupOpen(entry: SidebarGroup): boolean {
	return !entry.collapsed || flattenSidebar(entry.entries).some((link) => link.isCurrent);
}
