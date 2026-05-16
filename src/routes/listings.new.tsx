import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { ImageUpload } from "@/components/trove/ImageUpload";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { getHostWorkspace } from "@/lib/host-workspace";
import { useCreateListing, useHostCategories } from "@/lib/queries";

export const Route = createFileRoute("/listings/new")({
  head: () => ({
    meta: [
      { title: "New Listing - Trove Engine" },
      {
        name: "description",
        content:
          "Create a real host listing that matches the signed-in Trove host type and verification state.",
      },
    ],
  }),
  component: NewListing,
});

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
    Array<{ name: string; price: string; capacity: string }>
  >([]);

  const [durationMinutes, setDurationMinutes] = useState("");
  const [minGroup, setMinGroup] = useState("");
  const [maxGroup, setMaxGroup] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");
  const [availability, setAvailability] = useState<
    Array<{ startsAt: string; endsAt: string; capacity: string; price: string }>
  >([]);

  const [checkIn, setCheckIn] = useState("14:00");
  const [checkOut, setCheckOut] = useState("10:00");
  const [rooms, setRooms] = useState<
    Array<{ name: string; capacity: string; price: string; description: string }>
  >([]);

  const categoryOptions = useMemo(() => {
    const categories = categoriesQuery.data ?? [];
    const allowedRoots = new Set(workspace.categoryRoots);
    return categories.filter((category) => {
      if (allowedRoots.has(category.id)) return true;
      return category.parent_id ? allowedRoots.has(category.parent_id) : false;
    });
  }, [categoriesQuery.data, workspace.categoryRoots]);

  const saveLabel = hostProfile?.verified
    ? `Create live ${workspace.singularLabel.toLowerCase()}`
    : "Create draft";

  useEffect(() => {
    if (!hostProfile) return;
    setCity((current) => current || hostProfile.city || "");
    setAddress((current) => current || hostProfile.address || "");
  }, [hostProfile]);

  const handleSubmit = async () => {
    if (!hostProfile) return;
    if (!title.trim()) {
      toast.error(`Add a ${workspace.singularLabel.toLowerCase()} title first.`);
      return;
    }

    try {
      const trimmedAmenities = splitItems(amenities);
      const status = hostProfile.verified ? "live" : "draft";

      if (workspace.hostType === "organiser") {
        if (!eventDate) {
          toast.error("Add the event date and time.");
          return;
        }

        const normalizedTiers = ticketTiers
          .map((tier) => ({
            name: tier.name.trim(),
            price: Number(tier.price),
            capacity: Number(tier.capacity),
          }))
          .filter((tier) => tier.name && tier.price > 0 && tier.capacity > 0);

        if (normalizedTiers.length === 0) {
          toast.error("Add at least one ticket tier.");
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
            listing_type: "event",
            booking_mode: "event",
            base_price_kobo: Math.min(...normalizedTiers.map((tier) => tier.price)),
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
          },
          ticketTypes: normalizedTiers.map((tier, index) => ({
            name: tier.name,
            price_kobo: tier.price,
            capacity_total: tier.capacity,
            sort_order: index,
          })),
        });

        toast.success(status === "live" ? "Event published." : "Event draft created.");
        navigate({ to: "/listings/$listingId", params: { listingId: created.id } });
        return;
      }

      if (workspace.hostType === "experience") {
        const normalizedAvailability = availability
          .map((slot) => ({
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            capacity: Number(slot.capacity),
            price: Number(slot.price),
          }))
          .filter((slot) => slot.startsAt && slot.endsAt && slot.capacity > 0 && slot.price > 0);

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
            base_price_kobo: normalizedAvailability.length
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
          },
          availability: normalizedAvailability.map((slot) => ({
            starts_at: new Date(slot.startsAt).toISOString(),
            ends_at: new Date(slot.endsAt).toISOString(),
            capacity_override: slot.capacity,
            price_override_kobo: slot.price,
          })),
        });

        toast.success(status === "live" ? "Experience published." : "Experience draft created.");
        navigate({ to: "/listings/$listingId", params: { listingId: created.id } });
        return;
      }

      if (workspace.hostType === "accommodation") {
        const normalizedRooms = rooms
          .map((room) => ({
            name: room.name.trim(),
            capacity: Number(room.capacity),
            price_kobo: Number(room.price),
            description: room.description.trim() || undefined,
          }))
          .filter((room) => room.name && room.capacity > 0 && room.price_kobo > 0);

        if (normalizedRooms.length === 0) {
          toast.error("Add at least one room type.");
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
            listing_type: "accommodation",
            booking_mode: "reservation",
            base_price_kobo: Math.min(...normalizedRooms.map((room) => room.price_kobo)),
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
          base_price_kobo: 0,
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
        },
      });

      toast.success(status === "live" ? "Venue listing published." : "Venue draft created.");
      navigate({ to: "/listings/$listingId", params: { listingId: created.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create listing.");
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={workspace.heroEyebrow}
        title={`New ${workspace.singularLabel.toLowerCase()}`}
        subtitle={`This form is filtered for the signed-in ${workspace.label.toLowerCase()} account and writes only real schema-backed data.`}
      />

      {!hostProfile?.verified && (
        <div className="mb-6 rounded-[1.75rem] border border-warning/35 bg-warning/8 p-5">
          <p className="eyebrow text-warning">Verification gate</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            This will save as a draft until the host account is verified.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The platform now respects the live-publish gate in Supabase instead of pretending
            unverified hosts can go live immediately.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.44fr]">
        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
            <h2 className="font-display text-2xl font-semibold">Core details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set the real identity of this {workspace.singularLabel.toLowerCase()} first.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={`${workspace.singularLabel} title`}>
                <Input
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

          {workspace.hostType === "organiser" && (
            <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
              <h2 className="font-display text-2xl font-semibold">Event schedule & ticketing</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field label="Event date and time">
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
                    These create real `ticket_types` rows for the event.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTicketTiers((current) => [...current, { name: "", price: "", capacity: "" }])
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add tier
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {ticketTiers.map((tier, index) => (
                  <div
                    key={`${tier.name}-${index}`}
                    className="rounded-2xl border border-border/60 bg-background/45 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
                      <Field label="Tier name">
                        <Input
                          value={tier.name}
                          onChange={(event) =>
                            updateArrayItem(setTicketTiers, index, { name: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Price in kobo">
                        <Input
                          type="number"
                          value={tier.price}
                          onChange={(event) =>
                            updateArrayItem(setTicketTiers, index, { price: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Capacity">
                        <Input
                          type="number"
                          value={tier.capacity}
                          onChange={(event) =>
                            updateArrayItem(setTicketTiers, index, { capacity: event.target.value })
                          }
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeArrayItem(setTicketTiers, index)}
                        className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {workspace.hostType === "experience" && (
            <>
              <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
                <h2 className="font-display text-2xl font-semibold">Experience rules</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <Field label="Duration (minutes)">
                    <Input
                      type="number"
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

              <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">Availability slots</h2>
                    <p className="text-sm text-muted-foreground">
                      These create real `availability` rows.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAvailability((current) => [
                        ...current,
                        { startsAt: "", endsAt: "", capacity: "", price: "" },
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
                      key={`${slot.startsAt}-${index}`}
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
                            value={slot.capacity}
                            onChange={(event) =>
                              updateArrayItem(setAvailability, index, {
                                capacity: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Price in kobo">
                          <Input
                            type="number"
                            value={slot.price}
                            onChange={(event) =>
                              updateArrayItem(setAvailability, index, { price: event.target.value })
                            }
                          />
                        </Field>
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setAvailability, index)}
                          className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {workspace.hostType === "accommodation" && (
            <>
              <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
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

              <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">Room types</h2>
                    <p className="text-sm text-muted-foreground">
                      Rooms are stored in the listing metadata for this property.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRooms((current) => [
                        ...current,
                        { name: "", capacity: "", price: "", description: "" },
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
                      key={`${room.name}-${index}`}
                      className="rounded-2xl border border-border/60 bg-background/45 p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_0.9fr_auto]">
                        <Field label="Room name">
                          <Input
                            value={room.name}
                            onChange={(event) =>
                              updateArrayItem(setRooms, index, { name: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Capacity">
                          <Input
                            type="number"
                            value={room.capacity}
                            onChange={(event) =>
                              updateArrayItem(setRooms, index, { capacity: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Price in kobo">
                          <Input
                            type="number"
                            value={room.price}
                            onChange={(event) =>
                              updateArrayItem(setRooms, index, { price: event.target.value })
                            }
                          />
                        </Field>
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setRooms, index)}
                          className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
            <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
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
          <section className="sticky top-24 rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
            <p className="eyebrow text-primary">Preview</p>
            <h2 className="mt-3 font-display text-3xl font-bold">
              {title || `Untitled ${workspace.singularLabel}`}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {description ||
                `This ${workspace.singularLabel.toLowerCase()} will appear inside the focused ${workspace.label.toLowerCase()} workspace.`}
            </p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
              <PreviewItem label="Host type" value={workspace.label} />
              <PreviewItem
                label="Publish state"
                value={hostProfile?.verified ? "Live on create" : "Draft on create"}
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
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
