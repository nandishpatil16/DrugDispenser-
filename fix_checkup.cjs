
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

const checkCheckupCode = `
let lastCheckupAlert = 0;
function checkCheckup() {
  const { nextDate, doctor } = state.checkup;
  if (!nextDate) return;
  
  const aptTime = new Date(nextDate).getTime();
  const now = Date.now();
  
  // Alert if appointment is in the next 24 hours
  // To avoid spamming, only alert once a day max
  if (aptTime - now > 0 && aptTime - now <= 24 * 60 * 60 * 1000) {
    if (now - lastCheckupAlert > 24 * 60 * 60 * 1000) {
      lastCheckupAlert = now;
      pushAlert("dose", \`Reminder: Checkup scheduled with \${doctor || "doctor"} tomorrow!\`);
    }
  } 
  // Alert if appointment is exactly today/now (within 1 hour)
  else if (now - aptTime >= 0 && now - aptTime <= 60 * 60 * 1000) {
     if (now - lastCheckupAlert > 6 * 60 * 60 * 1000) { // re-alert if we havent alerted in 6 hrs
       lastCheckupAlert = now;
       pushAlert("dose", \`Reminder: Checkup scheduled with \${doctor || "doctor"} is happening now!\`);
     }
  }
}
`;

// Insert it right before the window setIntervals
code = code.replace(/if \(typeof window !== "undefined"\) \{/g, checkCheckupCode + "\nif (typeof window !== \"undefined\") {");

// Add the interval call
code = code.replace(/setInterval\(checkMissedDoses, 60_000\);/g, "setInterval(checkMissedDoses, 60_000);\n    setInterval(checkCheckup, 60_000);");

fs.writeFileSync("src/lib/store.ts", code);

