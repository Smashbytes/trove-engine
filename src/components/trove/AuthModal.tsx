import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

type View = 'signin' | 'signup' | 'forgot';

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

export function AuthModal({ open }: { open: boolean }) {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [tab, setTab]       = useState<'signin' | 'signup'>('signin');
  const [view, setView]     = useState<View>('signin');
  const [busy, setBusy]     = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setImgIdx(i => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(id);
  }, [open]);

  function switchTab(v: 'signin' | 'signup') {
    setTab(v);
    setView(v);
    setShowPw(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signInWithEmail(email, password);
    setBusy(false);
    if (error) toast.error(error);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signUpWithEmail(email, password, fullName);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success('Check your email to confirm your account.');
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await resetPassword(email);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success('Password reset email sent — check your inbox.');
      setView('signin');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen bg-background">

      {/* ── LEFT  — Form panel ───────────────────────────────── */}
      <div className="relative flex w-full flex-col justify-center px-8 py-12 sm:px-12 lg:w-[46%] xl:px-16">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-25" />

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
            {view === 'forgot' && (
              <motion.div key="forgot"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                <p className="eyebrow text-primary mb-1">Account recovery</p>
                <h1 className="mb-1 font-display text-3xl font-bold">Reset password</h1>
                <p className="mb-7 text-sm text-muted-foreground">
                  Enter your email and we'll send you a reset link instantly.
                </p>
                <form onSubmit={handleForgot} className="space-y-4">
                  <AuthField id="fp-email" label="Email" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
                  <GradientButton busy={busy} label="Send reset link" busyLabel="Sending…" />
                  <button type="button" onClick={() => setView('signin')}
                    className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4">
                    ← Back to sign in
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Sign in / Sign up tabs ── */}
            {view !== 'forgot' && (
              <motion.div key="tabs"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22, ease: 'easeOut' }}>

                <p className="eyebrow text-primary mb-1">
                  {tab === 'signin' ? 'Welcome back' : 'Get started free'}
                </p>
                <h1 className="mb-7 font-display text-3xl font-bold leading-tight">
                  {tab === 'signin' ? 'Sign in to your Engine' : 'Start your Spot'}
                </h1>

                {/* Tab pill switcher */}
                <div className="mb-6 flex gap-1 rounded-xl bg-surface-1 p-1">
                  {(['signin', 'signup'] as const).map(t => (
                    <button key={t} type="button" onClick={() => switchTab(t)}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                        tab === t
                          ? 'bg-gradient-brand text-primary-foreground shadow-glow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}>
                      {t === 'signin' ? 'Sign in' : 'New account'}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">

                  {tab === 'signin' && (
                    <motion.form key="signin" onSubmit={handleSignIn}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}
                      className="space-y-4">
                      <AuthField id="si-email" label="Email" type="email" value={email}
                        onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="si-pw" className="text-sm font-medium">Password</Label>
                          <button type="button" onClick={() => setView('forgot')}
                            className="text-xs text-primary transition-opacity hover:opacity-75">
                            Forgot password?
                          </button>
                        </div>
                        <PwInput id="si-pw" value={password} onChange={e => setPassword(e.target.value)}
                          show={showPw} onToggle={() => setShowPw(s => !s)} />
                      </div>
                      <GradientButton busy={busy} label="Sign in" busyLabel="Signing in…" />
                    </motion.form>
                  )}

                  {tab === 'signup' && (
                    <motion.form key="signup" onSubmit={handleSignUp}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}
                      className="space-y-4">
                      <AuthField id="su-name" label="Full name" value={fullName}
                        onChange={e => setFullName(e.target.value)} placeholder="Your full name" required />
                      <AuthField id="su-email" label="Email" type="email" value={email}
                        onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
                      <div className="space-y-1.5">
                        <Label htmlFor="su-pw" className="text-sm font-medium">Password</Label>
                        <PwInput id="su-pw" value={password} onChange={e => setPassword(e.target.value)}
                          show={showPw} onToggle={() => setShowPw(s => !s)}
                          placeholder="Min. 8 characters" minLength={8} />
                      </div>
                      <GradientButton busy={busy} label="Create account & continue" busyLabel="Creating account…" />
                      <p className="text-center text-xs text-muted-foreground">
                        By continuing you agree to TROVE's{' '}
                        <span className="cursor-pointer text-primary hover:underline underline-offset-4">Terms</span>
                        {' '}and{' '}
                        <span className="cursor-pointer text-primary hover:underline underline-offset-4">Privacy Policy</span>.
                      </p>
                    </motion.form>
                  )}

                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT — Looping image panel ──────────────────────── */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-1">

        {/* Crossfading slides */}
        <AnimatePresence>
          {SLIDES.map((slide, i) =>
            i === imgIdx ? (
              <motion.div key={slide.src} className="absolute inset-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}>
                <img src={slide.src} alt="" className="h-full w-full object-cover" draggable={false} />
                {/* Darkening overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />
              </motion.div>
            ) : null
          )}
        </AnimatePresence>

        {/* Bottom caption + dots */}
        <div className="absolute bottom-10 left-10 right-10 z-10">
          <AnimatePresence mode="wait">
            <motion.p key={imgIdx}
              className="mb-5 font-display text-[26px] font-bold leading-snug text-white drop-shadow-lg"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
              {SLIDES[imgIdx].caption}
            </motion.p>
          </AnimatePresence>
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button key={i} type="button" onClick={() => setImgIdx(i)}
                className={`h-[3px] rounded-full transition-all duration-500 ${
                  i === imgIdx
                    ? 'w-8 bg-primary shadow-glow-sm'
                    : 'w-2.5 bg-white/35 hover:bg-white/60'
                }`} />
            ))}
          </div>
        </div>

        {/* Top-right brand badge */}
        <div className="absolute right-6 top-6 z-10">
          <div className="rounded-full border border-white/20 bg-black/30 px-4 py-2 backdrop-blur-sm">
            <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
              Trove Engine
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Shared atoms ───────────────────────────────────────────── */

function AuthField({ id, label, type = 'text', value, onChange, placeholder, required }: {
  id: string; label: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required}
        className="h-11 rounded-xl border-border/60 bg-surface-1 focus:border-primary/60 focus:ring-1 focus:ring-primary/30" />
    </div>
  );
}

function PwInput({ id, value, onChange, show, onToggle, placeholder, minLength }: {
  id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean; onToggle: () => void; placeholder?: string; minLength?: number;
}) {
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder ?? '••••••••'} required minLength={minLength}
        className="h-11 rounded-xl border-border/60 bg-surface-1 pr-10 focus:border-primary/60 focus:ring-1 focus:ring-primary/30" />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function GradientButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button type="submit" disabled={busy}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow-sm transition-all hover:opacity-95 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60">
      {busy ? busyLabel : (
        <>
          {label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}
