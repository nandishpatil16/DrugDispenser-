
const fs = require("fs");

// 1. Fix store.ts
let storeCode = fs.readFileSync("src/lib/store.ts", "utf8");
const oldStoreBlock = `          if (d.status === "DISPENSED") {   }
          else if (d.status === "TAKEN" || d.status === "REMOVED") { handleDeviceEvent({ kind: "dose", slot, status: "removed" }); handleDeviceEvent({ kind: "loadcell", grams: 0 });  }
          else if (d.status === "NOT_TAKEN") { handleDeviceEvent({ kind: "dose", slot, status: "not_removed" }); }`;

const newStoreBlock = `          setState((s) => ({ ...s, box: { ...s.box, currentStatus: d.status || "IDLE" } }));
          if (d.status === "DISPENSED") { handleDeviceEvent({ kind: "dose", slot, status: "dispensed" }); }
          else if (d.status === "TAKEN" || d.status === "REMOVED") { handleDeviceEvent({ kind: "dose", slot, status: "removed" }); handleDeviceEvent({ kind: "loadcell", grams: 0 });  }
          else if (d.status === "NOT_TAKEN") { handleDeviceEvent({ kind: "dose", slot, status: "not_removed" }); }`;

if (storeCode.includes(`if (d.status === "DISPENSED") {   }`)) {
    storeCode = storeCode.replace(oldStoreBlock, newStoreBlock);
    fs.writeFileSync("src/lib/store.ts", storeCode);
    console.log("store.ts fixed successfully!");
} else {
    console.log("Could not find the block in store.ts!");
}

// 2. Fix index.tsx
let indexCode = fs.readFileSync("src/routes/index.tsx", "utf8");
const oldItemBlock = `return (
                  <div key={sl.id} className="flex items-center gap-4 py-3">`;

const newItemBlock = `const rowCls = st.tone === "ok" ? "bg-success/5 border-success/30 shadow-sm shadow-success/10" : 
                                   st.tone === "danger" ? "bg-destructive/5 border-destructive/30 shadow-sm shadow-destructive/10" : 
                                   st.tone === "primary" ? "bg-primary/5 border-primary/30 shadow-sm shadow-primary/10" : "border-transparent hover:bg-muted/30";
                return (
                  <div key={sl.id} className={\`flex items-center gap-4 py-3 px-3 rounded-xl border transition-all \${rowCls}\`}>`;

if (indexCode.includes(oldItemBlock)) {
    indexCode = indexCode.replace(oldItemBlock, newItemBlock);
    fs.writeFileSync("src/routes/index.tsx", indexCode);
    console.log("index.tsx fixed successfully!");
} else {
    console.log("Could not find the block in index.tsx!");
}

