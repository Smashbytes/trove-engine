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
    <div className="min-h-screen surface-1">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <div className="mb-12 flex items-center justify-between">
          <TroveLogo />
          <p className="eyebrow">Spot setup · 1/1</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="eyebrow text-primary">Welcome to Trove Engine</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] md:text-6xl">
            What kind of <span className="text-gradient">Spot</span> are you?
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            Trove Engine adapts to how you actually work — whether you sell tickets to nights, take bookings by the hour,
            host overnight stays, run an open exhibit, or take groups out into the wild.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {SPOT_TYPES.map((t, i) => {
            const active = pick === t.id;
            return (
              <motion.button
                key={t.id}
                onClick={() => setPick(t.id)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`group relative overflow-hidden rounded-2xl text-left lift-on-hover ${
                  active
                    ? "ring-2 ring-primary shadow-glow"
                    : "ring-hairline"
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={t.image}
                    alt={t.label}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                  {active && (
                    <div className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Selected
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="eyebrow text-white/70">{t.blurb}</p>
                    <h3 className="mt-1.5 font-display text-2xl font-bold text-white">{t.label}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-white/70">{t.examples}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-12 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">You can change this later in your Spot Profile.</p>
          <Button
            disabled={!pick}
            onClick={submit}
            className="h-12 bg-gradient-brand px-7 font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            Enter the Engine <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
