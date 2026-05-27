import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, Plus } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { TICKET_CATEGORIES, useMyTickets, type TicketCategory, type TicketStatus } from "@/lib/support";

export const Route = createFileRoute("/support/")({
  head: () => ({ meta: [{ title: "Support - Trove Engine" }] }),
  component: SupportPage,
});

const STATUS_TONE: Record<TicketStatus, string> = {
  open: "bg-warning/15 text-warning",
  in_progress: "bg-[#00bfff]/15 text-[#00bfff]",
  resolved: "bg-success/15 text-success",
  closed: "bg-white/8 text-white/55",
};

const CATEGORY_LABEL = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<TicketCategory, string>;

function SupportPage() {
  const ticketsQuery = useMyTickets();
  const tickets = ticketsQuery.data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Support tickets"
        title="Get help from TROVE HQ"
        subtitle="Refunds, complaints, flagging, cancellations — open a ticket and the HQ team will pick it up."
        actions={
          <Link to="/support/new">
            <Button className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
              <Plus className="mr-1.5 h-4 w-4" />
              New ticket
            </Button>
          </Link>
        }
      />

      {tickets.length === 0 ? (
        <div className="rounded-[1.75rem] border border-border/60 bg-card p-12 text-center shadow-card">
          <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="font-display text-2xl font-semibold">No tickets yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Need help with a booking, payout, or listing? Open your first ticket and HQ will respond
            with a status and updates here.
          </p>
          <Link to="/support/new" className="mt-5 inline-block">
            <Button className="bg-gradient-brand text-primary-foreground shadow-glow-sm">
              Open a ticket
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const status = (ticket.status ?? "open") as TicketStatus;
            const category = (ticket.category ?? "other") as TicketCategory;
            return (
              <Link
                key={ticket.id}
                to="/support/$ticketId"
                params={{ ticketId: ticket.id }}
                className="block rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {ticket.ticket_number}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${STATUS_TONE[status]}`}
                      >
                        {status.replace("_", " ")}
                      </span>
                      <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/65">
                        {CATEGORY_LABEL[category] ?? category}
                      </span>
                    </div>
                    <p className="mt-2 font-display text-lg font-semibold text-foreground">
                      {ticket.title}
                    </p>
                    {ticket.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {ticket.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{new Date(ticket.created_at).toLocaleDateString("en-ZA")}</p>
                    {ticket.attachment_urls && ticket.attachment_urls.length > 0 && (
                      <p className="mt-1 text-[10px] uppercase tracking-wider">
                        {ticket.attachment_urls.length} attachment
                        {ticket.attachment_urls.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
