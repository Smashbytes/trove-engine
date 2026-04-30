// Trove Story Studio — native reel creator. Vendored OpenReel-style editor adapted for Trove.
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film, Plus, Download, Trash2, Sparkles, X, Image as ImageIcon,
  Type, Tag, MapPin, Megaphone, Clock,
} from "lucide-react";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTroveData, ZAR, LISTING_TYPE_IMAGE } from "@/lib/trove-store";
import {
  useReels, saveReel, publishReel, unpublishReel, deleteReel,
  activeReels, timeLeft, MAX_ACTIVE_REELS,
  type Reel, type ReelLayer,
} from "@/lib/reels-store";
import { putBlob, getBlob } from "@/lib/idb";
import { toast } from "sonner";

const uid = () => "reel_" + Math.random().toString(36).slice(2, 10);

export default function StudioApp() {
  const reels = useReels();
  const { listings, profile } = useTroveData();
  const active = activeReels(reels);
  const drafts = reels.filter((r) => r.status === "draft");
  const [editing, setEditing] = useState<Reel | null>(null);

  const newReel = () => {
    const seed = listings[0];
    const baseImage = seed?.cover ?? LISTING_TYPE_IMAGE.event;
    const r: Reel = {
      id: uid(),
      spotName: profile.name,
      listingId: seed?.id,
      baseImage,
      thumbnail: baseImage,
      durationMs: 5000,
      layers: [
        { kind: "title", text: seed?.title ?? "Tonight at " + profile.name, color: "#fff" },
        { kind: "location", text: seed?.venue ?? profile.city },
        { kind: "cta", text: "Book on Trove" },
      ],
      status: "draft",
      createdAt: Date.now(),
    };
    saveReel(r);
    setEditing(r);
  };

  return (
    <>
      <PageHeader
        eyebrow="Story Studio"
        title="Create a Trove reel"
        subtitle="Reels live on Trove for 48 hours, push to Seekers as a Story Update on your Spot, and export as MP4 to share anywhere."
        actions={
          <Button onClick={newReel} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-1.5 h-4 w-4" /> New reel
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl card-flat p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{active.length} / {MAX_ACTIVE_REELS} active reels</p>
            <p className="text-xs text-muted-foreground">Each published reel lives on Trove for 48 hours.</p>
          </div>
        </div>
        <div className="ml-auto flex h-2 w-40 overflow-hidden rounded-full bg-[var(--hairline)]">
          <div className="h-full bg-primary" style={{ width: `${(active.length / MAX_ACTIVE_REELS) * 100}%` }} />
        </div>
      </div>

      {reels.length === 0 && (
        <EmptyState onCreate={newReel} />
      )}

      {active.length > 0 && (
        <Section title="Live on Seekers" hint="Counting down — Seekers see these as Story Updates on your Spot.">
          <ReelGrid reels={active} onEdit={setEditing} />
        </Section>
      )}

      {drafts.length > 0 && (
        <Section title="Drafts" hint="Not visible to Seekers. Publish when you're ready.">
          <ReelGrid reels={drafts} onEdit={setEditing} />
        </Section>
      )}

      <SeekersPreview active={active} spotName={profile.name} />

      <AnimatePresence>
        {editing && <Editor reel={editing} onClose={() => setEditing(null)} />}
      </AnimatePresence>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl card-flat p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Film className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-2xl font-semibold">Your Story Studio is empty</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Create your first reel — it'll appear at the top of the Seekers feed as a Story Update for 48 hours.
      </p>
      <Button onClick={onCreate} className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90">
        <Sparkles className="mr-1.5 h-4 w-4" /> Create your first reel
      </Button>
    </div>
  );
}

function ReelGrid({ reels, onEdit }: { reels: Reel[]; onEdit: (r: Reel) => void }) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {reels.map((r) => (
        <button key={r.id} onClick={() => onEdit(r)}
          className="group relative aspect-[9/16] overflow-hidden rounded-xl ring-hairline lift-on-hover">
          <img src={r.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 top-2 px-2 flex justify-between">
            {r.status === "published" ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">Live</span>
            ) : (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Draft</span>
            )}
            {r.status === "published" && (
              <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur">
                <Clock className="h-2.5 w-2.5" /> {timeLeft(r)}
              </span>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3 text-left">
            <p className="line-clamp-2 text-xs font-semibold text-white">
              {r.layers.find((l) => l.kind === "title")?.kind === "title"
                ? (r.layers.find((l) => l.kind === "title") as { text: string }).text
                : "Untitled reel"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function SeekersPreview({ active, spotName }: { active: Reel[]; spotName: string }) {
  return (
    <section className="mt-10 rounded-2xl card-flat p-5">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="eyebrow text-primary">Seekers preview</p>
          <h3 className="mt-1 font-display text-lg font-semibold">How your reels appear to Seekers</h3>
        </div>
        <span className="text-xs text-muted-foreground">Top of feed · Story Updates rail</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-3 pb-2">
          <StoryAvatar label={spotName} accent active={active.length > 0} count={active.length} />
          {["Neon", "Glow", "Magalies", "Goodman", "Battle"].map((n) => (
            <StoryAvatar key={n} label={n} accent={false} active={false} count={0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryAvatar({ label, accent, active, count }: { label: string; accent: boolean; active: boolean; count: number }) {
  return (
    <div className="flex w-16 flex-shrink-0 flex-col items-center gap-1.5">
      <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${active ? "bg-gradient-brand p-[2px]" : "bg-[var(--hairline)] p-[1px]"}`}>
        <div className="flex h-full w-full items-center justify-center rounded-full surface-1 text-[11px] font-bold">
          {label.slice(0, 2).toUpperCase()}
        </div>
        {active && count > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
            {count}
          </span>
        )}
      </div>
      <span className={`max-w-full truncate text-[10px] ${accent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

// ----------------- EDITOR -----------------

function Editor({ reel: initial, onClose }: { reel: Reel; onClose: () => void }) {
  const { listings } = useTroveData();
  const [reel, setReel] = useState<Reel>(initial);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const update = (patch: Partial<Reel>) => {
    const r = { ...reel, ...patch };
    setReel(r);
    saveReel(r);
  };
  const updateLayer = (i: number, patch: Partial<ReelLayer>) => {
    const layers = reel.layers.map((l, idx) => idx === i ? { ...l, ...patch } as ReelLayer : l);
    update({ layers });
  };
  const addLayer = (l: ReelLayer) => update({ layers: [...reel.layers, l] });
  const removeLayer = (i: number) => update({ layers: reel.layers.filter((_, idx) => idx !== i) });

  // Render canvas frame
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawFrame(ctx, c.width, c.height, reel);
  }, [reel]);

  const setBaseFromListing = (listingId: string) => {
    const l = listings.find((x) => x.id === listingId);
    if (!l) return;
    update({ listingId, baseImage: l.cover, thumbnail: l.cover });
  };

  const onUpload = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    update({ baseImage: dataUrl, thumbnail: dataUrl });
  };

  const exportVideo = async (): Promise<Blob | null> => {
    const c = canvasRef.current;
    if (!c) return null;
    setExporting(true);
    try {
      const stream = (c as HTMLCanvasElement).captureStream(30);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const chunks: BlobPart[] = [];
      const rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: mime })); });
      rec.start();
      // animate a subtle ken-burns over duration
      const ctx = c.getContext("2d")!;
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          const t = performance.now() - start;
          const p = Math.min(1, t / reel.durationMs);
          drawFrame(ctx, c.width, c.height, reel, p);
          if (p < 1) requestAnimationFrame(tick); else resolve();
        };
        tick();
      });
      rec.stop();
      const blob = await done;
      return blob;
    } finally {
      setExporting(false);
    }
  };

  const onDownload = async () => {
    const blob = await exportVideo();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reel.id}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reel downloaded");
  };

  const onPublish = async () => {
    const blob = await exportVideo();
    if (blob) {
      const key = `blob_${reel.id}`;
      try { await putBlob(key, blob); update({ videoBlobKey: key }); } catch {}
    }
    const r = publishReel(reel.id);
    if (!r.ok) { toast.error(r.reason ?? "Could not publish"); return; }
    toast.success("Published — visible on Seekers for 48 hours");
    onClose();
  };

  const onSaveDraft = () => { toast.success("Draft saved"); onClose(); };

  const onUnpublish = () => { unpublishReel(reel.id); toast.message("Reel unpublished"); onClose(); };

  const onDelete = async () => { await deleteReel(reel.id); toast.message("Reel deleted"); onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
    >
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2 text-white">
          <Film className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-semibold">Story Studio</span>
          <span className="text-xs text-white/50">· {reel.status === "published" ? "Live" : "Draft"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-white/70 hover:text-destructive">
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onSaveDraft} className="text-white">Save draft</Button>
          <Button variant="outline" size="sm" onClick={onDownload} disabled={exporting}>
            <Download className="mr-1 h-4 w-4" /> {exporting ? "Rendering…" : "Download"}
          </Button>
          {reel.status === "published" ? (
            <Button size="sm" variant="outline" onClick={onUnpublish}>Unpublish</Button>
          ) : (
            <Button size="sm" onClick={onPublish} disabled={exporting} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Sparkles className="mr-1 h-4 w-4" /> Publish · 48h
            </Button>
          )}
          <button onClick={onClose} className="ml-1 rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[320px_1fr_340px] overflow-hidden">
        {/* Left: base + listings picker */}
        <aside className="overflow-y-auto border-r border-white/10 p-4 space-y-5 text-white">
          <div>
            <p className="eyebrow text-white/60">Base media</p>
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 p-4 text-xs text-white/70 hover:border-white/40">
              <ImageIcon className="h-4 w-4" /> Upload photo
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </label>
          </div>
          <div>
            <p className="eyebrow text-white/60">Or pull from a listing</p>
            <div className="mt-2 grid gap-2">
              {listings.slice(0, 6).map((l) => (
                <button key={l.id} onClick={() => setBaseFromListing(l.id)}
                  className={`flex items-center gap-2 rounded-lg p-1.5 text-left ring-1 transition ${
                    reel.listingId === l.id ? "ring-primary bg-primary/10" : "ring-white/10 hover:ring-white/30"
                  }`}>
                  <img src={l.cover} alt="" className="h-10 w-10 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{l.title}</p>
                    <p className="truncate text-[10px] text-white/50">{l.venue}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow text-white/60">Duration</p>
            <div className="mt-2 flex gap-2">
              {[3000, 5000, 10000].map((d) => (
                <button key={d} onClick={() => update({ durationMs: d })}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                    reel.durationMs === d ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}>{d / 1000}s</button>
              ))}
            </div>
          </div>
        </aside>

        {/* Centre: phone canvas */}
        <div className="flex items-center justify-center overflow-hidden p-6">
          <div className="relative">
            <div className="rounded-[2.2rem] bg-black p-2 ring-1 ring-white/10 shadow-2xl">
              <canvas ref={canvasRef} width={360} height={640}
                className="block rounded-[1.7rem] bg-neutral-900" />
            </div>
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-white/40">9:16 · Trove Reel</p>
          </div>
        </div>

        {/* Right: layer panel */}
        <aside className="overflow-y-auto border-l border-white/10 p-4 space-y-4 text-white">
          <div>
            <p className="eyebrow text-white/60">Add overlay</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <AddBtn icon={Type} label="Title" onClick={() => addLayer({ kind: "title", text: "Headline", color: "#fff" })} />
              <AddBtn icon={Type} label="Subtitle" onClick={() => addLayer({ kind: "subtitle", text: "Sub headline", color: "#fff" })} />
              <AddBtn icon={Tag} label="Price" onClick={() => addLayer({ kind: "price", text: ZAR(150) })} />
              <AddBtn icon={MapPin} label="Location" onClick={() => addLayer({ kind: "location", text: "Joburg" })} />
              <AddBtn icon={Megaphone} label="CTA pill" onClick={() => addLayer({ kind: "cta", text: "Book on Trove" })} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="eyebrow text-white/60">Layers</p>
            {reel.layers.length === 0 && <p className="text-xs text-white/50">No overlays yet — add one above.</p>}
            {reel.layers.map((l, i) => (
              <div key={i} className="rounded-lg ring-1 ring-white/10 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-white/60">{l.kind}</Label>
                  <button onClick={() => removeLayer(i)} className="text-white/40 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input value={l.text} onChange={(e) => updateLayer(i, { text: e.target.value })}
                  className="h-8 text-xs" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function AddBtn({ icon: Icon, label, onClick }: { icon: typeof Type; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-2 text-xs text-white/80 hover:bg-white/15">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

// ----------------- canvas drawing -----------------

const imgCache = new Map<string, HTMLImageElement>();
function loadImage(src: string): Promise<HTMLImageElement> {
  if (imgCache.has(src)) return Promise.resolve(imgCache.get(src)!);
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgCache.set(src, img); res(img); };
    img.onerror = rej;
    img.src = src;
  });
}

function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, reel: Reel, progress = 0) {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, w, h);
  loadImage(reel.baseImage).then((img) => {
    // ken-burns: scale 1 → 1.08 over duration
    const scale = 1 + 0.08 * progress;
    const iw = img.width, ih = img.height;
    const ratio = Math.max(w / iw, h / ih) * scale;
    const dw = iw * ratio, dh = ih * ratio;
    const dx = (w - dw) / 2, dy = (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    // dark gradient
    const grad = ctx.createLinearGradient(0, h * 0.4, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // top eyebrow
    ctx.fillStyle = "#ff4fa3";
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillText("TROVE", 18, 28);
    // overlays (stacked from bottom)
    let y = h - 32;
    const drawText = (text: string, font: string, color: string, lineH: number) => {
      ctx.fillStyle = color;
      ctx.font = font;
      // wrap manually
      const words = text.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > w - 36) { if (line) lines.push(line); line = word; }
        else line = test;
      }
      if (line) lines.push(line);
      for (let i = lines.length - 1; i >= 0; i--) {
        ctx.fillText(lines[i], 18, y);
        y -= lineH;
      }
    };
    // CTA / price chips drawn first (they sit just above title)
    const cta = reel.layers.find((l) => l.kind === "cta");
    if (cta) {
      ctx.fillStyle = "#ff4fa3";
      ctx.beginPath();
      const txt = cta.text;
      ctx.font = "bold 13px Inter, sans-serif";
      const tw = ctx.measureText(txt).width + 22;
      const rx = 18, ry = y - 26, rw = tw, rh = 28;
      const rad = 14;
      ctx.moveTo(rx + rad, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
      ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
      ctx.arcTo(rx, ry + rh, rx, ry, rad);
      ctx.arcTo(rx, ry, rx + rw, ry, rad);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(txt, rx + 11, ry + 19);
      y -= 40;
    }
    const price = reel.layers.find((l) => l.kind === "price");
    if (price) { drawText(price.text, "bold 16px Inter, sans-serif", "#ffd1e3", 22); y -= 4; }
    const title = reel.layers.find((l) => l.kind === "title");
    if (title) drawText(title.text, "bold 30px 'Space Grotesk', sans-serif", title.color || "#fff", 34);
    const sub = reel.layers.find((l) => l.kind === "subtitle");
    if (sub) drawText(sub.text, "500 14px Inter, sans-serif", "#e5e5e5", 18);
    const loc = reel.layers.find((l) => l.kind === "location");
    if (loc) drawText("📍 " + loc.text, "500 12px Inter, sans-serif", "#cfcfcf", 16);
  }).catch(() => {});
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// re-export blob fetch helper for any future use
export { getBlob as getReelBlob };
