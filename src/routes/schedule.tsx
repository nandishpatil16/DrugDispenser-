import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, Sun, CloudSun, Moon, Pill, ArrowRight, Clock, Zap, CheckCircle2 } from "lucide-react";
import { useStore, setState, SLOTS, slotTotalMg, type Slot, clearDispatchCache, manualDispense } from "@/lib/store";
import { Card, PageHeader, Button, inputCls, Empty, Field, Badge } from "@/components/ui-kit";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Dispense Schedule — SmartDose Caregiver" },
      { name: "description", content: "Set morning, afternoon and night dispense times and dosages." },
    ],
  }),
  component: Schedule,
});

const SLOT_META: Record<Slot, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  morning:   { icon: <Sun size={22} />,      color: "text-orange-500",  bg: "bg-orange-50",  border: "border-orange-200" },
  afternoon: { icon: <CloudSun size={22} />, color: "text-amber-500",   bg: "bg-amber-50",   border: "border-amber-200" },
  night:     { icon: <Moon size={22} />,     color: "text-indigo-500",  bg: "bg-indigo-50",  border: "border-indigo-200" },
};

function useCountdown(targetHHMM: string, enabled: boolean) {
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!enabled) { setCountdown("Disabled"); return; }
    const tick = () => {
      const now = new Date();
      const [h, m] = targetHHMM.split(":").map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1); // tomorrow
      const diff = target.getTime() - now.getTime();
      const hh = Math.floor(diff / 3_600_000);
      const mm = Math.floor((diff % 3_600_000) / 60_000);
      const ss = Math.floor((diff % 60_000) / 1_000);
      setCountdown(`${String(hh).padStart(2,"0")}h ${String(mm).padStart(2,"0")}m ${String(ss).padStart(2,"0")}s`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetHHMM, enabled]);
  return countdown;
}

function SlotCard({ slot }: { slot: typeof SLOTS[number] }) {
  const s = useStore((x) => x);
  const p = s.schedule[slot.id];
  const meta = SLOT_META[slot.id];
  const countdown = useCountdown(p.time, p.enabled);
  const mqttConnected = s.mqtt.connected;
  const doseStatus = s.doses[slot.id];

  const upd = (fn: (p: typeof p) => typeof p) =>
    setState((st) => ({ ...st, schedule: { ...st.schedule, [slot.id]: fn(st.schedule[slot.id]) } }));

  const handleTimeChange = (newTime: string) => {
    upd((x) => ({ ...x, time: newTime }));
    clearDispatchCache(slot.id); // allow this slot to fire at the new time today
  };

  const handleManualDispense = () => {
    manualDispense(slot.id);
  };

  return (
    <Card className={`flex flex-col gap-0 overflow-hidden p-0 ${!p.enabled ? "opacity-60" : ""}`}>
      {/* Slot header */}
      <div className={`flex items-center justify-between px-5 py-4 ${meta.bg} border-b ${meta.border}`}>
        <div className={`flex items-center gap-2 font-bold text-base ${meta.color}`}>
          {meta.icon} {slot.label}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground">
          <input
            type="checkbox"
            checked={p.enabled}
            className="h-4 w-4 accent-primary"
            onChange={(e) => upd((x) => ({ ...x, enabled: e.target.checked }))}
          />
          Enabled
        </label>
      </div>

      <div className="p-5">
        {/* ── Large time picker ───────────────────────────── */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Dispense time
          </label>
          <input
            type="time"
            value={p.time}
            onChange={(e) => handleTimeChange(e.target.value)}
            disabled={!p.enabled}
            className="w-full rounded-lg border bg-background px-4 py-3 font-mono text-4xl font-black tracking-widest text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
          />
        </div>

        {/* Countdown timer */}
        <div className="mb-5 flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <Clock size={16} className="shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Next dispense in</p>
            <p className="font-mono text-lg font-bold text-foreground">{p.enabled ? countdown : "—"}</p>
          </div>
          {doseStatus && (
            <Badge tone={doseStatus === "removed" ? "ok" : doseStatus === "not_removed" ? "danger" : "primary"}>
              {doseStatus === "removed" ? "Taken ✓" : doseStatus === "dispensed" ? "In tray" : doseStatus === "not_removed" ? "Missed" : ""}
            </Badge>
          )}
        </div>

        {/* Medicine items */}
        <div className="mb-4 space-y-2">
          {p.items.map((it, i) => {
            const med = s.medicines.find((x) => x.id === it.medId);
            return (
              <div key={i} className="flex items-center gap-2">
                <select
                  className={inputCls + " flex-1"}
                  value={it.medId}
                  onChange={(e) => upd((x) => ({ ...x, items: x.items.map((y, j) => j === i ? { ...y, medId: e.target.value } : y) }))}
                >
                  {s.medicines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.mg} mg)</option>)}
                </select>
                <input
                  type="number" min={1}
                  className={inputCls + " w-16 text-center"}
                  value={it.qty}
                  onChange={(e) => upd((x) => ({ ...x, items: x.items.map((y, j) => j === i ? { ...y, qty: Math.max(1, Number(e.target.value)) } : y) }))}
                />
                <span className="w-16 text-right font-mono text-xs text-muted-foreground">{med ? med.mg * it.qty : 0} mg</span>
                <Button
                  type="button" variant="ghost"
                  aria-label="Remove"
                  className="h-9 min-h-0 w-9 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => upd((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline" className="mb-2 w-full"
          disabled={!s.medicines.length}
          onClick={() => upd((x) => ({ ...x, items: [...x.items, { medId: s.medicines[0]?.id ?? "", qty: 1 }] }))}
        >
          <Plus size={15} /> Add tablet
        </Button>

        {/* Slot total */}
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Total this slot</span>
          <span className="font-mono font-bold">{slotTotalMg(s, slot.id)} mg</span>
        </div>

        {/* Manual dispense override */}
        <Button
          className="mt-4 w-full gap-2"
          variant={mqttConnected ? "default" : "outline"}
          disabled={!mqttConnected || !p.enabled || p.items.length === 0}
          onClick={handleManualDispense}
          title={!mqttConnected ? "Connect to MQTT broker in Settings first" : ""}
        >
          <Zap size={15} />
          {mqttConnected ? `Dispense ${slot.label} now` : "Connect hardware to dispense"}
        </Button>
        {!mqttConnected && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            <Link to="/settings" className="text-primary underline">Go to Settings</Link> to connect your ESP32 box.
          </p>
        )}
      </div>
    </Card>
  );
}

function Schedule() {
  const s = useStore((x) => x);
  const daily = SLOTS.reduce((a, sl) => a + (s.schedule[sl.id].enabled ? slotTotalMg(s, sl.id) : 0), 0);

  return (
    <>
      <PageHeader
        title="Medication control"
        sub="Set the exact dispense time for each slot. The system fires automatically — or dispense manually."
        action={
          <div className="flex items-center gap-3">
            <div className="rounded-md border bg-card px-4 py-2 text-sm">
              Daily total <span className="ml-2 font-mono text-lg font-semibold">{daily} mg</span>
            </div>
          </div>
        }
      />

      {/* Medicine library shortcut */}
      <div className="mb-6 flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><Pill size={18} /></span>
          <div>
            <p className="font-semibold">Medicine library</p>
            <p className="text-xs text-muted-foreground">Add tablet strength, compartment, stock, and instructions.</p>
          </div>
        </div>
        <Link to="/medicines" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">Manage <ArrowRight size={15} /></Link>
      </div>

      {s.medicines.length === 0 && (
        <div className="mb-6">
          <Empty title="Add medicines first" text="Add tablet details (name and mg) before assigning them to a time slot." />
          <div className="mt-3 text-center">
            <Link to="/medicines" className="text-sm font-medium text-primary">Go to Medicines →</Link>
          </div>
        </div>
      )}

      {/* How it works note */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Auto-dispense is active</p>
          <p className="text-primary/80">When the clock matches a slot's time and the hardware is connected, the MQTT command fires automatically. You can also tap <strong>Dispense now</strong> for an immediate manual override at any time.</p>
        </div>
      </div>

      {/* 3 Slot Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {SLOTS.map((sl) => <SlotCard key={sl.id} slot={sl} />)}
      </div>

      {/* Band reminder settings */}
      <Card className="mt-6">
        <h3 className="mb-3 font-semibold">Band reminder</h3>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={s.reminder.vibration}
              onChange={(e) => setState((st) => ({ ...st, reminder: { ...st.reminder, vibration: e.target.checked } }))} />
            Vibration (band motor)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={s.reminder.alarm}
              onChange={(e) => setState((st) => ({ ...st, reminder: { ...st.reminder, alarm: e.target.checked } }))} />
            Audio reminder (DFPlayer speaker)
          </label>
        </div>
      </Card>
    </>
  );
}
