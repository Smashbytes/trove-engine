import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Heart, Sparkles, Ticket, UserPlus, Users } from "lucide-react";
import { useMemo } from "react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { PermissionGate } from "@/components/trove/PermissionGate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAudienceProfiles,
  useFollowers,
  useGuests,
  useNewFollowerFeed,
  useNewGuestFeed,
  useUpcomingEventGuests,
} from "@/lib/crm";
import { formatZar } from "@/lib/format";

export const Route = createFileRoute("/audience/")({
  head: () => ({ meta: [{ title: "Audience · Trove Engine" }] }),
  component: AudiencePage,
});


const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function initials(name: string | null | undefined) {
  return (name ?? "Guest")
    .split(" ")
    .map((token) => token[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PersonAvatar({
  name,
  avatarUrl,
  size = "h-10 w-10",
}: {
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  size?: string;
}) {
  return (
    <Avatar className={size}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? "Guest"} />}
      <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function LoadMore({
  shown,
  total,
  noun,
  hasMore,
  loading,
  onClick,
}: {
  shown: number;
  total: number;
  noun: string;
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  if (total <= shown && !hasMore) return null;
  return (
    <div className="mt-4 flex flex-col items-center gap-2 text-xs text-muted-foreground">
      <p>
        Showing {shown.toLocaleString("en-ZA")} of {total.toLocaleString("en-ZA")} {noun}
      </p>
      {hasMore && (
        <Button variant="outline" size="sm" onClick={onClick} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-card border border-border/60 bg-card p-12 text-center shadow-card">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <h2 className="mt-3 font-display text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function AudiencePage() {
  const followersQuery = useFollowers();
  const guestsQuery = useGuests();
  const upcomingQuery = useUpcomingEventGuests();
  const newFollowers = useNewFollowerFeed();
  const newGuests = useNewGuestFeed();

  const followers = useMemo(
    () => (followersQuery.data?.pages ?? []).flatMap((page) => page.rows),
    [followersQuery.data],
  );
  const guests = useMemo(
    () => (guestsQuery.data?.pages ?? []).flatMap((page) => page.rows),
    [guestsQuery.data],
  );
  const followerTotal = followersQuery.data?.pages[0]?.total ?? 0;
  const guestTotal = guestsQuery.data?.pages[0]?.total ?? 0;
  const upcoming = upcomingQuery.data ?? [];

  // Only the feeds need a name lookup; every list row brings its own.
  const feedIds = useMemo(
    () => [
      ...(newFollowers.data ?? []).map((n) => (n.payload as { follower_id?: string })?.follower_id ?? ""),
      ...(newGuests.data ?? []).map((n) => (n.payload as { guest_id?: string })?.guest_id ?? ""),
    ],
    [newFollowers.data, newGuests.data],
  );
  const profiles = useAudienceProfiles(feedIds).data;
  const nameOf = (id: string) => profiles?.get(id)?.full_name ?? "Trove guest";

  return (
    <AppShell>
      <PermissionGate perm="audience.manage">
      <PageHeader
        eyebrow="Your people"
        title="Audience"
        subtitle="The followers and guests connected to your spot — who's following, who's bought, and who's coming up."
      />

      {/* New activity feeds */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <FeedCard
          icon={UserPlus}
          label="New followers"
          empty="No new followers yet."
          items={(newFollowers.data ?? []).map((n) => {
            const followerId = (n.payload as { follower_id?: string })?.follower_id ?? "";
            return { id: n.id, name: nameOf(followerId), at: n.created_at };
          })}
        />
        <FeedCard
          icon={Ticket}
          label="New guests"
          empty="No new ticket buyers yet."
          items={(newGuests.data ?? []).map((n) => {
            const payload = n.payload as { guest_id?: string; listing_title?: string };
            return {
              id: n.id,
              name: nameOf(payload?.guest_id ?? ""),
              detail: payload?.listing_title,
              at: n.created_at,
            };
          })}
        />
      </div>

      <Tabs defaultValue="followers">
        <TabsList className="max-w-full justify-start overflow-x-auto">

          <TabsTrigger value="followers">
            Followers
            <Badge variant="secondary" className="ml-2">
              {followerTotal.toLocaleString("en-ZA")}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="guests">
            Guests
            <Badge variant="secondary" className="ml-2">
              {guestTotal.toLocaleString("en-ZA")}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        {/* Followers */}
        <TabsContent value="followers" className="mt-6">
          {followers.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No followers yet"
              body="When people follow your spot in the Trove app they'll show up here. Share your profile to grow your audience."
            />
          ) : (
            <>
            <ul className="divide-y divide-border/60 overflow-hidden rounded-card border border-border/60 bg-card shadow-card">
              {followers.map((follower) => {
                const isGuest = follower.isGuest;
                const row = (
                  <div className="flex items-center gap-3 px-5 py-4">
                    <PersonAvatar name={follower.fullName} avatarUrl={follower.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {follower.fullName ?? "Trove guest"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Followed {formatDate(follower.followedAt)}
                      </p>
                    </div>
                    {isGuest && <Badge className="shrink-0">Guest</Badge>}
                  </div>
                );
                return (
                  <li key={follower.userId}>
                    {isGuest ? (
                      <Link
                        to="/audience/$guestId"
                        params={{ guestId: follower.userId }}
                        className="block transition-colors hover:bg-muted/40"
                      >
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
            <LoadMore
              shown={followers.length}
              total={followerTotal}
              noun="followers"
              hasMore={!!followersQuery.hasNextPage}
              loading={followersQuery.isFetchingNextPage}
              onClick={() => void followersQuery.fetchNextPage()}
            />
            </>
          )}
        </TabsContent>

        {/* Guests */}
        <TabsContent value="guests" className="mt-6">
          {guests.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No guests yet"
              body="Guests who buy tickets or book with you appear here, with their spend and history. Open one to manage them."
            />
          ) : (
            <>
            <ul className="divide-y divide-border/60 overflow-hidden rounded-card border border-border/60 bg-card shadow-card">
              {guests.map((guest) => {
                return (
                  <li key={guest.guestId}>
                    <Link
                      to="/audience/$guestId"
                      params={{ guestId: guest.guestId }}
                      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
                    >
                      <PersonAvatar name={guest.fullName} avatarUrl={guest.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {guest.fullName ?? "Trove guest"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {guest.bookingsCount} booking{guest.bookingsCount === 1 ? "" : "s"} ·{" "}
                          {guest.listingTitles.slice(0, 2).join(", ") || "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{formatZar(guest.totalSpendCents)}</p>
                        <p className="text-xs text-muted-foreground">
                          Last {formatDate(guest.lastBookingAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <LoadMore
              shown={guests.length}
              total={guestTotal}
              noun="guests"
              hasMore={!!guestsQuery.hasNextPage}
              loading={guestsQuery.isFetchingNextPage}
              onClick={() => void guestsQuery.fetchNextPage()}
            />
            </>
          )}
        </TabsContent>

        {/* Upcoming */}
        <TabsContent value="upcoming" className="mt-6 space-y-5">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing on the calendar"
              body="Once you have scheduled dates with confirmed guests, each upcoming event lists who's coming right here."
            />
          ) : (
            upcoming.map((event) => (
              <section
                key={event.listingId}
                className="overflow-hidden rounded-card border border-border/60 bg-card shadow-card"
              >
                <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">
                      {event.listingTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.startsAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {event.guestCount} guest{event.guestCount === 1 ? "" : "s"}
                  </Badge>
                </div>
                {event.guests.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">
                    No confirmed guests yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {event.guests.map((guest) => {
                      return (
                        <li key={guest.bookingId}>
                          <Link
                            to="/audience/$guestId"
                            params={{ guestId: guest.guestId }}
                            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                          >
                            <PersonAvatar name={guest.fullName} avatarUrl={guest.avatarUrl} size="h-9 w-9" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {guest.fullName ?? "Trove guest"}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              Party of {guest.partySize}
                            </span>
                            {guest.checkedInAt && (
                              <Badge variant="secondary" className="shrink-0">
                                Checked in
                              </Badge>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                    {event.bookingCount > event.guests.length && (
                      <li className="px-5 py-3 text-xs text-muted-foreground">
                        and {event.bookingCount - event.guests.length} more booking
                        {event.bookingCount - event.guests.length === 1 ? "" : "s"}
                      </li>
                    )}
                  </ul>
                )}
              </section>
            ))
          )}
        </TabsContent>
      </Tabs>
      </PermissionGate>
    </AppShell>
  );
}

interface FeedItem {
  id: string;
  name: string;
  detail?: string;
  at: string;
}

function FeedCard({
  icon: Icon,
  label,
  empty,
  items,
}: {
  icon: typeof Users;
  label: string;
  empty: string;
  items: FeedItem[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold">{label}</p>
        {items.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {items.length}
          </Badge>
        )}
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span className="truncate font-medium">{item.name}</span>
              {item.detail && (
                <span className="truncate text-xs text-muted-foreground">· {item.detail}</span>
              )}
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {relativeTime(item.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
