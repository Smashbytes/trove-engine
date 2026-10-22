import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { ImageUpload } from "@/components/trove/ImageUpload";
import { PageHeader } from "@/components/trove/PageHeader";
import { PermissionGate } from "@/components/trove/PermissionGate";
import { Field } from "@/components/trove/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { randsToCents } from "@/lib/format";
import { getHostWorkspace } from "@/lib/host-workspace";
import { useCreateListing, useHostCategories } from "@/lib/queries";
import { REFUND_POLICIES, type RefundPolicy } from "@/lib/refund-policy";

export const Route = createFileRoute("/listings/new")({
  head: () => ({
    meta: [
      { title: "New Listing - Trove Engine" },
      {
        name: "description",
        content: "Create a new listing for your Spot on TROVE.",
      },
    ],
  }),
  component: NewListing,
});

// Repeating rows (tiers, slots, rooms, questions) need a stable React key.
// Keying on an editable value remounts the row on every keystroke and the
// input loses focus.
function rowId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const isPositiveInt = (value: string) => /^\d+$/.test(value.trim()) && Number(value) > 0;

/** Validate every row; returns row-id → message for the rows that need fixing. */
function validateRows<T extends { id: string }>(
  rows: T[],
  check: (row: T) => string | null,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    const message = check(row);
    if (message) errors[row.id] = message;
  }
  return errors;
}

const PRICE_HINT = "In Rands, e.g. 150 or 149.99";

function NewListing() {
  const navigate = useNavigate();
  const { hostProfile } = useAuth();
  const workspace = getHostWorkspace(hostProfile?.host_type);
  const categoriesQuery = useHostCategories();
  const createListing = useCreateListing();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState(hostProfile?.city ?? "");
  const [address, setAddress] = useState(hostProfile?.address ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [amenities, setAmenities] = useState("");
  const [venueCapacity, setVenueCapacity] = useState("0");
  const [venueDressCode, setVenueDressCode] = useState("");
  const [venueAgeRestriction, setVenueAgeRestriction] = useState("");

  const [eventDate, setEventDate] = useState("");
  const [doorsOpen, setDoorsOpen] = useState("");
  const [doorsClose, setDoorsClose] = useState("");
  const [ticketTiers, setTicketTiers] = useState<
    Array<{ id: string; name: string; price: string; capacity: string }>
  >([]);

  const [durationMinutes, setDurationMinutes] = useState("");
  const [minGroup, setMinGroup] = useState("");
  const [maxGroup, setMaxGroup] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");
  const [availability, setAvailability] = useState<
    Array<{ id: string; startsAt: string; endsAt: string; capacity: string; price: string }>
  >([]);

  const [checkIn, setCheckIn] = useState("14:00");
  const [checkOut, setCheckOut] = useState("10:00");
  const [rooms, setRooms] = useState<
    Array<{ id: string; name: string; capacity: string; price: string; description: string }>
  >([]);

  // Extra checkout questions guests answer when booking this listing.
  const [customQuestions, setCustomQuestions] = useState<
    Array<{
      id: string;
      label: string;
      type: "text" | "textarea" | "select";
      options: string;
      required: boolean;
    }>
  >([]);

  // When guests may ask for their money back (enforced by request_refund()).
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicy>("standard");

  // Inline validation: field errors keyed by field name, row errors by row id.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const categoryOptions = useMemo(() => {
    const categories = categoriesQuery.data ?? [];
    const allowedRoots = new Set(workspace.categoryRoots);
    return categories.filter((category) => {
      if (allowedRoots.has(category.id)) return true;
      return category.parent_id ? allowedRoots.has(category.parent_id) : false;
    });
  }, [categoriesQuery.data, workspace.categoryRoots]);

  const escrowReady = hostProfile?.tradesafe_status === "escrow_ready";
  // Any Spot can sell (TROVE "Verified" is the Partner badge, not a licence).
  // The database still blocks PAID listings until TradeSafe has the account.
  const saveLabel = escrowReady
    ? `Create live ${workspace.singularLabel.toLowerCase()}`
    : "Create draft";

  useEffect(() => {
    if (!hostProfile) return;
    setCity((current) => current || hostProfile.city || "");
    setAddress((current) => current || hostProfile.address || "");
  }, [hostProfile]);

  const priceError = (price: string) =>
    Number.isNaN(randsToCents(price)) || randsToCents(price) <= 0
      ? "Enter a price in Rands, e.g. 150"
      : null;

  // Validate everything up front and show messages next to the fields, so
  // nothing the host typed is silently dropped.
  const validate = () => {
    const fields: Record<string, string> = {};
    if (!title.trim()) fields.title = `Give your ${workspace.singularLabel.toLowerCase()} a title.`;

    let rows: Record<string, string> = {};
    if (workspace.hostType === "organiser") {
      if (!eventDate) fields.eventDate = "Add the event date and time.";
      if (ticketTiers.length === 0) fields.tiers = "Add at least one ticket tier.";
      rows = validateRows(ticketTiers, (tier) => {
        if (!tier.name.trim()) return "Name this tier, e.g. General or VIP.";
        const price = priceError(tier.price);
        if (price) return price;
        if (!isPositiveInt(tier.capacity)) return "Capacity must be a whole number above 0.";
        return null;
      });
    }
    if (workspace.hostType === "experience") {
      rows = validateRows(availability, (slot) => {
        if (!slot.startsAt || !slot.endsAt) return "Add a start and end time for this slot.";
        if (new Date(slot.endsAt) <= new Date(slot.startsAt)) return "The slot must end after it starts.";
        if (!isPositiveInt(slot.capacity)) return "Capacity must be a whole number above 0.";
        return priceError(slot.price);
      });
    }
    if (workspace.hostType === "accommodation") {
      if (rooms.length === 0) fields.rooms = "Add at least one room type.";
      rows = validateRows(rooms, (room) => {
        if (!room.name.trim()) return "Name this room type.";
        if (!isPositiveInt(room.capacity)) return "Sleeps must be a whole number above 0.";
        return priceError(room.price);
      });
    }

    setFieldErrors(fields);
    setRowErrors(rows);
    const count = Object.keys(fields).length + Object.keys(rows).length;
    if (count > 0) {
      toast.error(count === 1 ? "Fix the highlighted field." : `Fix the ${count} highlighted fields.`);
      // Move keyboard/screen-reader focus to the first problem.
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
    }
    return count === 0;
  };

  const handleSubmit = async () => {
    if (!hostProfile) return;
    if (!validate()) return;

    try {
      const trimmedAmenities = splitItems(amenities);
      const status = escrowReady ? "live" : "draft";
      const normalizedQuestions = customQuestions
        .map((q, i) => ({
          id: `q${i + 1}`,
          label: q.label.trim(),
          type: q.type,
          options: q.type === "select" ? splitItems(q.options) : undefined,
          required: q.required,
        }))
        .filter((q) => q.label);

      if (workspace.hostType === "organiser") {
        // validate() guarantees every tier is complete; prices are cents.
        const normalizedTiers = ticketTiers.map((tier) => ({
          name: tier.name.trim(),
          price: randsToCents(tier.price),
          capacity: Number(tier.capacity),
        }));

        const created = await createListing.mutateAsync({
          listing: {
            host_id: hostProfile.user_id,
            category_id: categoryId || null,
            title: title.trim(),
            slug: slugify(title),
            description: description.trim() || null,
            status,
            listing_type: "event",
            booking_mode: "event",
            base_price_cents: Math.min(...normalizedTiers.map((tier) => tier.price)),
            capacity: normalizedTiers.reduce((sum, tier) => sum + tier.capacity, 0),
            address: address.trim() || null,
            city: city.trim() || null,
            lat: hostProfile.lat,
            lng: hostProfile.lng,
            amenities: trimmedAmenities,
            cover_url: coverUrl.trim() || null,
            metadata: {
              date: new Date(eventDate).toISOString(),
              doors_open: doorsOpen || undefined,
              doors_close: doorsClose || undefined,
            },
            custom_questions: normalizedQuestions,
            ...({ refund_policy: refundPolicy } as object),
          },
          ticketTypes: normalizedTiers.map((tier, index) => ({
            name: tier.name,
            price_cents: tier.price,
            capacity_total: tier.capacity,
            sort_order: index,
          })),
        });

        toast.success(status === "live" ? "Event published." : "Event draft created.");
        navigate({ to: "/listings/$listingId", params: { listingId: created.id } });
        return;
      }

      if (workspace.hostType === "experience") {
        const normalizedAvailability = availability.map((slot) => ({
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          capacity: Number(slot.capacity),
          price: randsToCents(slot.price),
        }));

        const created = await createListing.mutateAsync({
          listing: {
            host_id: hostProfile.user_id,
            category_id: categoryId || null,
            title: title.trim(),
            slug: slugify(title),
            description: description.trim() || null,
            status,
            listing_type: "experience",
            booking_mode: "slot",
            base_price_cents: normalizedAvailability.length
              ? Math.min(...normalizedAvailability.map((slot) => slot.price))
              : 0,
            capacity: normalizedAvailability.reduce((sum, slot) => sum + slot.capacity, 0),
            address: address.trim() || null,
            city: city.trim() || null,
            lat: hostProfile.lat,
            lng: hostProfile.lng,
            amenities: trimmedAmenities,
            cover_url: coverUrl.trim() || null,
            duration_min: Number(durationMinutes) || null,
            metadata: {
              duration_minutes: Number(durationMinutes) || undefined,
              min_group: Number(minGroup) || undefined,
              max_group: Number(maxGroup) || undefined,
              safety_notes: safetyNotes.trim() || undefined,
            },
            ...({ custom_questions: normalizedQuestions, refund_policy: refundPolicy } as object),
          },
          availability: normalizedAvailability.map((slot) => ({
            starts_at: new Date(slot.startsAt).toISOString(),
            ends_at: new Date(slot.endsAt).toISOString(),
            capacity_override: slot.capacity,
            price_override_cents: slot.price,
          })),
        });

        toast.success(status === "live" ? "Experience published." : "Experience draft created.");
        navigate({ to: "/listings/$listingId", params: { listingId: created.id } });
        return;
      }

      if (workspace.hostType === "accommodation") {
        const normalizedRooms = rooms.map((room) => ({
          name: room.name.trim(),
          capacity: Number(room.capacity),
          price_cents: randsToCents(room.price),
          description: room.description.trim() || undefined,
        }));

        const created = await createListing.mutateAsync({
          listing: {
            host_id: hostProfile.user_id,
            category_id: categoryId || null,
            title: title.trim(),
            slug: slugify(title),
            description: description.trim() || null,
            status,
            listing_type: "accommodation",
            booking_mode: "reservation",
            base_price_cents: Math.min(...normalizedRooms.map((room) => room.price_cents)),
            capacity: normalizedRooms.reduce((sum, room) => sum + room.capacity, 0),
            address: address.trim() || null,
            city: city.trim() || null,
            lat: hostProfile.lat,
            lng: hostProfile.lng,
            amenities: trimmedAmenities,
            cover_url: coverUrl.trim() || null,
            metadata: {
              check_in: checkIn,
              check_out: checkOut,
              amenities: trimmedAmenities,
              rooms: normalizedRooms,
            },
            ...({ custom_questions: normalizedQuestions, refund_policy: refundPolicy } as object),
          },
        });

        toast.success(status === "live" ? "Stay published." : "Stay draft created.");
        navigate({ to: "/listings/$listingId", params: { listingId: created.id } });
        return;
      }

      const created = await createListing.mutateAsync({
        listing: {
          host_id: hostProfile.user_id,
          category_id: categoryId || null,
          title: title.trim(),
          slug: slugify(title),
          description: description.trim() || null,
          status,
          listing_type: "venue",
          booking_mode: "reservation",
          base_price_cents: 0,
          capacity: Number(venueCapacity) || null,
          address: address.trim() || null,
          city: city.trim() || null,
          lat: hostProfile.lat,
          lng: hostProfile.lng,
          amenities: trimmedAmenities,
          cover_url: coverUrl.trim() || null,
          metadata: {
            dress_code: venueDressCode.trim() || undefined,
            age_restriction: Number(venueAgeRestriction) || undefined,
            amenities: trimmedAmenities,
          },
          ...({ custom_questions: normalizedQuestions, refund_policy: refundPolicy } as object),
        },
      });

      toast.success(status === "live" ? "Venue listing published." : "Venue draft created.");
      navigate({ to: "/listings/$listingId", params: { listingId: created.id } });
    } catch (error) {
      toast.error(friendlyError(error, "We couldn't save this listing. Please try again."));
    }
  };

  return (
    <AppShell>
      <PermissionGate perm="listings.manage">
      <PageHeader
        eyebrow={workspace.heroEyebrow}
        title={`New ${workspace.singularLabel.toLowerCase()}`}
        subtitle={`Add the details guests need to discover and book your ${workspace.singularLabel.toLowerCase()}.`}
      />

      {!escrowReady && (
        <div className="mb-6 rounded-card border border-warning/35 bg-warning/8 p-5">
          <p className="eyebrow text-warning">Payout account needed</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            This will save as a draft until your payout account is set up.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Guests pay into TradeSafe escrow, so paid listings need your payout account first. Verify
            it from Settings, then publish the draft from the listing page.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.44fr]">
        <div className="space-y-6">
          <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
            <h2 className="font-display text-2xl font-semibold">Core details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with what guests see first.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={`${workspace.singularLabel} title`} error={fieldErrors.title}>
                <Input
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={`Name this ${workspace.singularLabel.toLowerCase()}`}
                />
              </Field>
              <Field label="Category">
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
                >
                  <option value="">Choose a category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="City">
                <Input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Johannesburg"
                />
              </Field>
              <Field label="Address">
                <Input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Street, area, or venue address"
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4">
              <Field label="Description">
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={`Describe the real guest experience for this ${workspace.singularLabel.toLowerCase()}.`}
                />
              </Field>
              <Field label="Amenities (comma separated)">
                <Input
                  value={amenities}
                  onChange={(event) => setAmenities(event.target.value)}
                  placeholder="Parking, Wi-Fi, private room, guides included"
                />
              </Field>
              <Field label="Cover image">
                <ImageUpload value={coverUrl} onChange={setCoverUrl} />
              </Field>
            </div>
          </section>

          <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold">More info from guests</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask Seekers anything extra you need before they check out — dietary needs, group names, a waiver number.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCustomQuestions((current) => [
                    ...current,
                    { id: rowId(), label: "", type: "text", options: "", required: false },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add question
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {customQuestions.map((q, index) => (
                <div key={q.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_0.5fr_auto]">
                    <Field label="Question">
                      <Input
                        value={q.label}
                        onChange={(event) =>
                          updateArrayItem(setCustomQuestions, index, { label: event.target.value })
                        }
                        placeholder="Any dietary requirements?"
                      />
                    </Field>
                    <Field label="Answer type">
                      <select
                        value={q.type}
                        onChange={(event) =>
                          updateArrayItem(setCustomQuestions, index, {
                            type: event.target.value as "text" | "textarea" | "select",
                          })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
                      >
                        <option value="text">Short text</option>
                        <option value="textarea">Long text</option>
                        <option value="select">Choose one</option>
                      </select>
                    </Field>
                    <button
                      type="button"
                      onClick={() => removeArrayItem(setCustomQuestions, index)}
                      aria-label={`Remove question ${index + 1}`}
                      className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {q.type === "select" && (
                    <div className="mt-3">
                      <Field label="Options (comma separated)">
                        <Input
                          value={q.options}
                          onChange={(event) =>
                            updateArrayItem(setCustomQuestions, index, { options: event.target.value })
                          }
                          placeholder="Vegetarian, Vegan, No restrictions"
                        />
                      </Field>
                    </div>
                  )}
                  <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(event) =>
                        updateArrayItem(setCustomQuestions, index, { required: event.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    Required before checkout
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
            <h2 className="font-display text-2xl font-semibold">Refund policy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What guests get back if they cancel. They see it before they pay; TradeSafe returns their share
              from escrow and you're paid the rest after the event. TROVE's R8 booking fee is never refunded
              when a guest cancels. If you cancel the event, every guest gets a full refund.
            </p>
            <div className="mt-5 max-w-md">
              <Field label="When a guest cancels">
                <select
                  value={refundPolicy}
                  onChange={(event) => setRefundPolicy(event.target.value as RefundPolicy)}
                  className="flex h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
                >
                  {REFUND_POLICIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="mt-2 text-xs text-muted-foreground">
                {REFUND_POLICIES.find((p) => p.value === refundPolicy)?.detail}
              </p>
            </div>
          </section>

          {workspace.hostType === "organiser" && (
            <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
              <h2 className="font-display text-2xl font-semibold">Event schedule & ticketing</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field label="Event date and time" error={fieldErrors.eventDate}>
                  <Input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </Field>
                <Field label="Doors open">
                  <Input
                    type="time"
                    value={doorsOpen}
                    onChange={(event) => setDoorsOpen(event.target.value)}
                  />
                </Field>
                <Field label="Doors close">
                  <Input
                    type="time"
                    value={doorsClose}
                    onChange={(event) => setDoorsClose(event.target.value)}
                  />
                </Field>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Ticket tiers</p>
                  <p className="text-sm text-muted-foreground">
                    Each tier is a ticket type guests can buy, e.g. Early bird, General, VIP.
                  </p>
                  {fieldErrors.tiers && (
                    <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                      {fieldErrors.tiers}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTicketTiers((current) => [
                      ...current,
                      { id: rowId(), name: "", price: "", capacity: "" },
                    ])
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add tier
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {ticketTiers.map((tier, index) => (
                  <div
                    key={tier.id}
                    className="rounded-2xl border border-border/60 bg-background/45 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
                      <Field label="Tier name">
                        <Input
                          maxLength={60}
                          aria-invalid={!!rowErrors[tier.id] && !tier.name.trim()}
                          value={tier.name}
                          onChange={(event) =>
                            updateArrayItem(setTicketTiers, index, { name: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Price (R)">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="150"
                          title={PRICE_HINT}
                          aria-invalid={!!rowErrors[tier.id] && !!priceError(tier.price)}
                          value={tier.price}
                          onChange={(event) =>
                            updateArrayItem(setTicketTiers, index, { price: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Capacity">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          aria-invalid={!!rowErrors[tier.id] && !isPositiveInt(tier.capacity)}
                          value={tier.capacity}
                          onChange={(event) =>
                            updateArrayItem(setTicketTiers, index, { capacity: event.target.value })
                          }
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeArrayItem(setTicketTiers, index)}
                        aria-label={`Remove tier ${tier.name.trim() || index + 1}`}
                        className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <RowError message={rowErrors[tier.id]} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {workspace.hostType === "experience" && (
            <>
              <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
                <h2 className="font-display text-2xl font-semibold">Experience rules</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <Field label="Duration (minutes)">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={durationMinutes}
                      onChange={(event) => setDurationMinutes(event.target.value)}
                    />
                  </Field>
                  <Field label="Minimum group">
                    <Input
                      type="number"
                      value={minGroup}
                      onChange={(event) => setMinGroup(event.target.value)}
                    />
                  </Field>
                  <Field label="Maximum group">
                    <Input
                      type="number"
                      value={maxGroup}
                      onChange={(event) => setMaxGroup(event.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Safety notes">
                    <Textarea
                      rows={3}
                      value={safetyNotes}
                      onChange={(event) => setSafetyNotes(event.target.value)}
                      placeholder="Equipment, waiver, age, weather, or mobility notes."
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">Availability slots</h2>
                    <p className="text-sm text-muted-foreground">
                      The dates and times guests can book this experience.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAvailability((current) => [
                        ...current,
                        { id: rowId(), startsAt: "", endsAt: "", capacity: "", price: "" },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add slot
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {availability.map((slot, index) => (
                    <div
                      key={slot.id}
                      className="rounded-2xl border border-border/60 bg-background/45 p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[1.4fr_1.4fr_0.9fr_0.9fr_auto]">
                        <Field label="Starts at">
                          <Input
                            type="datetime-local"
                            value={slot.startsAt}
                            onChange={(event) =>
                              updateArrayItem(setAvailability, index, {
                                startsAt: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Ends at">
                          <Input
                            type="datetime-local"
                            value={slot.endsAt}
                            onChange={(event) =>
                              updateArrayItem(setAvailability, index, {
                                endsAt: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Capacity">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            aria-invalid={!!rowErrors[slot.id] && !isPositiveInt(slot.capacity)}
                            value={slot.capacity}
                            onChange={(event) =>
                              updateArrayItem(setAvailability, index, {
                                capacity: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Price (R)">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="350"
                            title={PRICE_HINT}
                            aria-invalid={!!rowErrors[slot.id] && !!priceError(slot.price)}
                            value={slot.price}
                            onChange={(event) =>
                              updateArrayItem(setAvailability, index, { price: event.target.value })
                            }
                          />
                        </Field>
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setAvailability, index)}
                          aria-label={`Remove slot ${index + 1}`}
                          className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <RowError message={rowErrors[slot.id]} />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {workspace.hostType === "accommodation" && (
            <>
              <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
                <h2 className="font-display text-2xl font-semibold">Stay policies</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Check-in time">
                    <Input
                      type="time"
                      value={checkIn}
                      onChange={(event) => setCheckIn(event.target.value)}
                    />
                  </Field>
                  <Field label="Check-out time">
                    <Input
                      type="time"
                      value={checkOut}
                      onChange={(event) => setCheckOut(event.target.value)}
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">Room types</h2>
                    <p className="text-sm text-muted-foreground">
                      The room types guests can book, with the price per night.
                    </p>
                    {fieldErrors.rooms && (
                      <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                        {fieldErrors.rooms}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRooms((current) => [
                        ...current,
                        { id: rowId(), name: "", capacity: "", price: "", description: "" },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add room
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {rooms.map((room, index) => (
                    <div
                      key={room.id}
                      className="rounded-2xl border border-border/60 bg-background/45 p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_0.9fr_auto]">
                        <Field label="Room name">
                          <Input
                            maxLength={60}
                            aria-invalid={!!rowErrors[room.id] && !room.name.trim()}
                            value={room.name}
                            onChange={(event) =>
                              updateArrayItem(setRooms, index, { name: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Sleeps">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            aria-invalid={!!rowErrors[room.id] && !isPositiveInt(room.capacity)}
                            value={room.capacity}
                            onChange={(event) =>
                              updateArrayItem(setRooms, index, { capacity: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Price per night (R)">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="1200"
                            title={PRICE_HINT}
                            aria-invalid={!!rowErrors[room.id] && !!priceError(room.price)}
                            value={room.price}
                            onChange={(event) =>
                              updateArrayItem(setRooms, index, { price: event.target.value })
                            }
                          />
                        </Field>
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setRooms, index)}
                          aria-label={`Remove room ${room.name.trim() || index + 1}`}
                          className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <RowError message={rowErrors[room.id]} />
                      <div className="mt-3">
                        <Field label="Description">
                          <Textarea
                            rows={2}
                            value={room.description}
                            onChange={(event) =>
                              updateArrayItem(setRooms, index, { description: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {workspace.hostType === "venue" && (
            <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
              <h2 className="font-display text-2xl font-semibold">Venue context</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field label="Venue capacity">
                  <Input
                    type="number"
                    value={venueCapacity}
                    onChange={(event) => setVenueCapacity(event.target.value)}
                  />
                </Field>
                <Field label="Dress code">
                  <Input
                    value={venueDressCode}
                    onChange={(event) => setVenueDressCode(event.target.value)}
                    placeholder="Smart casual, nightlife, family"
                  />
                </Field>
                <Field label="Age restriction">
                  <Input
                    type="number"
                    value={venueAgeRestriction}
                    onChange={(event) => setVenueAgeRestriction(event.target.value)}
                  />
                </Field>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="sticky top-24 rounded-card border border-border/60 bg-card p-6 shadow-card">
            <p className="eyebrow text-primary">Preview</p>
            <h2 className="mt-3 font-display text-3xl font-bold">
              {title || `Untitled ${workspace.singularLabel}`}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {description ||
                `Guests will see this description on TROVE once your ${workspace.singularLabel.toLowerCase()} is live.`}
            </p>

            <div className="mt-5 space-y-3 rounded-tile border border-white/8 bg-white/[0.03] p-4">
              <PreviewItem label="Host type" value={workspace.label} />
              <PreviewItem
                label="Publish state"
                value={escrowReady ? "Live on create" : "Draft on create"}
              />
              <PreviewItem
                label="Category"
                value={
                  categoryOptions.find((category) => category.id === categoryId)?.name ??
                  "Not selected"
                }
              />
              <PreviewItem label="City" value={city || "Not set"} />
              <PreviewItem label="Address" value={address || "Not set"} />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={createListing.isPending}
              className="mt-6 h-12 w-full bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              {createListing.isPending ? "Saving..." : saveLabel}
            </Button>
          </section>
        </aside>
      </div>
      </PermissionGate>
    </AppShell>
  );
}

function RowError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function splitItems(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function updateArrayItem<T>(
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  index: number,
  patch: Partial<T>,
) {
  setState((current) =>
    current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  );
}

function removeArrayItem<T>(setState: React.Dispatch<React.SetStateAction<T[]>>, index: number) {
  setState((current) => current.filter((_, itemIndex) => itemIndex !== index));
}
