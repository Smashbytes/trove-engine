import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ImagePlus, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import {
  TICKET_CATEGORIES,
  signAttachmentUrl,
  useReplyTicket,
  useTicket,
  useTicketNotes,
  type TicketCategory,
  type TicketStatus,
} from "@/lib/support";

const STATUS_TONE: Record<TicketStatus, string> = {
  open: "bg-warning/15 text-warning",
  in_progress: "bg-[#00bfff]/15 text-[#00bfff]",
  resolved: "bg-success/15 text-success",
  closed: "bg-white/8 text-white/55",
};

const CATEGORY_LABEL = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<TicketCategory, string>;

export const Route = createFileRoute("/support/$ticketId")({
  head: () => ({ meta: [{ title: "Ticket - Trove Engine" }] }),
  component: TicketDetailPage,
});

function AttachmentChip({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    signAttachmentUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border/60 bg-white/[0.03] text-muted-foreground">
        <Paperclip className="h-4 w-4" />
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block h-20 w-20 overflow-hidden rounded-lg border border-border/60 bg-black/20 transition-colors hover:border-primary/50"
    >
      <img src={url} alt="attachment" className="h-full w-full object-cover" />
    </a>
  );
}

function TicketDetailPage() {
  const { ticketId } = Route.useParams();
  const navigate = useNavigate();
  const ticketQuery = useTicket(ticketId);
  const notesQuery = useTicketNotes(ticketId);
  const replyMut = useReplyTicket();

  const [replyText, setReplyText] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);

  function handleReplyFiles(picked: FileList | null) {
    if (!picked) return;
    const next = Array.from(picked).filter((f) => f.type.startsWith("image/"));
    setReplyFiles((prev) => [...prev, ...next].slice(0, 6));
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      await replyMut.mutateAsync({
        ticketId,
        content: replyText,
        files: replyFiles,
      });
      setReplyText("");
      setReplyFiles([]);
      toast.success("Reply sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reply failed");
    }
  }

  if (ticketQuery.isLoading) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
      </AppShell>
    );
  }

  if (!ticketQuery.data) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Support"
          title="Ticket not found"
          subtitle="This ticket may have been closed or doesn't belong to your account."
          actions={
            <Button variant="ghost" onClick={() => navigate({ to: "/support" })}>
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Back to tickets
            </Button>
          }
        />
      </AppShell>
    );
  }

  const ticket = ticketQuery.data;
  const status = (ticket.status ?? "open") as TicketStatus;
  const category = (ticket.category ?? "other") as TicketCategory;
  const notes = notesQuery.data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${CATEGORY_LABEL[category] ?? category} · ${ticket.ticket_number}`}
        title={ticket.title}
        subtitle={`Opened ${new Date(ticket.created_at).toLocaleString("en-ZA")}`}
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

      <div className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${STATUS_TONE[status]}`}
          >
            {status.replace("_", " ")}
          </span>
          <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/65">
            Priority: {ticket.priority}
          </span>
        </div>
        {ticket.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {ticket.description}
          </p>
        )}
        {ticket.attachment_urls && ticket.attachment_urls.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {ticket.attachment_urls.map((path) => (
              <AttachmentChip key={path} path={path} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-foreground">Conversation</h3>
        {notes.length === 0 ? (
          <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
            Nothing here yet. Replies from HQ and your own follow-ups will show up below.
          </p>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {note.author_id === ticket.user_id ? "You" : "TROVE HQ"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleString("en-ZA")}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {note.content}
              </p>
              {note.attachment_urls && note.attachment_urls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {note.attachment_urls.map((path) => (
                    <AttachmentChip key={path} path={path} />
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {status !== "closed" && status !== "resolved" && (
        <form
          onSubmit={handleReply}
          className="space-y-3 rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card"
        >
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Add a reply
          </label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Share more context, evidence, or a follow-up question."
            className="w-full resize-none rounded-lg border border-border/60 bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            {replyFiles.map((file, idx) => (
              <div
                key={idx}
                className="relative h-16 w-16 overflow-hidden rounded-lg border border-border/60 bg-black/20"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setReplyFiles((p) => p.filter((_, i) => i !== idx))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white/90 hover:bg-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {replyFiles.length < 6 && (
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-white/[0.02] text-muted-foreground hover:border-primary/40 hover:text-primary">
                <ImagePlus className="h-4 w-4" />
                <span className="mt-0.5 text-[10px]">Add</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleReplyFiles(e.target.files)}
                />
              </label>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={replyMut.isPending || !replyText.trim()}
              className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              {replyMut.isPending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
