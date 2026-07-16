// Landing page intake forms. Both write to the website/CMS Supabase project
// via src/lib/marketing.ts (insert-only RLS): the engine's own database and
// session are never involved.

import { useState } from "react";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import {
  subscribeToNewsletter,
  submitPartnerLead,
  type PartnerHostType,
} from "@/lib/marketing";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputCls =
  "w-full rounded-xl border border-border/60 bg-surface-1 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/30";

/* ── Newsletter ─────────────────────────────────────────────── */

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "already">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setStatus("busy");
    const result = await subscribeToNewsletter(email);
    if (result.ok) {
      setStatus(result.already ? "already" : "done");
    } else {
      setStatus("idle");
      setError(result.error);
    }
  }

  if (status === "done" || status === "already") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 px-5 py-4">
        <MailCheck className="h-5 w-5 flex-none text-success" />
        <p className="text-sm text-foreground">
          {status === "already"
            ? "You're already on the list. Nothing more to do."
            : "You're on the list. Watch your inbox."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputCls} sm:flex-1`}
          required
        />
        <button
          type="submit"
          disabled={status === "busy"}
          className="rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow-sm transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "busy" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        Host tips and product updates only. Unsubscribe anytime.
      </p>
    </form>
  );
}

/* ── Partner / contact sales ────────────────────────────────── */

const HOST_TYPE_OPTIONS: { value: PartnerHostType | ""; label: string }[] = [
  { value: "", label: "What kind of Spot? (optional)" },
  { value: "organiser", label: "Events and ticketing" },
  { value: "experience", label: "Experiences and sessions" },
  { value: "accommodation", label: "Accommodation and stays" },
  { value: "venue", label: "Venue or space" },
];

export function PartnerLeadForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    spotName: "",
    hostType: "" as PartnerHostType | "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !EMAIL_RE.test(form.email.trim()) || form.message.trim().length < 5) {
      setError("Please add your name, a valid email and a short message.");
      return;
    }
    setStatus("busy");
    const result = await submitPartnerLead({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      spotName: form.spotName || undefined,
      hostType: form.hostType || undefined,
      message: form.message,
    });
    if (result.ok) {
      setStatus("done");
    } else {
      setStatus("idle");
      setError(result.error);
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-3xl border border-success/30 bg-success/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h3 className="mt-4 font-display text-xl font-semibold">Enquiry sent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for reaching out. The partnerships team will come back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-3xl border border-white/8 bg-card p-6 shadow-card sm:p-8"
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="pl-name" className="text-sm font-medium">
              Your name
            </label>
            <input
              id="pl-name"
              className={inputCls}
              placeholder="Full name"
              autoComplete="name"
              value={form.name}
              onChange={set("name")}
              maxLength={120}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="pl-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="pl-email"
              type="email"
              className={inputCls}
              placeholder="you@email.com"
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              required
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="pl-phone" className="text-sm font-medium">
              Phone <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="pl-phone"
              type="tel"
              className={inputCls}
              placeholder="+27"
              autoComplete="tel"
              value={form.phone}
              onChange={set("phone")}
              maxLength={32}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="pl-spot" className="text-sm font-medium">
              Spot or brand <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="pl-spot"
              className={inputCls}
              placeholder="Your venue, event or company"
              value={form.spotName}
              onChange={set("spotName")}
              maxLength={160}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="pl-type" className="text-sm font-medium">
            Host type
          </label>
          <select id="pl-type" className={inputCls} value={form.hostType} onChange={set("hostType")}>
            {HOST_TYPE_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="pl-message" className="text-sm font-medium">
            What are you planning?
          </label>
          <textarea
            id="pl-message"
            className={`${inputCls} min-h-[120px] resize-y`}
            placeholder="Festival, multi-venue programme, curated series, brand partnership…"
            value={form.message}
            onChange={set("message")}
            maxLength={2000}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={status === "busy"}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow-sm transition-all hover:opacity-95 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "busy" ? (
            "Sending…"
          ) : (
            <>
              Send enquiry
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          We only use these details to respond to your enquiry.
        </p>
      </div>
    </form>
  );
}
