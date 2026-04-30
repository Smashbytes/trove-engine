import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, PlusCircle, ScanLine, Wallet,
  Megaphone, Building2, LogOut, Menu, X, Sparkles,
  CalendarDays, Hotel, Clock, Palette, Users, Film,
} from "lucide-react";
import { useEffect, useState } from "react";
import { TroveLogo } from "./Logo";
import { logout, useTroveData, SPOT_TYPES } from "@/lib/trove-store";
import { Button } from "@/components/ui/button";

const LISTING_LABEL: Record<string, { label: string; icon: typeof CalendarDays }> = {
  venue:    { label: "Events",   icon: CalendarDays },
  resort:   { label: "Stays",    icon: Hotel },
  activity: { label: "Slots",    icon: Clock },
  gallery:  { label: "Exhibits", icon: Palette },
  operator: { label: "Packages", icon: Users },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useTroveData();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Gate: if no spotType yet, send them to onboarding
  useEffect(() => {
    if (!profile.spotType && path !== "/onboarding" && path !== "/") {
      navigate({ to: "/onboarding" });
    }
  }, [profile.spotType, path, navigate]);

  const meta = profile.spotType ? LISTING_LABEL[profile.spotType] : LISTING_LABEL.venue;
  const spotMeta = SPOT_TYPES.find((s) => s.id === profile.spotType);

  const NAV = [
    { to: "/dashboard",    icon: LayoutDashboard, label: "Dashboard", badge: undefined as string | undefined },
    { to: "/listings",     icon: meta.icon,       label: meta.label,  badge: undefined },
    { to: "/listings/new", icon: PlusCircle,      label: `Create ${meta.label.replace(/s$/, "")}`, badge: undefined },
    { to: "/studio",       icon: Film,            label: "Story Studio", badge: "NEW" },
    { to: "/scanner",      icon: ScanLine,        label: "Check-in",  badge: undefined },
    { to: "/payments",     icon: Wallet,          label: "Payments",  badge: undefined },
    { to: "/promote",      icon: Megaphone,       label: "Promote",   badge: undefined },
    { to: "/profile",      icon: Building2,       label: "Spot Profile", badge: undefined },
  ] as const;

  const handleLogout = () => { logout(); navigate({ to: "/" }); };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
            <TroveLogo />
          </Link>
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {spotMeta && (
          <div className="mx-3 mt-3 overflow-hidden rounded-xl ring-hairline">
            <div className="relative h-16 w-full">
              <img src={spotMeta.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/70 to-transparent" />
              <div className="absolute inset-0 flex items-end px-3 pb-2">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">Spot type</p>
                  <p className="text-sm font-semibold leading-tight text-white">{spotMeta.label}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map((item) => {
            const active =
              path === item.to ||
              (item.to !== "/dashboard" && item.to !== "/listings/new" && path.startsWith(item.to)) ||
              (item.to === "/listings/new" && path === "/listings/new");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />}
                <item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-3 bottom-3 space-y-2">
          <div className="rounded-xl ring-hairline surface-2 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 font-display text-sm font-bold text-primary">
                {profile.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{profile.name}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.city}</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between hairline-b bg-background/85 px-4 backdrop-blur-md lg:px-8">
          <button className="lg:hidden text-foreground" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <span className="flex h-2 w-2 rounded-full bg-success shadow-[0_0_10px_currentColor]" />
            All systems live · Trove Engine v1.0
          </div>
          <div className="flex items-center gap-2">
            <Link to="/listings/new">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Sparkles className="mr-1.5 h-4 w-4" /> New {meta.label.replace(/s$/, "")}
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
