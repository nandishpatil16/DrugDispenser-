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
export type Reading = { at: number; hr?: number; spo2?: number };
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
  devices: {
    band: { online: boolean; battery?: number; lastSync?: number };
    box:  { online: boolean; tray?: string; lastSync?: number };
  };
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
    morning:   { time: "08:00", enabled: true, items: [] },
    afternoon: { time: "14:00", enabled: true, items: [] },
    night:     { time: "21:00", enabled: true, items: [] },
  },
  reminder:  { vibration: true, alarm: true },
  limits:    { hrMin: 50, hrMax: 110, spo2Min: 92 },
  patient:   { name: "", age: "", doctor: "", doctorPhone: "", patientPhone: "" },
  alerts:    [],
  readings:  [],
  falls:     [],
  devices:   { band: { online: false }, box: { online: false } },
  doses:     {},
  emergency: null,
  mqtt:      { broker: "", port: 8084, connected: false, user: "", pass: "" },
  telegram:  { botToken: "", chatId: "" },
  checkup:   { nextDate: "", doctor: "", notes: "" },
  box:       { loadCellGrams: 0, dfplaying: false, lastDispenseSlot: null },
  theme:     "system",
};

// ─── Two separate storage keys ────────────────────────────────────────────────
// CREDS_KEY never changes — credentials survive any app version bump forever.
// STATE_KEY can be bumped to wipe other state (alerts, readings) without
// deleting the user's broker address / password.
const CREDS_KEY = "smartdose-creds-v2";   // ← never change this key
const STATE_KEY = "smartdose-state-v5";   // ← bump this if you need to reset

let state: State = initial;
let loaded = false;
const subs = new Set<() => void>();

// ─── Persist / load helpers ───────────────────────────────────────────────────
function loadCreds(): { broker: string; port: number; user: string; pass: string } | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCreds(broker: string, port: number, user: string, pass: string) {
  try { localStorage.setItem(CREDS_KEY, JSON.stringify({ broker, port, user, pass })); } catch {}
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    // Always load credentials first from their dedicated key
    const creds = loadCreds();

    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = {
        ...initial,
        ...parsed,
        emergency: null,
        devices: { band: { online: false }, box: { online: false } },
        // Merge credentials: prefer dedicated creds key, fall back to parsed state
        mqtt: {
          ...initial.mqtt,
          ...(creds ?? {}),
          ...(parsed.mqtt ?? {}),
          ...(creds ?? {}),   // creds key always wins
          connected: false,
        },
        box:      { ...initial.box,      ...parsed.box },
        telegram: { ...initial.telegram, ...parsed.telegram },
        checkup:  { ...initial.checkup,  ...parsed.checkup },
      };
    } else if (creds) {
      state = {
        ...initial,
        mqtt: { ...initial.mqtt, ...creds, connected: false },
      };
    }

    // Auto-connect MQTT if broker is saved
    if (state.mqtt.broker) {
      setTimeout(() => {
        mqttConnect(state.mqtt.broker, state.mqtt.port, state.mqtt.user, state.mqtt.pass);
      }, 300);
    }
  } catch {}
}

export function setState(fn: (s: State) => State) {
  load();
  state = fn(state);
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
  subs.forEach((f) => f());
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); if (!loaded) { load(); cb(); } return () => subs.delete(cb); },
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

// ─── Alert helpers ─────────────────────────────────────────────────────────────
function pushAlert(type: AlertType, message: string, emergency = false) {
  const a: Alert = { id: uid(), type, message, at: Date.now(), ack: false };
  setState((s) => ({ ...s, alerts: [a, ...s.alerts].slice(0, 200) }));
  try {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(emergency ? "🚨 " + message : message, { body: new Date().toLocaleTimeString() });
    }
  } catch (err) {
    console.warn("Notification API failed:", err);
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

// ─── Alert throttle — one alert per type per 60 seconds ───────────────────────
function pushAlertThrottled(type: AlertType, message: string, emergency = false) {
  const now = Date.now();
  const recentSameType = state.alerts.find(a => a.type === type && now - a.at < 60_000);
  if (!recentSameType) pushAlert(type, message, emergency);
}

// ─── Device events ─────────────────────────────────────────────────────────────
export type DeviceEvent =
  | { kind: "vitals"; hr?: number; spo2?: number; battery?: number }
  | { kind: "fall" }
  | { kind: "sos" }
  | { kind: "dose"; slot: Slot; status: DoseStatus }
  | { kind: "box"; online: boolean; tray?: string }
  | { kind: "band"; online: boolean }
  | { kind: "loadcell"; grams: number }
  | { kind: "dfplayer"; playing: boolean };

export function handleDeviceEvent(e: DeviceEvent) {
  const now = Date.now();
  switch (e.kind) {
    case "vitals": {
      // Ignore zero — means no finger on sensor
      const hr   = (e.hr   && e.hr   > 0) ? e.hr   : undefined;
      const spo2 = (e.spo2 && e.spo2 > 0) ? e.spo2 : undefined;

      setState((s) => ({
        ...s,
        readings: [...s.readings, { at: now, hr, spo2 }].slice(-500),
        devices: { ...s.devices, band: { online: true, battery: e.battery ?? s.devices.band.battery, lastSync: now } },
      }));

      const l = state.limits;
      if (hr   != null && (hr < l.hrMin || hr > l.hrMax))
        pushAlertThrottled("heart", `Abnormal heart rate: ${hr} bpm`, true);
      if (spo2 != null && spo2 < l.spo2Min)
        pushAlertThrottled("spo2", `Low blood oxygen: ${spo2}%`, true);
      break;
    }
    case "fall":
      setState((s) => ({ ...s, falls: [now, ...s.falls].slice(0, 50) })); // Keep only last 50 falls to prevent memory leaks
      pushAlertThrottled("fall", "Fall detected by band", true);
      break;
    case "sos":
      pushAlertThrottled("sos", "SOS button pressed by patient", true);
      break;
    case "dose":
      setState((s) => ({ ...s, doses: { ...s.doses, [e.slot]: e.status } }));
      if (e.status === "not_removed") pushAlert("dose", `${e.slot} dose not removed from tray`);
      break;
    case "box":
      setState((s) => ({ ...s, devices: { ...s.devices, box: { online: e.online, tray: e.tray, lastSync: now } } }));
      if (!e.online) pushAlertThrottled("offline", "Dispenser box went offline");
      break;
    case "band":
      setState((s) => ({ ...s, devices: { ...s.devices, band: { ...s.devices.band, online: e.online } } }));
      if (!e.online) pushAlertThrottled("offline", "Monitoring band went offline");
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
  if (s.falls.some((f) => f > week))
    return { level: "immediate", text: "A fall was detected this week. Arrange a medical examination as soon as possible." };
  const abnHr = recent.filter((r) => r.hr != null && (r.hr! < s.limits.hrMin || r.hr! > s.limits.hrMax)).length;
  const lowO2 = recent.filter((r) => r.spo2 != null && r.spo2! < s.limits.spo2Min).length;
  if (abnHr >= 5 || lowO2 >= 3)
    return { level: "immediate", text: "Repeated abnormal readings in the last 7 days. Consult a doctor today." };
  if (abnHr >= 2 || lowO2 >= 1)
    return { level: "soon", text: "Some readings were outside safe limits. Book a checkup within the next few days." };
  return null;
}

export function fmtTime(t?: number) {
  return t ? new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
}

// ─── MQTT ─────────────────────────────────────────────────────────────────────
// --- FIREBASE REALTIME DATABASE -----------------------------------------------
import { initFirebase, getFbDb } from "./firebaseClient";
import { ref, onValue, set, onDisconnect } from "firebase/database";
let boxWatchdog:  ReturnType<typeof setInterval> | null = null;
let bandWatchdog: ReturnType<typeof setInterval> | null = null;
let lastBoxMsg  = 0;
let lastBandMsg = 0;
const DEVICE_TIMEOUT_MS = 20_000;
function startWatchdogs() {
  if (boxWatchdog)  clearInterval(boxWatchdog);
  if (bandWatchdog) clearInterval(bandWatchdog);
  boxWatchdog = setInterval(() => {
    if (lastBoxMsg > 0 && Date.now() - lastBoxMsg > DEVICE_TIMEOUT_MS && state.devices.box.online) {
      setState((s) => ({ ...s, devices: { ...s.devices, box: { ...s.devices.box, online: false } } }));
      pushAlertThrottled("offline", "Dispenser box went offline");
    }
  }, 5000);
  bandWatchdog = setInterval(() => {
    if (lastBandMsg > 0 && Date.now() - lastBandMsg > DEVICE_TIMEOUT_MS && state.devices.band.online) {
      setState((s) => ({ ...s, devices: { ...s.devices, band: { ...s.devices.band, online: false } } }));
      pushAlertThrottled("offline", "Monitoring band went offline");
    }
  }, 5000);
}
function stopWatchdogs() {
  if (boxWatchdog)  { clearInterval(boxWatchdog);  boxWatchdog  = null; }
  if (bandWatchdog) { clearInterval(bandWatchdog); bandWatchdog = null; }
  lastBoxMsg  = 0;
  lastBandMsg = 0;
}
let bandListenerUnsub: (() => void) | null = null;
let boxListenerUnsub: (() => void) | null = null;
function firebaseConnect(apiKey: string, dbUrl: string, user: string, pass: string) {
  stopWatchdogs();
  if (!apiKey || !dbUrl) return;
  initFirebase(apiKey, dbUrl, user, pass).then((db) => {
    setState((s) => ({ ...s, mqtt: { ...s.mqtt, connected: true }, devices: { band: { ...s.devices.band, online: false }, box: { ...s.devices.box, online: false } } }));
    lastBoxMsg = 0; lastBandMsg = 0;
    if (bandListenerUnsub) bandListenerUnsub();
    bandListenerUnsub = onValue(ref(db, "devices/band"), (snap) => {
      const d = snap.val(); if (!d) return;
      lastBandMsg = Date.now();
      if (!state.devices.band.online) setState((s) => ({ ...s, devices: { ...s.devices, band: { ...s.devices.band, online: true, lastSync: Date.now() } } }));
      if (d.fallDetected) handleDeviceEvent({ kind: "fall" });
      if (d.sos) handleDeviceEvent({ kind: "sos" });
      if (d.heartRate != null) handleDeviceEvent({ kind: "vitals", hr: d.heartRate, spo2: 0 });
    });
    if (boxListenerUnsub) boxListenerUnsub();
    boxListenerUnsub = onValue(ref(db, "devices/box"), (snap) => {
      const d = snap.val(); if (!d) return;
      lastBoxMsg = Date.now();
      if (!state.devices.box.online) setState((s) => ({ ...s, devices: { ...s.devices, box: { ...s.devices.box, online: true, lastSync: Date.now() } } }));
      const slot = state.box.lastDispenseSlot ?? "morning";
      if (d.status === "DISPENSED") { handleDeviceEvent({ kind: "dose", slot, status: "dispensed" }); handleDeviceEvent({ kind: "dfplayer", playing: true }); }
      else if (d.status === "TAKEN" || d.status === "REMOVED") { handleDeviceEvent({ kind: "dose", slot, status: "removed" }); handleDeviceEvent({ kind: "loadcell", grams: 0 }); handleDeviceEvent({ kind: "dfplayer", playing: false }); }
      else if (d.status === "NOT_TAKEN") { handleDeviceEvent({ kind: "dose", slot, status: "not_removed" }); }
      if (d.loadCell != null) handleDeviceEvent({ kind: "loadcell", grams: d.loadCell });
    });
    startWatchdogs();
  }).catch(() => setState((s) => ({ ...s, mqtt: { ...s.mqtt, connected: false } })));
}
export function connectMqtt(apiKey: string, dummyPort: number, user: string, pass: string) {
  const dbUrl = String(dummyPort);
  saveCreds(apiKey, dummyPort, user, pass);
  setState((s) => ({ ...s, mqtt: { ...s.mqtt, broker: apiKey, port: dummyPort, user, pass } }));
  firebaseConnect(apiKey, dbUrl, user, pass);
}
export function disconnectMqtt() {
  stopWatchdogs();
  if (bandListenerUnsub) { bandListenerUnsub(); bandListenerUnsub = null; }
  if (boxListenerUnsub) { boxListenerUnsub(); boxListenerUnsub = null; }
  setState((s) => ({ ...s, mqtt: { ...s.mqtt, connected: false } }));
}
export function publishMqtt(topic: string, payload: string) {
  const db = getFbDb();
  if (!db) return;
  if (topic === "smartmed/box/command") set(ref(db, "devices/box/command"), payload);
}

const dispatchedToday = new Set<string>();

export function clearDispatchCache(slot?: Slot) {
  const todayKey = new Date().toISOString().slice(0, 10);
  if (slot) {
    dispatchedToday.delete(`${todayKey}-${slot}`);
  } else {
    dispatchedToday.delete(`${todayKey}-morning`);
    dispatchedToday.delete(`${todayKey}-afternoon`);
    dispatchedToday.delete(`${todayKey}-night`);
  }
}

export function manualDispense(slot: Slot) {
  if (!state.mqtt.connected) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  dispatchedToday.add(`${todayKey}-${slot}`);
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

  const resetKey = `reset-${todayKey}`;
  if (!dispatchedToday.has(resetKey)) {
    dispatchedToday.clear();
    dispatchedToday.add(resetKey);
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
      if (!missedFired[sl.id] && dispensedAt[sl.id] && now - dispensedAt[sl.id]! > MISSED_WINDOW_MS) {
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
