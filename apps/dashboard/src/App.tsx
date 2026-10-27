import type { ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router';
import Loading, { LoadingSteps } from './components/Loading';
import MobileNav, { type MobileNavConfig } from './components/MobileNav';
import Sidebar, { type SidebarItem } from './components/Sidebar';
import Toaster from './components/Toaster';
import { useSession } from './lib/auth';
import { useEvent, useEventsFor, useRenamedSlug } from './lib/events';
import { useRosterLoading } from './lib/roster';
import { needsTeam, useCanEditEvents, useCurrentOrganiser, useMe } from './lib/organisers';
import { useTeams } from './lib/teams';
import { useIsDesktop } from './lib/useMediaQuery';
import AnalyticsPage from './pages/AnalyticsPage';
import AttendeesPage from './pages/AttendeesPage';
import CheckInPage from './pages/CheckInPage';
import EventAnalyticsPage from './pages/EventAnalyticsPage';
import EventSettingsRoute from './pages/EventSettingsPage';
import EventsPage from './pages/EventsPage';
import NewEventPage from './pages/NewEventPage';
import OnboardingPage from './pages/OnboardingPage';
import OrganisersPage from './pages/OrganisersPage';
import PrizeDrawPage from './pages/PrizeDrawPage';
import { CheckEmailPage, NoAccessPage, SignInLinkPage, SignInPage } from './pages/SignInPages';
import VenueDisplayPage from './pages/VenueDisplayPage';
import WaitlistPage from './pages/WaitlistPage';

const mainItems: SidebarItem[] = [
	{ to: '/events', label: 'Events' },
	{ to: '/organisers', label: 'Organisers' },
	{ to: '/analytics', label: 'Analytics' },
];
const adminItems: SidebarItem[] = [...mainItems, { to: '/waitlist', label: 'Waitlist' }];

// The window never scrolls: the sidebar is locked in place and only the content
// column scrolls, edge to edge, without overscroll bounce. Phones get a top bar and
// a slide-in menu instead, and the page scrolls normally.
function DashboardLayout({ items, mobile }: { items: SidebarItem[]; mobile: MobileNavConfig }) {
	const desktop = useIsDesktop();
	if (!desktop) {
		return (
			<div className="min-h-dvh">
				<MobileNav {...mobile} />
				<main>
					<Outlet />
				</main>
				<div className="fixed inset-x-0 bottom-0">
					<Toaster />
				</div>
			</div>
		);
	}
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
	const moved = useRenamedSlug(event ? undefined : slug);
	// Every page here lists or counts the attendees: load them first, so none shows an empty list
	const roster = useRosterLoading(slug ?? '');
	const canEdit = useCanEditEvents();
	if (!event) {
		if (moved === undefined) return <Loading />;
		return <Navigate to={moved ? pathname.replace(`/events/${slug}`, `/events/${moved}`) : '/events'} replace />;
	}
	if (!roster) return <Loading />;
	const base = `/events/${slug}`;
	const attendees = { to: base, label: 'Attendees', end: true };
	const checkIn = { to: `${base}/check-in`, label: 'Check in' };
	const settings = { to: `${base}/settings`, label: 'Settings' };
	return (
		<DashboardLayout
			items={[attendees, checkIn, { to: `${base}/analytics`, label: 'Analytics' }, ...(canEdit ? [settings] : [])]}
			// Figma "Staff check in (mobile) – menu": no Analytics on phones
			mobile={{
				title: event.name,
				items: [attendees, checkIn, ...(canEdit ? [settings] : [])],
				extras: [
					{ label: 'All events', to: '/events' },
					{ label: 'Open prize draw', href: `${base}/prize-draw` },
				],
			}}
		/>
	);
}

// The main menu, with the waitlist for super admins. The main menu on phones isn't designed;
// it reuses the sidebar's items.
function MainLayout() {
	const items = useMe().role === 'super-admin' ? adminItems : mainItems;
	return <DashboardLayout items={items} mobile={{ title: 'Menu', items, extras: [] }} />;
}

/** Super admins only: anyone else who opens the page (from a bookmark, say) goes to Events. */
function ForSuperAdmins({ children }: { children: ReactNode }) {
	return useMe().role === 'super-admin' ? children : <Navigate to="/events" replace />;
}

// Creating and editing events is for organisers and super admins: a team member who opens one
// of these pages (from a bookmark, say) goes back to where they can work.
function ForEditors({ children, back }: { children: ReactNode; back: string }) {
	return useCanEditEvents() ? children : <Navigate to={back} relative="path" replace />;
}

// Every dashboard page and display needs a signed-in organiser (docs/migration-plan.md).
// Waits for the teams and events too, so pages can show them straight away. An organiser
// invited to start a new team sets it up first, whatever page they opened; once it's saved,
// that page shows.
function RequireOrganiser() {
	const session = useSession();
	const me = useCurrentOrganiser();
	const teams = useTeams(Boolean(me));
	const events = useEventsFor(me);
	const { pathname, search } = useLocation();
	if (session === null) return <Navigate to={`/sign-in?${new URLSearchParams({ next: pathname + search })}`} replace />;
	if (me === null) return <Navigate to="/no-access" replace />;
	const loading = (
		<LoadingSteps
			steps={[
				{ label: 'Signing you in', done: Boolean(session) },
				{ label: 'Checking your access', done: Boolean(me) },
				{ label: 'Loading teams', done: Boolean(teams) },
				{ label: 'Loading events', done: Boolean(events) },
			]}
		/>
	);
	if (!me || !teams) return loading;
	if (needsTeam(me)) return <OnboardingPage />;
	if (!events) return loading;
	return <Outlet />;
}

export default function App() {
	return (
		<Routes>
			<Route path="sign-in" element={<SignInPage />} />
			<Route path="sign-in/check-email" element={<CheckEmailPage />} />
			<Route path="sign-in/link" element={<SignInLinkPage />} />
			<Route path="no-access" element={<NoAccessPage />} />
			<Route element={<RequireOrganiser />}>
				<Route element={<MainLayout />}>
					<Route index element={<Navigate to="/events" replace />} />
					<Route path="events" element={<EventsPage />} />
					<Route
						path="events/new"
						element={
							<ForEditors back="/events">
								<NewEventPage />
							</ForEditors>
						}
					/>
					<Route path="organisers" element={<OrganisersPage />} />
					<Route path="analytics" element={<AnalyticsPage />} />
					<Route
						path="waitlist"
						element={
							<ForSuperAdmins>
								<WaitlistPage />
							</ForSuperAdmins>
						}
					/>
				</Route>
				{/* Full screen, no sidebar: shown on the venue's projector */}
				<Route path="events/:slug/display" element={<VenueDisplayPage />} />
				<Route path="events/:slug/prize-draw" element={<PrizeDrawPage />} />
				<Route path="events/:slug" element={<EventLayout />}>
					<Route index element={<AttendeesPage />} />
					<Route path="check-in" element={<CheckInPage />} />
					<Route path="analytics" element={<EventAnalyticsPage />} />
					<Route
						path="settings"
						element={
							<ForEditors back="..">
								<EventSettingsRoute />
							</ForEditors>
						}
					/>
				</Route>
			</Route>
			<Route path="*" element={<Navigate to="/events" replace />} />
		</Routes>
	);
}
