// Countries a team can meet in, each with the time zones its events can use. A team's country
// picks the time zone new events start with: the first one listed, the country's largest city.
// Only the dashboard reads this list. The functions can't import it at runtime, so the API and
// the rules only check that a country is two capital letters; an unknown one falls back to
// DEFAULT_TIME_ZONE. To add a country, add it here by name; codes are ISO 3166-1 alpha-2.

export interface TimeZone {
	/** IANA ID: "Australia/Sydney". */
	id: string;
	/** Shown in menus: "Sydney". */
	city: string;
}

export interface Country {
	code: string;
	name: string;
	/** The first is the default for new events. */
	timeZones: TimeZone[];
}

export const countries: Country[] = [
	{
		code: 'AU',
		name: 'Australia',
		timeZones: [
			{ id: 'Australia/Sydney', city: 'Sydney' },
			{ id: 'Australia/Melbourne', city: 'Melbourne' },
			{ id: 'Australia/Brisbane', city: 'Brisbane' },
			{ id: 'Australia/Perth', city: 'Perth' },
			{ id: 'Australia/Adelaide', city: 'Adelaide' },
			{ id: 'Australia/Hobart', city: 'Hobart' },
			{ id: 'Australia/Darwin', city: 'Darwin' },
		],
	},
	{ code: 'BR', name: 'Brazil', timeZones: [{ id: 'America/Sao_Paulo', city: 'São Paulo' }, { id: 'America/Manaus', city: 'Manaus' }] },
	{
		code: 'CA',
		name: 'Canada',
		timeZones: [
			{ id: 'America/Toronto', city: 'Toronto' },
			{ id: 'America/Vancouver', city: 'Vancouver' },
			{ id: 'America/Edmonton', city: 'Calgary' },
			{ id: 'America/Winnipeg', city: 'Winnipeg' },
			{ id: 'America/Halifax', city: 'Halifax' },
		],
	},
	{ code: 'FR', name: 'France', timeZones: [{ id: 'Europe/Paris', city: 'Paris' }] },
	{ code: 'DE', name: 'Germany', timeZones: [{ id: 'Europe/Berlin', city: 'Berlin' }] },
	{ code: 'HK', name: 'Hong Kong', timeZones: [{ id: 'Asia/Hong_Kong', city: 'Hong Kong' }] },
	{ code: 'IN', name: 'India', timeZones: [{ id: 'Asia/Kolkata', city: 'India' }] },
	{
		code: 'ID',
		name: 'Indonesia',
		timeZones: [
			{ id: 'Asia/Jakarta', city: 'Jakarta' },
			{ id: 'Asia/Makassar', city: 'Bali' },
			{ id: 'Asia/Jayapura', city: 'Jayapura' },
		],
	},
	{ code: 'IE', name: 'Ireland', timeZones: [{ id: 'Europe/Dublin', city: 'Dublin' }] },
	{ code: 'JP', name: 'Japan', timeZones: [{ id: 'Asia/Tokyo', city: 'Tokyo' }] },
	{ code: 'KE', name: 'Kenya', timeZones: [{ id: 'Africa/Nairobi', city: 'Nairobi' }] },
	{ code: 'MY', name: 'Malaysia', timeZones: [{ id: 'Asia/Kuala_Lumpur', city: 'Kuala Lumpur' }] },
	{ code: 'NL', name: 'Netherlands', timeZones: [{ id: 'Europe/Amsterdam', city: 'Amsterdam' }] },
	{ code: 'NZ', name: 'New Zealand', timeZones: [{ id: 'Pacific/Auckland', city: 'Auckland' }] },
	{ code: 'NG', name: 'Nigeria', timeZones: [{ id: 'Africa/Lagos', city: 'Lagos' }] },
	{ code: 'PH', name: 'Philippines', timeZones: [{ id: 'Asia/Manila', city: 'Manila' }] },
	{ code: 'SG', name: 'Singapore', timeZones: [{ id: 'Asia/Singapore', city: 'Singapore' }] },
	{ code: 'ZA', name: 'South Africa', timeZones: [{ id: 'Africa/Johannesburg', city: 'Johannesburg' }] },
	{ code: 'KR', name: 'South Korea', timeZones: [{ id: 'Asia/Seoul', city: 'Seoul' }] },
	{ code: 'ES', name: 'Spain', timeZones: [{ id: 'Europe/Madrid', city: 'Madrid' }] },
	{ code: 'TW', name: 'Taiwan', timeZones: [{ id: 'Asia/Taipei', city: 'Taipei' }] },
	{ code: 'TH', name: 'Thailand', timeZones: [{ id: 'Asia/Bangkok', city: 'Bangkok' }] },
	{ code: 'AE', name: 'United Arab Emirates', timeZones: [{ id: 'Asia/Dubai', city: 'Dubai' }] },
	{ code: 'GB', name: 'United Kingdom', timeZones: [{ id: 'Europe/London', city: 'London' }] },
	{
		code: 'US',
		name: 'United States',
		timeZones: [
			{ id: 'America/New_York', city: 'New York' },
			{ id: 'America/Chicago', city: 'Chicago' },
			{ id: 'America/Denver', city: 'Denver' },
			{ id: 'America/Phoenix', city: 'Phoenix' },
			{ id: 'America/Los_Angeles', city: 'Los Angeles' },
			{ id: 'America/Anchorage', city: 'Anchorage' },
			{ id: 'Pacific/Honolulu', city: 'Honolulu' },
		],
	},
	{ code: 'VN', name: 'Vietnam', timeZones: [{ id: 'Asia/Ho_Chi_Minh', city: 'Ho Chi Minh City' }] },
];

/** For teams from before teams had a country: Sydney, where Checkpad began. */
export const DEFAULT_TIME_ZONE = 'Australia/Sydney';

export const findCountry = (code: string | undefined) => countries.find((c) => c.code === code);

/** The time zone a team's new events start in. */
export const defaultTimeZone = (countryCode: string | undefined) => findCountry(countryCode)?.timeZones[0].id ?? DEFAULT_TIME_ZONE;
