import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Droplets, PersonStanding, RefreshCw, Cpu, AlertTriangle, ArrowRight, CalendarClock, Volume2, Stethoscope, Inbox, WifiOff, Loader2, Pill, CheckCircle } from "lucide-react";
import { useStore, SLOTS, slotTotalMg, fmtTime, type DoseStatus } from "@/lib/store";
import { Card, PageHeader, Badge } from "@/components/ui-kit";
import { AdviceCard } from "@/components/AdviceCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SmartDose Caregiver" },
      { name: "description", content: "Live patient vitals, dispenser status and today's doses." },
    ],
  }),
  component: Dashboard,
});

const DOSE: Record<DoseStatus, { label: string; tone: "muted" | "primary" | "ok" | "danger" }> = {
  scheduled: { label: "Scheduled", tone: "muted" },
  dispensed: { label: "Dispensed — In tray", tone: "primary" },
  removed: { label: "Taken ✓", tone: "ok" },
  not_removed: { label: "Missed — Alert sent", tone: "danger" },
};

function Dashboard() {
  const s = useStore((x) => x);
  const last = s.readings[s.readings.length - 1];
  const unread = s.alerts.filter((a) => !a.ack);
  
  const checkup = s.checkup;

  return (
    <>
      <PageHeader title={s.patient.name ? `${s.patient.name}'s overview` : "Care overview"} sub="Medication, safety, and health status in one place." />

      {/* Unread alerts banner */}
      {unread.length > 0 && (
        <Link to="/alerts" className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertTriangle size={20} /> <span className="font-medium">{unread.length} unacknowledged alert{unread.length > 1 && "s"}</span>
          <span className="ml-auto text-sm">{unread[0]?.message}</span>
        </Link>
      )}

      {/* Connection status */}
      <Card className="flex items-center gap-4 bg-muted/35">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Cpu size={21} /></div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Device</p>
          <p className="text-xs text-muted-foreground">Band and dispenser connection</p>
        </div>
        <Badge tone={s.devices.band.online || s.devices.box.online ? "ok" : "muted"}>
          {s.devices.band.online || s.devices.box.online ? "Connected" : "Awaiting connection"}
        </Badge>
      </Card>

      {/* Box tray status */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-semibold">Tablet tray status</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Updated live from the load cell inside the dispenser box.</p>
          </div>
          
          {(() => {
            const status = s.box.currentStatus || "IDLE";
            const boxOnline = s.devices.box.online;

            let icon = <Inbox size={56} className="text-muted-foreground opacity-50" />;
            let label = "Tray is Empty";
            let sublabel = "Waiting for the next scheduled dose";
            let bg = "bg-muted/40";
            let borderCls = "border-border";
            let labelColor = "text-muted-foreground";

            if (!boxOnline) {
              icon = <WifiOff size={56} className="text-muted-foreground opacity-50" />;
              label = "Box Offline";
              sublabel = "No signal from Dispenser Box";
            } else if (status === "DISPENSING") {
              icon = <Loader2 size={56} className="text-primary animate-spin" />;
              label = "Dispensing...";
              sublabel = "Medicine is dropping into the tray";
              bg = "bg-primary/10";
              borderCls = "border-primary/30";
              labelColor = "text-primary";
            } else if (status === "DISPENSED" || status === "NOT_REMOVED") {
              icon = <Pill size={56} className="text-destructive animate-pulse drop-shadow-md" />;
              label = "Tablet in Tray (Not Picked)";
              sublabel = "Patient has not taken their medicine yet!";
              bg = "bg-destructive/10";
              borderCls = "border-destructive/40 shadow-sm shadow-destructive/20";
              labelColor = "text-destructive";
            } else if (status === "TAKEN" || status === "REMOVED") {
              icon = <CheckCircle size={56} className="text-success drop-shadow-sm" />;
              label = "Tablet Taken";
              sublabel = "Patient successfully picked up their medicine!";
              bg = "bg-success/15";
              borderCls = "border-success/40 shadow-sm shadow-success/20";
              labelColor = "text-success";
            }

            return (
              <div className={"flex flex-col items-center justify-center gap-4 rounded-xl border py-10 px-6 text-center transition-all duration-500 " + bg + " " + borderCls}>
                {icon}
                <div>
                  <p className={"text-2xl font-bold tracking-tight " + labelColor}>{label}</p>
                  <p className="mt-1.5 text-sm font-medium text-muted-foreground">{sublabel}</p>
                </div>
              </div>
            );
          })()}
        </Card>
        {/* Doctor Check-up */}
        <Card>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Stethoscope size={18} /> Doctor check-up</div>
          {checkup.nextDate ? (
            <>
              <p className="mt-3 text-base font-semibold">{checkup.doctor || "Appointment"}</p>
              <p className="text-xs text-muted-foreground">{new Date(checkup.nextDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
              {checkup.notes && <p className="mt-1 text-xs text-muted-foreground italic">{checkup.notes}</p>}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No appointment set. <Link to="/settings" className="text-primary underline">Add one →</Link></p>
          )}
        </Card>
      </div>

      {/* Dose plan + advice */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Today's dispense plan</h3>
              <p className="mt-1 text-xs text-muted-foreground">Times and quantities are controlled from Medication.</p>
            </div>
            <Link to="/schedule" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">Manage <ArrowRight size={15} /></Link>
          </div>
          <div className="flex flex-col gap-2">
            {SLOTS.map((sl) => {
              const p = s.schedule[sl.id];
              const st = DOSE[s.doses[sl.id] ?? "scheduled"];
              return (
                const rowCls = st.tone === "ok" ? "bg-success/10 border border-success/30 shadow-sm shadow-success/10 rounded-xl px-4" : 
                                   st.tone === "danger" ? "bg-destructive/10 border border-destructive/30 shadow-sm shadow-destructive/10 rounded-xl px-4" : 
                                   st.tone === "primary" ? "bg-primary/10 border border-primary/30 shadow-sm shadow-primary/10 rounded-xl px-4" : "border border-transparent hover:bg-muted/30 rounded-xl px-4";
                return (
                  <div key={sl.id} className={`flex items-center gap-4 py-3 transition-all ${rowCls}`}>
                  <span className="w-16 font-mono text-sm">{p.time}</span>
                  <div className="flex-1">
                    <p className="font-medium">{sl.label}</p>
                    <p className="text-xs text-muted-foreground">{p.enabled ? `${p.items.length} medicine(s) · ${slotTotalMg(s, sl.id)} mg total` : "Disabled"}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <p className="mt-1 text-[11px] text-muted-foreground">{p.enabled ? `${slotTotalMg(s, sl.id)} mg` : "Off"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="space-y-4">
          <AdviceCard />
          <Link to="/schedule" className="flex items-center justify-between rounded-lg border bg-primary p-4 text-primary-foreground">
            <span className="flex items-center gap-2 font-semibold"><CalendarClock size={18} /> Control dispense times</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </>
  );
}

function Vital({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value?: number | undefined; unit: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon} {label}</div>
      <p className="mt-2 font-mono text-4xl font-semibold">{value ?? "--"}<span className="ml-1 text-base text-muted-foreground">{unit}</span></p>
      <p className="text-xs text-muted-foreground">{value == null ? "Waiting for band data" : "Live"}</p>
    </Card>
  );
}


