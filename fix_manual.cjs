
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

const oldCode = `    setState((s) => ({ ...s, box: { ...s.box, lastDispenseSlot: slot } }));
    publishMqtt("smartmed/box/command", \`DISPENSE_\${slot.toUpperCase()}\`);`;

const newCode = `    setState((s) => ({ 
      ...s, 
      box: { ...s.box, lastDispenseSlot: slot, currentStatus: "DISPENSING" },
      doses: { ...s.doses, [slot]: "scheduled" } 
    }));
    publishMqtt("smartmed/box/command", \`DISPENSE_\${slot.toUpperCase()}\`);`;

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync("src/lib/store.ts", code);
    console.log("Fixed manualDispense!");
} else {
    console.log("Could not find oldCode!");
}

