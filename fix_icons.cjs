
const fs = require("fs");
let code = fs.readFileSync("src/routes/index.tsx", "utf8");

// Update imports
code = code.replace(
  `import { Heart, Droplets, PersonStanding, RefreshCw, Cpu, AlertTriangle, ArrowRight, CalendarClock, Volume2, Stethoscope } from "lucide-react";`,
  `import { Heart, Droplets, PersonStanding, RefreshCw, Cpu, AlertTriangle, ArrowRight, CalendarClock, Volume2, Stethoscope, Inbox, WifiOff, Loader2, Pill, CheckCircle } from "lucide-react";`
);

// Replace Tray block
const oldBlockStart = "{/* Box tray + DFPlayer status */}";
const oldBlockEnd = "</Card>";
const startIdx = code.indexOf(oldBlockStart);
const endIdx = code.indexOf(oldBlockEnd, startIdx) + oldBlockEnd.length;

if (startIdx !== -1 && endIdx > startIdx) {
    const newBlock = `{/* Box tray status */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-semibold">Tablet tray status</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Updated live from the load cell inside the dispenser box.</p>
          </div>
          
          {(() => {
            const status = s.box.currentStatus || "IDLE";
            const boxOnline = s.devices.box.online;

            let icon = <Inbox size={56} className="text-muted-foreground opacity-50" />;
            let label = "Tray is Empty";
            let sublabel = "Waiting for the next scheduled dose";
            let bg = "bg-muted/40";
            let borderCls = "border-border";
            let labelColor = "text-muted-foreground";

            if (!boxOnline) {
              icon = <WifiOff size={56} className="text-muted-foreground opacity-50" />;
              label = "Box Offline";
              sublabel = "No signal from Dispenser Box";
            } else if (status === "DISPENSING") {
              icon = <Loader2 size={56} className="text-primary animate-spin" />;
              label = "Dispensing...";
              sublabel = "Medicine is dropping into the tray";
              bg = "bg-primary/10";
              borderCls = "border-primary/30";
              labelColor = "text-primary";
            } else if (status === "DISPENSED" || status === "NOT_REMOVED") {
              icon = <Pill size={56} className="text-destructive animate-pulse drop-shadow-md" />;
              label = "Tablet in Tray (Not Picked)";
              sublabel = "Patient has not taken their medicine yet!";
              bg = "bg-destructive/10";
              borderCls = "border-destructive/40 shadow-sm shadow-destructive/20";
              labelColor = "text-destructive";
            } else if (status === "TAKEN" || status === "REMOVED") {
              icon = <CheckCircle size={56} className="text-success drop-shadow-sm" />;
              label = "Tablet Taken";
              sublabel = "Patient successfully picked up their medicine!";
              bg = "bg-success/15";
              borderCls = "border-success/40 shadow-sm shadow-success/20";
              labelColor = "text-success";
            }

            return (
              <div className={"flex flex-col items-center justify-center gap-4 rounded-xl border py-10 px-6 text-center transition-all duration-500 " + bg + " " + borderCls}>
                {icon}
                <div>
                  <p className={"text-2xl font-bold tracking-tight " + labelColor}>{label}</p>
                  <p className="mt-1.5 text-sm font-medium text-muted-foreground">{sublabel}</p>
                </div>
              </div>
            );
          })()}
        </Card>`;

    code = code.substring(0, startIdx) + newBlock + code.substring(endIdx);
    fs.writeFileSync("src/routes/index.tsx", code);
    console.log("Updated tray UI successfully!");
} else {
    console.log("Failed to find replacement boundaries.");
}

