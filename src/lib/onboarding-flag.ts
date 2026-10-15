/** Set by /onboarding when sign-up finishes; read once by the welcome pop-up. */
const JUST_ONBOARDED_KEY = "trove:just-onboarded";

export function markJustOnboarded() {
  try {
    sessionStorage.setItem(JUST_ONBOARDED_KEY, "1");
  } catch {
    /* storage blocked — the persistent banner still covers it */
  }
}

/** Returns true once after onboarding, then clears the flag. */
export function takeJustOnboarded(): boolean {
  try {
    const flag = sessionStorage.getItem(JUST_ONBOARDED_KEY) === "1";
    if (flag) sessionStorage.removeItem(JUST_ONBOARDED_KEY);
    return flag;
  } catch {
    return false;
  }
}
