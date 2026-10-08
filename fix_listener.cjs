
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

const startCode = "const slot = state.box.lastDispenseSlot ?? \"morning\";";
const endCode = "if (d.loadCell != null) handleDeviceEvent({ kind: \"loadcell\", grams: d.loadCell });";

const startIdx = code.indexOf(startCode);
const endIdx = code.indexOf(endCode);

if (startIdx !== -1 && endIdx !== -1) {
    const newBlock = `const slot = state.box.lastDispenseSlot ?? "morning";
          
          setState((s) => ({ ...s, box: { ...s.box, currentStatus: d.status || "IDLE" } }));
          
          if (d.status === "DISPENSED") { 
            handleDeviceEvent({ kind: "dose", slot, status: "dispensed" }); 
          }
          else if (d.status === "TAKEN" || d.status === "REMOVED") { 
            handleDeviceEvent({ kind: "dose", slot, status: "removed" }); 
            handleDeviceEvent({ kind: "loadcell", grams: 0 });  
          }
          else if (d.status === "NOT_TAKEN" || d.status === "ERROR_EMPTY") { 
            handleDeviceEvent({ kind: "dose", slot, status: "not_removed" }); 
          }
          
          `;
    code = code.substring(0, startIdx) + newBlock + code.substring(endIdx);
    fs.writeFileSync("src/lib/store.ts", code);
    console.log("Fixed store listener perfectly!");
} else {
    console.log("Failed to find bounds.");
}

