import { Navigate, Outlet, Route, Routes } from 'react-router';
import Sidebar from './components/Sidebar';
import ComingSoon from './pages/ComingSoon';
import EventsPage from './pages/EventsPage';

// The window never scrolls: the sidebar is locked in place and only the content
// column scrolls, edge to edge, without overscroll bounce.
function DashboardLayout() {
	return (
		<div className="flex h-dvh overflow-hidden">
			<div className="shrink-0 py-6 pr-3 pl-6">
				<Sidebar />
			</div>
			<main className="min-w-0 flex-1 overflow-y-auto overscroll-none py-6 pr-6">
				<Outlet />
			</main>
		</div>
	);
}

export default function App() {
	return (
		<Routes>
			<Route element={<DashboardLayout />}>
				<Route index element={<Navigate to="/events" replace />} />
				<Route path="events" element={<EventsPage />} />
				<Route path="organisers" element={<ComingSoon title="Organisers" />} />
				<Route path="analytics" element={<ComingSoon title="Analytics" />} />
				<Route path="*" element={<Navigate to="/events" replace />} />
			</Route>
		</Routes>
	);
}
