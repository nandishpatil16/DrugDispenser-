import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border bg-card p-5 shadow-[var(--shadow-card)]", className)}>{children}</div>;
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-5">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, text, icon }: { title: string; text: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function Button({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "danger" | "ghost" }) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border bg-card hover:bg-muted",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-muted",
  }[variant];
  return <button {...p} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", v, className)} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring";

export function Badge({ tone = "muted", children }: { tone?: "muted" | "ok" | "warn" | "danger" | "primary"; children: ReactNode }) {
  const t = {
    muted: "bg-muted text-muted-foreground",
    ok: "bg-success/15 text-success",
    warn: "bg-warning/20 text-warning-foreground",
    danger: "bg-destructive/15 text-destructive",
    primary: "bg-primary/10 text-primary",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", t)}>{children}</span>;
}
