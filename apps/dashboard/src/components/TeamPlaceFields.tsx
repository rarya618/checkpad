import { countries, findCountry } from '@checkpad/shared/countries';
import { timeZoneLabel } from '../lib/eventForm';
import type { Team } from '../lib/teams';
import { SelectField, TextField } from './Field';

export type TeamPlace = Required<Pick<Team, 'country' | 'city' | 'timeZone'>>;

/**
 * Where a team meets: country, city (optional, for the record) and time zone, which new events
 * start in. The time zone menu only shows for a country with more than one. On onboarding
 * (OnboardingPage) the country is `required`; in Manage team it's empty for a team from before
 * teams had one, whose new events start in Sydney time.
 */
export default function TeamPlaceFields({ value, onChange, required = false }: { value: TeamPlace; onChange: (place: TeamPlace) => void; required?: boolean }) {
	const country = findCountry(value.country);
	const zone = country?.timeZones.find((tz) => tz.id === value.timeZone);
	const zoneHint = zone ? `New events start in ${zone.city} time. You can change it on each event.` : null;
	return (
		<>
			<SelectField
				label="Country"
				value={value.country}
				// A new country starts at its largest city's time zone
				onChange={(e) => onChange({ ...value, country: e.target.value, timeZone: findCountry(e.target.value)?.timeZones[0].id ?? '' })}
				hint={country ? (country.timeZones.length === 1 ? zoneHint : null) : required ? null : 'New events start in Sydney time until you choose one.'}
				required={required}
			>
				{!country && <option value="">Choose a country</option>}
				{countries.map((c) => (
					<option key={c.code} value={c.code}>
						{c.name}
					</option>
				))}
			</SelectField>
			<TextField
				label="City (optional)"
				value={value.city}
				onChange={(e) => onChange({ ...value, city: e.target.value })}
				placeholder={zone?.city ?? 'Sydney'}
				maxLength={100}
			/>
			{country && country.timeZones.length > 1 && (
				<SelectField label="Time zone" value={value.timeZone} onChange={(e) => onChange({ ...value, timeZone: e.target.value })} hint={zoneHint}>
					{country.timeZones.map((tz) => (
						<option key={tz.id} value={tz.id}>
							{timeZoneLabel(tz.id)}
						</option>
					))}
				</SelectField>
			)}
		</>
	);
}
