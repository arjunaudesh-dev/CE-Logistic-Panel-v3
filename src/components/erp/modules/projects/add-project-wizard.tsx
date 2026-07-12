"use client";
import { useState } from "react";
import { apiRequest } from "@/lib/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PROJECT_STATUSES, REFERENCE_TYPES, FILE_CATEGORIES } from "@/lib/constants";
import { EstimateItemsTable } from "./estimate-items";
import {
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  FileSpreadsheet,
  Sparkles,
  Check,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EstimateRow {
  itemName: string;
  qty: string;
  unit: string;
  estimateCost: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (project: { id: string; name: string; voteNumber: string; voteAllocation: number; committed: number; actualSpent: number; benefactor: string | null; reference: string | null; endDate: string | null; startDate: string | null }) => void;
}

export function AddProjectWizard({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [createdEstimateId, setCreatedEstimateId] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    voteNumber: "",
    voteAllocation: "",
    committed: "0",
    actualSpent: "0",
    startDate: "",
    endDate: "", // EDC
    benefactor: "", // replaces Department
    reference: "AOR",
    projectOfficer: "",
    status: "Active",
    description: "",
  });
  const [estimateRows, setEstimateRows] = useState<EstimateRow[]>([
    { itemName: "", qty: "", unit: "NOS", estimateCost: "" },
  ]);

  const addRow = () =>
    setEstimateRows([...estimateRows, { itemName: "", qty: "", unit: "NOS", estimateCost: "" }]);
  const removeRow = (idx: number) =>
    setEstimateRows(estimateRows.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: keyof EstimateRow, value: string) =>
    setEstimateRows(estimateRows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const handleSaveAndProcess = async () => {
    if (!form.name || !form.voteNumber) {
      toast({ title: "Project Name and Vote Number are required", variant: "destructive" });
      return;
    }
    const validRows = estimateRows.filter((r) => r.itemName.trim());
    if (validRows.length === 0) {
      toast({ title: "Add at least one material estimate item", variant: "destructive" });
      return;
    }
    setSaving(true);
    // 1. Create project
    const projRes = await apiRequest("/api/projects", "POST", form);
    if (!projRes.ok) {
      setSaving(false);
      toast({ title: "Failed to create project", description: projRes.error, variant: "destructive" });
      return;
    }
    const project = projRes.data as { id: string };
    // 2. Export Estimate into DB
    const estRes = await apiRequest("/api/estimates", "POST", {
      projectId: project.id,
      name: `${form.name} — Material Estimate`,
      items: validRows.map((r) => ({
        itemName: r.itemName,
        qty: Number(r.qty) || 0,
        unit: r.unit,
        estimateCost: Number(r.estimateCost) || 0,
      })),
    });
    setSaving(false);
    if (estRes.ok) {
      const est = estRes.data as { id: string };
      setCreatedProjectId(project.id);
      setCreatedEstimateId(est.id);
      setStep(2);
      toast({ title: "Project & estimate saved", description: "Now process the estimate with AI (Step 2)" });
    } else {
      toast({ title: "Estimate save failed", description: estRes.error, variant: "destructive" });
    }
  };

  const handleGoToProject = () => {
    if (createdProjectId) {
      onCreated({
        id: createdProjectId,
        name: form.name,
        voteNumber: form.voteNumber,
        voteAllocation: Number(form.voteAllocation) || 0,
        committed: Number(form.committed) || 0,
        actualSpent: Number(form.actualSpent) || 0,
        benefactor: form.benefactor || null,
        reference: form.reference || null,
        endDate: form.endDate || null,
        startDate: form.startDate || null,
      });
      // reset
      setStep(1);
      setCreatedProjectId(null);
      setCreatedEstimateId(null);
      setForm({
        name: "", voteNumber: "", voteAllocation: "", committed: "0", actualSpent: "0",
        startDate: "", endDate: "", benefactor: "", reference: "AOR",
        projectOfficer: "", status: "Active", description: "",
      });
      setEstimateRows([{ itemName: "", qty: "", unit: "NOS", estimateCost: "" }]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-semibold text-foreground text-sm sm:text-base">
            Add New Project — {step === 1 ? "Step 1: Details & Material Estimate" : "Step 2: Processed Estimate (AI)"}
          </h2>
        </div>
        {/* Stepper */}
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <StepBadge n={1} active={step === 1} done={step > 1} label="Details + Estimate" />
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <StepBadge n={2} active={step === 2} done={false} label="AI Processing" />
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <StepBadge n={3} active={false} done={false} label="Project Window" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {step === 1 && (
          <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Project details */}
            <section className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Project Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Project Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dockyard Refit 2025" className="bg-background border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Vote Number *</Label>
                  <Input value={form.voteNumber} onChange={(e) => setForm({ ...form, voteNumber: e.target.value })} placeholder="e.g. V-2025-001" className="bg-background border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Reference (Type)</Label>
                  <Select value={form.reference} onValueChange={(v) => setForm({ ...form, reference: v })}>
                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REFERENCE_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Vote Allocation (Rs.)</Label>
                  <Input type="number" value={form.voteAllocation} onChange={(e) => setForm({ ...form, voteAllocation: e.target.value })} placeholder="0" className="bg-background border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Benefactor</Label>
                  <Input value={form.benefactor} onChange={(e) => setForm({ ...form, benefactor: e.target.value })} placeholder="e.g. Engineering Dept" className="bg-background border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="bg-background border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>EDC (Estimated Date of Completion)</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="bg-background border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Project Officer</Label>
                  <Input value={form.projectOfficer} onChange={(e) => setForm({ ...form, projectOfficer: e.target.value })} placeholder="e.g. Cdr. R. Perera" className="bg-background border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Brief description..." className="bg-background border-border" />
                </div>
              </div>
            </section>

            {/* Material Estimate */}
            <section className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" /> Material Estimate
                </h3>
                <Button onClick={addRow} size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Row
                </Button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_90px_120px_40px] gap-2 px-3 py-2 bg-secondary/40 text-xs text-muted-foreground uppercase">
                  <span>Item Name</span>
                  <span className="text-right">Qty</span>
                  <span>Deno</span>
                  <span className="text-right">Est. Cost (Rs.)</span>
                  <span></span>
                </div>
                <div className="divide-y divide-border">
                  {estimateRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_90px_120px_40px] gap-2 px-3 py-2 items-center">
                      <Input value={row.itemName} onChange={(e) => updateRow(idx, "itemName", e.target.value)} placeholder="e.g. Centrifugal Pump 15kW" className="bg-background border-border h-8 text-sm" />
                      <Input type="number" value={row.qty} onChange={(e) => updateRow(idx, "qty", e.target.value)} placeholder="0" className="bg-background border-border h-8 text-sm text-right" />
                      <Select value={row.unit} onValueChange={(v) => updateRow(idx, "unit", v)}>
                        <SelectTrigger className="bg-background border-border h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["NOS", "KG", "MTR", "LTR", "SHT", "SET", "BAG", "PR"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="number" value={row.estimateCost} onChange={(e) => updateRow(idx, "estimateCost", e.target.value)} placeholder="0" className="bg-background border-border h-8 text-sm text-right" />
                      <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-red-400 flex items-center justify-center">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Tip: Estimate cost is per-unit. After saving, Step 2 will process these items with AI to match RC list & inventory.
              </p>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-background/80 backdrop-blur py-3 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-border">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSaveAndProcess} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Export Estimate & Process (Step 2)
              </Button>
            </div>
          </div>
        )}

        {step === 2 && createdEstimateId && (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Processed Estimate — AI Matched Items
                </h3>
                <p className="text-xs text-muted-foreground">
                  Review matched items, then "Initiate File" to raise PRs. Initiated files forward to the Project Window.
                </p>
              </div>
              <EstimateItemsTable
                estimateId={createdEstimateId}
                showProcessButton
              />
            </div>

            <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-background/80 backdrop-blur py-3 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-border">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back to Details
              </Button>
              <Button onClick={handleGoToProject} className="gap-1.5">
                Go to Project Window (Step 3) <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepBadge({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1 rounded-md",
      active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"
    )}>
      <span className={cn(
        "h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold",
        active ? "bg-primary-foreground text-primary" : done ? "bg-emerald-500 text-white" : "bg-muted-foreground/30"
      )}>
        {done ? <Check className="h-2.5 w-2.5" /> : n}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
