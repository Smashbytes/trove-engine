// Turn raw Supabase / Postgres / network errors into copy a host can act on.
// The original error is still logged for debugging.

const RULES: Array<[RegExp, string]> = [
  [/failed to fetch|networkerror|network request failed|load failed/i,
    "We couldn't reach TROVE. Check your connection and try again."],
  [/jwt expired|invalid jwt|refresh token|session.*(expired|missing)/i,
    "Your session has expired. Sign in again to continue."],
  [/row-level security|permission denied|not authori[sz]ed/i,
    "You don't have permission to do that in this workspace."],
  [/duplicate key|already exists|unique constraint/i,
    "Something with these details already exists. Try a different name."],
  [/violates check constraint|invalid input syntax|out of range/i,
    "Some of the details aren't valid. Check prices, dates and capacities and try again."],
  [/violates foreign key/i,
    "This refers to something that no longer exists. Refresh the page and try again."],
  [/rate limit|too many requests/i,
    "Too many attempts. Wait a minute and try again."],
];

// Messages that read like database/driver internals rather than sentences
// written for a person. Anything else (e.g. an RPC's own "This ticket has
// already been checked in") is shown as-is.
const TECHNICAL =
  /relation|column|constraint|syntax|function |PGRST|null value|schema|uuid|operator|duplicate|violates|undefined|TypeError|JSON|status code|fetch/i;
// Postgres SQLSTATE codes such as 23505, 42501, P0001 (case-sensitive).
const SQLSTATE = /\b(?:[0-9]{2}[0-9A-Z]{3}|P0[0-9]{3})\b/;

export function friendlyError(error: unknown, fallback: string): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  console.error("[trove]", fallback, error);
  for (const [pattern, copy] of RULES) {
    if (pattern.test(message)) return copy;
  }
  if (message && message.length <= 160 && !TECHNICAL.test(message) && !SQLSTATE.test(message)) {
    return message;
  }
  return fallback;
}
