"use client";
import { Fragment, useState, useMemo, useRef } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { PositionBadge, CategoryBadge, CustomBadge, ProgressBadge } from "@/components/erp/badges";
import { EmptyState, LoadingState } from "@/components/erp/states";
import { FileLogDialog, ProjectFile } from "./file-log";
import { EstimateItemsTable } from "./estimate-items";
import {
  formatCurrency,
  PRESENT_POSITIONS,
  FILE_CATEGORIES,
  positionColor,
  estimateStatusColor,
  financialMeanColor,
  confidenceColor,
  FINANCIAL_MEANS,
  PROJECT_TYPES,
  PROJECT_STATUSES,
} from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
  Upload,
  FileSpreadsheet,
  Check,
  FileUp,
  Lock,
  Wand2,
  AlertCircle,
  Building2,
  Clock,
  SlidersHorizontal,
  ArrowLeft,
  RotateCcw,
  Columns,
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
  projectType?: string | null;
  financialMean?: string | null;
  requirementGroup?: string | null;
  department?: string | null;
  projectOfficer?: string | null;
  status?: string;
  description?: string | null;
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
  expectedDays?: number;
  expectedPercentage?: number;
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

type FileNumberFilter = "all" | "processing" | "pending" | "initiated";

const ACTUAL_POSITIONS = [
  "Payment Done",
  "Bill Sent for Payment",
  "Closed",
  "Complete",
  "Sent for Payment",
  "Paid",
  "Actual File",
];

function isActualPosition(pos: string) {
  if (!pos) return false;
  return ACTUAL_POSITIONS.some((p) => pos.toLowerCase().includes(p.toLowerCase()));
}

function checkIsOvertime(f: ProjectFile, flows?: ProcessFlow[] | null) {
  let expectedDays = 2;
  if (flows) {
    for (const flow of flows) {
      const step = flow.steps?.find((s) => s.positionName === f.presentPosition);
      if (step && step.expectedDays && step.expectedDays > 0) {
        expectedDays = step.expectedDays;
        break;
      }
    }
  }
  const lastLog = f.logs?.find((l) => l.newPosition === f.presentPosition);
  const changeTime = lastLog ? new Date(lastLog.changedAt).getTime() : new Date(f.createdAt).getTime();
  const daysInStep = (Date.now() - changeTime) / (1000 * 60 * 60 * 24);
  return daysInStep > expectedDays;
}

export type ColumnKey =
  | "prNumber"
  | "fileNumber"
  | "fileGroup"
  | "itemCode"
  | "itemName"
  | "qty"
  | "unitPrice"
  | "itemCost"
  | "fileCost"
  | "supplier"
  | "position"
  | "category"
  | "actions";

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultWidth: number;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "prNumber", label: "PR Number", defaultWidth: 120 },
  { key: "fileNumber", label: "File Number", defaultWidth: 130 },
  { key: "fileGroup", label: "File Group", defaultWidth: 110 },
  { key: "itemCode", label: "Item Code", defaultWidth: 100 },
  { key: "itemName", label: "Item Name", defaultWidth: 200 },
  { key: "qty", label: "Qty", defaultWidth: 90 },
  { key: "unitPrice", label: "Unit Price", defaultWidth: 110 },
  { key: "itemCost", label: "Item Cost", defaultWidth: 100 },
  { key: "fileCost", label: "Total Cost", defaultWidth: 120 },
  { key: "supplier", label: "Supplier", defaultWidth: 130 },
  { key: "position", label: "Position & Status", defaultWidth: 180 },
  { key: "category", label: "Category", defaultWidth: 110 },
  { key: "actions", label: "Actions", defaultWidth: 110 },
];

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
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ColumnKey | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Column customization state with persistence per user/profile
  const PP_COLUMNS_STORAGE_KEY = "ce-pp-table-columns-v2";

  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COLUMNS.map((c) => c.key);
    try {
      const stored = localStorage.getItem(`${PP_COLUMNS_STORAGE_KEY}-order`);
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnKey[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_COLUMNS.map((c) => c.key);
  });

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    if (typeof window === "undefined") return new Set(DEFAULT_COLUMNS.map((c) => c.key));
    try {
      const stored = localStorage.getItem(`${PP_COLUMNS_STORAGE_KEY}-visible`);
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnKey[];
        if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
      }
    } catch {
      // ignore
    }
    return new Set(DEFAULT_COLUMNS.map((c) => c.key));
  });

  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    const map = {} as Record<ColumnKey, number>;
    DEFAULT_COLUMNS.forEach((c) => (map[c.key] = c.defaultWidth));
    if (typeof window === "undefined") return map;
    try {
      const stored = localStorage.getItem(`${PP_COLUMNS_STORAGE_KEY}-widths`);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<ColumnKey, number>;
        if (parsed && typeof parsed === "object") return { ...map, ...parsed };
      }
    } catch {
      // ignore
    }
    return map;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`${PP_COLUMNS_STORAGE_KEY}-order`, JSON.stringify(columnOrder));
      localStorage.setItem(`${PP_COLUMNS_STORAGE_KEY}-visible`, JSON.stringify(Array.from(visibleColumns)));
      localStorage.setItem(`${PP_COLUMNS_STORAGE_KEY}-widths`, JSON.stringify(columnWidths));
    } catch {
      // ignore
    }
  }, [columnOrder, visibleColumns, columnWidths]);

  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const moveColumn = (key: ColumnKey, direction: "left" | "right") => {
    const idx = columnOrder.indexOf(key);
    if (idx < 0) return;
    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= columnOrder.length) return;
    const nextOrder = [...columnOrder];
    const temp = nextOrder[idx];
    nextOrder[idx] = nextOrder[newIdx];
    nextOrder[newIdx] = temp;
    setColumnOrder(nextOrder);
  };

  const toggleColumnVisibility = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const updateColumnWidth = (key: ColumnKey, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [key]: Math.max(50, Math.min(500, width)),
    }));
  };

  const resetColumnsToDefault = () => {
    setColumnOrder(DEFAULT_COLUMNS.map((c) => c.key));
    setVisibleColumns(new Set(DEFAULT_COLUMNS.map((c) => c.key)));
    const map = {} as Record<ColumnKey, number>;
    DEFAULT_COLUMNS.forEach((c) => (map[c.key] = c.defaultWidth));
    setColumnWidths(map);
    try {
      localStorage.removeItem(`${PP_COLUMNS_STORAGE_KEY}-order`);
      localStorage.removeItem(`${PP_COLUMNS_STORAGE_KEY}-visible`);
      localStorage.removeItem(`${PP_COLUMNS_STORAGE_KEY}-widths`);
    } catch {
      // ignore
    }
  };

  const activeColumns = useMemo(() => {
    return columnOrder
      .filter((k) => visibleColumns.has(k))
      .map((k) => DEFAULT_COLUMNS.find((c) => c.key === k)!)
      .filter(Boolean);
  }, [columnOrder, visibleColumns]);
  // Group-by-File (default ON) — merges items sharing the same PR/fileGroupKey into a single row
  const [groupByFile, setGroupByFile] = useState(true);
  // Tracks which group keys are expanded (showing their individual items)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Multi-select for bulk "Initiate Selected" — tracks selected ProjectFile IDs.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Bulk initiate dialog open state
  const [bulkInitiateOpen, setBulkInitiateOpen] = useState(false);
  // Bulk file upload dialog (uploads FILES into this project via pp.csv)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
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

  // PP sub-tab counts (All, Processing, Pending/Overtime, Just Initiated)
  const ppTabCounts = useMemo(() => {
    const all = files?.length || 0;
    const processing = files?.filter((f) => f.fileNumber && f.fileNumber.trim() && !isActualPosition(f.presentPosition)).length || 0;
    const pending = files?.filter((f) => checkIsOvertime(f, processFlows)).length || 0;
    const initiated = files?.filter((f) => !f.fileNumber || !f.fileNumber.trim()).length || 0;
    return { all, processing, pending, initiated };
  }, [files, processFlows]);

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
    if (fileNumberFilter === "processing") {
      list = list.filter((f) => f.fileNumber && f.fileNumber.trim() && !isActualPosition(f.presentPosition));
    } else if (fileNumberFilter === "pending") {
      list = list.filter((f) => checkIsOvertime(f, processFlows));
    } else if (fileNumberFilter === "initiated") {
      list = list.filter((f) => !f.fileNumber || !f.fileNumber.trim());
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "fileCost") cmp = a.fileCost - b.fileCost;
      else if (sortKey === "prNumber") cmp = a.prNumber.localeCompare(b.prNumber);
      else if (sortKey === "fileNumber") cmp = (a.fileNumber || "").localeCompare(b.fileNumber || "");
      else if (sortKey === "fileGroup") cmp = (a.fileGroupKey || "").localeCompare(b.fileGroupKey || "");
      else if (sortKey === "itemCode") cmp = a.itemCode.localeCompare(b.itemCode);
      else if (sortKey === "itemName") cmp = a.itemName.localeCompare(b.itemName);
      else if (sortKey === "qty") cmp = a.qty - b.qty;
      else if (sortKey === "unitPrice") cmp = a.unitPrice - b.unitPrice;
      else if (sortKey === "itemCost") cmp = (a.unitPrice || 0) * (a.qty || 0) - (b.unitPrice || 0) * (b.qty || 0);
      else if (sortKey === "supplier") cmp = (a.supplier || "").localeCompare(b.supplier || "");
      else if (sortKey === "position") cmp = a.presentPosition.localeCompare(b.presentPosition);
      else if (sortKey === "category") cmp = a.fileCategory.localeCompare(b.fileCategory);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [files, search, positionFilter, fileNumberFilter, sortKey, sortDir, processFlows]);

  const toggleSort = (key: ColumnKey | "createdAt") => {
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

  // Bulk Archive handler for active view
  const handleBulkArchive = async () => {
    const selected = filteredFiles.filter((f) => selectedIds.has(f.id));
    if (selected.length === 0) return;
    const results = await Promise.all(
      selected.map((f) =>
        apiRequest(`/api/projects/${project.id}/files/${f.id}`, "PUT", {
          isArchived: true,
          archivedReason: "NFA — Bulk Archived",
        })
      )
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      toast({
        title: `Archived ${selected.length} file(s) to NFA`,
        description: "Selected files moved to NFA archive",
      });
    } else {
      toast({
        title: `${failed.length} of ${selected.length} archive action(s) failed`,
        variant: "destructive",
      });
    }
    clearSelection();
    refresh();
    onChanged();
  };

  // Bulk Permanent Delete handler for archive view
  const handleBulkPermanentDelete = async () => {
    const selected = filteredFiles.filter((f) => selectedIds.has(f.id));
    if (selected.length === 0) return;
    const results = await Promise.all(
      selected.map((f) =>
        apiRequest(`/api/projects/${project.id}/files/${f.id}?force=true`, "DELETE")
      )
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      toast({
        title: `Permanently deleted ${selected.length} archived file(s)`,
        description: "The files were permanently removed from database",
      });
    } else {
      toast({
        title: `${failed.length} of ${selected.length} delete action(s) failed`,
        variant: "destructive",
      });
    }
    setBulkDeleteConfirmOpen(false);
    clearSelection();
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

  const cellStyle = (colKey: ColumnKey) => ({
    width: columnWidths[colKey],
    minWidth: columnWidths[colKey],
    maxWidth: columnWidths[colKey],
  });

  const renderCellForKey = (colKey: ColumnKey, f: ProjectFile) => {
    const isArchived = !!f.isArchived;
    const hasFileNumber = !!(f.fileNumber && f.fileNumber.trim());
    const itemCost = (f.unitPrice || 0) * (f.qty || 0);

    switch (colKey) {
      case "prNumber":
        return (
          <TableCell key="prNumber" style={cellStyle("prNumber")} className="font-mono text-xs text-foreground truncate">
            <div className="flex items-center gap-1.5 truncate">
              {isArchived && <Archive className="h-3 w-3 text-muted-foreground shrink-0" />}
              {hasFileNumber ? <span className="text-muted-foreground">—</span> : f.prNumber}
            </div>
          </TableCell>
        );
      case "fileNumber":
        return (
          <TableCell key="fileNumber" style={cellStyle("fileNumber")} className="truncate">
            {hasFileNumber ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400 truncate">
                <Hash className="h-3 w-3 shrink-0" />
                {f.fileNumber}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        );
      case "fileGroup":
        return (
          <TableCell key="fileGroup" style={cellStyle("fileGroup")} className="truncate">
            {f.fileGroupKey && f.fileGroupKey.trim() ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 truncate">
                <FolderKey className="h-3 w-3 shrink-0" />
                {f.fileGroupKey}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        );
      case "itemCode":
        return (
          <TableCell key="itemCode" style={cellStyle("itemCode")} className="font-mono text-xs truncate">
            {f.itemCode}
          </TableCell>
        );
      case "itemName":
        return (
          <TableCell key="itemName" style={cellStyle("itemName")} className="text-foreground truncate" title={f.itemName}>
            {f.itemName}
          </TableCell>
        );
      case "qty":
        return (
          <TableCell key="qty" style={cellStyle("qty")} className="text-right truncate">
            {f.qty} {f.unit}
          </TableCell>
        );
      case "unitPrice":
        return (
          <TableCell key="unitPrice" style={cellStyle("unitPrice")} className="text-right truncate">
            {formatCurrency(f.unitPrice)}
          </TableCell>
        );
      case "itemCost":
        return (
          <TableCell key="itemCost" style={cellStyle("itemCost")} className="text-right text-foreground/90 truncate">
            {formatCurrency(itemCost)}
          </TableCell>
        );
      case "fileCost":
        return (
          <TableCell key="fileCost" style={cellStyle("fileCost")} className="text-right font-medium text-foreground truncate">
            {formatCurrency(f.fileCost)}
          </TableCell>
        );
      case "supplier":
        return (
          <TableCell key="supplier" style={cellStyle("supplier")} className="text-xs truncate" title={f.supplier || ""}>
            {f.supplier || "—"}
          </TableCell>
        );
      case "position":
        return (
          <TableCell key="position" style={cellStyle("position")}>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <ProgressBadge progress={f.progressPercentage || 0} />
                <PositionBadge position={f.presentPosition} />
              </div>
              {f.responsiblePerson && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <User className="h-2.5 w-2.5 shrink-0" />
                  {f.responsiblePerson}
                </span>
              )}
              {isArchived && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <Archive className="h-2.5 w-2.5 shrink-0" />
                  {f.archivedReason || "NFA — Archived"}
                  {f.archivedAt && ` · ${new Date(f.archivedAt).toLocaleDateString("en-GB")}`}
                </span>
              )}
            </div>
          </TableCell>
        );
      case "category":
        return (
          <TableCell key="category" style={cellStyle("category")}>
            <CategoryBadge category={f.fileCategory} />
          </TableCell>
        );
      case "actions":
        return (
          <TableCell key="actions" style={cellStyle("actions")} className="text-right">
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <QuickUpdatePopover
                files={[f]}
                projectId={project.id}
                onSaved={() => { refresh(); onChanged(); }}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setUpdateFile(f)} title="Edit File (full dialog)">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {isArchived ? (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:text-emerald-500" onClick={() => handleRestore(f)} title="Restore from NFA archive">
                  <ArchiveRestore className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400 hover:text-amber-500" onClick={() => handleDelete(f)} title="Archive (NFA)">
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </TableCell>
        );
    }
  };

  const renderGroupCellForKey = (colKey: ColumnKey, g: FileGroup) => {
    const groupFileGroupKey = g.items[0]?.fileGroupKey || null;
    const groupArchived = g.items.every((it) => it.isArchived);
    const expanded = expandedGroups.has(g.key);

    switch (colKey) {
      case "prNumber":
        return (
          <TableCell key="prNumber" style={cellStyle("prNumber")} className="font-mono text-xs text-foreground truncate">
            <div className="flex items-center gap-2 truncate">
              <button
                onClick={(e) => { e.stopPropagation(); toggleGroup(g.key); }}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label={expanded ? "Collapse group" : "Expand group"}
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <Files className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{g.key}</span>
              <CustomBadge className="border-0 bg-primary/15 text-primary shrink-0">{g.items.length} items</CustomBadge>
              {groupArchived && (
                <CustomBadge className="border-0 bg-amber-500/15 text-amber-400 shrink-0">
                  <Archive className="h-2.5 w-2.5 mr-1 inline" />NFA
                </CustomBadge>
              )}
            </div>
          </TableCell>
        );
      case "fileNumber":
        return (
          <TableCell key="fileNumber" style={cellStyle("fileNumber")} className="truncate">
            {g.commonFileNumber ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400 truncate">
                <Hash className="h-3 w-3 shrink-0" />
                {g.commonFileNumber}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        );
      case "fileGroup":
        return (
          <TableCell key="fileGroup" style={cellStyle("fileGroup")} className="truncate">
            {groupFileGroupKey ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 truncate">
                <FolderKey className="h-3 w-3 shrink-0" />
                {groupFileGroupKey}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs italic">multiple</span>
            )}
          </TableCell>
        );
      case "itemCode":
        return <TableCell key="itemCode" style={cellStyle("itemCode")} className="text-xs text-muted-foreground italic truncate">multiple</TableCell>;
      case "itemName":
        return (
          <TableCell key="itemName" style={cellStyle("itemName")} className="text-foreground text-xs truncate" title={g.items[0]!.itemName}>
            {g.items[0]!.itemName}
            {g.items.length > 1 && <span className="text-muted-foreground"> +{g.items.length - 1} more</span>}
          </TableCell>
        );
      case "qty":
        return <TableCell key="qty" style={cellStyle("qty")} className="text-right text-xs truncate">{g.totalQty} {g.commonUnit || ""}</TableCell>;
      case "unitPrice":
        return <TableCell key="unitPrice" style={cellStyle("unitPrice")} className="text-right text-xs text-muted-foreground italic truncate">varies</TableCell>;
      case "itemCost":
        return <TableCell key="itemCost" style={cellStyle("itemCost")} className="text-right text-xs text-muted-foreground italic truncate">varies</TableCell>;
      case "fileCost":
        return <TableCell key="fileCost" style={cellStyle("fileCost")} className="text-right font-bold text-foreground truncate">{formatCurrency(g.totalCost)}</TableCell>;
      case "supplier":
        return (
          <TableCell key="supplier" style={cellStyle("supplier")} className="text-xs truncate">
            {g.commonSupplier ? g.commonSupplier : <span className="text-muted-foreground italic">multiple</span>}
          </TableCell>
        );
      case "position":
        return (
          <TableCell key="position" style={cellStyle("position")}>
            <div className="flex flex-col gap-0.5">
              {g.commonPosition ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ProgressBadge progress={g.items[0]?.progressPercentage || 0} />
                  <PositionBadge position={g.commonPosition} />
                </div>
              ) : (
                <CustomBadge className="border-0 bg-amber-500/15 text-amber-400">mixed</CustomBadge>
              )}
              {g.commonResponsiblePerson && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <User className="h-2.5 w-2.5 shrink-0" />
                  {g.commonResponsiblePerson}
                </span>
              )}
            </div>
          </TableCell>
        );
      case "category":
        return (
          <TableCell key="category" style={cellStyle("category")}>
            {g.commonCategory ? <CategoryBadge category={g.commonCategory} /> : <span className="text-xs text-muted-foreground italic">multiple</span>}
          </TableCell>
        );
      case "actions":
        return (
          <TableCell key="actions" style={cellStyle("actions")} className="text-right">
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
        );
    }
  };

  const renderChildCellForKey = (colKey: ColumnKey, f: ProjectFile) => {
    const childCost = (f.unitPrice || 0) * (f.qty || 0);
    const childArchived = !!f.isArchived;

    switch (colKey) {
      case "prNumber":
        return (
          <TableCell key="prNumber" style={cellStyle("prNumber")} className="pl-8 font-mono text-xs text-muted-foreground truncate">
            <span className="inline-flex items-center gap-1.5 truncate">
              <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              {f.fileNumber && f.fileNumber.trim() ? "—" : f.prNumber}
            </span>
          </TableCell>
        );
      case "fileNumber":
        return (
          <TableCell key="fileNumber" style={cellStyle("fileNumber")} className="truncate">
            {f.fileNumber && f.fileNumber.trim() ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400 truncate">
                <Hash className="h-3 w-3 shrink-0" />
                {f.fileNumber}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        );
      case "fileGroup":
        return (
          <TableCell key="fileGroup" style={cellStyle("fileGroup")} className="truncate">
            {f.fileGroupKey && f.fileGroupKey.trim() ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 truncate">
                <FolderKey className="h-3 w-3 shrink-0" />
                {f.fileGroupKey}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        );
      case "itemCode":
        return <TableCell key="itemCode" style={cellStyle("itemCode")} className="font-mono text-xs truncate">{f.itemCode}</TableCell>;
      case "itemName":
        return <TableCell key="itemName" style={cellStyle("itemName")} className="text-foreground text-xs truncate" title={f.itemName}>{f.itemName}</TableCell>;
      case "qty":
        return <TableCell key="qty" style={cellStyle("qty")} className="text-right text-xs truncate">{f.qty} {f.unit}</TableCell>;
      case "unitPrice":
        return <TableCell key="unitPrice" style={cellStyle("unitPrice")} className="text-right text-xs truncate">{formatCurrency(f.unitPrice)}</TableCell>;
      case "itemCost":
        return <TableCell key="itemCost" style={cellStyle("itemCost")} className="text-right text-xs truncate">{formatCurrency(childCost)}</TableCell>;
      case "fileCost":
        return <TableCell key="fileCost" style={cellStyle("fileCost")} className="text-right text-xs font-medium truncate">{formatCurrency(f.fileCost)}</TableCell>;
      case "supplier":
        return <TableCell key="supplier" style={cellStyle("supplier")} className="text-xs truncate" title={f.supplier || ""}>{f.supplier || "—"}</TableCell>;
      case "position":
        return (
          <TableCell key="position" style={cellStyle("position")}>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <ProgressBadge progress={f.progressPercentage || 0} />
                <PositionBadge position={f.presentPosition} />
              </div>
              {f.responsiblePerson && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <User className="h-2.5 w-2.5 shrink-0" />
                  {f.responsiblePerson}
                </span>
              )}
              {childArchived && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <Archive className="h-2.5 w-2.5 shrink-0" />
                  {f.archivedReason || "NFA — Archived"}
                  {f.archivedAt && ` · ${new Date(f.archivedAt).toLocaleDateString("en-GB")}`}
                </span>
              )}
            </div>
          </TableCell>
        );
      case "category":
        return <TableCell key="category" style={cellStyle("category")}><CategoryBadge category={f.fileCategory} /></TableCell>;
      case "actions":
        return (
          <TableCell key="actions" style={cellStyle("actions")} className="text-right">
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
        );
    }
  };

  // Single file row renderer — shared between the ungrouped view and the
  // "singles" list of the grouped view. Lives inside the component so it can
  // access setLogFile / setUpdateFile / handleDelete / project.id / refresh.
  const renderSingleFileRow = (f: ProjectFile) => {
    const isSelected = selectedIds.has(f.id);
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
        {activeColumns.map((col) => renderCellForKey(col.key, f))}
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
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Close project window">
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground text-sm sm:text-base truncate flex items-center gap-2 flex-wrap">
                <span className="truncate">{project.name}</span>
                {project.nameAbbreviation && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {project.nameAbbreviation}
                  </span>
                )}
                {project.financialMean && (
                  <CustomBadge className={cn("border", financialMeanColor(project.financialMean))}>
                    {project.financialMean}
                  </CustomBadge>
                )}
                {project.projectType && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    · {project.projectType}
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <span className="font-mono">{project.voteNumber || "—"}</span>
                </span>
                {project.benefactor && ` · Benefactor: ${project.benefactor}`}
                {project.reference && ` · Ref: ${project.reference}`}
                {project.endDate && ` · EDC: ${new Date(project.endDate).toLocaleDateString("en-GB")}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditProjectOpen(true)} className="gap-1.5">
              <Pencil className="h-4 w-4" /> Edit Project
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAllocOpen(true)} className="gap-1.5">
              <History className="h-4 w-4" /> Allocations
            </Button>
          </div>
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
          {/* Position summary */}
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
                <MiniStat label="Initiated from Estimate" value={String(initiatedCount)} sub="raised PRs" tone="text-violet-400" />
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
                    label={`All (${ppTabCounts.all})`}
                    active={fileNumberFilter === "all"}
                    onClick={() => setFileNumberFilter("all")}
                  />
                  <FilterPill
                    label={`Processing Files (${ppTabCounts.processing})`}
                    active={fileNumberFilter === "processing"}
                    onClick={() => setFileNumberFilter("processing")}
                  />
                  <FilterPill
                    label={`Pending (Overtime) (${ppTabCounts.pending})`}
                    active={fileNumberFilter === "pending"}
                    onClick={() => setFileNumberFilter("pending")}
                  />
                  <FilterPill
                    label={`Just Initiated (${ppTabCounts.initiated})`}
                    active={fileNumberFilter === "initiated"}
                    onClick={() => setFileNumberFilter("initiated")}
                  />
                </div>
                {/* Column Customization Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5" title="Customize visible columns, width, and order">
                      <Columns className="h-4 w-4" />
                      Columns ({visibleColumns.size}/{columnOrder.length})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3 space-y-3" align="end">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Customize Columns
                      </span>
                      <Button variant="ghost" size="sm" onClick={resetColumnsToDefault} className="h-6 text-[10px] gap-1 px-1.5">
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {columnOrder.map((colKey, idx) => {
                        const colDef = DEFAULT_COLUMNS.find((c) => c.key === colKey)!;
                        const isVisible = visibleColumns.has(colKey);
                        return (
                          <div key={colKey} className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-muted/50 text-xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Checkbox
                                checked={isVisible}
                                onCheckedChange={() => toggleColumnVisibility(colKey)}
                                id={`col-${colKey}`}
                              />
                              <label htmlFor={`col-${colKey}`} className="truncate cursor-pointer font-medium select-none">
                                {colDef.label}
                              </label>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                value={columnWidths[colKey]}
                                onChange={(e) => updateColumnWidth(colKey, Number(e.target.value))}
                                className="w-12 h-6 px-1 text-[10px] rounded border border-border bg-background text-right font-mono"
                                title="Width (px)"
                              />
                              <span className="text-[10px] text-muted-foreground">px</span>
                              <div className="flex items-center gap-0.5 ml-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  disabled={idx === 0}
                                  onClick={() => moveColumn(colKey, "left")}
                                  title="Move column left"
                                >
                                  <ArrowLeft className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  disabled={idx === columnOrder.length - 1}
                                  onClick={() => moveColumn(colKey, "right")}
                                  title="Move column right"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Archived (NFA) toggle */}
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
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBulkUploadOpen(true)}
                      className="gap-1.5"
                      title="Bulk upload multiple files into this project using the pp.csv template"
                    >
                      <Upload className="h-4 w-4" /> Upload Bulk
                    </Button>
                    <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add File</Button>
                  </>
                )}
              </div>

              {/* Archived view banner */}
              {showArchived && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.06] px-4 py-2.5 flex items-center gap-2 text-sm">
                  <Archive className="h-4 w-4 text-amber-400" />
                  <span className="text-foreground">
                    Showing <span className="font-medium">archived (NFA)</span> files only. These are kept for historical reference and can be restored to active status or permanently removed.
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
                    {!showArchived ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkArchive}
                          className="h-8 text-xs gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                          title="Archive selected files (NFA)"
                        >
                          <Archive className="h-3.5 w-3.5" /> Archive Selected (NFA)
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setBulkInitiateOpen(true)}
                          className="h-8 text-xs gap-1.5"
                          title="Move all selected files to a new present position"
                        >
                          <CheckSquare className="h-3.5 w-3.5" /> Initiate Selected
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setBulkDeleteConfirmOpen(true)}
                        className="h-8 text-xs gap-1.5"
                        title="Permanently remove selected files from database"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Selected Permanently
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* File register table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
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
                        {activeColumns.map((col) => (
                          <TableHead
                            key={col.key}
                            style={{
                              width: columnWidths[col.key],
                              minWidth: columnWidths[col.key],
                              maxWidth: columnWidths[col.key],
                            }}
                            className={cn(
                              "text-muted-foreground truncate",
                              ["qty", "unitPrice", "itemCost", "fileCost", "actions"].includes(col.key) && "text-right"
                            )}
                          >
                            {col.key === "actions" ? (
                              "Actions"
                            ) : (
                              <SortTh
                                label={col.label}
                                onClick={() => toggleSort(col.key)}
                                active={sortKey === col.key}
                                dir={sortDir}
                              />
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={activeColumns.length + 1} className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                      ) : filteredFiles.length === 0 ? (
                        <TableRow><TableCell colSpan={activeColumns.length + 1} className="text-center py-8 text-muted-foreground">{showArchived ? "No archived (NFA) files found." : "No files found. Click \"Add File\" to create one."}</TableCell></TableRow>
                      ) : groupByFile && groupedView.groups.length > 0 ? (
                        <>
                          {groupedView.groups.map((g) => {
                            const expanded = expandedGroups.has(g.key);
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
                                  {activeColumns.map((col) => renderGroupCellForKey(col.key, g))}
                                </TableRow>
                                {/* Expanded child rows */}
                                {expanded && g.items.map((f) => {
                                  const childSelected = selectedIds.has(f.id);
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
                                      {activeColumns.map((col) => renderChildCellForKey(col.key, f))}
                                    </TableRow>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                          {/* Single-item rows */}
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
              <div className="bg-secondary/40 rounded-lg p-3 flex items-start gap-2 flex-wrap">
                <FileSignature className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  Items pending PR initiation from processed estimates. Click <span className="font-medium text-primary">Initiate File</span> to raise a PR. The item&apos;s status updates in place (Pending → Initiated) and <span className="font-medium text-primary">you stay on this tab</span> — no auto-jump. The raised file appears in the &quot;PR Raised Files&quot; tab when you choose to switch.
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
      {/* Bulk Files Upload dialog — uploads multiple FILES into this project
          via the pp.csv template (file-level bulk upload). Saves the source
          CSV file to /api/upload, then POSTs the parsed rows to
          /api/projects/[id]/files/bulk which auto-generates file group keys. */}
      <BulkFilesUploadDialog
        projectId={project.id}
        projectName={project.name}
        projectAbbreviation={project.nameAbbreviation || null}
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onImported={() => {
          setBulkUploadOpen(false);
          refresh();
          onChanged();
        }}
      />
      {/* Bulk Delete Confirm for Archived View */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Permanently Delete Files?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <span className="font-semibold text-foreground">{selectedIds.size}</span> selected archived file(s)? This action will remove them completely from the database and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkPermanentDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Edit Project Data dialog */}
      <EditProjectDataDialog
        project={project}
        open={editProjectOpen}
        onOpenChange={setEditProjectOpen}
        onSaved={() => {
          refresh();
          onChanged();
        }}
      />
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

function SortTh({ label, onClick, active, dir }: { label: string; onClick: () => void; active: boolean; dir: "asc" | "desc" }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      {active && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );
}

// ─── Edit Project Data Dialog (allows editing all project fields) ───
function EditProjectDataDialog({
  project,
  open,
  onOpenChange,
  onSaved,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: project.name || "",
    nameAbbreviation: project.nameAbbreviation || "",
    voteNumber: project.voteNumber || "",
    voteAllocation: String(project.voteAllocation || 0),
    department: project.department || "",
    benefactor: project.benefactor || "",
    reference: project.reference || "",
    projectType: project.projectType || "New Construction",
    financialMean: project.financialMean || "Vote/Funds",
    projectOfficer: project.projectOfficer || "",
    status: project.status || "Active",
    startDate: project.startDate ? project.startDate.slice(0, 10) : "",
    endDate: project.endDate ? project.endDate.slice(0, 10) : "",
    description: project.description || "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!form.name.trim() || !form.voteNumber.trim()) {
      toast({ title: "Project Name and Vote Number are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await apiRequest(`/api/projects/${project.id}`, "PUT", {
      name: form.name.trim(),
      nameAbbreviation: form.nameAbbreviation.trim() || null,
      voteNumber: form.voteNumber.trim(),
      voteAllocation: Number(form.voteAllocation) || 0,
      department: form.department.trim() || null,
      benefactor: form.benefactor.trim() || null,
      reference: form.reference.trim() || null,
      projectType: form.projectType,
      financialMean: form.financialMean,
      projectOfficer: form.projectOfficer.trim() || null,
      status: form.status,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      description: form.description.trim() || null,
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Project updated successfully" });
      onSaved();
      onOpenChange(false);
    } else {
      toast({ title: "Failed to update project", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" /> Edit Project Data
          </DialogTitle>
          <DialogDescription>
            Modify core project details, financial delegation, and schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2">
            <Field label="Project Name *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-background border-border" />
            </Field>
          </div>
          <Field label="Abbreviation (Key Prefix)">
            <Input value={form.nameAbbreviation} onChange={(e) => setForm({ ...form, nameAbbreviation: e.target.value })} placeholder="e.g. NSH" className="bg-background border-border font-mono" />
          </Field>
          <Field label="Vote Number *">
            <Input value={form.voteNumber} onChange={(e) => setForm({ ...form, voteNumber: e.target.value })} placeholder="e.g. 223-1-01-2104" className="bg-background border-border font-mono" />
          </Field>
          <Field label="Vote Allocation (LKR)">
            <Input type="number" value={form.voteAllocation} onChange={(e) => setForm({ ...form, voteAllocation: e.target.value })} className="bg-background border-border font-mono" />
          </Field>
          <Field label="Financial Mean / Source">
            <Select value={form.financialMean} onValueChange={(v) => setForm({ ...form, financialMean: v })}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{FINANCIAL_MEANS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Project Type">
            <Select value={form.projectType} onValueChange={(v) => setForm({ ...form, projectType: v })}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Department">
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Department" className="bg-background border-border" />
          </Field>
          <Field label="Benefactor / Customer">
            <Input value={form.benefactor} onChange={(e) => setForm({ ...form, benefactor: e.target.value })} placeholder="Benefactor" className="bg-background border-border" />
          </Field>
          <Field label="Reference Number">
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Reference" className="bg-background border-border" />
          </Field>
          <Field label="Project Officer">
            <Input value={form.projectOfficer} onChange={(e) => setForm({ ...form, projectOfficer: e.target.value })} placeholder="Officer in charge" className="bg-background border-border" />
          </Field>
          <Field label="Start Date">
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="bg-background border-border" />
          </Field>
          <Field label="EDC / End Date">
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="bg-background border-border" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-background border-border resize-none" />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Project Data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [progressPercentage, setProgressPercentage] = useState<number>(file.progressPercentage || 0);
  const [suggesting, setSuggesting] = useState(false);
  const [changedBy, setChangedBy] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleAiSuggestProgress = async () => {
    setSuggesting(true);
    try {
      const res = await fetch(`/api/process-flows/suggest?fileCategory=${encodeURIComponent(file.fileCategory || "General")}&fileCost=${file.fileCost || 0}&currentPosition=${encodeURIComponent(nextPosition)}`);
      const data = await res.json();
      if (data.currentProgress !== undefined) {
        setProgressPercentage(data.currentProgress);
        toast({ title: "AI Insight Applied", description: `Progress set to ${data.currentProgress}% based on process flow rules.` });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  };

  // When the user picks a different next position, prefill the responsible person
  // from the process-flow defaults — but only if the user hasn't manually overridden.
  const defaultForCurrent = positionToResponsible.get(currentPosition) || "";
  const defaultForNext = positionToResponsible.get(nextPosition) || "";

  const handleNextPositionChange = async (v: string) => {
    setNextPosition(v);
    const isUsingDefault = responsiblePerson === defaultForCurrent || responsiblePerson === "";
    if (isUsingDefault) {
      const newDefault = positionToResponsible.get(v) || "";
      setResponsiblePerson(newDefault);
    }
    // Auto-recalculate progress for the new position
    try {
      const res = await fetch(`/api/process-flows/suggest?fileCategory=${encodeURIComponent(file.fileCategory || "General")}&fileCost=${file.fileCost || 0}&currentPosition=${encodeURIComponent(v)}`);
      const data = await res.json();
      if (data.currentProgress !== undefined) {
        setProgressPercentage(data.currentProgress);
      }
    } catch {
      /* ignore */
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
      fileNumber: fileNumber.trim() || null,
      supplier: supplier.trim() || null,
      presentPosition: nextPosition,
      progressPercentage: Number(progressPercentage) || 0,
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
              <UserCheck className="h-3.5 w-3.5" /> Responsible Person & Progress
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Responsible Person (defaults from Process Flow)">
                <Input
                  value={responsiblePerson}
                  onChange={(e) => setResponsiblePerson(e.target.value)}
                  placeholder={defaultForNext || "e.g. Cdr. R. Perera"}
                  className="bg-background border-border"
                />
              </Field>
              <Field label="Progress Percentage (%)">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={progressPercentage}
                    onChange={(e) => setProgressPercentage(Number(e.target.value))}
                    className="bg-background border-border font-mono w-28"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiSuggestProgress}
                    disabled={suggesting}
                    className="gap-1 text-xs border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 shrink-0"
                    title="Auto-calculate progress from matching Process Flow"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Insight
                  </Button>
                </div>
              </Field>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1">
              <User className="h-3 w-3 mt-0.5 shrink-0" />
              Auto-filled from Process Flow rules for the selected position. Adjust percentage manually or click AI Insight to recalculate.
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

// ─── Bulk Files Upload Dialog (file-level bulk upload into a project) ───
// New CSV column order (pp.csv):
//   File Group Key, PR Number, File Number, Item Name, Deno, Qty, Unit Cost,
//   Present Position, Supplier
//
// Total Cost, File Cost, and Category are auto-generated/selected (NOT in CSV).
// AI Variation Matching: Item Name, Present Position, and Supplier are matched
// against the canonical item master, PRESENT_POSITIONS list, and supplier
// directory via POST /api/projects/[id]/files/bulk-match (z-ai-web-dev-sdk
// server-side). After matching, rows are grouped by their File Group Key
// (rows sharing a key collapse into a single grouped file in the register).
interface BulkFileRow {
  FileGroupKey: string;
  PRNumber: string;
  FileNumber: string;
  ItemName: string;
  Deno: string;
  Qty: string;
  UnitCost: string;
  PresentPosition: string;
  Supplier: string;
}

const BULK_FILE_CSV_COLUMNS: (keyof BulkFileRow)[] = [
  "FileGroupKey",
  "PRNumber",
  "FileNumber",
  "ItemName",
  "Deno",
  "Qty",
  "UnitCost",
  "PresentPosition",
  "Supplier",
];

// Mirrors BulkMatchResultRow from @/lib/ai (declared locally to keep this
// file client-only — the AI lib imports server-only modules).
interface BulkMatchResult {
  rowIndex: number;
  fileGroupKey: string;
  prNumber: string;
  fileNumber: string;
  originalItemName: string;
  originalPresentPosition: string;
  originalSupplier: string;
  matchedItemName: string;
  matchedItemCode: string | null;
  matchedPresentPosition: string;
  matchedSupplier: string;
  itemNameConfidence: "high" | "medium" | "low" | "none";
  positionConfidence: "high" | "medium" | "low" | "none";
  supplierConfidence: "high" | "medium" | "low" | "none";
  overallConfidence: "high" | "medium" | "low" | "none";
  notes: string;
}

// Auto-select a category based on the item name keywords. Falls back to "General".
function autoSelectCategory(itemName: string): string {
  const n = (itemName || "").toLowerCase();
  if (/\b(bms|battery management)\b/.test(n)) return "BMS";
  if (/(pump|valve|pipe|fitting|flange|gasket|elbow|reducer|strainer|coupling)/.test(n)) return "Plumbing";
  if (/(paint|primer|thinner|enamel|epoxy|coating)/.test(n)) return "Paint";
  if (/(aluminium|aluminum)/.test(n)) return "Aluminium";
  if (/(metal|steel|\bss\b|\bms\b|\bgi\b|iron)/.test(n)) return "Metal";
  if (/(cable|wire|led|light|bulb|lamp|fixture|switch|socket|breaker|contactor|relay|motor|alternator)/.test(n)) return "Electrical";
  if (/(tool|spanner|wrench|hammer|drill|saw|grinder|screwdriver|plier)/.test(n)) return "Tools";
  if (/(oil|lubricant|grease|hydraulic)/.test(n)) return "Lubricant Oil";
  if (/(^|\s)gen(erator)?\b/.test(n)) return "GEN";
  return "General";
}

// Compute the effective file group key for each parsed row (preview only).
// Rows that provide a File Group Key use it as-is; rows without one get an
// auto-generated {ABBREV}-{SEQ} placeholder. The seq counter is a local
// mutation inside this helper (the React Compiler would flag a reassignment
// in the component body).
function computeProjectedKeys(rows: BulkFileRow[] | null, abbrev: string): string[] {
  let seq = 0;
  return (rows || []).map((r) => {
    if (r.FileGroupKey.trim()) return r.FileGroupKey;
    seq += 1;
    return `${abbrev}-${String(seq).padStart(3, "0")}`;
  });
}

function BulkFilesUploadDialog({
  projectId,
  projectName,
  projectAbbreviation,
  open,
  onOpenChange,
  onImported,
}: {
  projectId: string;
  projectName: string;
  projectAbbreviation: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkFileRow[] | null>(null);
  const [matched, setMatched] = useState<BulkMatchResult[] | null>(null);
  const [matching, setMatching] = useState(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "upload" | "bulk" | "match">("idle");
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);
  const { toast } = useToast();

  const abbrev = projectAbbreviation || "PRJ";

  const downloadTemplate = () => {
    // pp.csv template — new column order. Sample rows demonstrate the File
    // Group Key grouping: rows 1+2 share the same key (collapse into a single
    // grouped file), row 3 has a different key (separate file).
    const header = BULK_FILE_CSV_COLUMNS.join(",");
    const sample1 = [
      `${abbrev}-001`,
      "PR-2025-001",
      "FILE/2025/001",
      "Centrifugal Pump 15kW",
      "NOS",
      "2",
      "185000",
      "PR Raised",
      "Marine Engineering Services",
    ].map(csvEscapeFile).join(",");
    const sample2 = [
      `${abbrev}-001`,
      "PR-2025-001",
      "FILE/2025/001",
      "Mechanical Seal 35mm",
      "NOS",
      "4",
      "12500",
      "PR Raised",
      "Marine Engineering Services",
    ].map(csvEscapeFile).join(",");
    const sample3 = [
      `${abbrev}-002`,
      "PR-2025-002",
      "FILE/2025/002",
      "LED Floodlight 200W",
      "NOS",
      "6",
      "18500",
      "GS Approval",
      "Dockyard Stores",
    ].map(csvEscapeFile).join(",");
    const csv = `${header}\n${sample1}\n${sample2}\n${sample3}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pp.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Template downloaded",
      description: `Columns: ${BULK_FILE_CSV_COLUMNS.join(", ")}`,
    });
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
      const parsed = parseCsvFile(text);
      if (parsed.length === 0) {
        toast({ title: "CSV file is empty", variant: "destructive" });
        e.target.value = "";
        return;
      }
      // Detect columns by header name (case/space insensitive)
      const header = parsed[0].map((c) => c.trim().toLowerCase().replace(/\s+/g, ""));
      const colIndex: Record<keyof BulkFileRow, number> = {
        FileGroupKey: header.findIndex((h) => h === "filegroupkey" || h.includes("filegroupkey") || h.includes("groupkey") || (h.includes("group") && h.includes("file")) || h === "group"),
        PRNumber: header.findIndex((h) => h === "prnumber" || h.includes("prnumber") || h === "prno" || h === "pr"),
        FileNumber: header.findIndex((h) => h === "filenumber" || h.includes("filenumber") || (h.includes("file") && h.includes("number")) || h === "fileno"),
        ItemName: header.findIndex((h) => h === "itemname" || h.includes("itemname") || (h.includes("item") && h.includes("name")) || h.includes("description") || h === "name" || h === "item"),
        Deno: header.findIndex((h) => h === "deno" || h.includes("deno") || h === "unit" || h.includes("unit") || h.includes("denomination")),
        Qty: header.findIndex((h) => h === "qty" || h.includes("qty") || h.includes("quantity")),
        UnitCost: header.findIndex((h) => h === "unitcost" || h.includes("unitcost") || (h.includes("cost") && h.includes("unit")) || (h.includes("price") && h.includes("unit")) || h === "unitprice" || h === "price"),
        PresentPosition: header.findIndex((h) => h === "presentposition" || h.includes("presentposition") || h.includes("position")),
        Supplier: header.findIndex((h) => h === "supplier" || h.includes("supplier") || h.includes("vendor")),
      };
      const dataRows = parsed.slice(1);
      const mapped: BulkFileRow[] = dataRows
        .map((r) => {
          const get = (k: keyof BulkFileRow) => {
            const idx = colIndex[k];
            return idx >= 0 ? (r[idx] || "").trim() : "";
          };
          return {
            FileGroupKey: get("FileGroupKey"),
            PRNumber: get("PRNumber"),
            FileNumber: get("FileNumber"),
            ItemName: get("ItemName"),
            Deno: get("Deno"),
            Qty: get("Qty"),
            UnitCost: get("UnitCost"),
            PresentPosition: get("PresentPosition"),
            Supplier: get("Supplier"),
          };
        })
        // Require at least an ItemName or PRNumber to consider a row valid.
        .filter((r) => r.ItemName || r.PRNumber);
      if (mapped.length === 0) {
        toast({ title: "No valid rows found in CSV", variant: "destructive" });
        e.target.value = "";
        return;
      }
      setRows(mapped);
      setMatched(null);
      setSourceFile(file);
      setResult(null);
      setUploadedPath(null);
      setProgress(0);
      setPhase("idle");
    } catch {
      toast({ title: "Failed to read CSV file", variant: "destructive" });
    }
    e.target.value = "";
  };

  // Run AI variation matching — POST the parsed rows to the bulk-match
  // endpoint and receive canonical values (item name + code, present position,
  // supplier) with per-field confidence levels.
  const runAIMatching = async () => {
    if (!rows || rows.length === 0) return;
    setMatching(true);
    setPhase("match");
    setMatched(null);
    try {
      const payload = rows.map((r) => ({
        fileGroupKey: r.FileGroupKey,
        prNumber: r.PRNumber,
        fileNumber: r.FileNumber,
        itemName: r.ItemName,
        deno: r.Deno,
        qty: Number(r.Qty) || 0,
        unitCost: Number(r.UnitCost) || 0,
        presentPosition: r.PresentPosition,
        supplier: r.Supplier,
      }));
      const res = await apiRequest(
        `/api/projects/${projectId}/files/bulk-match`,
        "POST",
        { rows: payload }
      );
      setMatching(false);
      setPhase("idle");
      if (res.ok) {
        const data = (res.data as { ok?: boolean; matched?: BulkMatchResult[] }) || {};
        const matchedRows = Array.isArray(data.matched) ? data.matched : [];
        setMatched(matchedRows);
        const highCount = matchedRows.filter((m) => m.overallConfidence === "high").length;
        const medCount = matchedRows.filter((m) => m.overallConfidence === "medium").length;
        const lowCount = matchedRows.filter((m) => m.overallConfidence === "low" || m.overallConfidence === "none").length;
        toast({
          title: `AI matching complete — ${matchedRows.length} rows`,
          description: `${highCount} high · ${medCount} medium · ${lowCount} low/none confidence`,
        });
      } else {
        toast({
          title: "AI matching failed",
          description: res.error,
          variant: "destructive",
        });
      }
    } catch (e) {
      setMatching(false);
      setPhase("idle");
      toast({
        title: "AI matching failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const runImport = async () => {
    if (!rows || rows.length === 0) return;
    setImporting(true);
    setProgress(0);
    setResult(null);
    const errs: string[] = [];

    // ── Phase 1: Upload the source CSV file to /api/upload (best-effort) ──
    setPhase("upload");
    let savedPath: string | null = null;
    if (sourceFile) {
      try {
        const fd = new FormData();
        fd.append("file", sourceFile, sourceFile.name);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (upRes.ok) {
          const upJson = (await upRes.json()) as { ok?: boolean; fileName?: string; path?: string; size?: number };
          savedPath = upJson.path || upJson.fileName || null;
          setUploadedPath(savedPath);
        } else {
          errs.push(`Source-file upload failed (HTTP ${upRes.status}) — proceeding with bulk create anyway.`);
        }
      } catch (e) {
        errs.push(`Source-file upload error: ${(e as Error).message} — proceeding with bulk create anyway.`);
      }
    }
    setProgress(40);

    // ── Phase 2: POST the matched + grouped rows to /api/projects/[id]/files/bulk ──
    // Use matched values when available; fall back to original CSV values.
    // Total Cost / File Cost = Qty × Unit Cost (auto-calculated, NOT from CSV).
    // Category = auto-selected based on the (matched) item name keywords.
    setPhase("bulk");
    const filesPayload = rows.map((r, i) => {
      const m = matched?.[i];
      const itemName = m?.matchedItemName || r.ItemName;
      const presentPosition = m?.matchedPresentPosition || r.PresentPosition || "PR Raised";
      const supplier = m?.matchedSupplier || r.Supplier;
      const itemCode = m?.matchedItemCode || "TBC";
      const qty = Number(r.Qty) || 0;
      const unitPrice = Number(r.UnitCost) || 0;
      const fileCost = qty * unitPrice;
      const fileCategory = autoSelectCategory(itemName);
      return {
        prNumber: r.PRNumber || `PR-${Date.now()}`,
        itemCode,
        itemName,
        unit: r.Deno || "NOS",
        qty,
        unitPrice,
        fileCost,
        supplier: supplier || null,
        presentPosition,
        fileCategory,
        fileGroupKey: r.FileGroupKey || undefined,
        fileNumber: r.FileNumber || null,
      };
    });
    const res = await apiRequest(`/api/projects/${projectId}/files/bulk`, "POST", { files: filesPayload });
    setProgress(100);
    setImporting(false);
    setPhase("idle");

    if (res.ok) {
      const data = (res.data as { ok?: boolean; count?: number }) || {};
      const created = typeof data.count === "number" ? data.count : rows.length;
      setResult({ ok: created, fail: 0, errors: errs });
      toast({
        title: `Imported ${created} file${created === 1 ? "" : "s"} into ${projectName}`,
        description: savedPath
          ? `Source CSV saved to ${savedPath}`
          : "Source CSV upload skipped (bulk create succeeded).",
      });
      // Brief delay so the user can see the success state, then close + refresh.
      setTimeout(() => {
        onImported();
        setRows(null);
        setMatched(null);
        setSourceFile(null);
        setUploadedPath(null);
        setResult(null);
        setProgress(0);
      }, 900);
    } else {
      setResult({ ok: 0, fail: rows.length, errors: [...errs, res.error || "Bulk create failed"] });
      toast({
        title: "Bulk upload failed",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  const close = () => {
    if (importing || matching) return;
    onOpenChange(false);
    setRows(null);
    setMatched(null);
    setSourceFile(null);
    setResult(null);
    setUploadedPath(null);
    setProgress(0);
    setPhase("idle");
  };

  // Project the effective file group keys for the preview (informational).
  // Rows that provide a File Group Key use it as-is; rows without one get an
  // auto-generated {ABBREV}-{SEQ} placeholder (the server actually assigns these).
  // Computed inside a helper so the seq counter is a local mutation (not a
  // component-body reassignment that the React Compiler would flag).
  const projectedKeys = computeProjectedKeys(rows, abbrev);

  // Group rows by their effective file group key for the summary count.
  const groupedByKey = (() => {
    if (!rows) return [] as { key: string; indices: number[] }[];
    const map = new Map<string, number[]>();
    rows.forEach((_, i) => {
      const k = projectedKeys[i];
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    });
    return Array.from(map.entries()).map(([key, indices]) => ({ key, indices }));
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Bulk Upload Files — {projectName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a CSV using the <span className="font-mono text-foreground">pp.csv</span> template. Columns: <span className="font-mono text-foreground">{BULK_FILE_CSV_COLUMNS.join(", ")}</span>. Total Cost, File Cost, and Category are auto-generated. Click <span className="font-medium text-foreground">Run AI Matching</span> to canonicalize Item Name, Present Position, and Supplier against the item master / PRESENT_POSITIONS / supplier directory. Rows sharing a File Group Key collapse into a single grouped file. The source CSV is also saved to <span className="font-mono text-foreground">/upload/</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={downloadTemplate} size="sm" variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" /> Download Template (pp.csv)
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="gap-1.5" disabled={importing || matching}>
            <FileSpreadsheet className="h-4 w-4" /> Choose CSV File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          {sourceFile && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate max-w-[260px]" title={sourceFile.name}>
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{sourceFile.name}</span>
              <span className="text-muted-foreground/70 shrink-0">({(sourceFile.size / 1024).toFixed(1)} KB)</span>
            </span>
          )}
          {rows && rows.length > 0 && (
            <>
              <Button
                onClick={runAIMatching}
                size="sm"
                variant="outline"
                className="gap-1.5 ml-auto"
                disabled={matching || importing}
                title="Use AI to match Item Name, Present Position, and Supplier against the existing item master, PRESENT_POSITIONS list, and supplier directory"
              >
                {matching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {matched ? "Re-run AI Matching" : "Run AI Matching"}
              </Button>
              <Button onClick={runImport} size="sm" className="gap-1.5" disabled={importing || matching}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Import {rows.length} File{rows.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </div>

        {/* Progress bar (during import or matching) */}
        {(importing || matching) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {phase === "match"
                  ? "Running AI matching…"
                  : phase === "upload"
                  ? "Uploading source CSV…"
                  : phase === "bulk"
                  ? "Creating files…"
                  : "Working…"}{" "}
                {importing ? `${progress}%` : ""}
              </span>
              <span className="text-foreground">
                {uploadedPath ? (
                  <span className="text-emerald-400 font-medium">Source saved</span>
                ) : phase === "upload" ? (
                  <span className="text-muted-foreground">Saving source…</span>
                ) : phase === "match" ? (
                  <span className="text-primary">Matching…</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>
            {importing && <Progress value={progress} className="h-2" />}
          </div>
        )}

        {/* Summary chips (post-import) */}
        {result && !importing && (
          <div className="flex flex-wrap items-center gap-2">
            {result.ok > 0 && (
              <CustomBadge className="border-0 bg-emerald-500/15 text-emerald-400">
                <Check className="h-3 w-3 mr-1 inline" /> {result.ok} imported
              </CustomBadge>
            )}
            {result.fail > 0 && (
              <CustomBadge className="border-0 bg-red-500/15 text-red-400">
                {result.fail} failed
              </CustomBadge>
            )}
            {uploadedPath && (
              <CustomBadge className="border-0 bg-primary/10 text-primary">
                <FileText className="h-3 w-3 mr-1 inline" /> Source: {uploadedPath}
              </CustomBadge>
            )}
          </div>
        )}

        {/* Matched-summary chips (after AI matching) */}
        {matched && matched.length > 0 && !importing && (
          <div className="flex flex-wrap items-center gap-2">
            <CustomBadge className="border-0 bg-primary/10 text-primary">
              <Wand2 className="h-3 w-3 mr-1 inline" /> {matched.length} rows matched
            </CustomBadge>
            {(() => {
              const high = matched.filter((m) => m.overallConfidence === "high").length;
              const med = matched.filter((m) => m.overallConfidence === "medium").length;
              const low = matched.filter((m) => m.overallConfidence === "low" || m.overallConfidence === "none").length;
              return (
                <>
                  <CustomBadge className={cn("border-0", confidenceColor("high"))}>{high} high</CustomBadge>
                  <CustomBadge className={cn("border-0", confidenceColor("medium"))}>{med} medium</CustomBadge>
                  <CustomBadge className={cn("border-0", confidenceColor("none"))}>{low} low/none</CustomBadge>
                </>
              );
            })()}
            <span className="text-xs text-muted-foreground ml-1">
              {groupedByKey.length} file group{groupedByKey.length === 1 ? "" : "s"} (rows sharing a File Group Key collapse into one file)
            </span>
          </div>
        )}

        {/* Preview table — original CSV values + matched values (highlighted) + confidence */}
        {rows && rows.length > 0 ? (
          <div className="border border-border rounded-lg overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground w-10">#</TableHead>
                  <TableHead className="text-muted-foreground">File Group Key</TableHead>
                  <TableHead className="text-muted-foreground">PR Number</TableHead>
                  <TableHead className="text-muted-foreground">File Number</TableHead>
                  <TableHead className="text-muted-foreground">Item Name {matched && <span className="text-primary">→ matched</span>}</TableHead>
                  <TableHead className="text-muted-foreground">Deno</TableHead>
                  <TableHead className="text-muted-foreground text-right">Qty</TableHead>
                  <TableHead className="text-muted-foreground text-right">Unit Cost</TableHead>
                  <TableHead className="text-muted-foreground text-right">File Cost (auto)</TableHead>
                  <TableHead className="text-muted-foreground">Present Position {matched && <span className="text-primary">→ matched</span>}</TableHead>
                  <TableHead className="text-muted-foreground">Supplier {matched && <span className="text-primary">→ matched</span>}</TableHead>
                  <TableHead className="text-muted-foreground">Category (auto)</TableHead>
                  {matched && <TableHead className="text-muted-foreground">Confidence</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const m = matched?.[i];
                  const qty = Number(r.Qty) || 0;
                  const unitCost = Number(r.UnitCost) || 0;
                  const fileCost = qty * unitCost;
                  const effKey = projectedKeys[i];
                  const itemName = m?.matchedItemName || r.ItemName;
                  const category = autoSelectCategory(itemName);
                  const itemChanged = m && m.matchedItemName && m.matchedItemName !== r.ItemName;
                  const posChanged = m && m.matchedPresentPosition && m.matchedPresentPosition !== r.PresentPosition;
                  const supChanged = m && m.matchedSupplier && m.matchedSupplier !== r.Supplier;
                  return (
                    <TableRow key={i} className="border-border">
                      <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          <FolderKey className="h-3 w-3" />
                          {effKey}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">{r.PRNumber || <span className="text-muted-foreground italic">auto</span>}</TableCell>
                      <TableCell className="font-mono text-xs">{r.FileNumber || <span className="text-muted-foreground italic">—</span>}</TableCell>
                      <TableCell className="text-foreground">
                        {r.ItemName || <span className="text-muted-foreground italic">—</span>}
                        {m && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {m.matchedItemCode && (
                              <span className="inline-block font-mono text-[10px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {m.matchedItemCode}
                              </span>
                            )}
                            {itemChanged ? (
                              <span className="text-xs text-emerald-400 font-medium">→ {m.matchedItemName}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">(unchanged)</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{r.Deno || "NOS"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.Qty || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.UnitCost ? Number(r.UnitCost).toLocaleString("en-US") : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-foreground/90">{fileCost.toLocaleString("en-US")}</TableCell>
                      <TableCell className="text-xs">
                        {r.PresentPosition || <span className="text-muted-foreground italic">PR Raised</span>}
                        {m && posChanged && (
                          <span className="block text-xs text-emerald-400 font-medium">→ {m.matchedPresentPosition}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.Supplier || <span className="text-muted-foreground italic">—</span>}
                        {m && supChanged && (
                          <span className="block text-xs text-emerald-400 font-medium">→ {m.matchedSupplier}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <CustomBadge className="border-0 bg-slate-500/15 text-slate-300">{category}</CustomBadge>
                      </TableCell>
                      {matched && (
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <CustomBadge className={cn("border-0", confidenceColor(m?.overallConfidence || "none"))}>
                              {m?.overallConfidence || "none"}
                            </CustomBadge>
                            <span className="text-[10px] text-muted-foreground">
                              item {m?.itemNameConfidence || "—"} · pos {m?.positionConfidence || "—"} · sup {m?.supplierConfidence || "—"}
                            </span>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-lg p-10 text-center">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No file selected. Download the <span className="font-mono">pp.csv</span> template, fill it in (one row per item; multiple rows may share a File Group Key), then choose the CSV file to preview rows here.
            </p>
          </div>
        )}

        {/* Error list */}
        {result && result.errors.length > 0 && (
          <div className="border border-amber-500/40 rounded-lg p-3 bg-amber-500/[0.04] max-h-40 overflow-y-auto scrollbar-thin">
            <p className="text-xs font-semibold text-amber-400 mb-2">Notes ({result.errors.length}):</p>
            <ul className="space-y-1 text-xs text-foreground/80">
              {result.errors.map((e, i) => (
                <li key={i} className="font-mono">{e}</li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={importing || matching}>
            {result && result.fail === 0 ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// CSV escape — wraps in quotes if the field contains a comma, quote, or newline
function csvEscapeFile(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// RFC-4180 CSV parser — handles quoted fields with embedded commas/newlines
function parseCsvFile(text: string): string[][] {
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
}
