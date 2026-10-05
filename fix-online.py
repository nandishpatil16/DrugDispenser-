import sys

with open("src/lib/store.ts", "r", encoding="utf-8") as f:
    c = f.read()

s = c.find("bandListenerUnsub = onValue(ref(db, \"devices/band\"), (snap) => {")
e = c.find("startWatchdogs();", s)

new_code = """bandListenerUnsub = onValue(ref(db, "devices/band"), (snap) => {
        const d = snap.val(); if (!d) return;
        lastBandMsg = Date.now();
        const isOnline = d.online !== false;
        if (state.devices.band.online !== isOnline) {
          setState((s) => ({ ...s, devices: { ...s.devices, band: { ...s.devices.band, online: isOnline, lastSync: Date.now() } } }));
          if (!isOnline) pushAlertThrottled("offline", "Monitoring band went offline");
        }
        if (d.fallDetected) handleDeviceEvent({ kind: "fall" });
        if (d.sos) handleDeviceEvent({ kind: "sos" });
        if (d.heartRate != null) handleDeviceEvent({ kind: "vitals", hr: d.heartRate, spo2: 0 });
      }, (err) => {
        setState(s => ({ ...s, firebaseError: `Firebase cannot read devices/band: ${err.message}`, isConnecting: false, mqtt: { ...s.mqtt, connected: false } }));
      });
      boxListenerUnsub = onValue(ref(db, "devices/box"), (snap) => {
        const d = snap.val(); if (!d) return;
        lastBoxMsg = Date.now();
        const isOnline = d.online !== false;
        if (state.devices.box.online !== isOnline) {
          setState((s) => ({ ...s, devices: { ...s.devices, box: { ...s.devices.box, online: isOnline, lastSync: Date.now() } } }));
          if (!isOnline) pushAlertThrottled("offline", "Dispenser box went offline");
        }
        const slot = state.box.lastDispenseSlot ?? "morning";
        if (d.status === "DISPENSED") { handleDeviceEvent({ kind: "dose", slot, status: "dispensed" }); handleDeviceEvent({ kind: "dfplayer", playing: true }); }
        else if (d.status === "TAKEN" || d.status === "REMOVED") { handleDeviceEvent({ kind: "dose", slot, status: "removed" }); handleDeviceEvent({ kind: "loadcell", grams: 0 }); handleDeviceEvent({ kind: "dfplayer", playing: false }); }
        else if (d.status === "NOT_TAKEN") { handleDeviceEvent({ kind: "dose", slot, status: "not_removed" }); }
        if (d.loadCell != null) handleDeviceEvent({ kind: "loadcell", grams: d.loadCell });
      }, (err) => {
        setState(s => ({ ...s, firebaseError: `Firebase cannot read devices/box: ${err.message}`, isConnecting: false, mqtt: { ...s.mqtt, connected: false } }));
      });
      """

c = c[:s] + new_code + c[e:]

with open("src/lib/store.ts", "w", encoding="utf-8") as f:
    f.write(c)
print("Done")
