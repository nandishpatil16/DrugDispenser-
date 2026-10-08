
const fs = require("fs");
let code = fs.readFileSync("src/routes/index.tsx", "utf8");

code = code.replace(
    /<div className="divide-y">\s*\{SLOTS\.map\(\(sl\) => \{\s*const p = s\.schedule\[sl\.id\];\s*const st = DOSE\[s\.doses\[sl\.id\] \?\? "scheduled"\];\s*return \(\s*<div key=\{sl\.id\} className="flex items-center gap-4 py-3">/g,
    `<div className="flex flex-col gap-2">
              {SLOTS.map((sl) => {
                const p = s.schedule[sl.id];
                const st = DOSE[s.doses[sl.id] ?? "scheduled"];
                const rowCls = st.tone === "ok" ? "bg-success/5 border-success/30 shadow-sm shadow-success/10 rounded-xl px-4" : 
                               st.tone === "danger" ? "bg-destructive/5 border-destructive/30 shadow-sm shadow-destructive/10 rounded-xl px-4" : 
                               st.tone === "primary" ? "bg-primary/5 border-primary/30 shadow-sm shadow-primary/10 rounded-xl px-4" : "border-transparent hover:bg-muted/30 rounded-xl px-4";
                return (
                  <div key={sl.id} className={\`flex items-center gap-4 py-3 border transition-all \${rowCls}\`}>`
);

fs.writeFileSync("src/routes/index.tsx", code);

