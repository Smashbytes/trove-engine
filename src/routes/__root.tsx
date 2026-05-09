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
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/trove/AuthModal";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
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
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
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
  const { isAuthenticated, isLoading, isHost, profile, showAuthModal } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isPublicRoute = pathname === "/";

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && !isHost && profile && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [isAuthenticated, isHost, isLoading, navigate, pathname, profile]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const canRenderOutlet = isAuthenticated || isPublicRoute;
  const shouldOpenAuthModal = showAuthModal || (!isAuthenticated && !isPublicRoute);

  return (
    <>
      {canRenderOutlet && <Outlet />}
      <AuthModal open={shouldOpenAuthModal} />
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
