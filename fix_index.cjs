
const fs = require("fs");
let indexCode = fs.readFileSync("src/routes/index.tsx", "utf8");

const oldItemBlock = `<div key={sl.id} className="flex items-center gap-4 py-3">`;

const newItemBlock = `const rowCls = st.tone === "ok" ? "bg-success/10 border border-success/30 shadow-sm shadow-success/10 rounded-xl px-4" : 
                                   st.tone === "danger" ? "bg-destructive/10 border border-destructive/30 shadow-sm shadow-destructive/10 rounded-xl px-4" : 
                                   st.tone === "primary" ? "bg-primary/10 border border-primary/30 shadow-sm shadow-primary/10 rounded-xl px-4" : "border border-transparent hover:bg-muted/30 rounded-xl px-4";
                return (
                  <div key={sl.id} className={\`flex items-center gap-4 py-3 transition-all \${rowCls}\`}>`;

if (indexCode.includes(oldItemBlock)) {
    indexCode = indexCode.replace(oldItemBlock, newItemBlock);
    
    // Also remove the divide-y from the container to avoid double lines now that they are cards
    indexCode = indexCode.replace(`<div className="divide-y">`, `<div className="flex flex-col gap-2">`);
    
    fs.writeFileSync("src/routes/index.tsx", indexCode);
    console.log("index.tsx fixed successfully!");
} else {
    console.log("Could not find the block in index.tsx!");
}

