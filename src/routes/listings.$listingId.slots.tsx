import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus, Clock, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAddAvailability,
  useDeleteAvailability,
  useListing,
  useListingAvailability,
} from "@/lib/queries";

export const Route = createFileRoute("/listings/$listingId/slots")({
  head: () => ({ meta: [{ title: "Slots · Listing · Trove Engine" }] }),
  component: ListingSlotsPage,
});

const formatZar = (kobo: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(kobo / 100);

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Combine a calendar date with a "HH:mm" string into a local-time ISO string.
function combine(date: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}

function ListingSlotsPage() {
  const { listingId } = Route.useParams();
  const listingQuery = useListing(listingId);
  const availabilityQuery = useListingAvailability(listingId);
  const addSlot = useAddAvailability();
  const deleteSlot = useDeleteAvailability();

  const slots = useMemo(() => availabilityQuery.data ?? [], [availabilityQuery.data]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");

  // Dates that already have at least one slot — used for the calendar dot.
  const slotDays = useMemo(() => {
    const set = new Set<string>();
    for (const slot of slots) set.add(dayKey(new Date(slot.starts_at)));
    return set;
  }, [slots]);

  const slotDayDates = useMemo(
    () => [...slotDays].map((key) => new Date(`${key}T00:00:00`)),
    [slotDays],
  );

  // Slots on the currently-selected day.
  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    const key = dayKey(selectedDate);
    return slots
      .filter((slot) => dayKey(new Date(slot.starts_at)) === key)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [slots, selectedDate]);

  async function handleAdd() {
    if (!selectedDate) {
      toast.error("Pick a date first.");
      return;
    }
    const startsAt = combine(selectedDate, startTime);
    const endsAt = combine(selectedDate, endTime);
    if (new Date(endsAt) <= new Date(startsAt)) {
      toast.error("End time must be after the start time.");
      return;
    }
    const capacityOverride = capacity.trim() ? Number(capacity) : null;
    if (capacityOverride !== null && (!Number.isFinite(capacityOverride) || capacityOverride < 0)) {
      toast.error("Capacity must be a positive number.");
      return;
    }
    const priceNum = price.trim() ? Number(price) : null;
    if (priceNum !== null && (!Number.isFinite(priceNum) || priceNum < 0)) {
      toast.error("Price must be a positive amount.");
      return;
    }

    try {
      await addSlot.mutateAsync({
        listingId,
        startsAt,
        endsAt,
        capacityOverride,
        priceOverrideKobo: priceNum !== null ? Math.round(priceNum * 100) : null,
      });
      toast.success("Slot added.");
      setCapacity("");
      setPrice("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add slot.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSlot.mutateAsync({ id, listingId });
      toast.success("Slot removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove slot.");
    }
  }

  return (
    <AppShell>
      <Link
        to="/listings/$listingId"
        params={{ listingId }}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to listing
      </Link>

      <PageHeader
        eyebrow="Availability"
        title="Slots & schedule"
        subtitle={
          listingQuery.data
            ? `Open dates and times guests can book for ${listingQuery.data.title}.`
            : "Open the dates and times guests can book."
        }
      />

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Calendar + add form */}
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-card">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
            modifiers={{ hasSlots: slotDayDates }}
            modifiersClassNames={{
              hasSlots:
                "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
            }}
            className="mx-auto"
          />

          <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
            <p className="text-sm font-semibold">
              Add a slot{" "}
              {selectedDate && (
                <span className="font-normal text-muted-foreground">
                  · {selectedDate.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Slot label="Start">
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </Slot>
              <Slot label="End">
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Slot>
              <Slot label="Capacity (optional)">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Listing default"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </Slot>
              <Slot label="Price override (ZAR)">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Listing default"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Slot>
            </div>
            <Button
              onClick={handleAdd}
              disabled={addSlot.isPending || !selectedDate}
              className="w-full bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              {addSlot.isPending ? "Adding…" : "Add slot"}
            </Button>
          </div>
        </section>

        {/* Slots on selected day */}
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">
            {selectedDate ? dayLabel(selectedDate.toISOString()) : "Select a date"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {daySlots.length === 0
              ? "No slots on this day yet — add one on the left."
              : `${daySlots.length} slot${daySlots.length === 1 ? "" : "s"} open this day.`}
          </p>

          <ul className="mt-5 space-y-3">
            {daySlots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center gap-4 rounded-2xl border border-border/50 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-primary" />
                  {timeLabel(slot.starts_at)} – {timeLabel(slot.ends_at)}
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {slot.capacity_override != null && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {slot.capacity_override}
                    </span>
                  )}
                  {slot.price_override_kobo != null && (
                    <span>{formatZar(slot.price_override_kobo)}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(slot.id)}
                  disabled={deleteSlot.isPending}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Remove slot"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function Slot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
