import { useEffect, useState } from "react";

/** Live result of a CSS media query. False during SSR and the first render. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Tailwind `lg` breakpoint — where the app sidebar is always visible. */
export const DESKTOP_QUERY = "(min-width: 1024px)";
