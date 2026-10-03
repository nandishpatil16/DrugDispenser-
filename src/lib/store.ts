import { useSyncExternalStore } from "react";

export type Slot = "morning" | "afternoon" | "night";
export const SLOTS: { id: Slot; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "night", label: "Night" },
];

export type Medicine = { id: string; name: string; mg: number; compartment: string; stock: number; notes: string };
export type SlotPlan = { time: string; enabled: boolean; items: { medId: string; qty: number }[] };
export type AlertType = "sos" | "fall" | "heart" | "spo2" | "dose" | "offline";
export type Alert = { id: string; type: AlertType; message: string; at: number; ack: boolean };
export type Reading = { at: number; hr?: number | undefined; spo2?: number | undefined };
export type DoseStatus = "scheduled" | "dispensed" | "removed" | "not_removed";

export type State = {
  medicines: Medicine[];
  schedule: Record<Slot, SlotPlan>;
  reminder: { vibration: boolean; alarm: boolean };
  limits: { hrMin: number; hrMax: number; spo2Min: number };
  patient: { name: string; age: string; doctor: string; doctorPhone: string; patientPhone: string };
  alerts: Alert[];
  readings: Reading[];
  falls: number[];
  devices: { band: { online: boolean; battery?: number | undefined; lastSync?: number | undefined }; box: { online: boolean; tray?: string | undefined; lastSync?: number | undefined } };
  doses: Partial<Record<Slot, DoseStatus>>;
  emergency: Alert | null;
  mqtt: { broker: string; port: number; connected: boolean; user: string; pass: string };
  telegram: { botToken: string; chatId: string };
  checkup: { nextDate: string; doctor: string; notes: string };
  box: { loadCellGrams: number; dfplaying: boolean; lastDispenseSlot: Slot | null };
  theme: "light" | "dark" | "system";
};

const initial: State = {
  medicines: [],
  schedule: {
    morning: { time: "08:00", enabled: true, items: [] },
    afternoon: { time: "14:00", enabled: true, items: [] },
    night: { time: "21:00", enabled: true, items: [] },
  },
  reminder: { vibration: true, alarm: true },
  limits: { hrMin: 50, hrMax: 110, spo2Min: 92 },
  patient: { name: "", age: "", doctor: "", doctorPhone: "", patientPhone: "" },
  alerts: [],
  readings: [],
  falls: [],
  devices: { band: { online: false }, box: { online: false } },
  doses: {},
  emergency: null,
  mqtt: { broker: "", port: 8084, connected: false, user: "", pass: "" },
  telegram: { botToken: "", chatId: "" },
  checkup: { nextDate: "", doctor: "", notes: "" },
  box: { loadCellGrams: 0, dfplaying: false, lastDispenseSlot: null },
  theme: "system",
};

const KEY = "smartdose-state-v1";
let state: State = initial;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = {
        ...initial,
        ...parsed,
        emergency: null,
        mqtt: { ...initial.mqtt, ...parsed.mqtt, connected: false },
        box: { ...initial.box, ...parsed.box },
        telegram: { ...initial.telegram, ...parsed.telegram },
        checkup: { ...initial.checkup, ...parsed.checkup },
      };
      
      // Auto-connect MQTT if broker is set
      if (state.mqtt.broker) {
        setTimeout(() => {
          mqttConnect(state.mqtt.broker, state.mqtt.port, state.mqtt.user, state.mqtt.pass);
        }, 100);
      }
    }
  } catch {}
}

export function setState(fn: (s: State) => State) {
  load();
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  subs.forEach((f) => f());
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      if (!loaded) { load(); cb(); }
      return () => subs.delete(cb);
    },
    () => sel(state),
    () => sel(initial),
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function slotTotalMg(s: State, slot: Slot) {
  return s.schedule[slot].items.reduce((sum, it) => {
    const m = s.medicines.find((x) => x.id === it.medId);
    return sum + (m ? m.mg * it.qty : 0);
  }, 0);
}

function pushAlert(type: AlertType, message: string, emergency = false) {
  const a: Alert = { id: uid(), type, message, at: Date.now(), ack: false };
  setState((s) => ({ ...s, alerts: [a, ...s.alerts].slice(0, 200) }));
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(emergency ? "🚨 " + message : message, { body: new Date().toLocaleTimeString() });
  }
  if (emergency) beep();
}

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    o.frequency.value = 880;
    o.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 1.2);
  } catch {}
}

export type DeviceEvent =
  | { kind: "vitals"; hr?: number; spo2?: number; battery?: number }
  | { kind: "fall" }
  | { kind: "sos" }
  | { kind: "dose"; slot: Slot; status: DoseStatus }
  | { kind: "box"; online: boolean; tray?: string | undefined }
  | { kind: "band"; online: boolean }
  | { kind: "loadcell"; grams: number }
  | { kind: "dfplayer"; playing: boolean };

export function handleDeviceEvent(e: DeviceEvent) {
  const now = Date.now();
  switch (e.kind) {
    case "vitals": {
      // Filter out 0 values as they mean "no finger detected"
      const hr = e.hr && e.hr > 0 ? e.hr : undefined;
      const spo2 = e.spo2 && e.spo2 > 0 ? e.spo2 : undefined;
      
      setState((s) => ({
        ...s,
        readings: [...s.readings, { at: now, hr, spo2 }].slice(-500),
        devices: { ...s.devices, band: { online: true, battery: e.battery ?? s.devices.band.battery, lastSync: now } },
      }));
      
      const l = state.limits;
      // Prevent spamming alerts every 500ms by checking if we recently alerted
      const lastAlerts = state.alerts.filter(a => now - a.at < 60000); // alerts in last 60s
      
      if (hr != null && (hr < l.hrMin || hr > l.hrMax)) {
        if (!lastAlerts.some(a => a.type === "heart")) {
          pushAlert("heart", `Abnormal heart rate: ${hr} bpm`, true);
        }
      }
      if (spo2 != null && spo2 < l.spo2Min) {
        if (!lastAlerts.some(a => a.type === "spo2")) {
          pushAlert("spo2", `Low SpO2: ${spo2}%`, true);
        }
      }
      break;
    }
    case "fall":
      setState((s) => ({ ...s, falls: [now, ...s.falls] }));
      pushAlert("fall", "Fall detected by band", true);
      break;
    case "sos":
      pushAlert("sos", "SOS button pressed by patient", true);
      break;
    case "dose":
      setState((s) => ({ ...s, doses: { ...s.doses, [e.slot]: e.status } }));
      if (e.status === "not_removed") pushAlert("dose", `${e.slot} dose not removed from tray`);
      break;
    case "box":
      setState((s) => ({ ...s, devices: { ...s.devices, box: { online: e.online, tray: e.tray, lastSync: now } } }));
      if (!e.online) pushAlert("offline", "Dispenser box went offline");
      break;
    case "band":
      setState((s) => ({ ...s, devices: { ...s.devices, band: { ...s.devices.band, online: e.online } } }));
      if (!e.online) pushAlert("offline", "Monitoring band went offline");
      break;
    case "loadcell":
      setState((s) => ({ ...s, box: { ...s.box, loadCellGrams: e.grams } }));
      break;
    case "dfplayer":
      setState((s) => ({ ...s, box: { ...s.box, dfplaying: e.playing } }));
      break;
  }
}

export type Advice = { level: "routine" | "soon" | "immediate"; text: string };
export function checkupAdvice(s: State): Advice | null {
  const week = Date.now() - 7 * 864e5;
  const recent = s.readings.filter((r) => r.at > week);
  if (s.falls.some((f) => f > week)) return { level: "immediate", text: "A fall was detected this week. Arrange a medical examination as soon as possible." };
  const abnHr = recent.filter((r) => r.hr != null && (r.hr < s.limits.hrMin || r.hr > s.limits.hrMax)).length;
  const lowO2 = recent.filter((r) => r.spo2 != null && r.spo2 < s.limits.spo2Min).length;
  if (abnHr >= 5 || lowO2 >= 3) return { level: "immediate", text: "Repeated abnormal readings in the last 7 days. Consult a doctor today." };
  if (abnHr >= 2 || lowO2 >= 1) return { level: "soon", text: "Some readings were outside safe limits. Book a checkup within the next few days." };
  return null;
}

export function fmtTime(t?: number) {
  return t ? new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
}

// ─── MQTT over WebSocket (connects browser to ESP32 box via Mosquitto) ────────
import mqttLib from "mqtt";

let mqttClient: mqttLib.MqttClient | null = null;
let mqttReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function parseMqttPayload(topic: string, raw: string) {
  try {
    if (topic === "smartmed/band/vitals") {
      const d = JSON.parse(raw);
      if (d.fall) handleDeviceEvent({ kind: "fall" });
      if (d.emergency) handleDeviceEvent({ kind: "sos" });
      handleDeviceEvent({ kind: "vitals", hr: d.hr, spo2: d.spo2 });
    } else if (topic === "smartmed/box/status") {
      const slot = state.box.lastDispenseSlot ?? "morning";
      if (raw === "DISPENSED") {
        handleDeviceEvent({ kind: "dose", slot, status: "dispensed" });
        handleDeviceEvent({ kind: "dfplayer", playing: true });
      } else if (raw === "TAKEN" || raw === "REMOVED") {
        handleDeviceEvent({ kind: "dose", slot, status: "removed" });
        handleDeviceEvent({ kind: "loadcell", grams: 0 });
        handleDeviceEvent({ kind: "dfplayer", playing: false });
      } else if (raw === "NOT_TAKEN") {
        handleDeviceEvent({ kind: "dose", slot, status: "not_removed" });
      }
    } else if (topic === "smartmed/box/loadcell") {
      handleDeviceEvent({ kind: "loadcell", grams: parseFloat(raw) });
    } else if (topic === "smartmed/box/online") {
      handleDeviceEvent({ kind: "box", online: raw.trim() === "1" });
    } else if (topic === "smartmed/band/online") {
      handleDeviceEvent({ kind: "band", online: raw.trim() === "1" });
    }
  } catch {}
}

function mqttConnect(broker: string, port: number, user: string, pass: string) {
  if (mqttClient) { mqttClient.end(); mqttClient = null; }
  if (!broker) return;
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(broker);
  const scheme = isIp ? "ws" : "wss";
  const url = `${scheme}://${broker}:${port}/mqtt`;
  
  const options: mqttLib.IClientOptions = { clientId: "smartdose-web-" + uid() };
  if (user) options.username = user;
  if (pass) options.password = pass;

  mqttClient = mqttLib.connect(url, options);

  mqttClient.on("connect", () => {
    setState((s) => ({ 
      ...s, 
      mqtt: { ...s.mqtt, connected: true },
      // Reset devices to offline; we will rely on retained MQTT messages to tell us if they are online
      devices: { band: { ...s.devices.band, online: false }, box: { ...s.devices.box, online: false } }
    }));
    mqttClient?.subscribe([
      "smartmed/band/vitals", "smartmed/box/status",
      "smartmed/box/loadcell", "smartmed/box/online", "smartmed/band/online"
    ]);
  });

  mqttClient.on("message", (topic, payload) => {
    parseMqttPayload(topic, payload.toString());
  });

  mqttClient.on("close", () => {
    setState((s) => ({ ...s, mqtt: { ...s.mqtt, connected: false } }));
  });

  mqttClient.on("error", () => {
    mqttClient?.end();
  });
}

export function connectMqtt(broker: string, port: number, user: string, pass: string) {
  setState((s) => ({ ...s, mqtt: { ...s.mqtt, broker, port, user, pass } }));
  mqttConnect(broker, port, user, pass);
}

export function disconnectMqtt() {
  if (mqttReconnectTimer) clearTimeout(mqttReconnectTimer);
  mqttClient?.end();
  mqttClient = null;
  setState((s) => ({ ...s, mqtt: { ...s.mqtt, connected: false } }));
}

export function publishMqtt(topic: string, payload: string) {
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, payload);
  }
}

// ─── Auto-Dispense Scheduler ─────────────────────────────────────────────────
// Runs every 30 seconds. When current HH:MM matches a slot's scheduled time,
// fires DISPENSE_MORNING / DISPENSE_AFTERNOON / DISPENSE_NIGHT over MQTT.
// Prevents double-firing using a per-day fired-set keyed by date+slot.

const dispatchedToday: Set<string> = new Set();

/** Call this whenever a slot's time is changed so the new time can fire today. */
export function clearDispatchCache(slot?: Slot) {
  if (slot) {
    const todayKey = new Date().toISOString().slice(0, 10);
    dispatchedToday.delete(`${todayKey}-${slot}`);
  } else {
    const todayKey = new Date().toISOString().slice(0, 10);
    dispatchedToday.delete(`${todayKey}-morning`);
    dispatchedToday.delete(`${todayKey}-afternoon`);
    dispatchedToday.delete(`${todayKey}-night`);
  }
}

/** Immediately dispense a specific slot (manual override from web app). */
export function manualDispense(slot: Slot) {
  if (!state.mqtt.connected) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  dispatchedToday.add(`${todayKey}-${slot}`); // prevent auto-fire from double-firing
  setState((s) => ({ ...s, box: { ...s.box, lastDispenseSlot: slot } }));
  publishMqtt("smartmed/box/command", `DISPENSE_${slot.toUpperCase()}`);
  handleDeviceEvent({ kind: "dose", slot, status: "dispensed" });
  handleDeviceEvent({ kind: "dfplayer", playing: true });
}

function checkDispenseSchedule() {
  load();
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Reset the fired set at midnight
  const resetKey = `reset-${todayKey}`;
  if (!dispatchedToday.has(resetKey)) {
    dispatchedToday.clear();
    dispatchedToday.add(resetKey);
    // Also reset all dose statuses for a new day
    setState((s) => ({ ...s, doses: {} }));
  }

  SLOTS.forEach((sl) => {
    const plan = state.schedule[sl.id];
    const fireKey = `${todayKey}-${sl.id}`;
    if (!plan.enabled || plan.items.length === 0) return;
    if (dispatchedToday.has(fireKey)) return;
    if (!state.mqtt.connected) return;
    if (plan.time !== hhmm) return;

    dispatchedToday.add(fireKey);
    setState((s) => ({ ...s, box: { ...s.box, lastDispenseSlot: sl.id } }));
    publishMqtt("smartmed/box/command", `DISPENSE_${sl.id.toUpperCase()}`);
    handleDeviceEvent({ kind: "dose", slot: sl.id, status: "dispensed" });
    handleDeviceEvent({ kind: "dfplayer", playing: true });
  });
}

// ─── Missed-Dose Watchdog ─────────────────────────────────────────────────────
// If a slot stays in "dispensed" state for more than 15 minutes without the
// patient picking it up, mark it as not_removed and push an alert.

const MISSED_WINDOW_MS = 15 * 60 * 1000;
const dispensedAt: Partial<Record<Slot, number>> = {};
const missedFired: Partial<Record<Slot, boolean>> = {};

function checkMissedDoses() {
  load();
  const now = Date.now();
  SLOTS.forEach((sl) => {
    const status = state.doses[sl.id];
    if (status === "dispensed") {
      if (!dispensedAt[sl.id]) dispensedAt[sl.id] = now;
      if (!missedFired[sl.id] && dispensedAt[sl.id] && now - (dispensedAt[sl.id]!) > MISSED_WINDOW_MS) {
        missedFired[sl.id] = true;
        handleDeviceEvent({ kind: "dose", slot: sl.id, status: "not_removed" });
      }
    } else {
      dispensedAt[sl.id] = undefined;
      missedFired[sl.id] = undefined;
    }
  });
}

if (typeof window !== "undefined") {
  setInterval(checkDispenseSchedule, 30_000);
  setInterval(checkMissedDoses, 60_000);
}
