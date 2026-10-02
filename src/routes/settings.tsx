import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cpu, Pill, ChevronRight, Wifi, WifiOff, Bot, Stethoscope, CalendarClock } from "lucide-react";
import { useStore, setState, connectMqtt, disconnectMqtt } from "@/lib/store";
import { Card, PageHeader, Field, inputCls, Button, Badge } from "@/components/ui-kit";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SmartDose Caregiver" },
      { name: "description", content: "Patient profile, doctor contact, MQTT connection, Telegram bot and device pairing." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const p = useStore((s) => s.patient);
  const dev = useStore((s) => s.devices);
  const mqtt = useStore((s) => s.mqtt);
  const tg = useStore((s) => s.telegram);
  const checkup = useStore((s) => s.checkup);

  const [perm, setPerm] = useState<string>("default");
  const [broker, setBroker] = useState(mqtt.broker);
  const [port, setPort] = useState(String(mqtt.port));

  useEffect(() => {
    if ("Notification" in window) setPerm(Notification.permission);
    else setPerm("unsupported");
  }, []);

  const set = (k: keyof typeof p, v: string) => setState((s) => ({ ...s, patient: { ...s.patient, [k]: v } }));
  const setTg = (k: keyof typeof tg, v: string) => setState((s) => ({ ...s, telegram: { ...s.telegram, [k]: v } }));
  const setCk = (k: keyof typeof checkup, v: string) => setState((s) => ({ ...s, checkup: { ...s.checkup, [k]: v } }));

  return (
    <>
      <PageHeader title="Settings" />

      <Link to="/medicines" className="mb-4 flex items-center gap-3 rounded-lg border bg-card p-4 shadow-[var(--shadow-card)]">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><Pill size={18} /></span>
        <span className="flex-1"><span className="block font-semibold">Medicine library</span><span className="block text-xs text-muted-foreground">Tablet details, compartments, and stock</span></span>
        <ChevronRight size={18} className="text-muted-foreground" />
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">

        {/* Patient & Doctor */}
        <Card>
          <h3 className="mb-4 font-semibold">Patient & doctor</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Patient name"><input className={inputCls} value={p.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Age"><input className={inputCls} value={p.age} onChange={(e) => set("age", e.target.value)} /></Field>
            <Field label="Patient phone"><input type="tel" className={inputCls} value={p.patientPhone} onChange={(e) => set("patientPhone", e.target.value)} /></Field>
            <Field label="Doctor name"><input className={inputCls} value={p.doctor} onChange={(e) => set("doctor", e.target.value)} /></Field>
            <Field label="Doctor phone"><input type="tel" className={inputCls} value={p.doctorPhone} onChange={(e) => set("doctorPhone", e.target.value)} /></Field>
          </div>
        </Card>

        {/* Doctor Checkup Schedule */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Stethoscope size={17} className="text-primary" />
            <h3 className="font-semibold">Doctor check-up schedule</h3>
          </div>
          <div className="space-y-3">
            <Field label="Next appointment date & time">
              <input type="datetime-local" className={inputCls} value={checkup.nextDate} onChange={(e) => setCk("nextDate", e.target.value)} />
            </Field>
            <Field label="Doctor / Clinic name">
              <input className={inputCls} placeholder="e.g. Dr. Mehta, Apollo Hospital" value={checkup.doctor} onChange={(e) => setCk("doctor", e.target.value)} />
            </Field>
            <Field label="Notes">
              <textarea rows={2} className={inputCls} placeholder="e.g. Bring previous reports" value={checkup.notes} onChange={(e) => setCk("notes", e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* MQTT Connection */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            {mqtt.connected ? <Wifi size={17} className="text-primary" /> : <WifiOff size={17} className="text-muted-foreground" />}
            <h3 className="font-semibold">Hardware connection (MQTT)</h3>
            <Badge tone={mqtt.connected ? "ok" : "muted"} className="ml-auto">{mqtt.connected ? "Connected" : "Disconnected"}</Badge>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Enter your Mosquitto broker's local IP address (the computer or Pi running the MQTT broker on the same Wi-Fi as the ESP32 box). Port 9001 is the standard WebSocket port.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Broker IP" className="col-span-2">
              <input className={inputCls} placeholder="e.g. 192.168.1.100" value={broker} onChange={(e) => setBroker(e.target.value)} />
            </Field>
            <Field label="WS Port">
              <input type="number" className={inputCls} value={port} onChange={(e) => setPort(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => connectMqtt(broker, Number(port))} disabled={!broker}>
              <Wifi size={15} /> Connect
            </Button>
            {mqtt.connected && (
              <Button variant="outline" onClick={disconnectMqtt}>Disconnect</Button>
            )}
          </div>
          {mqtt.connected && (
            <p className="mt-3 text-xs text-muted-foreground">
              Subscribed to: <span className="font-mono">smartmed/band/vitals</span>, <span className="font-mono">smartmed/box/status</span>, <span className="font-mono">smartmed/box/loadcell</span>
            </p>
          )}
        </Card>

        {/* Telegram Bot */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Bot size={17} className="text-primary" />
            <h3 className="font-semibold">Telegram bot alerts</h3>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            These are stored in the ESP32 box firmware. Paste them here for reference so you can verify or update them in the code. SOS, fall, and missed-dose notifications are sent directly from the ESP32 to Telegram.
          </p>
          <div className="space-y-3">
            <Field label="Bot Token (from @BotFather)">
              <input className={inputCls} placeholder="123456:ABC-DEF..." value={tg.botToken} onChange={(e) => setTg("botToken", e.target.value)} />
            </Field>
            <Field label="Chat ID (from @userinfobot)">
              <input className={inputCls} placeholder="e.g. 987654321" value={tg.chatId} onChange={(e) => setTg("chatId", e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* Browser Notifications */}
        <Card>
          <h3 className="mb-2 font-semibold">Browser emergency notifications</h3>
          <p className="mb-4 text-sm text-muted-foreground">Allow notifications so SOS, fall and abnormal-vitals alerts reach you even when this tab is in the background.</p>
          <div className="flex items-center gap-3">
            <Badge tone={perm === "granted" ? "ok" : "warn"}>{perm === "granted" ? "Enabled" : perm === "unsupported" ? "Not supported" : "Not enabled"}</Badge>
            {perm !== "granted" && perm !== "unsupported" && (
              <Button onClick={async () => setPerm(await Notification.requestPermission())}>Enable notifications</Button>
            )}
          </div>
        </Card>

        {/* Device Status */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Device status</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-md border bg-muted/35 p-4">
              <span className="text-primary"><CalendarClock size={19} /></span>
              <span className="flex-1 font-medium">Monitoring Band</span>
              <Badge tone={dev.band.online ? "ok" : "muted"}>{dev.band.online ? "Online" : "Offline"}</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-md border bg-muted/35 p-4">
              <span className="text-primary"><Cpu size={19} /></span>
              <span className="flex-1 font-medium">Dispenser Box</span>
              <Badge tone={dev.box.online ? "ok" : "muted"}>{dev.box.online ? "Online" : "Offline"}</Badge>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
