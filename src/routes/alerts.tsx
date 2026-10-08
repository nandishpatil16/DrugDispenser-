import { createFileRoute } from "@tanstack/react-router";
import { Bell, Siren, PersonStanding, HeartPulse, Droplets, Pill, WifiOff, Check } from "lucide-react";
import { useStore, setState, fmtTime, type AlertType } from "@/lib/store";
import { Card, PageHeader, Empty, Button, Badge } from "@/components/ui-kit";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — SmartDose Caregiver" },
      { name: "description", content: "SOS, fall, abnormal vitals and missed dose alerts." },
      { property: "og:title", content: "Alerts — SmartDose Caregiver" },
      { property: "og:description", content: "SOS, fall, abnormal vitals and missed dose alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Alerts,
});

const META: Record<AlertType, { label: string; icon: React.ReactNode; tone: "danger" | "warn" | "muted" }> = {
  sos: { label: "SOS", icon: <Siren size={18} />, tone: "danger" },
  fall: { label: "Fall", icon: <PersonStanding size={18} />, tone: "danger" },
  heart: { label: "Heart rate", icon: <HeartPulse size={18} />, tone: "danger" },
  spo2: { label: "SpO₂", icon: <Droplets size={18} />, tone: "danger" },
  dose: { label: "Dose", icon: <Pill size={18} />, tone: "warn" },
  missed: { label: "Missed", icon: <Pill size={18} />, tone: "warn" },
  offline: { label: "Device", icon: <WifiOff size={18} />, tone: "muted" },
};

function Alerts() {
  const alerts = useStore((s) => s.alerts);
  const ackAll = () => setState((s) => ({ ...s, alerts: s.alerts.map((a) => ({ ...a, ack: true })) }));
  return (
    <>
      <PageHeader title="Alerts" sub="Emergency notifications from the band and dispenser." action={alerts.some((a) => !a.ack) && <Button variant="outline" onClick={ackAll}><Check size={16} /> Acknowledge all</Button>} />
      <Card>
        {alerts.length === 0 ? <Empty icon={<Bell />} title="No alerts" text="SOS presses, falls, abnormal vitals and missed doses will appear here instantly." /> : (
          <div className="divide-y">
            {alerts.map((a) => {
              const m = META[a.type];
              return (
                <div key={a.id} className={`flex items-center gap-4 py-3 ${a.ack ? "opacity-60" : ""}`}>
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${m.tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{m.icon}</div>
                  <div className="flex-1"><p className="font-medium">{a.message}</p><p className="text-xs text-muted-foreground">{fmtTime(a.at)}</p></div>
                  <Badge tone={m.tone}>{m.label}</Badge>
                  {!a.ack && <Button variant="ghost" onClick={() => setState((s) => ({ ...s, alerts: s.alerts.map((x) => (x.id === a.id ? { ...x, ack: true } : x)) }))}>Acknowledge</Button>}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
