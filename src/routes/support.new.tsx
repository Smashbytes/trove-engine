import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  useCreateTicket,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/support";
import { friendlyError } from "@/lib/errors";

interface NewTicketSearch {
  category?: TicketCategory;
  bookingId?: string;
}

export const Route = createFileRoute("/support/new")({
  head: () => ({ meta: [{ title: "New ticket - Trove Engine" }] }),
  validateSearch: (search): NewTicketSearch => ({
    category: search.category as TicketCategory | undefined,
    bookingId: typeof search.bookingId === "string" ? search.bookingId : undefined,
  }),
  component: NewTicketPage,
});

function NewTicketPage() {
  const { category: defaultCategory, bookingId } = Route.useSearch();
  const navigate = useNavigate();
  const createMut = useCreateTicket();

  const [category, setCategory] = useState<TicketCategory>(defaultCategory ?? "other");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  function handleFilesPicked(picked: FileList | null) {
    if (!picked) return;
    const next = Array.from(picked).filter((f) => f.type.startsWith("image/"));
    // The database takes at most 5 attachments per message.
    setFiles((prev) => [...prev, ...next].slice(0, 5));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Give the ticket a short title so HQ can triage it.");
      return;
    }
    try {
      const result = await createMut.mutateAsync({
        title,
        description,
        category,
        priority,
        relatedBookingId: bookingId,
        files,
      });
      toast.success(`Ticket ${result.ticket_number} opened`);
      navigate({ to: "/support/$ticketId", params: { ticketId: result.id } });
    } catch (err) {
      toast.error(friendlyError(err, "Could not open ticket"));
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Open a ticket"
        title="Tell HQ what's going on"
        subtitle="Pick a category, add the details and any photos, and a TROVE HQ agent will pick it up."
        actions={
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/support" })}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-card border border-border/60 bg-card p-6 shadow-card"
      >
        <div>
          <p
            id="ticket-category-label"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Category
          </p>
          <div
            role="group"
            aria-labelledby="ticket-category-label"
            className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3"
          >
            {TICKET_CATEGORIES.map((c) => {
              const active = c.value === category;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={active}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    active
                      ? "border-primary/55 bg-primary/8"
                      : "border-border/60 bg-white/[0.02] hover:border-primary/30"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}
                  >
                    {c.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_auto]">
          <div>
            <label
              htmlFor="ticket-title"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Title
            </label>
            <input
              id="ticket-title"
              type="text"
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Refund needed for cancelled booking #ABC123"
              className="mt-2 w-full rounded-lg border border-border/60 bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="ticket-priority"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Priority
            </label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger
                id="ticket-priority"
                className="mt-2 h-10 w-full rounded-lg border-border/60 bg-white/[0.03] px-3 text-sm text-foreground hover:border-primary/40 focus:border-primary/60 focus:ring-0 md:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/60 bg-card text-foreground">
                {TICKET_PRIORITIES.map((p) => (
                  <SelectItem
                    key={p.value}
                    value={p.value}
                    className="cursor-pointer text-sm focus:bg-primary/15 focus:text-primary"
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label
            htmlFor="ticket-details"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Details
          </label>
          <textarea
            id="ticket-details"
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Booking numbers, dates, what went wrong, what outcome you want — anything that helps HQ resolve this faster."
            className="mt-2 w-full resize-none rounded-lg border border-border/60 bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
          />
        </div>

        {bookingId && (
          <div className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-2 text-xs text-primary">
            Linked to booking <span className="font-mono">{bookingId.slice(0, 8)}</span>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Photos (optional, up to 5)
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="relative h-20 w-20 overflow-hidden rounded-lg border border-border/60 bg-black/20"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  aria-label={`Remove ${file.name}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/90 hover:bg-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {files.length < 6 && (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-white/[0.02] text-muted-foreground hover:border-primary/40 hover:text-primary focus-within:ring-2 focus-within:ring-ring">
                <ImagePlus className="h-5 w-5" />
                <span className="mt-1 text-2xs">Add photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => handleFilesPicked(e.target.files)}
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: "/support" })}
            disabled={createMut.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMut.isPending || !title.trim()}
            className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
          >
            {createMut.isPending ? "Opening…" : "Open ticket"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
