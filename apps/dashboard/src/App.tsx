import { Navigate, Outlet, Route, Routes } from 'react-router';
import Sidebar from './components/Sidebar';
import ComingSoon from './pages/ComingSoon';
import EventsPage from './pages/EventsPage';

function DashboardLayout() {
	return (
		<div className="flex h-dvh gap-3 p-6">
			<Sidebar />
			<main className="min-w-0 flex-1">
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
