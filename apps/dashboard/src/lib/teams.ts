// Teams from Firestore (teams/{teamId}). Every organiser reads every team's name, for menus;
// only super admins change them (firestore.rules). RequireOrganiser (App.tsx) keeps the
// listener open while the dashboard is showing, so allTeams() has them outside React too.
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { liveStore } from './live';

export interface Team {
	id: string;
	name: string;
	slug: string;
	/** Walk-in tickets count up from here: GDGWALKIN0001, GDGWALKIN0002, … */
	walkInTicketPrefix: string;
	globalAccess?: boolean;
}

/** New teams' walk-in tickets: the link's first word, GDG for gdg-sydney. */
function defaultPrefix(slug: string) {
	return `${slug.split('-')[0].toUpperCase().slice(0, 14)}WALKIN`;
}

const store = liveStore<Team[]>((_key, emit, fail) =>
	onSnapshot(
		collection(db, 'teams'),
		(snap) =>
			emit(
				snap.docs
					.map((d) => {
						const data = d.data();
						return {
							id: d.id,
							name: data.name,
							slug: data.slug,
							walkInTicketPrefix: data.walkInTicketPrefix ?? defaultPrefix(data.slug),
							...(data.globalAccess !== undefined && { globalAccess: data.globalAccess }),
						};
					})
					.sort((a, b) => a.name.localeCompare(b.name)),
			),
		fail,
	),
);

/** Every team, by name; undefined while loading. Only organisers can read them. */
export function useTeams(listen = true) {
	return store.use(listen ? 'all' : null);
}

/** The teams already loaded, for code outside components. */
export function allTeams() {
	return store.peek('all') ?? [];
}

export const teamName = (teams: Team[] | undefined, teamId: string | null) =>
	teamId === null ? 'All teams' : (teams?.find((t) => t.id === teamId)?.name ?? 'Unknown team');

/** A new team's document, so its members can be added in the same write. */
export const newTeamRef = () => doc(collection(db, 'teams'));

/** The fields to save for a new or changed team; keeps an existing team's walk-in prefix. */
export function teamData(existing: Team | null, team: Pick<Team, 'name' | 'slug'>) {
	return {
		name: team.name,
		slug: team.slug,
		walkInTicketPrefix: existing?.walkInTicketPrefix ?? defaultPrefix(team.slug),
		...(existing?.globalAccess !== undefined && { globalAccess: existing.globalAccess }),
	};
}
