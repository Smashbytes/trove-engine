import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Lock,
  Camera,
  Star,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TroveLogo } from "@/components/trove/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import type { HostType, Json } from "@/lib/database.types";
import { useCreateHostProfile } from "@/lib/queries";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your Spot · Trove Engine" },
      {
        name: "description",
        content: "Create your host profile and submit your verification details.",
      },
    ],
  }),
  component: Onboarding,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const HOST_TYPES: Array<{
  id: HostType;
  label: string;
  sub: string;
  detail: string;
  badge: string;
  icon: typeof Building2;
}> = [
  {
    id: "venue",
    label: "Venue",
    sub: "Permanent location",
    detail: "Clubs, restaurants, spas, lounges and permanent locations.",
    badge: "Profile First · Then Events",
    icon: Building2,
  },
  {
    id: "organiser",
    label: "Event Organiser",
    sub: "One-time events",
    detail: "Festivals, concerts, and anyone hosting time-bound events.",
    badge: "Focus: Events & Ticketing",
    icon: CalendarDays,
  },
  {
    id: "experience",
    label: "Experience Provider",
    sub: "Bookable activities",
    detail: "Spas, adventures, workshops, and recurring experiences.",
    badge: "Focus: Slots & Availability",
    icon: Sparkles,
  },
  {
    id: "accommodation",
    label: "Accommodation",
    sub: "Stays & rooms",
    detail: "Hotels, lodges, guest houses, glamping and multi-room stays.",
    badge: "Focus: Rooms & Availability",
    icon: MapPin,
  },
];

const GLOBAL_STEP_LABELS = ["Welcome", "Host Type", "Verification", "Review", "Complete"];

const SUB_STEP_LABELS: Record<HostType, string[]> = {
  venue: ["Venue Profile", "Venue Details", "Media & Gallery", "First Event"],
  organiser: ["Event Details", "Ticket Setup", "Event Media", "Publish Event"],
  experience: ["Experience Details", "Group & Requirements", "Availability", "Review & Publish"],
  accommodation: [
    "Property Details",
    "Amenities & Policies",
    "Room Types",
    "Availability",
    "Review & Publish",
  ],
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type GlobalStep = 1 | 2 | 3 | 4 | 5;
type SubStepProps = { step: number; onNext: () => void; onBack: () => void };

type AddressSelection = {
  label: string;
  address: string;
  addressNumber: string;
  city: string;
  lat: number;
  lng: number;
  placeId: string;
  raw: Json;
};

// ─── Main Component ───────────────────────────────────────────────────────────

function Onboarding() {
  const navigate = useNavigate();
  const { profile, user, isHost } = useAuth();
  const createHostProfile = useCreateHostProfile();

  // Navigation
  const [globalStep, setGlobalStep] = useState<GlobalStep>(1);
  const [inSubFlow, setInSubFlow] = useState(false);
  const [subStep, setSubStep] = useState(1);

  // Global form
  const [hostType, setHostType] = useState<HostType | null>(null);
  const [businessName, setBusinessName] = useState(profile?.full_name ?? "");
  const [city, setCity] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<AddressSelection | null>(null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [contactPerson, setContactPerson] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [companyReg, setCompanyReg] = useState("");
  const [idPassport, setIdPassport] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("business");
  const [documentName, setDocumentName] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(businessName));
  }, [businessName, slugTouched]);

  useEffect(() => {
    if (isHost && !inSubFlow && globalStep < 5) navigate({ to: "/dashboard" });
  }, [isHost, globalStep, inSubFlow, navigate]);

  const maxSubSteps = hostType ? SUB_STEP_LABELS[hostType].length : 4;

  // ── Global navigation ────────────────────────────────────────────────────────
  const advanceGlobal = () => {
    if (globalStep === 2 && !hostType) {
      toast.error("Please choose a host type to continue.");
      return;
    }
    if (globalStep === 3) {
      if (
        !businessName.trim() ||
        !city.trim() ||
        !selectedAddress ||
        !companyReg.trim() ||
        !contactPerson.trim()
      ) {
        toast.error("Please choose a searchable address and fill in the required fields.");
        return;
      }
      if ((bank.trim() && !accountNumber.trim()) || (!bank.trim() && accountNumber.trim())) {
        toast.error("Add both bank and account number, or skip banking for now.");
        return;
      }
    }
    if (globalStep < 5) setGlobalStep((s) => (s + 1) as GlobalStep);
  };

  const retreatGlobal = () => {
    if (globalStep > 1) setGlobalStep((s) => (s - 1) as GlobalStep);
  };

  const submitForReview = async () => {
    if (!confirmed) {
      toast.error("Please confirm your details are correct.");
      return;
    }
    if (!hostType) {
      toast.error("Host type is required.");
      return;
    }
    if (!selectedAddress) {
      toast.error("Please choose a searchable address before submitting.");
      setGlobalStep(3);
      return;
    }
    try {
      await createHostProfile.mutateAsync({
        hostType,
        slug: slug.trim() || slugify(businessName),
        city: city.trim(),
        address: selectedAddress.address,
        addressNumber: selectedAddress.addressNumber,
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
        locationPlaceId: selectedAddress.placeId,
        locationJson: selectedAddress.raw,
        displayName: businessName.trim(),
        phone: phone.trim() || undefined,
        legalName: businessName.trim(),
        registration: companyReg.trim(),
        bankAccount:
          bank.trim() && accountNumber.trim()
            ? {
                bank: bank.trim(),
                account_number: accountNumber.trim(),
                account_type: accountType,
              }
            : undefined,
      });
      setGlobalStep(5);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    }
  };

  // ── Sub-flow navigation ──────────────────────────────────────────────────────
  const advanceSub = () => {
    if (subStep < maxSubSteps) {
      setSubStep((s) => s + 1);
    } else {
      navigate({ to: "/dashboard" });
      toast.success("Your listing is live! Check the dashboard.");
    }
  };

  const retreatSub = () => {
    if (subStep > 1) setSubStep((s) => s - 1);
    else {
      setInSubFlow(false);
      setSubStep(1);
    }
  };

  const startSubFlow = () => {
    setInSubFlow(true);
    setSubStep(1);
  };

  // ── Sub-flow shell ───────────────────────────────────────────────────────────
  if (inSubFlow && hostType) {
    const labels = SUB_STEP_LABELS[hostType];
    return (
      <OnboardingShell>
        <SubFlowHeader
          hostType={hostType}
          step={subStep}
          totalSteps={maxSubSteps}
          labels={labels}
        />
        <div className="mx-auto max-w-lg px-4 pb-28">
          {hostType === "venue" && (
            <VenueSubStep step={subStep} onNext={advanceSub} onBack={retreatSub} />
          )}
          {hostType === "organiser" && (
            <OrganiserSubStep step={subStep} onNext={advanceSub} onBack={retreatSub} />
          )}
          {hostType === "experience" && (
            <ExperienceSubStep step={subStep} onNext={advanceSub} onBack={retreatSub} />
          )}
          {hostType === "accommodation" && (
            <AccommodationSubStep step={subStep} onNext={advanceSub} onBack={retreatSub} />
          )}
        </div>
      </OnboardingShell>
    );
  }

  // ── Global flow ──────────────────────────────────────────────────────────────
  return (
    <OnboardingShell>
      {globalStep < 5 && <GlobalStepper step={globalStep} />}
      <div className="mx-auto max-w-lg px-4 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={globalStep}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22 }}
          >
            {globalStep === 1 && (
              <WelcomeStep userEmail={user?.email ?? ""} onNext={advanceGlobal} />
            )}
            {globalStep === 2 && (
              <HostTypeStep
                hostType={hostType}
                setHostType={setHostType}
                onNext={advanceGlobal}
                onBack={retreatGlobal}
              />
            )}
            {globalStep === 3 && (
              <VerificationStep
                businessName={businessName}
                setBusinessName={setBusinessName}
                city={city}
                setCity={setCity}
                selectedAddress={selectedAddress}
                setSelectedAddress={setSelectedAddress}
                contactPerson={contactPerson}
                setContactPerson={setContactPerson}
                phone={phone}
                setPhone={setPhone}
                companyReg={companyReg}
                setCompanyReg={setCompanyReg}
                idPassport={idPassport}
                setIdPassport={setIdPassport}
                bank={bank}
                setBank={setBank}
                accountNumber={accountNumber}
                setAccountNumber={setAccountNumber}
                accountType={accountType}
                setAccountType={setAccountType}
                documentName={documentName}
                setDocumentName={setDocumentName}
                onNext={advanceGlobal}
                onBack={retreatGlobal}
              />
            )}
            {globalStep === 4 && (
              <ReviewStep
                selectedType={HOST_TYPES.find((t) => t.id === hostType) ?? null}
                businessName={businessName}
                city={city}
                selectedAddress={selectedAddress}
                contactPerson={contactPerson}
                phone={phone}
                companyReg={companyReg}
                bank={bank}
                accountNumber={accountNumber}
                accountType={accountType}
                documentName={documentName}
                confirmed={confirmed}
                setConfirmed={setConfirmed}
                onEdit={(s) => setGlobalStep(s as GlobalStep)}
                onSubmit={submitForReview}
                busy={createHostProfile.isPending}
                onBack={retreatGlobal}
              />
            )}
            {globalStep === 5 && (
              <CompleteStep
                hostType={hostType}
                businessName={businessName}
                onStartListing={startSubFlow}
                onDashboard={() => navigate({ to: "/dashboard" })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </OnboardingShell>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen surface-1 flex flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <TroveLogo />
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hidden sm:block">
          Host Setup
        </span>
      </header>
      <div className="flex-1">{children}</div>
      <div className="fixed bottom-0 inset-x-0 flex items-center justify-center gap-6 py-2.5 bg-background/90 backdrop-blur-md border-t border-border/40">
        <span className="text-[10px] text-muted-foreground">Save as Draft</span>
        <span className="text-border/60">·</span>
        <span className="text-[10px] text-muted-foreground">? Help</span>
        <span className="text-border/60">·</span>
        <span className="text-[10px] text-muted-foreground">Auto Save · Every 30 seconds</span>
      </div>
    </div>
  );
}

// ─── Global Stepper ───────────────────────────────────────────────────────────

function GlobalStepper({ step }: { step: number }) {
  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-6">
      <div className="flex items-center gap-0">
        {GLOBAL_STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1 flex-none">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    done
                      ? "bg-success text-white"
                      : active
                        ? "bg-gradient-brand text-white shadow-glow-sm"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : num}
                </div>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider text-center w-14 hidden sm:block ${
                    active ? "text-primary" : "text-muted-foreground/60"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < GLOBAL_STEP_LABELS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${step > num ? "bg-success" : "bg-border/40"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-flow Header ──────────────────────────────────────────────────────────

function SubFlowHeader({
  hostType,
  step,
  totalSteps,
  labels,
}: {
  hostType: HostType;
  step: number;
  totalSteps: number;
  labels: string[];
}) {
  const typeLabel: Record<HostType, string> = {
    venue: "Venue Setup",
    organiser: "Event Setup",
    experience: "Experience Setup",
    accommodation: "Property Setup",
  };
  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-6">
      <p className="eyebrow text-primary mb-3">
        {typeLabel[hostType]} · Step {step} of {totalSteps}
      </p>
      <div className="flex items-center gap-0">
        {labels.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1 flex-none">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    done
                      ? "bg-success text-white"
                      : active
                        ? "bg-gradient-brand text-white shadow-glow-sm"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : num}
                </div>
                <span
                  className={`text-[8px] font-semibold uppercase tracking-wider text-center w-12 hidden sm:block truncate ${
                    active ? "text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all duration-300 ${step > num ? "bg-success" : "bg-border/40"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1 — Welcome ─────────────────────────────────────────────────────────

function WelcomeStep({ userEmail, onNext }: { userEmail: string; onNext: () => void }) {
  return (
    <div className="pt-4 pb-8">
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow mb-6"
        >
          <Sparkles className="h-10 w-10 text-white" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold mb-2 tracking-tight">
          Welcome to TROVE Spots
        </h1>
        <p className="text-muted-foreground text-sm">
          The best way to list, manage and grow your business.
        </p>
        {userEmail && (
          <p className="mt-2 text-xs text-muted-foreground">
            Signed in as <span className="text-foreground font-medium">{userEmail}</span>
          </p>
        )}
      </div>

      <div className="space-y-3 mb-8">
        {[
          {
            icon: UserRound,
            title: "1. Choose your mode",
            body: "Tell Trove whether you run a venue, organise events, host experiences, or manage stays.",
          },
          {
            icon: ShieldCheck,
            title: "2. Verify your business",
            body: "Capture legal and payout details before you can publish live listings.",
          },
          {
            icon: CheckCircle2,
            title: "3. Set up your first listing",
            body: "Use the guided setup wizard to get your first listing live fast.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/50 p-4"
          >
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="w-full h-14 bg-gradient-brand text-white font-bold text-base shadow-glow hover:opacity-95"
      >
        Get Started <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Takes about 3 minutes · Banking can be added later
      </p>
    </div>
  );
}

// ─── Step 2 — Host Type ───────────────────────────────────────────────────────

function HostTypeStep({
  hostType,
  setHostType,
  onNext,
  onBack,
}: {
  hostType: HostType | null;
  setHostType: (t: HostType) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="pt-4 pb-8">
      <p className="eyebrow text-primary mb-2">Step 2 of 4</p>
      <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">What do you host?</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Choose the option that best describes your business.
      </p>

      <div className="space-y-3 mb-8">
        {HOST_TYPES.map((type) => {
          const active = hostType === type.id;
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setHostType(type.id)}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                active
                  ? "border-primary bg-primary/10 shadow-glow-sm"
                  : "border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-gradient-brand text-white shadow-glow-sm"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-base font-semibold">{type.label}</p>
                    {active && <CheckCircle2 className="h-4 w-4 text-primary flex-none" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{type.sub}</p>
                </div>
              </div>
              {active && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 pt-3 border-t border-primary/20"
                >
                  <p className="text-xs text-muted-foreground leading-relaxed">{type.detail}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {type.badge}
                  </span>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue" />
    </div>
  );
}

// ─── Step 3 — Business Verification ──────────────────────────────────────────

interface VerificationStepProps {
  businessName: string;
  setBusinessName: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  selectedAddress: AddressSelection | null;
  setSelectedAddress: (v: AddressSelection | null) => void;
  contactPerson: string;
  setContactPerson: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  companyReg: string;
  setCompanyReg: (v: string) => void;
  idPassport: string;
  setIdPassport: (v: string) => void;
  bank: string;
  setBank: (v: string) => void;
  accountNumber: string;
  setAccountNumber: (v: string) => void;
  accountType: string;
  setAccountType: (v: string) => void;
  documentName: string;
  setDocumentName: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

function VerificationStep({
  businessName,
  setBusinessName,
  city,
  setCity,
  selectedAddress,
  setSelectedAddress,
  contactPerson,
  setContactPerson,
  phone,
  setPhone,
  companyReg,
  setCompanyReg,
  idPassport,
  setIdPassport,
  bank,
  setBank,
  accountNumber,
  setAccountNumber,
  accountType,
  setAccountType,
  documentName,
  setDocumentName,
  onNext,
  onBack,
}: VerificationStepProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setDocumentName(f.name);
  };

  return (
    <div className="pt-4 pb-8">
      <p className="eyebrow text-primary mb-2">Step 3 of 4</p>
      <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">Verify your business</h2>
      <p className="text-sm text-muted-foreground mb-6">
        We need a few details to verify your business.
      </p>

      <div className="space-y-4">
        <Field label="Legal Name *">
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Neon Underground (Pty) Ltd"
          />
        </Field>

        <AddressSearchField
          city={city}
          setCity={setCity}
          selectedAddress={selectedAddress}
          setSelectedAddress={setSelectedAddress}
        />

        <Field label="Company Registration No. *">
          <Input
            value={companyReg}
            onChange={(e) => setCompanyReg(e.target.value)}
            placeholder="2024/123456/07"
          />
        </Field>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">Bank Account Details</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Optional for now. You can submit without banking, but payouts stay paused until it is
              added in Settings.
            </p>
          </div>
          <Field label="Bank">
            <Input
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Standard Bank"
            />
          </Field>
          <Field label="Account Number">
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0123456789"
              inputMode="numeric"
            />
          </Field>
          <div>
            <Label>Account Type</Label>
            <div className="mt-2 flex gap-2">
              {["business", "current", "savings"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAccountType(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    accountType === t
                      ? "border-primary bg-gradient-brand text-white shadow-glow-sm"
                      : "border-border/60 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Field label="ID / Passport / License">
          <Input
            value={idPassport}
            onChange={(e) => setIdPassport(e.target.value)}
            placeholder="9001015009086"
          />
        </Field>

        <div>
          <Label>Upload Document</Label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`mt-2 w-full rounded-2xl border-2 border-dashed p-5 text-center transition-all hover:border-primary/50 ${
              documentName ? "border-primary/50 bg-primary/5" : "border-border/50 hover:bg-card/30"
            }`}
          >
            {documentName ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success flex-none" />
                <span className="truncate max-w-[220px] font-medium">{documentName}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Upload ID / Registration / License</span>
                <span className="text-xs">PDF, JPG, PNG · max 10MB</span>
              </div>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        <Field label="Contact Person *">
          <Input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Jane Smith"
          />
        </Field>

        <Field label="Contact Phone">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+27 82 555 0142"
            type="tel"
          />
        </Field>
      </div>

      <div className="mt-6">
        <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue to Review" />
      </div>
    </div>
  );
}

// ─── Step 4 — Review & Submit ─────────────────────────────────────────────────

type NominatimResult = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string | undefined>;
};

function AddressSearchField({
  city,
  setCity,
  selectedAddress,
  setSelectedAddress,
}: {
  city: string;
  setCity: (v: string) => void;
  selectedAddress: AddressSelection | null;
  setSelectedAddress: (v: AddressSelection | null) => void;
}) {
  const [query, setQuery] = useState(selectedAddress?.label ?? city);
  const [manualNumber, setManualNumber] = useState(selectedAddress?.addressNumber ?? "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          format: "jsonv2",
          addressdetails: "1",
          limit: "6",
          countrycodes: "za",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Address search failed");
        setResults((await response.json()) as NominatimResult[]);
        setOpen(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[onboarding] address search failed:", error);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const applySelection = (result: NominatimResult, numberOverride = manualNumber) => {
    const address = result.address ?? {};
    const cityName =
      address.city ??
      address.town ??
      address.village ??
      address.suburb ??
      address.municipality ??
      address.county ??
      "";
    const houseNumber = numberOverride.trim() || address.house_number || "";
    const street = address.road ?? address.pedestrian ?? address.neighbourhood ?? "";
    const composedAddress =
      houseNumber && street
        ? `${houseNumber} ${street}, ${result.display_name}`
        : result.display_name;

    const selection: AddressSelection = {
      label: result.display_name,
      address: composedAddress,
      addressNumber: houseNumber,
      city: cityName || result.display_name.split(",").slice(-3, -2)[0]?.trim() || "",
      lat: Number(result.lat),
      lng: Number(result.lon),
      placeId: String(result.place_id),
      raw: result as unknown as Json,
    };

    setSelectedAddress(selection);
    setCity(selection.city);
    setQuery(selection.label);
    setManualNumber(selection.addressNumber);
    setOpen(false);
  };

  const updateManualNumber = (value: string) => {
    setManualNumber(value);
    if (!selectedAddress) return;
    const existingNumber = selectedAddress.addressNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const withoutNumber = existingNumber
      ? selectedAddress.address.replace(new RegExp(`^${existingNumber}\\s*`), "")
      : selectedAddress.address;
    setSelectedAddress({
      ...selectedAddress,
      addressNumber: value.trim(),
      address: value.trim() ? `${value.trim()} ${withoutNumber}` : withoutNumber,
    });
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <Field label="Searchable Address *">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedAddress(null);
            }}
            onFocus={() => setOpen(results.length > 0)}
            placeholder="Search street, venue, suburb, or area"
            className="pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {open && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-popover p-1 shadow-card">
              {results.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() => applySelection(result)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="line-clamp-2">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>

      <div className="mt-3 grid gap-3 sm:grid-cols-[0.45fr_1fr]">
        <Field label="Street number">
          <Input
            value={manualNumber}
            onChange={(e) => updateManualNumber(e.target.value)}
            placeholder="Add manually"
          />
        </Field>
        <Field label="City / Area">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Auto-filled from address"
          />
        </Field>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {selectedAddress
          ? `Coordinates captured: ${selectedAddress.lat.toFixed(5)}, ${selectedAddress.lng.toFixed(5)}`
          : "Choose a result so Trove can store coordinates for maps, HQ, and guest discovery."}
      </p>
    </div>
  );
}

interface ReviewStepProps {
  selectedType: (typeof HOST_TYPES)[number] | null;
  businessName: string;
  city: string;
  selectedAddress: AddressSelection | null;
  contactPerson: string;
  phone: string;
  companyReg: string;
  bank: string;
  accountNumber: string;
  accountType: string;
  documentName: string;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  onEdit: (step: number) => void;
  onSubmit: () => void;
  busy: boolean;
  onBack: () => void;
}

function ReviewStep({
  selectedType,
  businessName,
  city,
  selectedAddress,
  contactPerson,
  phone,
  companyReg,
  bank,
  accountNumber,
  accountType,
  documentName,
  confirmed,
  setConfirmed,
  onEdit,
  onSubmit,
  busy,
  onBack,
}: ReviewStepProps) {
  return (
    <div className="pt-4 pb-8">
      <p className="eyebrow text-primary mb-2">Step 4 of 4</p>
      <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
        Review your information
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Please ensure all details are correct before submitting.
      </p>

      <div className="space-y-3 mb-6">
        <ReviewCard
          title="Business Details"
          onEdit={() => onEdit(3)}
          rows={[
            { label: "Legal name", value: businessName || "—" },
            { label: "Location", value: selectedAddress?.address || city || "—" },
            {
              label: "Coordinates",
              value: selectedAddress
                ? `${selectedAddress.lat.toFixed(5)}, ${selectedAddress.lng.toFixed(5)}`
                : "—",
            },
            { label: "Reg. No.", value: companyReg || "—" },
            { label: "Host type", value: selectedType?.label ?? "—" },
          ]}
        />
        <ReviewCard
          title="Bank Details"
          onEdit={() => onEdit(3)}
          rows={[
            { label: "Bank", value: bank || "—" },
            { label: "Account", value: accountNumber ? `****${accountNumber.slice(-4)}` : "—" },
            { label: "Type", value: bank ? accountType : "Skipped for now" },
          ]}
        />
        <ReviewCard
          title="Contact Person"
          onEdit={() => onEdit(3)}
          rows={[
            { label: "Name", value: contactPerson || "—" },
            { label: "Phone", value: phone || "—" },
          ]}
        />
        <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Document</p>
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" /> Locked after submission
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{documentName || "No document uploaded"}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setConfirmed(!confirmed)}
        className={`mb-6 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
          confirmed
            ? "border-primary/60 bg-primary/10"
            : "border-warning/45 bg-warning/10 hover:border-warning/70"
        }`}
      >
        <div
          className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded transition-all ${
            confirmed ? "bg-primary border-primary border" : "border border-border/60"
          }`}
        >
          {confirmed && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </div>
        <span className="text-sm leading-relaxed text-foreground">
          I have reviewed the business, address, contact, and payout details above. I understand
          skipped banking details must be added before payouts can run.
        </span>
      </button>

      <div className="space-y-3">
        <Button
          onClick={onSubmit}
          disabled={busy || !confirmed}
          className="w-full h-14 bg-gradient-brand text-white font-bold text-base shadow-glow hover:opacity-95 disabled:opacity-40"
        >
          {busy ? "Submitting…" : "Submit for Review"}
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={busy} className="w-full h-11">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    </div>
  );
}

function ReviewCard({
  title,
  onEdit,
  rows,
}: {
  title: string;
  onEdit: () => void;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-primary hover:underline font-medium"
        >
          Edit
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className="text-xs font-medium text-right max-w-[60%] truncate">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5 — Complete ────────────────────────────────────────────────────────

function CompleteStep({
  hostType,
  businessName,
  onStartListing,
  onDashboard,
}: {
  hostType: HostType | null;
  businessName: string;
  onStartListing: () => void;
  onDashboard: () => void;
}) {
  const typeNextStep: Record<HostType, string> = {
    venue: "Set up your venue profile",
    organiser: "Create your first event",
    experience: "Set up your experience",
    accommodation: "List your property & rooms",
  };

  return (
    <div className="pt-8 pb-8 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-brand shadow-glow mb-6"
      >
        <Star className="h-12 w-12 text-white" />
      </motion.div>

      <p className="eyebrow text-primary mb-2">Submitted</p>
      <h1 className="font-display text-4xl font-bold mb-3 tracking-tight">All Set!</h1>
      <p className="text-muted-foreground text-sm mb-2 max-w-sm mx-auto leading-relaxed">
        Your account is under review. You'll be notified once approved.
      </p>
      {businessName && (
        <p className="text-xs text-muted-foreground mb-8">
          Welcome aboard, <span className="text-foreground font-medium">{businessName}</span>.
        </p>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/50 p-5 mb-6 text-left">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          What's next?
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onStartListing}
            className="w-full flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 p-3.5 text-left hover:bg-primary/20 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {hostType ? typeNextStep[hostType] : "Create your first listing"}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
          </button>
          <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-3.5 opacity-50">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Verify your business</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Pending review
            </span>
          </div>
        </div>
      </div>

      <Button
        onClick={onDashboard}
        className="w-full h-14 bg-gradient-brand text-white font-bold text-base shadow-glow hover:opacity-95"
      >
        Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}

// ─── Venue Sub-flow ───────────────────────────────────────────────────────────

function VenueSubStep({ step, onNext, onBack }: SubStepProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [openWeek, setOpenWeek] = useState({ open: "18:00", close: "03:00" });
  const [openWknd, setOpenWknd] = useState({ open: "16:00", close: "04:00" });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [firstDate, setFirstDate] = useState("");
  const [firstTime, setFirstTime] = useState("20:00");
  const [firstPrice, setFirstPrice] = useState("");
  const [firstFree, setFirstFree] = useState(false);

  const VIBE_TAGS = ["Hype", "Chill", "Live Music", "Classy"];
  const AMENITIES = [
    "Parking",
    "VIP Area",
    "Wi-Fi",
    "Outdoor",
    "Smoking Area",
    "Wheelchair",
    "Pool",
    "Restaurant",
    "Bar",
  ];

  const toggleTag = (t: string) =>
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const toggleAmenity = (a: string) =>
    setAmenities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.2 }}
      >
        {step === 1 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Venue Profile</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Let's set up your venue
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Tell guests more about your space.</p>
            <div className="space-y-4">
              <Field label="Venue Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Neon Underground"
                />
              </Field>
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select category…</option>
                  {[
                    "Nightclub",
                    "Restaurant",
                    "Rooftop",
                    "Lounge",
                    "Spa",
                    "Theatre",
                    "Studio",
                    "Event Space",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <div>
                <Label>Vibe</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VIBE_TAGS.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      active={tags.includes(tag)}
                      onClick={() => toggleTag(tag)}
                    />
                  ))}
                </div>
              </div>
              <Field label="Video (e.g. Hype, Drill) · Optional">
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                />
              </Field>
              <Field label="Address">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Search location"
                    className="pl-9"
                  />
                </div>
              </Field>
              <div>
                <Label>Opening Hours</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-muted-foreground flex-none">Mon – Fri</span>
                    <Input
                      value={openWeek.open}
                      onChange={(e) => setOpenWeek({ ...openWeek, open: e.target.value })}
                      className="text-xs h-9"
                      placeholder="18:00"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      value={openWeek.close}
                      onChange={(e) => setOpenWeek({ ...openWeek, close: e.target.value })}
                      className="text-xs h-9"
                      placeholder="03:00"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-muted-foreground flex-none">Sat – Sun</span>
                    <Input
                      value={openWknd.open}
                      onChange={(e) => setOpenWknd({ ...openWknd, open: e.target.value })}
                      className="text-xs h-9"
                      placeholder="16:00"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      value={openWknd.close}
                      onChange={(e) => setOpenWknd({ ...openWknd, close: e.target.value })}
                      className="text-xs h-9"
                      placeholder="04:00"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Save & Continue" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Venue Details</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Tell guests more
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Add the amenities your venue offers.
            </p>
            <div>
              <Label>Amenities</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {AMENITIES.map((a) => (
                  <Chip
                    key={a}
                    label={a}
                    active={amenities.includes(a)}
                    onClick={() => toggleAmenity(a)}
                  />
                ))}
              </div>
              {amenities.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {amenities.length} amenities selected
                </p>
              )}
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Save & Continue" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Media & Gallery</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Show off your venue
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              High-quality photos get more bookings.
            </p>
            <UploadArea label="Upload Cover Image" hint="Recommended 16:9 · PNG, JPG up to 10MB" />
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">First Event · Optional</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Add your first event
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Get your calendar rolling right away.
            </p>
            <div className="space-y-4">
              <Field label="Event Name">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Techno Tuesdays"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <Input
                    value={firstDate}
                    onChange={(e) => setFirstDate(e.target.value)}
                    type="date"
                  />
                </Field>
                <Field label="Time">
                  <Input
                    value={firstTime}
                    onChange={(e) => setFirstTime(e.target.value)}
                    placeholder="20:00"
                  />
                </Field>
              </div>
              <div>
                <Field label="Ticket Price (ZAR)">
                  <Input
                    value={firstFree ? "0.00" : firstPrice}
                    onChange={(e) => setFirstPrice(e.target.value)}
                    disabled={firstFree}
                    placeholder="150.00"
                    type="number"
                  />
                </Field>
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={firstFree}
                    onChange={(e) => setFirstFree(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">R 0.00 — Free event</span>
                </label>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <Button
                onClick={onNext}
                className="w-full h-12 bg-gradient-brand text-white font-bold shadow-glow hover:opacity-95"
              >
                Create your first event <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={onNext} className="w-full h-12">
                Skip for now
              </Button>
              <Button variant="ghost" onClick={onBack} className="w-full h-11">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Organiser Sub-flow ───────────────────────────────────────────────────────

function OrganiserSubStep({ step, onNext, onBack }: SubStepProps) {
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("20:00");
  const [ticketType, setTicketType] = useState("General Admission");
  const [admission, setAdmission] = useState("General Admission");
  const [price, setPrice] = useState("120");
  const [quantity, setQuantity] = useState("200");
  const [showRemain, setShowRemain] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.2 }}
      >
        {step === 1 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Event Details</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Let's create your event
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Fill in the basics.</p>
            <div className="space-y-4">
              <Field label="Event Name">
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Comedy Night at the Club"
                />
              </Field>
              <Field label="Event Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your event…"
                />
              </Field>
              <Field label="Venue">
                <Input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Search or enter venue"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
                </Field>
                <Field label="Time">
                  <Input
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="20:00"
                  />
                </Field>
              </div>
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Save & Continue" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Ticket Setup</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              How will guests book?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Set up your ticket tiers and pricing.
            </p>
            <div className="space-y-4">
              <Field label="Ticket Type">
                <Input
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  placeholder="General Admission"
                />
              </Field>
              <Field label="Ticket Admission">
                <select
                  value={admission}
                  onChange={(e) => setAdmission(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {["General Admission", "VIP", "Early Bird", "Complimentary"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (ZAR)">
                  <Input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="120"
                    type="number"
                  />
                </Field>
                <Field label="Quantity / Capacity">
                  <Input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="200"
                    type="number"
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRemain}
                  onChange={(e) => setShowRemain(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm text-muted-foreground">Show remaining tickets</span>
              </label>
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Save & Continue" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Event Media</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">Add visuals</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Upload your event poster to attract ticket buyers.
            </p>
            <UploadArea label="Upload Event Poster" hint="Recommended 2:3 · PNG, JPG up to 10MB" />
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Publish Event</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Review and publish
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Make sure everything looks good before going live.
            </p>
            <PublishChecklist
              items={[
                { label: "Event Details", ok: !!eventName, warn: !eventName },
                { label: "Ticket Setup", ok: !!price, warn: false },
                { label: "Date & Time", ok: !!date, warn: !date },
              ]}
              onEdit={onBack}
            />
            <ConfirmCheck confirmed={confirmed} setConfirmed={setConfirmed} />
            <div className="space-y-3">
              <Button
                onClick={onNext}
                className="w-full h-12 bg-gradient-brand text-white font-bold shadow-glow hover:opacity-95"
              >
                Publish Event <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={onBack} className="w-full h-11">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Experience Sub-flow ──────────────────────────────────────────────────────

function ExperienceSubStep({ step, onNext, onBack }: SubStepProps) {
  const navigate = useNavigate();

  const [expName, setExpName] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [minGroup, setMinGroup] = useState("1");
  const [maxGroup, setMaxGroup] = useState("10");
  const [included, setIncluded] = useState<string[]>([]);
  const [toBring, setToBring] = useState("Comfortable clothes");
  const [activeDays, setActiveDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [slots, setSlots] = useState([
    { time: "08:00", capacity: 10 },
    { time: "11:00", capacity: 10 },
    { time: "13:00", capacity: 10 },
    { time: "14:00", capacity: 10 },
  ]);
  const [confirmed, setConfirmed] = useState(false);

  const INCLUDED = ["Equipment", "Guide", "Snacks", "Refreshments", "Transport", "Safety Gear"];
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (d: string) =>
    setActiveDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  const toggleIncluded = (i: string) =>
    setIncluded((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.2 }}
      >
        {step === 1 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Experience Details</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Tell us about your experience
            </h2>
            <p className="text-sm text-muted-foreground mb-6">What are you offering?</p>
            <div className="space-y-4">
              <Field label="Experience Name">
                <Input
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  placeholder="Tandem Skydive at Sunset"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe your experience…"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duration (mins)">
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="60"
                    type="number"
                  />
                </Field>
                <Field label="Price per person (ZAR)">
                  <Input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    type="number"
                  />
                </Field>
              </div>
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Save & Continue" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Group & Requirements</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Set expectations
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Help guests prepare for their experience.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min Group Size">
                  <Input
                    value={minGroup}
                    onChange={(e) => setMinGroup(e.target.value)}
                    type="number"
                    placeholder="1"
                  />
                </Field>
                <Field label="Max Group Size">
                  <Input
                    value={maxGroup}
                    onChange={(e) => setMaxGroup(e.target.value)}
                    type="number"
                    placeholder="10"
                  />
                </Field>
              </div>
              <div>
                <Label>What's Included</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {INCLUDED.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      active={included.includes(item)}
                      onClick={() => toggleIncluded(item)}
                    />
                  ))}
                </div>
              </div>
              <Field label="What to Bring">
                <Textarea
                  value={toBring}
                  onChange={(e) => setToBring(e.target.value)}
                  rows={2}
                  placeholder="Comfortable clothes…"
                />
              </Field>
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Save & Continue" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Availability (Slots)</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Set your recurring schedule
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Which days and times are you available?
            </p>
            <div className="flex gap-1 mb-5">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`flex-1 rounded-lg py-2 text-[11px] font-bold transition ${
                    activeDays.includes(d)
                      ? "bg-gradient-brand text-white shadow-glow-sm"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] bg-muted/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Time</span>
                <span>Capacity</span>
                <span />
              </div>
              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-t border-border/40 px-4 py-2.5"
                >
                  <Input
                    value={slot.time}
                    onChange={(e) =>
                      setSlots(
                        slots.map((s, i) => (i === idx ? { ...s, time: e.target.value } : s)),
                      )
                    }
                    className="h-8 text-sm"
                  />
                  <Input
                    value={slot.capacity}
                    onChange={(e) =>
                      setSlots(
                        slots.map((s, i) =>
                          i === idx ? { ...s, capacity: parseInt(e.target.value) || 0 } : s,
                        ),
                      )
                    }
                    type="number"
                    className="h-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setSlots(slots.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSlots([...slots, { time: "09:00", capacity: 10 }])}
              className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <Plus className="h-4 w-4" /> Add Time Slot
            </button>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Review & Publish</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">Almost there!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Review before publishing your experience.
            </p>
            <PublishChecklist
              items={[
                { label: "Experience Details", ok: !!expName, warn: !expName },
                { label: "Requirements", ok: true, warn: false },
                { label: "Availability", ok: slots.length > 0, warn: slots.length === 0 },
              ]}
              onEdit={onBack}
            />
            <ConfirmCheck confirmed={confirmed} setConfirmed={setConfirmed} />
            <div className="space-y-3">
              <Button
                onClick={onNext}
                className="w-full h-12 bg-gradient-brand text-white font-bold shadow-glow hover:opacity-95"
              >
                Publish Experience <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-full h-12"
              >
                Manage your Slots
              </Button>
              <Button variant="ghost" onClick={onBack} className="w-full h-11">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Accommodation Sub-flow ───────────────────────────────────────────────────

function AccommodationSubStep({ step, onNext, onBack }: SubStepProps) {
  const [propName, setPropName] = useState("");
  const [propDesc, setPropDesc] = useState("");
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("14:00");
  const [checkOut, setCheckOut] = useState("10:00");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [rules, setRules] = useState<string[]>([]);
  const [rooms, setRooms] = useState([
    { name: "Deluxe Room", type: "Suite", price: "", capacity: "2" },
  ]);
  const [confirmed, setConfirmed] = useState(false);

  const AMENITIES = [
    "Wi-Fi",
    "Pool",
    "Breakfast",
    "Parking",
    "AC",
    "Kitchen",
    "Gym",
    "Spa",
    "Pet Friendly",
  ];
  const RULES = ["No smoking", "No pets", "Quiet hours", "No parties"];

  const toggleAmenity = (a: string) =>
    setAmenities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  const toggleRule = (r: string) =>
    setRules((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.2 }}
      >
        {step === 1 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Property Details</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Tell us about your property
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Start with the basics.</p>
            <div className="space-y-4">
              <Field label="Property Name">
                <Input
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  placeholder="Magalies River Lodge"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={propDesc}
                  onChange={(e) => setPropDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe your property…"
                />
              </Field>
              <Field label="Location">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Magaliesberg"
                    className="pl-9"
                  />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Check In">
                  <Input
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    placeholder="14:00"
                  />
                </Field>
                <Field label="Check Out">
                  <Input
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    placeholder="11:00"
                  />
                </Field>
              </div>
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Save & Continue" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Amenities & Policies</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Add amenities & rules
            </h2>
            <p className="text-sm text-muted-foreground mb-6">What does your property offer?</p>
            <div className="space-y-5">
              <div>
                <Label>Amenities</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AMENITIES.map((a) => (
                    <Chip
                      key={a}
                      label={a}
                      active={amenities.includes(a)}
                      onClick={() => toggleAmenity(a)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>House Rules</Label>
                <div className="mt-2 space-y-2.5">
                  {RULES.map((rule) => (
                    <label key={rule} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rules.includes(rule)}
                        onChange={() => toggleRule(rule)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm">{rule}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Save & Continue" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Room Types & Pricing</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">Add your rooms</h2>
            <p className="text-sm text-muted-foreground mb-6">Set room types and nightly prices.</p>
            <div className="space-y-3">
              {rooms.map((room, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Room {idx + 1}</p>
                    {rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRooms(rooms.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Room Name">
                      <Input
                        value={room.name}
                        onChange={(e) =>
                          setRooms(
                            rooms.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                          )
                        }
                        placeholder="Deluxe Kitchen"
                        className="h-9 text-sm"
                      />
                    </Field>
                    <Field label="Type">
                      <select
                        value={room.type}
                        onChange={(e) =>
                          setRooms(
                            rooms.map((r, i) => (i === idx ? { ...r, type: e.target.value } : r)),
                          )
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {["Suite", "Standard", "Deluxe", "Family", "Twin", "Single"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Price/night (ZAR)">
                      <Input
                        value={room.price}
                        onChange={(e) =>
                          setRooms(
                            rooms.map((r, i) => (i === idx ? { ...r, price: e.target.value } : r)),
                          )
                        }
                        placeholder="1850"
                        type="number"
                        className="h-9 text-sm"
                      />
                    </Field>
                    <Field label="Capacity">
                      <Input
                        value={room.capacity}
                        onChange={(e) =>
                          setRooms(
                            rooms.map((r, i) =>
                              i === idx ? { ...r, capacity: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="2"
                        type="number"
                        className="h-9 text-sm"
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setRooms([...rooms, { name: "", type: "Standard", price: "", capacity: "2" }])
                }
                className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                <Plus className="h-4 w-4" /> Add Another Room
              </button>
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Save & Continue" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Availability Calendar</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">
              Set availability & pricing
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Mark which days guests can book your property.
            </p>
            <MiniCalendar />
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-3.5 flex items-center justify-between">
              <span className="text-sm font-medium">Price applies to all available days</span>
              <Button size="sm" variant="outline" onClick={onNext} className="text-xs h-8">
                Save Price
              </Button>
            </div>
            <div className="mt-6">
              <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue" />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="pt-4 pb-8">
            <p className="eyebrow text-primary mb-2">Review & Publish</p>
            <h2 className="font-display text-2xl font-bold mb-1 tracking-tight">Almost there!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Review before publishing your property.
            </p>
            <PublishChecklist
              items={[
                {
                  label: "Rooms & Pricing",
                  ok: rooms.some((r) => r.price !== ""),
                  warn: !rooms.some((r) => r.price !== ""),
                },
                { label: "Policies", ok: amenities.length > 0 || rules.length > 0, warn: false },
                { label: "Availability", ok: true, warn: false },
              ]}
              onEdit={onBack}
            />
            <ConfirmCheck confirmed={confirmed} setConfirmed={setConfirmed} />
            <div className="space-y-3">
              <Button
                onClick={onNext}
                className="w-full h-12 bg-gradient-brand text-white font-bold shadow-glow hover:opacity-95"
              >
                Publish Property <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={onBack} className="w-full h-12">
                Update Availability
              </Button>
              <Button variant="ghost" onClick={onBack} className="w-full h-11">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Shared UI Atoms ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "border-primary bg-gradient-brand text-white shadow-glow-sm"
          : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel = "Continue",
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-3">
      <Button variant="outline" onClick={onBack} className="flex-none w-12 h-12 p-0">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Button
        onClick={onNext}
        className="flex-1 h-12 bg-gradient-brand text-white font-semibold shadow-glow hover:opacity-95"
      >
        {nextLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}

function UploadArea({ label, hint }: { label: string; hint: string }) {
  const [fileName, setFileName] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`w-full rounded-2xl border-2 border-dashed p-10 text-center transition-all hover:border-primary/50 ${
          fileName ? "border-primary/50 bg-primary/5" : "border-border/50 hover:bg-card/30"
        }`}
      >
        {fileName ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Camera className="h-10 w-10" />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs">{hint}</span>
          </div>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFileName(f.name);
        }}
      />
      <button
        type="button"
        className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
      >
        <Plus className="h-4 w-4" /> Add More
      </button>
    </div>
  );
}

function PublishChecklist({
  items,
  onEdit,
}: {
  items: Array<{ label: string; ok: boolean; warn: boolean }>;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3 mb-5">
      {items.map(({ label, ok, warn }) => (
        <div key={label} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {warn ? (
              <div className="h-4 w-4 rounded-full bg-warning/20 flex items-center justify-center">
                <span className="text-[9px] font-black text-warning">!</span>
              </div>
            ) : (
              <CheckCircle2
                className={`h-4 w-4 ${ok ? "text-success" : "text-muted-foreground"}`}
              />
            )}
            <span className="text-sm">{label}</span>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-primary hover:underline font-medium"
          >
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}

function ConfirmCheck({
  confirmed,
  setConfirmed,
}: {
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => setConfirmed(!confirmed)}
      className={`mb-5 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
        confirmed ? "border-primary/60 bg-primary/10" : "border-border/70 bg-card/50"
      }`}
    >
      <div
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded transition-all ${
          confirmed ? "bg-primary border-primary border" : "border border-border/60"
        }`}
      >
        {confirmed && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
      </div>
      <span className="text-sm text-foreground leading-relaxed">
        I confirm these details are accurate and ready to publish.
      </span>
    </button>
  );
}

function MiniCalendar() {
  const [available, setAvailable] = useState<number[]>(
    Array.from({ length: 20 }, (_, i) => i + 1).filter((d) => d % 7 !== 0 && d % 7 !== 6),
  );
  const now = new Date();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const toggle = (d: number) => {
    if (d < now.getDate()) return;
    setAvailable((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">
          {months[now.getMonth()]} {now.getFullYear()}
        </p>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({
          length: (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7,
        }).map((_, i) => (
          <div key={`p${i}`} />
        ))}
        {days.map((d) => {
          const past = d < now.getDate();
          const avail = available.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              className={`aspect-square rounded-lg text-xs font-semibold transition-all ${
                past
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : avail
                    ? "bg-primary text-white shadow-glow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary inline-block" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted inline-block" /> Blocked
        </span>
      </div>
    </div>
  );
}
