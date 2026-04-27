import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, PlusCircle, ScanLine, Wallet,
  Megaphone, Building2, LogOut, Menu, X, Sparkles,
} from "lucide-react";
import { useState } from "react";
import { TroveLogo } from "./Logo";
import { logout, useTroveData } from "@/lib/trove-store";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/events", icon: CalendarDays, label: "Events" },
  { to: "/events/new", icon: PlusCircle, label: "Create Event" },
  { to: "/scanner", icon: ScanLine, label: "Scanner" },
  { to: "/payments", icon: Wallet, label: "Payments" },
  { to: "/promote", icon: Megaphone, label: "Promote" },
  { to: "/profile", icon: Building2, label: "Spot Profile" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useTroveData();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
            <TroveLogo />
          </Link>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-brand text-primary-foreground shadow-glow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-3 bottom-3 space-y-2">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand font-display text-sm font-bold text-primary-foreground">
                {profile.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{profile.name}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.city}</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <button
            className="lg:hidden text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <span className="flex h-2 w-2 rounded-full bg-success shadow-[0_0_10px_currentColor]" />
            All systems live · Trove Engine v1.0
          </div>
          <div className="flex items-center gap-2">
            <Link to="/events/new">
              <Button size="sm" className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
                <Sparkles className="mr-1.5 h-4 w-4" /> New Event
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
