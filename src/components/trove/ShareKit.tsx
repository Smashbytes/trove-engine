import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Facebook,
  Instagram,
  Link2,
  MessageCircle,
  MousePointerClick,
  QrCode,
  Ticket,
  Twitter,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import type { ListingWithCapacity } from "@/lib/database.types";
import {
  ogImageUrl,
  shortUrl,
  summarizeShareLinks,
  useMintShareLink,
  useShareLinks,
  type ShareChannel,
  type ShareLinkRow,
} from "@/lib/share-links";

type ChannelDef = {
  id: ShareChannel;
  label: string;
  hint: string;
  icon: typeof Link2;
  /** Opens the platform's composer with the link prefilled. */
  intent?: (url: string, caption: string) => string;
};

const CHANNELS: ChannelDef[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    hint: "Groups, status & broadcast lists",
    icon: MessageCircle,
    intent: (_url, caption) => `https://wa.me/?text=${encodeURIComponent(caption)}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    hint: "Bio link & story link sticker",
    icon: Instagram,
  },
  {
    id: "facebook",
    label: "Facebook",
    hint: "Page posts, groups & events",
    icon: Facebook,
    intent: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "x",
    label: "X",
    hint: "Posts & replies",
    icon: Twitter,
    intent: (url, caption) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption.replace(url, "").trim())}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "tiktok",
    label: "TikTok",
    hint: "Bio link",
    icon: Link2,
  },
  {
    id: "link",
    label: "Other",
    hint: "Email, SMS, anywhere else",
    icon: Link2,
  },
];

const clickLabel = (n: number) => `${n} ${n === 1 ? "click" : "clicks"}`;

function formatDate(iso: string | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Johannesburg",
  }).format(d);
}

export function ShareKit({ listing }: { listing: ListingWithCapacity }) {
  const { user } = useAuth();
  const linksQuery = useShareLinks(listing.host_id, listing.id);
  const mint = useMintShareLink(listing.id);
  const [copied, setCopied] = useState<ShareChannel | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const links = linksQuery.data ?? [];
  const isLive = listing.status === "live";

  const meta = (listing.metadata ?? {}) as { date?: string; tagline?: string };
  const date = formatDate(meta.date);
  const price =
    listing.base_price_kobo > 0 ? `from R${Math.round(listing.base_price_kobo / 100)}` : "free entry";

  // The acting user's own link per channel (what they copy) …
  const mine = useMemo(() => {
    const m = new Map<string, ShareLinkRow>();
    for (const l of links) if (l.kind === "host" && l.created_by === user?.id) m.set(l.channel, l);
    return m;
  }, [links, user?.id]);

  // … but clicks and bookings are reported for the whole team per channel.
  const byChannel = useMemo(() => {
    const m = new Map<string, { clicks: number; bookings: number }>();
    for (const l of links) {
      if (l.kind !== "host") continue;
      const cur = m.get(l.channel) ?? { clicks: 0, bookings: 0 };
      m.set(l.channel, { clicks: cur.clicks + l.clicks, bookings: cur.bookings + l.bookings });
    }
    return m;
  }, [links]);
  const clicksByChannel = useMemo(
    () => new Map([...byChannel].map(([k, v]) => [k, v.clicks])),
    [byChannel],
  );

  const totals = summarizeShareLinks(links);

  const captionFor = (url: string) =>
    [
      `🔥 ${listing.title}`,
      [date, listing.city].filter(Boolean).join(" · "),
      meta.tagline,
      listing.base_price_kobo > 0
        ? `Tickets ${price} on TROVE 👉 ${url}`
        : `Free entry — RSVP on TROVE 👉 ${url}`,
    ]
      .filter(Boolean)
      .join("\n");

  const [captionDraft, setCaptionDraft] = useState<string | null>(null);
  const waLink = mine.get("whatsapp");
  const caption = captionDraft ?? captionFor(waLink ? shortUrl(waLink.code) : "welovetrove.co.za/s/…");

  async function linkFor(channel: ShareChannel): Promise<string | null> {
    const existing = mine.get(channel);
    if (existing) return shortUrl(existing.code);
    try {
      const row = await mint.mutateAsync(channel);
      return shortUrl(row.code);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the link.");
      return null;
    }
  }

  async function copyLink(channel: ShareChannel) {
    const url = await linkFor(channel);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(channel);
    setTimeout(() => setCopied((c) => (c === channel ? null : c)), 1800);
    toast.success("Link copied.");
  }

  async function openIntent(def: ChannelDef) {
    // Open synchronously so popup blockers allow it, then point it at the composer.
    const win = window.open("about:blank", "_blank");
    const url = await linkFor(def.id);
    if (!url || !def.intent) {
      win?.close();
      return;
    }
    const target = def.intent(url, captionDraft?.includes(url) ? captionDraft : captionFor(url));
    if (win) win.location.href = target;
    else window.location.href = target;
  }

  async function copyCaption() {
    const url = await linkFor("whatsapp");
    if (!url) return;
    await navigator.clipboard.writeText(captionDraft ?? captionFor(url));
    toast.success("Caption copied — paste it anywhere.");
  }

  const qrLink = mine.get("qr");

  function downloadQr() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${(listing.slug || listing.title).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-trove-qr.png`;
    a.click();
  }

  const previewDomain = "welovetrove.co.za";
  const previewDescription = [date, listing.city, price && price[0].toUpperCase() + price.slice(1)]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="mt-6 rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Share kit</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Short links that unfurl into a full event card on WhatsApp, Instagram and Facebook. Each
            channel gets its own tracked link, so you can see where your crowd comes from.
          </p>
        </div>
        <div className="flex gap-3">
          <Stat icon={MousePointerClick} label="Link clicks" value={totals.hostClicks} />
          <Stat
            icon={Ticket}
            label="Bookings"
            value={totals.bookings}
            hint="Paid bookings that came through your links or guests' shares"
          />
          <Stat
            icon={Users}
            label="Guest shares"
            value={totals.guestClicks}
            hint={`${totals.guestSharers} guests sharing · ${totals.guestBookings} bookings from their links`}
          />
        </div>
      </div>

      {!isLive && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            This listing is <strong>{listing.status}</strong>. You can grab links now, but anyone who
            opens them sees "Spot not found" until you publish it.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Preview — what the link looks like in a chat */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            How it looks when shared
          </p>
          <div className="mt-3 rounded-[1.5rem] bg-[#0b141a] p-4">
            <div className="ml-auto max-w-[26rem] overflow-hidden rounded-2xl rounded-tr-sm bg-[#005c4b] text-white shadow-lg">
              <div className="m-1 overflow-hidden rounded-xl bg-[#025144]">
                <img
                  src={ogImageUrl(listing.id, listing.updated_at)}
                  alt={`Social card for ${listing.title}`}
                  className="aspect-[1200/630] w-full bg-black/30 object-cover"
                  loading="lazy"
                />
                <div className="px-3 py-2">
                  <p className="line-clamp-1 text-sm font-semibold">{listing.title}</p>
                  <p className="line-clamp-2 text-xs text-white/70">{previewDescription}</p>
                  <p className="mt-1 text-[11px] text-white/50">{previewDomain}</p>
                </div>
              </div>
              <p className="whitespace-pre-line px-3 pb-2 pt-1 text-sm">
                {caption}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The card updates from your cover photo, title, date and price. Use a landscape cover for
            the best fit (1200 × 630).
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Caption
              </p>
              {captionDraft !== null && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setCaptionDraft(null)}
                >
                  Reset
                </button>
              )}
            </div>
            <Textarea
              className="mt-2 min-h-[120px] text-sm"
              value={caption}
              onChange={(e) => setCaptionDraft(e.target.value)}
            />
            <Button variant="outline" size="sm" className="mt-2" onClick={copyCaption}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copy caption with link
            </Button>
          </div>
        </div>

        {/* Channels */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Your links
          </p>
          <ul className="mt-3 space-y-2">
            {CHANNELS.map((def) => {
              const link = mine.get(def.id);
              const stats = byChannel.get(def.id) ?? { clicks: 0, bookings: 0 };
              const Icon = def.icon;
              return (
                <li
                  key={def.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {def.label}
                      <span className="ml-2 text-xs font-normal text-muted-foreground sm:hidden">
                        {clickLabel(stats.clicks)} · {stats.bookings} booked
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {link ? shortUrl(link.code).replace("https://www.", "") : def.hint}
                    </p>
                  </div>
                  <span className="hidden w-20 text-right text-xs leading-tight text-muted-foreground sm:block">
                    <span className="font-display text-base font-bold text-foreground">
                      {stats.clicks}
                    </span>{" "}
                    {stats.clicks === 1 ? "click" : "clicks"}
                    <span className="block">
                      <span className="font-semibold text-foreground">{stats.bookings}</span>{" "}
                      booked
                    </span>
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mint.isPending}
                      onClick={() => copyLink(def.id)}
                      aria-label={`Copy ${def.label} link`}
                    >
                      {copied === def.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    {def.intent && (
                      <Button
                        size="sm"
                        disabled={mint.isPending}
                        onClick={() => openIntent(def)}
                        aria-label={`Share on ${def.label}`}
                      >
                        <ExternalLink className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Share</span>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Poster QR */}
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            {qrLink ? (
              <div className="rounded-xl bg-white p-2">
                <QRCodeCanvas value={shortUrl(qrLink.code)} size={112} marginSize={1} level="M" />
                {/* Print-resolution copy for the download. */}
                <div ref={qrRef} className="hidden">
                  <QRCodeCanvas value={shortUrl(qrLink.code)} size={1024} marginSize={4} level="M" />
                </div>
              </div>
            ) : (
              <span className="grid h-[128px] w-[128px] place-items-center rounded-xl border border-dashed border-white/15 text-muted-foreground">
                <QrCode className="h-8 w-8" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Poster & flyer QR</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Print it on posters, flyers and table cards. Scans are tracked separately
                {qrLink ? ` — ${clicksByChannel.get("qr") ?? 0} so far.` : "."}
              </p>
              <div className="mt-3">
                {qrLink ? (
                  <Button size="sm" variant="outline" onClick={downloadQr}>
                    <Download className="mr-1.5 h-4 w-4" />
                    Download PNG
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={mint.isPending} onClick={() => linkFor("qr")}>
                    <QrCode className="mr-1.5 h-4 w-4" />
                    Generate QR
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Link2;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="min-w-[8.5rem] rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3" title={hint}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
