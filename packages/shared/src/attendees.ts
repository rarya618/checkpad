export interface Attendee {
	email: string;
	firstName: string;
	lastName: string;
	checkedInAt: Date | null;
	/** Ticket number from Bevy, or CPWALKIN0001… for walk-ins; shown on the confirmation. */
	ticket?: string | null;
}
