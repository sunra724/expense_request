const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_ADMIN_EMAILS = ["sunra724@gmail.com", "soilabcoop@gmail.com"];

export function getAppUrl() {
  return (process.env["NEXT_PUBLIC_APP_URL"] || DEFAULT_APP_URL).replace(/\/+$/, "");
}

export function getAdminEmails() {
  const configuredEmails = (process.env["ADMIN_EMAILS"] || process.env["NEXT_PUBLIC_ADMIN_EMAILS"] || "")
    .split(/[,\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return configuredEmails.length ? configuredEmails : DEFAULT_ADMIN_EMAILS;
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function hasSupabaseAuthEnv() {
  return Boolean(process.env["NEXT_PUBLIC_SUPABASE_URL"] && process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
}

export function hasAdminAuthConfig() {
  return hasSupabaseAuthEnv() && getAdminEmails().length > 0;
}

export function getMissingAuthConfigKeys() {
  const missing: string[] = [];

  if (!process.env["NEXT_PUBLIC_SUPABASE_URL"]) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!getAdminEmails().length) {
    missing.push("ADMIN_EMAILS or NEXT_PUBLIC_ADMIN_EMAILS");
  }

  return missing;
}

export function sanitizeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
