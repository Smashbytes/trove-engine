// PostHog product analytics — wired per the published Privacy Policy
// (welovetrove.co.za/legal/privacy): legal basis is legitimate interest with
// anonymised events, and hosts can switch it off in Settings → Privacy & data.
// We never call posthog.identify() — events stay anonymous — and the opt-out
// persists locally. Events are tagged app:"engine" so the shared PostHog
// project segments cleanly across the website, guest app and engine.
//
// The SDK is loaded with a dynamic import so it isn't part of the entry bundle
// every visitor downloads before the page can render.
import type { PostHog } from "posthog-js";
import type { AnyRouter } from "@tanstack/react-router";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://eu.i.posthog.com";
const STORAGE_KEY = "trove-engine:analytics";

/** Resolves to the initialised client; null until init() has been called. */
let client: Promise<PostHog> | null = null;

function loaded(ph: PostHog): boolean {
  return (ph as unknown as { __loaded?: boolean }).__loaded === true;
}

function init(): Promise<PostHog> | null {
  if (!KEY || typeof window === "undefined") return null;
  if (client) return client;
  client = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // captured on router resolution instead
      capture_pageleave: true,
      person_profiles: "identified_only", // never identified → stays anonymous
      autocapture: false, // pageviews + explicit events only
      loaded: (ph) => {
        // Honour the host's choice, including one made while the SDK was
        // still downloading, and clear a stale SDK opt-out if they re-enabled.
        if (!isAnalyticsEnabled()) ph.opt_out_capturing();
        else if (ph.has_opted_out_capturing()) ph.opt_in_capturing();
      },
    });
    posthog.register({ app: "engine" });
    return posthog;
  });
  client.catch((error) => {
    console.error("[analytics] failed to load PostHog:", error);
    client = null;
  });
  return client;
}

export function isAnalyticsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setAnalyticsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Storage unavailable — the in-memory opt-out below still applies.
  }
  if (enabled) {
    void init()?.then((ph) => {
      if (loaded(ph) && ph.has_opted_out_capturing()) ph.opt_in_capturing();
    });
  } else {
    // Only touch the SDK if it was ever loaded; never download it to opt out.
    void client?.then((ph) => {
      if (loaded(ph) && !ph.has_opted_out_capturing()) ph.opt_out_capturing();
    });
  }
}

let lastUrl: string | null = null;

function capturePageview() {
  if (!client || !isAnalyticsEnabled()) return;
  const url = window.location.href;
  if (url === lastUrl) return; // dedupe: initial load may also emit onResolved
  lastUrl = url;
  // capture() no-ops when the host has opted out.
  client.then((ph) => ph.capture("$pageview", { $current_url: url })).catch(() => {});
}

/** Call once from getRouter(); captures a $pageview per navigation. */
export function initAnalytics(router: AnyRouter) {
  if (!KEY || typeof window === "undefined") return;
  if (isAnalyticsEnabled()) init();
  // onResolved only fires for in-app navigations, so capture the initial
  // page load explicitly.
  capturePageview();
  router.subscribe("onResolved", capturePageview);
}
