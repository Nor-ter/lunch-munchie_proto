/** Keep the administrator allowlist out of source control and D1. */
export function configuredAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  );
}

export function isAdminEmail(email: string | undefined, configured: string | undefined): boolean {
  if (!email) return false;
  return configuredAdminEmails(configured).has(email.trim().toLowerCase());
}
