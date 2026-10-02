import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Bell, CalendarClock, LayoutDashboard, Settings, Menu } from "lucide-react";
import { useStore, setState } from "@/lib/store";

const NAV = [
  { to: "/",         label: "Overview",   icon: LayoutDashboard },
  { to: "/schedule", label: "Medication", icon: CalendarClock },
  { to: "/vitals",   label: "Monitoring", icon: Activity },
  { to: "/alerts",   label: "Alerts",     icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const unread = useStore((s) => s.alerts.filter((a) => !a.ack).length);
  const theme = useStore((s) => s.theme);
  const patient = useStore((s) => s.patient);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = () => setMenuOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors flex flex-col md:block">
      
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-50 flex h-14 w-full shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Bell size={16} />
          </div>
          <span className="font-bold">SmartDose</span>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 flex w-56 flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
              <div className="border-b bg-muted/20 p-3">
                <p className="font-semibold">{patient.name || "No patient set"}</p>
                <p className="text-xs text-muted-foreground">SmartDose Caregiver</p>
              </div>
              
              <div className="p-2">
                <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">App Mode</p>
                <div className="mb-1 grid grid-cols-3 gap-1 px-1">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setState((s) => ({ ...s, theme: t })); setMenuOpen(false); }}
                      className={`rounded-md px-2 py-1.5 text-xs capitalize transition-colors ${theme === t ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground"}`}
                    >
                      {t === "system" ? "Auto" : t}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="border-t p-2">
                <Link 
                  to="/settings" 
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
                >
                  <Settings size={16} /> Full Settings
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar p-5 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bell size={18} />
          </div>
          <div>
            <p className="font-bold leading-tight">SmartDose</p>
            <p className="text-xs text-muted-foreground">Caregiver control</p>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent font-medium !text-primary" }}>
              <n.icon size={17} /> {n.label}
              {n.to === "/alerts" && unread > 0 && (
                <span className="ml-auto rounded-full bg-destructive px-2 text-xs text-destructive-foreground">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t pt-4">
          <Link to="/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent font-medium !text-primary" }}>
            <Settings size={17} /> Settings
          </Link>
        </div>
      </aside>

      <main className="flex-1 px-4 pb-24 pt-5 md:ml-64 md:px-10 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
            className="relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground"
            activeProps={{ className: "!text-primary" }}>
            <span className="grid h-8 w-10 place-items-center rounded-md"><n.icon size={19} /></span>{n.label}
            {n.to === "/alerts" && unread > 0 && <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-destructive" />}
          </Link>
        ))}
      </nav>
    </div>
  );
}
