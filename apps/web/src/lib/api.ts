// Client for the check-in API (functions/), served on this site at /api through a Hosting
// rewrite. In development, astro.config.mjs proxies /api to the Functions emulator.
import type { ApiError, ApiErrorCode, CheckInResponse, PublicEvent, TeamTarget, WalkInResponse } from '@checkpad/shared/api';

/** An event or team link: what the API's routes accept. */
export const SLUG_PATTERN = /^[a-z0-9-]+$/;

/** A refusal from the API, or 'network' when it couldn't be reached or answered garbage. */
export class ApiFailure extends Error {
	constructor(readonly code: ApiErrorCode | 'network') {
		super(code);
	}
}

async function request<T>(path: string, body?: object): Promise<T> {
	let res: Response;
	try {
		res = await fetch(
			`/api${path}`,
			body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined,
		);
	} catch {
		throw new ApiFailure('network');
	}
	const json = await res.json().catch(() => null);
	if (res.ok && json) return json as T;
	throw new ApiFailure((json as ApiError | null)?.error ?? (res.status >= 500 ? 'server' : 'network'));
}

export const getEvent = (slug: string) => request<PublicEvent>(`/events/${slug}`);

export const getTeamTarget = (slug: string) => request<TeamTarget>(`/teams/${slug}`);

export const checkIn = (slug: string, email: string) => request<CheckInResponse>(`/events/${slug}/check-in`, { email });

export const checkInWalkIn = (slug: string, details: { email: string; firstName: string; lastName: string }) =>
	request<WalkInResponse>(`/events/${slug}/walk-in`, details);
