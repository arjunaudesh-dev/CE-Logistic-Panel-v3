"use client";
import { useMemo, useState } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CustomBadge } from "@/components/erp/badges";
import { LoadingState, EmptyState } from "@/components/erp/states";
import { InitiateFileDialog, EstimateItem } from "./initiate-file";
import { formatCurrency, estimateStatusColor } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Sparkles,
  FileSignature,
  CheckCircle2,
  PackageSearch,
  AlertCircle,
  ShieldCheck,
  FileText,
  ScrollText,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Group as GroupIcon,
  Files,
  ChevronRight,
  CheckSquare,
  ListChecks,
  X,
  UserCheck,
  User,
  Layers,
  Info,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  estimateId: string;
  /** whether to show the AI "Process" button (wizard step 2) or just the table (PR from Estimate tab) */
  showProcessButton?: boolean;
  onChanged?: () => void;
}

interface EstimateWithProject {
  id: string;
  status: string;
  items: EstimateItem[];
  project?: {
    id?: string;
    name?: string;
    nameAbbreviation?: string | null;
    projectType?: string | null;
    financialMean?: string | null;
  } | null;
}

interface Stakeholder {
  id: string;
  name: string;
  rankOrRate?: string | null;
  svcNumber?: string | null;
  appointment?: string | null;
  department?: string | null;
  category?: string | null;
  seniority?: number | null;
}

interface NumberPrefix {
  id: string;
  docType: string;
  prefix: string;
  suffix: string | null;
  nextNumber: number;
  description: string | null;
}

type SectionVariant = "rc" | "non-rate" | "contractual";
type ThemeKey = "emerald" | "amber" | "violet";
type SortKey = "srNo" | "itemName" | "itemCode" | "qty" | "unitCost" | "totalCost";
type SortDir = "asc" | "desc";

const SECTION_THEME: Record<SectionVariant, { key: ThemeKey; bar: string; title: string; summary: string; desc: string }> = {
  rc: {
    key: "emerald",
    bar: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    title: "text-emerald-300",
    summary: "text-emerald-400",
    desc: "bg-emerald-500/5 text-emerald-400/90",
  },
  "non-rate": {
    key: "amber",
    bar: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    title: "text-amber-300",
    summary: "text-amber-400",
    desc: "bg-amber-500/5 text-amber-400/90",
  },
  contractual: {
    key: "violet",
    bar: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    title: "text-violet-300",
    summary: "text-violet-400",
    desc: "bg-violet-500/5 text-violet-400/90",
  },
};

export function EstimateItemsTable({ estimateId, showProcessButton = false, onChanged }: Props) {
  const { data: estimate, loading, refresh } = useFetch<EstimateWithProject>(
    `/api/estimates/${estimateId}`
  );
  const { data: prefixes } = useFetch<NumberPrefix[]>("/api/number-prefixes");
  const { data: stakeholders } = useFetch<Stakeholder[]>("/api/stakeholders");
  const [processing, setProcessing] = useState(false);
  const [initiateItem, setInitiateItem] = useState<EstimateItem | null>(null);
  // Multi-select for bulk "Initiate Selected" — tracks selected EstimateItem IDs.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkInitiateOpen, setBulkInitiateOpen] = useState(false);
  const { toast } = useToast();

  // Sorting state — shared across all 3 sections (single preference)
  const [sortKey, setSortKey] = useState<SortKey>("srNo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  // Group-by-file toggle — applies within each section
  const [groupByFile, setGroupByFile] = useState(false);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const items = estimate?.items || [];
  const pendingItems = items.filter((i) => i.status === "Pending");
  const initiatedItems = items.filter((i) => i.status === "Initiated");

  // Determine if the project context is contractual — infer from project type OR financial mean.
  const projectType = estimate?.project?.projectType;
  const financialMean = estimate?.project?.financialMean;
  const isProjectContractual =
    projectType === "Contractual Job" || financialMean === "Contractual";

  // Split items into 3 groups according to type
  const rcItems = items.filter((i) => i.isRC);
  const contractualItems = items.filter((i) => !i.isRC && isProjectContractual);
  const nonRateItems = items.filter((i) => !i.isRC && !isProjectContractual);

  // ─── Multi-select helpers ───
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
  // All pending item IDs (only Pending items are eligible for PR initiation).
  // Computed inline (no useMemo) since pendingItems is itself derived from items.
  const allPendingIds = pendingItems.map((i) => i.id);
  const visibleSelectedCount = allPendingIds.filter((id) => selectedIds.has(id)).length;
  const allPendingSelected =
    allPendingIds.length > 0 && visibleSelectedCount === allPendingIds.length;
  const somePendingSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < allPendingIds.length;
  const toggleSelectAllPending = () =>
    selectMany(allPendingIds, !allPendingSelected);

  // Officers + sailors for the BulkInitiatePRDialog selects (sorted by seniority)
  const officers = useMemo(
    () =>
      (stakeholders || [])
        .filter((s) => (s.category || "").toLowerCase().includes("officer"))
        .sort((a, b) => {
          const sa = a.seniority ?? 99;
          const sb = b.seniority ?? 99;
          if (sa !== sb) return sa - sb;
          return (a.name || "").localeCompare(b.name || "");
        }),
    [stakeholders]
  );
  const sailors = useMemo(
    () =>
      (stakeholders || [])
        .filter((s) => (s.category || "").toLowerCase().includes("sailor"))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [stakeholders]
  );

  // PR prefix auto-suggest — find the "PR" doc type in the number prefixes
  const prPrefix = useMemo(
    () => (prefixes || []).find((p) => p.docType === "PR"),
    [prefixes]
  );
  const suggestedPrNumber = useMemo(() => {
    if (!prPrefix) return "";
    const num = String(prPrefix.nextNumber).padStart(3, "0");
    return `${prPrefix.prefix}${num}${prPrefix.suffix || ""}`;
  }, [prPrefix]);

  // Bulk initiate: creates a PR for every selected estimate item via
  // POST /api/estimates/{estimateId}/items/{itemId}. The same PR number, file
  // number, authorized-by and created-by are reused across all items so they
  // share a fileGroupKey (and thus collapse into a single grouped row in the
  // PR Raised Files window).
  const handleBulkInitiate = async (input: {
    prNumber: string;
    fileNumber: string;
    fileGroupKey: string;
    authorizedById: string;
    createdById: string;
  }) => {
    const selected = pendingItems.filter((it) => selectedIds.has(it.id));
    if (selected.length === 0) {
      toast({ title: "No items selected", variant: "destructive" });
      return;
    }
    const officer = officers.find((o) => o.id === input.authorizedById);
    const sailor = sailors.find((s) => s.id === input.createdById);
    const authorizedBy = officer
      ? `${officer.name}${officer.appointment ? ` (${officer.appointment})` : ""}`
      : input.authorizedById;
    const createdBy = sailor
      ? `${sailor.name}${sailor.appointment ? ` (${sailor.appointment})` : ""}`
      : input.createdById;
    const effectiveGroupKey = input.fileGroupKey.trim() || input.prNumber;
    const results = await Promise.all(
      selected.map((it) =>
        apiRequest(`/api/estimates/${estimateId}/items/${it.id}`, "POST", {
          prNumber: input.prNumber,
          fileNumber: input.fileNumber,
          fileGroupKey: effectiveGroupKey,
          createdBy,
          authorizedBy,
          responsiblePerson: authorizedBy,
        })
      )
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      toast({
        title: `Initiated ${selected.length} file${selected.length === 1 ? "" : "s"} successfully — ${input.prNumber}`,
        description: "PR raised. Item statuses updated below — you remain on this tab.",
      });
    } else {
      toast({
        title: `${failed.length} of ${selected.length} initiate(s) failed`,
        description: failed[0]?.error,
        variant: "destructive",
      });
    }
    clearSelection();
    setBulkInitiateOpen(false);
    // CRITICAL: do NOT call onChanged?.() here — that would refresh the
    // PR Raised Files tab and could be perceived as the system "jumping"
    // to that tab. The user stays on the PR from Estimate tab; the item
    // statuses update in place via refresh().
    refresh();
  };

  const handleProcess = async () => {
    setProcessing(true);
    const res = await apiRequest(`/api/estimates/${estimateId}/process`, "POST");
    setProcessing(false);
    if (res.ok) {
      toast({ title: "Estimate processed with AI", description: `${items.length} items matched to RC list & inventory` });
      refresh();
      onChanged?.();
    } else {
      toast({ title: "AI processing failed", description: res.error, variant: "destructive" });
    }
  };

  if (loading) return <LoadingState label="Loading estimate..." />;

  return (
    <div className="space-y-3">
      {showProcessButton && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CustomBadge className={cn("border-0", estimateStatusColor(estimate?.status || "Draft"))}>
              {estimate?.status || "Draft"}
            </CustomBadge>
            <span className="text-xs text-muted-foreground">
              {items.length} items · {pendingItems.length} pending · {initiatedItems.length} initiated
            </span>
          </div>
          {estimate?.status !== "Processed" && (
            <Button onClick={handleProcess} disabled={processing} size="sm" className="gap-1.5">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Process with AI
            </Button>
          )}
        </div>
      )}

      {/* summary tiles — Total Cost now correctly sums (Unit Cost × Qty) per row,
          where Unit Cost = rcRate for RC items and approxCost for non-RC items */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SummaryTile
            label="Total Cost"
            value={formatCurrency(items.reduce((s, i) => s + (i.isRC ? i.rcRate : i.approxCost) * (i.qty || 0), 0))}
            tone="text-blue-400"
            icon={<PackageSearch className="h-4 w-4" />}
          />
          <SummaryTile
            label="RC Items"
            value={String(rcItems.length)}
            tone="text-emerald-400"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <SummaryTile
            label="Stock Available"
            value={String(items.filter((i) => i.availableStock > 0).length)}
            tone="text-amber-400"
            icon={<AlertCircle className="h-4 w-4" />}
          />
          <SummaryTile
            label="Initiated PRs"
            value={String(initiatedItems.length)}
            tone="text-violet-400"
            icon={<FileSignature className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Selection bar — appears when at least one pending item is selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-lg border border-primary/40 bg-primary/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <ListChecks className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected</span>
            <span className="text-xs text-muted-foreground">· ready to initiate</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 text-xs gap-1.5">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setBulkInitiateOpen(true)}
              className="gap-1.5"
              title="Raise a single PR covering all selected estimate items"
            >
              <CheckSquare className="h-4 w-4" /> Initiate Selected
            </Button>
          </div>
        </div>
      )}

      {/* Group-by-file toggle — only enabled when at least one item has been initiated */}
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {pendingItems.length > 0 && (
              <Checkbox
                checked={
                  allPendingSelected
                    ? true
                    : somePendingSelected
                    ? "indeterminate"
                    : false
                }
                onCheckedChange={toggleSelectAllPending}
                aria-label="Select all pending items"
                className="mr-1"
              />
            )}
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <GroupIcon className="h-3 w-3" />
              Sortable headers · {initiatedItems.length > 0
                ? "Toggle to group multiple items sharing the same PR/File number"
                : "Initiate files to enable the group-by-file view"}
            </p>
          </div>
          <Button
            size="sm"
            variant={groupByFile ? "default" : "outline"}
            onClick={() => setGroupByFile((v) => !v)}
            disabled={initiatedItems.length === 0}
            className="gap-1.5"
            title={initiatedItems.length === 0 ? "No initiated items to group" : "Toggle group-by-file view"}
          >
            <GroupIcon className="h-4 w-4" />
            {groupByFile ? "Ungroup View" : "Group by File"}
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No estimate items"
          description="Add material estimate items in Step 1, then process with AI."
        />
      ) : (
        <div className="space-y-4">
          {rcItems.length > 0 && (
            <ItemsSection
              title="RC (Rate Contract) Items"
              icon={<ShieldCheck className="h-4 w-4" />}
              variant="rc"
              description="Items matched to an active Rate Contract — procurement can proceed at the locked RC rate."
              items={rcItems}
              onInitiate={(it) => setInitiateItem(it)}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              groupByFile={groupByFile}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}
          {nonRateItems.length > 0 && (
            <ItemsSection
              title="Non-Rate Items (Tender/Quotation Required)"
              icon={<FileText className="h-4 w-4" />}
              variant="non-rate"
              description="These items are not on an active Rate Contract — they require a tender or quotation process."
              items={nonRateItems}
              onInitiate={(it) => setInitiateItem(it)}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              groupByFile={groupByFile}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}
          {contractualItems.length > 0 && (
            <ItemsSection
              title="Contractual Items (ARO Flow)"
              icon={<ScrollText className="h-4 w-4" />}
              variant="contractual"
              description="These items follow the ARO (Annual Requirement Order) contractual process flow."
              items={contractualItems}
              onInitiate={(it) => setInitiateItem(it)}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              groupByFile={groupByFile}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}
        </div>
      )}

      {initiateItem && (
        <InitiateFileDialog
          key={initiateItem.id}
          item={initiateItem}
          open
          onOpenChange={(o) => !o && setInitiateItem(null)}
          onInitiated={() => {
            // CRITICAL: do NOT call onChanged?.() here — that propagates up
            // to the parent PresentPositionDialog which refreshes the PR
            // Raised Files tab + the projects list, which the user perceives
            // as the system auto-jumping away from this tab. We close the
            // dialog + refresh ONLY the estimate items table so the item's
            // status updates in place (Pending → Initiated) right here.
            setInitiateItem(null);
            refresh();
          }}
          projectAbbreviation={estimate?.project?.nameAbbreviation}
        />
      )}

      {/* Bulk Initiate PR dialog — creates a single PR covering all selected estimate items.
          The `key` forces a fresh mount whenever the user opens the dialog with a
          different set of selections so the suggested PR number refreshes. */}
      {bulkInitiateOpen && (
        <BulkInitiatePRDialog
          key={`bulk-${selectedIds.size}-${suggestedPrNumber}`}
          open={bulkInitiateOpen}
          onOpenChange={setBulkInitiateOpen}
          selectedCount={selectedIds.size}
          suggestedPrNumber={suggestedPrNumber}
          officers={officers}
          sailors={sailors}
          onConfirm={handleBulkInitiate}
        />
      )}
    </div>
  );
}

/** Sortable column header with chevron indicator. */
function SortHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  className,
  align,
}: {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey;
  currentSortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sortKey === currentSortKey;
  return (
    <TableHead className={cn("text-muted-foreground", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          align === "right" && "flex-row-reverse",
          active && "text-foreground"
        )}
      >
        {label}
        {active ? (
          currentSortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function ItemsSection({
  title,
  icon,
  variant,
  description,
  items,
  onInitiate,
  sortKey,
  sortDir,
  onSort,
  groupByFile,
  selectedIds,
  onToggleSelect,
}: {
  title: string;
  icon: React.ReactNode;
  variant: SectionVariant;
  description: string;
  items: EstimateItem[];
  onInitiate: (item: EstimateItem) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  groupByFile: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const theme = SECTION_THEME[variant];
  const showRcCols = variant === "rc";
  const DescIcon = variant === "rc" ? CheckCircle2 : AlertCircle;

  // Per-item unit cost — approxCost is already per-unit (RC rate or estimateCost).
  // No "divided by qty" here.
  const unitCostOf = (it: EstimateItem) => (it.isRC ? it.rcRate : it.approxCost) || 0;
  const totalCostOf = (it: EstimateItem) => unitCostOf(it) * (it.qty || 0);

  // Sort items — sort is applied within each section
  const sortedItems = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "srNo":
          cmp = a.srNo - b.srNo;
          break;
        case "itemName":
          cmp = (a.itemName || "").localeCompare(b.itemName || "");
          break;
        case "itemCode":
          cmp = (a.itemCode || "").localeCompare(b.itemCode || "");
          break;
        case "qty":
          cmp = a.qty - b.qty;
          break;
        case "unitCost":
          cmp = unitCostOf(a) - unitCostOf(b);
          break;
        case "totalCost":
          cmp = totalCostOf(a) - totalCostOf(b);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [items, sortKey, sortDir]);

  // Group items by prNumber (or fileNumber) when groupByFile is enabled.
  // Items without a prNumber/fileNumber remain as individual rows.
  // Groups of 2+ items become expandable group cards; single-initiated items
  // render as individual rows so the user still sees the PR badge inline.
  const groupedView = useMemo(() => {
    if (!groupByFile) {
      return { groups: [] as { key: string; items: EstimateItem[] }[], individuals: sortedItems };
    }
    const groupsMap = new Map<string, EstimateItem[]>();
    const individuals: EstimateItem[] = [];
    for (const it of sortedItems) {
      const key = it.prNumber || it.fileNumber;
      if (key) {
        const existing = groupsMap.get(key);
        if (existing) existing.push(it);
        else groupsMap.set(key, [it]);
      } else {
        individuals.push(it);
      }
    }
    const realGroups: { key: string; items: EstimateItem[] }[] = [];
    for (const [key, groupItems] of groupsMap) {
      if (groupItems.length >= 2) {
        realGroups.push({ key, items: groupItems });
      } else {
        individuals.push(groupItems[0]);
      }
    }
    return { groups: realGroups, individuals };
  }, [sortedItems, groupByFile]);

  const totalCost = items.reduce((s, i) => s + totalCostOf(i), 0);
  const groupedItemCount = groupedView.groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Colored header bar — icon + title + count + total cost */}
      <div className={cn("flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border flex-wrap", theme.bar)}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">{icon}</span>
          <h4 className={cn("text-sm font-semibold", theme.title)}>{title}</h4>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-background/40 font-mono">
            {items.length}
          </span>
        </div>
        <div className="text-xs">
          <span className="opacity-80">Total Cost: </span>
          <span className={cn("font-semibold", theme.summary)}>{formatCurrency(totalCost)}</span>
        </div>
      </div>

      {/* Variant description strip */}
      <div className={cn("px-4 py-1.5 border-b border-border flex items-center gap-1.5 text-[11px]", theme.desc)}>
        <DescIcon className="h-3 w-3 shrink-0" />
        {description}
      </div>

      {/* Group cards — only when groupByFile is enabled and there are multi-item groups */}
      {groupByFile && groupedView.groups.length > 0 && (
        <div className="p-3 space-y-2 bg-secondary/10 border-b border-border">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Files className="h-3 w-3" />
            {groupedView.groups.length} grouped file(s) · {groupedItemCount} items
          </p>
          {groupedView.groups.map((g) => (
            <GroupCard
              key={g.key}
              groupKey={g.key}
              items={g.items}
              variant={variant}
              onInitiate={onInitiate}
            />
          ))}
        </div>
      )}

      {/* Individual items table — show ALL items (no pagination limit) in a scrollable container */}
      {groupedView.individuals.length > 0 ? (
        <div className="max-h-[60vh] overflow-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-secondary/95 backdrop-blur">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground w-10">Select</TableHead>
                <SortHeader
                  label="Sr"
                  sortKey="srNo"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={onSort}
                  className="w-12"
                />
                <SortHeader
                  label="Item Name"
                  sortKey="itemName"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="Item Code"
                  sortKey="itemCode"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="Qty"
                  sortKey="qty"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={onSort}
                  className="text-right"
                  align="right"
                />
                <TableHead className="text-muted-foreground">Deno</TableHead>
                <SortHeader
                  label="Unit Cost"
                  sortKey="unitCost"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={onSort}
                  className="text-right"
                  align="right"
                />
                <SortHeader
                  label="Total Cost"
                  sortKey="totalCost"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={onSort}
                  className="text-right"
                  align="right"
                />
                {showRcCols && <TableHead className="text-muted-foreground">RC Supplier</TableHead>}
                <TableHead className="text-muted-foreground">RC / NR</TableHead>
                <TableHead className="text-muted-foreground text-right">Last Purchase</TableHead>
                <TableHead className="text-muted-foreground">Available Stock</TableHead>
                <TableHead className="text-muted-foreground text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedView.individuals.map((it) => (
                <ItemRow
                  key={it.id}
                  it={it}
                  showRcCols={showRcCols}
                  onInitiate={onInitiate}
                  isSelected={selectedIds.has(it.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        groupByFile &&
        groupedView.groups.length > 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            All items in this section are part of file groups above.
          </div>
        )
      )}
    </div>
  );
}

/** Expandable group card — multiple items sharing a single PR/File number. */
function GroupCard({
  groupKey,
  items,
  variant,
  onInitiate,
}: {
  groupKey: string;
  items: EstimateItem[];
  variant: SectionVariant;
  onInitiate: (item: EstimateItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const theme = SECTION_THEME[variant];
  const showRcCols = variant === "rc";

  const totalCost = items.reduce((s, i) => s + (i.isRC ? i.rcRate : i.approxCost) * (i.qty || 0), 0);
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);

  // Common attributes across the group (only show if all items share the same value)
  const suppliers = new Set(items.map((i) => i.rcSupplier).filter(Boolean));
  const commonSupplier = suppliers.size === 1 ? Array.from(suppliers)[0] : null;
  const rcNumbers = new Set(items.map((i) => i.rcNumber).filter(Boolean));
  const commonRcNumber = rcNumbers.size === 1 ? Array.from(rcNumbers)[0] : null;
  const units = new Set(items.map((i) => i.unit));
  const commonUnit = units.size === 1 ? Array.from(units)[0] : null;
  const fileNumbers = new Set(items.map((i) => i.fileNumber).filter(Boolean));
  const commonFileNumber = fileNumbers.size === 1 ? Array.from(fileNumbers)[0] : null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Group header — clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Files className={cn("h-4 w-4 shrink-0", theme.title)} />
          <CustomBadge className={cn("border-0 bg-primary/15 text-primary font-mono")}>
            {groupKey}
          </CustomBadge>
          <span className="text-xs text-muted-foreground">
            {items.length} items · {totalQty} {commonUnit || "units"} total
          </span>
          {commonSupplier && (
            <span className="text-xs text-muted-foreground hidden sm:inline truncate">
              · Supplier: <span className="text-foreground/80">{commonSupplier}</span>
            </span>
          )}
          {commonRcNumber && showRcCols && (
            <CustomBadge className="border-0 bg-emerald-500/15 text-emerald-400 font-mono">
              {commonRcNumber}
            </CustomBadge>
          )}
          {!showRcCols && (
            <CustomBadge
              className="border-0 bg-amber-500/15 text-amber-400"
              title="Non-Rate — none of the items in this file are on an active Rate Contract"
            >
              NR
            </CustomBadge>
          )}
          {commonFileNumber && (
            <span className="text-[11px] text-muted-foreground hidden md:inline font-mono">
              · {commonFileNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">File Total</p>
            <p className={cn("text-sm font-semibold", theme.summary)}>{formatCurrency(totalCost)}</p>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded individual items */}
      {expanded && (
        <div className="border-t border-border bg-secondary/20">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground w-12">Sr</TableHead>
                  <TableHead className="text-muted-foreground">Item Name</TableHead>
                  <TableHead className="text-muted-foreground">Item Code</TableHead>
                  <TableHead className="text-muted-foreground text-right">Qty</TableHead>
                  <TableHead className="text-muted-foreground">Deno</TableHead>
                  <TableHead className="text-muted-foreground text-right">Unit Cost</TableHead>
                  <TableHead className="text-muted-foreground text-right">Total Cost</TableHead>
                  {showRcCols && <TableHead className="text-muted-foreground">RC Supplier</TableHead>}
                  <TableHead className="text-muted-foreground">RC / NR</TableHead>
                  <TableHead className="text-muted-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <ItemRow
                    key={it.id}
                    it={it}
                    showRcCols={showRcCols}
                    onInitiate={onInitiate}
                    compact
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

/** Single item row — shared between the main table and the expanded group view. */
function ItemRow({
  it,
  showRcCols,
  onInitiate,
  compact,
  isSelected,
  onToggleSelect,
}: {
  it: EstimateItem;
  showRcCols: boolean;
  onInitiate: (item: EstimateItem) => void;
  compact?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  // Per-unit cost — approxCost is already per-unit (RC rate if RC, else estimateCost).
  // The previous code divided approxCost by qty, which was incorrect.
  const unitCost = it.isRC ? it.rcRate : it.approxCost;
  const totalCost = (unitCost || 0) * (it.qty || 0);
  // Selection is only available for Pending items (Initiated items are already raised)
  const canSelect = it.status === "Pending" && !!onToggleSelect;
  return (
    <TableRow className={cn("border-border", isSelected && "bg-primary/[0.06]")}>
      {/* Checkbox cell — only rendered for non-compact (main) view + Pending items */}
      {!compact && (
        <TableCell className="w-10">
          {canSelect ? (
            <Checkbox
              checked={!!isSelected}
              onCheckedChange={() => onToggleSelect!(it.id)}
              aria-label={`Select ${it.itemName}`}
            />
          ) : (
            <span className="text-muted-foreground/40 text-xs">—</span>
          )}
        </TableCell>
      )}
      <TableCell className="text-xs text-muted-foreground font-mono">{it.srNo}</TableCell>
      <TableCell className="text-foreground font-medium">{it.itemName}</TableCell>
      <TableCell className="font-mono text-xs">
        {it.itemCode ? (
          <span className="text-blue-400">{it.itemCode}</span>
        ) : (
          <span className="text-muted-foreground italic">TBC</span>
        )}
      </TableCell>
      <TableCell className="text-right">{it.qty}</TableCell>
      <TableCell className="text-xs">{it.unit}</TableCell>
      <TableCell className="text-right font-medium text-foreground">
        {formatCurrency(unitCost)}
        {it.isRC && (
          <span className="block text-[10px] text-emerald-400">@RC rate</span>
        )}
      </TableCell>
      <TableCell className="text-right font-semibold text-foreground">
        {formatCurrency(totalCost)}
      </TableCell>
      {showRcCols && (
        <TableCell className="text-xs text-muted-foreground">
          {it.rcSupplier || "—"}
        </TableCell>
      )}
      {/* RC / NR badge — always visible. RC items show their RC number as a
          green badge; non-RC items show an amber "NR" (Non-Rate) badge so
          users can quickly distinguish RC vs Non-Rate items at a glance. */}
      <TableCell>
        {it.isRC ? (
          <CustomBadge
            className="border-0 bg-emerald-500/15 text-emerald-400 font-mono"
            title={it.rcNumber ? `RC Number: ${it.rcNumber}` : "RC item (no RC number on file)"}
          >
            {it.rcNumber || "RC"}
          </CustomBadge>
        ) : (
          <CustomBadge
            className="border-0 bg-amber-500/15 text-amber-400"
            title="Non-Rate — not on an active Rate Contract; tender/quotation required"
          >
            NR
          </CustomBadge>
        )}
      </TableCell>
      {!compact && (
        <>
          <TableCell className="text-right text-xs">
            {it.lastPurchasePrice > 0 ? formatCurrency(it.lastPurchasePrice) : "—"}
          </TableCell>
          <TableCell>
            {it.availableStock > 0 ? (
              <div className="text-xs">
                <span className="text-emerald-400 font-medium">{it.availableStock} {it.unit}</span>
                {it.stockLocation && (
                  <span className="block text-[10px] text-muted-foreground">@ {it.stockLocation}</span>
                )}
                {it.nonMovingStock > 0 && (
                  <span className="block text-[10px] text-amber-400">⚠ {it.nonMovingStock} non-moving</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">0</span>
            )}
          </TableCell>
        </>
      )}
      <TableCell className="text-right">
        {it.status === "Initiated" ? (
          <div className="flex flex-col items-end gap-0.5">
            <CustomBadge className="border-0 bg-violet-500/15 text-violet-400">
              <CheckCircle2 className="h-3 w-3 mr-1" /> {it.prNumber}
            </CustomBadge>
            {it.fileNumber && (
              <span className="text-[10px] text-muted-foreground">{it.fileNumber}</span>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onInitiate(it)}
            className="gap-1.5 h-7"
          >
            <FileSignature className="h-3.5 w-3.5" /> Initiate File
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3 flex items-center gap-2.5">
      <div className={cn("h-8 w-8 rounded-md flex items-center justify-center bg-background/50", tone)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-semibold truncate", tone)}>{value}</p>
      </div>
    </div>
  );
}

// ─── Bulk Initiate PR Dialog (multi-select → raise a single PR covering all selected estimate items) ───
// Reuses the same shape as InitiateFileDialog (PR number + file number + group key + officer + sailor)
// but applies the SAME values to every selected estimate item, so they collapse into a single grouped
// file in the PR Raised Files window.
function BulkInitiatePRDialog({
  open,
  onOpenChange,
  selectedCount,
  suggestedPrNumber,
  officers,
  sailors,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedCount: number;
  suggestedPrNumber: string;
  officers: Stakeholder[];
  sailors: Stakeholder[];
  onConfirm: (input: {
    prNumber: string;
    fileNumber: string;
    fileGroupKey: string;
    authorizedById: string;
    createdById: string;
  }) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [prNumber, setPrNumber] = useState(suggestedPrNumber || "");
  const [fileNumber, setFileNumber] = useState(`FILE/${today}`);
  const [fileGroupKey, setFileGroupKey] = useState("");
  const [usePrAsGroupKey, setUsePrAsGroupKey] = useState(true);
  const [authorizedById, setAuthorizedById] = useState("");
  const [createdById, setCreatedById] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const selectedOfficer = officers.find((o) => o.id === authorizedById);
  const selectedSailor = sailors.find((s) => s.id === createdById);

  const submit = async () => {
    if (!prNumber.trim()) {
      toast({ title: "PR/GORF Number is required", variant: "destructive" });
      return;
    }
    if (!authorizedById) {
      toast({ title: "Authorized By (Officer) is required", variant: "destructive" });
      return;
    }
    if (!createdById) {
      toast({ title: "Created By (Sailor) is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    await onConfirm({
      prNumber: prNumber.trim(),
      fileNumber: fileNumber.trim(),
      fileGroupKey: usePrAsGroupKey ? prNumber.trim() : fileGroupKey.trim(),
      authorizedById,
      createdById,
    });
    setSaving(false);
    // Reset form after submit (parent closes the dialog)
    setFileGroupKey("");
    setUsePrAsGroupKey(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Initiate {selectedCount} Selected Item{selectedCount === 1 ? "" : "s"} as a Single PR
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Raise one PR/GORF covering all {selectedCount} selected estimate item{selectedCount === 1 ? "" : "s"}. They will share the same PR number, file number, and file group key — collapsing into a single grouped row when viewed later in the PR Raised Files window. After initiate, item statuses update in place below and <span className="font-medium text-foreground">you stay on this tab</span> — no auto-jump.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">PR / GORF Number *</Label>
              <Input
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                placeholder={suggestedPrNumber || "e.g. PR/2025/001"}
                className="bg-background border-border"
              />
              {suggestedPrNumber && (
                <p className="text-[11px] text-muted-foreground">
                  Suggested: <span className="font-mono text-foreground">{suggestedPrNumber}</span> (from Settings → Number Prefixes)
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File Number (with date)</Label>
              <Input
                value={fileNumber}
                onChange={(e) => setFileNumber(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>

          {/* File Group Key (optional) — defaults to PR number so multiple items share a file */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Layers className="h-3 w-3 text-primary" />
              File Group Key (optional)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={usePrAsGroupKey ? prNumber : fileGroupKey}
                onChange={(e) => {
                  setUsePrAsGroupKey(false);
                  setFileGroupKey(e.target.value);
                }}
                placeholder={prNumber || "Defaults to PR Number"}
                className="bg-background border-border"
              />
              {!usePrAsGroupKey && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUsePrAsGroupKey(true);
                    setFileGroupKey("");
                  }}
                  className="gap-1.5 shrink-0"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              {usePrAsGroupKey
                ? `Currently mirroring the PR Number (${prNumber || "—"}). All ${selectedCount} selected items will be grouped under one file.`
                : "Custom group key set. Items initiated with the same key will be grouped together in the file register."}
            </p>
          </div>

          {/* Authorized By (Officer) */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-primary" />
              Authorized By (Officer) *
            </Label>
            <Select
              value={authorizedById}
              onValueChange={setAuthorizedById}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select authorizing officer" />
              </SelectTrigger>
              <SelectContent>
                {officers.length === 0 ? (
                  <SelectItem value="_none" disabled>No officers found</SelectItem>
                ) : (
                  officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                      {o.rankOrRate ? ` — ${o.rankOrRate}` : ""}
                      {o.appointment ? ` (${o.appointment})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedOfficer && (
              <p className="text-[11px] text-muted-foreground">
                {selectedOfficer.name}
                {selectedOfficer.appointment ? ` (${selectedOfficer.appointment})` : ""}
                {selectedOfficer.department ? ` · ${selectedOfficer.department}` : ""}
              </p>
            )}
          </div>

          {/* Created By (Sailor) */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <User className="h-3 w-3 text-primary" />
              Created By (Sailor) *
            </Label>
            <Select
              value={createdById}
              onValueChange={setCreatedById}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select creating sailor" />
              </SelectTrigger>
              <SelectContent>
                {sailors.length === 0 ? (
                  <SelectItem value="_none" disabled>No sailors found</SelectItem>
                ) : (
                  sailors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.rankOrRate ? ` — ${s.rankOrRate}` : ""}
                      {s.appointment ? ` (${s.appointment})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedSailor && (
              <p className="text-[11px] text-muted-foreground">
                {selectedSailor.name}
                {selectedSailor.appointment ? ` (${selectedSailor.appointment})` : ""}
                {selectedSailor.department ? ` · ${selectedSailor.department}` : ""}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || selectedCount === 0} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
            Initiate {selectedCount} PR{selectedCount === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
