import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getHostWorkspace, getVerificationCopy } from "@/lib/host-workspace";
import { TroveLogo } from "./Logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, hostProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });

  const workspace = getHostWorkspace(hostProfile?.host_type);
  const verification = getVerificationCopy(hostProfile?.kyc_status);
  const bankProfile =
    hostProfile?.payout_bank_json &&
    typeof hostProfile.payout_bank_json === "object" &&
    !Array.isArray(hostProfile.payout_bank_json)
      ? (hostProfile.payout_bank_json as Record<string, unknown>)
      : null;
  const hasBankDetails = !!(
    typeof bankProfile?.bank === "string" &&
    bankProfile.bank.trim() &&
    typeof bankProfile?.account_number === "string" &&
    bankProfile.account_number.trim()
  );

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  useEffect(() => {
    if (!hostProfile || hasBankDetails || path === "/settings") return;

    const prompt = () => {
      const lastPrompt = Number(localStorage.getItem("trove:last-bank-prompt") ?? "0");
      if (Date.now() - lastPrompt < 5 * 60 * 1000) return;
      localStorage.setItem("trove:last-bank-prompt", String(Date.now()));
      toast.warning("Add banking details to unlock payouts.", {
        duration: 12_000,
        action: {
          label: "Settings",
          onClick: () => navigate({ to: "/settings" }),
        },
      });
    };

    prompt();
    const interval = window.setInterval(prompt, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [hasBankDetails, hostProfile, navigate, path]);

  const initials = (profile?.full_name ?? "TR")
    .split(" ")
    .map((token) => token[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
            <TroveLogo />
          </Link>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {hostProfile && (
            <div className="mx-3 mt-3 shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-[linear-gradient(155deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] p-4 shadow-card">
              <p className="eyebrow text-white/55">{workspace.heroEyebrow}</p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-white">{workspace.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">
                    {verification.message}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    verification.tone === "success"
                      ? "bg-success/15 text-success"
                      : verification.tone === "warning"
                        ? "bg-warning/15 text-warning"
                        : verification.tone === "destructive"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-white/8 text-white/70"
                  }`}
                >
                  {verification.label}
                </span>
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-1 p-3">
            {workspace.nav.map((item) => {
              const active =
                path === item.to ||
                (item.to !== "/dashboard" &&
                  item.to !== "/listings/new" &&
                  path.startsWith(item.to)) ||
                (item.to === "/listings/new" && path === "/listings/new");

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                  )}
                  <item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 space-y-2 border-t border-sidebar-border bg-sidebar p-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 font-display text-sm font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {profile?.full_name ?? "Trove host"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {hostProfile?.city ?? "Workspace still being set up"}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between hairline-b bg-background/85 px-4 backdrop-blur-md lg:px-8">
          <button
            type="button"
            className="text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <span className="flex h-2 w-2 rounded-full bg-success shadow-[0_0_10px_currentColor]" />
            {workspace.label} workspace
          </div>
          <div className="flex items-center gap-2">
            <Link to="/listings/new">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Sparkles className="mr-1.5 h-4 w-4" />
                New {workspace.singularLabel.toLowerCase()}
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
