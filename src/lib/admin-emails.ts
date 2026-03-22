const DEFAULT_ADMIN_EMAILS = ["randy.tarnowski@gmail.com"];

function getAdminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS;
  if (env) return env.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return DEFAULT_ADMIN_EMAILS;
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}
