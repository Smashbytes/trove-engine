import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { notificationView, type NotificationView } from "@/lib/notification-spec";
import { useAuth, type Workspace } from "@/lib/auth";
import { useHostNotifications, useMarkNotificationsRead } from "@/lib/queries";
import type { Notification } from "@/lib/database.types";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Inbox - Trove Engine" }] }),
  component: NotificationsPage,
});

const TONE: Record<NotificationView["tone"], string> = {
  primary: "bg-primary/12 text-primary",
  success: "bg-emerald-500/12 text-emerald-400",
  warning: "bg-amber-500/12 text-amber-400",
  danger: "bg-red-500/12 text-red-400",
};

function NotificationsPage() {
  const notificationsQuery = useHostNotifications(50);
  const markRead = useMarkNotificationsRead();
  const { workspaces, activeHostId, setActiveWorkspace } = useAuth();
  const notifications = notificationsQuery.data ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;

  function markAllRead() {
    markRead.mutate(undefined, {
      onError: () => toast.error("Couldn't mark your notifications as read. Try again."),
    });
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Activity feed"
        title="Inbox"
        subtitle="Updates about your bookings, followers, listings and refunds."
      />

      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {notificationsQuery.isSuccess &&
            (unread > 0 ? `${unread} unread` : "You're all caught up")}
        </p>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={markRead.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" aria-hidden />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notificationsQuery.isLoading && (
          <div className="rounded-card border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground shadow-card">
            Loading your inbox…
          </div>
        )}

        {notificationsQuery.isError && (
          <div
            role="alert"
            className="rounded-card border border-red-500/30 bg-red-500/10 p-6 text-center shadow-card"
          >
            <p className="font-semibold">Couldn't load your inbox</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={() => void notificationsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {notificationsQuery.isSuccess && notifications.length === 0 && (
          <div className="rounded-card border border-border/60 bg-card p-12 text-center shadow-card">
            <h2 className="font-display text-2xl font-semibold">No notifications yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              New bookings, followers, cancellations and messages from TROVE about your listings
              will show up here.
            </p>
          </div>
        )}

        {notifications.map((notification) => {
          // Team staff get their Spots' notifications too (payload.host_id, D-041).
          // With more than one workspace, say which Spot it's about and open it there.
          const workspace = notificationWorkspace(notification, workspaces);
          return (
            <NotificationCard
              key={notification.id}
              notification={notification}
              spotLabel={workspaces.length > 1 ? workspace?.label : undefined}
              onMarkRead={() => {
                if (!notification.read_at) markRead.mutate([notification.id]);
              }}
              onOpen={() => {
                if (workspace && workspace.hostId !== activeHostId)
                  setActiveWorkspace(workspace.hostId);
                if (!notification.read_at) markRead.mutate([notification.id]);
              }}
            />
          );
        })}
      </div>
    </AppShell>
  );
}

function notificationWorkspace(n: Notification, workspaces: Workspace[]) {
  const payload =
    n.payload && typeof n.payload === "object" && !Array.isArray(n.payload) ? n.payload : {};
  // Owner-only types (followers, reviews, HQ moderation) carry no host_id: they're
  // about the recipient's own Spot, whose host id is their user id.
  const hostId = typeof payload.host_id === "string" ? payload.host_id : n.user_id;
  return workspaces.find((w) => w.hostId === hostId);
}

function NotificationCard({
  notification,
  spotLabel,
  onMarkRead,
  onOpen,
}: {
  notification: Notification;
  spotLabel?: string;
  onMarkRead: () => void;
  onOpen: () => void;
}) {
  const view = notificationView(notification);
  const Icon = view.icon;
  const unread = !notification.read_at;
  const created = new Date(notification.created_at);

  return (
    <article
      className={`flex gap-4 rounded-card border bg-card p-5 shadow-card ${unread ? "border-primary/40" : "border-border/60"}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE[view.tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-lg font-semibold">
            {unread && (
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle"
                aria-hidden
              />
            )}
            {view.title}
            {unread && <span className="sr-only"> (unread)</span>}
          </h2>
          <time
            dateTime={notification.created_at}
            title={created.toLocaleString("en-ZA")}
            className="text-xs text-muted-foreground"
          >
            {formatDistanceToNow(created, { addSuffix: true })}
          </time>
        </div>

        {spotLabel && (
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {spotLabel}
          </p>
        )}

        {view.message && (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{view.message}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {view.link && (
            <Link
              // Links come from the type catalogue (notification-spec.ts), so they're known routes.
              to={view.link.to as never}
              params={view.link.params as never}
              onClick={onOpen}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {view.link.label}
            </Link>
          )}
          {unread && (
            <button
              type="button"
              onClick={onMarkRead}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
