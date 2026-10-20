import { useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatZar } from "@/lib/format";
import { useCancelEvent, useCancelEventPreview } from "@/lib/queries";

interface Slot {
  id: string;
  starts_at: string;
  status: string;
}

/**
 * A Spot calls off its event, or one date of it. Every guest is told why,
 * tickets stop working, and paid guests get a full refund (booking fee
 * included) from TradeSafe escrow. It can't be undone.
 */
export function CancelEventDialog({
  open,
  onOpenChange,
  listingId,
  listingTitle,
  slots,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  slots: Slot[];
}) {
  const upcoming = useMemo(
    () => slots.filter((s) => s.status !== "cancelled" && new Date(s.starts_at).getTime() > Date.now()),
    [slots],
  );
  const [scope, setScope] = useState<"all" | "date">("all");
  const [slotId, setSlotId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const targetSlot = scope === "date" ? slotId || upcoming[0]?.id || null : null;
  const preview = useCancelEventPreview(listingId, targetSlot, open);
  const cancel = useCancelEvent();
  const trimmed = reason.trim();

  const submit = async () => {
    setError(null);
    if (trimmed.length < 5) {
      setError("Tell your guests why (at least a few words).");
      return;
    }
    try {
      const r = await cancel.mutateAsync({ listingId, slotId: targetSlot, reason: trimmed });
      const parts = [
        r.paid_bookings > 0 ? `${r.paid_bookings} paid guest${r.paid_bookings === 1 ? "" : "s"} refunded in full` : null,
        r.free_cancelled > 0 ? `${r.free_cancelled} free booking${r.free_cancelled === 1 ? "" : "s"} cancelled` : null,
      ].filter(Boolean);
      toast.success(scope === "date" ? "Date cancelled." : "Event cancelled.", {
        description: parts.length ? `${parts.join(" · ")}. Guests have been told.` : "No guests were booked.",
      });
      if (r.refunds_queued > 0 || r.refunds_for_hq > 0) {
        toast.message("Some refunds are still being processed", {
          description: "TradeSafe will be retried automatically and TROVE support is following up. You don't need to do anything.",
        });
      }
      setReason("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't cancel this event. Nothing was changed.");
    }
  };

  const p = preview.data;
  const dateFmt = (iso: string) =>
    new Intl.DateTimeFormat("en-ZA", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg",
    }).format(new Date(iso));

  return (
    <Dialog open={open} onOpenChange={(o) => !cancel.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX2 className="h-5 w-5 text-destructive" aria-hidden />
            Cancel {scope === "date" ? "a date" : "this event"}
          </DialogTitle>
          <DialogDescription>
            {listingTitle}. Guests are told straight away, their tickets stop working and everyone who paid
            gets a full refund, booking fee included. This can't be undone.
          </DialogDescription>
        </DialogHeader>

        {upcoming.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">What are you cancelling?</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="cancel-scope" checked={scope === "all"} onChange={() => setScope("all")} />
              The whole event (all upcoming dates)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="cancel-scope" checked={scope === "date"} onChange={() => setScope("date")} />
              One date
            </label>
            {scope === "date" && (
              <select
                aria-label="Date to cancel"
                value={targetSlot ?? ""}
                onChange={(e) => setSlotId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
              >
                {upcoming.map((s) => (
                  <option key={s.id} value={s.id}>{dateFmt(s.starts_at)}</option>
                ))}
              </select>
            )}
          </fieldset>
        )}

        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm" aria-live="polite">
          {preview.isLoading && <p className="text-muted-foreground">Checking bookings…</p>}
          {preview.isError && <p className="text-destructive">Couldn't load the bookings. Try again.</p>}
          {p && p.bookings === 0 && <p>No one is booked{scope === "date" ? " for this date" : ""}.</p>}
          {p && p.bookings > 0 && (
            <ul className="space-y-1">
              <li><strong>{p.bookings}</strong> booking{p.bookings === 1 ? "" : "s"} ({p.guests} guest{p.guests === 1 ? "" : "s"}) will be cancelled.</li>
              {p.paid > 0 && (
                <li><strong>{formatZar(p.refund_kobo)}</strong> goes back to {p.paid} paid guest{p.paid === 1 ? "" : "s"} from escrow. You won't be paid for these bookings.</li>
              )}
            </ul>
          )}
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Reason (guests will see this)</span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. The venue flooded and we can't run the event safely."
            aria-invalid={!!error}
          />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cancel.isPending}>
            Keep the event
          </Button>
          <Button variant="destructive" onClick={submit} disabled={cancel.isPending || preview.isLoading}>
            {cancel.isPending ? "Cancelling…" : p && p.paid > 0 ? "Cancel and refund guests" : "Cancel event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
