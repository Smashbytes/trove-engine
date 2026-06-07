import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LifeBuoy, Phone, StickyNote, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAudienceProfiles,
  useCreateGuestNote,
  useDeleteGuestNote,
  useGuestBookings,
  useGuestNotes,
} from "@/lib/crm";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  useCreateTicket,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/support";

export const Route = createFileRoute("/audience/$guestId")({
  head: () => ({ meta: [{ title: "Guest · Audience · Trove Engine" }] }),
  component: ManageGuestPage,
});

const formatZar = (kobo: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(kobo / 100);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function initials(name: string | null | undefined) {
  return (name ?? "Guest")
    .split(" ")
    .map((token) => token[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-success/15 text-success",
  completed: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-destructive/15 text-destructive",
};

function ManageGuestPage() {
  const { guestId } = Route.useParams();
  const navigate = useNavigate();

  const profilesQuery = useAudienceProfiles();
  const bookingsQuery = useGuestBookings(guestId);
  const notesQuery = useGuestNotes(guestId);
  const createNote = useCreateGuestNote(guestId);
  const deleteNote = useDeleteGuestNote(guestId);
  const createTicket = useCreateTicket();

  const profile = profilesQuery.data?.get(guestId);
  const bookings = bookingsQuery.data ?? [];
  const notes = notesQuery.data ?? [];

  const stats = useMemo(() => {
    const rows = bookingsQuery.data ?? [];
    const billable = rows.filter((b) => b.status === "confirmed" || b.status === "completed");
    return {
      total: rows.length,
      spend: billable.reduce((sum, b) => sum + b.totalKobo, 0),
      last: rows[0]?.createdAt ?? null,
    };
  }, [bookingsQuery.data]);

  // ---- internal note compose ----
  const [noteBody, setNoteBody] = useState("");

  async function submitNote(e: FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    try {
      await createNote.mutateAsync(noteBody);
      setNoteBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save note");
    }
  }

  // ---- support ticket compose ----
  const [ticketOpen, setTicketOpen] = useState(false);
  const [category, setCategory] = useState<TicketCategory>("complaint");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [relatedBookingId, setRelatedBookingId] = useState<string>("none");

  async function submitTicket(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Give the ticket a short title.");
      return;
    }
    try {
      const result = await createTicket.mutateAsync({
        title,
        description,
        category,
        priority,
        userId: guestId,
        relatedBookingId: relatedBookingId === "none" ? null : relatedBookingId,
      });
      toast.success(`Ticket ${result.ticket_number} opened for this guest`);
      navigate({ to: "/support/$ticketId", params: { ticketId: result.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open ticket");
    }
  }

  const guestName = profile?.full_name ?? "Trove guest";

  return (
    <AppShell>
      <Link
        to="/audience"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to audience
      </Link>

      <PageHeader
        eyebrow="Manage guest"
        title={guestName}
        subtitle="Their history with your spot, private notes only you can see, and a direct line to TROVE support on their behalf."
      />

      {/* Identity + stats */}
      <div className="mb-6 flex flex-col gap-5 rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={guestName} />}
            <AvatarFallback className="bg-primary/15 text-base font-semibold text-primary">
              {initials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-xl font-semibold">{guestName}</p>
            {profile?.phone ? (
              <a
                href={`tel:${profile.phone}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Phone className="h-3.5 w-3.5" /> {profile.phone}
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No contact number on file</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Stat label="Bookings" value={String(stats.total)} />
          <Stat label="Spend" value={formatZar(stats.spend)} />
          <Stat label="Last seen" value={stats.last ? formatDate(stats.last) : "—"} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Bookings + ticket */}
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-card">
            <div className="border-b border-border/60 px-5 py-4">
              <h2 className="font-display text-lg font-semibold">Bookings with you</h2>
            </div>
            {bookings.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">
                This person follows you but hasn't booked yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {bookings.map((booking) => (
                  <li key={booking.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{booking.listingTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(booking.createdAt)} · party of {booking.partySize}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        STATUS_TONE[booking.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {booking.status}
                    </span>
                    <span className="w-20 shrink-0 text-right text-sm font-semibold">
                      {formatZar(booking.totalKobo)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary" />
                <h2 className="font-display text-lg font-semibold">Support ticket</h2>
              </div>
              <Button
                variant={ticketOpen ? "ghost" : "outline"}
                size="sm"
                onClick={() => setTicketOpen((v) => !v)}
                disabled={bookings.length === 0}
              >
                {ticketOpen ? "Cancel" : "Create ticket"}
              </Button>
            </div>
            {bookings.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Support tickets are for guests who've booked with you.
              </p>
            ) : !ticketOpen ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Raise a ticket with TROVE HQ on this guest's behalf — refunds, complaints, or
                anything that needs help.
              </p>
            ) : (
              <form onSubmit={submitTicket} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Category">
                    <Select
                      value={category}
                      onValueChange={(v) => setCategory(v as TicketCategory)}
                    >
                      <SelectTrigger className="h-10 w-full rounded-lg border-border/60 bg-white/[0.03] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border/60 bg-card text-foreground">
                        {TICKET_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value} className="text-sm">
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Priority">
                    <Select
                      value={priority}
                      onValueChange={(v) => setPriority(v as TicketPriority)}
                    >
                      <SelectTrigger className="h-10 w-full rounded-lg border-border/60 bg-white/[0.03] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border/60 bg-card text-foreground">
                        {TICKET_PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value} className="text-sm">
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Related booking">
                  <Select value={relatedBookingId} onValueChange={setRelatedBookingId}>
                    <SelectTrigger className="h-10 w-full rounded-lg border-border/60 bg-white/[0.03] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border/60 bg-card text-foreground">
                      <SelectItem value="none" className="text-sm">
                        Not booking-specific
                      </SelectItem>
                      {bookings.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-sm">
                          {b.listingTitle} · {formatDate(b.createdAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Title">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Refund request for cancelled event"
                    className="w-full rounded-lg border border-border/60 bg-white/[0.03] px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                  />
                </Field>
                <Field label="Details">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="What's going on and what outcome you're after."
                    className="w-full resize-none rounded-lg border border-border/60 bg-white/[0.03] px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                  />
                </Field>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={createTicket.isPending || !title.trim()}
                    className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
                  >
                    {createTicket.isPending ? "Opening…" : "Open ticket"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* Internal notes */}
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Internal notes</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Private to your team — the guest never sees these.
          </p>

          <form onSubmit={submitNote} className="mt-4 space-y-2">
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={3}
              placeholder="Add a note about this guest…"
              className="w-full resize-none rounded-lg border border-border/60 bg-white/[0.03] px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={createNote.isPending || !noteBody.trim()}>
                {createNote.isPending ? "Saving…" : "Add note"}
              </Button>
            </div>
          </form>

          <div className="mt-4 space-y-3">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="group rounded-xl border border-border/50 bg-white/[0.02] p-3"
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(note.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteNote.mutate(note.id)}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right sm:text-left">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
