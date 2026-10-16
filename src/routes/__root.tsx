import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";

// Auth-gate loader with an escape hatch: if the supabase session check is
// still running after ~6s (cold network, broken cookie, etc.), surface a
// reload button so users aren't stuck staring at a spinner.
function AuthGateLoader() {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setStalled(true), 6000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        {stalled && (
          <div className="mt-2 flex flex-col items-center gap-2">
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

import appCss from "../styles.css?url";

// The auth dialog (and the animation library it uses, ~120 KB) is loaded on
// demand so it isn't part of the bundle every visitor downloads first.
const loadAuthModal = () => import("@/components/trove/AuthModal");
const AuthModal = lazy(() => loadAuthModal().then((m) => ({ default: m.AuthModal })));

// Start that download at page start (in parallel with the app, not after it)
// when the dialog is about to be needed: a ?auth= deep link from the website,
// or a visitor with no session cookie (sign-in wall / "Start hosting" CTA).
// Signed-in hosts skip it until idle.
if (typeof window !== "undefined") {
  const wantsAuth = new URLSearchParams(window.location.search).has("auth");
  const hasSession = document.cookie.includes("-auth-token");
  if (wantsAuth || !hasSession) void loadAuthModal();
}

function NotFoundComponent() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary-fill px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-fill/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Trove Engine - Host workspaces built around how each spot actually runs." },
      {
        name: "description",
        content:
          "Role-specific workspaces for event organisers, experience providers, accommodation hosts, and venues on Trove Engine.",
      },
      { name: "author", content: "Trove" },
      { property: "og:title", content: "Trove Engine - Role-specific host workspaces." },
      {
        property: "og:description",
        content:
          "A single platform with focused workspaces for organisers, experiences, accommodation, and venues.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Trove Engine - Role-specific host workspaces." },
      {
        name: "twitter:description",
        content:
          "Focused host operations for events, experiences, accommodation, and venue partners.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Unbounded:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function EngineAuthGate() {
  const { isAuthenticated, isLoading, hasWorkspace, profile, showAuthModal } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // An unknown URL should show the 404 page, not the sign-in wall.
  const isNotFound = useRouterState({
    select: (state) => state.matches.some((match) => match.globalNotFound),
  });
  // /reset-password and /auth/confirm must be reachable without a full
  // session: Supabase drops the user there from an email link with a
  // one-shot token, and we need to render the form/verifier even while
  // the auth listener is still settling. /join is the team-invite acceptance
  // route — a signed-in user without their own spot must reach it.
  const isPublicRoute =
    isNotFound ||
    pathname === "/" ||
    pathname === "/reset-password" ||
    pathname === "/auth/confirm" ||
    pathname.startsWith("/join");

  useEffect(() => {
    if (isLoading) return;
    // Public routes must stay reachable for everyone — including a signed-in
    // host who hasn't finished onboarding. Only nudge a user with NO workspace
    // (not an owner and not a team member of any spot) toward onboarding.
    if (isPublicRoute) return;

    if (isAuthenticated && !hasWorkspace && profile && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [isAuthenticated, hasWorkspace, isLoading, navigate, pathname, profile, isPublicRoute]);

  // Warm the auth dialog chunk once the page is idle (signed-out visitors only).
  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => void loadAuthModal())
        : window.setTimeout(() => void loadAuthModal(), 2000);
    return () => {
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <AuthGateLoader />;
  }

  const canRenderOutlet = isAuthenticated || isPublicRoute;
  const shouldOpenAuthModal = showAuthModal || (!isAuthenticated && !isPublicRoute);

  return (
    <>
      {/* While the auth dialog is open the page behind it is inert: no Tab
          stops, no clicks, hidden from screen readers. */}
      {canRenderOutlet && (
        <div inert={shouldOpenAuthModal || undefined}>
          <Outlet />
        </div>
      )}
      {/* On public routes the modal is opt-in (opened by a CTA or ?auth= link),
          so hosts can close it. On protected routes it is the auth wall. */}
      {shouldOpenAuthModal && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-background" />}>
          <AuthModal open dismissible={isPublicRoute} />
        </Suspense>
      )}
      <Toaster theme="dark" position="top-right" richColors />
    </>
  );
}

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EngineAuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
