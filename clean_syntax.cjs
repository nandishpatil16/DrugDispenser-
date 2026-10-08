
const fs = require("fs");
let code = fs.readFileSync("src/routes/index.tsx", "utf8");

// We want to completely replace the map function block to ensure it is pristine
const startStr = "{SLOTS.map((sl) => {";
const endStr = "</div>\n                  </div>\n                );\n              })}";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const perfectBlock = `{SLOTS.map((sl) => {
              const p = s.schedule[sl.id];
              const st = DOSE[s.doses[sl.id] ?? "scheduled"];
              
              const rowCls = st.tone === "ok" ? "bg-success/10 border border-success/30 shadow-sm shadow-success/10 rounded-xl px-4" : 
                             st.tone === "danger" ? "bg-destructive/10 border border-destructive/30 shadow-sm shadow-destructive/10 rounded-xl px-4" : 
                             st.tone === "primary" ? "bg-primary/10 border border-primary/30 shadow-sm shadow-primary/10 rounded-xl px-4" : "border border-transparent hover:bg-muted/30 rounded-xl px-4";
              
              return (
                <div key={sl.id} className={\`flex items-center gap-4 py-3 transition-all \${rowCls}\`}>
                  <span className="w-16 font-mono text-sm">{p.time}</span>
                  <div className="flex-1">
                    <p className="font-medium">{sl.label}</p>
                    <p className="text-xs text-muted-foreground">{p.enabled ? \`\${p.items.length} medicine(s) · \${slotTotalMg(s, sl.id)} mg total\` : "Disabled"}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <p className="mt-1 text-[11px] text-muted-foreground">{p.enabled ? \`\${slotTotalMg(s, sl.id)} mg\` : "Off"}</p>
                  </div>
                </div>
              );
            })}`;
    
    code = code.substring(0, startIdx) + perfectBlock + code.substring(endIdx + endStr.length);
    fs.writeFileSync("src/routes/index.tsx", code);
    console.log("Replaced perfectly!");
} else {
    console.log("Could not find the start or end index.");
}

