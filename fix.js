const fs = require('fs');
let code = fs.readFileSync('src/routes/index.tsx', 'utf8');

const startTag = '<Card className="lg:col-span-2">';
const endTag = '</Card>';
const startIndex = code.indexOf(startTag);
const endIndex = code.indexOf(endTag, startIndex) + endTag.length;

if (startIndex !== -1 && endIndex !== -1) {
    const newBlock = \<Card className="lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-semibold">Tablet tray status</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Updated live from the load cell inside the dispenser box.</p>
          </div>
          {(() => {
            const status = s.box.currentStatus || "IDLE";
            const boxOnline = s.devices.box.online;

            let icon = "??";
            let label = "Empty / Scheduled";
            let sublabel = "Tray is clear and waiting for schedule";
            let bg = "bg-muted/40";
            let borderCls = "border-border";
            let labelColor = "text-muted-foreground";

            if (!boxOnline) {
              icon = "??"; label = "Offline"; sublabel = "No signal from Box";
            } else if (status === "DISPENSING") {
              icon = "??"; label = "Dispensing..."; sublabel = "Medicine is dropping now";
              bg = "bg-primary/20"; borderCls = "border-primary/50 animate-pulse"; labelColor = "text-primary";
            } else if (status === "DISPENSED" || status === "NOT_REMOVED") {
              icon = "??"; label = "Tablet Not Removed"; sublabel = "Waiting for patient to pick up (In Tray)";
              bg = "bg-destructive/[0.15]"; borderCls = "border-destructive/50 animate-pulse"; labelColor = "text-destructive";
            } else if (status === "TAKEN" || status === "REMOVED") {
              icon = "?"; label = "Tablet Removed"; sublabel = "Medicine was picked up";
              bg = "bg-success/10"; borderCls = "border-success/30"; labelColor = "text-success";
            }

            return (
              <div className={"flex flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center transition-colors " + bg + " " + borderCls}>
                <span className="text-5xl leading-none">{icon}</span>
                <div>
                  <p className={"text-xl font-bold " + labelColor}>{label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{sublabel}</p>
                </div>
              </div>
            );
          })()}
        </Card>\;
        
    code = code.substring(0, startIndex) + newBlock + code.substring(endIndex);
    fs.writeFileSync('src/routes/index.tsx', code);
    console.log('Successfully replaced Card block!');
}
