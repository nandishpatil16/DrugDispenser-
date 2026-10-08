
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

const oldWatchdog = `const MISSED_WINDOW_MS = 5 * 60 * 1000;
  const dispensedAt: Partial<Record<Slot, number>> = {};
  const lastReminderAt: Partial<Record<Slot, number>> = {};
  
  function checkMissedDoses() {
    const now = Date.now();
    SLOTS.forEach((sl) => {
      const status = state.doses[sl.id];
      if (status === "dispensed" || status === "not_removed") {
        if (!dispensedAt[sl.id]) {
          dispensedAt[sl.id] = now;
          lastReminderAt[sl.id] = now;
        }
        if (now - lastReminderAt[sl.id]! >= MISSED_WINDOW_MS) {
          lastReminderAt[sl.id] = now;
          if (status === "dispensed") {
            handleDeviceEvent({ kind: "dose", slot: sl.id, status: "not_removed" });
          }
          pushAlert("missed", \`Patient has not picked up their \${sl.label} dose!\`, true);
        }
      } else {
        dispensedAt[sl.id] = undefined;
        lastReminderAt[sl.id] = undefined;
      }
    });
  }`;

const newWatchdog = `const MISSED_WINDOW_MS = 5 * 60 * 1000;
  let trayDispensedAt = 0;
  let trayLastReminderAt = 0;
  
  function checkMissedDoses() {
    const now = Date.now();
    const status = state.box.currentStatus;
    
    if (status === "DISPENSED" || status === "NOT_REMOVED") {
      if (!trayDispensedAt) {
        trayDispensedAt = now;
        trayLastReminderAt = now;
      }
      if (now - trayLastReminderAt >= MISSED_WINDOW_MS) {
        trayLastReminderAt = now;
        pushAlert("missed", \`Patient has not picked up their medicine from the tray!\`, true);
      }
    } else {
      trayDispensedAt = 0;
      trayLastReminderAt = 0;
    }
  }`;

if (code.includes("const dispensedAt: Partial")) {
    code = code.replace(oldWatchdog, newWatchdog);
    fs.writeFileSync("src/lib/store.ts", code);
    console.log("Watchdog fixed!");
} else {
    console.log("Could not find watchdog block to replace.");
}

