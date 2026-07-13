"use client";
import { useMemo, useState } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { LoadingState, ErrorState, EmptyState } from "@/components/erp/states";
import { CustomBadge } from "@/components/erp/badges";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  formatNumber,
  formatCurrency,
  COLLECTION_STATUSES,
  PART_SUPPLY_STATUSES,
  FILE_CATEGORIES,
  QC_LEVELS,
  qcLevelColor,
  AREA_STORES,
  AREA_STORE_CATEGORIES,
  NAV_REFERENCES,
  navRefColor,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  PackageCheck,
  PackageX,
  Layers,
  Plus,
  Calendar,
  Download,
  Truck,
  Printer,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  Boxes,
  BarChart3,
  User,
  ShieldCheck,
  ClipboardCheck,
  Pencil,
  Trash2,
  Loader2,
  Filter,
  AlertCircle,
  Star,
  X,
  Send,
  Store,
  MapPin,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface CollectionItem {
  id: string;
  name: string;
  expectedQty: number;
  status: string;
  dueDate: string | null;
  supplier: string | null;
  createdAt: string;
}

interface PartSupplyEntry {
  id: string;
  srNo: number;
  date: string;
  vehicleNumber: string | null;
  qty: number;
  qcCheckedBy: string | null;
  sailorCount: number;
  driverName: string | null;
  driverLicense: string | null;
  driverPhone: string | null;
  cumulativeBalance: number;
}

interface PartSupplyOrder {
  id: string;
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  balance: number;
  startDate: string | null;
  expectedEndDate: string | null;
  status: string;
  supplier: string | null;
  createdAt: string;
  entries: PartSupplyEntry[];
}

interface DailyCollection {
  id: string;
  date: string;
  itemName: string;
  qty: number;
  receivedFrom: string | null;
  recordedBy: string | null;
  recordedAt: string;
}

interface Project {
  id: string;
  name: string;
  voteNumber: string;
  voteAllocation?: number;
  status?: string;
}

interface StoreItem {
  id: string;
  description: string;
  category: string;
  unit?: string;
  qty: number;
  unitCost: number;
  totalCost?: number;
  supplier?: string | null;
  itemCode?: string | null;
}

interface AreaStoreRecord {
  id: string;
  storeName: string;
  itemCode: string | null;
  itemName: string;
  category: string;
  unit: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  recordType: string; // "Oncharge" | "OffCharge"
  navReference: string | null;
  qcInspectionId: string | null;
  fileNumber: string | null;
  location: string | null;
  date: string | null;
  remarks: string | null;
  createdAt: string;
}

interface QCInspection {
  id: string;
  refType: string;
  refId: string;
  itemName: string;
  supplier: string | null;
  qty: number;
  qcLevel: string;
  qcOfficer: string | null;
  qcOfficerDetails: string | null;
  remarks: string | null;
  inspectedAt: string;
}

interface Stats {
  collection: {
    partSupplyActive: number;
    dailyToday: number;
    dailyTotal: number;
  };
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const PIE_STATUS_COLORS: Record<string, string> = COLLECTION_STATUSES.reduce(
  (acc, status, i) => {
    acc[status] = ["#f59e0b", "#3b82f6", "#22c55e"][i] ?? "#64748b";
    return acc;
  },
  {} as Record<string, string>
);
const DEFAULT_PIE_COLOR = "#64748b";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayISO(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}
function getLast7Days(): string[] {
  const days: string[] = [];
  const t = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(t);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function formatFullDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function progressColor(pct: number): string {
  if (pct > 90) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}
function statusColor(status: string): string {
  if (
    status === "Collected" ||
    (PART_SUPPLY_STATUSES as readonly string[]).includes(status) &&
      status === "Completed"
  ) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  }
  if (status === "In Progress" || status === "Active") {
    return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  }
  if (status === "Pending") {
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  }
  return "bg-slate-500/15 text-slate-300 border-slate-500/30";
}

// Loose case-insensitive partial match between a row's supplier/receivedFrom
// and a project name. Used for project / vote filters on the dashboard.
function looselyMatches(supplier: string | null | undefined, name: string): boolean {
  if (!supplier || !name) return false;
  const a = supplier.toLowerCase().trim();
  const b = name.toLowerCase().trim();
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

// Maps a QC level to a numeric score for supplier aggregation.
function qcLevelToScore(level: string): number {
  switch (level) {
    case "Fail":
      return 1;
    case "Below Average":
      return 2;
    case "Satisfactory":
      return 3;
    case "Good":
      return 4;
    case "Excellent":
      return 5;
    default:
      return 0;
  }
}

function supplierRatingColor(avg: number): string {
  if (avg >= 4.5)
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (avg >= 3.5) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (avg >= 2.5) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (avg >= 1.5)
    return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

function supplierRatingLabel(avg: number): string {
  if (avg >= 4.5) return "Excellent";
  if (avg >= 3.5) return "Good";
  if (avg >= 2.5) return "Satisfactory";
  if (avg >= 1.5) return "Below Average";
  return "Fail";
}

/**
 * Suggest an area store based on the item's store category.
 * Falls back to "General" when no mapping matches.
 *   BMS / Plumbing      → BMS
 *   Metal / Aluminium   → Metal
 *   Paint               → Paint
 *   Lubricant Oil       → Oil & Lubricant
 *   Tools               → General
 *   (default)           → General
 */
function suggestStoreForCategory(category: string | null | undefined): string {
  if (!category) return "General";
  const cat = category.trim();
  for (const [store, cats] of Object.entries(AREA_STORE_CATEGORIES)) {
    if (cats.includes(cat)) return store;
  }
  return "General";
}

/** Whether a QC level is considered "passing" (eligible for transfer to a store). */
function isPassingQc(level: string): boolean {
  return level === "Satisfactory" || level === "Good" || level === "Excellent";
}

// Reference Type options for QC Inspection dialog
const QC_REF_TYPES = [
  "Daily Collection",
  "Part Supply Entry",
  "Collection Item",
] as const;
type QCRefType = (typeof QC_REF_TYPES)[number];

// Generic project/vote filter applied to any row that has a supplier-like field.
// Pure helper (module-level) so the React Compiler can preserve manual memoization.
function applyProjVoteFilter<
  T extends { receivedFrom?: string | null; supplier?: string | null }
>(
  rows: T[],
  refField: "receivedFrom" | "supplier",
  projFilter: string,
  voteFilt: string,
  projectById: Map<string, Project>,
  projectByVote: Map<string, Project>
): T[] {
  let out = rows;
  if (projFilter !== "all") {
    const p = projectById.get(projFilter);
    if (p) {
      const matches = out.filter((r) =>
        looselyMatches(r[refField] ?? null, p.name)
      );
      if (matches.length > 0) out = matches;
    }
  }
  if (voteFilt !== "all") {
    const p = projectByVote.get(voteFilt);
    if (p) {
      const matches = out.filter((r) =>
        looselyMatches(r[refField] ?? null, p.name)
      );
      if (matches.length > 0) out = matches;
    }
  }
  return out;
}

// Type filter — looks up the item in stores by name; only includes rows whose
// store category matches. Items not in stores are excluded when a type is set.
function applyTypeFilter<
  T extends { itemName?: string; name?: string }
>(
  rows: T[],
  nameField: "itemName" | "name",
  tFilter: string,
  storeByName: Map<string, StoreItem>
): T[] {
  if (tFilter === "all") return rows;
  return rows.filter((r) => {
    const name = r[nameField];
    const s = storeByName.get((name || "").toLowerCase().trim());
    return s?.category === tFilter;
  });
}

function unitCostFor(
  itemName: string,
  storeByName: Map<string, StoreItem>
): number {
  const s = storeByName.get((itemName || "").toLowerCase().trim());
  return s?.unitCost ?? 0;
}

function valueFor(
  qty: number,
  itemName: string,
  storeByName: Map<string, StoreItem>
): number {
  return (qty || 0) * unitCostFor(itemName, storeByName);
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────
export function CollectionModule() {
  return (
    <div>
      <PageHeader
        title="Collection"
        description="Track part-supply orders, daily collections & delivery receipts"
        icon={PackageCheck}
      />
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="part-supply" className="gap-1.5">
            <Layers className="h-4 w-4" /> Part Supply
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Daily Collection
          </TabsTrigger>
          <TabsTrigger value="qc" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> QC Inspection
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="part-supply">
          <PartSupplyTab />
        </TabsContent>
        <TabsContent value="daily">
          <DailyCollectionTab />
        </TabsContent>
        <TabsContent value="qc">
          <QCInspectionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Dashboard Tab
// ─────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = useFetch<Stats>("/api/stats");
  const {
    data: items,
    loading: itemsLoading,
    error: itemsError,
  } = useFetch<CollectionItem[]>("/api/collection/items");
  const { data: partSupply } = useFetch<PartSupplyOrder[]>(
    "/api/collection/part-supply"
  );
  const { data: daily } = useFetch<DailyCollection[]>(
    "/api/collection/daily"
  );
  const { data: projects } = useFetch<Project[]>("/api/projects");
  const { data: stores } = useFetch<StoreItem[]>("/api/stores");

  // Filter state
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [voteFilter, setVoteFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"numbers" | "value">("numbers");

  // Lookups
  const storeByName = useMemo(() => {
    const m = new Map<string, StoreItem>();
    (stores ?? []).forEach((s) => {
      const key = (s.description || "").toLowerCase().trim();
      if (key && !m.has(key)) m.set(key, s);
    });
    return m;
  }, [stores]);

  const projectById = useMemo(
    () => new Map((projects ?? []).map((p) => [p.id, p])),
    [projects]
  );
  const projectByVote = useMemo(
    () =>
      new Map(
        (projects ?? [])
          .filter((p) => !!p.voteNumber)
          .map((p) => [p.voteNumber, p])
      ),
    [projects]
  );
  const votes = useMemo(
    () =>
      Array.from(
        new Set((projects ?? []).map((p) => p.voteNumber).filter(Boolean))
      ).sort(),
    [projects]
  );

  // Filtered datasets
  const filteredDaily = useMemo(() => {
    let rows = applyProjVoteFilter(
      daily ?? [],
      "receivedFrom",
      projectFilter,
      voteFilter,
      projectById,
      projectByVote
    );
    rows = applyTypeFilter(rows, "itemName", typeFilter, storeByName);
    return rows;
  }, [
    daily,
    projectFilter,
    voteFilter,
    typeFilter,
    projectById,
    projectByVote,
    storeByName,
  ]);

  const filteredItems = useMemo(() => {
    let rows = applyProjVoteFilter(
      items ?? [],
      "supplier",
      projectFilter,
      voteFilter,
      projectById,
      projectByVote
    );
    rows = applyTypeFilter(rows, "name", typeFilter, storeByName);
    return rows;
  }, [
    items,
    projectFilter,
    voteFilter,
    typeFilter,
    projectById,
    projectByVote,
    storeByName,
  ]);

  const filteredPartSupply = useMemo(() => {
    let rows = applyProjVoteFilter(
      partSupply ?? [],
      "supplier",
      projectFilter,
      voteFilter,
      projectById,
      projectByVote
    );
    rows = applyTypeFilter(rows, "itemName", typeFilter, storeByName);
    return rows;
  }, [
    partSupply,
    projectFilter,
    voteFilter,
    typeFilter,
    projectById,
    projectByVote,
    storeByName,
  ]);

  // Stat figures (derived from filtered datasets)
  const pendingItems = filteredItems.filter(
    (i) => i.status === "Pending" || i.status === "In Progress"
  );
  const pendingQty = pendingItems.reduce(
    (s, i) => s + (i.expectedQty || 0),
    0
  );
  const pendingValue = pendingItems.reduce(
    (s, i) => s + valueFor(i.expectedQty, i.name, storeByName),
    0
  );

  const activePartSupplyOrders = filteredPartSupply.filter(
    (o) => o.status === "Active"
  );
  const activePartSupplyCount =
    stats?.collection?.partSupplyActive != null &&
    projectFilter === "all" &&
    voteFilter === "all" &&
    typeFilter === "all"
      ? stats.collection.partSupplyActive
      : activePartSupplyOrders.length;
  const activePartSupplyValue = activePartSupplyOrders.reduce(
    (s, o) => s + valueFor(o.receivedQty, o.itemName, storeByName),
    0
  );

  const collectedItems = filteredItems.filter(
    (i) => i.status === "Collected"
  );
  const collectedValue = collectedItems.reduce(
    (s, i) => s + valueFor(i.expectedQty, i.name, storeByName),
    0
  );

  const todayStr = todayISO();
  const todayDaily = filteredDaily.filter((d) => d.date === todayStr);
  const todayDailyCount = todayDaily.length;
  const todayDailyValue = todayDaily.reduce(
    (s, d) => s + valueFor(d.qty, d.itemName, storeByName),
    0
  );

  // Trend chart — last 7 days (qty or value depending on viewMode)
  const trendData = useMemo(() => {
    const days = getLast7Days();
    const map = new Map<string, number>();
    filteredDaily.forEach((d) => {
      const v =
        viewMode === "value" ? valueFor(d.qty, d.itemName, storeByName) : d.qty || 0;
      map.set(d.date, (map.get(d.date) || 0) + v);
    });
    return days.map((date) => ({
      name: formatDateLabel(date),
      qty: map.get(date) || 0,
    }));
  }, [filteredDaily, viewMode, storeByName]);

  // Status breakdown (counts or values depending on viewMode)
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredItems.forEach((i) => {
      const v =
        viewMode === "value"
          ? valueFor(i.expectedQty, i.name, storeByName)
          : 1;
      counts[i.status] = (counts[i.status] || 0) + v;
    });
    return COLLECTION_STATUSES.filter((s) => counts[s] > 0).map((name) => ({
      name,
      value: counts[name],
    }));
  }, [filteredItems, viewMode, storeByName]);

  const recentDaily = filteredDaily.slice(0, 5);

  if (itemsLoading) return <LoadingState label="Loading dashboard..." />;
  if (itemsError) return <ErrorState message={itemsError} />;

  const filtersActive =
    projectFilter !== "all" ||
    voteFilter !== "all" ||
    typeFilter !== "all";

  function clearFilters() {
    setProjectFilter("all");
    setVoteFilter("all");
    setTypeFilter("all");
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="h-4 w-4" /> Filters
          </div>
          {filtersActive && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">By Project</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {(projects ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">By Vote</Label>
            <Select value={voteFilter} onValueChange={setVoteFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Votes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Votes</SelectItem>
                {votes.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">By Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {FILE_CATEGORIES.filter((c) => c !== "GEN").map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">View</Label>
            <div className="flex rounded-md border border-border overflow-hidden h-9">
              <button
                type="button"
                onClick={() => setViewMode("numbers")}
                className={cn(
                  "flex-1 text-xs font-medium transition-colors px-3",
                  viewMode === "numbers"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                By Numbers
              </button>
              <button
                type="button"
                onClick={() => setViewMode("value")}
                className={cn(
                  "flex-1 text-xs font-medium transition-colors px-3 border-l border-border",
                  viewMode === "value"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                By Value
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Items to be Received"
          value={
            viewMode === "value"
              ? formatCurrency(pendingValue)
              : pendingItems.length
          }
          icon={PackageX}
          accent="blue"
          sub={
            viewMode === "value"
              ? `${formatCurrency(pendingValue)} expected value`
              : `${formatNumber(pendingQty)} qty expected`
          }
        />
        <StatCard
          label="Part Supply Items"
          value={
            viewMode === "value"
              ? formatCurrency(activePartSupplyValue)
              : activePartSupplyCount
          }
          icon={Layers}
          accent="amber"
          sub={
            viewMode === "value"
              ? `${formatCurrency(activePartSupplyValue)} received value`
              : "Active part-supply orders"
          }
        />
        <StatCard
          label="Collected Items"
          value={
            viewMode === "value"
              ? formatCurrency(todayDailyValue)
              : collectedItems.length
          }
          icon={PackageCheck}
          accent="green"
          sub={
            viewMode === "value"
              ? `${formatCurrency(todayDailyValue)} collected today`
              : `${todayDailyCount} collected today`
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Collection Trend — Last 7 Days
            </h3>
            <CustomBadge className="bg-secondary border-border text-muted-foreground">
              {viewMode === "value" ? "By Value" : "By Numbers"}
            </CustomBadge>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={trendData}
                margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2d3548"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#2d3548" }}
                  tickLine={{ stroke: "#2d3548" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#2d3548" }}
                  tickLine={{ stroke: "#2d3548" }}
                  tickFormatter={(v: number) =>
                    viewMode === "value"
                      ? v >= 1000
                        ? `${(v / 1000).toFixed(0)}k`
                        : String(v)
                      : formatNumber(v)
                  }
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1f2e",
                    border: "1px solid #2d3548",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [
                    viewMode === "value"
                      ? formatCurrency(value)
                      : formatNumber(value),
                    viewMode === "value" ? "Value" : "Qty",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="qty"
                  name={viewMode === "value" ? "Value Collected" : "Qty Collected"}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No collection data
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Items by Status
            </h3>
            <CustomBadge className="bg-secondary border-border text-muted-foreground">
              {viewMode === "value" ? "Value" : "Count"}
            </CustomBadge>
          </div>
          {statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {statusBreakdown.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        PIE_STATUS_COLORS[entry.name] || DEFAULT_PIE_COLOR
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1a1f2e",
                    border: "1px solid #2d3548",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) =>
                    viewMode === "value"
                      ? formatCurrency(value)
                      : formatNumber(value)
                  }
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No items
            </p>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Recent Collection Activity
          </h3>
          <CustomBadge className="bg-secondary border-border text-muted-foreground">
            Last {recentDaily.length || 0}
          </CustomBadge>
        </div>
        {recentDaily.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No recent collections"
            description={
              filtersActive
                ? "No collections match the current filters."
                : "Daily collections will appear here once recorded."
            }
          />
        ) : (
          <ul className="space-y-3">
            {recentDaily.map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
              >
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <PackageCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {d.itemName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {viewMode === "value"
                      ? `${formatCurrency(valueFor(d.qty, d.itemName, storeByName))} value`
                      : `${formatNumber(d.qty)} qty`}{" "}
                    · {d.receivedFrom || "—"} · {formatFullDate(d.date)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                  {formatDateTime(d.recordedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Part Supply Tab
// ─────────────────────────────────────────────────────────
function PartSupplyTab() {
  const { data: orders, loading, error, refresh } = useFetch<
    PartSupplyOrder[]
  >("/api/collection/part-supply");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [entryDialogOrder, setEntryDialogOrder] =
    useState<PartSupplyOrder | null>(null);
  const [printOrder, setPrintOrder] = useState<PartSupplyOrder | null>(null);
  const { toast } = useToast();

  function toggle(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  if (loading) return <LoadingState label="Loading part-supply orders..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Track multi-day deliveries (Ready-mix concrete, Quarry items, TMT
          bars, etc.)
        </p>
        <Button
          onClick={() => setAddOpen(true)}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Part Supply Order
        </Button>
      </div>

      {!orders || orders.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No part-supply orders"
          description="Create an order to start tracking multi-day deliveries."
          action={
            <Button
              onClick={() => setAddOpen(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Part Supply Order
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const pct =
              order.orderedQty > 0
                ? Math.min(
                    (order.receivedQty / order.orderedQty) * 100,
                    100
                  )
                : 0;
            const expanded = expandedId === order.id;
            const isCompleted =
              order.status === "Completed" || order.balance <= 0;
            return (
              <div
                key={order.id}
                className={cn(
                  "bg-card border border-border rounded-xl overflow-hidden transition-all",
                  isCompleted && "opacity-70"
                )}
              >
                {/* Header (always visible) */}
                <button
                  onClick={() => toggle(order.id)}
                  className="w-full p-4 text-left hover:bg-secondary/30 transition-colors"
                  aria-expanded={expanded}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 text-muted-foreground mt-0.5">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {order.itemName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.supplier || "—"} · Started{" "}
                            {formatFullDate(order.startDate)}
                          </p>
                        </div>
                        <CustomBadge
                          className={cn(
                            "border-0 shrink-0",
                            statusColor(order.status)
                          )}
                        >
                          {order.status}
                        </CustomBadge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <MiniStat
                          label="Ordered"
                          value={formatNumber(order.orderedQty)}
                        />
                        <MiniStat
                          label="Received"
                          value={formatNumber(order.receivedQty)}
                          valueClass="text-emerald-400"
                        />
                        <MiniStat
                          label="Balance"
                          value={formatNumber(order.balance)}
                          valueClass="text-amber-400"
                        />
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Complete ({pct.toFixed(0)}%)
                          </p>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mt-1">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                progressColor(pct)
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded body */}
                {expanded && (
                  <div className="border-t border-border p-4 space-y-4 bg-secondary/10">
                    {/* Order summary bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 bg-card border border-border rounded-lg p-3">
                      <SummaryCell
                        label="Item"
                        value={order.itemName}
                      />
                      <SummaryCell
                        label="Ordered Qty"
                        value={formatNumber(order.orderedQty)}
                      />
                      <SummaryCell
                        label="Received Qty"
                        value={formatNumber(order.receivedQty)}
                        accent="text-emerald-400"
                      />
                      <SummaryCell
                        label="Balance"
                        value={formatNumber(order.balance)}
                        accent="text-amber-400"
                      />
                      <div className="col-span-2 sm:col-span-4 lg:col-span-1">
                        <p className="text-[10px] uppercase text-muted-foreground mb-1">
                          Complete ({pct.toFixed(0)}%)
                        </p>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              progressColor(pct)
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delivery entries table */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          Delivery Entries ({order.entries.length})
                        </h4>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setPrintOrder(order)}
                          >
                            <Printer className="h-4 w-4" /> Print Receipt
                          </Button>
                          {!isCompleted && (
                            <Button
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setEntryDialogOrder(order)}
                            >
                              <Plus className="h-4 w-4" /> Add Entry
                            </Button>
                          )}
                        </div>
                      </div>
                      {order.entries.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                          No deliveries recorded yet. Click “Add Entry” to
                          record the first delivery.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-border [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border hover:bg-transparent">
                                <TableHead className="text-muted-foreground">
                                  Sr.
                                </TableHead>
                                <TableHead className="text-muted-foreground">
                                  Date
                                </TableHead>
                                <TableHead className="text-muted-foreground">
                                  Vehicle
                                </TableHead>
                                <TableHead className="text-muted-foreground text-right">
                                  Qty
                                </TableHead>
                                <TableHead className="text-muted-foreground">
                                  QC By
                                </TableHead>
                                <TableHead className="text-muted-foreground text-center">
                                  Sailors
                                </TableHead>
                                <TableHead className="text-muted-foreground">
                                  Driver
                                </TableHead>
                                <TableHead className="text-muted-foreground text-right">
                                  Cum. Bal.
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.entries.map((e) => (
                                <TableRow
                                  key={e.id}
                                  className="border-border"
                                >
                                  <TableCell className="font-medium text-foreground">
                                    {e.srNo}
                                  </TableCell>
                                  <TableCell className="text-foreground whitespace-nowrap">
                                    {formatFullDate(e.date)}
                                  </TableCell>
                                  <TableCell className="text-foreground">
                                    {e.vehicleNumber || "—"}
                                  </TableCell>
                                  <TableCell className="text-foreground text-right whitespace-nowrap">
                                    {formatNumber(e.qty)}
                                  </TableCell>
                                  <TableCell className="text-foreground">
                                    {e.qcCheckedBy || "—"}
                                  </TableCell>
                                  <TableCell className="text-foreground text-center">
                                    {e.sailorCount || 0}
                                  </TableCell>
                                  <TableCell className="text-foreground">
                                    <div className="text-xs leading-tight">
                                      <div>
                                        {e.driverName || "—"}
                                      </div>
                                      {e.driverLicense && (
                                        <div className="text-muted-foreground">
                                          {e.driverLicense}
                                        </div>
                                      )}
                                      {e.driverPhone && (
                                        <div className="text-muted-foreground">
                                          {e.driverPhone}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-foreground text-right font-medium whitespace-nowrap">
                                    {formatNumber(e.cumulativeBalance)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Order Dialog */}
      <AddPartSupplyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          toast({ title: "Part supply order created" });
          refresh();
        }}
      />

      {/* Add Entry Dialog */}
      {entryDialogOrder && (
        <AddEntryDialog
          order={entryDialogOrder}
          open={!!entryDialogOrder}
          onOpenChange={(o) => !o && setEntryDialogOrder(null)}
          onCreated={() => {
            setEntryDialogOrder(null);
            toast({ title: "Delivery entry added" });
            refresh();
          }}
        />
      )}

      {/* Print Receipt Dialog */}
      {printOrder && (
        <PrintReceiptDialog
          order={printOrder}
          open={!!printOrder}
          onOpenChange={(o) => !o && setPrintOrder(null)}
        />
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm font-medium text-foreground",
          valueClass
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm font-medium truncate",
          accent ?? "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Add Part Supply Order Dialog
// ─────────────────────────────────────────────────────────
function AddPartSupplyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [itemName, setItemName] = useState("");
  const [orderedQty, setOrderedQty] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!itemName.trim()) {
      toast({ title: "Item name required", variant: "destructive" });
      return;
    }
    if (!orderedQty || Number(orderedQty) <= 0) {
      toast({ title: "Valid ordered qty required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const res = await apiRequest("/api/collection/part-supply", "POST", {
      itemName: itemName.trim(),
      orderedQty: Number(orderedQty),
      startDate: startDate || undefined,
      expectedEndDate: expectedEndDate || undefined,
      supplier: supplier.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }
    setItemName("");
    setOrderedQty("");
    setExpectedEndDate("");
    setSupplier("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Part Supply Order</DialogTitle>
          <DialogDescription>
            Create a new multi-day delivery order to track partial receipts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Item Name</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Ready-mix concrete M25"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ordered Qty</Label>
              <Input
                type="number"
                value={orderedQty}
                onChange={(e) => setOrderedQty(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expected End Date</Label>
              <Input
                type="date"
                value={expectedEndDate}
                onChange={(e) => setExpectedEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Add Entry Dialog
// ─────────────────────────────────────────────────────────
function AddEntryDialog({
  order,
  open,
  onOpenChange,
  onCreated,
}: {
  order: PartSupplyOrder;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [qty, setQty] = useState("");
  const [qcCheckedBy, setQcCheckedBy] = useState("");
  const [sailorCount, setSailorCount] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!qty || Number(qty) <= 0) {
      toast({ title: "Valid qty required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const res = await apiRequest(
      `/api/collection/part-supply/${order.id}/entries`,
      "POST",
      {
        date,
        vehicleNumber: vehicleNumber.trim() || undefined,
        qty: Number(qty),
        qcCheckedBy: qcCheckedBy.trim() || undefined,
        sailorCount: Number(sailorCount) || 0,
        driverName: driverName.trim() || undefined,
        driverLicense: driverLicense.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
      }
    );
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }
    setVehicleNumber("");
    setQty("");
    setQcCheckedBy("");
    setSailorCount("");
    setDriverName("");
    setDriverLicense("");
    setDriverPhone("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Delivery Entry</DialogTitle>
          <DialogDescription>
            {order.itemName} · Ordered {formatNumber(order.orderedQty)} ·
            Balance {formatNumber(order.balance)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vehicle Number</Label>
            <Input
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="TN-01-AB-1234"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>QC Checked By</Label>
            <Input
              value={qcCheckedBy}
              onChange={(e) => setQcCheckedBy(e.target.value)}
              placeholder="Inspector name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>No. of Sailors</Label>
            <Input
              type="number"
              value={sailorCount}
              onChange={(e) => setSailorCount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Driver Name</Label>
            <Input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Driver name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Driver License</Label>
            <Input
              value={driverLicense}
              onChange={(e) => setDriverLicense(e.target.value)}
              placeholder="License no."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Driver Phone</Label>
            <Input
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="Phone no."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : "Add Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Print Receipt Dialog
// ─────────────────────────────────────────────────────────
function PrintReceiptDialog({
  order,
  open,
  onOpenChange,
}: {
  order: PartSupplyOrder;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const pct =
    order.orderedQty > 0
      ? Math.min((order.receivedQty / order.orderedQty) * 100, 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-3xl print-receipt"
      >
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .print-receipt, .print-receipt * { visibility: visible !important; }
            .print-receipt {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 24px !important;
              transform: none !important;
              border: 0 !important;
              box-shadow: none !important;
            }
            .no-print { display: none !important; }
          }
        `}</style>
        <DialogHeader className="no-print">
          <DialogTitle>Daily Receipt — {order.itemName}</DialogTitle>
          <DialogDescription>
            Review and print the delivery receipt for this part-supply order.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Receipt header */}
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-foreground">
              CE Logistic Panel — Dockyard
            </h2>
            <p className="text-sm text-muted-foreground">
              Part Supply Delivery Receipt
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Item
              </p>
              <p className="font-medium text-foreground">{order.itemName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Supplier
              </p>
              <p className="font-medium text-foreground">
                {order.supplier || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Start Date
              </p>
              <p className="font-medium text-foreground">
                {formatFullDate(order.startDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Expected End
              </p>
              <p className="font-medium text-foreground">
                {formatFullDate(order.expectedEndDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Ordered Qty
              </p>
              <p className="font-medium text-foreground">
                {formatNumber(order.orderedQty)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Received Qty
              </p>
              <p className="font-medium text-emerald-600">
                {formatNumber(order.receivedQty)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Balance
              </p>
              <p className="font-medium text-amber-600">
                {formatNumber(order.balance)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">
                Complete
              </p>
              <p className="font-medium text-foreground">
                {pct.toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Sr.</TableHead>
                  <TableHead className="text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Vehicle
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Qty
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    QC By
                  </TableHead>
                  <TableHead className="text-muted-foreground text-center">
                    Sailors
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Driver
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Cum. Bal.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.entries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground"
                    >
                      No entries
                    </TableCell>
                  </TableRow>
                ) : (
                  order.entries.map((e) => (
                    <TableRow key={e.id} className="border-border">
                      <TableCell>{e.srNo}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatFullDate(e.date)}
                      </TableCell>
                      <TableCell>{e.vehicleNumber || "—"}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(e.qty)}
                      </TableCell>
                      <TableCell>{e.qcCheckedBy || "—"}</TableCell>
                      <TableCell className="text-center">
                        {e.sailorCount || 0}
                      </TableCell>
                      <TableCell>
                        {[e.driverName, e.driverLicense, e.driverPhone]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(e.cumulativeBalance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Generated on {formatDateTime(new Date().toISOString())}
          </p>
        </div>
        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Daily Collection Tab
// ─────────────────────────────────────────────────────────
type FilterMode = "all" | "today" | "yesterday" | "custom" | "range";
type ViewMode = "date" | "period" | "supplier";

function DailyCollectionTab() {
  const today = todayISO();
  const yesterday = yesterdayISO();
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [customDate, setCustomDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("date");

  const [recordOpen, setRecordOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { toast } = useToast();

  const dailyUrl = useMemo(() => {
    const base = "/api/collection/daily";
    if (filterMode === "today") return `${base}?date=${today}`;
    if (filterMode === "yesterday") return `${base}?date=${yesterday}`;
    if (filterMode === "custom" && customDate)
      return `${base}?date=${customDate}`;
    if (filterMode === "range" && fromDate && toDate)
      return `${base}?from=${fromDate}&to=${toDate}`;
    return base;
  }, [filterMode, customDate, fromDate, toDate, today, yesterday]);

  const { data: daily, loading, error, refresh } =
    useFetch<DailyCollection[]>(dailyUrl);

  const grouped = useMemo(() => {
    const rows = daily ?? [];
    if (viewMode === "date") return groupByDate(rows);
    if (viewMode === "period") return groupByPeriod(rows);
    return groupBySupplier(rows);
  }, [daily, viewMode]);

  function exportCSV() {
    const rows = daily ?? [];
    if (rows.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const header = [
      "Date",
      "Item Name",
      "Qty",
      "Received From",
      "Recorded By",
      "Recorded At",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.date,
          `"${(r.itemName || "").replace(/"/g, '""')}"`,
          r.qty,
          `"${(r.receivedFrom || "").replace(/"/g, '""')}"`,
          `"${(r.recordedBy || "").replace(/"/g, '""')}"`,
          `"${formatDateTime(r.recordedAt)}"`,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-collection-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  }

  if (loading) return <LoadingState label="Loading daily collections..." />;
  if (error) return <ErrorState message={error} />;

  const totalQty = (daily ?? []).reduce((s, d) => s + d.qty, 0);

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Filter:</span>
          <Button
            size="sm"
            variant={filterMode === "all" ? "default" : "outline"}
            onClick={() => setFilterMode("all")}
            className="gap-1.5"
          >
            <Boxes className="h-3.5 w-3.5" /> All
          </Button>
          <Button
            size="sm"
            variant={filterMode === "today" ? "default" : "outline"}
            onClick={() => setFilterMode("today")}
            className="gap-1.5"
          >
            <CalendarDays className="h-3.5 w-3.5" /> Today
          </Button>
          <Button
            size="sm"
            variant={filterMode === "yesterday" ? "default" : "outline"}
            onClick={() => setFilterMode("yesterday")}
            className="gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5" /> Yesterday
          </Button>
          <Button
            size="sm"
            variant={filterMode === "custom" ? "default" : "outline"}
            onClick={() => setFilterMode("custom")}
            className="gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5" /> Custom
          </Button>
          <Button
            size="sm"
            variant={filterMode === "range" ? "default" : "outline"}
            onClick={() => setFilterMode("range")}
            className="gap-1.5"
          >
            <CalendarRange className="h-3.5 w-3.5" /> Range
          </Button>
          {filterMode === "custom" && (
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-8 w-auto text-xs"
            />
          )}
          {filterMode === "range" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 w-auto text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 w-auto text-xs"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Group:</span>
            <Button
              size="sm"
              variant={viewMode === "date" ? "default" : "outline"}
              onClick={() => setViewMode("date")}
            >
              By Date
            </Button>
            <Button
              size="sm"
              variant={viewMode === "period" ? "default" : "outline"}
              onClick={() => setViewMode("period")}
            >
              By Period
            </Button>
            <Button
              size="sm"
              variant={viewMode === "supplier" ? "default" : "outline"}
              onClick={() => setViewMode("supplier")}
            >
              By Supplier
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="gap-1.5"
            >
              <ClipboardList className="h-4 w-4" /> Bulk Record
            </Button>
            <Button
              size="sm"
              onClick={() => setRecordOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Record Collection
            </Button>
          </div>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <CustomBadge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
          {daily?.length ?? 0} entries
        </CustomBadge>
        <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
          {formatNumber(totalQty)} total qty
        </CustomBadge>
        <CustomBadge className="bg-secondary text-muted-foreground border-border">
          {grouped.length} groups
        </CustomBadge>
      </div>

      {/* Grouped list */}
      {!daily || daily.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No daily collections"
          description="No collections match the current filter. Record a collection to get started."
          action={
            <Button
              onClick={() => setRecordOpen(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Record Collection
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([groupKey, rows]) => (
            <div
              key={groupKey}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-secondary/40 border-b border-border flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {groupKey}
                </h4>
                <span className="text-xs text-muted-foreground shrink-0">
                  {rows.length} entries ·{" "}
                  {formatNumber(rows.reduce((s, r) => s + r.qty, 0))} qty
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
                <ul className="divide-y divide-border">
                  {rows.map((r) => (
                    <li
                      key={r.id}
                      className="px-4 py-3 flex items-start gap-3 hover:bg-secondary/20 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <PackageCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {r.itemName}
                          </p>
                          <span className="text-sm font-semibold text-emerald-400 shrink-0">
                            {formatNumber(r.qty)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />{" "}
                            {r.receivedFrom || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {r.recordedBy || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />{" "}
                            {formatFullDate(r.date)}
                          </span>
                          <span>· {formatDateTime(r.recordedAt)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Collection Dialog */}
      <RecordCollectionDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onCreated={() => {
          setRecordOpen(false);
          toast({ title: "Collection recorded" });
          refresh();
        }}
      />

      {/* Bulk Record Dialog */}
      <BulkRecordDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onCreated={() => {
          setBulkOpen(false);
          toast({ title: "Bulk collections recorded" });
          refresh();
        }}
      />
    </div>
  );
}

// Group helpers
function groupByDate(
  rows: DailyCollection[]
): [string, DailyCollection[]][] {
  const map = new Map<string, DailyCollection[]>();
  rows.forEach((r) => {
    if (!map.has(r.date)) map.set(r.date, []);
    map.get(r.date)!.push(r);
  });
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
}

function getISOWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  // January 4 is always in week 1
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

function getWeekRange(dateStr: string): { key: string; label: string } {
  const d = new Date(dateStr + "T00:00:00");
  const dayOfWeek = (d.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekNum = getISOWeek(dateStr);
  const year = monday.getFullYear();
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return {
    key: `${year}-W${String(weekNum).padStart(2, "0")}`,
    label: `Week ${weekNum} · ${fmt(monday)} – ${fmt(sunday)}`,
  };
}

function groupByPeriod(
  rows: DailyCollection[]
): [string, DailyCollection[]][] {
  const map = new Map<string, DailyCollection[]>();
  const labels = new Map<string, string>();
  rows.forEach((r) => {
    const { key, label } = getWeekRange(r.date);
    if (!map.has(key)) {
      map.set(key, []);
      labels.set(key, label);
    }
    map.get(key)!.push(r);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(
      ([key, val]) => [labels.get(key) || key, val] as [string, DailyCollection[]]
    );
}

function groupBySupplier(
  rows: DailyCollection[]
): [string, DailyCollection[]][] {
  const map = new Map<string, DailyCollection[]>();
  rows.forEach((r) => {
    const k = r.receivedFrom || "Unknown Supplier";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

// ─────────────────────────────────────────────────────────
// Record Collection Dialog
// ─────────────────────────────────────────────────────────
function RecordCollectionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [recordedBy, setRecordedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!itemName.trim()) {
      toast({ title: "Item name required", variant: "destructive" });
      return;
    }
    if (!qty || Number(qty) <= 0) {
      toast({ title: "Valid qty required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const res = await apiRequest("/api/collection/daily", "POST", {
      date,
      itemName: itemName.trim(),
      qty: Number(qty),
      receivedFrom: receivedFrom.trim() || undefined,
      recordedBy: recordedBy.trim() || "Clerk",
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }
    setItemName("");
    setQty("");
    setReceivedFrom("");
    setRecordedBy("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Collection</DialogTitle>
          <DialogDescription>
            Record a single item collection event for today or any date.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Item Name</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. TMT bars 16mm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Received From</Label>
              <Input
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                placeholder="Supplier"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Recorded By</Label>
            <Input
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Bulk Record Dialog
// ─────────────────────────────────────────────────────────
function BulkRecordDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const { data: items, loading } = useFetch<CollectionItem[]>(
    open ? "/api/collection/items" : null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(todayISO());
  const [qty, setQty] = useState("");
  const [recordedBy, setRecordedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const pending = (items ?? []).filter((i) => i.status !== "Collected");

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === pending.length && pending.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((p) => p.id)));
    }
  }

  async function submit() {
    if (selected.size === 0) {
      toast({ title: "Select at least one item", variant: "destructive" });
      return;
    }
    if (!qty || Number(qty) <= 0) {
      toast({ title: "Valid qty required", variant: "destructive" });
      return;
    }
    const payload = pending
      .filter((p) => selected.has(p.id))
      .map((p) => ({
        date,
        itemName: p.name,
        qty: Number(qty),
        receivedFrom: p.supplier || undefined,
        recordedBy: recordedBy.trim() || "Clerk",
      }));
    setSubmitting(true);
    const res = await apiRequest("/api/collection/daily", "POST", payload);
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }
    setSelected(new Set());
    setQty("");
    setRecordedBy("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Record Collections</DialogTitle>
          <DialogDescription>
            Select pending items, enter a single qty & date — submits all
            selected as daily collection records.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Common fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Qty (all)</Label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Recorded By</Label>
              <Input
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                placeholder="Clerk"
              />
            </div>
          </div>

          {/* Pending items list */}
          <div className="border border-border rounded-lg">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
              <span className="text-xs font-medium text-foreground">
                Pending Items ({pending.length})
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleAll}
                className="h-6 text-xs"
                disabled={pending.length === 0}
              >
                {selected.size === pending.length && pending.length > 0
                  ? "Clear"
                  : "Select All"}
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading items...
                </div>
              ) : pending.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No pending items. All collection items are marked as
                  Collected.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {pending.map((item) => {
                    const checked = selected.has(item.id);
                    return (
                      <li key={item.id}>
                        <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/30 transition-colors">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(item.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              Expected {formatNumber(item.expectedQty)} ·{" "}
                              {item.supplier || "—"} · {item.status}
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {selected.size} item{selected.size !== 1 ? "s" : ""} selected ·
            Each will create a daily collection record of{" "}
            <span className="text-foreground font-medium">
              {qty || "0"}
            </span>{" "}
            qty on{" "}
            <span className="text-foreground font-medium">{date}</span>.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || selected.size === 0}
          >
            {submitting
              ? "Saving..."
              : `Record ${selected.size || ""} Collection${
                  selected.size !== 1 ? "s" : ""
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// QC Inspection Tab
// ─────────────────────────────────────────────────────────
interface RefOption {
  value: string;
  label: string;
  itemName: string;
  supplier: string;
  qty: number;
}

function QCInspectionTab() {
  const {
    data: inspections,
    loading,
    error,
    refresh,
  } = useFetch<QCInspection[]>("/api/qc");
  // Area store records (used to detect which inspections have already been
  // transferred to a store, and to show a "Sent to {store}" badge on them).
  const {
    data: areaStoreRecords,
    refresh: refreshAreaStores,
  } = useFetch<AreaStoreRecord[]>("/api/area-stores");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QCInspection | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sendTarget, setSendTarget] = useState<QCInspection | null>(null);
  const { toast } = useToast();

  const total = inspections?.length ?? 0;
  const passed = (inspections ?? []).filter((i) =>
    ["Satisfactory", "Good", "Excellent"].includes(i.qcLevel)
  ).length;
  const failed = (inspections ?? []).filter((i) => i.qcLevel === "Fail").length;
  const passRate = total > 0 ? (passed / total) * 100 : 0;

  // Build a lookup of "transferred" area store records keyed by
  // (a) qcInspectionId — direct link,
  // (b) lowercased itemName — fallback when no qcInspectionId was set,
  // (c) fileNumber — when one was captured in the send dialog.
  // Each entry stores the most recent matching AreaStoreRecord so the UI can
  // show "Sent to {store}" without re-fetching.
  const transferredByInspection = useMemo(() => {
    const map = new Map<string, AreaStoreRecord>();
    (areaStoreRecords ?? []).forEach((r) => {
      if (r.qcInspectionId) {
        // Keep the most recent
        const existing = map.get(r.qcInspectionId);
        if (!existing || r.createdAt > existing.createdAt) {
          map.set(r.qcInspectionId, r);
        }
      }
    });
    return map;
  }, [areaStoreRecords]);

  const transferredByName = useMemo(() => {
    const map = new Map<string, AreaStoreRecord>();
    (areaStoreRecords ?? []).forEach((r) => {
      const key = (r.itemName || "").toLowerCase().trim();
      if (!key) return;
      const existing = map.get(key);
      if (!existing || r.createdAt > existing.createdAt) {
        map.set(key, r);
      }
    });
    return map;
  }, [areaStoreRecords]);

  // Find the area store record that this inspection was transferred to (if any).
  function transferredRecordFor(i: QCInspection): AreaStoreRecord | null {
    if (!i) return null;
    const byId = transferredByInspection.get(i.id);
    if (byId) return byId;
    const byName = transferredByName.get((i.itemName || "").toLowerCase().trim());
    return byName ?? null;
  }

  // Supplier rating aggregation
  const supplierRatings = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    (inspections ?? []).forEach((i) => {
      const sup = (i.supplier || "Unknown Supplier").trim() || "Unknown Supplier";
      const cur = map.get(sup) || { sum: 0, count: 0 };
      cur.sum += qcLevelToScore(i.qcLevel);
      cur.count += 1;
      map.set(sup, cur);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        avg: v.count > 0 ? v.sum / v.count : 0,
        count: v.count,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [inspections]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(insp: QCInspection) {
    setEditing(insp);
    setDialogOpen(true);
  }
  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await apiRequest(`/api/qc/${deleteId}`, "DELETE");
    setDeleting(false);
    if (!res.ok) {
      toast({ title: res.error || "Failed to delete", variant: "destructive" });
      return;
    }
    toast({ title: "Inspection deleted" });
    setDeleteId(null);
    refresh();
  }

  if (loading) return <LoadingState label="Loading QC inspections..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Inspections"
          value={total}
          icon={ClipboardCheck}
          accent="blue"
          sub="All QC records"
        />
        <StatCard
          label="Passed"
          value={passed}
          icon={ShieldCheck}
          accent="green"
          sub="Satisfactory+Good+Excellent"
        />
        <StatCard
          label="Failed"
          value={failed}
          icon={AlertCircle}
          accent="red"
          sub="Rejected items"
        />
        <StatCard
          label="Pass Rate"
          value={`${passRate.toFixed(1)}%`}
          icon={BarChart3}
          accent="amber"
          sub={`${passed}/${total} passed`}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Quality Control Inspections evaluate &amp; rate suppliers for
          collected and part-supplied items.
        </p>
        <Button
          onClick={openCreate}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" /> New QC Inspection
        </Button>
      </div>

      {/* Inspections table */}
      {!inspections || inspections.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No QC inspections"
          description="Record a QC inspection to start evaluating suppliers."
          action={
            <Button onClick={openCreate} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New QC Inspection
            </Button>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground whitespace-nowrap">
                    Inspected At
                  </TableHead>
                  <TableHead className="text-muted-foreground">Item</TableHead>
                  <TableHead className="text-muted-foreground">
                    Supplier
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Qty
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    QC Level
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    QCI Officer
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Remarks
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Area Store
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((i) => {
                  const transferred = transferredRecordFor(i);
                  const passing = isPassingQc(i.qcLevel);
                  return (
                    <TableRow key={i.id} className="border-border">
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(i.inspectedAt)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wide">
                          {i.refType}
                        </div>
                        <div className="font-medium truncate max-w-[220px]">
                          {i.itemName}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground whitespace-nowrap">
                        {i.supplier || "—"}
                      </TableCell>
                      <TableCell className="text-foreground text-right whitespace-nowrap">
                        {formatNumber(i.qty)}
                      </TableCell>
                      <TableCell>
                        <CustomBadge
                          className={cn("border", qcLevelColor(i.qcLevel))}
                        >
                          {i.qcLevel}
                        </CustomBadge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="text-sm">{i.qcOfficer || "—"}</div>
                        {i.qcOfficerDetails && (
                          <div className="text-xs text-muted-foreground">
                            {i.qcOfficerDetails}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                          {i.remarks || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {transferred ? (
                          <div className="flex flex-col gap-1">
                            <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                              <Store className="h-3 w-3 mr-1" />
                              Sent to {transferred.storeName}
                            </CustomBadge>
                            {transferred.navReference && (
                              <CustomBadge
                                className={cn(
                                  "border",
                                  navRefColor(transferred.navReference)
                                )}
                              >
                                {transferred.navReference}
                              </CustomBadge>
                            )}
                          </div>
                        ) : passing ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-7 text-xs"
                            onClick={() => setSendTarget(i)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            Send to Store
                          </Button>
                        ) : (
                          <CustomBadge
                            className="bg-red-500/10 text-red-400 border-red-500/30"
                            title="Failed inspections cannot be transferred to a store"
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Rejected — cannot transfer
                          </CustomBadge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(i)}
                            aria-label="Edit inspection"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:text-red-400"
                            onClick={() => setDeleteId(i.id)}
                            aria-label="Delete inspection"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Supplier rating summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">
              Supplier Rating Summary
            </h3>
          </div>
          <CustomBadge className="bg-secondary border-border text-muted-foreground">
            {supplierRatings.length} supplier
            {supplierRatings.length !== 1 ? "s" : ""}
          </CustomBadge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Aggregated from QC inspection results. Levels map to a 1–5 score
          (Fail=1, Below Average=2, Satisfactory=3, Good=4, Excellent=5).
        </p>
        {supplierRatings.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No supplier ratings yet"
            description="QC inspections will aggregate supplier ratings here."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {supplierRatings.map((s) => (
              <div
                key={s.name}
                className="border border-border rounded-lg p-3 bg-secondary/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate min-w-0">
                    {s.name}
                  </p>
                  <CustomBadge
                    className={cn(
                      "border shrink-0",
                      supplierRatingColor(s.avg)
                    )}
                  >
                    {supplierRatingLabel(s.avg)}
                  </CustomBadge>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {s.avg.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / 5.00 · {s.count} inspection{s.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <Progress
                  value={(s.avg / 5) * 100}
                  className="mt-2 h-1.5"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <QCInspectionDialog
          key={editing?.id || "new"}
          open={dialogOpen}
          onOpenChange={(o) => !o && closeDialog()}
          editing={editing}
          onSaved={() => {
            closeDialog();
            toast({
              title: editing ? "Inspection updated" : "Inspection recorded",
            });
            refresh();
          }}
        />
      )}

      {/* Send to Area Store dialog */}
      {sendTarget && (
        <SendToAreaStoreDialog
          key={`send-${sendTarget.id}`}
          open={!!sendTarget}
          inspection={sendTarget}
          onOpenChange={(o) => !o && setSendTarget(null)}
          onSent={(storeName) => {
            setSendTarget(null);
            toast({
              title: "Item sent to Area Store",
              description: `Item sent to ${storeName} Area Store`,
            });
            refreshAreaStores();
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete QC inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The inspection record will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// QC Inspection Dialog (Create / Edit)
// ─────────────────────────────────────────────────────────
function QCInspectionDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: QCInspection | null;
  onSaved: () => void;
}) {
  const isEdit = !!editing;

  const [refType, setRefType] = useState<QCRefType>(
    (editing?.refType as QCRefType) || "Daily Collection"
  );
  const [refId, setRefId] = useState<string>(editing?.refId || "");
  const [itemName, setItemName] = useState<string>(editing?.itemName || "");
  const [supplier, setSupplier] = useState<string>(editing?.supplier || "");
  const [qty, setQty] = useState<string>(
    editing ? String(editing.qty ?? "") : ""
  );
  const [qcLevel, setQcLevel] = useState<string>(
    editing?.qcLevel || "Satisfactory"
  );
  const [qcOfficer, setQcOfficer] = useState<string>(
    editing?.qcOfficer || ""
  );
  const [qcOfficerDetails, setQcOfficerDetails] = useState<string>(
    editing?.qcOfficerDetails || ""
  );
  const [remarks, setRemarks] = useState<string>(editing?.remarks || "");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch reference options based on refType (only in create mode)
  const refUrl = useMemo<string | null>(() => {
    if (!open || isEdit) return null;
    if (refType === "Daily Collection") return "/api/collection/daily";
    if (refType === "Part Supply Entry") return "/api/collection/part-supply";
    if (refType === "Collection Item") return "/api/collection/items";
    return null;
  }, [open, isEdit, refType]);

  const { data: refData, loading: refLoading } = useFetch<unknown[]>(refUrl);

  // When the user changes refType (create mode), reset the dependent fields.
  // Done in the change handler (not an effect) to avoid cascading renders.
  function handleRefTypeChange(next: QCRefType) {
    setRefType(next);
    if (isEdit) return;
    setRefId("");
    setItemName("");
    setSupplier("");
    setQty("");
  }

  const refOptions = useMemo<RefOption[]>(() => {
    if (!refData) return [];
    if (refType === "Daily Collection") {
      return (refData as DailyCollection[]).map((d) => ({
        value: d.id,
        label: `${d.itemName} — ${formatNumber(d.qty)} ${formatFullDate(
          d.date
        )} (${d.receivedFrom || "—"})`,
        itemName: d.itemName,
        supplier: d.receivedFrom || "",
        qty: d.qty,
      }));
    }
    if (refType === "Part Supply Entry") {
      return (refData as PartSupplyOrder[]).flatMap((o) =>
        o.entries.map((e) => ({
          value: e.id,
          label: `${o.itemName} — ${formatNumber(e.qty)} ${formatFullDate(
            e.date
          )} (entry ${e.srNo})`,
          itemName: o.itemName,
          supplier: o.supplier || "",
          qty: e.qty,
        }))
      );
    }
    if (refType === "Collection Item") {
      return (refData as CollectionItem[]).map((i) => ({
        value: i.id,
        label: `${i.name} — ${formatNumber(i.expectedQty)}`,
        itemName: i.name,
        supplier: i.supplier || "",
        qty: i.expectedQty,
      }));
    }
    return [];
  }, [refData, refType]);

  function handleRefChange(val: string) {
    setRefId(val);
    const opt = refOptions.find((o) => o.value === val);
    if (opt) {
      setItemName(opt.itemName);
      setSupplier(opt.supplier);
      setQty(String(opt.qty));
    }
  }

  async function submit() {
    if (!isEdit) {
      if (!refType) {
        toast({ title: "Reference type required", variant: "destructive" });
        return;
      }
      if (!refId) {
        toast({ title: "Reference required", variant: "destructive" });
        return;
      }
      if (!itemName.trim()) {
        toast({ title: "Item name required", variant: "destructive" });
        return;
      }
    }
    if (!qcOfficer.trim()) {
      toast({ title: "QCI Officer name required", variant: "destructive" });
      return;
    }
    if (qcLevel === "Fail" && !remarks.trim()) {
      toast({
        title: "Remarks required when QC Level is Fail",
        description: "Please provide remarks explaining the failure.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const url = isEdit ? `/api/qc/${editing!.id}` : "/api/qc";
    const method = isEdit ? "PUT" : "POST";
    const body = isEdit
      ? {
          qcLevel,
          qcOfficer: qcOfficer.trim(),
          qcOfficerDetails: qcOfficerDetails.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }
      : {
          refType,
          refId,
          itemName: itemName.trim(),
          supplier: supplier.trim() || undefined,
          qty: Number(qty) || 0,
          qcLevel,
          qcOfficer: qcOfficer.trim(),
          qcOfficerDetails: qcOfficerDetails.trim() || undefined,
          remarks: remarks.trim() || undefined,
        };
    const res = await apiRequest(url, method, body);
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: res.error || "Failed to save", variant: "destructive" });
      return;
    }
    onSaved();
  }

  const isFail = qcLevel === "Fail";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit QC Inspection" : "New QC Inspection"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update QC level, officer & remarks for this inspection."
              : "Evaluate and rate a collected or part-supplied item."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Reference type */}
          <div className="space-y-1.5">
            <Label>Reference Type</Label>
            <Select
              value={refType}
              onValueChange={(v) => handleRefTypeChange(v as QCRefType)}
              disabled={isEdit}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select reference type" />
              </SelectTrigger>
              <SelectContent>
                {QC_REF_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference (create mode only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Select value={refId} onValueChange={handleRefChange}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      refLoading
                        ? "Loading..."
                        : `Select a ${refType.toLowerCase()}`
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {refOptions.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No options
                    </SelectItem>
                  ) : (
                    refOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Item Name */}
          <div className="space-y-1.5">
            <Label>Item Name</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Item name"
              disabled={isEdit}
            />
          </div>

          {/* Supplier + Qty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                disabled={isEdit}
              />
            </div>
          </div>

          {/* QC Level */}
          <div className="space-y-1.5">
            <Label>QC Level</Label>
            <Select value={qcLevel} onValueChange={setQcLevel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select QC level" />
              </SelectTrigger>
              <SelectContent>
                {QC_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Officer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                QCI Officer Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={qcOfficer}
                onChange={(e) => setQcOfficer(e.target.value)}
                placeholder="e.g. PO Bandara"
              />
            </div>
            <div className="space-y-1.5">
              <Label>QCI Officer Details</Label>
              <Input
                value={qcOfficerDetails}
                onChange={(e) => setQcOfficerDetails(e.target.value)}
                placeholder="e.g. QC Bay 2"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>
                Remarks{" "}
                {isFail && <span className="text-red-400">*</span>}
              </span>
              {isFail && (
                <span className="text-xs text-red-400 font-normal">
                  Remarks required when Fail
                </span>
              )}
            </Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                isFail
                  ? "Explain the reason for failure..."
                  : "Optional notes about the inspection..."
              }
              rows={3}
              className={cn(
                isFail &&
                  !remarks.trim() &&
                  "border-red-500/50 focus-visible:border-red-500"
              )}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting
              ? "Saving..."
              : isEdit
              ? "Update Inspection"
              : "Record Inspection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Send to Area Store Dialog — transfer a passing QCI item into an area store
// ─────────────────────────────────────────────────────────
function SendToAreaStoreDialog({
  open,
  onOpenChange,
  inspection,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inspection: QCInspection;
  onSent: (storeName: string) => void;
}) {
  const { toast } = useToast();
  const { data: storeItems } = useFetch<StoreItem[]>("/api/stores");

  // Look up the matching store item (by description, case-insensitive).
  const matchedStoreItem = useMemo(() => {
    if (!storeItems || !inspection.itemName) return null;
    const target = inspection.itemName.toLowerCase().trim();
    return (
      storeItems.find((s) => (s.description || "").toLowerCase().trim() === target) ??
      null
    );
  }, [storeItems, inspection.itemName]);

  // Suggested area store derived from the matched store item's category.
  const suggestedStore = useMemo(() => {
    if (matchedStoreItem?.category) {
      return suggestStoreForCategory(matchedStoreItem.category);
    }
    return "General";
  }, [matchedStoreItem]);

  // Suggested category for the new area store record (from store item or "General").
  const suggestedCategory = useMemo(() => {
    return matchedStoreItem?.category ?? "General";
  }, [matchedStoreItem]);

  // Suggested unit from store item or "NOS".
  const suggestedUnit = useMemo(() => {
    return matchedStoreItem?.unit ?? "NOS";
  }, [matchedStoreItem]);

  // Suggested unit cost from store item (0 when unknown).
  const suggestedUnitCost = useMemo(() => {
    return matchedStoreItem?.unitCost ?? 0;
  }, [matchedStoreItem]);

  // Suggested item code from store item.
  const suggestedItemCode = useMemo(() => {
    return matchedStoreItem?.itemCode ?? "";
  }, [matchedStoreItem]);

  // Form state (initialised once per inspection via the `key` prop on caller).
  const [storeName, setStoreName] = useState<string>(suggestedStore);
  const [itemCode, setItemCode] = useState<string>(suggestedItemCode);
  const [itemName, setItemName] = useState<string>(inspection.itemName || "");
  const [category, setCategory] = useState<string>(suggestedCategory);
  const [unit, setUnit] = useState<string>(suggestedUnit);
  const [qty, setQty] = useState<string>(
    inspection.qty != null ? String(inspection.qty) : ""
  );
  const [unitCost, setUnitCost] = useState<string>(
    suggestedUnitCost ? String(suggestedUnitCost) : ""
  );
  const [navReference, setNavReference] = useState<string>("NAV 255");
  const [fileNumber, setFileNumber] = useState<string>("");
  const [location, setLocation] = useState<string>(`${suggestedStore} Store`);
  const [date, setDate] = useState<string>(todayISO());
  const [remarks, setRemarks] = useState<string>(
    "Transferred from QCI after inspection passed"
  );
  const [submitting, setSubmitting] = useState(false);

  // Compute total cost live for the footer preview.
  const totalCost = useMemo(() => {
    const q = Number(qty) || 0;
    const c = Number(unitCost) || 0;
    return q * c;
  }, [qty, unitCost]);

  // Categories allowed for the currently-selected area store (per
  // AREA_STORE_CATEGORIES), falling back to the full FILE_CATEGORIES list.
  const allowedCategories = useMemo(() => {
    const list = AREA_STORE_CATEGORIES[storeName] ?? FILE_CATEGORIES;
    // De-duplicate while preserving order.
    return Array.from(new Set(list));
  }, [storeName]);

  // When the user changes the area store, re-suggest category + location
  // (only if they haven't been manually edited relative to the previous
  // suggestion). Done in the change handler — no useEffect.
  function handleStoreChange(next: string) {
    setStoreName(next);
    const nextCats = AREA_STORE_CATEGORIES[next] ?? FILE_CATEGORIES;
    if (!nextCats.includes(category)) {
      setCategory(nextCats[0] ?? "General");
    }
    setLocation(`${next} Store`);
  }

  async function handleSubmit() {
    if (!storeName) {
      toast({ title: "Area store required", variant: "destructive" });
      return;
    }
    if (!itemName.trim()) {
      toast({ title: "Item name required", variant: "destructive" });
      return;
    }
    if (!qty.trim() || Number(qty) <= 0) {
      toast({
        title: "Quantity must be a positive number",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const body = {
      storeName,
      itemCode: itemCode.trim() || null,
      itemName: itemName.trim(),
      category: category || "General",
      unit: unit || "NOS",
      qty: Number(qty) || 0,
      unitCost: Number(unitCost) || 0,
      recordType: "Oncharge",
      navReference,
      qcInspectionId: inspection.id,
      fileNumber: fileNumber.trim() || null,
      location: location.trim() || null,
      date: date || todayISO(),
      remarks: remarks.trim() || null,
    };
    const res = await apiRequest("/api/area-stores", "POST", body);
    setSubmitting(false);
    if (!res.ok) {
      toast({
        title: "Failed to send to store",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    onSent(storeName);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-emerald-400" />
            Send to Area Store
          </DialogTitle>
          <DialogDescription>
            Transfer this passing QCI item into an area store as an{" "}
            <span className="text-foreground font-medium">Oncharge</span> record
            (NAV 255 — off-charge from shipping stores into the area store).
          </DialogDescription>
        </DialogHeader>

        {/* Inspection summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Item</p>
            <p className="text-foreground font-medium truncate">
              {inspection.itemName || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Qty</p>
            <p className="text-foreground font-medium">
              {formatNumber(inspection.qty)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">QC Level</p>
            <CustomBadge className={cn("border", qcLevelColor(inspection.qcLevel))}>
              {inspection.qcLevel}
            </CustomBadge>
          </div>
          <div>
            <p className="text-muted-foreground">QCI Officer</p>
            <p className="text-foreground font-medium truncate">
              {inspection.qcOfficer || "—"}
            </p>
          </div>
        </div>

        {/* Matched store item hint */}
        {matchedStoreItem ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <Store className="h-3.5 w-3.5 shrink-0" />
            <span>
              Matched existing store item —{" "}
              <span className="font-mono">
                {matchedStoreItem.itemCode || "no code"}
              </span>{" "}
              · category{" "}
              <span className="font-medium">{matchedStoreItem.category}</span> ·
              unit cost {formatCurrency(matchedStoreItem.unitCost)}
            </span>
          </div>
        ) : (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              No matching store item found — defaults applied. Verify the area
              store and unit cost before sending.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Area Store */}
          <div className="space-y-1.5">
            <Label>Area Store</Label>
            <Select value={storeName} onValueChange={handleStoreChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select area store" />
              </SelectTrigger>
              <SelectContent>
                {AREA_STORES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                    {s === suggestedStore ? " (suggested)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Code */}
          <div className="space-y-1.5">
            <Label>Item Code</Label>
            <Input
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="e.g. BMS-220"
              className="font-mono"
            />
          </div>

          {/* Item Name */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Item Name</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Item name"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["NOS", "KG", "LTR", "M", "MTR", "ROLL", "BOX", "SET", "PAIR", "BOTTLE", "GAL"].map(
                  (u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Qty */}
          <div className="space-y-1.5">
            <Label>Qty</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Unit Cost */}
          <div className="space-y-1.5">
            <Label>Unit Cost (Rs.)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* NAV Reference */}
          <div className="space-y-1.5">
            <Label>NAV Reference</Label>
            <Select value={navReference} onValueChange={setNavReference}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NAV_REFERENCES.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Number */}
          <div className="space-y-1.5">
            <Label>File Number</Label>
            <Input
              value={fileNumber}
              onChange={(e) => setFileNumber(e.target.value)}
              placeholder="QCI file number"
              className="font-mono"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. BMS Store"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Remarks for the area store record"
            />
          </div>
        </div>

        {/* Total + record type chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              Oncharge
            </CustomBadge>
            <CustomBadge
              className={cn("border", navRefColor(navReference))}
            >
              {navReference}
            </CustomBadge>
            {matchedStoreItem && (
              <CustomBadge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
                <Store className="h-3 w-3 mr-1" />
                {matchedStoreItem.category}
              </CustomBadge>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? "Sending..." : `Send to ${storeName} Store`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
