import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle2, Sparkles, Image as ImageIcon } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, STOCK_COVERS, createEvent, ZAR } from "@/lib/trove-store";
import { toast } from "sonner";

export const Route = createFileRoute("/events/new")({
  head: () => ({ meta: [{ title: "Create Event · Trove Engine" }] }),
  component: NewEvent,
});

type Tier = { name: string; price: number; inventory: number; salesEnd?: string };

function NewEvent() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Nightlife");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [date, setDate] = useState("");
  const [cover, setCover] = useState(STOCK_COVERS[0]);

  const [tiers, setTiers] = useState<Tier[]>([
    { name: "General Admission", price: 150, inventory: 100 },
  ]);

  const updateTier = (i: number, patch: Partial<Tier>) => {
    setTiers(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };
  const addTier = () => setTiers([...tiers, { name: "VIP", price: 350, inventory: 30 }]);
  const removeTier = (i: number) => setTiers(tiers.filter((_, idx) => idx !== i));

  const next = () => {
    if (step === 1) {
      if (!title || !venue || !date) { toast.error("Fill in title, venue and date"); return; }
      setStep(2);
    } else if (step === 2) {
      if (tiers.length === 0) { toast.error("Add at least one ticket tier"); return; }
      setStep(3);
    }
  };

  const publish = () => {
    const evt = createEvent({
      title, description, category, venue, city, cover,
      date: new Date(date).toISOString(),
      tiers: tiers.map((t) => ({ name: t.name, price: t.price, inventory: t.inventory })),
    });
    toast.success("Event published — pushing to Trove Seekers feed", {
      description: `${evt.title} is now live for Seekers in ${city}.`,
    });
    setTimeout(() => navigate({ to: "/events/$eventId", params: { eventId: evt.id } }), 600);
  };

  const totalCap = tiers.reduce((s, t) => s + Number(t.inventory || 0), 0);
  const potentialRev = tiers.reduce((s, t) => s + Number(t.price || 0) * Number(t.inventory || 0), 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Step ${step} of 3`}
        title="Create a new event"
        subtitle="Set the stage, drop the tickets, push to the Seekers feed."
      />

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
              step >= n ? "bg-gradient-brand text-primary-foreground shadow-glow-sm" : "bg-muted text-muted-foreground"
            }`}>{step > n ? <CheckCircle2 className="h-4 w-4" /> : n}</div>
            <div className={`h-0.5 flex-1 transition ${step > n ? "bg-gradient-brand" : "bg-muted"}`} />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                className="rounded-2xl border border-border/60 bg-card p-6 shadow-card space-y-5">
                <h3 className="font-display text-xl font-semibold">Event details</h3>
                <div className="space-y-2">
                  <Label htmlFor="title">Event title</Label>
                  <Input id="title" placeholder="e.g. Techno Tuesdays" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-input px-3 text-sm">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date & time</Label>
                    <Input id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input id="venue" placeholder="Neon Underground" value={venue} onChange={(e) => setVenue(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City / area</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={4} placeholder="What makes this night unmissable?"
                    value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cover image</Label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {STOCK_COVERS.map((c) => (
                      <button key={c} type="button" onClick={() => setCover(c)}
                        className={`aspect-video overflow-hidden rounded-lg border-2 transition ${cover === c ? "border-primary shadow-glow-sm" : "border-transparent opacity-60 hover:opacity-100"}`}>
                        <img src={c} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                className="rounded-2xl border border-border/60 bg-card p-6 shadow-card space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-semibold">Ticket tiers</h3>
                  <Button size="sm" variant="outline" onClick={addTier}>
                    <Plus className="mr-1 h-4 w-4" /> Add tier
                  </Button>
                </div>
                {tiers.map((t, i) => (
                  <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-4">
                    <div className="grid gap-3 sm:grid-cols-12">
                      <div className="space-y-1.5 sm:col-span-5">
                        <Label className="text-xs">Tier name</Label>
                        <Input value={t.name} onChange={(e) => updateTier(i, { name: e.target.value })} placeholder="VIP / Early Bird / GA" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-3">
                        <Label className="text-xs">Price (ZAR)</Label>
                        <Input type="number" value={t.price} onChange={(e) => updateTier(i, { price: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-3">
                        <Label className="text-xs">Inventory</Label>
                        <Input type="number" value={t.inventory} onChange={(e) => updateTier(i, { inventory: Number(e.target.value) })} />
                      </div>
                      <div className="flex items-end sm:col-span-1">
                        <Button size="icon" variant="ghost" onClick={() => removeTier(i)} disabled={tiers.length === 1}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                  <span className="text-muted-foreground">Total capacity · Potential revenue</span>
                  <span className="font-display font-bold">
                    {totalCap} tickets · <span className="text-gradient">{ZAR(potentialRev)}</span>
                  </span>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                className="rounded-2xl border border-border/60 bg-card p-6 shadow-card space-y-5">
                <h3 className="font-display text-xl font-semibold">Review & publish</h3>
                <div className="overflow-hidden rounded-xl border border-border/60">
                  <div className="relative aspect-[16/9]">
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">{category}</span>
                      <h4 className="mt-2 font-display text-2xl font-bold">{title || "Untitled event"}</h4>
                      <p className="text-sm text-muted-foreground">{venue} · {city}</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  {tiers.map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.inventory} available</p>
                      </div>
                      <p className="font-display font-bold">{ZAR(Number(t.price))}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Publishing pushes this event to the Trove Seekers feed instantly.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => (step > 1 ? setStep(step - 1) : navigate({ to: "/events" }))}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> {step > 1 ? "Back" : "Cancel"}
            </Button>
            {step < 3 ? (
              <Button onClick={next} className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={publish} className="bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-95">
                <Sparkles className="mr-1.5 h-4 w-4" /> Publish event
              </Button>
            )}
          </div>
        </div>

        {/* Live preview */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border/60 bg-card p-5 shadow-card">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seekers preview</p>
            <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
              <div className="relative aspect-[4/5]">
                {cover ? (
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">{category}</span>
                  <h4 className="mt-2 font-display text-base font-bold leading-tight">{title || "Your event title"}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">{venue || "Venue"} · {city}</p>
                  <p className="mt-2 text-sm font-bold text-gradient">
                    {tiers.length > 0 ? `from ${ZAR(Math.min(...tiers.map((t) => t.price)))}` : ""}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              This is how Seekers see your drop on the Trove app feed.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
