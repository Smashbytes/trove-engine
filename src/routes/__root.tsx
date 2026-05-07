import { Outlet, Link, createRootRoute, HeadContent, Scripts, useNavigate } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/trove/AuthModal";

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
      { title: "Trove Engine — Run your Spot. Sell out your nights." },
      { name: "description", content: "The all-in-one Spot dashboard for Trove. Publish events, sell tickets, scan guests, get paid." },
      { name: "author", content: "Trove" },
      { property: "og:title", content: "Trove Engine — Run your Spot. Sell out your nights." },
      { property: "og:description", content: "The all-in-one Spot dashboard for Trove. Publish events, sell tickets, scan guests, get paid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Trove Engine — Run your Spot. Sell out your nights." },
      { name: "twitter:description", content: "The all-in-one Spot dashboard for Trove. Publish events, sell tickets, scan guests, get paid." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2f9a9525-9bd6-4a03-9a4f-7eddf3389e4f/id-preview-ce8e6f40--68761f42-cc94-47c6-aa6d-c5f0dda2d550.lovable.app-1777511737314.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2f9a9525-9bd6-4a03-9a4f-7eddf3389e4f/id-preview-ce8e6f40--68761f42-cc94-47c6-aa6d-c5f0dda2d550.lovable.app-1777511737314.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
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
  const { isAuthenticated, isLoading, isHost, showAuthModal, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    // Authenticated but no host profile → send to onboarding
    if (isAuthenticated && !isHost && profile && location.pathname !== '/onboarding') {
      navigate({ to: '/onboarding' });
    }
  }, [isAuthenticated, isHost, isLoading, profile]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {isAuthenticated && <Outlet />}
      <AuthModal open={showAuthModal} />
      <Toaster theme="dark" position="top-right" richColors />
    </>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EngineAuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
