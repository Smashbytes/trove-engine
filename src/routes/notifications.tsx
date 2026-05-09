import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { useHostNotifications } from "@/lib/queries";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Inbox - Trove Engine" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const notificationsQuery = useHostNotifications();
  const notifications = notificationsQuery.data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Activity feed"
        title="Inbox"
        subtitle="Verification, booking, and operational updates now read from the real notifications table for the signed-in user."
      />

      <div className="space-y-4">
        {notifications.length === 0 && (
          <div className="rounded-[1.75rem] border border-border/60 bg-card p-12 text-center shadow-card">
            <h3 className="font-display text-2xl font-semibold">No notifications yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Once the platform starts writing notifications for this user, they will appear here in
              real time.
            </p>
          </div>
        )}

        {notifications.map((notification) => (
          <article
            key={notification.id}
            className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-xl font-semibold">{notification.type}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleString("en-ZA")}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${notification.read_at ? "bg-white/10 text-white/70" : "bg-primary/12 text-primary"}`}
              >
                {notification.read_at ? "Read" : "Unread"}
              </span>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-xs text-muted-foreground">
              {JSON.stringify(notification.payload, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
