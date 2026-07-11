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
import { ScrollArea } from "@/components/ui/scroll-area";
import { PositionBadge, CategoryBadge, CustomBadge } from "@/components/erp/badges";
import { FileLogDialog, ProjectFile } from "./file-log";
import {
  formatCurrency,
  PRESENT_POSITIONS,
  FILE_CATEGORIES,
  positionColor,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  voteNumber: string;
  voteAllocation: number;
  committed: number;
  actualSpent: number;
}

interface Allocation {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  authorizedBy: string | null;
}

interface Props {
  project: Project;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}

export function PresentPositionDialog({ project, open, onOpenChange, onChanged }: Props) {
  const { data: files, loading, refresh } = useFetch<ProjectFile[]>(
    `/api/projects/${project.id}/files`
  );
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editFile, setEditFile] = useState<ProjectFile | null>(null);
  const [logFile, setLogFile] = useState<ProjectFile | null>(null);
  const [allocOpen, setAllocOpen] = useState(false);
  const [sortKey, setSortKey] = useState<"createdAt" | "fileCost" | "prNumber">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

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

  const filteredFiles = useMemo(() => {
    let list = files || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.prNumber.toLowerCase().includes(q) ||
          f.itemCode.toLowerCase().includes(q) ||
          f.itemName.toLowerCase().includes(q) ||
          (f.supplier || "").toLowerCase().includes(q)
      );
    }
    if (positionFilter !== "all") {
      list = list.filter((f) => f.presentPosition === positionFilter);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "fileCost") cmp = a.fileCost - b.fileCost;
      else if (sortKey === "prNumber") cmp = a.prNumber.localeCompare(b.prNumber);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [files, search, positionFilter, sortKey, sortDir]);

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
      "Item Code": f.itemCode,
      "Item Name": f.itemName,
      Unit: f.unit,
      Qty: f.qty,
      "Unit Price": f.unitPrice,
      "File Cost": f.fileCost,
      Supplier: f.supplier || "",
      "Present Position": f.presentPosition,
      Category: f.fileCategory,
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${(r as Record<string, unknown>)[h]}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}-files.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[92vh] bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-foreground flex items-center justify-between gap-4">
            <span className="truncate">{project.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {project.voteNumber}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <div className="p-6 space-y-5">
            {/* Project financial summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FinBox label="Vote Allocation" value={formatCurrency(project.voteAllocation)} tone="text-blue-400" />
              <FinBox label="Committed" value={formatCurrency(project.committed)} tone="text-amber-400" />
              <FinBox label="Actual Spent" value={formatCurrency(project.actualSpent)} tone="text-red-400" />
              <FinBox label="File Cost (Total)" value={formatCurrency(totalFileCost)} tone="text-emerald-400" />
            </div>

            {/* Position summary bar */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Present Position Summary
              </h4>
              <div className="flex flex-wrap gap-2">
                {positionSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No files yet.</p>
                ) : (
                  positionSummary.map(([pos, info]) => (
                    <div
                      key={pos}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-1.5",
                        positionColor(pos)
                      )}
                    >
                      <span className="text-sm font-medium">{pos}</span>
                      <span className="text-xs opacity-80">
                        {info.count} file{info.count > 1 ? "s" : ""} · {formatCurrency(info.cost)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search PR, item, supplier..."
                  className="pl-9 bg-background border-border"
                />
              </div>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-[180px] bg-background border-border">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {PRESENT_POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setAllocOpen(true)} className="gap-1.5">
                <History className="h-4 w-4" /> Allocations
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5">
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add File
              </Button>
            </div>

            {/* File register table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <SortTh label="PR Number" onClick={() => toggleSort("prNumber")} active={sortKey === "prNumber"} dir={sortDir} />
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
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredFiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No files found. Click "Add File" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFiles.map((f) => (
                      <TableRow
                        key={f.id}
                        className="border-border cursor-pointer hover:bg-secondary/40"
                        onClick={() => setLogFile(f)}
                      >
                        <TableCell className="font-mono text-xs text-foreground">{f.prNumber}</TableCell>
                        <TableCell className="font-mono text-xs">{f.itemCode}</TableCell>
                        <TableCell className="text-foreground">{f.itemName}</TableCell>
                        <TableCell className="text-right">{f.qty} {f.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(f.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium text-foreground">{formatCurrency(f.fileCost)}</TableCell>
                        <TableCell className="text-xs">{f.supplier || "—"}</TableCell>
                        <TableCell><PositionBadge position={f.presentPosition} /></TableCell>
                        <TableCell><CategoryBadge category={f.fileCategory} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditFile(f)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-500"
                              onClick={() => handleDelete(f)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredFiles.length} file(s) · Click any row to view full log
            </p>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Add File */}
      <FileFormDialog
        projectId={project.id}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => {
          setAddOpen(false);
          refresh();
          onChanged();
        }}
      />

      {/* Edit File / Update Position */}
      {editFile && (
        <FileFormDialog
          projectId={project.id}
          file={editFile}
          open={!!editFile}
          onOpenChange={(o) => !o && setEditFile(null)}
          onSaved={() => {
            setEditFile(null);
            refresh();
            onChanged();
          }}
        />
      )}

      {/* File Log */}
      <FileLogDialog file={logFile} open={!!logFile} onOpenChange={(o) => !o && setLogFile(null)} />

      {/* Allocation History */}
      <AllocationHistoryDialog
        project={project}
        open={allocOpen}
        onOpenChange={setAllocOpen}
        onChanged={onChanged}
      />
    </Dialog>
  );
}

function FinBox({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function SortTh({
  label,
  onClick,
  active,
  dir,
  align = "left",
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  align?: "left" | "right";
}) {
  return (
    <TableHead className={align === "right" ? "text-muted-foreground text-right" : "text-muted-foreground"}>
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {active && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );
}

// ─── File Form (Add / Edit) ───
function FileFormDialog({
  projectId,
  file,
  open,
  onOpenChange,
  onSaved,
}: {
  projectId: string;
  file?: ProjectFile;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
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
    const url = isEdit
      ? `/api/projects/${projectId}/files/${file!.id}`
      : `/api/projects/${projectId}/files`;
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
          <Field label="PR Number *">
            <Input value={form.prNumber} onChange={(e) => setForm({ ...form, prNumber: e.target.value })} className="bg-background border-border" />
          </Field>
          <Field label="Item Code *">
            <Input value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} className="bg-background border-border" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Item Name *">
              <Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} className="bg-background border-border" />
            </Field>
          </div>
          <Field label="Unit">
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="bg-background border-border" />
          </Field>
          <Field label="Qty">
            <Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="bg-background border-border" />
          </Field>
          <Field label="Unit Price (Rs.)">
            <Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="bg-background border-border" />
          </Field>
          <Field label="File Cost (Rs.) — auto if empty">
            <Input type="number" value={form.fileCost} onChange={(e) => setForm({ ...form, fileCost: e.target.value })} placeholder="auto" className="bg-background border-border" />
          </Field>
          <Field label="Supplier">
            <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="bg-background border-border" />
          </Field>
          <Field label="Present Position">
            <Select value={form.presentPosition} onValueChange={(v) => setForm({ ...form, presentPosition: v })}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESENT_POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="File Category">
            <Select value={form.fileCategory} onValueChange={(v) => setForm({ ...form, fileCategory: v })}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FILE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {isEdit && (
            <>
              <Field label="Changed By">
                <Input value={form.changedBy} onChange={(e) => setForm({ ...form, changedBy: e.target.value })} placeholder="Your name" className="bg-background border-border" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Comment (for log)">
                  <Input value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Optional note" className="bg-background border-border" />
                </Field>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Update File" : "Add File"}
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
function AllocationHistoryDialog({
  project,
  open,
  onOpenChange,
  onChanged,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const { data: allocations, refresh } = useFetch<Allocation[]>(
    `/api/projects/${project.id}/allocations`
  );
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
    type: "Commitment",
    authorizedBy: "",
  });
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

        {/* Add allocation form */}
        <div className="bg-secondary/40 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Add Allocation</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-background border-border" />
            </Field>
            <Field label="Description">
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background border-border" />
            </Field>
            <Field label="Amount (Rs.)">
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-background border-border" />
            </Field>
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
            <div className="flex items-end">
              <Button onClick={submit} disabled={saving} className="w-full gap-1.5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add
              </Button>
            </div>
          </div>
        </div>

        {/* Allocations table */}
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
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No allocations recorded.
                  </TableCell>
                </TableRow>
              ) : (
                allocations.map((a) => (
                  <TableRow key={a.id} className="border-border">
                    <TableCell className="text-xs">{new Date(a.date).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell className="text-foreground">{a.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(a.amount)}</TableCell>
                    <TableCell>
                      <CustomBadge className={
                        a.type === "Actual" ? "border-0 bg-red-500/15 text-red-400"
                        : a.type === "Commitment" ? "border-0 bg-amber-500/15 text-amber-400"
                        : "border-0 bg-blue-500/15 text-blue-400"
                      }>{a.type}</CustomBadge>
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
