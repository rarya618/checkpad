import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router';
import Sidebar, { type SidebarItem } from './components/Sidebar';
import Toaster from './components/Toaster';
import { renamedSlug, useEvent } from './lib/events';
import AttendeesPage from './pages/AttendeesPage';
import ComingSoon from './pages/ComingSoon';
import EventSettingsRoute from './pages/EventSettingsPage';
import EventsPage from './pages/EventsPage';
import NewEventPage from './pages/NewEventPage';

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
			<div className="relative min-w-0 flex-1">
				{/* No top padding here: page headers carry it so they can stick flush to the top */}
				<main className="h-full overflow-y-auto overscroll-none pr-6 pb-6">
					<Outlet />
				</main>
				<Toaster />
			</div>
		</div>
	);
}

// Inside an event the sidebar switches to that event's menu (Figma "Event view").
function EventLayout() {
	const { slug } = useParams();
	const { pathname } = useLocation();
	// Reactive: a deleted event leaves its pages, and one saved under a new link takes the page with it
	const event = useEvent(slug);
	if (!event) {
		const moved = renamedSlug(slug);
		return <Navigate to={moved ? pathname.replace(`/events/${slug}`, `/events/${moved}`) : '/events'} replace />;
	}
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
				<Route path="events/new" element={<NewEventPage />} />
				<Route path="organisers" element={<ComingSoon title="Organisers" />} />
				<Route path="analytics" element={<ComingSoon title="Analytics" />} />
			</Route>
			<Route path="events/:slug" element={<EventLayout />}>
				<Route index element={<AttendeesPage />} />
				<Route path="check-in" element={<ComingSoon title="Check in" />} />
				<Route path="analytics" element={<ComingSoon title="Analytics" />} />
				<Route path="settings" element={<EventSettingsRoute />} />
			</Route>
			<Route path="*" element={<Navigate to="/events" replace />} />
		</Routes>
	);
}
