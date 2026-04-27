import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, Ticket, ScanLine, Wallet, Megaphone,
  Zap, ShieldCheck, BarChart3, QrCode, CheckCircle2,
} from "lucide-react";
import { TroveLogo } from "@/components/trove/Logo";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/trove-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trove Engine — Run your Spot. Sell out your nights." },
      { name: "description", content: "The all-in-one Spot dashboard for Trove. Publish events, sell tickets, scan guests, get paid via PayFast — all from one place." },
      { property: "og:title", content: "Trove Engine — for Spots" },
      { property: "og:description", content: "Publish events, sell tickets, scan guests, get paid. Built for the Spots that make tonight unforgettable." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const enter = () => { login(); navigate({ to: "/dashboard" }); };

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <TroveLogo />
        <div className="flex items-center gap-3">
          <a href="#features" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">
            Features
          </a>
          <a href="#pitch" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">
            Why Trove
          </a>
          <Button onClick={enter} className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
            Enter Engine <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative grid-bg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-36 text-center md:pt-44">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary shadow-glow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" /> For Spots · Powered by Trove
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-display text-6xl font-bold leading-[0.95] tracking-tighter md:text-8xl"
          >
            <span className="block">RUN YOUR SPOT.</span>
            <span className="block text-gradient">SELL OUT</span>
            <span className="block text-foreground/20">YOUR NIGHTS.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-8 max-w-xl text-base text-muted-foreground md:text-lg"
          >
            Trove Engine is the command centre for clubs, comedy rooms, rooftops and adventure hubs.
            Publish events, drop tickets, scan guests, get paid — and push straight into the Trove Seekers feed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              onClick={enter}
              className="h-14 bg-gradient-brand px-8 text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95"
            >
              Enter the Engine <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <a href="#features">
              <Button size="lg" variant="outline" className="h-14 border-border/60 px-8 text-base">
                See how it works
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="mt-20 grid w-full max-w-3xl grid-cols-3 gap-4 md:gap-8"
          >
            {[
              { v: "5 min", l: "to publish your first event" },
              { v: "0%", l: "monthly fees · pay per ticket" },
              { v: "Instant", l: "payouts via PayFast" },
            ].map((s) => (
              <div key={s.l} className="glass rounded-2xl p-4 text-left md:p-6">
                <div className="font-display text-2xl font-bold text-gradient md:text-4xl">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground md:text-sm">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/40 bg-background/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">The Engine</p>
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              Everything your <span className="text-gradient">Spot</span> needs. <br/>None of the chaos.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-card transition-all hover:border-primary/40 hover:shadow-glow-sm"
              >
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-brand opacity-0 blur-3xl transition-opacity group-hover:opacity-30" />
                <div className="relative">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand-soft text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pitch */}
      <section id="pitch" className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why Spots love it</p>
              <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
                Be where Joburg is <span className="text-gradient">already deciding</span> tonight.
              </h2>
              <p className="mt-5 text-muted-foreground">
                Every event you publish on Trove Engine drops straight into the Seekers feed —
                Trove's social-style booking app where thousands of South Africans browse what to do tonight.
                You don't market into the void. You market where the bookings happen.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "One-tap publish to Trove Seekers app",
                  "Built-in social share kit (IG stories, WhatsApp, X)",
                  "Affiliate codes to track promoter sales",
                  "Real-time scan-in from any phone",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={enter}
                className="mt-8 h-12 bg-gradient-brand px-6 font-semibold text-primary-foreground shadow-glow-sm hover:opacity-95"
              >
                Try the demo dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Mock dashboard preview */}
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-brand opacity-30 blur-3xl" />
              <div className="relative rounded-3xl border border-border bg-card p-5 shadow-glow">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                  </div>
                  <span className="text-xs text-muted-foreground">trove.engine / dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: "Revenue", v: "R 87,420" },
                    { l: "Tickets", v: "412" },
                    { l: "Scan rate", v: "94%" },
                  ].map((k) => (
                    <div key={k.l} className="rounded-xl border border-border/60 bg-background/60 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                      <div className="mt-1 font-display text-lg font-bold text-gradient">{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-4">
                  <div className="mb-3 flex items-end justify-between">
                    <div className="text-xs font-medium">Sales · last 14 days</div>
                    <div className="text-xs text-success">▲ 28%</div>
                  </div>
                  <div className="flex h-24 items-end gap-1.5">
                    {[20, 35, 28, 60, 48, 72, 55, 82, 68, 90, 75, 95, 88, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-brand opacity-80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Techno Tuesdays — <strong>3 VIP booths left</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
            The night is yours. <br/>
            <span className="text-gradient">Take it.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
            Jump into the prototype dashboard. Everything is fully clickable — events, ticketing, scan-in, payouts.
          </p>
          <Button
            size="lg"
            onClick={enter}
            className="mt-8 h-14 bg-gradient-brand px-10 text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95"
          >
            Open Trove Engine <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        Trove Engine — pitch prototype · Inspired by{" "}
        <a href="https://www.welovetrove.co.za" target="_blank" rel="noreferrer" className="text-primary hover:underline">
          welovetrove.co.za
        </a>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Ticket, title: "Self-service event listing", desc: "Add photos, descriptions, dates, venues. Publish in minutes — no sales call required." },
  { icon: BarChart3, title: "Smart ticket tiers", desc: "Early Bird, GA, VIP, comps. Set prices, inventory caps and on-sale windows for each tier." },
  { icon: Wallet, title: "PayFast payouts", desc: "Secure card & EFT collection via PayFast. Funds settled to your account on a schedule that works." },
  { icon: QrCode, title: "Unique QR tickets", desc: "Every buyer gets a tamper-proof QR. Scan from any phone — duplicates blocked automatically." },
  { icon: Megaphone, title: "Push to Seekers app", desc: "One tap publishes to Trove's social-style booking feed where Seekers are deciding tonight." },
  { icon: ShieldCheck, title: "Spot brand profile", desc: "Your own Trove profile — logo, bio, socials, follower base. A home for your community." },
  { icon: ScanLine, title: "Live door scanning", desc: "Mobile scanner with real-time check-in counts and duplicate detection at the door." },
  { icon: Sparkles, title: "Promo & affiliate kit", desc: "Generate share links, IG-ready creatives, and trackable affiliate codes for your promoters." },
  { icon: Zap, title: "API integrations", desc: "Pull event data from your existing site or push to other platforms via the Trove API." },
];

void Link; // keep import in case of future use
