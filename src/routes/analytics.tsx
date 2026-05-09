import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics · Trove Engine" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="What's working"
        title="Analytics"
        subtitle="Revenue, fill rate, repeat attendees, booking source. Phase 5 in PRD scope."
      />

      <div className="rounded-2xl border border-border/60 bg-card p-12 text-center shadow-card">
        <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 font-display text-lg font-semibold">Analytics coming in Phase 5</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Once you have a few completed bookings, we'll surface revenue trends, fill rates, and
          repeat-guest cohorts here.
        </p>
      </div>
    </AppShell>
  );
}
