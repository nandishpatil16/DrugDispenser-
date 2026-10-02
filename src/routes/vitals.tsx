import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, PersonStanding, Heart, Droplets, Stethoscope, AlertTriangle } from "lucide-react";
import { useStore, setState, fmtTime, checkupAdvice, type Reading } from "@/lib/store";
import { Card, PageHeader, Empty, Field, inputCls, Badge } from "@/components/ui-kit";
import { AdviceCard } from "@/components/AdviceCard";

export const Route = createFileRoute("/vitals")({
  head: () => ({
    meta: [
      { title: "Vitals — SmartDose Caregiver" },
      { name: "description", content: "Heart rate, SpO2 and fall history from the patient band, with alert limits." },
    ],
  }),
  component: Vitals,
});

function Chart({ data, k, min, max, color }: { data: Reading[]; k: "hr" | "spo2"; min: number; max: number; color: string }) {
  const pts = data.filter((r) => r[k] != null).slice(-60);
  if (pts.length < 2) return <Empty icon={<Activity />} title="No readings yet" text="The chart fills in automatically once the band starts sending data." />;
  const vals = pts.flatMap((p) => typeof p[k] === "number" ? [p[k]] : []);
  if (vals.length < 2) return <Empty icon={<Activity />} title="No readings yet" text="The chart fills in automatically once the band starts sending data." />;
  const lo = Math.min(min, ...vals) - 5, hi = Math.max(max, ...vals) + 5;
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100;
  const d = vals.map((value, i) => `${(i / (vals.length - 1)) * 100},${y(value)}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-48 w-full">
      <rect x="0" y={y(max)} width="100" height={y(min) - y(max)} className="fill-success/10" />
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />
    </svg>
  );
}

function Vitals() {
  const s = useStore((x) => x);
  const last = s.readings[s.readings.length - 1];
  const setL = (k: keyof typeof s.limits, v: string) => setState((st) => ({ ...st, limits: { ...st.limits, [k]: Number(v) } }));
  const advice = checkupAdvice(s);
  const hrAbnormal = last?.hr != null && (last.hr < s.limits.hrMin || last.hr > s.limits.hrMax);
  const spo2Low = last?.spo2 != null && last.spo2 < s.limits.spo2Min;

  return (
    <>
      <PageHeader title="Vitals" sub="Readings streamed live from the patient monitoring band." />

      {/* Live Current Reading Banner */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div className={`flex items-center gap-5 rounded-xl border p-5 ${hrAbnormal ? "border-destructive/40 bg-destructive/8" : "border-border bg-card"}`}>
          <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${hrAbnormal ? "bg-destructive/10" : "bg-primary/10"}`}>
            <Heart size={26} className={hrAbnormal ? "text-destructive animate-bounce" : "text-primary animate-pulse"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Heart Rate</p>
            <p className={`font-mono text-5xl font-black ${hrAbnormal ? "text-destructive" : "text-foreground"}`}>
              {last?.hr ?? "—"}<span className="ml-1 text-lg font-normal text-muted-foreground">bpm</span>
            </p>
            {hrAbnormal && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive">
                <AlertTriangle size={13} /> Outside safe limits ({s.limits.hrMin}–{s.limits.hrMax} bpm)
              </p>
            )}
            {!hrAbnormal && last?.hr && <p className="mt-1 text-xs text-muted-foreground">Within normal limits</p>}
          </div>
        </div>

        <div className={`flex items-center gap-5 rounded-xl border p-5 ${spo2Low ? "border-destructive/40 bg-destructive/8" : "border-border bg-card"}`}>
          <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${spo2Low ? "bg-destructive/10" : "bg-primary/10"}`}>
            <Droplets size={26} className={spo2Low ? "text-destructive" : "text-primary"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Blood Oxygen (SpO₂)</p>
            <p className={`font-mono text-5xl font-black ${spo2Low ? "text-destructive" : "text-foreground"}`}>
              {last?.spo2 ?? "—"}<span className="ml-1 text-lg font-normal text-muted-foreground">%</span>
            </p>
            {spo2Low && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive">
                <AlertTriangle size={13} /> Below safe limit ({s.limits.spo2Min}%)
              </p>
            )}
            {!spo2Low && last?.spo2 && <p className="mt-1 text-xs text-muted-foreground">Normal oxygen saturation</p>}
          </div>
        </div>
      </div>

      {/* Check-up recommendation when readings are abnormal */}
      {advice && (
        <div className={`mb-4 flex items-start gap-3 rounded-lg border p-4 ${advice.level === "immediate" ? "border-destructive/30 bg-destructive/8 text-destructive" : "border-warning/40 bg-warning/10 text-warning-foreground"}`}>
          <Stethoscope size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{advice.level === "immediate" ? "Doctor visit recommended immediately" : "Schedule a check-up soon"}</p>
            <p className="text-sm opacity-90">{advice.text}</p>
            {s.patient.doctorPhone && (
              <a href={`tel:${s.patient.doctorPhone}`} className="mt-2 inline-block text-sm font-semibold underline">
                Call {s.patient.doctor || "Doctor"} →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h3 className="mb-3 font-semibold">Heart rate history (bpm)</h3><Chart data={s.readings} k="hr" min={s.limits.hrMin} max={s.limits.hrMax} color="var(--primary)" /></Card>
        <Card><h3 className="mb-3 font-semibold">SpO₂ history (%)</h3><Chart data={s.readings} k="spo2" min={s.limits.spo2Min} max={100} color="var(--chart-2)" /></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Alert limits */}
        <Card>
          <h3 className="mb-1 font-semibold">Alert limits</h3>
          <p className="mb-4 text-sm text-muted-foreground">An emergency alert fires when readings cross these values.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min heart rate"><input type="number" className={inputCls} value={s.limits.hrMin} onChange={(e) => setL("hrMin", e.target.value)} /></Field>
            <Field label="Max heart rate"><input type="number" className={inputCls} value={s.limits.hrMax} onChange={(e) => setL("hrMax", e.target.value)} /></Field>
            <Field label="Min SpO₂ %"><input type="number" className={inputCls} value={s.limits.spo2Min} onChange={(e) => setL("spo2Min", e.target.value)} /></Field>
          </div>
        </Card>

        {/* Fall history */}
        <Card>
          <h3 className="mb-3 font-semibold">Fall history</h3>
          {s.falls.length === 0
            ? <Empty icon={<PersonStanding />} title="No falls recorded" text="Falls detected by the gyro sensor on the band appear here." />
            : <ul className="divide-y text-sm">{s.falls.map((f) => (
                <li key={f} className="flex items-center gap-3 py-2">
                  <AlertTriangle size={14} className="text-destructive" />
                  <span>{fmtTime(f)}</span>
                </li>
              ))}</ul>
          }
        </Card>

        <AdviceCard />
      </div>
    </>
  );
}
