// PostHog product analytics — wired per the published Privacy Policy
// (welovetrove.co.za/legal/privacy): legal basis is legitimate interest with
// anonymised events, and hosts can switch it off in Settings → Privacy & data.
// We never call posthog.identify() — events stay anonymous — and the opt-out
// persists locally. Events are tagged app:"engine" so the shared PostHog
// project segments cleanly across the website, guest app and engine.
import posthog from "posthog-js";
import type { AnyRouter } from "@tanstack/react-router";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://eu.i.posthog.com";
const STORAGE_KEY = "trove-engine:analytics";

let initCalled = false;

function loaded(): boolean {
  return (posthog as unknown as { __loaded?: boolean }).__loaded === true;
}

function init() {
  if (!KEY || typeof window === "undefined" || initCalled) return;
  initCalled = true;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // captured on router resolution instead
    capture_pageleave: true,
    person_profiles: "identified_only", // never identified → stays anonymous
    autocapture: false, // pageviews + explicit events only
    loaded: (ph) => {
      // Clear a persisted SDK opt-out left over from an earlier session if
      // the host has since re-enabled analytics in Settings.
      if (isAnalyticsEnabled() && ph.has_opted_out_capturing()) {
        ph.opt_in_capturing();
      }
    },
  });
  posthog.register({ app: "engine" });
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
    if (loaded()) {
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
    } else {
      init();
    }
  } else if (loaded() && !posthog.has_opted_out_capturing()) {
    posthog.opt_out_capturing();
  }
}

let lastUrl: string | null = null;

function capturePageview() {
  // capture() queues safely while the SDK is still async-loading, and no-ops
  // when the host has opted out — only skip if init was never called at all.
  if (!initCalled || !isAnalyticsEnabled()) return;
  const url = window.location.href;
  if (url === lastUrl) return; // dedupe: initial load may also emit onResolved
  lastUrl = url;
  posthog.capture("$pageview", { $current_url: url });
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
