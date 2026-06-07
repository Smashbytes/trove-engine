import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Calendar } from "@/components/ui/calendar";
import { useHostUpcomingAvailability } from "@/lib/queries";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar · Trove Engine" }] }),
  component: CalendarPage,
});

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

const dayLabel = (date: Date) =>
  date.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function CalendarPage() {
  const slotsQuery = useHostUpcomingAvailability();
  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const slotDayDates = useMemo(() => {
    const keys = new Set(slots.map((slot) => dayKey(new Date(slot.starts_at))));
    return [...keys].map((key) => new Date(`${key}T00:00:00`));
  }, [slots]);

  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    const key = dayKey(selectedDate);
    return slots
      .filter((slot) => dayKey(new Date(slot.starts_at)) === key)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [slots, selectedDate]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="What's open"
        title="Calendar"
        subtitle="Every upcoming slot across all your listings — so you always know what guests can book."
      />

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-card">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{ hasSlots: slotDayDates }}
            modifiersClassNames={{
              hasSlots:
                "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
            }}
            className="mx-auto"
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Dots mark days with open slots.
          </p>
        </section>

        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">
            {selectedDate ? dayLabel(selectedDate) : "Select a date"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {daySlots.length === 0
              ? "Nothing scheduled this day."
              : `${daySlots.length} slot${daySlots.length === 1 ? "" : "s"} across your listings.`}
          </p>

          {daySlots.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border/60 p-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Open availability from any listing's Slots &amp; schedule page.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {daySlots.map((slot) => (
                <li key={slot.id}>
                  <Link
                    to="/listings/$listingId/slots"
                    params={{ listingId: slot.listing_id }}
                    className="flex items-center gap-4 rounded-2xl border border-border/50 bg-white/[0.02] px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Clock className="h-4 w-4 text-primary" />
                      {timeLabel(slot.starts_at)} – {timeLabel(slot.ends_at)}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm">{slot.listing_title}</span>
                    {slot.capacity_override != null && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {slot.capacity_override}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
