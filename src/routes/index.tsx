import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { TroveLogo } from "@/components/trove/Logo";
import { NewsletterForm, PartnerLeadForm } from "@/components/trove/LandingIntake";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const SITE = "https://www.welovetrove.co.za";
const GUEST_APP = "https://trove-your-next-adventure.pages.dev";

// The website (welovetrove.co.za) links here with ?auth=signin / ?auth=signup
// so hosts land straight in the right tab of the auth modal.
type LandingSearch = { auth?: "signin" | "signup" };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LandingSearch => ({
    auth: search.auth === "signin" || search.auth === "signup" ? search.auth : undefined,
  }),
  head: () => ({
    meta: [
      { title: "TROVE Engine | Become a host. Where South Africa's Spots grow." },
      {
        name: "description",
        content:
          "List events, experiences, stays or your venue on TROVE. Sell tickets, run the door from any phone and get paid in Rands. Free to list.",
      },
    ],
  }),
  component: Landing,
});

/* ── Photography (Pexels, hotlinked per their API guidelines; credited in the
      footer). Chosen dark and neon so the pages feel alive, not stocky. ── */
const IMG = {
  heroDj: {
    src: "https://images.pexels.com/photos/19181777/pexels-photo-19181777.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    alt: "DJ mixing at a nightclub party under pink neon lights",
  },
  heroCrowd: {
    src: "https://images.pexels.com/photos/7192878/pexels-photo-7192878.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    alt: "Outdoor concert crowd at night under colourful lights",
  },
  heroRooftop: {
    src: "https://images.pexels.com/photos/18999493/pexels-photo-18999493.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=1000",
    alt: "Friends enjoying drinks at a rooftop bar",
  },
  rowListing: {
    src: "https://images.pexels.com/photos/5192273/pexels-photo-5192273.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1300",
    alt: "Packed dance floor at a nightclub under spotlights",
  },
  rowScanner: {
    src: "https://images.pexels.com/photos/15467761/pexels-photo-15467761.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1300",
    alt: "Guest scanning a QR code with a smartphone at an event",
  },
  tileEvents: {
    src: "https://images.pexels.com/photos/30215615/pexels-photo-30215615.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1400",
    alt: "Concert crowd with smoke and stage lights",
  },
  tileExperience: {
    src: "https://images.pexels.com/photos/16448674/pexels-photo-16448674.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1400",
    alt: "Safari game drive at dusk in Pilanesberg National Park",
  },
  tileStay: {
    src: "https://images.pexels.com/photos/13722872/pexels-photo-13722872.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1400",
    alt: "Moody boutique hotel room with a modern double bed",
  },
  tileVenue: {
    src: "https://images.pexels.com/photos/30592863/pexels-photo-30592863.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1400",
    alt: "Night party with string lights at a rooftop venue",
  },
  ctaCapeTown: {
    src: "https://images.pexels.com/photos/33622104/pexels-photo-33622104.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1920",
    alt: "Cape Town city lights at night with Table Mountain behind",
  },
};

const TICKER = [
  "Johannesburg",
  "Cape Town",
  "Durban",
  "Pretoria",
  "Gqeberha",
  "Amapiano nights",
  "Rooftop sessions",
  "Comedy",
  "Trail adventures",
  "Wine farms",
  "Live music",
  "Weekend stays",
];

/* ── Scroll reveal, ported from the website's progressive-enhancement
      pattern: content is fully visible in SSR/no-JS, the hiding class is only
      added after mount, and reduced motion collapses it to static (CSS). ── */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** transition delay in ms */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("armed");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `reveal ${className}` : "reveal"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, openAuthModal } = useAuth();
  const { auth } = Route.useSearch();
  const handledDeepLink = useRef(false);

  // ?auth= deep link from the website: signed-out visitors get the right
  // modal tab, signed-in hosts skip straight to their dashboard.
  useEffect(() => {
    if (!auth || isLoading || handledDeepLink.current) return;
    handledDeepLink.current = true;
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    } else {
      openAuthModal(auth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, isLoading, isAuthenticated]);

  const primaryLabel = isAuthenticated ? "Go to your dashboard" : "Start hosting free";
  const onPrimary = () => {
    if (isAuthenticated) navigate({ to: "/dashboard" });
    else openAuthModal("signup");
  };

  return (
    <div className="grain min-h-screen overflow-x-clip">
      {/* ── Header ── */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-6">
          <TroveLogo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#host-types" className="transition-colors hover:text-foreground">
              Host types
            </a>
            <a href="#get-paid" className="transition-colors hover:text-foreground">
              Get paid
            </a>
            <a href="#partner" className="transition-colors hover:text-foreground">
              Partner
            </a>
          </nav>
          <div className="flex min-w-0 items-center gap-2.5">
            {!isAuthenticated && (
              <Button
                variant="ghost"
                onClick={() => openAuthModal("signin")}
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
              >
                Sign in
              </Button>
            )}
            <Button
              onClick={onPrimary}
              className="bg-gradient-brand font-semibold text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              <span className="hidden sm:inline">{primaryLabel}</span>
              <span className="sm:hidden">{isAuthenticated ? "Dashboard" : "Start free"}</span>
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="aurora" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-28 md:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24">
          <div>
            <Reveal>
              <p className="eyebrow text-primary">
                For organisers, venues, experiences and stays
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-4 max-w-2xl font-brand text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
                Where South Africa's <span className="text-gradient">Spots grow</span>
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                List events, experiences, stays or your venue on TROVE. Guests discover
                you, book and pay in Rands.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={onPrimary}
                  className="h-13 bg-gradient-brand px-7 text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95"
                >
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <a href="#partner">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-13 w-full border-border/60 px-7 text-base sm:w-auto"
                  >
                    Talk to partnerships
                  </Button>
                </a>
              </div>
            </Reveal>
          </div>

          {/* Photo collage */}
          <Reveal delay={120} className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-brand opacity-15 blur-3xl" />
            <div className="relative grid grid-cols-5 gap-3 md:gap-4">
              <div className="col-span-3 overflow-hidden rounded-3xl border border-white/10">
                <img
                  src={IMG.heroDj.src}
                  alt={IMG.heroDj.alt}
                  className="h-full min-h-[320px] w-full object-cover md:min-h-[420px]"
                  fetchPriority="high"
                />
              </div>
              <div className="col-span-2 grid grid-rows-2 gap-3 md:gap-4">
                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <img
                    src={IMG.heroCrowd.src}
                    alt={IMG.heroCrowd.alt}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <img
                    src={IMG.heroRooftop.src}
                    alt={IMG.heroRooftop.alt}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── City / category ticker ── */}
      <div className="ticker-fade overflow-hidden border-y border-white/5 py-4">
        <div className="ticker-track">
          {[0, 1].map((half) => (
            <div key={half} className="flex items-center" aria-hidden={half === 1}>
              {TICKER.map((item) => (
                <span
                  key={`${half}-${item}`}
                  className="flex items-center whitespace-nowrap px-4 text-sm font-medium text-muted-foreground"
                >
                  <span className="mr-8 text-primary/60">✦</span>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Hosting made easy: two split rows ── */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-20 md:py-28">
        <Reveal>
          <h2 className="max-w-2xl font-brand text-3xl font-bold tracking-tight md:text-4xl">
            Hosting made easy
          </h2>
        </Reveal>

        <div className="mt-12 grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <Reveal className="overflow-hidden rounded-[2rem] border border-white/8">
            <img
              src={IMG.rowListing.src}
              alt={IMG.rowListing.alt}
              loading="lazy"
              className="aspect-[13/9] w-full object-cover"
            />
          </Reveal>
          <Reveal delay={80}>
            <h3 className="font-display text-2xl font-semibold md:text-3xl">
              List once. Sell every night.
            </h3>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Build your listing with ticket tiers, session slots or rooms. The moment
              you publish, it is live where guests are looking.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "Tickets, slots and stays in one listing builder",
                "Live in the TROVE guest app the moment you publish",
                "Curated placement on welovetrove.co.za",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="mt-16 grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <Reveal delay={80} className="order-2 lg:order-1">
            <h3 className="font-display text-2xl font-semibold md:text-3xl">
              Run the door from any phone.
            </h3>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Scan tickets with the built-in QR scanner, watch check-ins live and keep
              the queue moving. No extra hardware.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "QR scanning built into the Engine",
                "Live check-in counts for you and your team",
                "Works on any phone or tablet at the door",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="order-1 overflow-hidden rounded-[2rem] border border-white/8 lg:order-2">
            <img
              src={IMG.rowScanner.src}
              alt={IMG.rowScanner.alt}
              loading="lazy"
              className="aspect-[13/9] w-full object-cover"
            />
          </Reveal>
        </div>
      </section>

      {/* ── Host types: image tiles ── */}
      <section id="host-types" className="scroll-mt-24 border-t border-white/5 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <p className="eyebrow text-primary">Built for your kind of Spot</p>
            <h2 className="mt-3 max-w-2xl font-brand text-3xl font-bold tracking-tight md:text-4xl">
              One Engine. Four kinds of host.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-12">
            {[
              {
                img: IMG.tileEvents,
                title: "Event organisers",
                copy: "Launches, ticket tiers and live entry control for every event you run.",
                span: "md:col-span-7",
              },
              {
                img: IMG.tileExperience,
                title: "Experience providers",
                copy: "Sessions, capacity and guest flow for tours, trails and adrenaline.",
                span: "md:col-span-5",
              },
              {
                img: IMG.tileStay,
                title: "Accommodation hosts",
                copy: "Rooms, stays and reservations, from city lofts to bush lodges.",
                span: "md:col-span-5",
              },
              {
                img: IMG.tileVenue,
                title: "Venue operators",
                copy: "Put your space on the map and host what fits it.",
                span: "md:col-span-7",
              },
            ].map((tile, i) => (
              <Reveal key={tile.title} delay={i * 50} className={`${tile.span} group`}>
                <div className="relative h-72 overflow-hidden rounded-[2rem] border border-white/8 md:h-80">
                  <img
                    src={tile.img.src}
                    alt={tile.img.alt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="font-display text-xl font-semibold text-white md:text-2xl">
                      {tile.title}
                    </h3>
                    <p className="mt-1.5 max-w-md text-sm leading-6 text-white/80">
                      {tile.copy}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Get paid ── */}
      <section id="get-paid" className="scroll-mt-24 px-6 py-20 md:py-28">
        <Reveal className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/8 bg-gradient-brand-soft">
          <div className="grid gap-10 p-8 md:p-14 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="max-w-xl font-brand text-3xl font-bold tracking-tight md:text-4xl">
                Get paid in Rands, on time.
              </h2>
              <p className="mt-5 max-w-xl text-muted-foreground">
                Card payments are held in escrow by TradeSafe. Payouts land in your South
                African bank account once your guests have been, and refunds are handled for you.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:w-[460px]">
              {[
                { value: "R0", label: "to list your Spot" },
                { value: "ZAR", label: "every payout, in Rands" },
                { value: "TradeSafe", label: "escrow-secured payments" },
              ].map((fact) => (
                <div key={fact.value} className="min-w-0 rounded-2xl bg-white/[0.04] p-4 ring-hairline">
                  <p className="truncate font-display text-lg font-bold text-gradient md:text-xl">
                    {fact.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{fact.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Toolkit ── */}
      <section className="mx-auto max-w-7xl px-6 pb-20 md:pb-28">
        <Reveal>
          <h2 className="max-w-2xl font-brand text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need to run it
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Ticket,
              title: "Listings and tickets",
              copy: "Tiers, slots, rooms and availability managed in one place.",
            },
            {
              icon: QrCode,
              title: "Door scanner",
              copy: "Check guests in from any phone, with live entry counts.",
            },
            {
              icon: Users,
              title: "Audience CRM",
              copy: "Followers, past guests and regulars, all in one view.",
            },
            {
              icon: ShieldCheck,
              title: "Team and roles",
              copy: "Staff accounts with just enough permission to do the job.",
            },
            {
              icon: BarChart3,
              title: "Live analytics",
              copy: "Sales, check-ins and payout history as they happen.",
            },
            {
              icon: MessageCircle,
              title: "WhatsApp updates",
              copy: "Booking notifications where your guests actually look.",
            },
          ].map((tool, i) => (
            <Reveal key={tool.title} delay={(i % 3) * 60}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand-soft text-primary">
                <tool.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{tool.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{tool.copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Partner / contact sales ── */}
      <section id="partner" className="scroll-mt-24 border-t border-white/5 py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="eyebrow text-primary">Partner with TROVE</p>
            <h2 className="mt-3 font-brand text-3xl font-bold tracking-tight md:text-4xl">
              Hosting something big?
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Festivals, multi-venue programmes, curated series and brand partnerships
              get a dedicated plan and hands-on support. Tell us what you are planning
              and the team will come back to you.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">
              Prefer email?{" "}
              <a
                href="mailto:hello@welovetrove.co.za"
                className="text-primary hover:underline underline-offset-4"
              >
                hello@welovetrove.co.za
              </a>
            </p>
          </Reveal>
          <Reveal delay={80}>
            <PartnerLeadForm />
          </Reveal>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="border-t border-white/5 px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-brand text-2xl font-bold tracking-tight md:text-3xl">
              Host notes, straight to your inbox
            </h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Occasional tips, product updates and what is working for Spots across the
              country.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <NewsletterForm />
          </Reveal>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="relative overflow-hidden">
        <img
          src={IMG.ctaCapeTown.src}
          alt={IMG.ctaCapeTown.alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-24 md:py-32">
          <h2 className="max-w-xl font-brand text-3xl font-bold tracking-tight md:text-5xl">
            Grow with <span className="text-gradient">TROVE</span>
          </h2>
          <p className="max-w-md text-muted-foreground">
            From your first listing to a sold-out season, the Engine is built to run it
            with you.
          </p>
          <Button
            size="lg"
            onClick={onPrimary}
            className="h-13 bg-gradient-brand px-7 text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95"
          >
            {primaryLabel}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <TroveLogo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              The host platform behind TROVE. Discover. Book. Experience.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">How it works</a></li>
              <li><a href="#host-types" className="hover:text-foreground">Host types</a></li>
              <li><a href="#get-paid" className="hover:text-foreground">Get paid</a></li>
              <li><a href="#partner" className="hover:text-foreground">Partner</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">TROVE</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href={SITE} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  welovetrove.co.za
                </a>
              </li>
              <li>
                <a href={GUEST_APP} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  Guest app
                </a>
              </li>
              <li>
                <a href={`${SITE}/pricing`} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  Pricing
                </a>
              </li>
              <li>
                <a href={`${SITE}/contact`} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href={`${SITE}/legal/terms-of-use`} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  Terms of Use
                </a>
              </li>
              <li>
                <a href={`${SITE}/legal/privacy`} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href={`${SITE}/legal/refund-policy`} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  Refund Policy
                </a>
              </li>
              <li>
                <a href={`${SITE}/legal/cookies`} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} TROVE. Made in South Africa.</p>
            <div className="flex items-center gap-5">
              <a
                href="https://www.instagram.com/trove_gem"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                Instagram
              </a>
              <a
                href="https://www.tiktok.com/@trove7576"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                TikTok
              </a>
              <a
                href="https://www.pexels.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                Photography from Pexels
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
