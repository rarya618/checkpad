import './lib/errorTracking';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './App';
import ErrorPage from './pages/ErrorPage';
import './index.css';

// A deploy replaces every file, so a tab opened before it can't load the pages it hasn't opened
// yet (Hosting answers with index.html). Reload once to pick up the new version. Only once a
// minute, so a page that fails for another reason, like being offline, doesn't reload forever.
window.addEventListener('vite:preloadError', (event) => {
	try {
		const last = Number(sessionStorage.getItem('reloaded-for-deploy'));
		if (Date.now() - last < 60_000) return;
		sessionStorage.setItem('reloaded-for-deploy', String(Date.now()));
	} catch {
		// Storage blocked: reload anyway
	}
	event.preventDefault();
	location.reload();
});

// A data router so pages can block navigation (Event settings asks before leaving
// unsaved changes). App keeps declaring its routes with <Routes>. Anything that fails while
// rendering, such as a Firestore listener the rules refuse, shows ErrorPage.
const router = createBrowserRouter([{ path: '*', element: <App />, errorElement: <ErrorPage /> }]);

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
