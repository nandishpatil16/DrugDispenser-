import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  FlaskConical, Heart, Droplets, PersonStanding, Siren,
  Sun, Sunset, Moon, CheckCircle2, XCircle, Wifi, WifiOff,
  Play, Square, RefreshCw
} from "lucide-react";
import { handleDeviceEvent, setState, useStore, type Slot } from "@/lib/store";
import { Card, PageHeader, Button, Badge } from "@/components/ui-kit";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [{ title: "Simulation — SmartDose Caregiver" }],
  }),
  component: SimulationPage,
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function fire(label: string, fn: () => void, setLog: React.Dispatch<React.SetStateAction<string[]>>) {
  fn();
  setLog((l) => [`[${new Date().toLocaleTimeString()}] ${label}`, ...l].slice(0, 40));
}

// ── Component ─────────────────────────────────────────────────────────────────
function SimulationPage() {
  const s = useStore((x) => x);
  const [log, setLog] = useState<string[]>([]);
  const [hr, setHr] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [autoRunning, setAutoRunning] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auto-simulate ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoRunning) {
      autoRef.current = setInterval(() => {
        const newHr   = Math.min(160, Math.max(40, hr + Math.floor(Math.random() * 7) - 3));
        const newSpo2 = Math.min(100, Math.max(88, spo2 + Math.floor(Math.random() * 3) - 1));
        setHr(newHr);
        setSpo2(newSpo2);
        handleDeviceEvent({ kind: "vitals", hr: newHr, spo2: newSpo2 });
        setLog((l) => [`[${new Date().toLocaleTimeString()}] Auto vitals → HR ${newHr} bpm, SpO₂ ${newSpo2}%`, ...l].slice(0, 40));
      }, 3000);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoRunning, hr, spo2]);

  // Helper to make device appear "online"
  const goOnline = () => {
    setState((s) => ({
      ...s,
      devices: {
        band: { online: true, lastSync: Date.now() },
        box:  { online: true, lastSync: Date.now() },
      },
    }));
    setLog((l) => [`[${new Date().toLocaleTimeString()}] ✅ Both devices marked ONLINE`, ...l].slice(0, 40));
  };

  const goOffline = () => {
    setState((s) => ({
      ...s,
      devices: {
        band: { online: false },
        box:  { online: false },
      },
    }));
    setLog((l) => [`[${new Date().toLocaleTimeString()}] ⛔ Both devices marked OFFLINE`, ...l].slice(0, 40));
  };

  const resetAll = () => {
    setState((s) => ({
      ...s,
      doses: {},
      readings: [],
      falls: [],
      alerts: [],
      emergency: null,
      box: { loadCellGrams: 0, dfplaying: false, lastDispenseSlot: null },
    }));
    setLog([`[${new Date().toLocaleTimeString()}] 🔄 All simulation data reset`]);
  };

  const slotIcon: Record<Slot, React.ReactNode> = {
    morning:   <Sun size={15} />,
    afternoon: <Sunset size={15} />,
    night:     <Moon size={15} />,
  };

  const bandOnline = s.devices.band.online;
  const boxOnline  = s.devices.box.online;

  return (
    <>
      <PageHeader
        title="Hardware simulation"
        sub="Test every feature of the app without physical hardware. Fire events exactly as the ESP32 would."
      />

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/6 p-4 text-sm text-primary">
        <FlaskConical size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Simulation mode</p>
          <p className="text-primary/80">All events fired here are identical to what the real ESP32 hardware would send via MQTT. You can verify alerts, tray status, vitals charts, Telegram alert logic — everything.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left: Device + Vitals ─────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Device online/offline */}
          <Card>
            <h3 className="mb-4 font-semibold">Device connection</h3>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Band</p>
                <Badge tone={bandOnline ? "ok" : "muted"}>{bandOnline ? "Online" : "Offline"}</Badge>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Box</p>
                <Badge tone={boxOnline ? "ok" : "muted"}>{boxOnline ? "Online" : "Offline"}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={goOnline}><Wifi size={14} /> Go online</Button>
              <Button variant="outline" className="flex-1" onClick={goOffline}><WifiOff size={14} /> Go offline</Button>
            </div>
          </Card>

          {/* Vitals sliders */}
          <Card>
            <h3 className="mb-4 font-semibold">Band vitals</h3>
            <div className="mb-4 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-semibold"><Heart size={14} className="text-primary" /> Heart Rate</label>
                  <span className="font-mono text-lg font-black">{hr} <span className="text-xs font-normal text-muted-foreground">bpm</span></span>
                </div>
                <input type="range" min={35} max={160} value={hr}
                  className="w-full accent-primary"
                  onChange={(e) => setHr(Number(e.target.value))} />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>35</span><span className="text-green-600 font-semibold">{s.limits.hrMin}–{s.limits.hrMax} safe</span><span>160</span>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-semibold"><Droplets size={14} className="text-primary" /> SpO₂</label>
                  <span className="font-mono text-lg font-black">{spo2} <span className="text-xs font-normal text-muted-foreground">%</span></span>
                </div>
                <input type="range" min={85} max={100} value={spo2}
                  className="w-full accent-primary"
                  onChange={(e) => setSpo2(Number(e.target.value))} />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>85</span><span className="text-green-600 font-semibold">≥{s.limits.spo2Min}% safe</span><span>100</span>
                </div>
              </div>
            </div>

            <Button className="mb-2 w-full" onClick={() => fire(`Sent vitals → HR ${hr} bpm, SpO₂ ${spo2}%`, () => handleDeviceEvent({ kind: "vitals", hr, spo2 }), setLog)}>
              <Heart size={14} /> Send vitals reading
            </Button>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant={autoRunning ? "outline" : "default"}
                onClick={() => setAutoRunning((v) => !v)}
              >
                {autoRunning ? <><Square size={13} /> Stop auto</> : <><Play size={13} /> Auto-simulate (3s)</>}
              </Button>
            </div>

            {autoRunning && (
              <p className="mt-2 text-center text-xs text-muted-foreground">Sending randomised vitals every 3 seconds…</p>
            )}
          </Card>

          {/* Emergency events */}
          <Card>
            <h3 className="mb-4 font-semibold">Emergency events</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => fire("⚠️ Fall detected", () => handleDeviceEvent({ kind: "fall" }), setLog)}>
                <PersonStanding size={14} /> Simulate fall detection
              </Button>
              <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => fire("🚨 SOS button pressed", () => handleDeviceEvent({ kind: "sos" }), setLog)}>
                <Siren size={14} /> Simulate SOS button press
              </Button>
              <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => fire("Sent abnormal HR (130 bpm)", () => handleDeviceEvent({ kind: "vitals", hr: 130, spo2: 98 }), setLog)}>
                <Heart size={14} /> Simulate abnormal HR (130 bpm)
              </Button>
              <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => fire("Sent low SpO₂ (88%)", () => handleDeviceEvent({ kind: "vitals", hr: 74, spo2: 88 }), setLog)}>
                <Droplets size={14} /> Simulate low SpO₂ (88%)
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Middle: Dispenser simulation ─────────────────────────────────── */}
        <div className="space-y-6">
          {(["morning", "afternoon", "night"] as Slot[]).map((slot) => (
            <Card key={slot} className="overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3 font-semibold capitalize">
                {slotIcon[slot]} {slot} slot
                <span className="ml-auto">
                  {s.doses[slot] ? (
                    <Badge tone={s.doses[slot] === "removed" ? "ok" : s.doses[slot] === "not_removed" ? "danger" : "primary"}>
                      {s.doses[slot] === "removed" ? "Taken ✓" : s.doses[slot] === "dispensed" ? "In tray" : "Missed"}
                    </Badge>
                  ) : (
                    <Badge tone="muted">Scheduled</Badge>
                  )}
                </span>
              </div>
              <div className="space-y-2 p-4">
                <Button className="w-full" variant="outline"
                  onClick={() => fire(`Dispenser → ${slot} servo fired`, () => {
                    setState((s) => ({ ...s, box: { ...s.box, lastDispenseSlot: slot } }));
                    handleDeviceEvent({ kind: "dose", slot, status: "dispensed" });
                    handleDeviceEvent({ kind: "dfplayer", playing: true });
                  }, setLog)}>
                  Dispense {slot} tablet
                </Button>
                <Button className="w-full" variant="outline"
                  onClick={() => fire(`Load cell → ${slot} tablet TAKEN`, () => {
                    handleDeviceEvent({ kind: "dose", slot, status: "removed" });
                    handleDeviceEvent({ kind: "dfplayer", playing: false });
                    handleDeviceEvent({ kind: "loadcell", grams: 0 });
                  }, setLog)}>
                  <CheckCircle2 size={14} className="text-success" /> Tablet taken (load cell → 0)
                </Button>
                <Button className="w-full" variant="outline"
                  onClick={() => fire(`⚠️ ${slot} dose NOT taken (15 min timeout)`, () => {
                    handleDeviceEvent({ kind: "dose", slot, status: "not_removed" });
                  }, setLog)}>
                  <XCircle size={14} className="text-destructive" /> Tablet NOT taken (missed)
                </Button>
              </div>
            </Card>
          ))}

          {/* DFPlayer */}
          <Card>
            <h3 className="mb-3 font-semibold">DFPlayer audio</h3>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline"
                onClick={() => fire("DFPlayer → playing reminder", () => handleDeviceEvent({ kind: "dfplayer", playing: true }), setLog)}>
                <Play size={13} /> Start audio
              </Button>
              <Button className="flex-1" variant="outline"
                onClick={() => fire("DFPlayer → stopped", () => handleDeviceEvent({ kind: "dfplayer", playing: false }), setLog)}>
                <Square size={13} /> Stop audio
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Right: Event log + Reset ──────────────────────────────────────── */}
        <div className="space-y-6">
          <Card className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Event log</h3>
              <Button variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setLog([])}>
                Clear
              </Button>
            </div>
            {log.length === 0
              ? <p className="text-sm text-muted-foreground">Events you fire will appear here in real time.</p>
              : (
                <ul className="max-h-[480px] divide-y overflow-y-auto text-xs">
                  {log.map((entry, i) => (
                    <li key={i} className="py-2 font-mono text-muted-foreground">{entry}</li>
                  ))}
                </ul>
              )
            }
          </Card>

          {/* Reset */}
          <Card>
            <h3 className="mb-2 font-semibold">Reset simulation</h3>
            <p className="mb-3 text-sm text-muted-foreground">Clears all readings, dose statuses, falls, and alerts. Patient info and schedule are kept.</p>
            <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10" onClick={resetAll}>
              <RefreshCw size={14} /> Reset all simulation data
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
