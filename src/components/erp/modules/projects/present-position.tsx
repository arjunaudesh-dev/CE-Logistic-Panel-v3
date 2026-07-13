"use client";
import { useState, useMemo } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PositionBadge, CategoryBadge, CustomBadge } from "@/components/erp/badges";
import { EmptyState, LoadingState } from "@/components/erp/states";
import { FileLogDialog, ProjectFile } from "./file-log";
import { EstimateItemsTable } from "./estimate-items";
import {
  formatCurrency,
  PRESENT_POSITIONS,
  FILE_CATEGORIES,
  positionColor,
  estimateStatusColor,
} from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  History,
  Pencil,
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2,
  Loader2,
  Download,
  X,
  FileSignature,
  Sparkles,
  ArrowRight,
  User,
  UserCheck,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  voteNumber: string;
  voteAllocation: number;
  committed: number;
  actualSpent: number;
  benefactor?: string | null;
  reference?: string | null;
  endDate?: string | null;
  startDate?: string | null;
}

interface Allocation {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  authorizedBy: string | null;
}

interface Estimate {
  id: string;
  name: string;
  status: string;
  items: { id: string; status: string; srNo: number; itemName: string }[];
}

interface ProcessStep {
  id: string;
  positionName: string;
  defaultResponsiblePerson: string | null;
  financialDelegationLevel: string | null;
}

interface ProcessFlow {
  id: string;
  name: string;
  steps: ProcessStep[];
}

interface Props {
  project: Project;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}

type FileNumberFilter = "all" | "with" | "without";

export function PresentPositionDialog({ project, open, onOpenChange, onChanged }: Props) {
  const { data: files, loading, refresh } = useFetch<ProjectFile[]>(
    `/api/projects/${project.id}/files`
  );
  const { data: estimates, refresh: refreshEst } = useFetch<Estimate[]>(
    `/api/estimates?projectId=${project.id}`
  );
  // Fetch process flows once to support the "Update Position" popup's default responsible person lookup
  const { data: processFlows } = useFetch<ProcessFlow[]>(`/api/process-flows`);
  const [activeTab, setActiveTab] = useState<"raised" | "estimate">("raised");
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [fileNumberFilter, setFileNumberFilter] = useState<FileNumberFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [updateFile, setUpdateFile] = useState<ProjectFile | null>(null);
  const [logFile, setLogFile] = useState<ProjectFile | null>(null);
  const [allocOpen, setAllocOpen] = useState(false);
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"createdAt" | "fileCost" | "prNumber">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  // Build a lookup of positionName -> defaultResponsiblePerson across all flows.
  // Multiple flows may define the same positionName; we keep the first non-empty match.
  const positionToResponsible = useMemo(() => {
    const map = new Map<string, string>();
    processFlows?.forEach((flow) => {
      flow.steps.forEach((step) => {
        if (step.positionName && step.defaultResponsiblePerson && !map.has(step.positionName)) {
          map.set(step.positionName, step.defaultResponsiblePerson);
        }
      });
    });
    return map;
  }, [processFlows]);

  // Position summary
  const positionSummary = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    files?.forEach((f) => {
      if (!map[f.presentPosition]) map[f.presentPosition] = { count: 0, cost: 0 };
      map[f.presentPosition].count++;
      map[f.presentPosition].cost += f.fileCost;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [files]);

  const totalFileCost = files?.reduce((s, f) => s + f.fileCost, 0) ?? 0;

  // pending estimate items (not yet initiated) — "items to be raised PR"
  const pendingEstimateItems = useMemo(() => {
    const list: Estimate["items"][number][] = [];
    estimates?.forEach((e) => {
      e.items.forEach((it) => {
        if (it.status === "Pending") list.push(it);
      });
    });
    return list;
  }, [estimates]);
  const initiatedCount = useMemo(
    () =>
      estimates?.reduce(
        (s, e) => s + e.items.filter((i) => i.status === "Initiated").length,
        0
      ) ?? 0,
    [estimates]
  );

  // File-number counts for the filter toggle
  const fileNumberCounts = useMemo(() => {
    const all = files?.length || 0;
    const withFn = files?.filter((f) => f.fileNumber && f.fileNumber.trim()).length || 0;
    return { all, with: withFn, without: all - withFn };
  }, [files]);

  const filteredFiles = useMemo(() => {
    let list = files || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.prNumber.toLowerCase().includes(q) ||
          f.itemCode.toLowerCase().includes(q) ||
          f.itemName.toLowerCase().includes(q) ||
          (f.supplier || "").toLowerCase().includes(q) ||
          (f.fileNumber || "").toLowerCase().includes(q)
      );
    }
    if (positionFilter !== "all") {
      list = list.filter((f) => f.presentPosition === positionFilter);
    }
    if (fileNumberFilter === "with") {
      list = list.filter((f) => f.fileNumber && f.fileNumber.trim());
    } else if (fileNumberFilter === "without") {
      list = list.filter((f) => !f.fileNumber || !f.fileNumber.trim());
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "fileCost") cmp = a.fileCost - b.fileCost;
      else if (sortKey === "prNumber") cmp = a.prNumber.localeCompare(b.prNumber);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [files, search, positionFilter, fileNumberFilter, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleDelete = async (file: ProjectFile) => {
    if (!confirm(`Delete file ${file.prNumber} (${file.itemName})?`)) return;
    const res = await apiRequest(`/api/projects/${project.id}/files/${file.id}`, "DELETE");
    if (res.ok) {
      toast({ title: "File deleted" });
      refresh();
      onChanged();
    } else {
      toast({ title: "Delete failed", description: res.error, variant: "destructive" });
    }
  };

  const exportExcel = () => {
    const rows = filteredFiles.map((f) => ({
      "PR Number": f.prNumber,
      "File Number": f.fileNumber || "",
      "Item Code": f.itemCode,
      "Item Name": f.itemName,
      Unit: f.unit,
      Qty: f.qty,
      "Unit Price": f.unitPrice,
      "File Cost": f.fileCost,
      Supplier: f.supplier || "",
      "Present Position": f.presentPosition,
      "Responsible Person": f.responsiblePerson || "",
      Category: f.fileCategory,
    }));
    const headers = Object.keys(rows[0] || { "PR Number": "" });
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${(r as Record<string, unknown>)[h] ?? ""}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}-files.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // pick the first processed estimate (or any) for the "PR from Estimate" tab
  const estimateForTab = estimates?.find((e) => e.status === "Processed") || estimates?.[0] || null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card shrink-0">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground text-sm sm:text-base truncate">{project.name}</h2>
              <p className="text-xs text-muted-foreground">
                {project.voteNumber}
                {project.benefactor && ` · Benefactor: ${project.benefactor}`}
                {project.reference && ` · Ref: ${project.reference}`}
                {project.endDate && ` · EDC: ${new Date(project.endDate).toLocaleDateString("en-GB")}`}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAllocOpen(true)} className="gap-1.5 shrink-0">
            <History className="h-4 w-4" /> Allocations
          </Button>
        </div>
        {/* Financial summary bar */}
        <div className="px-4 sm:px-6 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <FinBox label="Vote Allocation" value={formatCurrency(project.voteAllocation)} tone="text-blue-400" />
          <FinBox label="Committed" value={formatCurrency(project.committed)} tone="text-amber-400" />
          <FinBox label="Actual Spent" value={formatCurrency(project.actualSpent)} tone="text-red-400" />
          <FinBox label="File Cost (Total)" value={formatCurrency(totalFileCost)} tone="text-emerald-400" />
        </div>
        {/* Tabs */}
        <div className="px-4 sm:px-6 flex items-center gap-1 border-t border-border">
          <TabButton
            active={activeTab === "raised"}
            onClick={() => setActiveTab("raised")}
            icon={<FileText className="h-3.5 w-3.5" />}
            label="PR Raised Files"
            count={files?.length || 0}
          />
          <TabButton
            active={activeTab === "estimate"}
            onClick={() => setActiveTab("estimate")}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="PR from Estimate"
            count={pendingEstimateItems.length}
            tone="amber"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 sm:p-6 space-y-4">
          {/* Position summary (always visible) */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Present Position Summary
            </h4>
            <div className="flex flex-wrap gap-2">
              {positionSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files yet.</p>
              ) : (
                positionSummary.map(([pos, info]) => (
                  <div key={pos} className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", positionColor(pos))}>
                    <span className="text-sm font-medium">{pos}</span>
                    <span className="text-xs opacity-80">{info.count} file{info.count > 1 ? "s" : ""} · {formatCurrency(info.cost)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {activeTab === "raised" ? (
            <>
              {/* PR raised summary chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <MiniStat label="PR Raised (Files)" value={String(files?.length || 0)} sub={formatCurrency(totalFileCost)} tone="text-blue-400" />
                <MiniStat label="Initiated from Estimate" value={String(initiatedCount)} sub="forwarded PRs" tone="text-violet-400" />
                <MiniStat label="Items to Raise PR" value={String(pendingEstimateItems.length)} sub="from estimate" tone="text-amber-400" />
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PR, file no, item, supplier..." className="pl-9 bg-background border-border" />
                </div>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-[180px] bg-background border-border"><SelectValue placeholder="Position" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {PRESENT_POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* File Number filter toggle */}
                <div className="inline-flex rounded-md border border-border overflow-hidden bg-background">
                  <FilterPill
                    label={`All (${fileNumberCounts.all})`}
                    active={fileNumberFilter === "all"}
                    onClick={() => setFileNumberFilter("all")}
                  />
                  <FilterPill
                    label={`With File No (${fileNumberCounts.with})`}
                    active={fileNumberFilter === "with"}
                    onClick={() => setFileNumberFilter("with")}
                  />
                  <FilterPill
                    label={`Pending (${fileNumberCounts.without})`}
                    active={fileNumberFilter === "without"}
                    onClick={() => setFileNumberFilter("without")}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5"><Download className="h-4 w-4" /> Export</Button>
                <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add File</Button>
              </div>

              {/* File register table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <SortTh label="PR Number" onClick={() => toggleSort("prNumber")} active={sortKey === "prNumber"} dir={sortDir} />
                        <TableHead className="text-muted-foreground">File Number</TableHead>
                        <TableHead className="text-muted-foreground">Item Code</TableHead>
                        <TableHead className="text-muted-foreground">Item Name</TableHead>
                        <TableHead className="text-muted-foreground text-right">Qty</TableHead>
                        <TableHead className="text-muted-foreground text-right">Unit Price</TableHead>
                        <SortTh label="File Cost" onClick={() => toggleSort("fileCost")} active={sortKey === "fileCost"} dir={sortDir} align="right" />
                        <TableHead className="text-muted-foreground">Supplier</TableHead>
                        <TableHead className="text-muted-foreground">Position</TableHead>
                        <TableHead className="text-muted-foreground">Category</TableHead>
                        <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                      ) : filteredFiles.length === 0 ? (
                        <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No files found. Click &quot;Add File&quot; to create one.</TableCell></TableRow>
                      ) : (
                        filteredFiles.map((f) => {
                          const hasFileNumber = !!(f.fileNumber && f.fileNumber.trim());
                          return (
                            <TableRow key={f.id} className="border-border cursor-pointer hover:bg-secondary/40" onClick={() => setLogFile(f)}>
                              <TableCell className="font-mono text-xs text-foreground">{f.prNumber}</TableCell>
                              <TableCell>
                                {hasFileNumber ? (
                                  <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400">
                                    <Hash className="h-3 w-3" />
                                    {f.fileNumber}
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setUpdateFile(f); }}
                                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline"
                                  >
                                    <Hash className="h-3 w-3" /> Assign File No
                                  </button>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{f.itemCode}</TableCell>
                              <TableCell className="text-foreground">{f.itemName}</TableCell>
                              <TableCell className="text-right">{f.qty} {f.unit}</TableCell>
                              <TableCell className="text-right">{formatCurrency(f.unitPrice)}</TableCell>
                              <TableCell className="text-right font-medium text-foreground">{formatCurrency(f.fileCost)}</TableCell>
                              <TableCell className="text-xs">{f.supplier || "—"}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  <PositionBadge position={f.presentPosition} />
                                  {f.responsiblePerson && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <User className="h-2.5 w-2.5" />
                                      {f.responsiblePerson}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell><CategoryBadge category={f.fileCategory} /></TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setUpdateFile(f)} title="Update Position"><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-500" onClick={() => handleDelete(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{filteredFiles.length} file(s) · Click any row to view full log · Click the pencil to update position &amp; assign file number</p>
            </>
          ) : (
            /* PR from Estimate tab */
            <>
              <div className="bg-secondary/40 rounded-lg p-3 flex items-center gap-2 flex-wrap">
                <FileSignature className="h-4 w-4 text-amber-400" />
                <p className="text-sm text-foreground">
                  Items pending PR initiation from processed estimates. Click <span className="font-medium text-primary">Initiate File</span> to raise a PR — it will be forwarded to the &quot;PR Raised Files&quot; tab.
                </p>
              </div>
              {estimates && estimates.length > 0 ? (
                <div className="space-y-4">
                  {/* estimate selector */}
                  {estimates.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Estimate:</span>
                      {estimates.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setActiveEstimateId(e.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-xs border transition-colors",
                            (activeEstimateId || estimateForTab?.id) === e.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {e.name} <CustomBadge className={cn("border-0 ml-1", estimateStatusColor(e.status))}>{e.status}</CustomBadge>
                        </button>
                      ))}
                    </div>
                  )}
                  <EstimateItemsTable
                    estimateId={activeEstimateId || estimateForTab?.id || estimates[0].id}
                    showProcessButton
                    onChanged={() => { refreshEst(); refresh(); onChanged(); }}
                  />
                </div>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No estimates for this project"
                  description="Create a new project via the Add Project wizard to generate a material estimate, or add files directly in the PR Raised Files tab."
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Add File */}
      <FileFormDialog projectId={project.id} open={addOpen} onOpenChange={setAddOpen} onSaved={() => { setAddOpen(false); refresh(); onChanged(); }} />
      {/* Update Position popup (replaces simple Edit) */}
      {updateFile && (
        <UpdatePositionDialog
          file={updateFile}
          projectId={project.id}
          positionToResponsible={positionToResponsible}
          open={!!updateFile}
          onOpenChange={(o) => !o && setUpdateFile(null)}
          onSaved={() => { setUpdateFile(null); refresh(); onChanged(); }}
        />
      )}
      {/* File Log */}
      <FileLogDialog file={logFile} open={!!logFile} onOpenChange={(o) => !o && setLogFile(null)} />
      {/* Allocation History */}
      <AllocationHistoryDialog project={project} open={allocOpen} onOpenChange={setAllocOpen} onChanged={onChanged} />
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count, tone }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number; tone?: "amber" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
      <span className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-semibold",
        active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
        tone === "amber" && count > 0 && "bg-amber-500/15 text-amber-400"
      )}>
        {count}
      </span>
    </button>
  );
}

function FinBox({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${tone}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      {label}
    </button>
  );
}

function SortTh({ label, onClick, active, dir, align = "left" }: { label: string; onClick: () => void; active: boolean; dir: "asc" | "desc"; align?: "left" | "right" }) {
  return (
    <TableHead className={align === "right" ? "text-muted-foreground text-right" : "text-muted-foreground"}>
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {active && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );
}

// ─── File Form (Add only — Edit handled by UpdatePositionDialog) ───
function FileFormDialog({ projectId, file, open, onOpenChange, onSaved }: { projectId: string; file?: ProjectFile; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const isEdit = !!file;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    prNumber: file?.prNumber || "",
    itemCode: file?.itemCode || "",
    itemName: file?.itemName || "",
    unit: file?.unit || "NOS",
    qty: String(file?.qty ?? ""),
    unitPrice: String(file?.unitPrice ?? ""),
    fileCost: String(file?.fileCost ?? ""),
    supplier: file?.supplier || "",
    fileNumber: file?.fileNumber || "",
    presentPosition: file?.presentPosition || "PR Raised",
    fileCategory: file?.fileCategory || "General",
    changedBy: "",
    comment: "",
  });
  const { toast } = useToast();

  const submit = async () => {
    if (!form.prNumber || !form.itemCode || !form.itemName) {
      toast({ title: "PR Number, Item Code and Item Name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const url = isEdit ? `/api/projects/${projectId}/files/${file!.id}` : `/api/projects/${projectId}/files`;
    const method = isEdit ? "PUT" : "POST";
    const res = await apiRequest(url, method, form);
    setSaving(false);
    if (res.ok) {
      toast({ title: isEdit ? "File updated" : "File added" });
      onSaved();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isEdit ? `Edit File — ${file!.prNumber}` : "Add Processing File"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <Field label="PR Number *"><Input value={form.prNumber} onChange={(e) => setForm({ ...form, prNumber: e.target.value })} className="bg-background border-border" /></Field>
          <Field label="File Number (optional)"><Input value={form.fileNumber} onChange={(e) => setForm({ ...form, fileNumber: e.target.value })} placeholder="e.g. FILE/2025/001" className="bg-background border-border" /></Field>
          <Field label="Item Code *"><Input value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} className="bg-background border-border" /></Field>
          <div className="sm:col-span-2"><Field label="Item Name *"><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} className="bg-background border-border" /></Field></div>
          <Field label="Unit"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="bg-background border-border" /></Field>
          <Field label="Qty"><Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="bg-background border-border" /></Field>
          <Field label="Unit Price (Rs.)"><Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="bg-background border-border" /></Field>
          <Field label="File Cost (Rs.) — auto if empty"><Input type="number" value={form.fileCost} onChange={(e) => setForm({ ...form, fileCost: e.target.value })} placeholder="auto" className="bg-background border-border" /></Field>
          <Field label="Supplier"><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="bg-background border-border" /></Field>
          <Field label="Present Position">
            <Select value={form.presentPosition} onValueChange={(v) => setForm({ ...form, presentPosition: v })}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{PRESENT_POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="File Category">
            <Select value={form.fileCategory} onValueChange={(v) => setForm({ ...form, fileCategory: v })}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{FILE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {isEdit && (
            <>
              <Field label="Changed By"><Input value={form.changedBy} onChange={(e) => setForm({ ...form, changedBy: e.target.value })} placeholder="Your name" className="bg-background border-border" /></Field>
              <div className="sm:col-span-2"><Field label="Comment (for log)"><Input value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Optional note" className="bg-background border-border" /></Field></div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{isEdit ? "Update File" : "Add File"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Update Position Dialog (dedicated edit popup with next-position + responsible person) ───
function UpdatePositionDialog({
  file,
  projectId,
  positionToResponsible,
  open,
  onOpenChange,
  onSaved,
}: {
  file: ProjectFile;
  projectId: string;
  positionToResponsible: Map<string, string>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const currentPosition = file.presentPosition;
  const [nextPosition, setNextPosition] = useState(currentPosition);
  const [responsiblePerson, setResponsiblePerson] = useState(file.responsiblePerson || "");
  const [fileNumber, setFileNumber] = useState(file.fileNumber || "");
  const [supplier, setSupplier] = useState(file.supplier || "");
  const [changedBy, setChangedBy] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // When the user picks a different next position, prefill the responsible person
  // from the process-flow defaults — but only if the user hasn't manually overridden.
  const defaultForCurrent = positionToResponsible.get(currentPosition) || "";
  const defaultForNext = positionToResponsible.get(nextPosition) || "";

  const handleNextPositionChange = (v: string) => {
    setNextPosition(v);
    // Auto-fill responsible person from the new position's default — only if user hasn't overridden
    const isUsingDefault = responsiblePerson === defaultForCurrent || responsiblePerson === "";
    if (isUsingDefault) {
      const newDefault = positionToResponsible.get(v) || "";
      setResponsiblePerson(newDefault);
    }
  };

  const positionChanged = nextPosition !== currentPosition;

  const submit = async () => {
    if (positionChanged && !changedBy.trim()) {
      toast({ title: "Changed By is required when updating position", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      // Always allow file number + supplier updates
      fileNumber: fileNumber.trim() || null,
      supplier: supplier.trim() || null,
      // Position update
      presentPosition: nextPosition,
      responsiblePerson: responsiblePerson.trim() || null,
      changedBy: changedBy.trim() || "Officer",
      comment: comment.trim() || (positionChanged ? `Position changed: ${currentPosition} → ${nextPosition}` : "File metadata updated"),
    };
    const res = await apiRequest(`/api/projects/${projectId}/files/${file.id}`, "PUT", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: positionChanged ? "Position updated" : "File updated",
        description: positionChanged ? `${currentPosition} → ${nextPosition}` : undefined,
      });
      onSaved();
    } else {
      toast({ title: "Failed to update", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Update Position — {file.prNumber}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {file.itemName} · {file.itemCode}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current → Next position display */}
          <div className="bg-secondary/40 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" /> Position Transition
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              {/* Current */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Current Position</Label>
                <div className={cn("rounded-lg border px-3 py-2 text-sm font-medium", positionColor(currentPosition))}>
                  {currentPosition}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Default officer: <span className="text-foreground">{defaultForCurrent || "—"}</span>
                </p>
              </div>
              {/* Arrow */}
              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-primary rotate-90 sm:rotate-0" />
              </div>
              {/* Next */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Next Position *</Label>
                <Select value={nextPosition} onValueChange={handleNextPositionChange}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRESENT_POSITIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Default officer: <span className="text-foreground">{defaultForNext || "—"}</span>
                </p>
              </div>
            </div>
            {!positionChanged && (
              <p className="text-[11px] text-amber-400 mt-3 flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Pick a different next position to log a position change.
              </p>
            )}
          </div>

          {/* Responsible Person (auto-filled, editable) */}
          <div className="bg-secondary/40 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" /> Responsible Person
            </h4>
            <Field label="Responsible Person (editable — defaults from Process Flow)">
              <Input
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder={defaultForNext || "e.g. Cdr. R. Perera"}
                className="bg-background border-border"
              />
            </Field>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1">
              <User className="h-3 w-3 mt-0.5 shrink-0" />
              Auto-filled from the Process Flow defaults for the selected next position. Override if a different person is responsible.
            </p>
          </div>

          {/* File Number + Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="File Number (received after initial RL)">
              <Input
                value={fileNumber}
                onChange={(e) => setFileNumber(e.target.value)}
                placeholder="e.g. FILE/2025/001"
                className="bg-background border-border"
              />
            </Field>
            <Field label="Supplier">
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier name"
                className="bg-background border-border"
              />
            </Field>
          </div>

          {/* Change log fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`Changed By ${positionChanged ? "*" : ""}`}>
              <Input
                value={changedBy}
                onChange={(e) => setChangedBy(e.target.value)}
                placeholder="Your name / rank"
                className="bg-background border-border"
              />
            </Field>
            <Field label="Comment (for log)">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={positionChanged ? `Position changed: ${currentPosition} → ${nextPosition}` : "Optional note"}
                className="bg-background border-border"
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <ArrowRight className="h-4 w-4" />
            {positionChanged ? "Update Position" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ─── Allocation History ───
function AllocationHistoryDialog({ project, open, onOpenChange, onChanged }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void; onChanged: () => void }) {
  const { data: allocations, refresh } = useFetch<Allocation[]>(`/api/projects/${project.id}/allocations`);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: "", amount: "", type: "Commitment", authorizedBy: "" });
  const { toast } = useToast();

  const totalAllocated = allocations?.reduce((s, a) => s + a.amount, 0) ?? 0;
  const committed = allocations?.filter((a) => a.type === "Commitment").reduce((s, a) => s + a.amount, 0) ?? 0;
  const actual = allocations?.filter((a) => a.type === "Actual").reduce((s, a) => s + a.amount, 0) ?? 0;

  const submit = async () => {
    if (!form.description || !form.amount) {
      toast({ title: "Description and amount required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await apiRequest(`/api/projects/${project.id}/allocations`, "POST", form);
    setSaving(false);
    if (res.ok) {
      toast({ title: "Allocation added" });
      setForm({ date: new Date().toISOString().slice(0, 10), description: "", amount: "", type: "Commitment", authorizedBy: "" });
      refresh();
      onChanged();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Allocation History — {project.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <FinBox label="Total Allocated" value={formatCurrency(totalAllocated)} tone="text-blue-400" />
          <FinBox label="Committed" value={formatCurrency(committed)} tone="text-amber-400" />
          <FinBox label="Actual" value={formatCurrency(actual)} tone="text-red-400" />
        </div>
        <div className="bg-secondary/40 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Add Allocation</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-background border-border" /></Field>
            <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background border-border" /></Field>
            <Field label="Amount (Rs.)"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-background border-border" /></Field>
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Commitment">Commitment</SelectItem>
                  <SelectItem value="Actual">Actual</SelectItem>
                  <SelectItem value="Release">Release</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end"><Button onClick={submit} disabled={saving} className="w-full gap-1.5">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Add</Button></div>
          </div>
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Authorized By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!allocations || allocations.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No allocations recorded.</TableCell></TableRow>
              ) : (
                allocations.map((a) => (
                  <TableRow key={a.id} className="border-border">
                    <TableCell className="text-xs">{new Date(a.date).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell className="text-foreground">{a.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(a.amount)}</TableCell>
                    <TableCell>
                      <CustomBadge className={a.type === "Actual" ? "border-0 bg-red-500/15 text-red-400" : a.type === "Commitment" ? "border-0 bg-amber-500/15 text-amber-400" : "border-0 bg-blue-500/15 text-blue-400"}>{a.type}</CustomBadge>
                    </TableCell>
                    <TableCell className="text-xs">{a.authorizedBy || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
