import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Heart, Sparkles, Ticket, UserPlus, Users } from "lucide-react";
import { useMemo } from "react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAudienceProfiles,
  useFollowers,
  useGuests,
  useNewFollowerFeed,
  useNewGuestFeed,
  useUpcomingEventGuests,
  type AudienceProfile,
} from "@/lib/crm";

export const Route = createFileRoute("/audience/")({
  head: () => ({ meta: [{ title: "Audience · Trove Engine" }] }),
  component: AudiencePage,
});

const formatZar = (kobo: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(kobo / 100);

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
  profile,
  size = "h-10 w-10",
}: {
  profile?: AudienceProfile;
  size?: string;
}) {
  return (
    <Avatar className={size}>
      {profile?.avatar_url && (
        <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Guest"} />
      )}
      <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
        {initials(profile?.full_name)}
      </AvatarFallback>
    </Avatar>
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
    <div className="rounded-[1.75rem] border border-border/60 bg-card p-12 text-center shadow-card">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function AudiencePage() {
  const profilesQuery = useAudienceProfiles();
  const followersQuery = useFollowers();
  const guestsQuery = useGuests();
  const upcomingQuery = useUpcomingEventGuests();
  const newFollowers = useNewFollowerFeed();
  const newGuests = useNewGuestFeed();

  const profiles = profilesQuery.data;
  const followers = followersQuery.data ?? [];
  const guests = guestsQuery.data ?? [];
  const upcoming = upcomingQuery.data ?? [];

  const guestIds = useMemo(
    () => new Set((guestsQuery.data ?? []).map((g) => g.guestId)),
    [guestsQuery.data],
  );
  const nameOf = (id: string) => profiles?.get(id)?.full_name ?? "Trove guest";

  return (
    <AppShell>
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
        <TabsList>
          <TabsTrigger value="followers">
            Followers
            <Badge variant="secondary" className="ml-2">
              {followers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="guests">
            Guests
            <Badge variant="secondary" className="ml-2">
              {guests.length}
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
            <ul className="divide-y divide-border/60 overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-card">
              {followers.map((follower) => {
                const profile = profiles?.get(follower.userId);
                const isGuest = guestIds.has(follower.userId);
                const row = (
                  <div className="flex items-center gap-3 px-5 py-4">
                    <PersonAvatar profile={profile} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {profile?.full_name ?? "Trove guest"}
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
            <ul className="divide-y divide-border/60 overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-card">
              {guests.map((guest) => {
                const profile = profiles?.get(guest.guestId);
                return (
                  <li key={guest.guestId}>
                    <Link
                      to="/audience/$guestId"
                      params={{ guestId: guest.guestId }}
                      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
                    >
                      <PersonAvatar profile={profile} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {profile?.full_name ?? "Trove guest"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {guest.bookingsCount} booking{guest.bookingsCount === 1 ? "" : "s"} ·{" "}
                          {guest.listingTitles.slice(0, 2).join(", ") || "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{formatZar(guest.totalSpendKobo)}</p>
                        <p className="text-xs text-muted-foreground">
                          Last {formatDate(guest.lastBookingAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
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
                className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-card"
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
                    {event.guests.length} guest{event.guests.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                {event.guests.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">
                    No confirmed guests yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {event.guests.map((guest) => {
                      const profile = profiles?.get(guest.guestId);
                      return (
                        <li key={guest.bookingId}>
                          <Link
                            to="/audience/$guestId"
                            params={{ guestId: guest.guestId }}
                            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                          >
                            <PersonAvatar profile={profile} size="h-9 w-9" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {profile?.full_name ?? "Trove guest"}
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
                  </ul>
                )}
              </section>
            ))
          )}
        </TabsContent>
      </Tabs>
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
