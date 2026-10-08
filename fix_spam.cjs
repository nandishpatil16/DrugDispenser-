
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

// We need to replace pushAlert("missed" with pushAlert("dose"
code = code.replace(/pushAlert\("missed",/g, `pushAlert("dose",`);

// We need to stop it from spamming every 5 minutes by setting the reminder way into the future
// The exact line is "lastReminderAt[sl.id] = now;" inside the if (now - lastReminderAt[sl.id]! >= MISSED_WINDOW_MS)
const badLine = `lastReminderAt[sl.id] = now;
          if (status === "dispensed") {
            handleDeviceEvent({ kind: "dose", slot: sl.id, status: "not_removed" });`;

const goodLine = `lastReminderAt[sl.id] = 9999999999999; // Set far into the future so it only alerts ONCE
          if (status === "dispensed") {
            handleDeviceEvent({ kind: "dose", slot: sl.id, status: "not_removed" });`;

if (code.includes(badLine)) {
    code = code.replace(badLine, goodLine);
    fs.writeFileSync("src/lib/store.ts", code);
    console.log("Fixed spam and crash!");
} else {
    // If exact match fails, use regex
    const regex = /lastReminderAt\[sl\.id\] = now;\s*if \(status === "dispensed"\) \{/g;
    code = code.replace(regex, `lastReminderAt[sl.id] = 9999999999999;\n          if (status === "dispensed") {`);
    fs.writeFileSync("src/lib/store.ts", code);
    console.log("Fixed spam and crash with regex!");
}

