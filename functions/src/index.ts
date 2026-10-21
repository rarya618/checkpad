// Cloud Functions for checkpad-app. Deployed with:
//   npx -y firebase-tools@latest deploy --only functions
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentDeleted, onDocumentWritten } from 'firebase-functions/firestore';
import { onRequest } from 'firebase-functions/https';
import { createHandler } from './api.js';
import { cleanUpEvent, countChange } from './triggers.js';

initializeApp();
const db = getFirestore();

/**
 * The attendee check-in API (see api.ts for routes). Runs next to Firestore in Sydney.
 * Public, because attendees aren't signed in; the Hosting rewrite serves it at /api.
 * At most 10 instances, so a traffic spike or abuse can't run up the bill.
 */
export const api = onRequest(
	{ region: 'australia-southeast1', invoker: 'public', maxInstances: 10, memory: '256MiB' },
	createHandler(db),
);

// Next to the database in Sydney. Every check-in runs this, so it's capped like the API.
const trigger = { region: 'australia-southeast1', maxInstances: 10, memory: '256MiB' } as const;

/** Keeps each event's counts in step with its attendees (triggers.ts). */
export const countAttendees = onDocumentWritten({ ...trigger, document: 'events/{eventId}/attendees/{ticket}' }, (event) =>
	countChange(db, { id: event.id, eventId: event.params.eventId, before: event.data?.before.data(), after: event.data?.after.data() }),
);

/** Deletes a deleted event's attendees, prize draw and links (triggers.ts). */
export const cleanUpDeletedEvent = onDocumentDeleted({ ...trigger, document: 'events/{eventId}' }, (event) => cleanUpEvent(db, event.params.eventId));

