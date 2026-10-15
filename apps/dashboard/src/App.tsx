import { Navigate, Outlet, Route, Routes, useParams } from 'react-router';
import Sidebar, { type SidebarItem } from './components/Sidebar';
import { findEvent } from './lib/roster';
import AttendeesPage from './pages/AttendeesPage';
import ComingSoon from './pages/ComingSoon';
import EventsPage from './pages/EventsPage';

const mainItems: SidebarItem[] = [
	{ to: '/events', label: 'Events' },
	{ to: '/organisers', label: 'Organisers' },
	{ to: '/analytics', label: 'Analytics' },
];

// The window never scrolls: the sidebar is locked in place and only the content
// column scrolls, edge to edge, without overscroll bounce.
function DashboardLayout({ items }: { items: SidebarItem[] }) {
	return (
		<div className="flex h-dvh overflow-hidden">
			<div className="shrink-0 py-6 pr-3 pl-6">
				<Sidebar items={items} />
			</div>
			{/* No top padding here: page headers carry it so they can stick flush to the top */}
			<main className="min-w-0 flex-1 overflow-y-auto overscroll-none pr-6 pb-6">
				<Outlet />
			</main>
		</div>
	);
}

// Inside an event the sidebar switches to that event's menu (Figma "Event view").
function EventLayout() {
	const { slug } = useParams();
	if (!findEvent(slug)) return <Navigate to="/events" replace />;
	const base = `/events/${slug}`;
	return (
		<DashboardLayout
			items={[
				{ to: base, label: 'Attendees', end: true },
				{ to: `${base}/check-in`, label: 'Check in' },
				{ to: `${base}/analytics`, label: 'Analytics' },
				{ to: `${base}/settings`, label: 'Settings' },
			]}
		/>
	);
}

export default function App() {
	return (
		<Routes>
			<Route element={<DashboardLayout items={mainItems} />}>
				<Route index element={<Navigate to="/events" replace />} />
				<Route path="events" element={<EventsPage />} />
				<Route path="organisers" element={<ComingSoon title="Organisers" />} />
				<Route path="analytics" element={<ComingSoon title="Analytics" />} />
			</Route>
			<Route path="events/:slug" element={<EventLayout />}>
				<Route index element={<AttendeesPage />} />
				<Route path="check-in" element={<ComingSoon title="Check in" />} />
				<Route path="analytics" element={<ComingSoon title="Analytics" />} />
				<Route path="settings" element={<ComingSoon title="Settings" />} />
			</Route>
			<Route path="*" element={<Navigate to="/events" replace />} />
		</Routes>
	);
}
