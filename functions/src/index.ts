// Cloud Functions for checkpad-app. Deployed with:
//   npx -y firebase-tools@latest deploy --only functions
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/https';
import { createHandler } from './api.js';

initializeApp();

/**
 * The attendee check-in API (see api.ts for routes). Runs next to Firestore in Sydney.
 * Public, because attendees aren't signed in; the Hosting rewrite serves it at /api.
 * At most 10 instances, so a traffic spike or abuse can't run up the bill.
 */
export const api = onRequest(
	{ region: 'australia-southeast1', invoker: 'public', maxInstances: 10, memory: '256MiB' },
	createHandler(getFirestore()),
);
