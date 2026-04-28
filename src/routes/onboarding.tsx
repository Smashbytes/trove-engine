import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { TroveLogo } from "@/components/trove/Logo";
import { Button } from "@/components/ui/button";
import { SPOT_TYPES, setSpotType, login, type SpotType } from "@/lib/trove-store";
import { useState } from "react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your Spot · Trove Engine" },
      { name: "description", content: "Tell Trove what kind of Spot you run — your Engine adapts." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [pick, setPick] = useState<SpotType | null>(null);

  const submit = () => {
    if (!pick) return;
    setSpotType(pick);
    login();
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid-bg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />
      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 flex items-center justify-between">
          <TroveLogo />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Spot setup · 1/1</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Welcome to Trove Engine</p>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">
            What kind of <span className="text-gradient">Spot</span> are you?
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Trove Engine adapts to how you actually work — whether you sell tickets to nights, take bookings by the hour,
            host overnight stays, run an open exhibit, or take groups out into the wild.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {SPOT_TYPES.map((t, i) => {
            const active = pick === t.id;
            return (
              <motion.button
                key={t.id}
                onClick={() => setPick(t.id)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition-all ${
                  active
                    ? "border-primary bg-gradient-brand-soft shadow-glow"
                    : "border-border/60 bg-card hover:border-primary/40 hover:shadow-glow-sm"
                }`}
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-brand opacity-10 blur-3xl" />
                <div className="relative">
                  <div className="mb-4 text-4xl">{t.icon}</div>
                  <h3 className="font-display text-xl font-bold">{t.label}</h3>
                  <p className="mt-1 text-sm text-primary">{t.blurb}</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t.examples}</p>
                  {active && (
                    <div className="absolute right-0 top-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Selected
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">You can change this later in your Spot Profile.</p>
          <Button
            disabled={!pick}
            onClick={submit}
            className="h-12 bg-gradient-brand px-6 font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            Enter the Engine <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
