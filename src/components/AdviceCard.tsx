import { Stethoscope } from "lucide-react";
import { useStore, checkupAdvice } from "@/lib/store";
import { Card, Badge } from "./ui-kit";

export function AdviceCard() {
  const advice = useStore((s) => checkupAdvice(s));
  const doctor = useStore((s) => s.patient);
  return (
    <Card>
      <div className="flex items-center gap-2"><Stethoscope size={18} className="text-primary" /><h3 className="font-semibold">Checkup advice</h3></div>
      {advice ? (
        <div className="mt-3 space-y-2">
          <Badge tone={advice.level === "immediate" ? "danger" : "warn"}>{advice.level === "immediate" ? "Visit immediately" : "Visit soon"}</Badge>
          <p className="text-sm">{advice.text}</p>
          {doctor.doctorPhone && <a className="text-sm font-medium text-primary underline" href={`tel:${doctor.doctorPhone}`}>Call {doctor.doctor || "doctor"}</a>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No checkup needed right now. Suggestions appear automatically when band readings go outside the limits you set.</p>
      )}
    </Card>
  );
}
