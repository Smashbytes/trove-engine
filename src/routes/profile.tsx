import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTroveData, saveProfile, STOCK_COVERS } from "@/lib/trove-store";
import { toast } from "sonner";
import { Building2, Globe, Instagram, Mail, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Spot Profile · Trove Engine" }] }),
  component: Profile,
});

function Profile() {
  const { profile, events } = useTroveData();
  const [p, setP] = useState(profile);
  const [cover, setCover] = useState(profile.cover ?? STOCK_COVERS[0]);

  const save = () => {
    saveProfile({ ...p, cover });
    toast.success("Spot profile updated");
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your home on Trove"
        title="Spot profile"
        subtitle="Customize how your venue shows up to Seekers — logo, bio, socials, follower base."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6 shadow-card space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Spot name</Label>
              <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={p.tagline} onChange={(e) => setP({ ...p, tagline: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea rows={4} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>City / area</Label><Input value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={p.website} onChange={(e) => setP({ ...p, website: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Instagram</Label><Input value={p.instagram} onChange={(e) => setP({ ...p, instagram: e.target.value })} /></div>
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
          <div className="flex justify-end">
            <Button onClick={save} className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
              Save changes
            </Button>
          </div>
        </div>

        {/* Preview */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
            <div className="relative aspect-[16/10]">
              <img src={cover} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              <div className="absolute -bottom-7 left-5 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-card bg-gradient-brand font-display text-lg font-bold text-primary-foreground shadow-glow-sm">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="px-5 pb-5 pt-9">
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <p className="text-xs text-primary">{p.tagline}</p>
              <p className="mt-3 text-sm text-muted-foreground">{p.bio}</p>

              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{p.city}</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{p.email}</p>
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{p.phone}</p>
                <p className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />{p.website}</p>
                <p className="flex items-center gap-2"><Instagram className="h-3.5 w-3.5" />{p.instagram}</p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/40 pt-4 text-center">
                <div>
                  <p className="font-display text-lg font-bold text-gradient">{events.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Events</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-gradient">2.4k</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-gradient">4.8</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</p>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 p-3 text-center text-[10px] text-muted-foreground">
              <Building2 className="mr-1 inline h-3 w-3" /> Live preview · welovetrove.co.za/{p.name.toLowerCase().replace(/ /g, "-")}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
