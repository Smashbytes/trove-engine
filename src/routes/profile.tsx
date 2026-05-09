import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { ImageUpload } from "@/components/trove/ImageUpload";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { getHostWorkspace, getVerificationCopy } from "@/lib/host-workspace";
import { useHostListings, useUpdateWorkspaceProfile } from "@/lib/queries";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile - Trove Engine" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, hostProfile } = useAuth();
  const workspace = getHostWorkspace(hostProfile?.host_type);
  const verification = getVerificationCopy(hostProfile?.kyc_status);
  const listingsQuery = useHostListings();
  const updateProfile = useUpdateWorkspaceProfile();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [slug, setSlug] = useState(hostProfile?.slug ?? "");
  const [city, setCity] = useState(hostProfile?.city ?? "");
  const [bio, setBio] = useState(hostProfile?.bio ?? "");
  const [heroUrl, setHeroUrl] = useState(hostProfile?.hero_url ?? "");

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setSlug(hostProfile?.slug ?? "");
    setCity(hostProfile?.city ?? "");
    setBio(hostProfile?.bio ?? "");
    setHeroUrl(hostProfile?.hero_url ?? "");
  }, [hostProfile, profile]);

  const listings = listingsQuery.data ?? [];

  const handleSave = async () => {
    if (!slug.trim()) {
      toast.error("Public slug is required.");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        fullName,
        phone,
        slug,
        city,
        bio,
        heroUrl,
      });
      toast.success("Workspace profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile.");
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Brand & business identity"
        title={workspace.profileLabel}
        subtitle="This screen now edits the real host and profile records instead of a local mock persona."
      />

      <div className="mb-6 overflow-hidden rounded-[2rem] border border-white/8 shadow-card">
        <div className="relative h-72 overflow-hidden">
          {heroUrl ? (
            <img
              src={heroUrl}
              alt={workspace.profileLabel}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(140deg,rgba(255,0,115,0.22),rgba(121,57,255,0.18),rgba(255,255,255,0.02))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/65 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {workspace.label}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${verificationTone(verification.tone)}`}
              >
                {verification.label}
              </span>
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.03em] md:text-4xl">
              {fullName || workspace.label}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {bio ||
                "Use this profile to give the platform and future partners a real sense of the business behind this workspace."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Workspace identity</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Public business name">
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
            <Field label="Public slug">
              <Input value={slug} onChange={(event) => setSlug(event.target.value)} />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(event) => setCity(event.target.value)} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Bio">
              <Textarea rows={5} value={bio} onChange={(event) => setBio(event.target.value)} />
            </Field>
            <Field label="Hero image">
              <ImageUpload value={heroUrl} onChange={setHeroUrl} label="Hero image" />
            </Field>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              {updateProfile.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
            <p className="eyebrow text-primary">Status</p>
            <div className="mt-4 space-y-3">
              <MiniCard
                label="Verification"
                value={verification.label}
                body={verification.message}
              />
              <MiniCard
                label={workspace.shortLabel}
                value={String(listings.length)}
                body="Live and draft records on this host account."
              />
              <MiniCard
                label="Public URL"
                value={`/${slug || "slug-missing"}`}
                body="The host slug now comes from the real host profile row."
              />
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MiniCard({ label, value, body }: { label: string; value: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function verificationTone(tone: "success" | "warning" | "destructive" | "muted") {
  if (tone === "success") return "bg-success/12 text-success";
  if (tone === "warning") return "bg-warning/12 text-warning";
  if (tone === "destructive") return "bg-destructive/12 text-destructive";
  return "bg-white/12 text-white/75";
}
