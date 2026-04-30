import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Instagram, Twitter, MessageCircle, Mail, Megaphone, Link as LinkIcon, Sparkles } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTroveData } from "@/lib/trove-store";
import { toast } from "sonner";

export const Route = createFileRoute("/promote")({
  head: () => ({ meta: [{ title: "Promote · Trove Engine" }] }),
  component: Promote,
});

function Promote() {
  const { events } = useTroveData();
  const live = events.filter((e) => e.status !== "ended");
  const [eventId, setEventId] = useState(live[0]?.id ?? "");
  const [promoter, setPromoter] = useState("siya");
  const evt = events.find((e) => e.id === eventId);

  const baseUrl = `https://welovetrove.co.za/event/${eventId}`;
  const affiliateUrl = `${baseUrl}?ref=${promoter}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Get the word out"
        title="Promote your event"
        subtitle="Share kits, social templates, and trackable affiliate codes for your promoters."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Event</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}
            className="mt-2 flex h-11 w-full rounded-md border border-input bg-input px-3 text-sm">
            {live.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Push to Seekers */}
        <div className="rounded-2xl border border-primary/40 bg-gradient-brand-soft p-6 shadow-glow-sm lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base font-semibold">Push to Trove Seekers feed</p>
                <p className="text-xs text-muted-foreground">Your event is already live. Boost it to the top of the feed.</p>
              </div>
            </div>
            <Button onClick={() => toast.success("Boosted to top of Seekers feed for 24h")}
              className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
              Boost in Seekers
            </Button>
          </div>
        </div>

        {/* Share links */}
        <div className="rounded-2xl card-flat p-5 shadow-card">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <LinkIcon className="h-4 w-4 text-primary" /> Share link
          </h3>
          <Input readOnly value={baseUrl} className="font-mono text-xs" />
          <Button variant="outline" className="mt-2 w-full" onClick={() => copy(baseUrl, "Link")}>
            <Copy className="mr-1.5 h-4 w-4" /> Copy link
          </Button>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {[
              { icon: Instagram, label: "IG", color: "from-pink-500 to-orange-400" },
              { icon: MessageCircle, label: "WA", color: "from-green-500 to-green-700" },
              { icon: Twitter, label: "X", color: "from-slate-700 to-slate-900" },
              { icon: Mail, label: "Mail", color: "from-blue-500 to-violet-600" },
            ].map((s) => (
              <button key={s.label} onClick={() => toast.success(`Shared on ${s.label}`)}
                className={`flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br ${s.color} p-3 text-white transition hover:opacity-90`}>
                <s.icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Affiliate codes */}
        <div className="rounded-2xl card-flat p-5 shadow-card">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Megaphone className="h-4 w-4 text-primary" /> Promoter affiliate
          </h3>
          <label className="text-xs font-medium">Promoter handle</label>
          <Input value={promoter} onChange={(e) => setPromoter(e.target.value)} className="mt-1" />
          <Input readOnly value={affiliateUrl} className="mt-3 font-mono text-xs" />
          <Button variant="outline" className="mt-2 w-full" onClick={() => copy(affiliateUrl, "Affiliate link")}>
            <Copy className="mr-1.5 h-4 w-4" /> Copy promoter link
          </Button>
          <div className="mt-4 rounded-lg border border-border/40 bg-background/50 p-3 text-xs">
            <p className="font-semibold">Top promoters this week</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li className="flex justify-between"><span>@siya</span><span className="text-success">42 sales</span></li>
              <li className="flex justify-between"><span>@nomvula</span><span className="text-success">31 sales</span></li>
              <li className="flex justify-between"><span>@thabo</span><span className="text-success">19 sales</span></li>
            </ul>
          </div>
        </div>

        {/* Story creative */}
        <div className="rounded-2xl card-flat p-5 shadow-card">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Instagram className="h-4 w-4 text-primary" /> IG story creative
          </h3>
          {evt && (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <div className="relative aspect-[9/16] bg-black">
                <img src={evt.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-end p-4 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">tonight</p>
                  <h4 className="mt-1 font-display text-xl font-bold leading-tight">{evt.title}</h4>
                  <p className="text-[11px] opacity-80">{evt.venue}</p>
                  <div className="mt-3 inline-block self-start rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-semibold">
                    book on trove →
                  </div>
                </div>
              </div>
            </div>
          )}
          <Button variant="outline" className="mt-3 w-full" onClick={() => toast.success("Story creative downloaded")}>
            Download for Stories
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
