// The password rule Supabase enforces (SHR-L04-06): at least 8 characters with
// a letter and a number. Checked here first so hosts get the message before
// the request, and the server's own wording is turned into the same copy.

export const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

/** Null when the password meets the rule, else what to fix. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return "Password needs at least one letter and one number.";
  }
  return null;
}

/** Supabase sends the same message for a missing and a wrong current password; the code tells them apart. */
export function passwordErrorCopy(message: string, code?: string): string {
  if (code === "current_password_invalid") return "Your current password is wrong.";
  if (code === "current_password_required" || /current password required/i.test(message)) {
    return "Enter your current password.";
  }
  if (
    /should contain at least one character|at least \d+ characters|weak.?password/i.test(message)
  ) {
    return "Password needs at least 8 characters, with a letter and a number.";
  }
  if (/should be different from the old password/i.test(message)) {
    return "Choose a password you haven't used here before.";
  }
  return message;
}
