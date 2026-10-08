
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

code = code.replace(
    /setState\(\(s\) => \(\{ \.\.\.s, box: \{ \.\.\.s\.box, lastDispenseSlot: slot \} \}\)\);\s*publishMqtt\("smartmed\/box\/command", `DISPENSE_\$\{slot\.toUpperCase\(\)\}`\);/,
    `setState((s) => ({ 
      ...s, 
      box: { ...s.box, lastDispenseSlot: slot, currentStatus: "DISPENSING" },
      doses: { ...s.doses, [slot]: "scheduled" } 
    }));
    publishMqtt("smartmed/box/command", \`DISPENSE_\${slot.toUpperCase()}\`);`
);

fs.writeFileSync("src/lib/store.ts", code);

