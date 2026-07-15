"use client";
import { Fragment, useState, useMemo } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  ChevronRight,
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
  RefreshCw,
  Files,
  CheckSquare,
  ListChecks,
  Archive,
  ArchiveRestore,
  FolderKey,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  nameAbbreviation?: string | null;
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
  // Archive (NFA) view toggle — OFF (default) shows active files only,
  // ON shows archived files only (with muted/greyed styling and NFA badges).
  const [showArchived, setShowArchived] = useState(false);
  const filesUrl = `/api/projects/${project.id}/files${showArchived ? "?archivedOnly=true" : ""}`;
  const { data: files, loading, refresh } = useFetch<ProjectFile[]>(filesUrl);
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
  // Group-by-File (default ON) — merges items sharing the same PR/fileGroupKey into a single row
  const [groupByFile, setGroupByFile] = useState(true);
  // Tracks which group keys are expanded (showing their individual items)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Multi-select for bulk "Initiate Selected" — tracks selected ProjectFile IDs.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Bulk initiate dialog open state
  const [bulkInitiateOpen, setBulkInitiateOpen] = useState(false);
  // Archive (NFA) dialog target — when set, opens the small reason-prompt dialog
  const [archiveTarget, setArchiveTarget] = useState<ProjectFile | null>(null);
  const { toast } = useToast();

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── Multi-select helpers ───
  // NOTE: derived state (allVisibleIds / visibleSelectedCount / suggestedNextPosition)
  // is computed further down — AFTER `filteredFiles` is defined — to avoid the
  // temporal-dead-zone when the useMemo callbacks evaluate on first render.
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectMany = (ids: string[], on: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

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

  // Group files by fileGroupKey (falls back to prNumber). Items sharing the same
  // key collapse into a single "merged" row in the register when groupByFile is ON.
  interface FileGroup {
    key: string;
    items: ProjectFile[];
    totalCost: number;
    totalQty: number;
    commonSupplier: string | null;
    commonCategory: string | null;
    commonPosition: string | null;
    commonFileNumber: string | null;
    commonUnit: string | null;
    commonResponsiblePerson: string | null;
    firstCreatedAt: string;
  }

  const groupedView = useMemo<{ groups: FileGroup[]; singles: ProjectFile[] }>(() => {
    if (!groupByFile) return { groups: [], singles: filteredFiles };
    const map = new Map<string, ProjectFile[]>();
    for (const f of filteredFiles) {
      const k = (f.fileGroupKey && f.fileGroupKey.trim()) || f.prNumber;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(f);
    }
    const groups: FileGroup[] = [];
    const singles: ProjectFile[] = [];
    for (const [key, items] of map) {
      if (items.length >= 2) {
        const totalCost = items.reduce((s, f) => s + f.fileCost, 0);
        const totalQty = items.reduce((s, f) => s + f.qty, 0);
        const suppliers = new Set(items.map((f) => f.supplier).filter(Boolean));
        const categories = new Set(items.map((f) => f.fileCategory));
        const positions = new Set(items.map((f) => f.presentPosition));
        const fileNumbers = new Set(items.map((f) => f.fileNumber).filter(Boolean));
        const units = new Set(items.map((f) => f.unit));
        const responsible = new Set(items.map((f) => f.responsiblePerson).filter(Boolean));
        const firstCreatedAt = items
          .map((f) => f.createdAt)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
        groups.push({
          key,
          items,
          totalCost,
          totalQty,
          commonSupplier: suppliers.size === 1 ? Array.from(suppliers)[0]! : null,
          commonCategory: categories.size === 1 ? items[0]!.fileCategory : null,
          commonPosition: positions.size === 1 ? items[0]!.presentPosition : null,
          commonFileNumber: fileNumbers.size === 1 ? Array.from(fileNumbers)[0]! : null,
          commonUnit: units.size === 1 ? items[0]!.unit : null,
          commonResponsiblePerson: responsible.size === 1 ? Array.from(responsible)[0]! : null,
          firstCreatedAt,
        });
      } else {
        singles.push(items[0]!);
      }
    }
    return { groups, singles };
  }, [filteredFiles, groupByFile]);

  // ─── Multi-select derived state (depends on filteredFiles) ───
  const allVisibleIds = useMemo(
    () => filteredFiles.map((f) => f.id),
    [filteredFiles]
  );
  const visibleSelectedCount = useMemo(
    () => allVisibleIds.filter((id) => selectedIds.has(id)).length,
    [allVisibleIds, selectedIds]
  );
  const allVisibleSelected =
    allVisibleIds.length > 0 && visibleSelectedCount === allVisibleIds.length;
  const someVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < allVisibleIds.length;
  const toggleSelectAllVisible = () =>
    selectMany(allVisibleIds, !allVisibleSelected);

  // Resolve the "next position" suggestion — picks the next index after the most
  // common current position among the selected files (used as a default in the
  // Bulk Initiate dialog).
  const suggestedNextPosition = useMemo(() => {
    if (selectedIds.size === 0) return "GS Approval";
    const counts = new Map<string, number>();
    filteredFiles.forEach((f) => {
      if (selectedIds.has(f.id)) {
        counts.set(f.presentPosition, (counts.get(f.presentPosition) || 0) + 1);
      }
    });
    let top = "";
    let topN = 0;
    counts.forEach((n, pos) => {
      if (n > topN) {
        topN = n;
        top = pos;
      }
    });
    const idx = PRESENT_POSITIONS.indexOf(top as (typeof PRESENT_POSITIONS)[number]);
    if (idx >= 0 && idx < PRESENT_POSITIONS.length - 1) {
      return PRESENT_POSITIONS[idx + 1]!;
    }
    return top || "GS Approval";
  }, [filteredFiles, selectedIds]);

  // Bulk Initiate: updates the present position of every selected file via
  // PUT /api/projects/{projectId}/files/{fileId}. Reports per-file success/failure
  // counts via toast and refreshes the file register + summary afterwards.
  const handleBulkInitiate = async (input: {
    newPosition: string;
    changedBy: string;
    comment: string;
  }) => {
    const selected = filteredFiles.filter((f) => selectedIds.has(f.id));
    if (selected.length === 0) {
      toast({ title: "No files selected", variant: "destructive" });
      return;
    }
    const results = await Promise.all(
      selected.map((f) =>
        apiRequest(`/api/projects/${project.id}/files/${f.id}`, "PUT", {
          presentPosition: input.newPosition,
          comment: input.comment.trim() || `Bulk initiated → ${input.newPosition}`,
          changedBy: input.changedBy.trim() || "Officer",
        })
      )
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      toast({
        title: `Initiated ${selected.length} file(s) → ${input.newPosition}`,
        description: "Position updated for all selected files",
      });
    } else {
      toast({
        title: `${failed.length} of ${selected.length} update(s) failed`,
        description: failed[0]?.error,
        variant: "destructive",
      });
    }
    clearSelection();
    setBulkInitiateOpen(false);
    refresh();
    onChanged();
  };

  const handleDelete = async (file: ProjectFile) => {
    // Open the small archive (NFA) dialog asking for an optional reason.
    // The actual DELETE request (which archives by default) is fired from the
    // ArchiveNfaDialog's submit handler.
    setArchiveTarget(file);
  };

  // Restore an archived (NFA) file back to active — PUT with isArchived=false.
  const handleRestore = async (file: ProjectFile) => {
    const res = await apiRequest(`/api/projects/${project.id}/files/${file.id}`, "PUT", {
      isArchived: false,
    });
    if (res.ok) {
      toast({ title: "File restored from NFA archive" });
      refresh();
      onChanged();
    } else {
      toast({ title: "Restore failed", description: res.error, variant: "destructive" });
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

  // Single file row renderer — shared between the ungrouped view and the
  // "singles" list of the grouped view. Lives inside the component so it can
  // access setLogFile / setUpdateFile / handleDelete / project.id / refresh.
  const renderSingleFileRow = (f: ProjectFile) => {
    const hasFileNumber = !!(f.fileNumber && f.fileNumber.trim());
    const isSelected = selectedIds.has(f.id);
    const itemCost = (f.unitPrice || 0) * (f.qty || 0);
    const isArchived = !!f.isArchived;
    return (
      <TableRow
        key={f.id}
        className={cn(
          "border-border cursor-pointer hover:bg-secondary/40",
          isSelected && "bg-primary/[0.06]",
          isArchived && "opacity-60 bg-muted/30"
        )}
        onClick={() => setLogFile(f)}
      >
        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelect(f.id)}
            aria-label={`Select ${f.prNumber}`}
          />
        </TableCell>
        <TableCell className="font-mono text-xs text-foreground">
          <div className="flex items-center gap-1.5">
            {isArchived && <Archive className="h-3 w-3 text-muted-foreground shrink-0" />}
            {f.prNumber}
          </div>
        </TableCell>
        <TableCell>
          {hasFileNumber ? (
            <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400">
              <Hash className="h-3 w-3" />
              {f.fileNumber}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          {f.fileGroupKey && f.fileGroupKey.trim() ? (
            <span className="inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              <FolderKey className="h-3 w-3" />
              {f.fileGroupKey}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs">{f.itemCode}</TableCell>
        <TableCell className="text-foreground">{f.itemName}</TableCell>
        <TableCell className="text-right">{f.qty} {f.unit}</TableCell>
        <TableCell className="text-right">{formatCurrency(f.unitPrice)}</TableCell>
        <TableCell className="text-right text-foreground/90">{formatCurrency(itemCost)}</TableCell>
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
            {isArchived && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Archive className="h-2.5 w-2.5" />
                {f.archivedReason || "NFA — Archived"}
                {f.archivedAt && ` · ${new Date(f.archivedAt).toLocaleDateString("en-GB")}`}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell><CategoryBadge category={f.fileCategory} /></TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <QuickUpdatePopover
              files={[f]}
              projectId={project.id}
              onSaved={() => { refresh(); onChanged(); }}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setUpdateFile(f)} title="Edit File (full dialog)"><Pencil className="h-3.5 w-3.5" /></Button>
            {isArchived ? (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:text-emerald-500" onClick={() => handleRestore(f)} title="Restore from NFA archive"><ArchiveRestore className="h-3.5 w-3.5" /></Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400 hover:text-amber-500" onClick={() => handleDelete(f)} title="Archive (NFA)"><Archive className="h-3.5 w-3.5" /></Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

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
              <h2 className="font-semibold text-foreground text-sm sm:text-base truncate flex items-center gap-2">
                {project.name}
                {project.nameAbbreviation && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {project.nameAbbreviation}
                  </span>
                )}
              </h2>
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
                {/* Archived (NFA) toggle — ON shows archived files only (with muted styling + NFA badge) */}
                <Button
                  size="sm"
                  variant={showArchived ? "default" : "outline"}
                  onClick={() => setShowArchived((v) => !v)}
                  className={cn("gap-1.5", showArchived && "bg-amber-500/90 hover:bg-amber-500 text-white")}
                  title="Toggle between active and archived (NFA) files"
                >
                  <Archive className="h-4 w-4" />
                  {showArchived ? "Archived (NFA)" : "Show Archived (NFA)"}
                </Button>
                <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5"><Download className="h-4 w-4" /> Export</Button>
                <Button
                  size="sm"
                  variant={groupByFile ? "default" : "outline"}
                  onClick={() => setGroupByFile((v) => !v)}
                  className="gap-1.5"
                  title="Toggle grouping multiple items in the same file into a single row"
                >
                  <Files className="h-4 w-4" />
                  {groupByFile ? "Grouped by File" : "Group by File"}
                </Button>
                {!showArchived && (
                  <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add File</Button>
                )}
              </div>

              {/* Archived view banner — explains what the user is looking at */}
              {showArchived && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.06] px-4 py-2.5 flex items-center gap-2 text-sm">
                  <Archive className="h-4 w-4 text-amber-400" />
                  <span className="text-foreground">
                    Showing <span className="font-medium">archived (NFA)</span> files only. These are kept for historical reference and can be restored to active status.
                  </span>
                </div>
              )}

              {/* Selection bar — appears when at least one file is selected */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 flex-wrap rounded-lg border border-primary/40 bg-primary/[0.06] px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected</span>
                    {visibleSelectedCount < selectedIds.size && (
                      <span className="text-xs text-muted-foreground">
                        ({visibleSelectedCount} on this page)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 text-xs gap-1.5">
                      <X className="h-3.5 w-3.5" /> Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setBulkInitiateOpen(true)}
                      className="gap-1.5"
                      title="Move all selected files to a new present position"
                    >
                      <CheckSquare className="h-4 w-4" /> Initiate Selected
                    </Button>
                  </div>
                </div>
              )}

              {/* File register table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="text-muted-foreground w-10">
                          <Checkbox
                            checked={
                              allVisibleSelected
                                ? true
                                : someVisibleSelected
                                ? "indeterminate"
                                : false
                            }
                            onCheckedChange={toggleSelectAllVisible}
                            aria-label="Select all visible files"
                          />
                        </TableHead>
                        <SortTh label="PR Number" onClick={() => toggleSort("prNumber")} active={sortKey === "prNumber"} dir={sortDir} />
                        <TableHead className="text-muted-foreground">File Number</TableHead>
                        <TableHead className="text-muted-foreground">File Group</TableHead>
                        <TableHead className="text-muted-foreground">Item Code</TableHead>
                        <TableHead className="text-muted-foreground">Item Name</TableHead>
                        <TableHead className="text-muted-foreground text-right">Qty</TableHead>
                        <TableHead className="text-muted-foreground text-right">Unit Price</TableHead>
                        <TableHead className="text-muted-foreground text-right">Cost</TableHead>
                        <SortTh label="File Cost" onClick={() => toggleSort("fileCost")} active={sortKey === "fileCost"} dir={sortDir} align="right" />
                        <TableHead className="text-muted-foreground">Supplier</TableHead>
                        <TableHead className="text-muted-foreground">Position</TableHead>
                        <TableHead className="text-muted-foreground">Category</TableHead>
                        <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                      ) : filteredFiles.length === 0 ? (
                        <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">{showArchived ? "No archived (NFA) files found." : "No files found. Click \"Add File\" to create one."}</TableCell></TableRow>
                      ) : groupByFile && groupedView.groups.length > 0 ? (
                        <>
                          {groupedView.groups.map((g) => {
                            const expanded = expandedGroups.has(g.key);
                            const groupFileGroupKey = g.items[0]?.fileGroupKey || null;
                            const groupArchived = g.items.every((it) => it.isArchived);
                            return (
                              <Fragment key={g.key}>
                                {/* Group header (merged) row */}
                                <TableRow
                                  className={cn(
                                    "border-border bg-secondary/30 cursor-pointer hover:bg-secondary/50",
                                    groupArchived && "opacity-70 bg-muted/20"
                                  )}
                                  onClick={() => toggleGroup(g.key)}
                                >
                                  <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                                    {(() => {
                                      const groupIds = g.items.map((it) => it.id);
                                      const selCount = groupIds.filter((id) => selectedIds.has(id)).length;
                                      const checked = selCount === groupIds.length ? true : selCount > 0 ? "indeterminate" : false;
                                      return (
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={() => selectMany(groupIds, selCount !== groupIds.length)}
                                          aria-label={`Select all ${groupIds.length} items in group ${g.key}`}
                                        />
                                      );
                                    })()}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-foreground">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleGroup(g.key); }}
                                        className="text-muted-foreground hover:text-foreground shrink-0"
                                        aria-label={expanded ? "Collapse group" : "Expand group"}
                                      >
                                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </button>
                                      <Files className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="truncate">{g.key}</span>
                                      <CustomBadge className="border-0 bg-primary/15 text-primary">{g.items.length} items</CustomBadge>
                                      {groupArchived && (
                                        <CustomBadge className="border-0 bg-amber-500/15 text-amber-400">
                                          <Archive className="h-2.5 w-2.5 mr-1 inline" />NFA
                                        </CustomBadge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {g.commonFileNumber ? (
                                      <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400">
                                        <Hash className="h-3 w-3" />
                                        {g.commonFileNumber}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {groupFileGroupKey ? (
                                      <span className="inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                        <FolderKey className="h-3 w-3" />
                                        {groupFileGroupKey}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs italic">multiple</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground italic">multiple</TableCell>
                                  <TableCell className="text-foreground text-xs">
                                    {g.items[0]!.itemName}
                                    {g.items.length > 1 && (
                                      <span className="text-muted-foreground"> +{g.items.length - 1} more</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-xs">{g.totalQty} {g.commonUnit || ""}</TableCell>
                                  <TableCell className="text-right text-xs text-muted-foreground italic">varies</TableCell>
                                  <TableCell className="text-right text-xs text-muted-foreground italic">varies</TableCell>
                                  <TableCell className="text-right font-bold text-foreground">{formatCurrency(g.totalCost)}</TableCell>
                                  <TableCell className="text-xs">
                                    {g.commonSupplier ? (
                                      g.commonSupplier
                                    ) : (
                                      <span className="text-muted-foreground italic">multiple</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                      {g.commonPosition ? (
                                        <PositionBadge position={g.commonPosition} />
                                      ) : (
                                        <CustomBadge className="border-0 bg-amber-500/15 text-amber-400">mixed</CustomBadge>
                                      )}
                                      {g.commonResponsiblePerson && (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <User className="h-2.5 w-2.5" />
                                          {g.commonResponsiblePerson}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {g.commonCategory ? (
                                      <CategoryBadge category={g.commonCategory} />
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">multiple</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                      <QuickUpdatePopover
                                        files={g.items}
                                        projectId={project.id}
                                        onSaved={() => { refresh(); onChanged(); }}
                                        isGroup
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => toggleGroup(g.key)}
                                        title={expanded ? "Collapse items" : "Expand items"}
                                      >
                                        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {/* Expanded child rows */}
                                {expanded && g.items.map((f) => {
                                  const childSelected = selectedIds.has(f.id);
                                  const childCost = (f.unitPrice || 0) * (f.qty || 0);
                                  const childArchived = !!f.isArchived;
                                  return (
                                  <TableRow
                                    key={f.id}
                                    className={cn(
                                      "border-border bg-secondary/10 cursor-pointer hover:bg-secondary/30",
                                      childSelected && "bg-primary/[0.06]",
                                      childArchived && "opacity-60 bg-muted/20"
                                    )}
                                    onClick={() => setLogFile(f)}
                                  >
                                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                                      <Checkbox
                                        checked={childSelected}
                                        onCheckedChange={() => toggleSelect(f.id)}
                                        aria-label={`Select ${f.prNumber}`}
                                      />
                                    </TableCell>
                                    <TableCell className="pl-8 font-mono text-xs text-muted-foreground">
                                      <span className="inline-flex items-center gap-1.5">
                                        <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                                        {f.prNumber}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      {f.fileNumber && f.fileNumber.trim() ? (
                                        <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400">
                                          <Hash className="h-3 w-3" />
                                          {f.fileNumber}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {f.fileGroupKey && f.fileGroupKey.trim() ? (
                                        <span className="inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                          <FolderKey className="h-3 w-3" />
                                          {f.fileGroupKey}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{f.itemCode}</TableCell>
                                    <TableCell className="text-foreground text-xs">{f.itemName}</TableCell>
                                    <TableCell className="text-right text-xs">{f.qty} {f.unit}</TableCell>
                                    <TableCell className="text-right text-xs">{formatCurrency(f.unitPrice)}</TableCell>
                                    <TableCell className="text-right text-xs">{formatCurrency(childCost)}</TableCell>
                                    <TableCell className="text-right text-xs font-medium">{formatCurrency(f.fileCost)}</TableCell>
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
                                        {childArchived && (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Archive className="h-2.5 w-2.5" />
                                            {f.archivedReason || "NFA — Archived"}
                                            {f.archivedAt && ` · ${new Date(f.archivedAt).toLocaleDateString("en-GB")}`}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell><CategoryBadge category={f.fileCategory} /></TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                        <QuickUpdatePopover
                                          files={[f]}
                                          projectId={project.id}
                                          onSaved={() => { refresh(); onChanged(); }}
                                        />
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setUpdateFile(f)} title="Edit File (full dialog)"><Pencil className="h-3.5 w-3.5" /></Button>
                                        {childArchived ? (
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:text-emerald-500" onClick={() => handleRestore(f)} title="Restore from NFA archive"><ArchiveRestore className="h-3.5 w-3.5" /></Button>
                                        ) : (
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400 hover:text-amber-500" onClick={() => handleDelete(f)} title="Archive (NFA)"><Archive className="h-3.5 w-3.5" /></Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                          {/* Single-item rows (groups with only 1 item fall back to a normal row) */}
                          {groupedView.singles.map((f) => renderSingleFileRow(f))}
                        </>
                      ) : (
                        filteredFiles.map((f) => renderSingleFileRow(f))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {groupByFile && groupedView.groups.length > 0
                  ? `${groupedView.groups.length} grouped file(s) + ${groupedView.singles.length} single file(s) · Click a group row to expand its items · Click any row to view full log`
                  : `${filteredFiles.length} file(s) · Click any row to view full log · Use the pencil to open the full edit dialog`}
              </p>
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
      <FileLogDialog
        file={logFile}
        open={!!logFile}
        onOpenChange={(o) => !o && setLogFile(null)}
        onApprovalsChanged={() => { refresh(); onChanged(); }}
      />
      {/* Allocation History */}
      <AllocationHistoryDialog project={project} open={allocOpen} onOpenChange={setAllocOpen} onChanged={onChanged} />
      {/* Archive (NFA) reason-prompt dialog — opened via the Archive button on each file row */}
      {archiveTarget && (
        <ArchiveNfaDialog
          file={archiveTarget}
          projectId={project.id}
          open={!!archiveTarget}
          onOpenChange={(o) => !o && setArchiveTarget(null)}
          onArchived={() => {
            setArchiveTarget(null);
            refresh();
            onChanged();
          }}
        />
      )}
      {/* Bulk Initiate dialog — picks the target position then bulk-updates selected files.
          The `key` forces a fresh mount whenever the user opens the dialog with a
          different set of selections, so the suggested-next-position default refreshes. */}
      {bulkInitiateOpen && (
        <BulkInitiateDialog
          key={`bulk-${selectedIds.size}-${suggestedNextPosition}`}
          open={bulkInitiateOpen}
          onOpenChange={setBulkInitiateOpen}
          selectedCount={selectedIds.size}
          defaultPosition={suggestedNextPosition}
          onConfirm={handleBulkInitiate}
        />
      )}
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

// ─── Quick Update Position Popover (inline, lightweight) ───
// Used on every file row + every merged-group row. For groups, prompts the
// user to confirm updating all N items at once (since they share a position).
function QuickUpdatePopover({
  files,
  projectId,
  onSaved,
  isGroup,
}: {
  files: ProjectFile[];
  projectId: string;
  onSaved: () => void;
  isGroup?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [newPosition, setNewPosition] = useState<string>(files[0]?.presentPosition || "PR Raised");
  const [comment, setComment] = useState("");
  const [changedBy, setChangedBy] = useState("Officer");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const currentPosition = files[0]?.presentPosition || "";
  const positionChanged = newPosition !== currentPosition;
  const isMultiFile = isGroup && files.length > 1;

  const submit = async () => {
    if (!newPosition) {
      toast({ title: "Select a new position", variant: "destructive" });
      return;
    }
    if (isMultiFile) {
      const ok = window.confirm(`Update position for all ${files.length} items in this file?`);
      if (!ok) return;
    }
    setSaving(true);
    const defaultComment = positionChanged
      ? `Position changed: ${currentPosition} → ${newPosition}`
      : "Position updated";
    const results = await Promise.all(
      files.map((f) =>
        apiRequest(`/api/projects/${projectId}/files/${f.id}`, "PUT", {
          presentPosition: newPosition,
          comment: comment.trim() || defaultComment,
          changedBy: changedBy.trim() || "Officer",
        })
      )
    );
    setSaving(false);
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      toast({
        title: isMultiFile ? `Position updated for ${files.length} items` : "Position updated",
        description: positionChanged ? `${currentPosition} → ${newPosition}` : undefined,
      });
      setOpen(false);
      setComment("");
      setChangedBy("Officer");
      onSaved();
    } else {
      toast({
        title: `${failed.length} of ${files.length} update(s) failed`,
        description: failed[0]?.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={isMultiFile ? `Quick Update Position (all ${files.length} items)` : "Quick Update Position"}
          onClick={(e) => e.stopPropagation()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 bg-popover text-popover-foreground border-border"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Quick Update Position</h4>
          </div>
          <div className="bg-secondary/40 rounded-md p-2.5 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground">Current:</span>
              <PositionBadge position={currentPosition} />
            </div>
            <div className="text-[11px] text-muted-foreground">
              {files[0]?.prNumber} · {files[0]?.itemName}
              {isMultiFile && (
                <span className="text-foreground"> · {files.length} items in this file</span>
              )}
            </div>
            {isMultiFile && (
              <p className="text-amber-400 flex items-center gap-1 pt-0.5">
                <Files className="h-3 w-3" />
                Applies the new position to all {files.length} items in this file.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">New Position</Label>
            <Select value={newPosition} onValueChange={setNewPosition}>
              <SelectTrigger className="bg-background border-border h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESENT_POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Changed By</Label>
            <Input
              value={changedBy}
              onChange={(e) => setChangedBy(e.target.value)}
              placeholder="Your name / rank"
              className="bg-background border-border h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Comment (optional)</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={positionChanged ? `Position changed: ${currentPosition} → ${newPosition}` : "Optional note for log"}
              className="bg-background border-border h-9 text-sm"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Bulk Initiate Dialog (multi-select → pick target position → bulk PUT) ───
function BulkInitiateDialog({
  open,
  onOpenChange,
  selectedCount,
  defaultPosition,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedCount: number;
  defaultPosition: string;
  onConfirm: (input: { newPosition: string; changedBy: string; comment: string }) => Promise<void>;
}) {
  const [newPosition, setNewPosition] = useState(defaultPosition);
  const [changedBy, setChangedBy] = useState("Officer");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // The parent uses a `key` based on the selected count + suggested position to
  // remount this dialog whenever the user opens it with a fresh set of selections,
  // so `useState(defaultPosition)` always picks up the latest suggested position.

  const submit = async () => {
    if (!newPosition) {
      toast({ title: "Select a new position", variant: "destructive" });
      return;
    }
    if (selectedCount === 0) {
      toast({ title: "No files selected", variant: "destructive" });
      return;
    }
    setSaving(true);
    await onConfirm({ newPosition, changedBy, comment });
    setSaving(false);
    // Reset form after submit (parent closes the dialog)
    setComment("");
    setChangedBy("Officer");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Initiate Selected Files
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Move <span className="font-medium text-foreground">{selectedCount}</span> selected file{selectedCount === 1 ? "" : "s"} to a new present position. A log entry is created for each file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">New Position</Label>
            <Select value={newPosition} onValueChange={setNewPosition}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESENT_POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {defaultPosition && (
              <p className="text-[11px] text-muted-foreground">
                Suggested next position: <span className="text-foreground">{defaultPosition}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Changed By</Label>
            <Input
              value={changedBy}
              onChange={(e) => setChangedBy(e.target.value)}
              placeholder="Your name / rank"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Comment (optional)</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Bulk initiated → ${newPosition}`}
              className="bg-background border-border"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || selectedCount === 0} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
            Initiate {selectedCount} File{selectedCount === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Archive (NFA) Dialog — prompts for an optional reason before archiving ───
// DELETE /api/projects/[id]/files/[fileId] archives by default (sets isArchived,
// archivedReason, archivedAt). Use ?force=true to hard-delete — we never call
// that variant from this UI; archive is the only path.
function ArchiveNfaDialog({
  file,
  projectId,
  open,
  onOpenChange,
  onArchived,
}: {
  file: ProjectFile;
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onArchived: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    setSaving(true);
    const res = await apiRequest(`/api/projects/${projectId}/files/${file.id}`, "DELETE", {
      reason: reason.trim() || "NFA — Archived",
    });
    setSaving(false);
    if (res.ok) {
      toast({
        title: "File archived (NFA)",
        description: reason.trim()
          ? `Reason: ${reason.trim()}`
          : "Use the “Show Archived (NFA)” toggle to view archived files.",
      });
      setReason("");
      onArchived();
    } else {
      toast({ title: "Archive failed", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-400" />
            Archive (NFA) — {file.prNumber}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Archiving moves this file to the <span className="font-medium text-foreground">NFA (Not For Action)</span> archive. The file is kept for historical reference and can be restored later. The file will not appear in the active file register.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="bg-secondary/40 rounded-lg p-3 text-xs space-y-1">
            <div><span className="text-muted-foreground">PR Number:</span> <span className="font-mono text-foreground">{file.prNumber}</span></div>
            <div><span className="text-muted-foreground">Item:</span> <span className="text-foreground">{file.itemName}</span></div>
            <div><span className="text-muted-foreground">Item Code:</span> <span className="font-mono text-foreground">{file.itemCode}</span></div>
            {file.fileGroupKey && (
              <div><span className="text-muted-foreground">File Group:</span> <span className="font-mono text-primary">{file.fileGroupKey}</span></div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason for archiving (NFA)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate file, cancelled PR, superseded by newer file…"
              rows={3}
              className="bg-background border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              Optional — leave blank to use the default reason <span className="font-mono">“NFA — Archived”</span>.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="gap-1.5 bg-amber-500/90 hover:bg-amber-500 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Archive (NFA)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
