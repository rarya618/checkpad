import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './App';
import ErrorPage from './pages/ErrorPage';
import './index.css';

// A data router so pages can block navigation (Event settings asks before leaving
// unsaved changes). App keeps declaring its routes with <Routes>. Anything that fails while
// rendering, such as a Firestore listener the rules refuse, shows ErrorPage.
const router = createBrowserRouter([{ path: '*', element: <App />, errorElement: <ErrorPage /> }]);

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
