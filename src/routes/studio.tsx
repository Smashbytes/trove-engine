import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/trove/AppShell";

const StudioApp = lazy(() => import("@/components/studio/StudioApp"));

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Story Studio · Trove Engine" },
      { name: "description", content: "Create, edit and publish 48-hour Trove reels straight to Seekers." },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="h-96 grid place-items-center text-sm text-muted-foreground">Loading studio…</div>}>
        <StudioApp />
      </Suspense>
    </AppShell>
  );
}
