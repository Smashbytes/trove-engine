import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "Reviews · Trove Engine" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="What guests say"
        title="Reviews"
        subtitle="Reviews are written by guests after a confirmed booking. Reply, hide, or report."
      />

      <div className="rounded-2xl border border-border/60 bg-card p-12 text-center shadow-card">
        <Star className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 font-display text-lg font-semibold">No reviews yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Reviews will appear here once your guests check in and rate their experience.
        </p>
      </div>
    </AppShell>
  );
}
