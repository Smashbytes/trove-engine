import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import { TroveLogo } from "@/components/trove/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trove Engine - Focused host workspaces for every spot type." },
      {
        name: "description",
        content:
          "A single platform with role-specific workspaces for event organisers, experience providers, accommodation hosts, and venues.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();

  const enterEngine = () => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
      return;
    }

    openAuthModal();
  };

  return (
    <div className="min-h-screen overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <TroveLogo />
        <div className="flex items-center gap-3">
          <a
            href="#flows"
            className="hidden text-sm text-muted-foreground hover:text-foreground md:inline"
          >
            Host flows
          </a>
          <a
            href="#platform"
            className="hidden text-sm text-muted-foreground hover:text-foreground md:inline"
          >
            Platform fit
          </a>
          <Button
            onClick={enterEngine}
            className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
          >
            Open Engine
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border/40">
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,0,115,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(143,92,255,0.12),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-36 md:pt-40">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Four host types. One platform. Focused workspaces.
          </motion.div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.05 }}
                className="max-w-4xl font-display text-5xl font-bold leading-[0.92] tracking-[-0.05em] md:text-7xl"
              >
                One engine.
                <span className="block text-gradient">Four filtered realities.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg"
              >
                Event organisers should land in an organiser workspace. Experience providers should
                land in a slots workspace. Accommodation hosts should see room and reservation
                logic. Venue partners should see the venue hub. Nothing bloated.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.32 }}
                className="mt-8 flex flex-col gap-4 sm:flex-row"
              >
                <Button
                  size="lg"
                  onClick={enterEngine}
                  className="h-14 bg-gradient-brand px-8 text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95"
                >
                  Enter the Engine
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <a href="#flows">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 border-border/60 px-8 text-base"
                  >
                    See host flows
                  </Button>
                </a>
              </motion.div>

              <div className="mt-12 grid gap-4 md:grid-cols-3">
                {PILLARS.map((pillar, index) => (
                  <motion.div
                    key={pillar.label}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.12 + index * 0.08 }}
                    className="glass rounded-2xl p-4"
                  >
                    <p className="font-display text-2xl font-bold text-gradient">{pillar.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{pillar.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-brand opacity-20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-card/90 p-5 shadow-lift">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    trove.engine / host-type selector
                  </span>
                </div>

                <div className="grid gap-3">
                  {HOST_WORKSPACES.map((workspace) => (
                    <div
                      key={workspace.title}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:border-primary/35"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand-soft text-primary">
                          <workspace.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-display text-lg font-semibold">{workspace.title}</p>
                            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                              {workspace.system}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{workspace.copy}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="flows" className="border-b border-border/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 max-w-3xl">
            <p className="eyebrow text-primary">Host flows</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Each partner enters a workspace that feels made for them.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {HOST_WORKSPACES.map((workspace, index) => (
              <motion.div
                key={workspace.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-[1.75rem] border border-white/8 bg-card p-6 shadow-card"
              >
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-brand opacity-60" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand-soft text-primary">
                  <workspace.icon className="h-5 w-5" />
                </div>
                <p className="mt-5 font-display text-2xl font-semibold">{workspace.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{workspace.copy}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {workspace.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow text-primary">Platform fit</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Trove handles the complexity. Hosts feel only the part that matters.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              The platform can stay powerful without making every venue, organiser, or property
              manager swim through a thousand irrelevant controls on day one.
            </p>
            <Button
              onClick={enterEngine}
              className="mt-8 h-12 bg-gradient-brand px-6 font-semibold text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              Open the focused Engine
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {PLATFORM_POINTS.map((point) => (
              <div
                key={point.title}
                className="rounded-3xl border border-white/8 bg-card p-6 shadow-card"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand-soft text-primary">
                  <point.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const PILLARS = [
  { value: "4", label: "host types with focused dashboards" },
  { value: "3", label: "booking systems kept in the right lane" },
  { value: "1", label: "platform architecture behind the scenes" },
];

const HOST_WORKSPACES = [
  {
    icon: Ticket,
    title: "Event organiser",
    system: "Tickets",
    copy: "A clean organiser workspace built for launches, ticket tiers, event readiness, and live entry control.",
    points: [
      "Only event and ticketing tools in view",
      "Verification first, then real event drafts",
      "Launch readiness visible from one dashboard",
    ],
  },
  {
    icon: Sparkles,
    title: "Experience provider",
    system: "Slots",
    copy: "A schedule-first workspace for sessions, guest flow, capacity by slot, and operational prep.",
    points: [
      "Availability and sessions front and centre",
      "Capacity designed around recurring bookings",
      "No accommodation or venue clutter",
    ],
  },
  {
    icon: BedDouble,
    title: "Accommodation host",
    system: "Date range",
    copy: "A property workspace focused on rooms, reservation thinking, and what guests need before arrival.",
    points: [
      "Rooms and stays instead of ticketing language",
      "Property profile and ops status together",
      "Built to expand into reservation depth cleanly",
    ],
  },
  {
    icon: Building2,
    title: "Venue operator",
    system: "Hub",
    copy: "A space-first hub that positions the venue clearly before layering in what the venue can host.",
    points: [
      "Venue profile and operating context first",
      "A cleaner base for future events inside the space",
      "No organiser-only or property-only overload",
    ],
  },
];

const PLATFORM_POINTS = [
  {
    icon: ShieldCheck,
    title: "Verification gate",
    body: "Real partner data enters the platform first, and the engine keeps live publishing behind the correct verification state instead of pretending everything is live.",
  },
  {
    icon: CalendarDays,
    title: "Role-aware publishing",
    body: "Hosts create the kind of listing that matches who they are on Trove, so the information model and the UI stay aligned from onboarding onward.",
  },
  {
    icon: Sparkles,
    title: "Brand-aligned shell",
    body: "The interface stays unmistakably Trove, but the navigation, headlines, actions, and empty states shift to the host's actual business model.",
  },
  {
    icon: Ticket,
    title: "Real data only",
    body: "No seeded events, fake spot names, or placeholder sales stories. Every dashboard state now comes from the signed-in host record and real Supabase data.",
  },
];
