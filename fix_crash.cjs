
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

const oldCode = `        if (now - lastReminderAt[sl.id]! >= MISSED_WINDOW_MS) {
          lastReminderAt[sl.id] = now;
          if (status === "dispensed") {
            handleDeviceEvent({ kind: "dose", slot: sl.id, status: "not_removed" });
          }
          pushAlert("missed", \`Patient has not picked up their \${sl.label} dose!\`, true);
        }`;

const newCode = `        if (now - lastReminderAt[sl.id]! >= MISSED_WINDOW_MS) {
          lastReminderAt[sl.id] = now;
          if (status === "dispensed") {
            handleDeviceEvent({ kind: "dose", slot: sl.id, status: "not_removed" });
            // Only push the alert ONCE when it transitions to not_removed to prevent spam!
            pushAlert("dose", \`Patient has not picked up their \${sl.label} dose!\`, true);
          }
        }`;

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync("src/lib/store.ts", code);
    console.log("Fixed the alert crash and spam issue!");
} else {
    console.log("Could not find the block to replace.");
}

