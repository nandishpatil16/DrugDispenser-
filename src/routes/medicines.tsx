import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pill, Pencil, Trash2, Plus } from "lucide-react";
import { useStore, setState, uid, type Medicine } from "@/lib/store";
import { Card, PageHeader, Button, Field, inputCls, Empty, Badge } from "@/components/ui-kit";

export const Route = createFileRoute("/medicines")({
  head: () => ({
    meta: [
      { title: "Medicines — SmartDose Caregiver" },
      { name: "description", content: "Manage tablets loaded into the dispenser: strength, compartment and stock." },
      { property: "og:title", content: "Medicines — SmartDose Caregiver" },
      { property: "og:description", content: "Manage tablets loaded into the dispenser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Medicines,
});

const blank = { name: "", mg: "", compartment: "", stock: "", notes: "" };

function Medicines() {
  const meds = useStore((s) => s.medicines);
  const [f, setF] = useState(blank);
  const [edit, setEdit] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !Number(f.mg)) return;
    const m: Medicine = { id: edit ?? uid(), name: f.name.trim(), mg: Number(f.mg), compartment: f.compartment, stock: Number(f.stock) || 0, notes: f.notes };
    setState((s) => ({ ...s, medicines: edit ? s.medicines.map((x) => (x.id === edit ? m : x)) : [...s.medicines, m] }));
    setF(blank); setEdit(null);
  };
  const del = (id: string) => setState((s) => ({
    ...s,
    medicines: s.medicines.filter((x) => x.id !== id),
    schedule: Object.fromEntries(Object.entries(s.schedule).map(([k, v]) => [k, { ...v, items: v.items.filter((i) => i.medId !== id) }])) as typeof s.schedule,
  }));

  return (
    <>
      <PageHeader title="Medicines" sub="Tablets loaded into the dispenser box." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mb-4 font-semibold">{edit ? "Edit tablet" : "Add tablet"}</h3>
          <form onSubmit={save} className="space-y-3">
            <Field label="Medicine name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="mg per tablet"><input type="number" step="any" min={0} className={inputCls} value={f.mg} onChange={(e) => setF({ ...f, mg: e.target.value })} required /></Field>
              <Field label="Compartment"><input className={inputCls} placeholder="e.g. A1" value={f.compartment} onChange={(e) => setF({ ...f, compartment: e.target.value })} /></Field>
            </div>
            <Field label="Tablets in stock"><input type="number" min={0} className={inputCls} value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></Field>
            <Field label="Notes"><textarea rows={2} className={inputCls} placeholder="e.g. after food" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1"><Plus size={16} /> {edit ? "Save changes" : "Add tablet"}</Button>
              {edit && <Button type="button" variant="outline" onClick={() => { setEdit(null); setF(blank); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Loaded tablets</h3>
          {meds.length === 0 ? <Empty icon={<Pill />} title="No tablets added" text="Add the medicines you load into the box, with their strength in mg." /> : (
            <div className="divide-y">
              {meds.map((m) => (
                <div key={m.id} className="flex items-center gap-4 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 font-mono text-xs text-primary">{m.compartment || "—"}</div>
                  <div className="flex-1">
                    <p className="font-medium">{m.name} <span className="font-mono text-sm text-muted-foreground">{m.mg} mg</span></p>
                    <p className="text-xs text-muted-foreground">{m.notes || "No notes"}</p>
                  </div>
                  <Badge tone={m.stock <= 5 ? "danger" : "ok"}>{m.stock} left</Badge>
                   <Button aria-label="Edit tablet" variant="ghost" onClick={() => { setEdit(m.id); setF({ name: m.name, mg: String(m.mg), compartment: m.compartment, stock: String(m.stock), notes: m.notes }); }} className="h-10 min-h-0 w-10 p-0 text-muted-foreground hover:text-primary"><Pencil size={16} /></Button>
                   <Button aria-label="Delete tablet" variant="ghost" onClick={() => del(m.id)} className="h-10 min-h-0 w-10 p-0 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
