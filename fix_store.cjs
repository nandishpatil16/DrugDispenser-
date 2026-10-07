
const fs = require("fs");

// 1. Fix store.ts
let storeCode = fs.readFileSync("src/lib/store.ts", "utf8");
// Make sure currentStatus is added to box initial state
storeCode = storeCode.replace("dfplaying: false, lastDispenseSlot: null }", "dfplaying: false, lastDispenseSlot: null, currentStatus: \"IDLE\" }");
// Make sure type is added
storeCode = storeCode.replace("dfplaying: boolean; lastDispenseSlot: Slot | null };", "dfplaying: boolean; lastDispenseSlot: Slot | null; currentStatus?: string; };");

// Fix the listener
const oldListenerBlock = `
          if (d.status === "DISPENSED") {   }
          else if (d.status === "TAKEN" || d.status === "REMOVED") { handleDeviceEvent({ kind: "dose", slot, status: "removed" }); handleDeviceEvent({ kind: "loadcell", grams: 0 });  }
          else if (d.status === "NOT_TAKEN") { handleDeviceEvent({ kind: "dose", slot, status: "not_removed" }); }
`;
const newListenerBlock = `
          setState((s) => ({ ...s, box: { ...s.box, currentStatus: d.status || "IDLE" } }));
`;

if (storeCode.includes(`if (d.status === "DISPENSED")`)) {
    storeCode = storeCode.replace(oldListenerBlock, newListenerBlock);
} else if (!storeCode.includes(`currentStatus: d.status`)) {
    storeCode = storeCode.replace(
      `if (d.loadCell != null) handleDeviceEvent({ kind: "loadcell", grams: d.loadCell });`,
      `setState((s) => ({ ...s, box: { ...s.box, currentStatus: d.status || "IDLE" } }));\n          if (d.loadCell != null) handleDeviceEvent({ kind: "loadcell", grams: d.loadCell });`
    );
}
fs.writeFileSync("src/lib/store.ts", storeCode);


// 2. Fix index.tsx emojis (?? -> proper icons or SVG or just standard ascii for safety)
let indexCode = fs.readFileSync("src/routes/index.tsx", "utf8");
indexCode = indexCode.replace(/let icon = ".*";/, "let icon = \"?\";"); // Default empty
indexCode = indexCode.replace(/icon = ".*"; label = "Offline";/, "icon = \"?\"; label = \"Offline\";");
indexCode = indexCode.replace(/icon = ".*"; label = "Dispensing\.\.\.";/, "icon = \"?\"; label = \"Dispensing...\";");
indexCode = indexCode.replace(/icon = ".*"; label = "Tablet Not Removed";/, "icon = \"??\"; label = \"Tablet Not Removed\";");
indexCode = indexCode.replace(/icon = ".*"; label = "Tablet Removed";/, "icon = \"?\"; label = \"Tablet Removed\";");

fs.writeFileSync("src/routes/index.tsx", indexCode);
console.log("Fixed store and index");

