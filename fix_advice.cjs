
const fs = require("fs");
let code = fs.readFileSync("src/components/AdviceCard.tsx", "utf8");

const oldCode = `      {advice ? (
        <div className="mt-3 space-y-2">
          <Badge tone={advice.level === "immediate" ? "danger" : "warn"}>{advice.level === "immediate" ? "Visit immediately" : "Visit soon"}</Badge>
          <p className="text-sm">{advice.text}</p>
          {doctor.doctorPhone && <a className="text-sm font-medium text-primary underline" href={\`tel:\${doctor.doctorPhone}\`}>Call {doctor.doctor || "doctor"}</a>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No checkup needed right now. Suggestions appear automatically when band readings go outside the limits you set.</p>
      )}`;

const newCode = `      <div className="mt-3 space-y-4">
        {s.checkup.nextDate && (
          <div className="space-y-1">
            <Badge tone="ok">Scheduled Appointment</Badge>
            <p className="text-sm font-medium mt-1">
              {new Date(s.checkup.nextDate).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
            </p>
            {s.checkup.doctor && <p className="text-sm text-muted-foreground">{s.checkup.doctor}</p>}
            {s.checkup.notes && <p className="text-sm text-muted-foreground">{s.checkup.notes}</p>}
          </div>
        )}
        
        {advice && (
          <div className="space-y-1 pt-2 border-t">
            <Badge tone={advice.level === "immediate" ? "danger" : "warn"}>{advice.level === "immediate" ? "Visit immediately" : "Visit soon"}</Badge>
            <p className="text-sm mt-1">{advice.text}</p>
            {doctor.doctorPhone && <a className="text-sm font-medium text-primary underline" href={\`tel:\${doctor.doctorPhone}\`}>Call {doctor.doctor || "doctor"}</a>}
          </div>
        )}
        
        {!s.checkup.nextDate && !advice && (
          <p className="text-sm text-muted-foreground">No checkup scheduled. Suggestions appear automatically when band readings go outside limits.</p>
        )}
      </div>`;

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync("src/components/AdviceCard.tsx", code);
    console.log("AdviceCard fixed!");
} else {
    console.log("Could not find old code in AdviceCard.");
}

