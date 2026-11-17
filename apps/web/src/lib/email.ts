// The email field's check on the check-in page, before anything is sent. Same pattern as the API.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What's wrong with a typed email, or null. */
export function validateEmail(email: string) {
	if (!email.trim()) return 'Enter your email address';
	if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a full email address, like jane@example.com';
	return null;
}
