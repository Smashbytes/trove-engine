import { useState, useEffect, useRef, memo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/lib/auth";
import { PASSWORD_HINT, passwordProblem } from "@/lib/password";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Sparkles, X, MailCheck } from "lucide-react";

const SITE = "https://www.welovetrove.co.za";

type View = "signin" | "signup" | "forgot" | "verify";

const RESEND_COOLDOWN_S = 60;

const SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&q=85&auto=format&fit=crop",
    caption: "Turn your space into a destination.",
  },
  {
    src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=85&auto=format&fit=crop",
    caption: "Sell out every night.",
  },
  {
    src: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1400&q=85&auto=format&fit=crop",
    caption: "The engine behind your spot.",
  },
];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AuthModal({ open, dismissible = false }: { open: boolean; dismissible?: boolean }) {
  if (!open) return null;
  return <AuthDialog dismissible={dismissible} />;
}

// Accessible full-screen dialog: focus moves in on open, Tab is trapped inside,
// Escape closes it when it's dismissible, and focus returns to the trigger on
// close. The page behind is made `inert` by EngineAuthGate (__root.tsx).
function AuthDialog({ dismissible }: { dismissible: boolean }) {
  const { closeAuthModal } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  // Desktop-only slideshow: don't mount it (or download its images) on phones.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input")?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  // Escape is handled on window, not the dialog element: focus can briefly
  // fall to <body> (e.g. while the submit button is disabled mid-request).
  useEffect(() => {
    if (!dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissible, closeAuthModal]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex min-h-screen overflow-y-auto bg-background"
    >
      <AuthFormPanel dismissible={dismissible} />
      {isDesktop && <SlideshowPanel />}
    </div>
  );
}

// Form panel owns all text-input state. Isolating it here means typing in
// email/password doesn't re-render the slideshow or its framer-motion tree —
// that was causing dropped frames + unresponsive input on tablets and phones.
function AuthFormPanel({ dismissible }: { dismissible: boolean }) {
  const {
    signInWithEmail,
    signUpWithEmail,
    verifySignupCode,
    resendSignupCode,
    resetPassword,
    authModalView,
    closeAuthModal,
  } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const [tab, setTab] = useState<"signin" | "signup">(authModalView);
  const [view, setView] = useState<View>(authModalView);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [spotName, setSpotName] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  // Inline error under the active form. Toasts sit outside the dialog, so this
  // is what screen-reader users actually hear (role="alert").
  const [formError, setFormError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // A message for the view we're switching to (the switch clears errors).
  const carryError = useRef<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  // When the view changes, clear the old error and move focus to its first
  // field so keyboard users land in the right place.
  useEffect(() => {
    setFormError(carryError.current);
    carryError.current = null;
    const id = setTimeout(
      () => panelRef.current?.querySelector<HTMLElement>("input")?.focus(),
      260,
    );
    return () => clearTimeout(id);
  }, [view, tab]);

  function fail(message: string) {
    setFormError(message);
    toast.error(message);
  }

  // Every handler resets `busy` in finally: if a request throws (network drop)
  // instead of returning an error, the button must not stay on "Signing in…".
  async function run(task: () => Promise<void>) {
    // The submit button is disabled while busy, which drops focus to <body>;
    // put focus back where the user was once the request settles.
    const focused = document.activeElement as HTMLElement | null;
    setBusy(true);
    setFormError(null);
    try {
      await task();
    } catch (err) {
      console.error("[auth]", err);
      fail("We couldn't reach TROVE. Check your connection and try again.");
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        if (focused?.isConnected && document.activeElement === document.body) focused.focus();
      });
    }
  }

  function goToCodeStep() {
    setCode("");
    setResendIn(RESEND_COOLDOWN_S);
    setView("verify");
  }

  // The landing page is a public route, so nothing else moves a host on once
  // they're signed in — send them into the app. On protected routes the modal
  // is the auth wall and the page they asked for renders by itself.
  function afterSignIn() {
    if (pathname === "/") navigate({ to: "/dashboard" });
  }

  function switchTab(v: "signin" | "signup") {
    setTab(v);
    setView(v);
    setShowPw(false);
  }

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    void run(async () => {
      const { error, unconfirmed } = await signInWithEmail(email, password);
      if (unconfirmed) {
        // Account exists but the sign-up code was never entered: send a fresh
        // one and take them straight to the code step.
        const resent = await resendSignupCode(email);
        if (resent.error) fail(resent.error);
        else toast.success("Confirm your email first — we've sent you a new code.");
        goToCodeStep();
        return;
      }
      if (error)
        fail(
          /invalid login credentials/i.test(error)
            ? "That email and password don't match. Try again, or reset your password."
            : error,
        );
      else afterSignIn();
    });
  }

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) {
      fail(problem);
      return;
    }
    void run(async () => {
      const { error, needsCode, alreadyRegistered } = await signUpWithEmail(
        email,
        password,
        spotName,
      );
      if (error) {
        fail(error);
        return;
      }
      if (alreadyRegistered) {
        // Shown on the sign-in tab, after the switch has cleared old errors.
        carryError.current =
          "If you already have a TROVE account with this email, sign in or reset your password.";
        toast(carryError.current);
        switchTab("signin");
        return;
      }
      if (needsCode) {
        toast.success("We've emailed you a verification code.");
        goToCodeStep();
        return;
      }
      // Email confirmation is off — already signed in.
      navigate({ to: "/onboarding" });
    });
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    void run(async () => {
      const { error } = await verifySignupCode(email, code);
      if (error) {
        fail(
          /expired|invalid/i.test(error)
            ? "That code is wrong or has expired. Check the latest email, or send a new code."
            : error,
        );
        return;
      }
      toast.success("Email confirmed — let's set up your Spot.");
      navigate({ to: "/onboarding" });
    });
  }

  function handleResend() {
    if (resendIn > 0) return;
    void run(async () => {
      const { error } = await resendSignupCode(email);
      if (error) fail(error);
      else {
        toast.success("New code sent — check your inbox (and spam).");
        setCode("");
        setResendIn(RESEND_COOLDOWN_S);
      }
    });
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    void run(async () => {
      const { error } = await resetPassword(email);
      if (error) fail(error);
      else {
        toast.success("Password reset email sent — check your inbox.");
        setView("signin");
      }
    });
  }

  const errorAlert = formError ? (
    <p role="alert" className="text-sm font-medium text-destructive">
      {formError}
    </p>
  ) : null;

  return (
    <div
      ref={panelRef}
      className="relative flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-[46%] xl:px-16"
    >
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-25" />

      {dismissible && (
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close sign in"
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-surface-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="relative mx-auto w-full max-w-[360px]">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-glow-sm">
            <Sparkles className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            TROVE <span className="text-gradient">Engine</span>
          </span>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Forgot password view ── */}
          {view === "forgot" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <p className="eyebrow text-primary mb-1">Account recovery</p>
              <h1 id="auth-title" className="mb-1 font-display text-3xl font-bold">
                Reset password
              </h1>
              <p className="mb-7 text-sm text-muted-foreground">
                Enter your email and we'll send you a reset link instantly.
              </p>
              <form onSubmit={handleForgot} className="space-y-4">
                <AuthField
                  id="fp-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                />
                {errorAlert}
                <GradientButton busy={busy} label="Send reset link" busyLabel="Sending…" />
                <button
                  type="button"
                  onClick={() => setView("signin")}
                  className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4"
                >
                  ← Back to sign in
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Enter the sign-up code ── */}
          {view === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <MailCheck className="h-5 w-5" />
              </div>
              <p className="eyebrow text-primary mb-1">One last step</p>
              <h1 id="auth-title" className="mb-1 font-display text-3xl font-bold">
                Check your email
              </h1>
              <p className="mb-7 text-sm text-muted-foreground">
                We sent a verification code to{" "}
                <span className="font-medium text-foreground">{email}</span>. Enter it below to
                confirm your account.
              </p>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="otp-code" className="text-sm font-medium">
                    Verification code
                  </Label>
                  <Input
                    id="otp-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="123456"
                    aria-describedby="otp-help"
                    className="h-14 rounded-xl border-border/60 bg-surface-1 text-center font-mono text-2xl tracking-[0.5em] focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                  />
                  <p id="otp-help" className="text-xs text-muted-foreground">
                    Codes expire after a while. If yours doesn&apos;t work, send a new one.
                  </p>
                </div>
                {errorAlert}
                <button
                  type="submit"
                  disabled={busy || code.length < 6}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow-sm transition-all hover:opacity-95 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    "Checking…"
                  ) : (
                    <>
                      Verify &amp; continue
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={busy || resendIn > 0}
                    className="text-primary transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:text-muted-foreground"
                  >
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab("signup")}
                    className="text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4"
                  >
                    Use a different email
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── Sign in / Sign up tabs ── */}
          {view !== "forgot" && view !== "verify" && (
            <motion.div
              key="tabs"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <p className="eyebrow text-primary mb-1">
                {tab === "signin" ? "Welcome back" : "Get started free"}
              </p>
              <h1 id="auth-title" className="mb-7 font-display text-3xl font-bold leading-tight">
                {tab === "signin" ? "Sign in to your Engine" : "Start your Spot"}
              </h1>

              {/* Tab pill switcher */}
              <div className="mb-6 flex gap-1 rounded-xl bg-surface-1 p-1">
                {(["signin", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchTab(t)}
                    aria-pressed={tab === t}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                      tab === t
                        ? "bg-gradient-brand text-primary-foreground shadow-glow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "signin" ? "Sign in" : "New account"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {tab === "signin" && (
                  <motion.form
                    key="signin"
                    onSubmit={handleSignIn}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    <AuthField
                      id="si-email"
                      label="Email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="si-pw" className="text-sm font-medium">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => setView("forgot")}
                          className="-my-1.5 py-1.5 text-xs text-primary transition-opacity hover:opacity-75"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <PwInput
                        id="si-pw"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        show={showPw}
                        onToggle={() => setShowPw((s) => !s)}
                      />
                    </div>
                    {errorAlert}
                    <GradientButton busy={busy} label="Sign in" busyLabel="Signing in…" />
                  </motion.form>
                )}

                {tab === "signup" && (
                  <motion.form
                    key="signup"
                    onSubmit={handleSignUp}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    <AuthField
                      id="su-name"
                      label="Spot Name"
                      autoComplete="organization"
                      maxLength={80}
                      value={spotName}
                      onChange={(e) => setSpotName(e.target.value)}
                      placeholder="Your spot or business name"
                      required
                    />
                    <AuthField
                      id="su-email"
                      label="Email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                    />
                    <div className="space-y-1.5">
                      <Label htmlFor="su-pw" className="text-sm font-medium">
                        Password
                      </Label>
                      <PwInput
                        id="su-pw"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        show={showPw}
                        onToggle={() => setShowPw((s) => !s)}
                        placeholder={PASSWORD_HINT}
                        minLength={8}
                      />
                    </div>
                    {errorAlert}
                    <GradientButton
                      busy={busy}
                      label="Create account & continue"
                      busyLabel="Creating account…"
                    />
                    <p className="text-center text-xs text-muted-foreground">
                      By continuing you agree to TROVE's{" "}
                      <a
                        href={`${SITE}/legal/terms-of-use`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline underline-offset-4"
                      >
                        Terms of Use
                      </a>{" "}
                      and{" "}
                      <a
                        href={`${SITE}/legal/privacy`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline underline-offset-4"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Memo'd so it doesn't re-render when the form panel's text inputs change.
// Owns its own slideshow timer, independent of the form state.
const SlideshowPanel = memo(function SlideshowPanel() {
  const [imgIdx, setImgIdx] = useState(0);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setImgIdx((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(id);
  }, [reducedMotion]);

  return (
    <div className="relative hidden overflow-hidden lg:flex lg:flex-1">
      <AnimatePresence>
        {SLIDES.map((slide, i) =>
          i === imgIdx ? (
            <motion.div
              key={slide.src}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            >
              <img
                src={slide.src}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />
            </motion.div>
          ) : null,
        )}
      </AnimatePresence>

      <div className="absolute bottom-10 left-10 right-10 z-10">
        <AnimatePresence mode="wait">
          <motion.p
            key={imgIdx}
            className="mb-5 font-display text-[26px] font-bold leading-snug text-white drop-shadow-lg"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {SLIDES[imgIdx].caption}
          </motion.p>
        </AnimatePresence>
        <div className="flex items-center gap-2">
          {SLIDES.map((slide, i) => (
            // 24px hit area around the thin bar (WCAG 2.2 target size).
            <button
              key={i}
              type="button"
              onClick={() => setImgIdx(i)}
              aria-label={`Show slide ${i + 1}: ${slide.caption}`}
              aria-current={i === imgIdx}
              className="group flex h-6 items-center"
            >
              <span
                className={`block h-[3px] rounded-full transition-all duration-500 ${
                  i === imgIdx
                    ? "w-8 bg-primary shadow-glow-sm"
                    : "w-2.5 bg-white/35 group-hover:bg-white/60"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="absolute right-6 top-6 z-10">
        <div className="rounded-full border border-white/20 bg-black/30 px-4 py-2 backdrop-blur-sm">
          <span className="font-display text-caption font-semibold uppercase tracking-[0.18em] text-white/90">
            Trove Engine
          </span>
        </div>
      </div>
    </div>
  );
});

/* ── Shared atoms ───────────────────────────────────────────── */

function AuthField({
  id,
  label,
  type = "text",
  autoComplete,
  maxLength,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="h-11 rounded-xl border-border/60 bg-surface-1 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
      />
    </div>
  );
}

function PwInput({
  id,
  autoComplete,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  minLength,
}: {
  id: string;
  autoComplete?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        autoComplete={autoComplete}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? "••••••••"}
        required
        minLength={minLength}
        className="h-11 rounded-xl border-border/60 bg-surface-1 pr-10 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        aria-controls={id}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function GradientButton({
  busy,
  label,
  busyLabel,
}: {
  busy: boolean;
  label: string;
  busyLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow-sm transition-all hover:opacity-95 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? (
        busyLabel
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}
