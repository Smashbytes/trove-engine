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
  Star,
  Plus,
  ChevronRight,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TroveLogo } from "@/components/trove/Logo";
import { markJustOnboarded } from "@/lib/onboarding-flag";
import { Field } from "@/components/trove/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import type { HostType, Json } from "@/lib/database.types";
import { searchAddresses, type GeocodeResult } from "@/lib/geocoding";
import { useCreateHostProfile, useUploadKycDocument } from "@/lib/queries";
import { SA_BANKS } from "@/lib/sa-banks";
import { friendlyError } from "@/lib/errors";

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
  const uploadKyc = useUploadKycDocument();

  // Navigation
  const [globalStep, setGlobalStep] = useState<GlobalStep>(1);

  // Global form
  const [hostType, setHostType] = useState<HostType | null>(null);
  // Two different names, both required:
  //  - spotName: what guests see on TROVE (profile, listings, tickets).
  //    Sign-up already asked for it, so pre-fill from there.
  //  - businessName: the registered legal name (e.g. "… (Pty) Ltd") that
  //    TradeSafe needs for KYC and payouts.
  const [spotName, setSpotName] = useState(
    (user?.user_metadata?.spot_name as string | undefined) ?? profile?.full_name ?? "",
  );
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<AddressSelection | null>(null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  // Sign-up stores the Spot name in full_name, so don't pre-fill a person's name from it.
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [companyReg, setCompanyReg] = useState("");
  const [idPassport, setIdPassport] = useState("");
  const [idType, setIdType] = useState<"ID" | "PASSPORT">("ID");
  const [organizationType, setOrganizationType] = useState("PRIVATE");
  const [bank, setBank] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("business");
  const [documentName, setDocumentName] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [escrowStatus, setEscrowStatus] = useState("not_started");
  // Once submission starts, the first complete-host-onboarding call flips
  // is_host — without this the redirect below would yank the host to the
  // dashboard mid-submit, before the KYC upload and the TradeSafe result.
  const [submitStarted, setSubmitStarted] = useState(false);
  const [verifyErrors, setVerifyErrors] = useState<Record<string, string>>({});

  // The public URL comes from the Spot name, not the legal "(Pty) Ltd" name.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(spotName));
  }, [spotName, slugTouched]);

  useEffect(() => {
    if (isHost && !submitStarted && globalStep < 5) navigate({ to: "/dashboard" });
  }, [isHost, submitStarted, globalStep, navigate]);

  // ── Global navigation ────────────────────────────────────────────────────────
  const advanceGlobal = () => {
    if (globalStep === 2 && !hostType) {
      toast.error("Please choose a host type to continue.");
      return;
    }
    if (globalStep === 3) {
      const errors: Record<string, string> = {};
      if (!spotName.trim()) errors.spotName = "Add the name guests will see on TROVE.";
      if (!businessName.trim())
        errors.businessName = "Add your registered business name, exactly as on your CIPC documents.";
      if (!selectedAddress) errors.address = "Search for your address and pick a result from the list.";
      if (!city.trim()) errors.city = "Add your city or area.";
      if (!companyReg.trim()) errors.companyReg = "Add your company registration number.";
      if (!bankCode) errors.bank = "Choose your bank.";
      if (!/^\d{6,16}$/.test(accountNumber.replace(/\s/g, "")))
        errors.accountNumber = "Enter your account number (digits only).";
      if (!idPassport.trim())
        errors.idPassport = idType === "PASSPORT" ? "Add your passport number." : "Add your ID number.";
      else if (idType === "ID" && !/^\d{13}$/.test(idPassport.trim()))
        errors.idPassport = "A South African ID number has 13 digits.";
      if (!documentFile) errors.document = "Upload your ID, CIPC registration or licence.";
      if (!contactPerson.trim()) errors.contactPerson = "Add the name of the person we should contact.";
      if (!phone.trim()) errors.phone = "Add a contact phone number.";
      setVerifyErrors(errors);
      if (Object.keys(errors).length > 0) {
        const count = Object.keys(errors).length;
        toast.error(count === 1 ? "Fix the highlighted field." : `Fix the ${count} highlighted fields.`);
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
        });
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
    setSubmitStarted(true);
    try {
      const tradeSafeAccountType: "CHEQUE" | "SAVINGS" | "CURRENT" =
        accountType === "savings" ? "SAVINGS" : accountType === "current" ? "CURRENT" : "CHEQUE";
      const onboardingInput = {
        hostType,
        slug: slug.trim() || slugify(spotName),
        city: city.trim(),
        address: selectedAddress.address,
        addressNumber: selectedAddress.addressNumber,
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
        locationPlaceId: selectedAddress.placeId,
        locationJson: selectedAddress.raw,
        displayName: spotName.trim(),
        phone: phone.trim() || undefined,
        legalName: businessName.trim(),
        registration: companyReg.trim(),
        contactPerson: contactPerson.trim(),
        idNumber: idPassport.trim(),
        idType,
        organizationType,
        bankAccount:
          bankCode && bank.trim() && accountNumber.trim()
            ? {
                bank: bank.trim(),
                bank_code: bankCode,
                account_number: accountNumber.replace(/\s/g, ""),
                account_type: tradeSafeAccountType,
              }
            : undefined,
        kycDocumentUploaded: false,
      } as const;
      let onboardingResult = await createHostProfile.mutateAsync(onboardingInput);

      // Upload the verification document to the private KYC bucket (best-effort
      // — the profile is already saved; the doc can be re-added in Settings).
      if (documentFile) {
        try {
          await uploadKyc.mutateAsync({
            file: documentFile,
            docType: companyReg.trim() ? "cipc" : "id",
          });
          onboardingResult = await createHostProfile.mutateAsync({
            ...onboardingInput,
            kycDocumentUploaded: true,
          });
        } catch (e) {
          toast.error(
            e instanceof Error
              ? `Profile saved, but the document upload failed: ${e.message}`
              : "Profile saved, but the document upload failed. Re-upload it in Settings.",
          );
        }
      }

      setEscrowStatus(onboardingResult.escrow_status);
      if (onboardingResult.escrow_status !== "escrow_ready") {
        toast.error("Your profile was saved, but TradeSafe seller setup needs attention. Retry from this review step.");
        // If they leave for the dashboard instead, the pop-up there picks it up.
        markJustOnboarded();
        setGlobalStep(4);
        return;
      }
      toast.success("TradeSafe seller token created. Your Spot is payout-ready.");
      markJustOnboarded();
      setGlobalStep(5);
    } catch (err) {
      toast.error(friendlyError(err, "Submission failed. Please try again."));
    }
  };

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
                errors={verifyErrors}
                spotName={spotName}
                setSpotName={setSpotName}
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
                idType={idType}
                setIdType={setIdType}
                organizationType={organizationType}
                setOrganizationType={setOrganizationType}
                bank={bank}
                setBank={setBank}
                bankCode={bankCode}
                setBankCode={setBankCode}
                accountNumber={accountNumber}
                setAccountNumber={setAccountNumber}
                accountType={accountType}
                setAccountType={setAccountType}
                documentName={documentName}
                setDocumentName={setDocumentName}
                setDocumentFile={setDocumentFile}
                onNext={advanceGlobal}
                onBack={retreatGlobal}
              />
            )}
            {globalStep === 4 && (
              <ReviewStep
                selectedType={HOST_TYPES.find((t) => t.id === hostType) ?? null}
                spotName={spotName}
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
                spotName={spotName}
                escrowStatus={escrowStatus}
                onStartListing={() => navigate({ to: "/listings/new" })}
                onEditProfile={() => navigate({ to: "/profile" })}
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
        <span className="text-2xs uppercase tracking-[0.18em] text-muted-foreground hidden sm:block">
          Host Setup
        </span>
      </header>
      <main className="flex-1">{children}</main>
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
                  className={`text-2xs font-semibold uppercase tracking-wider text-center w-14 hidden sm:block ${
                    active ? "text-primary" : "text-muted-foreground"
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
            title: "3. Create your first listing",
            body: "Add your first event, experience, stay or venue listing straight after setup.",
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
        Takes about 5 minutes · Have your company registration, ID and bank details handy
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
      <h1 className="font-display text-2xl font-bold mb-1 tracking-tight">What do you host?</h1>
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
                  <span className="mt-1.5 inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-primary">
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
  errors: Record<string, string>;
  spotName: string;
  setSpotName: (v: string) => void;
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
  idType: "ID" | "PASSPORT";
  setIdType: (v: "ID" | "PASSPORT") => void;
  organizationType: string;
  setOrganizationType: (v: string) => void;
  bank: string;
  setBank: (v: string) => void;
  bankCode: string;
  setBankCode: (v: string) => void;
  accountNumber: string;
  setAccountNumber: (v: string) => void;
  accountType: string;
  setAccountType: (v: string) => void;
  documentName: string;
  setDocumentName: (v: string) => void;
  setDocumentFile: (f: File | null) => void;
  onNext: () => void;
  onBack: () => void;
}

const SELECT_CLASS = "h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm";

function VerificationStep({
  errors,
  spotName,
  setSpotName,
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
  idType,
  setIdType,
  organizationType,
  setOrganizationType,
  setBank,
  bankCode,
  setBankCode,
  accountNumber,
  setAccountNumber,
  accountType,
  setAccountType,
  documentName,
  setDocumentName,
  setDocumentFile,
  onNext,
  onBack,
}: VerificationStepProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setDocumentName(f.name);
      setDocumentFile(f);
    }
  };

  return (
    <div className="pt-4 pb-8">
      <p className="eyebrow text-primary mb-2">Step 3 of 4</p>
      <h1 className="font-display text-2xl font-bold mb-1 tracking-tight">Verify your business</h1>
      <p className="text-sm text-muted-foreground mb-6">
        We need a few details to verify your business and set up payouts.
      </p>

      <div className="space-y-4">
        {/* Two names: the brand guests see vs. the legal entity TradeSafe pays. */}
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold">Your names</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Most Spots trade under a different name from their registered company. We need
              both.
            </p>
          </div>
          <Field
            label="Spot name (shown on TROVE) *"
            hint="The name guests see on your profile, listings and tickets, e.g. Neon Underground."
            error={errors.spotName}
          >
            <Input
              value={spotName}
              onChange={(e) => setSpotName(e.target.value)}
              placeholder="Neon Underground"
              maxLength={80}
              autoComplete="organization"
            />
          </Field>
          <Field
            label="Registered business name *"
            hint="Your official name exactly as registered with CIPC, e.g. Neon Underground (Pty) Ltd. TradeSafe uses this for verification and payouts. Guests never see it."
            error={errors.businessName}
          >
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Neon Underground (Pty) Ltd"
              maxLength={160}
            />
          </Field>
        </div>

        <AddressSearchField
          city={city}
          setCity={setCity}
          selectedAddress={selectedAddress}
          setSelectedAddress={setSelectedAddress}
          addressError={errors.address}
          cityError={errors.city}
        />

        <Field label="Company registration number *" error={errors.companyReg}>
          <Input
            value={companyReg}
            onChange={(e) => setCompanyReg(e.target.value)}
            placeholder="2024/123456/07"
            maxLength={40}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Organisation type *">
            <select
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="PRIVATE">Private company</option>
              <option value="PUBLIC">Public company</option>
              <option value="TRUST">Trust</option>
              <option value="NON_PROFIT">Non-profit</option>
            </select>
          </Field>
          <Field label="ID type *">
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value as "ID" | "PASSPORT")}
              className={SELECT_CLASS}
            >
              <option value="ID">South African ID</option>
              <option value="PASSPORT">Passport</option>
            </select>
          </Field>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">Bank account details</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              TradeSafe pays your earnings into this account. It should be in the registered
              business name above.
            </p>
          </div>
          <Field label="Bank *" error={errors.bank}>
            <select
              value={bankCode}
              onChange={(e) => {
                const selected = SA_BANKS.find((item) => item.code === e.target.value);
                setBankCode(e.target.value);
                setBank(selected?.name ?? "");
              }}
              className={SELECT_CLASS}
            >
              <option value="">Select your bank</option>
              {SA_BANKS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Account number *" error={errors.accountNumber}>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0123456789"
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
            />
          </Field>
          <div>
            <p id="account-type-label" className="text-sm font-medium">
              Account type
            </p>
            <div role="group" aria-labelledby="account-type-label" className="mt-2 flex gap-2">
              {["business", "current", "savings"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAccountType(t)}
                  aria-pressed={accountType === t}
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

        <Field
          label={`${idType === "PASSPORT" ? "Passport number" : "ID number"} *`}
          hint="The ID of the company director or owner."
          error={errors.idPassport}
        >
          <Input
            value={idPassport}
            onChange={(e) => setIdPassport(e.target.value)}
            placeholder={idType === "PASSPORT" ? "A12345678" : "9001015009086"}
            inputMode={idType === "PASSPORT" ? "text" : "numeric"}
            maxLength={20}
          />
        </Field>

        <div>
          <p id="kyc-doc-label" className="text-sm font-medium">
            Verification document *
          </p>
          <button
            type="button"
            aria-labelledby="kyc-doc-label"
            aria-describedby={errors.document ? "kyc-doc-error" : undefined}
            aria-invalid={errors.document ? true : undefined}
            onClick={() => fileRef.current?.click()}
            className={`mt-2 w-full rounded-2xl border-2 border-dashed p-5 text-center transition-all hover:border-primary/50 ${
              documentName
                ? "border-primary/50 bg-primary/5"
                : errors.document
                  ? "border-destructive/60"
                  : "border-border/50 hover:bg-card/30"
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
                <span className="text-sm font-medium">Upload ID / Registration / Licence</span>
                <span className="text-xs">PDF, JPG, PNG · max 10MB</span>
              </div>
            )}
          </button>
          {errors.document && (
            <p id="kyc-doc-error" role="alert" className="mt-2 text-xs font-medium text-destructive">
              {errors.document}
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            tabIndex={-1}
            onChange={handleFile}
          />
        </div>

        <Field label="Contact person *" error={errors.contactPerson}>
          <Input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Jane Smith"
            autoComplete="name"
            maxLength={80}
          />
        </Field>

        <Field label="Contact phone *" error={errors.phone}>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+27 82 555 0142"
            type="tel"
            autoComplete="tel"
            maxLength={20}
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

function AddressSearchField({
  city,
  setCity,
  selectedAddress,
  setSelectedAddress,
  addressError,
  cityError,
}: {
  city: string;
  setCity: (v: string) => void;
  selectedAddress: AddressSelection | null;
  setSelectedAddress: (v: AddressSelection | null) => void;
  addressError?: string;
  cityError?: string;
}) {
  const [query, setQuery] = useState(selectedAddress?.label ?? city);
  const [manualNumber, setManualNumber] = useState(selectedAddress?.addressNumber ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setSearchFailed(false);
      return;
    }
    // Picking a result writes its label into the box — don't search that again.
    if (selectedAddress && query === selectedAddress.label) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchAddresses(query, controller.signal));
        setSearchFailed(false);
        setOpen(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[onboarding] address search failed:", error);
          setResults([]);
          setSearchFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, selectedAddress]);

  const applySelection = (result: GeocodeResult, numberOverride = manualNumber) => {
    const houseNumber = numberOverride.trim() || result.houseNumber;
    // Street line first so the manual street-number field can swap the leading number.
    const composedAddress = result.street
      ? [
          [houseNumber, result.street].filter(Boolean).join(" "),
          result.suburb,
          result.city,
          result.province,
          result.postcode,
        ]
          .filter(Boolean)
          .join(", ")
      : result.label;

    const selection: AddressSelection = {
      label: result.label,
      address: composedAddress,
      addressNumber: houseNumber,
      city: result.city || result.suburb,
      lat: result.lat,
      lng: result.lng,
      placeId: result.id,
      raw: { provider: "photon", ...result.raw } as unknown as Json,
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
      <Field label="Address *" error={addressError}>
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
                  key={result.id}
                  type="button"
                  onClick={() => applySelection(result)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="line-clamp-2">{result.label}</span>
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
        <Field label="City / area *" error={cityError}>
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
          : searchFailed
            ? "Address search is unavailable right now — check your connection and try again in a moment."
            : "Choose a result so Trove can store coordinates for maps, HQ, and guest discovery."}
      </p>
    </div>
  );
}

interface ReviewStepProps {
  selectedType: (typeof HOST_TYPES)[number] | null;
  spotName: string;
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
  spotName,
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
      <h1 className="font-display text-2xl font-bold mb-1 tracking-tight">
        Review your information
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Please ensure all details are correct before submitting.
      </p>

      <div className="space-y-3 mb-6">
        <ReviewCard
          title="Business Details"
          onEdit={() => onEdit(3)}
          rows={[
            { label: "Spot name (on TROVE)", value: spotName || "—" },
            { label: "Registered name (TradeSafe)", value: businessName || "—" },
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
            { label: "Type", value: bank ? accountType : "Required before submission" },
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
            <span className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" /> Locked after submission
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{documentName || "No document uploaded"}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setConfirmed(!confirmed)}
        role="checkbox"
        aria-checked={confirmed}
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
          I have reviewed the business, address, contact, identity, and payout details above. I
          understand TradeSafe will receive the sensitive identity and bank values securely.
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
  spotName,
  escrowStatus,
  onStartListing,
  onEditProfile,
  onDashboard,
}: {
  hostType: HostType | null;
  spotName: string;
  escrowStatus: string;
  onStartListing: () => void;
  onEditProfile: () => void;
  onDashboard: () => void;
}) {
  // Both actions open the real screens, which save what the host enters.
  const typeNextStep: Record<HostType, string> = {
    venue: "Create your first listing",
    organiser: "Create your first event",
    experience: "Create your first experience",
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

      <p className="eyebrow text-primary mb-2">TradeSafe {escrowStatus === "escrow_ready" ? "ready" : "review"}</p>
      <h1 className="font-display text-4xl font-bold mb-3 tracking-tight">All Set!</h1>
      <p className="text-muted-foreground text-sm mb-2 max-w-sm mx-auto leading-relaxed">
        {escrowStatus === "escrow_ready"
          ? "TradeSafe accepted your payout details. You can publish listings now; TradeSafe verifies your bank account before releasing payouts."
          : "Your profile is saved, but TradeSafe seller setup still needs attention. Retry onboarding before publishing paid listings."}
      </p>
      {spotName && (
        <p className="text-xs text-muted-foreground mb-8">
          Welcome aboard, <span className="text-foreground font-medium">{spotName}</span>.
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
          <button
            type="button"
            onClick={onEditProfile}
            className="w-full flex items-center justify-between rounded-xl border border-border/60 bg-card/50 p-3.5 text-left hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <UserRound className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Add your photos, bio and socials
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </button>
          <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-3.5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Verified Partner badge</span>
            </div>
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Under review
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

// ─── Shared UI Atoms ──────────────────────────────────────────────────────────


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
      <Button variant="outline" onClick={onBack} aria-label="Back" className="flex-none w-12 h-12 p-0">
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
