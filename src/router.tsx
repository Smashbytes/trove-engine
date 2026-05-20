import { createRouter, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { routeTree } from "./routeTree.gen";

// Auto-recover from stale chunk references after a deploy.
// When users have a tab open during a deploy, their HTML still references
// the previous chunk hashes; the next client-side navigation tries to fetch
// those old chunks, the CDN 404s them, and TanStack Router sits on the
// pending spinner indefinitely. The reload pulls fresh HTML + new hashes.
// Guarded by a sessionStorage timestamp so we don't get into a reload loop
// if the failure is something other than stale chunks. Wrapped in a
// typeof-window check so this is a no-op during SSR.
if (typeof window !== "undefined") {
  let reloading = false;
  const STALE_CHUNK_PATTERNS = [
    /Failed to fetch dynamically imported module/i,
    /error loading dynamically imported module/i,
    /Importing a module script failed/i,
    /Loading chunk \d+ failed/i,
    /ChunkLoadError/i,
  ];

  const looksLikeStaleChunk = (message: string) =>
    STALE_CHUNK_PATTERNS.some((p) => p.test(message));

  const tryRecover = (err: unknown) => {
    if (reloading) return;
    const message =
      err instanceof Error
        ? `${err.name}: ${err.message}`
        : typeof err === "string"
          ? err
          : String((err as { message?: string } | null)?.message ?? err);
    if (!looksLikeStaleChunk(message)) return;

    const lastReload = Number(sessionStorage.getItem("__engine_chunk_reload_at") ?? 0);
    if (Date.now() - lastReload < 30_000) {
      console.error(
        "[engine] stale chunk reload already attempted recently — not retrying",
        err,
      );
      return;
    }

    reloading = true;
    sessionStorage.setItem("__engine_chunk_reload_at", String(Date.now()));
    console.warn("[engine] stale chunk detected, reloading for fresh HTML", err);
    window.location.reload();
  };

  window.addEventListener("unhandledrejection", (event) => tryRecover(event.reason));
  window.addEventListener("error", (event) => tryRecover(event.error ?? event.message));
}

// Pending UI for slow route transitions. After ~6 seconds we surface an
// escape hatch: a reload button so users never feel trapped if a chunk
// download has wedged (slow network, stale hash from before a deploy, etc.).
function DefaultPendingComponent() {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setStalled(true), 6000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground">Loading…</p>
        {stalled && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">Taking longer than expected.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              Reload page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {import.meta.env.DEV && error.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    // Cache route loads for 30s so navigations to a recent page are instant.
    defaultPreloadStaleTime: 30_000,
    // Hover-preload chunks so the next click feels instant.
    defaultPreload: "intent",
    // Wait 400ms before showing the pending component (most chunk loads
    // resolve faster than that and we don't want a flash). No min hold —
    // unmount as soon as the route is ready.
    defaultPendingMs: 400,
    defaultErrorComponent: DefaultErrorComponent,
    defaultPendingComponent: DefaultPendingComponent,
  });

  return router;
};
