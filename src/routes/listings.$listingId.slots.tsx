import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/listings/$listingId/slots")({
  head: () => ({ meta: [{ title: "Slots · Listing · Trove Engine" }] }),
  component: ListingSlotsPage,
});

function ListingSlotsPage() {
  const { listingId } = Route.useParams();

  return (
    <AppShell>
      <Link to="/listings/$listingId" params={{ listingId }} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to listing
      </Link>

      <PageHeader
        eyebrow="Availability"
        title="Slots & schedule"
        subtitle="Manage recurring time-slots (experiences) or date-ranges (accommodation)."
        actions={
          <Button size="sm">
            <CalendarPlus className="mr-1.5 h-4 w-4" /> Add slot
          </Button>
        }
      />

      <div className="rounded-2xl border border-border/60 bg-card p-12 text-center shadow-card">
        <CalendarPlus className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 font-display text-lg font-semibold">No slots yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Define your recurring schedule — e.g. daily at 07:00, 09:00, 11:00 (PRD SLT-01).
        </p>
      </div>
    </AppShell>
  );
}
