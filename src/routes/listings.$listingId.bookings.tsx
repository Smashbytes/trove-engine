import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Users } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/listings/$listingId/bookings")({
  head: () => ({ meta: [{ title: "Bookings · Listing · Trove Engine" }] }),
  component: ListingBookingsPage,
});

function ListingBookingsPage() {
  const { listingId } = Route.useParams();

  return (
    <AppShell>
      <Link to="/listings/$listingId" params={{ listingId }} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to listing
      </Link>

      <PageHeader
        eyebrow="Attendees"
        title="Bookings"
        subtitle="Confirmed, cancelled, and refunded bookings on this listing."
        actions={
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="rounded-2xl border border-border/60 bg-card p-12 text-center shadow-card">
        <Users className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 font-display text-lg font-semibold">No bookings yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">Share your listing to get your first guest in.</p>
      </div>
    </AppShell>
  );
}
