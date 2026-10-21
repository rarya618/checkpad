// Helpers for the tests and the seed script, which reset the emulators' data. Wiping the
// database runs the triggers (src/triggers.ts) for everything deleted, a moment later, so
// whatever is written next should use new event IDs: the triggers ignore events that are gone.

/** Deletes everything in the Firestore emulator's database for `project`. */
export async function clearFirestore(project: string) {
	const host = process.env.FIRESTORE_EMULATOR_HOST;
	if (!host) throw new Error('FIRESTORE_EMULATOR_HOST is not set: run inside `firebase emulators:exec`');
	await fetch(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' });
}
