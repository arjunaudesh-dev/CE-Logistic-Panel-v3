"use client";
import { useState, useRef, useMemo } from "react";
import { apiRequest, useFetch } from "@/lib/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomBadge } from "@/components/erp/badges";
import { useToast } from "@/hooks/use-toast";
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  projectTypeColor,
  financialMeanColor,
  voteTypeColor,
  formatCurrency,
} from "@/lib/constants";
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
  Download,
  Upload,
  Info,
  Vote,
  Pencil,
  ChevronLeft,
  ChevronDown,
  Landmark,
  Wallet,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Fund options available when the "Funds" checkbox is ticked (non-vote funding).
const FUND_OPTIONS = ["Malima Fund", "Non-Public Fund", "Contractual"] as const;

interface Vote {
  id: string;
  voteNumber: string;
  description: string;
  voteType: string;
  allocation: number;
  financialYear: string | null;
  active: boolean;
}

// Minimal project shape — only the fields we need to derive the list of
// existing Maintenance requirement groups for the combobox suggestions.
interface ExistingProject {
  id: string;
  projectType?: string | null;
  requirementGroup?: string | null;
}

interface EstimateRow {
  itemName: string;
  qty: string;
  unit: string;
  /** Per-unit cost (renamed from "estimateCost" in earlier versions).
   *  The CSV column header is `UnitCost`; the parser also accepts the legacy
   *  `EstimateCost` header for backward compatibility. The API field name stays
   *  `estimateCost` but it represents the per-unit cost. */
  estimateCost: string;
  /** Total cost for the row — from CSV's TotalCost column when present,
   *  otherwise computed as Qty × UnitCost. Stored on the row so the
   *  CSV-supplied value is preserved until the user edits Qty/UnitCost
   *  (which auto-recomputes the total). Used for display only — the API still
   *  stores estimateCost as the per-unit cost. */
  totalCost: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (project: { id: string; name: string; nameAbbreviation: string | null; voteNumber: string; voteAllocation: number; committed: number; actualSpent: number; benefactor: string | null; reference: string | null; endDate: string | null; startDate: string | null; projectType: string; financialMean: string | null; requirementGroup: string | null }) => void;
}

const UNITS = ["NOS", "KG", "MTR", "LTR", "SHT", "SET", "BAG", "PR"];

export function AddProjectWizard({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [createdEstimateId, setCreatedEstimateId] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewRows, setPreviewRows] = useState<EstimateRow[] | null>(null);
  const [customVoteNumber, setCustomVoteNumber] = useState(false);
  const [selectedVoteId, setSelectedVoteId] = useState("");
  // "Funds" checkbox state — when ticked, the project is funded via a non-vote fund
  // (Malima/Non-Public/Contractual) and the Vote Number is NOT mandatory.
  const [fundsChecked, setFundsChecked] = useState(false);
  const { data: votes } = useFetch<Vote[]>("/api/votes");
  // Existing projects — used to populate the Requirement Group combobox with
  // the unique set of requirementGroup values already used by Maintenance
  // projects. Fetched once when the wizard opens.
  const { data: existingProjects } = useFetch<ExistingProject[]>("/api/projects");
  const existingRequirementGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const p of existingProjects ?? []) {
      if (p.projectType === "Maintenance" && p.requirementGroup && p.requirementGroup.trim()) {
        groups.add(p.requirementGroup.trim());
      }
    }
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [existingProjects]);
  // Only ACTIVE votes are eligible for selection — inactive (archived) votes
  // are filtered out of the dropdown so users can't allocate new projects
  // against closed financial years.
  const activeVotes = useMemo(() => (votes ?? []).filter((v) => v.active), [votes]);
  // Combobox open-state for the Requirement Group picker (Maintenance projects
  // only). Toggled on focus / typing / chevron click; closed on selection or
  // outside-click (handled by Popover).
  const [reqGroupOpen, setReqGroupOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    nameAbbreviation: "",
    voteNumber: "",
    voteAllocation: "",
    committed: "0",
    actualSpent: "0",
    startDate: "",
    endDate: "", // EDC
    benefactor: "", // replaces Department
    reference: "", // manual text — how vote allocated
    projectType: "New Construction",
    financialMean: "Vote/Funds",
    requirementGroup: "", // for Maintenance projects — groups sub-requirements
    projectOfficer: "",
    status: "Active",
    description: "",
  });
  const [estimateRows, setEstimateRows] = useState<EstimateRow[]>([
    { itemName: "", qty: "", unit: "NOS", estimateCost: "", totalCost: "" },
  ]);

  const selectedVote = activeVotes.find((v) => v.id === selectedVoteId);

  // Tracks whether the user has manually edited the abbreviation field. When
  // false, the abbreviation auto-suggests from the project name. Once the user
  // touches the field, we stop auto-suggesting so their override sticks.
  const [abbrevTouched, setAbbrevTouched] = useState(false);

  // Suggest an abbreviation from a project name by taking the first letter of
  // each significant word (skipping common stop-words / numbers / symbols).
  // Example: "No.03 Slipway Hangar" → "NSH", "Engine Fire Suppression" → "EFS".
  const suggestAbbreviation = (name: string): string => {
    const stop = new Set(["of", "for", "and", "the", "in", "on", "at", "to", "no", "a", "an"]);
    const tokens = name
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/[\s-]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const letters = tokens
      .filter((t) => !stop.has(t.toLowerCase()))
      .map((t) => t[0]!.toUpperCase());
    return letters.slice(0, 5).join("");
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      // keep auto-suggesting the abbreviation until the user edits it manually
      nameAbbreviation: abbrevTouched ? prev.nameAbbreviation : suggestAbbreviation(value),
    }));
  };

  const handleAbbrevChange = (value: string) => {
    setAbbrevTouched(true);
    // Force uppercase, strip non-alphanumeric (keep letters + digits)
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setForm((prev) => ({ ...prev, nameAbbreviation: cleaned }));
  };

  const handleVoteSelect = (id: string) => {
    setSelectedVoteId(id);
    const v = activeVotes.find((vt) => vt.id === id);
    if (v) {
      setForm((prev) => ({
        ...prev,
        voteNumber: v.voteNumber,
        voteAllocation: v.allocation ? String(v.allocation) : prev.voteAllocation,
      }));
    }
  };

  // Toggle the "Funds" checkbox. When checked, the project is funded via a non-vote
  // fund (default Malima Fund) and the Vote Number becomes optional. When unchecked,
  // the project is funded via Vote and the Vote Number is mandatory.
  const handleFundsToggle = (checked: boolean) => {
    setFundsChecked(checked);
    setCustomVoteNumber(false);
    setSelectedVoteId("");
    if (checked) {
      setForm((prev) => ({
        ...prev,
        financialMean: "Malima Fund",
        voteNumber: "",
        voteAllocation: "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        financialMean: "Vote/Funds",
        voteNumber: "",
      }));
    }
  };

  const handleFundSelect = (fund: string) => {
    setForm((prev) => ({ ...prev, financialMean: fund }));
  };

  const nonVotePlaceholder =
    form.financialMean === "Contractual" ? "CONTRACTUAL" : "NON-NAVAL";
  const nonVoteHint =
    form.financialMean === "Contractual"
      ? "Contractual funding — Vote Number can be 'CONTRACTUAL' or the ARO reference."
      : form.financialMean === "Malima Fund"
      ? "Malima Fund — Vote Number can be 'NON-NAVAL' or the Malima reference number."
      : "Non-Public Fund — Vote Number can be 'NON-NAVAL' or the fund reference.";

  const addRow = () =>
    setEstimateRows([
      ...estimateRows,
      { itemName: "", qty: "", unit: "NOS", estimateCost: "", totalCost: "" },
    ]);
  const removeRow = (idx: number) =>
    setEstimateRows(estimateRows.filter((_, i) => i !== idx));

  // Update a single field on a row. When Qty or UnitCost changes,
  // recompute the row's TotalCost automatically (= Qty × UnitCost) so the
  // editable grid always shows a live total. Manual edits to TotalCost itself
  // (or other fields) leave the total as-is.
  const updateRow = (idx: number, field: keyof EstimateRow, value: string) =>
    setEstimateRows(
      estimateRows.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, [field]: value };
        if (field === "qty" || field === "estimateCost") {
          const q = Number(next.qty);
          const c = Number(next.estimateCost);
          next.totalCost =
            !isNaN(q) && !isNaN(c) && q > 0 && c > 0 ? String(q * c) : "";
        }
        return next;
      })
    );

  // Valid (filled) estimate rows — used to decide the wizard's path:
  //   • ≥1 valid row  → create project + estimate, then go to Step 2 (AI processing)
  //   • 0 valid rows  → create project only, SKIP Step 2 and go straight to the
  //                     project window (Step 3). The user can add estimate items
  //                     later from the project window. (Material Estimate is OPTIONAL.)
  const validEstimateRows = estimateRows.filter(
    (r) => r.itemName.trim() && (Number(r.qty) > 0 || Number(r.estimateCost) > 0)
  );
  const hasValidEstimate = validEstimateRows.length > 0;

  const downloadTemplate = () => {
    // Template now uses `UnitCost` as the column header (renamed from `EstimateCost`).
    // The sample row demonstrates the relationship TotalCost = Qty × UnitCost (2 × 185000 = 370000).
    const header = "ItemName,Qty,Unit,UnitCost,TotalCost";
    const sample = "Centrifugal Pump 15kW,2,NOS,185000,370000";
    const sample2 = ",,NOS,,";
    const csv = `${header}\n${sample}\n${sample2}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "material-estimate-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Template downloaded",
      description:
        "Columns: ItemName, Qty, Unit, UnitCost (per unit), TotalCost (= Qty × UnitCost — leave blank to auto-compute).",
    });
  };

  // Simple CSV parser — handles quoted fields with commas
  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") {
          cur.push(field);
          field = "";
        } else if (ch === "\n" || ch === "\r") {
          if (ch === "\r" && text[i + 1] === "\n") i++;
          cur.push(field);
          rows.push(cur);
          cur = [];
          field = "";
        } else {
          field += ch;
        }
      }
    }
    if (field.length > 0 || cur.length > 0) {
      cur.push(field);
      rows.push(cur);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Please upload a CSV file", variant: "destructive" });
      e.target.value = "";
      return;
    }
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast({ title: "CSV file is empty", variant: "destructive" });
        e.target.value = "";
        return;
      }
      const header = rows[0].map((c) => c.trim().toLowerCase());
      const idxName = header.findIndex((h) => h.includes("item") || h.includes("name"));
      const idxQty = header.findIndex((h) => h.includes("qty"));
      const idxUnit = header.findIndex((h) => h.includes("unit") || h.includes("deno"));
      // Find the per-unit cost column. Prefer `UnitCost` (new name); fall back to
      // the legacy `EstimateCost` header for backward compatibility. Also matches
      // any column with "cost"/"price" but without "total".
      const idxCost = header.findIndex(
        (h) =>
          (h === "unitcost" || h.includes("unit cost") || h.includes("unitcost")) ||
          ((h.includes("estimate") && (h.includes("cost") || h.includes("price"))) ||
           ((h.includes("cost") || h.includes("price")) && !h.includes("total")))
      );
      const idxTotal = header.findIndex(
        (h) => h.includes("total") && (h.includes("cost") || h.includes("price"))
      );
      const dataRows = idxName >= 0 ? rows.slice(1) : rows;
      const parsed: EstimateRow[] = dataRows
        .map((r) => {
          const itemName = idxName >= 0 ? (r[idxName] || "").trim() : (r[0] || "").trim();
          const qty = idxQty >= 0 ? (r[idxQty] || "").trim() : (r[1] || "").trim();
          const unit = (idxUnit >= 0 ? (r[idxUnit] || "").trim() : (r[2] || "").trim()) || "NOS";
          // Per-unit cost — read from the UnitCost (or legacy EstimateCost) column.
          const estimateCost = idxCost >= 0 ? (r[idxCost] || "").trim() : (r[3] || "").trim();
          // TotalCost: prefer the CSV's TotalCost column when present & non-blank,
          // otherwise compute it as Qty × UnitCost (per the task spec).
          const totalRaw =
            idxTotal >= 0 ? (r[idxTotal] || "").trim() : "";
          let totalCost = "";
          if (totalRaw && !isNaN(Number(totalRaw))) {
            totalCost = totalRaw;
          } else {
            const q = Number(qty);
            const c = Number(estimateCost);
            if (!isNaN(q) && !isNaN(c) && q > 0 && c > 0) {
              totalCost = String(q * c);
            }
          }
          return { itemName, qty, unit, estimateCost, totalCost };
        })
        .filter((r) => r.itemName);
      if (parsed.length === 0) {
        toast({ title: "No valid rows found in CSV", variant: "destructive" });
        e.target.value = "";
        return;
      }
      setPreviewRows(parsed);
    } catch {
      toast({ title: "Failed to read CSV file", variant: "destructive" });
    }
    e.target.value = "";
  };

  const confirmImport = () => {
    if (!previewRows) return;
    setEstimateRows(previewRows);
    toast({ title: `Imported ${previewRows.length} estimate rows` });
    setPreviewRows(null);
  };

  const handleSaveAndProcess = async () => {
    if (!form.name) {
      toast({ title: "Project Name is required", variant: "destructive" });
      return;
    }
    // Vote Number is mandatory UNLESS the Funds checkbox is ticked (non-vote funding).
    if (!fundsChecked && !form.voteNumber.trim()) {
      toast({
        title: "Vote Number is required",
        description: "Tick the Funds checkbox for non-vote funding (Malima/Non-Public/Contractual).",
        variant: "destructive",
      });
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

    // NO valid estimate items → skip Step 2 (AI processing) entirely and go
    // straight to the project window (Step 3). The Material Estimate is
    // OPTIONAL; the user can add estimate items later from the project window.
    if (validEstimateRows.length === 0) {
      setSaving(false);
      toast({
        title: "Project created",
        description: "No material estimate items — skipped AI processing (Step 2). Add items later from the project window if needed.",
      });
      finishAndGoToProject(project.id);
      return;
    }

    // 2. Export Estimate into DB (only when there ARE valid estimate items)
    const estRes = await apiRequest("/api/estimates", "POST", {
      projectId: project.id,
      name: `${form.name} — Material Estimate`,
      items: validEstimateRows.map((r) => ({
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

  // Shared helper — invokes `onCreated` with the current form values for the
  // given project id, then resets the wizard's state so it's clean for the
  // next invocation. Used both by Step 2 → "Go to Project Window" and by the
  // skip-Step-2 path inside `handleSaveAndProcess`.
  const finishAndGoToProject = (projectId: string) => {
    onCreated({
      id: projectId,
      name: form.name,
      nameAbbreviation: form.nameAbbreviation || null,
      voteNumber: form.voteNumber,
      voteAllocation: Number(form.voteAllocation) || 0,
      committed: Number(form.committed) || 0,
      actualSpent: Number(form.actualSpent) || 0,
      benefactor: form.benefactor || null,
      reference: form.reference || null,
      endDate: form.endDate || null,
      startDate: form.startDate || null,
      projectType: form.projectType,
      financialMean: form.financialMean,
      requirementGroup: form.projectType === "Maintenance" ? (form.requirementGroup.trim() || null) : null,
    });
    // reset
    setStep(1);
    setCreatedProjectId(null);
    setCreatedEstimateId(null);
    setFundsChecked(false);
    setAbbrevTouched(false);
    setReqGroupOpen(false);
    setForm({
      name: "", nameAbbreviation: "", voteNumber: "", voteAllocation: "", committed: "0", actualSpent: "0",
      startDate: "", endDate: "", benefactor: "", reference: "",
      projectType: "New Construction", financialMean: "Vote/Funds",
      requirementGroup: "",
      projectOfficer: "", status: "Active", description: "",
    });
    setEstimateRows([{ itemName: "", qty: "", unit: "NOS", estimateCost: "", totalCost: "" }]);
    setCustomVoteNumber(false);
    setSelectedVoteId("");
  };

  const handleGoToProject = () => {
    if (createdProjectId) {
      finishAndGoToProject(createdProjectId);
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
                  <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Dockyard Refit 2025" className="bg-background border-border" />
                </div>

                {/* Project Name Abbreviation — used as the file group key prefix */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Project Name Abbreviation
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">(for file group key prefix)</span>
                  </Label>
                  <Input
                    value={form.nameAbbreviation}
                    onChange={(e) => handleAbbrevChange(e.target.value)}
                    placeholder="e.g. NSH"
                    className="bg-background border-border font-mono uppercase tracking-wider"
                    maxLength={8}
                  />
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    Used as prefix for auto-generated file group keys (e.g.
                    <span className="font-mono text-foreground mx-1">{form.nameAbbreviation || "NSH"}-001</span>,
                    <span className="font-mono text-foreground ml-1">{form.nameAbbreviation || "NSH"}-002</span>).
                    Auto-suggested from the project name — override if needed.
                  </p>
                </div>

                {/* Vote Number — conditional UI based on Funds checkbox state */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Vote className="h-3.5 w-3.5 text-primary" />
                    Vote Number{!fundsChecked && " *"}
                    {fundsChecked && (
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">(optional)</span>
                    )}
                  </Label>
                  {!fundsChecked && !customVoteNumber ? (
                    <>
                      <Select value={selectedVoteId} onValueChange={handleVoteSelect}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select an active vote from the list…" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeVotes && activeVotes.length > 0 ? (
                            activeVotes.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                <span className="font-mono">{v.voteNumber}</span> — {v.description} ({v.voteType})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="_none" disabled>No active votes available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedVote ? (
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          <CustomBadge className={cn("border", voteTypeColor(selectedVote.voteType))}>
                            {selectedVote.voteType}
                          </CustomBadge>
                          {selectedVote.allocation > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              Allocation: {formatCurrency(selectedVote.allocation)}
                            </span>
                          )}
                          {selectedVote.financialYear && (
                            <span className="text-[11px] text-muted-foreground">
                              · FY: {selectedVote.financialYear}
                            </span>
                          )}
                          {!selectedVote.active && (
                            <CustomBadge className="border-0 bg-amber-500/15 text-amber-400">Inactive</CustomBadge>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                          <Info className="h-3 w-3 mt-0.5 shrink-0" />
                          Capital votes fund one-time construction. Recurrence votes fund annual maintenance.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomVoteNumber(true);
                          setSelectedVoteId("");
                          setForm((prev) => ({ ...prev, voteNumber: "" }));
                        }}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 self-start"
                      >
                        <Pencil className="h-3 w-3" /> Enter custom vote number
                      </button>
                    </>
                  ) : !fundsChecked && customVoteNumber ? (
                    <>
                      <Input
                        value={form.voteNumber}
                        onChange={(e) => setForm({ ...form, voteNumber: e.target.value })}
                        placeholder="e.g. 223-1-01-2104"
                        className="bg-background border-border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomVoteNumber(false);
                          setForm((prev) => ({ ...prev, voteNumber: "" }));
                        }}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 self-start"
                      >
                        <ChevronLeft className="h-3 w-3" /> Back to vote list
                      </button>
                    </>
                  ) : (
                    <>
                      <Input
                        value={form.voteNumber}
                        onChange={(e) => setForm({ ...form, voteNumber: e.target.value })}
                        placeholder={nonVotePlaceholder}
                        className="bg-background border-border"
                      />
                      <p className="text-[11px] text-amber-400 flex items-start gap-1">
                        <Landmark className="h-3 w-3 mt-0.5 shrink-0" />
                        {nonVoteHint}
                      </p>
                    </>
                  )}
                </div>

                {/* Project Type */}
                <div className="space-y-1.5">
                  <Label>Project Type *</Label>
                  <Select value={form.projectType} onValueChange={(v) => setForm({ ...form, projectType: v })}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.projectType && (
                    <div className="pt-0.5">
                      <CustomBadge className={cn("border", projectTypeColor(form.projectType))}>
                        {form.projectType}
                      </CustomBadge>
                    </div>
                  )}
                </div>

                {/* Requirement Group — only visible when projectType === "Maintenance".
                    Maintenance (recurrence vote) projects don't have a single
                    dedicated project — they have a variety of recurrence
                    requirements (e.g. "ENA Maintenance", "Water Purification").
                    This field groups them into sub-tiles on the Projects list.

                    Rendered as a combobox (Input + Popover) — the user can
                    pick an existing group (from other Maintenance projects) or
                    type a new one. Free text is always preserved so brand-new
                    group names can be entered. */}
                {form.projectType === "Maintenance" && (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      Requirement Group
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">(for maintenance sub-grouping)</span>
                    </Label>
                    <Popover open={reqGroupOpen} onOpenChange={setReqGroupOpen}>
                      <PopoverAnchor asChild>
                        <div className="relative">
                          <Input
                            value={form.requirementGroup}
                            onChange={(e) => {
                              setForm({ ...form, requirementGroup: e.target.value });
                              setReqGroupOpen(true);
                            }}
                            onFocus={() => setReqGroupOpen(true)}
                            placeholder="e.g. ENA Maintenance, Water Purification, Hull Preservation"
                            className="bg-background border-border pr-8"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setReqGroupOpen((o) => !o)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Toggle requirement group suggestions"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </PopoverAnchor>
                      <PopoverContent
                        align="start"
                        // Match the anchor's width so the dropdown is at least as wide as the input.
                        className="p-0 w-[var(--radix-popover-anchor-width)] min-w-[240px] bg-popover text-popover-foreground border-border"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        {(() => {
                          const q = form.requirementGroup.trim().toLowerCase();
                          const filtered = q
                            ? existingRequirementGroups.filter((g) => g.toLowerCase().includes(q))
                            : existingRequirementGroups;
                          const typed = form.requirementGroup.trim();
                          const isNew = typed.length > 0 && !existingRequirementGroups.some(
                            (g) => g.toLowerCase() === typed.toLowerCase()
                          );
                          if (filtered.length === 0 && !isNew) {
                            return (
                              <div className="p-3 text-xs text-muted-foreground">
                                No existing groups. Type a name to create a new requirement group.
                              </div>
                            );
                          }
                          return (
                            <ul className="max-h-56 overflow-y-auto scrollbar-thin py-1">
                              {filtered.map((g) => (
                                <li key={g}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setForm((prev) => ({ ...prev, requirementGroup: g }));
                                      setReqGroupOpen(false);
                                    }}
                                    className={cn(
                                      "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-secondary/60",
                                      g === form.requirementGroup.trim() ? "text-primary font-medium" : "text-foreground"
                                    )}
                                  >
                                    <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span className="truncate flex-1">{g}</span>
                                    {g === form.requirementGroup.trim() && (
                                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                    )}
                                  </button>
                                </li>
                              ))}
                              {isNew && (
                                <li className={filtered.length > 0 ? "border-t border-border mt-1 pt-1" : ""}>
                                  <button
                                    type="button"
                                    onClick={() => setReqGroupOpen(false)}
                                    className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-secondary/60 text-primary"
                                  >
                                    <Plus className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate flex-1">
                                      Use &ldquo;<span className="font-medium">{typed}</span>&rdquo; (new)
                                    </span>
                                  </button>
                                </li>
                              )}
                            </ul>
                          );
                        })()}
                      </PopoverContent>
                    </Popover>
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      Select an existing group or type a new one. Maintenance projects are grouped on
                      the Projects list by this value (each group renders as its own sub-tile). Leave
                      blank to file under
                      <span className="font-mono text-foreground mx-1">General Maintenance</span>.
                    </p>
                  </div>
                )}

                {/* Funding Source — Funds checkbox (non-vote funding). NOT mandatory. */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    Funding Source
                  </Label>
                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id="funds-checkbox"
                      checked={fundsChecked}
                      onCheckedChange={(v) => handleFundsToggle(!!v)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="funds-checkbox"
                      className="text-sm font-normal cursor-pointer leading-tight"
                    >
                      <span className="font-medium">Funds</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Tick if funded via Malima / Non-Public / Contractual fund
                      </span>
                    </Label>
                  </div>
                  {fundsChecked && (
                    <Select value={form.financialMean} onValueChange={handleFundSelect}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FUND_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="pt-0.5">
                    <CustomBadge className={cn("border", financialMeanColor(form.financialMean))}>
                      {form.financialMean}
                    </CustomBadge>
                  </div>
                </div>

                {/* Reference — manual text entry (how vote allocated) */}
                <div className="space-y-1.5">
                  <Label>Reference (how vote allocated)</Label>
                  <Input
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="e.g. Vote 2104 - Allocation 2025"
                    className="bg-background border-border"
                  />
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

            {/* Material Estimate — OPTIONAL */}
            <section className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    Material Estimate
                    <span className="text-[11px] font-normal text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Optional — add items now or skip (you can add later in Step 2 / project window)
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={downloadTemplate} size="sm" variant="outline" className="gap-1.5">
                    <Download className="h-4 w-4" /> Download Template
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                  >
                    <Upload className="h-4 w-4" /> Upload Estimate
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button onClick={addRow} size="sm" variant="outline" className="gap-1.5">
                    <Plus className="h-4 w-4" /> Add Row
                  </Button>
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-x-auto scrollbar-thin">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[1fr_70px_80px_120px_130px_40px] gap-2 px-3 py-2 bg-secondary/40 text-xs text-muted-foreground uppercase">
                    <span>Item Name</span>
                    <span className="text-right">Qty</span>
                    <span>Deno</span>
                    <span className="text-right">Unit Cost (Rs.)</span>
                    <span className="text-right">Total Cost (Rs.)</span>
                    <span></span>
                  </div>
                  <div className="divide-y divide-border">
                    {estimateRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_70px_80px_120px_130px_40px] gap-2 px-3 py-2 items-center">
                        <Input value={row.itemName} onChange={(e) => updateRow(idx, "itemName", e.target.value)} placeholder="e.g. Centrifugal Pump 15kW" className="bg-background border-border h-8 text-sm" />
                        <Input type="number" value={row.qty} onChange={(e) => updateRow(idx, "qty", e.target.value)} placeholder="0" className="bg-background border-border h-8 text-sm text-right" />
                        <Select value={row.unit} onValueChange={(v) => updateRow(idx, "unit", v)}>
                          <SelectTrigger className="bg-background border-border h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" value={row.estimateCost} onChange={(e) => updateRow(idx, "estimateCost", e.target.value)} placeholder="0" className="bg-background border-border h-8 text-sm text-right" />
                        <Input
                          type="number"
                          value={row.totalCost}
                          onChange={(e) => updateRow(idx, "totalCost", e.target.value)}
                          placeholder="0"
                          readOnly
                          tabIndex={-1}
                          className="bg-secondary/40 border-border h-8 text-sm text-right font-medium text-emerald-500 dark:text-emerald-400 cursor-not-allowed focus-visible:ring-0"
                          title="Total Cost = Qty × Unit Cost (auto-computed)"
                        />
                        <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-red-400 flex items-center justify-center">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Tip: Unit Cost is per-unit; Total Cost auto-computes as Qty × Unit Cost (or use the CSV TotalCost column). After saving, Step 2 will process these items with AI to match RC list &amp; inventory.
                {!hasValidEstimate && (
                  <span className="text-muted-foreground/80 ml-2 font-medium">· No items yet — Step 2 will be skipped and you&rsquo;ll go straight to the project window</span>
                )}
              </p>
              {estimateRows.some((r) => r.totalCost && Number(r.totalCost) > 0) && (
                <div className="mt-2 flex items-center justify-end gap-2 text-sm">
                  <span className="text-muted-foreground">Grand Total (Total Cost):</span>
                  <span className="font-semibold text-emerald-500 dark:text-emerald-400 font-mono">
                    Rs.{" "}
                    {estimateRows
                      .reduce(
                        (sum, r) => sum + (Number(r.totalCost) || 0),
                        0
                      )
                      .toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </section>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-background/80 backdrop-blur py-3 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-border">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <div className="flex items-center gap-2">
                {!hasValidEstimate && (
                  <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    No estimate items — Step 2 will be skipped
                  </span>
                )}
                <Button
                  onClick={handleSaveAndProcess}
                  disabled={saving}
                  className="gap-1.5"
                  title={
                    hasValidEstimate
                      ? "Save project + estimate, then process with AI in Step 2"
                      : "Save project and open its window directly (Step 2 skipped)"
                  }
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasValidEstimate ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {hasValidEstimate
                    ? "Export Estimate & Process (Step 2)"
                    : "Create Project & Open (Skip Estimate)"}
                </Button>
              </div>
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
                  Review matched items, then &quot;Initiate File&quot; to raise PRs. Initiated files forward to the Project Window.
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

      {/* CSV Import Preview Dialog */}
      <Dialog open={!!previewRows} onOpenChange={(o) => !o && setPreviewRows(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-thin bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Preview Imported Estimate ({previewRows?.length || 0} rows)
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Review the parsed CSV rows below. Confirming will <span className="font-medium text-foreground">replace</span> the current estimate rows.
          </p>
          {previewRows && previewRows.length > 0 && (
            <div className="border border-border rounded-lg overflow-x-auto scrollbar-thin">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[1fr_70px_70px_100px_120px] gap-2 px-3 py-2 bg-secondary/40 text-xs text-muted-foreground uppercase">
                  <span>Item Name</span>
                  <span className="text-right">Qty</span>
                  <span>Unit</span>
                  <span className="text-right">Unit Cost</span>
                  <span className="text-right">Total Cost</span>
                </div>
                <div className="divide-y divide-border max-h-[50vh] overflow-y-auto scrollbar-thin">
                  {previewRows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_70px_70px_100px_120px] gap-2 px-3 py-1.5 text-sm items-center">
                      <span className="text-foreground truncate">{r.itemName || <span className="text-muted-foreground italic">—</span>}</span>
                      <span className="text-right">{r.qty || "—"}</span>
                      <span className="text-xs">{r.unit || "NOS"}</span>
                      <span className="text-right">{r.estimateCost ? Number(r.estimateCost).toLocaleString("en-IN") : "—"}</span>
                      <span className="text-right font-medium text-emerald-500 dark:text-emerald-400">
                        {r.totalCost ? Number(r.totalCost).toLocaleString("en-IN") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewRows(null)}>Cancel</Button>
            <Button onClick={confirmImport} disabled={!previewRows || previewRows.length === 0} className="gap-1.5">
              <Check className="h-4 w-4" /> Confirm Import ({previewRows?.length || 0} rows)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
