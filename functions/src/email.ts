// Checkpad's emails, sent through Resend from checkpad.app. Each is a Resend template, kept in
// functions/emails/ and published with the Resend CLI, and sent by ID with its variables (the
// names must match the template's {{{PLACEHOLDERS}}} exactly). Change a template's HTML there,
// then publish the new version to Resend:
//   npx resend-cli@latest templates update <id> --html-file functions/emails/<name>.html --text-file …
//   npx resend-cli@latest templates publish <id>
//
// The emulators never send: emails go to emulatorOutbox in Firestore, for the tests to read.
import { setTimeout as sleep } from 'node:timers/promises';
import type { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { Resend } from 'resend';

/** A sending-only Resend key, limited to checkpad.app. */
export const resendApiKey = defineSecret('RESEND_API_KEY');

const TEMPLATE_IDS = {
	'sign-in': '55f20e5c-39dc-4f6d-b441-5dfb0a533835',
	invite: '429a2401-57d7-4ad2-91e6-0eef0d6e8ee2',
};

interface TemplateVariables {
	/** functions/emails/sign-in.html */
	'sign-in': { ADDRESS: string; LINK: string };
	/** functions/emails/invite.html */
	invite: { INVITER: string; ROLE: string; ACCESS: string; ADDRESS: string; LINK: string };
}

export type TemplateName = keyof TemplateVariables;

export interface Email<T extends TemplateName = TemplateName> {
	to: string;
	template: T;
	variables: TemplateVariables[T];
	/** The same key for every try at one email, so a retry never sends it twice. */
	idempotencyKey: string;
}

export type Mailer = <T extends TemplateName>(email: Email<T>) => Promise<void>;

const RETRIES = 3;

/**
 * Sends through Resend. Network errors, 5xx and 429 are retried with backoff under the same
 * idempotency key; other errors (a bad template variable, say) aren't, since they'd fail again.
 * The SDK returns errors rather than throwing them.
 */
function resendMailer(apiKey: string): Mailer {
	const resend = new Resend(apiKey);
	return async ({ to, template, variables, idempotencyKey }) => {
		for (let attempt = 0; ; attempt++) {
			const { data, error } = await resend.emails.send(
				{ to, template: { id: TEMPLATE_IDS[template], variables: { ...variables } } },
				{ idempotencyKey },
			);
			if (data) return void logger.info('Email sent', { template, id: data.id });
			const retry = error.statusCode === null || error.statusCode === 429 || error.statusCode >= 500;
			if (!retry || attempt === RETRIES) throw new Error(`Resend refused the ${template} email: ${error.name}: ${error.message}`);
			await sleep(500 * 2 ** attempt);
		}
	};
}

/** In the emulators: records the email in emulatorOutbox/{idempotencyKey} instead of sending it. */
function outboxMailer(db: Firestore): Mailer {
	return async (email) => {
		logger.info('Email not sent (emulator)', email);
		await db.collection('emulatorOutbox').doc(email.idempotencyKey.replaceAll('/', '-')).set({ ...email, at: new Date() });
	};
}

/** The mailer for this environment. Call it while handling a request: the key is read then. */
export function mailer(db: Firestore): Mailer {
	return process.env.FUNCTIONS_EMULATOR === 'true' ? outboxMailer(db) : resendMailer(resendApiKey.value());
}
