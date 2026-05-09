import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { useHostReviews } from "@/lib/queries";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "Reviews - Trove Engine" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const reviewsQuery = useHostReviews();
  const reviews = reviewsQuery.data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Guest sentiment"
        title="Reviews"
        subtitle="Real review rows tied to this host now land here instead of a generic empty placeholder."
      />

      <div className="space-y-4">
        {reviews.length === 0 && (
          <div className="rounded-[1.75rem] border border-border/60 bg-card p-12 text-center shadow-card">
            <h3 className="font-display text-2xl font-semibold">No reviews yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Reviews will appear here once guests complete bookings and leave feedback.
            </p>
          </div>
        )}

        {reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-semibold">{review.rating}/5</p>
                <p className="text-xs text-muted-foreground">
                  Booking #{review.booking_id.slice(0, 8)}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString("en-ZA")}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {review.body || "No written feedback provided."}
            </p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
