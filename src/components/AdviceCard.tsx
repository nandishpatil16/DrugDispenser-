import { Stethoscope } from "lucide-react";
import { useStore, checkupAdvice } from "@/lib/store";
import { Card, Badge } from "./ui-kit";

export function AdviceCard() {
  const s = useStore((s) => s);
  const advice = checkupAdvice(s);
  const doctor = s.patient;
  return (
    <Card>
      <div className="flex items-center gap-2"><Stethoscope size={18} className="text-primary" /><h3 className="font-semibold">Checkup advice</h3></div>
      <div className="mt-3 space-y-4">
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
            {doctor.doctorPhone && <a className="text-sm font-medium text-primary underline" href={`tel:${doctor.doctorPhone}`}>Call {doctor.doctor || "doctor"}</a>}
          </div>
        )}
        
        {!s.checkup.nextDate && !advice && (
          <p className="text-sm text-muted-foreground">No checkup scheduled. Suggestions appear automatically when band readings go outside limits.</p>
        )}
      </div>
    </Card>
  );
}

