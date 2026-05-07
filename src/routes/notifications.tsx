import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Inbox · Trove Engine" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Stay in the loop"
        title="Inbox"
        subtitle="Bookings, payouts, verification updates, and capacity alerts."
      />

      <div className="rounded-2xl border border-border/60 bg-card p-12 text-center shadow-card">
        <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 font-display text-lg font-semibold">No notifications</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You'll see booking confirmations, payout alerts, and verification updates here.
        </p>
      </div>
    </AppShell>
  );
}
