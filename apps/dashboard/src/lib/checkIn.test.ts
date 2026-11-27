import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addWalkInAndCheckIn, checkIn, findAttendee, fullName, initials, looksLikeEmail, removeWalkIn, safely, undoCheckIn } from './checkIn';
import type { DashboardEvent } from './events';
import { reportError } from './errorTracking';
import { addWalkIn, removeAttendee, setCheckedIn, type RosterAttendee } from './roster';
import { showToast } from './toast';

vi.mock('./roster', () => ({ addWalkIn: vi.fn(), removeAttendee: vi.fn(), setCheckedIn: vi.fn() }));
vi.mock('./toast', () => ({ showToast: vi.fn() }));
vi.mock('./errorTracking', () => ({ reportError: vi.fn() }));

const person = (overrides: Partial<RosterAttendee> = {}): RosterAttendee => ({
	id: 'T1',
	ticket: 'T1',
	firstName: 'Ada',
	lastName: 'Lovelace',
	email: 'ada@example.com',
	checkedInAt: null,
	walkIn: false,
	...overrides,
});

const event = { id: 'event-1' } as DashboardEvent;
const offline = Object.assign(new Error('offline'), { code: 'unavailable' });

beforeEach(() => vi.clearAllMocks());

describe('fullName', () => {
	it('joins first and last names', () => expect(fullName(person())).toBe('Ada Lovelace'));
	it('leaves no stray space when a name is missing', () => {
		expect(fullName(person({ lastName: '' }))).toBe('Ada');
		expect(fullName(person({ firstName: '' }))).toBe('Lovelace');
		expect(fullName(person({ firstName: '', lastName: '' }))).toBe('');
	});
});

describe('initials', () => {
	it('takes the first letter of each name, in capitals', () => expect(initials(person({ firstName: 'ada', lastName: 'lovelace' }))).toBe('AL'));
	it('copes with missing names', () => {
		expect(initials(person({ lastName: '' }))).toBe('A');
		expect(initials(person({ firstName: '', lastName: '' }))).toBe('');
	});
});

describe('findAttendee', () => {
	const roster = [person(), person({ id: 'BEVY-42', ticket: 'BEVY-42', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' }), person({ id: 'X', ticket: null, email: 'noticket@example.com' })];

	it('matches an email ignoring case and surrounding spaces', () => expect(findAttendee(roster, '  GRACE@Example.com ')?.firstName).toBe('Grace'));
	it('matches a ticket number ignoring case', () => expect(findAttendee(roster, 'bevy-42')?.email).toBe('grace@example.com'));
	it('finds people without a ticket by email', () => expect(findAttendee(roster, 'noticket@example.com')?.id).toBe('X'));
	it('needs an exact match', () => expect(findAttendee(roster, 'grace')).toBeUndefined());
	it('finds nobody for an empty or blank query', () => {
		expect(findAttendee(roster, '')).toBeUndefined();
		expect(findAttendee(roster, '   ')).toBeUndefined();
	});
});

describe('looksLikeEmail', () => {
	it.each(['ada@example.com', '  ada@example.com  ', 'a.b+c@sub.example.co'])('accepts %j', (text) => expect(looksLikeEmail(text)).toBe(true));
	it.each(['', 'ada', 'ada@example', '@example.com', 'ada lovelace@example.com', 'ada@@example.com'])('rejects %j', (text) => expect(looksLikeEmail(text)).toBe(false));
});

describe('safely', () => {
	it('resolves to what the action gives, with no toast or report', async () => {
		await expect(safely(async () => 'ticket', 'Failed')).resolves.toBe('ticket');
		expect(showToast).not.toHaveBeenCalled();
		expect(reportError).not.toHaveBeenCalled();
	});

	it('says so and reports the error when the action fails', async () => {
		const error = new Error('permission-denied');
		await expect(safely(() => Promise.reject(error), 'Failed')).resolves.toBeUndefined();
		expect(showToast).toHaveBeenCalledWith('Failed');
		expect(reportError).toHaveBeenCalledWith(error);
	});

	it('catches an action that throws before returning a promise', async () => {
		await expect(
			safely(() => {
				throw new Error('sync');
			}, 'Failed'),
		).resolves.toBeUndefined();
		expect(showToast).toHaveBeenCalledWith('Failed');
	});

	it('doesn’t report being offline', async () => {
		await safely(() => Promise.reject(offline), 'Failed');
		expect(showToast).toHaveBeenCalledWith('Failed');
		expect(reportError).not.toHaveBeenCalled();
	});
});

describe('checkIn', () => {
	it('confirms at once with Undo, which undoes the check-in', async () => {
		vi.mocked(setCheckedIn).mockResolvedValue(undefined);
		checkIn(event, person());
		expect(setCheckedIn).toHaveBeenCalledWith(event, 'T1', true);
		expect(showToast).toHaveBeenCalledWith('Ada Lovelace checked in', expect.objectContaining({ label: 'Undo' }));

		vi.mocked(showToast).mock.calls[0][1]!.onClick();
		expect(setCheckedIn).toHaveBeenLastCalledWith(event, 'T1', false);
	});

	it('replaces the confirmation with the failure when the save is turned down', async () => {
		const error = new Error('permission-denied');
		vi.mocked(setCheckedIn).mockRejectedValue(error);
		checkIn(event, person());
		await vi.waitFor(() => expect(showToast).toHaveBeenCalledTimes(2));
		expect(vi.mocked(showToast).mock.calls.map(([message]) => message)).toEqual(['Ada Lovelace checked in', 'Couldn’t check Ada Lovelace in. Try again.']);
		expect(reportError).toHaveBeenCalledWith(error);
	});
});

describe('undoCheckIn', () => {
	it('says so when the undo fails', async () => {
		vi.mocked(setCheckedIn).mockRejectedValue(new Error('nope'));
		undoCheckIn(event, person());
		await vi.waitFor(() => expect(showToast).toHaveBeenCalledWith('Couldn’t undo Ada Lovelace’s check-in. Try again.'));
	});
});

describe('removeWalkIn', () => {
	it('says so when the removal fails', async () => {
		vi.mocked(removeAttendee).mockRejectedValue(new Error('nope'));
		removeWalkIn(event, person());
		expect(showToast).toHaveBeenCalledWith('Ada Lovelace removed');
		await vi.waitFor(() => expect(showToast).toHaveBeenLastCalledWith('Couldn’t remove Ada Lovelace. Try again.'));
	});
});

describe('addWalkInAndCheckIn', () => {
	const walkIn = { firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' };

	it('confirms once saved, and Undo removes the new ticket', async () => {
		vi.mocked(addWalkIn).mockResolvedValue('CPWALKIN0001');
		vi.mocked(removeAttendee).mockResolvedValue(undefined);
		await addWalkInAndCheckIn(event, walkIn);
		expect(showToast).toHaveBeenCalledOnce();
		expect(showToast).toHaveBeenCalledWith('Grace Hopper checked in', expect.objectContaining({ label: 'Undo' }));

		vi.mocked(showToast).mock.calls[0][1]!.onClick();
		expect(removeAttendee).toHaveBeenCalledWith(event, 'CPWALKIN0001');
	});

	it('shows only the failure when it can’t be added', async () => {
		vi.mocked(addWalkIn).mockRejectedValue(offline);
		await addWalkInAndCheckIn(event, walkIn);
		expect(showToast).toHaveBeenCalledOnce();
		expect(showToast).toHaveBeenCalledWith('Couldn’t add Grace Hopper. Check the connection and try again.');
	});
});
