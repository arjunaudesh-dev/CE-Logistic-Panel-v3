"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { LoadingState, ErrorState, EmptyState } from "@/components/erp/states";
import { CustomBadge, PositionBadge } from "@/components/erp/badges";
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
  FILE_COLLECTION_STATUSES,
  fileCollectionStatusColor,
  QC_LEVELS,
  qcLevelColor,
  AREA_STORES,
  AREA_STORE_CATEGORIES,
  NAV_REFERENCES,
  navRefColor,
  DIMENSION_UNITS,
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
  FileText,
  ShoppingCart,
  Calculator,
  Ruler,
  Anchor,
  RefreshCw,
  ArrowRight,
  Workflow,
  Link2,
  SplitSquareHorizontal,
  History,
  Car,
  Copy,
  Hash,
  UserCheck,
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
  /**
   * Optional list of PO numbers linked to this part-supply order (split
   * orders). Encoded into the `supplier` field on the server because the
   * PartSupplyOrder model has no dedicated column — see
   * `formatSupplierWithPos` / `parseSupplierWithPos`.
   */
  linkedPoNumbers?: string[];
}

interface DailyCollection {
  id: string;
  date: string;
  itemName: string;
  qty: number;
  receivedFrom: string | null;
  recordedBy: string | null;
  recordedAt: string;
  // Vehicle & gate-pass info (SLN | Civil)
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  gatePassNumber?: string | null;
  driverName?: string | null;
  driverLicense?: string | null;
  driverPhone?: string | null;
  // Personnel involved
  provostCheckedBy?: string | null;
  ceSailorInvolved?: string | null;
  cslogSailorInvolved?: string | null;
  // QCI workflow
  sentToQCI?: boolean;
  sentToQCIAt?: string | null;
  isOld?: boolean;
}

// ─────────────────────────────────────────────────────────
// Split Order types — a single file split across multiple POs.
// Each entry represents a collection under a unique PO number.
// ─────────────────────────────────────────────────────────
interface SplitOrderEntry {
  id: string;
  splitOrderId: string;
  poNumber: string;
  qty: number;
  receivedQty: number;
  balance: number;
  status: string; // Pending | Collected | In QCI | QCI Passed | Transferred
  date: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  gatePassNumber?: string | null;
  driverName?: string | null;
  provostCheckedBy?: string | null;
  ceSailorInvolved?: string | null;
  cslogSailorInvolved?: string | null;
  sentToQCI?: boolean;
  sentToQCIAt?: string | null;
  createdAt: string;
}

interface SplitOrder {
  id: string;
  fileNumber: string;
  prNumber: string | null;
  itemName: string;
  totalQty: number;
  status: string; // Active | Completed
  supplier: string | null;
  linkedPOs: string | null; // comma-separated PO numbers
  createdAt: string;
  entries: SplitOrderEntry[];
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
  qciNumber: string | null;
  refType: string;
  refId: string;
  itemName: string;
  supplier: string | null;
  qty: number;
  qcLevel: string;
  qcOfficer: string | null;
  qcOfficerDetails: string | null;
  remarks: string | null;
  fileNumber: string | null;
  poNumber: string | null;
  inspectedAt: string;
}

interface ProcurementFile {
  id: string;
  projectId: string | null;
  projectName: string | null;
  voteNumber: string | null;
  prNumber: string;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  fileCost: number;
  supplier: string | null;
  presentPosition: string;
  fileCategory: string;
  createdBy: string | null;
  authorizedBy: string | null;
  createdAt: string;
  updatedAt: string;
  logs?: unknown[];
}

/**
 * A ProjectFile (row from the ProjectFile table) — includes the new
 * collection-workflow fields: `purchaseOrderNumber`, `collectionStatus`,
 * `collectionSyncedAt`. Returned by GET /api/projects/[id]/files.
 */
interface ProjectFile {
  id: string;
  projectId: string;
  prNumber: string;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  fileCost: number;
  supplier: string | null;
  presentPosition: string;
  fileCategory: string;
  fileNumber: string | null;
  fileGroupKey: string | null;
  fileGroupSeq: number;
  purchaseOrderNumber: string | null;
  collectionStatus: string;
  collectionSyncedAt: string | null;
  createdBy: string | null;
  authorizedBy: string | null;
  responsiblePerson: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  logs?: unknown[];
  approvals?: unknown[];
}

interface Stakeholder {
  id: string;
  name: string;
  rankOrRate: string | null;
  svcNumber: string | null;
  appointment: string | null;
  department: string;
  category: string;
  seniority: number | null;
  areaStoreLocation: string | null;
  subjectClerk: string | null;
  ilmsCced: string | null;
  officeNumber: string | null;
  telephone: string | null;
  whatsapp: string | null;
  email: string | null;
  availability: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  collection: {
    partSupplyActive: number;
    dailyToday: number;
    dailyTotal: number;
  };
}

// Procurement present-positions where a PO is processed and items are on
// their way for collection. Files at these stages show up in the
// "Files to be Collected" dashboard card and the PO-item dropdowns.
const PO_PROCESSED_POSITIONS = [
  "PO Placed",
  "Order Placed",
  "Items Dispatched",
  "In Transit",
] as const;

function isPoProcessed(position: string): boolean {
  return (PO_PROCESSED_POSITIONS as readonly string[]).includes(position);
}

/** Format a stakeholder's name + rank for display in dropdowns. */
function formatStakeholder(s: Stakeholder): string {
  const rank = (s.rankOrRate || "").trim();
  const appt = (s.appointment || "").trim();
  const parts = [s.name];
  if (rank) parts.push(`(${rank})`);
  if (appt) parts.push(`· ${appt}`);
  return parts.join(" ");
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

// Reference Type options for QC Inspection dialog. These are the
// user-facing labels shown in the dropdown. The actual stored value
// (sent to /api/qc as `refType`) is the canonical lowercase token
// returned by `qcRefTypeStoredValue(label)` below — see the schema
// comment on QCInspection.refType (daily | partsupply | splitorder | collection).
const QC_REF_TYPES = [
  "Daily Collection",
  "Part Supply Entry",
  "Split Order Entry",
  "Collection Item",
] as const;
type QCRefType = (typeof QC_REF_TYPES)[number];

// Canonical stored refType tokens (one per QC_REF_TYPES label, in order).
const QC_REF_TYPE_TOKENS = {
  "Daily Collection": "daily",
  "Part Supply Entry": "partsupply",
  "Split Order Entry": "splitorder",
  "Collection Item": "collection",
} as const;

/** Map a UI label → canonical stored token. Falls back to the input. */
function qcRefTypeStoredValue(label: string): string {
  return (
    (QC_REF_TYPE_TOKENS as Record<string, string>)[label] ?? label
  );
}

/** True if the stored refType token (or legacy label) refers to Part Supply. */
function isPartSupplyRefType(t: string): boolean {
  return t === "partsupply" || t === "Part Supply Entry";
}
/** True if the stored refType token (or legacy label) refers to a Split Order. */
function isSplitOrderRefType(t: string): boolean {
  return t === "splitorder" || t === "Split Order Entry";
}
/** True if the stored refType token (or legacy label) refers to Daily Collection. */
function isDailyRefType(t: string): boolean {
  return t === "daily" || t === "Daily Collection";
}

/** Display label (short form, used in badges) for any stored refType value. */
function refTypeLabel(t: string): string {
  if (isPartSupplyRefType(t)) return "Part Supply";
  if (isSplitOrderRefType(t)) return "Split Order";
  if (isDailyRefType(t)) return "Daily Collection";
  if (t === "collection" || t === "Collection Item") return "Collection Item";
  return t;
}

/** Tailwind classes for the refType badge in the QCI table. */
function refTypeBadgeClass(t: string): string {
  if (isPartSupplyRefType(t))
    return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";
  if (isSplitOrderRefType(t))
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
  if (isDailyRefType(t))
    return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
  if (t === "collection" || t === "Collection Item")
    return "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30";
  return "bg-secondary text-muted-foreground border-border";
}

/**
 * Fetch the list of CCED Officer stakeholders (for the QCI Officer dropdown).
 * Only fetches when `enabled` is true (i.e. when the consuming dialog is open)
 * to avoid unnecessary requests. Returns the raw stakeholder rows filtered by
 * category = "CCED Officer".
 */
function useCcedOfficers(enabled: boolean): {
  data: Stakeholder[];
  loading: boolean;
} {
  const { data, loading } = useFetch<Stakeholder[]>(
    enabled ? "/api/stakeholders?category=CCED%20Officer" : null
  );
  return { data: data ?? [], loading };
}

/**
 * Format a CCED Officer stakeholder for display in the QCI Officer dropdown:
 * "Name (Appointment)" — e.g. "Capt. T. Jayasuriya (CCED(E))".
 * Appointment falls back to category when not set.
 */
function formatOfficerOption(s: Stakeholder): string {
  const appt = (s.appointment || "").trim();
  const rank = (s.rankOrRate || "").trim();
  const name = rank ? `${rank} ${s.name}` : s.name;
  return appt ? `${name} (${appt})` : name;
}

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
// Split-Order helpers — encode / decode Linked PO numbers in the
// PartSupplyOrder.supplier field (since the model has no dedicated column).
// Format: `<supplier> [PO: PO-001, PO-002]`
// ─────────────────────────────────────────────────────────
const SPLIT_PO_PREFIX = " [PO: ";
const SPLIT_PO_SUFFIX = "]";

function formatSupplierWithPos(supplier: string, pos: string[]): string {
  const trimmedSupplier = supplier.trim();
  const cleanPos = pos.map((p) => p.trim()).filter(Boolean);
  if (cleanPos.length === 0) return trimmedSupplier;
  return `${trimmedSupplier}${SPLIT_PO_PREFIX}${cleanPos.join(", ")}${SPLIT_PO_SUFFIX}`;
}

function parseSupplierWithPos(
  raw: string | null | undefined
): { supplier: string; pos: string[] } {
  if (!raw) return { supplier: "", pos: [] };
  const text = raw;
  const startIdx = text.lastIndexOf(SPLIT_PO_PREFIX);
  if (startIdx === -1 || !text.endsWith(SPLIT_PO_SUFFIX)) {
    return { supplier: text, pos: [] };
  }
  const endIdx = text.length - SPLIT_PO_SUFFIX.length;
  const poStr = text.slice(startIdx + SPLIT_PO_PREFIX.length, endIdx);
  const pos = poStr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const supplier = text.slice(0, startIdx).trim();
  return { supplier, pos };
}

// ─────────────────────────────────────────────────────────
// useAllProjectFiles — fetch all project files across every project.
// Used by the Collection Pipeline (Dashboard), the QCI tab (to find the
// matching file when a QCI is recorded) and the Send-to-Area-Store dialog
// (to update the file's collectionStatus).
// ─────────────────────────────────────────────────────────
function useAllProjectFiles(enabled: boolean = true): {
  data: ProjectFile[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { data: projects, loading: pLoading, error: pError } =
    useFetch<Project[]>(enabled ? "/api/projects" : null);
  const projectIds = useMemo(
    () => (projects ?? []).map((p) => p.id),
    [projects]
  );
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [fetching, setFetching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    if (pLoading || pError) return;
    if (projectIds.length === 0) return;
    let cancelled = false;
    (async () => {
      // Defer the loading-state setter so it isn't a synchronous setState
      // in the effect body (mirrors the `useFetch` pattern).
      await Promise.resolve();
      if (cancelled) return;
      setFetching(true);
      setFetchError(null);
      try {
        const results = await Promise.all(
          projectIds.map(async (pid) => {
            try {
              const res = await fetch(
                `/api/projects/${pid}/files?includeArchived=false`
              );
              if (!res.ok) return [] as ProjectFile[];
              const json = (await res.json()) as ProjectFile[];
              return Array.isArray(json) ? json : [];
            } catch {
              return [] as ProjectFile[];
            }
          })
        );
        if (cancelled) return;
        setFiles(results.flat());
        setFetching(false);
      } catch (e) {
        if (cancelled) return;
        setFetchError((e as Error).message || "Failed to load files");
        setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectIds, pLoading, pError, nonce, enabled]);

  // Derive the final hook state without synchronous setState in the effect.
  if (!enabled) return { data: [], loading: false, error: null, refresh };
  if (pError) return { data: [], loading: false, error: pError, refresh };
  if (pLoading) return { data: [], loading: true, error: null, refresh };
  if (projectIds.length === 0)
    return { data: [], loading: false, error: null, refresh };
  return { data: files, loading: fetching, error: fetchError, refresh };
}

/** Update a project file's collection status via the workflow PUT endpoint. */
async function updateFileCollectionStatus(
  file: { id: string; projectId: string },
  collectionStatus: string,
  extras?: {
    areaStoreName?: string;
    navReference?: string;
    navNumber?: string;
    changedBy?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const res = await apiRequest(
    `/api/projects/${file.projectId}/files/${file.id}/collection-status`,
    "PUT",
    {
      collectionStatus,
      ...extras,
    }
  );
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
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
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 max-w-3xl">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="part-supply" className="gap-1.5">
            <Layers className="h-4 w-4" /> Part Supply
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Daily Collection
          </TabsTrigger>
          <TabsTrigger value="split" className="gap-1.5">
            <SplitSquareHorizontal className="h-4 w-4" /> Split Orders
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
        <TabsContent value="split">
          <SplitOrdersTab />
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
  const { data: procurementFiles } =
    useFetch<ProcurementFile[]>("/api/procurement");

  // All project files (used by the Collection Pipeline). Refreshed on demand
  // (Sync button, Transfer-to-Zone action, etc.).
  const allFiles = useAllProjectFiles();
  const { toast } = useToast();

  // Pipeline filter — which collection-status stage is selected. "all" shows
  // every file (default). Clicking a stage card sets this and scrolls the
  // file list into view.
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);
  const [zoneTransferId, setZoneTransferId] = useState<string | null>(null);

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

  // Files with a processed PO — these items are on the way and ready to
  // be collected (PO Placed / Order Placed / Items Dispatched / In Transit).
  const poProcessedFiles = useMemo(() => {
    return (procurementFiles ?? []).filter((f) =>
      isPoProcessed(f.presentPosition)
    );
  }, [procurementFiles]);

  const poProcessedQty = poProcessedFiles.reduce((s, f) => s + (f.qty || 0), 0);
  const poProcessedValue = poProcessedFiles.reduce(
    (s, f) => s + (f.fileCost || 0),
    0
  );

  // ── Collection Pipeline counts ──────────────────────────────
  // Each stage = number of project files whose collectionStatus matches that
  // stage. Files with collectionStatus "Pending" are surfaced separately (they
  // are eligible for the PO → Collection sync).
  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FILE_COLLECTION_STATUSES.forEach((s) => (counts[s] = 0));
    (allFiles.data ?? []).forEach((f) => {
      const key = f.collectionStatus || "Pending";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [allFiles.data]);

  // Files matching the currently-selected pipeline stage. When `pipelineFilter`
  // is "all", shows every file with a collectionStatus other than "Pending".
  const pipelineFiles = useMemo(() => {
    const list = (allFiles.data ?? []).filter((f) => {
      if (pipelineFilter === "all") {
        return f.collectionStatus && f.collectionStatus !== "Pending";
      }
      return f.collectionStatus === pipelineFilter;
    });
    return list.sort((a, b) =>
      (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)
    );
  }, [allFiles.data, pipelineFilter]);

  async function handleSyncPoToCollection() {
    setSyncing(true);
    const res = await apiRequest("/api/sync/po-to-collection", "POST");
    setSyncing(false);
    if (!res.ok) {
      toast({
        title: "Sync failed",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    const data = res.data as { syncedCount?: number };
    const count = data?.syncedCount ?? 0;
    toast({
      title: count > 0 ? `Synced ${count} file(s)` : "Nothing to sync",
      description:
        count > 0
          ? `${count} PO Placed file(s) moved to "In Collection".`
          : "No PO Placed files pending sync.",
    });
    allFiles.refresh();
  }

  async function handleTransferToZone(file: ProjectFile) {
    setZoneTransferId(file.id);
    const res = await updateFileCollectionStatus(file, "Transferred to Zone", {
      changedBy: "Collection Officer",
    });
    setZoneTransferId(null);
    if (!res.ok) {
      toast({
        title: "Transfer to Zone failed",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Transferred to Zone",
      description: `${file.itemName} moved to Zone store. Stock updated.`,
    });
    allFiles.refresh();
  }

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

      {/* Collection Pipeline — workflow stages with counts + Sync button */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Workflow className="h-4 w-4" /> Collection Pipeline
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CustomBadge className="bg-secondary border-border text-muted-foreground">
              {pipelineCounts["Pending"]} pending sync
            </CustomBadge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncPoToCollection}
              disabled={syncing}
              className="gap-1.5 h-8"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync PO → Collection
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Files appear here automatically after a Purchasing Order (PO) is
          published. Click a stage to filter the file list below.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2">
          {FILE_COLLECTION_STATUSES.map((stage) => {
            const count = pipelineCounts[stage] || 0;
            const active = pipelineFilter === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() =>
                  setPipelineFilter((cur) => (cur === stage ? "all" : stage))
                }
                className={cn(
                  "text-left rounded-lg border p-2.5 transition-all hover:border-primary/60 hover:shadow-sm",
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-border bg-secondary/20"
                )}
                aria-pressed={active}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                      fileCollectionStatusColor(stage)
                    )}
                  >
                    {stage}
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-foreground leading-tight">
                  {count}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  file{count !== 1 ? "s" : ""}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pipeline-filtered file list */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="h-4 w-4" />
            Files in Pipeline
            <CustomBadge className="bg-secondary border-border text-muted-foreground ml-1">
              {pipelineFilter === "all"
                ? "All active"
                : pipelineFilter}
              {" · "}
              {pipelineFiles.length}
            </CustomBadge>
          </div>
          {pipelineFilter !== "all" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5"
              onClick={() => setPipelineFilter("all")}
            >
              <X className="h-3.5 w-3.5" /> Clear stage filter
            </Button>
          )}
        </div>
        {allFiles.loading ? (
          <LoadingState label="Loading project files..." />
        ) : pipelineFiles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No files at this stage"
            description={
              pipelineFilter === "all"
                ? "Files will appear here once a PO is placed and synced to collection."
                : `No files currently in "${pipelineFilter}" status.`
            }
          />
        ) : (
          <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            <ul className="divide-y divide-border">
              {pipelineFiles.map((f) => {
                const project = projectById.get(f.projectId);
                const isAtAreaStore =
                  f.collectionStatus === "Transferred to Area Store";
                const isTransferring = zoneTransferId === f.id;
                return (
                  <li
                    key={f.id}
                    className="px-2 py-3 flex items-start gap-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        fileCollectionStatusColor(f.collectionStatus)
                      )}
                    >
                      <PackageCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {f.itemName}
                        </p>
                        <CustomBadge className="bg-secondary text-muted-foreground border-border font-mono">
                          {f.prNumber}
                        </CustomBadge>
                        {f.purchaseOrderNumber && (
                          <CustomBadge className="bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 font-mono">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            {f.purchaseOrderNumber}
                          </CustomBadge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {project?.name || "—"} ·{" "}
                        {formatNumber(f.qty)} {f.unit} ·{" "}
                        {f.supplier || "—"} · {f.presentPosition}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <CustomBadge
                          className={cn(
                            "border",
                            fileCollectionStatusColor(f.collectionStatus)
                          )}
                        >
                          {f.collectionStatus}
                        </CustomBadge>
                        {f.collectionSyncedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            Synced {formatDateTime(f.collectionSyncedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAtAreaStore && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        onClick={() => handleTransferToZone(f)}
                        disabled={isTransferring}
                      >
                        {isTransferring ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5" />
                        )}
                        Transfer to Zone
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
  // Fetch QC inspections so we can show "Sent" / disable the Send-to-QCI
  // button for entries that already have a QC inspection record.
  const { data: qciList, refresh: refreshQci } =
    useFetch<QCInspection[]>("/api/qc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [entryDialogOrder, setEntryDialogOrder] =
    useState<PartSupplyOrder | null>(null);
  const [printOrder, setPrintOrder] = useState<PartSupplyOrder | null>(null);
  const [sendQciTarget, setSendQciTarget] = useState<
    { order: PartSupplyOrder; entry: PartSupplyEntry } | null
  >(null);
  const { toast } = useToast();

  // Set of Part Supply Entry IDs that already have a QC inspection record.
  // Matches both the legacy "Part Supply Entry" refType and the canonical
  // "partsupply" token (see qcRefTypeStoredValue).
  const entryQciSet = useMemo(() => {
    const s = new Set<string>();
    (qciList ?? []).forEach((q) => {
      if (isPartSupplyRefType(q.refType) && q.refId) s.add(q.refId);
    });
    return s;
  }, [qciList]);

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
                            {parseSupplierWithPos(order.supplier).supplier || "—"} · Started{" "}
                            {formatFullDate(order.startDate)}
                          </p>
                          {parseSupplierWithPos(order.supplier).pos.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {parseSupplierWithPos(order.supplier).pos.map((po) => (
                                <CustomBadge
                                  key={po}
                                  className="bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 font-mono"
                                >
                                  <Link2 className="h-3 w-3 mr-1" />
                                  {po}
                                </CustomBadge>
                              ))}
                            </div>
                          )}
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
                                <TableHead className="text-muted-foreground">
                                  Provost Sailor
                                </TableHead>
                                <TableHead className="text-muted-foreground text-right">
                                  Cum. Bal.
                                </TableHead>
                                <TableHead className="text-muted-foreground text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.entries.map((e) => {
                                const sentToQci = entryQciSet.has(e.id);
                                return (
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
                                    <TableCell className="text-foreground">
                                      {e.driverName || "—"}
                                    </TableCell>
                                    <TableCell className="text-foreground text-right font-medium whitespace-nowrap">
                                      {formatNumber(e.cumulativeBalance)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {sentToQci ? (
                                        <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30">
                                          <ShieldCheck className="h-3 w-3 mr-1" />
                                          In QCI
                                        </CustomBadge>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1.5 h-7 text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20"
                                          onClick={() =>
                                            setSendQciTarget({
                                              order,
                                              entry: e,
                                            })
                                          }
                                        >
                                          <Send className="h-3.5 w-3.5" />
                                          Send to QCI
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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

      {/* Send Part-Supply Entry to QCI Dialog */}
      {sendQciTarget && (
        <SendPartSupplyEntryToQCIDialog
          open={!!sendQciTarget}
          order={sendQciTarget.order}
          entry={sendQciTarget.entry}
          onOpenChange={(o) => !o && setSendQciTarget(null)}
          onSent={() => {
            setSendQciTarget(null);
            toast({ title: "Entry sent to QCI" });
            refreshQci();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Send Part Supply Entry to QCI Dialog — creates a QC
// inspection record for the entry (advances it to QCI).
// ─────────────────────────────────────────────────────────
interface SendPartSupplyEntryToQCIDialogProps {
  open: boolean;
  order: PartSupplyOrder;
  entry: PartSupplyEntry;
  onOpenChange: (o: boolean) => void;
  onSent: () => void;
}

function SendPartSupplyEntryToQCIDialog({
  open,
  order,
  entry,
  onOpenChange,
  onSent,
}: SendPartSupplyEntryToQCIDialogProps) {
  const [qcLevel, setQcLevel] = useState<string>("Satisfactory");
  const [qcOfficer, setQcOfficer] = useState<string>("");
  const [qcOfficerDetails, setQcOfficerDetails] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { data: officers, loading: officersLoading } = useCcedOfficers(open);

  const parsedSupplier = parseSupplierWithPos(order.supplier);
  const cleanSupplier = parsedSupplier.supplier;
  const linkedPos = parsedSupplier.pos;
  const isFail = qcLevel === "Fail";

  async function submit() {
    if (!qcOfficer) {
      toast({
        title: "QCI Officer required",
        description: "Select a CCED Officer from the dropdown.",
        variant: "destructive",
      });
      return;
    }
    if (isFail && !remarks.trim()) {
      toast({
        title: "Remarks required when QC Level is Fail",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const res = await apiRequest("/api/qc", "POST", {
      refType: "partsupply",
      refId: entry.id,
      itemName: order.itemName,
      supplier: cleanSupplier || undefined,
      qty: entry.qty,
      qcLevel,
      qcOfficer,
      qcOfficerDetails: qcOfficerDetails.trim() || undefined,
      remarks: remarks.trim() || undefined,
      // Part Supply orders don't have a dedicated file number column —
      // the linked PO numbers encoded in the supplier field are used as
      // the file/PO reference on the QCI record.
      fileNumber: linkedPos.length > 0 ? linkedPos.join(", ") : undefined,
      poNumber: linkedPos.length === 1 ? linkedPos[0] : undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }
    setQcLevel("Satisfactory");
    setQcOfficer("");
    setQcOfficerDetails("");
    setRemarks("");
    onSent();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-violet-400" />
            Send to QCI
          </DialogTitle>
          <DialogDescription>
            Create a QC inspection record for this delivery entry. The entry
            will appear in the QCI tab.
          </DialogDescription>
        </DialogHeader>
        {/* Entry summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Item</p>
            <p className="text-foreground font-medium truncate">
              {order.itemName}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Entry</p>
            <p className="text-foreground font-medium">
              #{entry.srNo} · {formatFullDate(entry.date)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Qty</p>
            <p className="text-foreground font-medium">
              {formatNumber(entry.qty)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Supplier</p>
            <p className="text-foreground font-medium truncate">
              {cleanSupplier || "—"}
            </p>
          </div>
          {linkedPos.length > 0 && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Linked PO(s)</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {linkedPos.map((po) => (
                  <CustomBadge
                    key={po}
                    className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono"
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    {po}
                  </CustomBadge>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3 py-1">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                QCI Officer <span className="text-red-400">*</span>
              </Label>
              <Select value={qcOfficer} onValueChange={setQcOfficer}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      officersLoading
                        ? "Loading officers..."
                        : officers.length === 0
                        ? "No CCED officers found"
                        : "Select CCED officer"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {officers.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No CCED officers — add one in Stakeholders
                    </SelectItem>
                  ) : (
                    officers.map((o) => (
                      <SelectItem key={o.id} value={formatOfficerOption(o)}>
                        {formatOfficerOption(o)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Sourced from the Stakeholders directory (CCED Officer category).
              </p>
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
              rows={2}
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
          <Button
            onClick={submit}
            disabled={submitting}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Sending..." : "Send to QCI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  // Primary PO (drives auto-fill) — kept as a single-select for backwards
  // UX. The split-order multi-select lives in `linkedPoIds`.
  const [selectedPoId, setSelectedPoId] = useState<string>("");
  // Linked PO IDs for split orders — multiple POs that this single part-supply
  // order will fulfil. Stored as a Set for O(1) toggle.
  const [linkedPoIds, setLinkedPoIds] = useState<Set<string>>(new Set());
  // Optional manual PO numbers — when the user wants to link a PO that isn't
  // in the procurement list yet, they can type the number(s) here.
  const [manualPoNumbers, setManualPoNumbers] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch PO-processed procurement files (only when the dialog is open) so
  // the user can pick an item and auto-fill its details.
  const { data: procurementFiles, loading: poLoading } =
    useFetch<ProcurementFile[]>(open ? "/api/procurement" : null);

  const poOptions = useMemo(() => {
    return (procurementFiles ?? []).filter((f) =>
      isPoProcessed(f.presentPosition)
    );
  }, [procurementFiles]);

  function handlePoSelect(id: string) {
    setSelectedPoId(id);
    const f = poOptions.find((p) => p.id === id);
    if (!f) return;
    setItemName(f.itemName);
    setOrderedQty(String(f.qty || ""));
    setSupplier(f.supplier || "");
    // Auto-link the primary PO if it isn't linked yet.
    setLinkedPoIds((cur) => {
      const next = new Set(cur);
      next.add(id);
      return next;
    });
  }

  function toggleLinkedPo(id: string) {
    setLinkedPoIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // All linked PO numbers (from selected procurement files + manual entries).
  const linkedPoNumbers = useMemo(() => {
    const fromProc = poOptions
      .filter((p) => linkedPoIds.has(p.id))
      .map((p) => p.prNumber);
    const fromManual = manualPoNumbers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // De-dup, preserving order.
    return Array.from(new Set([...fromProc, ...fromManual]));
  }, [poOptions, linkedPoIds, manualPoNumbers]);

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
    // Encode linked PO numbers into the supplier field — see
    // `formatSupplierWithPos` / `parseSupplierWithPos`. This keeps the
    // split-order info persisted without a schema change.
    const encodedSupplier = formatSupplierWithPos(supplier, linkedPoNumbers);
    const res = await apiRequest("/api/collection/part-supply", "POST", {
      itemName: itemName.trim(),
      orderedQty: Number(orderedQty),
      startDate: startDate || undefined,
      expectedEndDate: expectedEndDate || undefined,
      supplier: encodedSupplier || undefined,
      // Sent for API forward-compat (server currently ignores unknown fields).
      linkedPoNumbers: linkedPoNumbers.length > 0 ? linkedPoNumbers : undefined,
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
    setSelectedPoId("");
    setLinkedPoIds(new Set());
    setManualPoNumbers("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Part Supply Order</DialogTitle>
          <DialogDescription>
            Create a new multi-day delivery order to track partial receipts.
            For split orders, link multiple PO numbers below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Select PO Item — auto-fills item name, qty & supplier */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5 text-amber-400" />
              Select PO Item
            </Label>
            <Select value={selectedPoId} onValueChange={handlePoSelect}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    poLoading
                      ? "Loading PO files..."
                      : "Pick a PO-processed item to auto-fill"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {poOptions.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No PO-processed files
                  </SelectItem>
                ) : (
                  poOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.prNumber} · {p.itemName} ({formatNumber(p.qty)}{" "}
                      {p.unit})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Pick a procurement file with PO Placed/Dispatched/In Transit
              status — its item, qty &amp; supplier will be auto-filled below.
            </p>
          </div>

          {/* Linked POs (split orders) — multi-select */}
          <div className="space-y-1.5 rounded-lg border border-border bg-secondary/20 p-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                Linked POs
                {linkedPoNumbers.length > 0 && (
                  <CustomBadge className="bg-primary/10 text-primary border-primary/30">
                    {linkedPoNumbers.length} linked
                  </CustomBadge>
                )}
              </Label>
              {linkedPoIds.size > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs gap-1"
                  onClick={() => {
                    setLinkedPoIds(new Set());
                    setSelectedPoId("");
                  }}
                >
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              For split orders, tick every PO this single part-supply order
              fulfils. The same file can be processed against two or more POs.
            </p>
            {poLoading ? (
              <p className="text-xs text-muted-foreground py-2">
                Loading PO files...
              </p>
            ) : poOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No PO-processed files available. Use the manual field below to
                enter PO numbers.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-card [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
                <ul className="divide-y divide-border">
                  {poOptions.map((p) => {
                    const checked = linkedPoIds.has(p.id);
                    return (
                      <li key={p.id}>
                        <label className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer hover:bg-secondary/30 transition-colors">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleLinkedPo(p.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">
                              <span className="font-mono">{p.prNumber}</span>
                              {" · "}
                              {p.itemName}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {formatNumber(p.qty)} {p.unit} · {p.supplier || "—"}
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {/* Manual PO numbers (for POs not yet in the procurement list) */}
            <div className="pt-1">
              <Label className="text-[11px] text-muted-foreground">
                Or type additional PO numbers (comma-separated)
              </Label>
              <Input
                value={manualPoNumbers}
                onChange={(e) => setManualPoNumbers(e.target.value)}
                placeholder="e.g. PO-2025-014, PO-2025-021"
                className="h-8 mt-1 font-mono text-xs"
              />
            </div>
            {/* Linked POs summary chips */}
            {linkedPoNumbers.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {linkedPoNumbers.map((po) => (
                  <CustomBadge
                    key={po}
                    className="bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 font-mono"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {po}
                  </CustomBadge>
                ))}
              </div>
            )}
          </div>

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
  // driverName repurposed to hold the "Provost Sailor Checked" name (saved
  // into the PartSupplyEntry.driverName column on the server).
  const [driverName, setDriverName] = useState("");
  const [qcCheckedBy, setQcCheckedBy] = useState("");
  // Dimension inputs — quantity is auto-calculated from H × W × D.
  const [dimH, setDimH] = useState("");
  const [dimW, setDimW] = useState("");
  const [dimD, setDimD] = useState("");
  const [dimUnit, setDimUnit] = useState<string>(DIMENSION_UNITS[0]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch stakeholders (only when dialog open) for the Provost Sailor and
  // QC Checked-By dropdowns.
  const { data: stakeholders } = useFetch<Stakeholder[]>(
    open ? "/api/stakeholders" : null
  );

  // Fetch all project files (only when dialog open) — used after saving the
  // entry to advance the matching file(s) from "In Collection" to "Collected".
  // Matching is by PR number (linked POs stored in the order's supplier field)
  // or by item name as a fallback.
  const allFiles = useAllProjectFiles(open);

  // Provost Sailors — category contains "Sailor" OR department contains
  // "Provost" (covers "CSLOG Sailor" and any future "Provost" dept).
  const provostSailors = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      const cat = (s.category || "").toLowerCase();
      const dept = (s.department || "").toLowerCase();
      return cat.includes("sailor") || dept.includes("provost");
    });
  }, [stakeholders]);

  // CCED Sailors for QC — category === "CCED Sailor" (preferred) but fall
  // back to anyone with category/appointment containing "CCED" so the
  // dropdown isn't empty when the category hasn't been seeded yet.
  const ccedSailors = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      const cat = (s.category || "").toLowerCase();
      const appt = (s.appointment || "").toLowerCase();
      return (
        cat === "cced sailor" ||
        cat.includes("cced") ||
        appt.includes("cced")
      );
    });
  }, [stakeholders]);

  // Auto-calculate Quantity from dimensions: H × W × D in the selected
  // unit (cubic meters or cubic inches).
  const computedQty = useMemo(() => {
    const h = Number(dimH);
    const w = Number(dimW);
    const d = Number(dimD);
    if (!isFinite(h) || !isFinite(w) || !isFinite(d)) return null;
    if (h <= 0 || w <= 0 || d <= 0) return null;
    const product = h * w * d;
    // Round to 4 decimal places to keep storage clean.
    return Math.round(product * 10000) / 10000;
  }, [dimH, dimW, dimD]);

  // Sync the computed quantity into the qty state whenever it changes.
  // Using a useEffect here would be flagged by react-hooks rules; instead
  // we derive the displayed qty directly from computedQty when dimensions
  // are present, and fall back to the manual `qty` string otherwise.
  const effectiveQty = computedQty != null ? String(computedQty) : qty;

  async function submit() {
    const q = Number(effectiveQty);
    if (!q || q <= 0) {
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
        qty: q,
        // CCED Sailor name → stored in the dedicated qcCheckedBy column.
        qcCheckedBy: qcCheckedBy.trim() || undefined,
        // sailorCount field removed from the UI; preserve server contract
        // by sending 0 (model default).
        sailorCount: 0,
        // Provost Sailor name → stored in driverName column (repurposed).
        driverName: driverName.trim() || undefined,
        // driverLicense / driverPhone no longer captured in the UI.
        driverLicense: undefined,
        driverPhone: undefined,
      }
    );
    if (!res.ok) {
      setSubmitting(false);
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }

    // Advance the matching project file(s) to "Collected". Linked POs are
    // encoded in the part-supply order's supplier field; if we can match them
    // by PR number to a ProjectFile, update each. Otherwise fall back to a
    // case-insensitive item-name match.
    const { pos } = parseSupplierWithPos(order.supplier);
    const files = allFiles.data ?? [];
    const collectableStatuses = ["In Collection", "Pending"];
    let matched: ProjectFile[] = [];
    if (pos.length > 0) {
      matched = files.filter(
        (f) =>
          pos.includes(f.prNumber) &&
          collectableStatuses.includes(f.collectionStatus)
      );
    }
    if (matched.length === 0) {
      const target = (order.itemName || "").toLowerCase().trim();
      matched = files.filter(
        (f) =>
          target &&
          (f.itemName || "").toLowerCase().trim() === target &&
          collectableStatuses.includes(f.collectionStatus)
      );
    }
    if (matched.length > 0) {
      // Update each matched file in parallel. Non-fatal — entry already saved.
      const results = await Promise.all(
        matched.map((f) =>
          updateFileCollectionStatus(f, "Collected", {
            changedBy: driverName.trim() || "Collection Officer",
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        toast({
          title:
            "Entry saved — but file status not updated for some matches",
          description: failed[0]?.error,
          variant: "destructive",
        });
      }
    }
    setSubmitting(false);
    setVehicleNumber("");
    setQty("");
    setQcCheckedBy("");
    setDriverName("");
    setDimH("");
    setDimW("");
    setDimD("");
    setDimUnit(DIMENSION_UNITS[0]);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin">
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

          {/* Dimension fields — auto-fill Quantity */}
          <div className="col-span-2 rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-foreground">
                <Ruler className="h-3.5 w-3.5 text-primary" />
                Dimensions
              </Label>
              <CustomBadge className="bg-primary/10 text-primary border-primary/30">
                <Calculator className="h-3 w-3 mr-1" />
                Qty = H × W × D
              </CustomBadge>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Height
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={dimH}
                  onChange={(e) => setDimH(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Width
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={dimW}
                  onChange={(e) => setDimW(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Depth
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={dimD}
                  onChange={(e) => setDimD(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Unit
                </Label>
                <Select value={dimUnit} onValueChange={setDimUnit}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Quantity is auto-calculated as Height × Width × Depth in{" "}
              {dimUnit === "meter" ? "cubic meters (m³)" : "cubic inches (in³)"}.
              Leave dimensions blank to type the quantity manually.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              Quantity
              {computedQty != null && (
                <CustomBadge className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30">
                  auto
                </CustomBadge>
              )}
            </Label>
            <Input
              type="number"
              value={effectiveQty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              readOnly={computedQty != null}
              className={cn(
                computedQty != null &&
                  "bg-muted/50 text-muted-foreground cursor-not-allowed"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Anchor className="h-3.5 w-3.5 text-blue-400" />
              Provost Sailor Checked
            </Label>
            <Select value={driverName} onValueChange={setDriverName}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provost sailor" />
              </SelectTrigger>
              <SelectContent>
                {provostSailors.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No sailors in directory
                  </SelectItem>
                ) : (
                  provostSailors.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {formatStakeholder(s)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              QC Checked By
            </Label>
            <Select value={qcCheckedBy} onValueChange={setQcCheckedBy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select CCED sailor" />
              </SelectTrigger>
              <SelectContent>
                {ccedSailors.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No CCED sailors in directory
                  </SelectItem>
                ) : (
                  ccedSailors.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {formatStakeholder(s)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
                {parseSupplierWithPos(order.supplier).supplier || "—"}
              </p>
              {parseSupplierWithPos(order.supplier).pos.length > 0 && (
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  Linked POs: {parseSupplierWithPos(order.supplier).pos.join(", ")}
                </p>
              )}
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
                  <TableHead className="text-muted-foreground">
                    Provost Sailor
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
                      colSpan={7}
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
                      <TableCell>{e.driverName || "—"}</TableCell>
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
  const [showOld, setShowOld] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [recordOpen, setRecordOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { toast } = useToast();

  const dailyUrl = useMemo(() => {
    const base = "/api/collection/daily";
    const sep = (u: string) => (u.includes("?") ? "&" : "?");
    let url = base;
    if (filterMode === "today") url = `${base}?date=${today}`;
    else if (filterMode === "yesterday") url = `${base}?date=${yesterday}`;
    else if (filterMode === "custom" && customDate)
      url = `${base}?date=${customDate}`;
    else if (filterMode === "range" && fromDate && toDate)
      url = `${base}?from=${fromDate}&to=${toDate}`;
    if (showOld) url = `${url}${sep(url)}old=true`;
    return url;
  }, [filterMode, customDate, fromDate, toDate, today, yesterday, showOld]);

  const { data: daily, loading, error, refresh } =
    useFetch<DailyCollection[]>(dailyUrl);

  const grouped = useMemo(() => {
    const rows = daily ?? [];
    if (viewMode === "date") return groupByDate(rows);
    if (viewMode === "period") return groupByPeriod(rows);
    return groupBySupplier(rows);
  }, [daily, viewMode]);

  async function handleSendToQCI(rec: DailyCollection) {
    if (rec.sentToQCI) return;
    setSendingId(rec.id);
    const res = await apiRequest(
      `/api/daily-collection/${rec.id}/send-to-qci`,
      "POST"
    );
    setSendingId(null);
    if (!res.ok) {
      toast({
        title: "Failed to send to QCI",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Sent to QCI",
      description: `${rec.itemName} is now in the QCI queue.`,
    });
    refresh();
  }

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
      "Vehicle Type",
      "Vehicle Number",
      "Gate Pass",
      "Driver Name",
      "Provost Checked By",
      "CE Sailor",
      "CSLOG Sailor",
      "Sent to QCI",
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
          `"${(r.vehicleType || "").replace(/"/g, '""')}"`,
          `"${(r.vehicleNumber || "").replace(/"/g, '""')}"`,
          `"${(r.gatePassNumber || "").replace(/"/g, '""')}"`,
          `"${(r.driverName || "").replace(/"/g, '""')}"`,
          `"${(r.provostCheckedBy || "").replace(/"/g, '""')}"`,
          `"${(r.ceSailorInvolved || "").replace(/"/g, '""')}"`,
          `"${(r.cslogSailorInvolved || "").replace(/"/g, '""')}"`,
          r.sentToQCI ? "Yes" : "No",
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
  const sentCount = (daily ?? []).filter((d) => d.sentToQCI).length;

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
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={showOld ? "default" : "outline"}
              onClick={() => setShowOld((v) => !v)}
              className="gap-1.5"
              title="Toggle visibility of items that have gone through QCI"
            >
              <History className="h-3.5 w-3.5" />
              {showOld ? "Showing Old Items" : "Show Old Items"}
            </Button>
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
        {sentCount > 0 && (
          <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30">
            {sentCount} sent to QCI
          </CustomBadge>
        )}
        {showOld && (
          <CustomBadge className="bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30">
            <History className="h-3 w-3 mr-1" /> Old items view
          </CustomBadge>
        )}
      </div>

      {/* Grouped list */}
      {!daily || daily.length === 0 ? (
        <EmptyState
          icon={showOld ? History : CalendarDays}
          title={showOld ? "No old items" : "No daily collections"}
          description={
            showOld
              ? "No items have completed the QCI workflow yet. Old items appear here after QCI is done."
              : "No collections match the current filter. Record a collection to get started."
          }
          action={
            showOld ? undefined : (
              <Button
                onClick={() => setRecordOpen(true)}
                size="sm"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Record Collection
              </Button>
            )
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
                  {rows.map((r) => {
                    const isSending = sendingId === r.id;
                    const inQci = !!r.sentToQCI;
                    const isOld = !!r.isOld;
                    return (
                      <li
                        key={r.id}
                        className={cn(
                          "px-4 py-3 flex items-start gap-3 hover:bg-secondary/20 transition-colors",
                          isOld && "opacity-70"
                        )}
                      >
                        <div
                          className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                            isOld
                              ? "bg-slate-500/10 text-slate-400"
                              : inQci
                                ? "bg-violet-500/10 text-violet-400"
                                : "bg-emerald-500/10 text-emerald-400"
                          )}
                        >
                          {isOld ? (
                            <History className="h-4 w-4" />
                          ) : inQci ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <PackageCheck className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {r.itemName}
                              </p>
                              {isOld && (
                                <CustomBadge className="bg-slate-500/15 text-slate-400 border-slate-500/30 shrink-0">
                                  Old
                                </CustomBadge>
                              )}
                              {inQci && !isOld && (
                                <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30 shrink-0">
                                  In QCI
                                </CustomBadge>
                              )}
                            </div>
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
                          {/* Vehicle + personnel details */}
                          {(r.vehicleType ||
                            r.vehicleNumber ||
                            r.gatePassNumber ||
                            r.driverName ||
                            r.provostCheckedBy ||
                            r.ceSailorInvolved ||
                            r.cslogSailorInvolved) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                              {r.vehicleType && (
                                <span className="flex items-center gap-1">
                                  <Car className="h-3 w-3" />
                                  {r.vehicleType === "SLN" ? (
                                    <>
                                      SLN
                                      {r.vehicleNumber && ` · ${r.vehicleNumber}`}
                                      {r.gatePassNumber &&
                                        ` · GP ${r.gatePassNumber}`}
                                    </>
                                  ) : (
                                    <>
                                      Civil
                                      {r.driverName && ` · ${r.driverName}`}
                                      {r.driverPhone && ` · ${r.driverPhone}`}
                                    </>
                                  )}
                                </span>
                              )}
                              {r.provostCheckedBy && (
                                <span className="flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  Provost: {r.provostCheckedBy}
                                </span>
                              )}
                              {r.ceSailorInvolved && (
                                <span className="flex items-center gap-1">
                                  <Anchor className="h-3 w-3" />
                                  CE: {r.ceSailorInvolved}
                                </span>
                              )}
                              {r.cslogSailorInvolved && (
                                <span className="flex items-center gap-1">
                                  <Anchor className="h-3 w-3" />
                                  CSLOG: {r.cslogSailorInvolved}
                                </span>
                              )}
                            </div>
                          )}
                          {inQci && r.sentToQCIAt && (
                            <div className="text-[11px] text-violet-400 mt-1">
                              Sent to QCI · {formatDateTime(r.sentToQCIAt)}
                            </div>
                          )}
                        </div>
                        {/* Send to QCI button */}
                        {!showOld && !inQci && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-7 text-xs shrink-0 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20"
                            onClick={() => handleSendToQCI(r)}
                            disabled={isSending}
                          >
                            {isSending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Send to QCI
                          </Button>
                        )}
                        {inQci && !isOld && (
                          <span className="text-xs text-violet-400 shrink-0">
                            <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
                            In QCI
                          </span>
                        )}
                      </li>
                    );
                  })}
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
  const [selectedPoId, setSelectedPoId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  // Vehicle & gate-pass info
  const [vehicleType, setVehicleType] = useState<string>("SLN");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [gatePassNumber, setGatePassNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  // Personnel involved
  const [provostCheckedBy, setProvostCheckedBy] = useState("");
  const [ceSailorInvolved, setCeSailorInvolved] = useState("");
  const [cslogSailorInvolved, setCslogSailorInvolved] = useState("");
  const { toast } = useToast();

  // Fetch all project files (only when the dialog is open). We use ProjectFile
  // (not ProcurementFile) because the new collection-status workflow fields
  // (`collectionStatus`, `purchaseOrderNumber`, `collectionSyncedAt`) live on
  // the ProjectFile model — once a daily collection is recorded against a
  // file, we PUT its collectionStatus to "Collected".
  const allFiles = useAllProjectFiles(open);
  // Fetch stakeholders for the dropdowns (only when dialog open).
  const { data: stakeholders } = useFetch<Stakeholder[]>(
    open ? "/api/stakeholders" : null
  );
  // Track the file currently selected from the PO dropdown so we can update
  // its collectionStatus after the daily collection is recorded.
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

  const poOptions = useMemo(() => {
    // Show files that are either "In Collection" (post-sync) or have a PO
    // number set, or are at any pre-collection present-position (PO Placed /
    // Order Placed / Items Dispatched / In Transit).
    return (allFiles.data ?? []).filter(
      (f) =>
        f.collectionStatus === "In Collection" ||
        !!f.purchaseOrderNumber ||
        isPoProcessed(f.presentPosition)
    );
  }, [allFiles.data]);

  // Provost Sailors — category === "Provost Sailor"
  const provostSailors = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      const cat = (s.category || "").toLowerCase();
      return cat === "provost sailor";
    });
  }, [stakeholders]);

  // CCED Sailors for CE Sailor Involved dropdown
  const ccedSailors = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      const cat = (s.category || "").toLowerCase();
      const appt = (s.appointment || "").toLowerCase();
      return (
        cat === "cced sailor" ||
        cat.includes("cced") ||
        appt.includes("cced")
      );
    });
  }, [stakeholders]);

  // CSLOG Sailors for CSLOG Sailor Involved dropdown
  const cslogSailors = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      const cat = (s.category || "").toLowerCase();
      return cat === "cslog sailor";
    });
  }, [stakeholders]);

  function handlePoSelect(id: string) {
    setSelectedPoId(id);
    const f = poOptions.find((p) => p.id === id);
    if (!f) {
      setSelectedFile(null);
      return;
    }
    setSelectedFile(f);
    setItemName(f.itemName);
    setQty(String(f.qty || ""));
    setReceivedFrom(f.supplier || "");
  }

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
      vehicleType,
      vehicleNumber: vehicleNumber.trim() || undefined,
      gatePassNumber: gatePassNumber.trim() || undefined,
      driverName: driverName.trim() || undefined,
      driverLicense: driverLicense.trim() || undefined,
      driverPhone: driverPhone.trim() || undefined,
      provostCheckedBy: provostCheckedBy.trim() || undefined,
      ceSailorInvolved: ceSailorInvolved.trim() || undefined,
      cslogSailorInvolved: cslogSailorInvolved.trim() || undefined,
    });
    if (!res.ok) {
      setSubmitting(false);
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }
    // If a project file was linked, advance its collectionStatus to
    // "Collected" through the workflow PUT endpoint.
    if (selectedFile) {
      const upd = await updateFileCollectionStatus(selectedFile, "Collected", {
        changedBy: recordedBy.trim() || "Clerk",
      });
      if (!upd.ok) {
        toast({
          title: "Collection recorded — but file status not updated",
          description: upd.error,
          variant: "destructive",
        });
      }
    }
    setSubmitting(false);
    setItemName("");
    setQty("");
    setReceivedFrom("");
    setRecordedBy("");
    setSelectedPoId("");
    setSelectedFile(null);
    setVehicleNumber("");
    setGatePassNumber("");
    setDriverName("");
    setDriverLicense("");
    setDriverPhone("");
    setProvostCheckedBy("");
    setCeSailorInvolved("");
    setCslogSailorInvolved("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
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
          {/* Select PO Item — auto-fills item name, qty & receivedFrom */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5 text-amber-400" />
              Select PO Item
            </Label>
            <Select value={selectedPoId} onValueChange={handlePoSelect}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    allFiles.loading
                      ? "Loading PO files..."
                      : "Pick a PO-processed item to auto-fill"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {poOptions.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No PO-processed files
                  </SelectItem>
                ) : (
                  poOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.prNumber} · {p.itemName} ({formatNumber(p.qty)}{" "}
                      {p.unit})
                      {p.purchaseOrderNumber ? ` · PO ${p.purchaseOrderNumber}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Pick a project file with PO Placed/Dispatched/In Transit status,
              or one already synced to &ldquo;In Collection&rdquo; — its item,
              qty &amp; supplier will be auto-filled below. After recording,
              the file is advanced to &ldquo;Collected&rdquo;.
            </p>
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

          {/* Vehicle Type */}
          <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
            <Label className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-primary" />
              Vehicle Type
            </Label>
            <div className="flex rounded-md border border-border overflow-hidden h-9">
              <button
                type="button"
                onClick={() => setVehicleType("SLN")}
                className={cn(
                  "flex-1 text-xs font-medium transition-colors px-3",
                  vehicleType === "SLN"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                SLN
              </button>
              <button
                type="button"
                onClick={() => setVehicleType("Civil")}
                className={cn(
                  "flex-1 text-xs font-medium transition-colors px-3 border-l border-border",
                  vehicleType === "Civil"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                Civil
              </button>
            </div>
            {vehicleType === "SLN" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Vehicle Number
                  </Label>
                  <Input
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. SLN-0142"
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Gate Pass Number
                  </Label>
                  <Input
                    value={gatePassNumber}
                    onChange={(e) => setGatePassNumber(e.target.value)}
                    placeholder="e.g. GP/2025/042"
                    className="h-9 font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Driver Name
                  </Label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver name"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Driver License
                  </Label>
                  <Input
                    value={driverLicense}
                    onChange={(e) => setDriverLicense(e.target.value)}
                    placeholder="License #"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Driver Phone
                  </Label>
                  <Input
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="077-1234567"
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Personnel dropdowns */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Provost Checked By
            </Label>
            <Select value={provostCheckedBy} onValueChange={setProvostCheckedBy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provost sailor" />
              </SelectTrigger>
              <SelectContent>
                {provostSailors.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No provost sailors in directory
                  </SelectItem>
                ) : (
                  provostSailors.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {formatStakeholder(s)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Anchor className="h-3.5 w-3.5 text-blue-400" />
                CE Sailor Involved
              </Label>
              <Select value={ceSailorInvolved} onValueChange={setCeSailorInvolved}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select CCED sailor" />
                </SelectTrigger>
                <SelectContent>
                  {ccedSailors.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No CCED sailors in directory
                    </SelectItem>
                  ) : (
                    ccedSailors.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {formatStakeholder(s)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Anchor className="h-3.5 w-3.5 text-emerald-400" />
                CSLOG Sailor Involved
              </Label>
              <Select
                value={cslogSailorInvolved}
                onValueChange={setCslogSailorInvolved}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select CSLOG sailor" />
                </SelectTrigger>
                <SelectContent>
                  {cslogSailors.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No CSLOG sailors in directory
                    </SelectItem>
                  ) : (
                    cslogSailors.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {formatStakeholder(s)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
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
// Split Orders Tab — files split across multiple POs, collected
// separately and sent to QCI per-PO.
// ─────────────────────────────────────────────────────────
function splitEntryStatusColor(status: string): string {
  switch (status) {
    case "Collected":
      return "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30";
    case "In QCI":
      return "bg-blue-500/15 text-blue-500 dark:text-blue-400 border-blue-500/30";
    case "QCI Passed":
      return "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30";
    case "QCI Failed":
      return "bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30";
    case "Transferred":
      return "bg-violet-500/15 text-violet-500 dark:text-violet-400 border-violet-500/30";
    case "Pending":
    default:
      return "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30";
  }
}

/** Parse the linked POs comma-separated string into a clean list. */
function parseLinkedPOs(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function SplitOrdersTab() {
  const {
    data: orders,
    loading,
    error,
    refresh,
  } = useFetch<SplitOrder[]>("/api/split-orders");
  // Fetch the QCI list so we can detect which split-order entries already
  // have a QC inspection record (and thus appear in the QCI tab). The
  // "In QCI" badge on each entry is derived from this set.
  const { data: qciList, refresh: refreshQci } =
    useFetch<QCInspection[]>("/api/qc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [entryDialogOrder, setEntryDialogOrder] = useState<SplitOrder | null>(
    null
  );
  const [sendQciTarget, setSendQciTarget] = useState<
    { order: SplitOrder; entry: SplitOrderEntry } | null
  >(null);
  const { toast } = useToast();

  function toggle(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  // Set of Split Order Entry IDs that already have a QC inspection record
  // (refType = "splitorder" or legacy "Split Order Entry").
  const entryQciSet = useMemo(() => {
    const s = new Set<string>();
    (qciList ?? []).forEach((q) => {
      if (isSplitOrderRefType(q.refType) && q.refId) s.add(q.refId);
    });
    return s;
  }, [qciList]);

  if (loading) return <LoadingState label="Loading split orders..." />;
  if (error) return <ErrorState message={error} />;

  const activeCount = (orders ?? []).filter((o) => o.status === "Active").length;
  const totalEntries = (orders ?? []).reduce((s, o) => s + o.entries.length, 0);
  const inQciCount = (orders ?? []).reduce(
    (s, o) =>
      s +
      o.entries.filter(
        (e) =>
          entryQciSet.has(e.id) ||
          e.sentToQCI ||
          e.status === "In QCI"
      ).length,
    0
  );
  const collectedCount = (orders ?? []).reduce(
    (s, o) => s + o.entries.filter((e) => e.status === "Collected").length,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          A single file split across 2+ POs — collect each PO separately and
          send it to QCI under its own PO number.
        </p>
        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" /> Create Split Order
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Split Orders"
          value={orders?.length ?? 0}
          icon={SplitSquareHorizontal}
          accent="blue"
          sub={`${activeCount} active`}
        />
        <StatCard
          label="Total Entries"
          value={totalEntries}
          icon={ClipboardList}
          accent="amber"
          sub="POs across all orders"
        />
        <StatCard
          label="Collected"
          value={collectedCount}
          icon={PackageCheck}
          accent="green"
          sub="Awaiting QCI send"
        />
        <StatCard
          label="In QCI"
          value={inQciCount}
          icon={ShieldCheck}
          accent="purple"
          sub="Pending inspection"
        />
      </div>

      {!orders || orders.length === 0 ? (
        <EmptyState
          icon={SplitSquareHorizontal}
          title="No split orders"
          description="Create a split order to track collection across multiple POs in a single file."
          action={
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create Split Order
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const expanded = expandedId === order.id;
            const linkedPOs = parseLinkedPOs(order.linkedPOs);
            const receivedTotal = order.entries.reduce(
              (s, e) => s + (e.receivedQty || 0),
              0
            );
            const pct =
              order.totalQty > 0
                ? Math.min((receivedTotal / order.totalQty) * 100, 100)
                : 0;
            return (
              <div
                key={order.id}
                className={cn(
                  "bg-card border border-border rounded-xl overflow-hidden transition-all",
                  order.status === "Completed" && "opacity-70"
                )}
              >
                {/* Header */}
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
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <CustomBadge className="bg-blue-500/15 text-blue-500 dark:text-blue-400 border-blue-500/30 font-mono">
                              <FileText className="h-3 w-3 mr-1" />
                              {order.fileNumber}
                            </CustomBadge>
                            {order.prNumber && (
                              <CustomBadge className="bg-secondary text-muted-foreground border-border font-mono">
                                PR {order.prNumber}
                              </CustomBadge>
                            )}
                          </div>
                          <p className="font-semibold text-foreground truncate">
                            {order.itemName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.supplier || "—"} · Created{" "}
                            {formatFullDate(order.createdAt.slice(0, 10))}
                          </p>
                          {linkedPOs.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {linkedPOs.map((po) => (
                                <CustomBadge
                                  key={po}
                                  className="bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 font-mono"
                                >
                                  <Link2 className="h-3 w-3 mr-1" />
                                  {po}
                                </CustomBadge>
                              ))}
                            </div>
                          )}
                        </div>
                        <CustomBadge
                          className={cn(
                            "border-0 shrink-0",
                            order.status === "Completed"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          )}
                        >
                          {order.status}
                        </CustomBadge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <MiniStat
                          label="Total Qty"
                          value={formatNumber(order.totalQty)}
                        />
                        <MiniStat
                          label="Received"
                          value={formatNumber(receivedTotal)}
                          valueClass="text-emerald-400"
                        />
                        <MiniStat
                          label="Entries"
                          value={String(order.entries.length)}
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
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          PO Entries ({order.entries.length})
                        </h4>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEntryDialogOrder(order)}
                        >
                          <Plus className="h-4 w-4" /> Add Split Entry
                        </Button>
                      </div>
                      {order.entries.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                          No PO entries yet. Click “Add Split Entry” to record
                          collection for one PO.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-border [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border hover:bg-transparent">
                                <TableHead className="text-muted-foreground">
                                  PO Number
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
                                <TableHead className="text-muted-foreground text-right">
                                  Received
                                </TableHead>
                                <TableHead className="text-muted-foreground text-right">
                                  Balance
                                </TableHead>
                                <TableHead className="text-muted-foreground">
                                  Status
                                </TableHead>
                                <TableHead className="text-muted-foreground text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.entries.map((e) => {
                                const inQci =
                                  entryQciSet.has(e.id) ||
                                  e.sentToQCI ||
                                  e.status === "In QCI";
                                return (
                                  <TableRow
                                    key={e.id}
                                    className="border-border"
                                  >
                                    <TableCell className="font-mono text-amber-500 dark:text-amber-400">
                                      {e.poNumber}
                                    </TableCell>
                                    <TableCell className="text-foreground whitespace-nowrap">
                                      {e.date ? formatFullDate(e.date) : "—"}
                                    </TableCell>
                                    <TableCell className="text-foreground">
                                      {e.vehicleType === "Civil" ? (
                                        <span className="flex items-center gap-1 text-xs">
                                          <Car className="h-3 w-3" />
                                          {e.driverName || "Civil"}
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-xs">
                                          <Truck className="h-3 w-3" />
                                          {e.vehicleNumber || "SLN"}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-foreground text-right whitespace-nowrap">
                                      {formatNumber(e.qty)}
                                    </TableCell>
                                    <TableCell className="text-emerald-500 dark:text-emerald-400 text-right whitespace-nowrap">
                                      {formatNumber(e.receivedQty)}
                                    </TableCell>
                                    <TableCell className="text-amber-500 dark:text-amber-400 text-right whitespace-nowrap">
                                      {formatNumber(e.balance)}
                                    </TableCell>
                                    <TableCell>
                                      <CustomBadge
                                        className={cn(
                                          "border",
                                          splitEntryStatusColor(e.status)
                                        )}
                                      >
                                        {e.status}
                                      </CustomBadge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {inQci ? (
                                        <CustomBadge className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30">
                                          <ShieldCheck className="h-3 w-3 mr-1" />
                                          In QCI
                                        </CustomBadge>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1.5 h-7 text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20"
                                          onClick={() =>
                                            setSendQciTarget({ order, entry: e })
                                          }
                                        >
                                          <Send className="h-3.5 w-3.5" />
                                          Send to QCI
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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

      {/* Create Split Order dialog */}
      <CreateSplitOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          toast({ title: "Split order created" });
          refresh();
        }}
      />

      {/* Add Split Entry dialog */}
      {entryDialogOrder && (
        <AddSplitEntryDialog
          order={entryDialogOrder}
          open={!!entryDialogOrder}
          onOpenChange={(o) => !o && setEntryDialogOrder(null)}
          onCreated={() => {
            setEntryDialogOrder(null);
            toast({ title: "Split entry added" });
            refresh();
          }}
        />
      )}

      {/* Send Split-Order Entry to QCI Dialog */}
      {sendQciTarget && (
        <SendSplitOrderEntryToQCIDialog
          open={!!sendQciTarget}
          order={sendQciTarget.order}
          entry={sendQciTarget.entry}
          onOpenChange={(o) => !o && setSendQciTarget(null)}
          onSent={() => {
            setSendQciTarget(null);
            toast({ title: "Entry sent to QCI" });
            refreshQci();
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Create Split Order Dialog
// ─────────────────────────────────────────────────────────
interface CreateSplitOrderDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}

function CreateSplitOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateSplitOrderDialogProps) {
  const [fileNumber, setFileNumber] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [itemName, setItemName] = useState("");
  const [totalQty, setTotalQty] = useState("");
  const [supplier, setSupplier] = useState("");
  const [poEntries, setPoEntries] = useState<
    { poNumber: string; qty: string }[]
  >([
    { poNumber: "", qty: "" },
    { poNumber: "", qty: "" },
  ]);
  const [selectedPoId, setSelectedPoId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch all project files (only when the dialog is open) so the user can
  // pick a PO-processed file and auto-fill the order's details.
  const allFiles = useAllProjectFiles(open);

  const poOptions = useMemo(() => {
    return (allFiles.data ?? []).filter(
      (f) =>
        f.collectionStatus === "In Collection" ||
        !!f.purchaseOrderNumber ||
        isPoProcessed(f.presentPosition)
    );
  }, [allFiles.data]);

  function handlePoFileSelect(id: string) {
    setSelectedPoId(id);
    const f = poOptions.find((p) => p.id === id);
    if (!f) return;
    setItemName(f.itemName);
    setTotalQty(String(f.qty || ""));
    setSupplier(f.supplier || "");
    setPrNumber(f.prNumber || "");
    // Use fileGroupKey/fileNumber if present, fall back to PR number.
    const fileNo = (f as ProjectFile & { fileNumber?: string | null }).fileNumber;
    setFileNumber(fileNo || f.prNumber || "");
    // Pre-fill the first PO row with the file's PO number if present.
    if (f.purchaseOrderNumber) {
      setPoEntries((cur) => {
        const next = cur.slice();
        if (next.length > 0 && !next[0].poNumber) {
          next[0] = { ...next[0], poNumber: f.purchaseOrderNumber! };
        }
        return next;
      });
    }
  }

  function updatePoEntry(idx: number, field: "poNumber" | "qty", val: string) {
    setPoEntries((cur) => {
      const next = cur.slice();
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  }

  function addPoRow() {
    setPoEntries((cur) => [...cur, { poNumber: "", qty: "" }]);
  }

  function removePoRow(idx: number) {
    setPoEntries((cur) => {
      if (cur.length <= 2) return cur;
      return cur.filter((_, i) => i !== idx);
    });
  }

  // Sum of all PO qty entries (live preview).
  const poQtyTotal = useMemo(() => {
    return poEntries.reduce((s, e) => s + (Number(e.qty) || 0), 0);
  }, [poEntries]);

  async function submit() {
    if (!fileNumber.trim()) {
      toast({ title: "File number required", variant: "destructive" });
      return;
    }
    if (!itemName.trim()) {
      toast({ title: "Item name required", variant: "destructive" });
      return;
    }
    if (!totalQty || Number(totalQty) <= 0) {
      toast({
        title: "Valid total qty required",
        variant: "destructive",
      });
      return;
    }
    const cleanEntries = poEntries
      .map((e) => ({
        poNumber: e.poNumber.trim(),
        qty: Number(e.qty) || 0,
      }))
      .filter((e) => e.poNumber && e.qty > 0);
    if (cleanEntries.length < 2) {
      toast({
        title: "At least 2 PO entries required",
        description:
          "A split order must have 2 or more POs. Add PO numbers and qty for each.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const linkedPOs = cleanEntries.map((e) => e.poNumber).join(", ");
    const res = await apiRequest("/api/split-orders", "POST", {
      fileNumber: fileNumber.trim(),
      prNumber: prNumber.trim() || undefined,
      itemName: itemName.trim(),
      totalQty: Number(totalQty),
      supplier: supplier.trim() || undefined,
      linkedPOs,
      entries: cleanEntries.map((e) => ({
        poNumber: e.poNumber,
        qty: e.qty,
      })),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }
    setFileNumber("");
    setPrNumber("");
    setItemName("");
    setTotalQty("");
    setSupplier("");
    setPoEntries([
      { poNumber: "", qty: "" },
      { poNumber: "", qty: "" },
    ]);
    setSelectedPoId("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Split Order</DialogTitle>
          <DialogDescription>
            A single file split across 2+ POs. Each PO is collected separately
            and sent to QCI under its own PO number.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Select PO-processed file to auto-fill */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5 text-amber-400" />
              Select PO File (auto-fill)
            </Label>
            <Select value={selectedPoId} onValueChange={handlePoFileSelect}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    allFiles.loading
                      ? "Loading project files..."
                      : "Pick a PO-processed file to auto-fill"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {poOptions.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No PO-processed files
                  </SelectItem>
                ) : (
                  poOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.prNumber} · {p.itemName} ({formatNumber(p.qty)}{" "}
                      {p.unit})
                      {p.purchaseOrderNumber ? ` · PO ${p.purchaseOrderNumber}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Pick a project file with collectionStatus = &ldquo;In
              Collection&rdquo; or a purchase order number — its details will
              auto-fill below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>File Number</Label>
              <Input
                value={fileNumber}
                onChange={(e) => setFileNumber(e.target.value)}
                placeholder="e.g. FILE/2025/0142"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>PR Number</Label>
              <Input
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                placeholder="e.g. PR/2025/0142"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Item Name</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. TMT bars 16mm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Total Qty</Label>
              <Input
                type="number"
                value={totalQty}
                onChange={(e) => setTotalQty(e.target.value)}
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

          {/* PO entries — 2+ rows */}
          <div className="space-y-1.5 rounded-lg border border-border bg-secondary/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                PO Entries
                <CustomBadge className="bg-primary/10 text-primary border-primary/30">
                  {poEntries.length} PO{poEntries.length !== 1 ? "s" : ""}
                </CustomBadge>
              </Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={addPoRow}
              >
                <Plus className="h-3.5 w-3.5" /> Add PO Row
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Enter each PO number and the qty collected under it. At least 2
              PO entries are required.
            </p>
            <div className="space-y-2">
              {poEntries.map((e, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_120px_auto] gap-2 items-end"
                >
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      PO Number
                    </Label>
                    <Input
                      value={e.poNumber}
                      onChange={(ev) =>
                        updatePoEntry(idx, "poNumber", ev.target.value)
                      }
                      placeholder="e.g. PO/2025/0142"
                      className="h-9 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Qty
                    </Label>
                    <Input
                      type="number"
                      value={e.qty}
                      onChange={(ev) =>
                        updatePoEntry(idx, "qty", ev.target.value)
                      }
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-red-400 hover:text-red-300"
                    onClick={() => removePoRow(idx)}
                    disabled={poEntries.length <= 2}
                    title="Remove PO row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Sum of PO qty:
              </span>
              <span className="text-sm font-semibold text-foreground font-mono">
                {formatNumber(poQtyTotal)}
                {Number(totalQty) > 0 && (
                  <span
                    className={cn(
                      "ml-2 text-xs font-normal",
                      poQtyTotal === Number(totalQty)
                        ? "text-emerald-400"
                        : "text-amber-500 dark:text-amber-400"
                    )}
                  >
                    {poQtyTotal === Number(totalQty)
                      ? "✓ matches total"
                      : `≠ total ${formatNumber(Number(totalQty))}`}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Saving..." : "Create Split Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Add Split Entry Dialog — record collection for one PO
// ─────────────────────────────────────────────────────────
interface AddSplitEntryDialogProps {
  order: SplitOrder;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}

function AddSplitEntryDialog({
  order,
  open,
  onOpenChange,
  onCreated,
}: AddSplitEntryDialogProps) {
  const today = todayISO();
  const linkedPOs = parseLinkedPOs(order.linkedPOs);
  const [poNumber, setPoNumber] = useState<string>("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(today);
  const [vehicleType, setVehicleType] = useState<string>("SLN");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [gatePassNumber, setGatePassNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [provostCheckedBy, setProvostCheckedBy] = useState("");
  const [ceSailorInvolved, setCeSailorInvolved] = useState("");
  const [cslogSailorInvolved, setCslogSailorInvolved] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch stakeholders (only when dialog open) for the dropdowns.
  const { data: stakeholders } = useFetch<Stakeholder[]>(
    open ? "/api/stakeholders" : null
  );

  const provostSailors = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      const cat = (s.category || "").toLowerCase();
      return cat === "provost sailor";
    });
  }, [stakeholders]);

  const ccedSailors = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      const cat = (s.category || "").toLowerCase();
      const appt = (s.appointment || "").toLowerCase();
      return (
        cat === "cced sailor" ||
        cat.includes("cced") ||
        appt.includes("cced")
      );
    });
  }, [stakeholders]);

  const cslogSailors = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      const cat = (s.category || "").toLowerCase();
      const appt = (s.appointment || "").toLowerCase();
      return (
        cat === "cslog sailor" ||
        (cat.includes("cslog") && !cat.includes("officer"))
      );
    });
  }, [stakeholders]);

  async function submit() {
    if (!poNumber.trim()) {
      toast({ title: "PO number required", variant: "destructive" });
      return;
    }
    if (!qty || Number(qty) <= 0) {
      toast({ title: "Valid qty required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const res = await apiRequest(
      `/api/split-orders/${order.id}/entries`,
      "POST",
      {
        poNumber: poNumber.trim(),
        qty: Number(qty),
        date,
        vehicleType,
        vehicleNumber: vehicleNumber.trim() || undefined,
        gatePassNumber: gatePassNumber.trim() || undefined,
        driverName: driverName.trim() || undefined,
        driverLicense: driverLicense.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        provostCheckedBy: provostCheckedBy.trim() || undefined,
        ceSailorInvolved: ceSailorInvolved.trim() || undefined,
        cslogSailorInvolved: cslogSailorInvolved.trim() || undefined,
      }
    );
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }
    setPoNumber("");
    setQty("");
    setVehicleNumber("");
    setGatePassNumber("");
    setDriverName("");
    setDriverLicense("");
    setDriverPhone("");
    setProvostCheckedBy("");
    setCeSailorInvolved("");
    setCslogSailorInvolved("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Split Entry</DialogTitle>
          <DialogDescription>
            Record collection for one PO of{" "}
            <span className="text-foreground font-medium">
              {order.itemName}
            </span>{" "}
            · File{" "}
            <span className="text-foreground font-mono">
              {order.fileNumber}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                PO Number
              </Label>
              {linkedPOs.length > 0 ? (
                <Select value={poNumber} onValueChange={setPoNumber}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a linked PO" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedPOs.map((po) => (
                      <SelectItem key={po} value={po}>
                        {po}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom">Other (type below)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. PO/2025/0142"
                  className="font-mono"
                />
              )}
              {poNumber === "__custom" && (
                <Input
                  value=""
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Type PO number"
                  className="font-mono mt-1"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
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

          {/* Vehicle Type */}
          <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
            <Label className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-primary" />
              Vehicle Type
            </Label>
            <div className="flex rounded-md border border-border overflow-hidden h-9">
              <button
                type="button"
                onClick={() => setVehicleType("SLN")}
                className={cn(
                  "flex-1 text-xs font-medium transition-colors px-3",
                  vehicleType === "SLN"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                SLN
              </button>
              <button
                type="button"
                onClick={() => setVehicleType("Civil")}
                className={cn(
                  "flex-1 text-xs font-medium transition-colors px-3 border-l border-border",
                  vehicleType === "Civil"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                Civil
              </button>
            </div>
            {vehicleType === "SLN" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Vehicle Number
                  </Label>
                  <Input
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. SLN-0142"
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Gate Pass Number
                  </Label>
                  <Input
                    value={gatePassNumber}
                    onChange={(e) => setGatePassNumber(e.target.value)}
                    placeholder="e.g. GP/2025/042"
                    className="h-9 font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Driver Name
                  </Label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver name"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Driver License
                  </Label>
                  <Input
                    value={driverLicense}
                    onChange={(e) => setDriverLicense(e.target.value)}
                    placeholder="License #"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Driver Phone
                  </Label>
                  <Input
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="077-1234567"
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Personnel dropdowns */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Provost Checked By
            </Label>
            <Select value={provostCheckedBy} onValueChange={setProvostCheckedBy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provost sailor" />
              </SelectTrigger>
              <SelectContent>
                {provostSailors.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No provost sailors in directory
                  </SelectItem>
                ) : (
                  provostSailors.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {formatStakeholder(s)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Anchor className="h-3.5 w-3.5 text-blue-400" />
                CE Sailor Involved
              </Label>
              <Select value={ceSailorInvolved} onValueChange={setCeSailorInvolved}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select CCED sailor" />
                </SelectTrigger>
                <SelectContent>
                  {ccedSailors.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No CCED sailors in directory
                    </SelectItem>
                  ) : (
                    ccedSailors.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {formatStakeholder(s)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Anchor className="h-3.5 w-3.5 text-emerald-400" />
                CSLOG Sailor Involved
              </Label>
              <Select
                value={cslogSailorInvolved}
                onValueChange={setCslogSailorInvolved}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select CSLOG sailor" />
                </SelectTrigger>
                <SelectContent>
                  {cslogSailors.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No CSLOG sailors in directory
                    </SelectItem>
                  ) : (
                    cslogSailors.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {formatStakeholder(s)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Saving..." : "Add Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Send Split-Order Entry to QCI Dialog — creates a QC inspection
// record (refType = "splitorder") for the entry AND flips the
// entry's sentToQCI flag via the split-orders send-to-qci endpoint.
// The entry then appears in the QCI Inspection tab and is available
// for "Send to Area Store" once QCI passes.
// ─────────────────────────────────────────────────────────
interface SendSplitOrderEntryToQCIDialogProps {
  open: boolean;
  order: SplitOrder;
  entry: SplitOrderEntry;
  onOpenChange: (o: boolean) => void;
  onSent: () => void;
}

function SendSplitOrderEntryToQCIDialog({
  open,
  order,
  entry,
  onOpenChange,
  onSent,
}: SendSplitOrderEntryToQCIDialogProps) {
  const [qcLevel, setQcLevel] = useState<string>("Satisfactory");
  const [qcOfficer, setQcOfficer] = useState<string>("");
  const [qcOfficerDetails, setQcOfficerDetails] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { data: officers, loading: officersLoading } = useCcedOfficers(open);

  const cleanSupplier = (order.supplier || "").trim();
  const isFail = qcLevel === "Fail";

  async function submit() {
    if (!qcOfficer) {
      toast({
        title: "QCI Officer required",
        description: "Select a CCED Officer from the dropdown.",
        variant: "destructive",
      });
      return;
    }
    if (isFail && !remarks.trim()) {
      toast({
        title: "Remarks required when QC Level is Fail",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    // 1) Create the QC inspection record — this is what makes the entry
    //    appear in the QCI tab.
    const res = await apiRequest("/api/qc", "POST", {
      refType: "splitorder",
      refId: entry.id,
      itemName: order.itemName,
      supplier: cleanSupplier || undefined,
      qty: entry.qty,
      qcLevel,
      qcOfficer,
      qcOfficerDetails: qcOfficerDetails.trim() || undefined,
      remarks: remarks.trim() || undefined,
      // Split Order: fileNumber is the order's file number; poNumber is the
      // unique PO number for this specific entry (unique per split).
      fileNumber: order.fileNumber || undefined,
      poNumber: entry.poNumber || undefined,
    });
    if (!res.ok) {
      setSubmitting(false);
      toast({ title: res.error || "Failed", variant: "destructive" });
      return;
    }
    // 2) Also flip the entry's sentToQCI flag so the SplitOrdersTab UI
    //    (and any dashboard stats that read entry.sentToQCI) stay
    //    consistent. Non-fatal: the QCI record already exists, so the
    //    entry will appear in the QCI tab regardless.
    const flagRes = await apiRequest(
      `/api/split-orders/${order.id}/entries/${entry.id}/send-to-qci`,
      "POST"
    );
    setSubmitting(false);
    if (!flagRes.ok) {
      toast({
        title: "Sent to QCI — entry flag not updated",
        description:
          flagRes.error ||
          "The QCI record was created but the entry's status could not be updated.",
        variant: "destructive",
      });
    }
    setQcLevel("Satisfactory");
    setQcOfficer("");
    setQcOfficerDetails("");
    setRemarks("");
    onSent();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-violet-400" />
            Send to QCI
          </DialogTitle>
          <DialogDescription>
            Create a QC inspection record for this split-order entry. The
            entry will appear in the QCI tab under its own PO number.
          </DialogDescription>
        </DialogHeader>
        {/* Entry summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Item</p>
            <p className="text-foreground font-medium truncate">
              {order.itemName}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">PO Number</p>
            <p className="text-foreground font-medium font-mono text-amber-600 dark:text-amber-400">
              {entry.poNumber}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">File Number</p>
            <p className="text-foreground font-medium font-mono truncate">
              {order.fileNumber || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Qty</p>
            <p className="text-foreground font-medium">
              {formatNumber(entry.qty)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Supplier</p>
            <p className="text-foreground font-medium truncate">
              {cleanSupplier || "—"}
            </p>
          </div>
        </div>
        <div className="space-y-3 py-1">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                QCI Officer <span className="text-red-400">*</span>
              </Label>
              <Select value={qcOfficer} onValueChange={setQcOfficer}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      officersLoading
                        ? "Loading officers..."
                        : officers.length === 0
                        ? "No CCED officers found"
                        : "Select CCED officer"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {officers.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No CCED officers — add one in Stakeholders
                    </SelectItem>
                  ) : (
                    officers.map((o) => (
                      <SelectItem key={o.id} value={formatOfficerOption(o)}>
                        {formatOfficerOption(o)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Sourced from the Stakeholders directory (CCED Officer category).
              </p>
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
              rows={2}
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
          <Button
            onClick={submit}
            disabled={submitting}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Sending..." : "Send to QCI"}
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
  fileNumber?: string | null;
  poNumber?: string | null;
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
                    QCI Number
                  </TableHead>
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
                      <TableCell className="whitespace-nowrap">
                        {i.qciNumber ? (
                          <CustomBadge
                            className="bg-primary/10 text-primary dark:text-primary-foreground border-primary/30 font-mono font-semibold"
                            title="QCI Number"
                          >
                            <Hash className="h-3 w-3 mr-1" />
                            {i.qciNumber}
                          </CustomBadge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            auto
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(i.inspectedAt)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <CustomBadge
                            className={cn(
                              "border",
                              refTypeBadgeClass(i.refType)
                            )}
                            title={`Reference type: ${i.refType}`}
                          >
                            {refTypeLabel(i.refType)}
                          </CustomBadge>
                          {i.fileNumber && (
                            <CustomBadge
                              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-mono"
                              title="File Number"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {i.fileNumber}
                            </CustomBadge>
                          )}
                          {i.poNumber && (
                            <CustomBadge
                              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono"
                              title="PO Number"
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              {i.poNumber}
                            </CustomBadge>
                          )}
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
                            {transferred.fileNumber && (
                              <CustomBadge
                                className="bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/30 font-mono"
                                title="NAV 255 Number"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {transferred.fileNumber}
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
    // Editing may have a stored token ("partsupply") or legacy label
    // ("Part Supply Entry"); map both back to the UI label.
    ((): QCRefType => {
      if (!editing?.refType) return "Daily Collection";
      const t = editing.refType;
      if (t === "partsupply" || t === "Part Supply Entry")
        return "Part Supply Entry";
      if (t === "splitorder" || t === "Split Order Entry")
        return "Split Order Entry";
      if (t === "daily" || t === "Daily Collection") return "Daily Collection";
      if (t === "collection" || t === "Collection Item")
        return "Collection Item";
      return "Daily Collection";
    })()
  );
  const [refId, setRefId] = useState<string>(editing?.refId || "");
  const [qciNumber, setQciNumber] = useState<string>(
    editing?.qciNumber || ""
  );
  const [itemName, setItemName] = useState<string>(editing?.itemName || "");
  const [supplier, setSupplier] = useState<string>(editing?.supplier || "");
  const [qty, setQty] = useState<string>(
    editing ? String(editing.qty ?? "") : ""
  );
  const [fileNumber, setFileNumber] = useState<string>(
    editing?.fileNumber || ""
  );
  const [poNumber, setPoNumber] = useState<string>(editing?.poNumber || "");
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
  const { data: officers, loading: officersLoading } = useCcedOfficers(open);

  // Fetch all project files (only when dialog open) so we can advance the
  // matching file's collectionStatus to "QCI Passed" or "QCI Failed" after
  // the inspection is saved. Matching is by item name (case-insensitive).
  const allFiles = useAllProjectFiles(open);

  // Fetch reference options based on refType (only in create mode)
  const refUrl = useMemo<string | null>(() => {
    if (!open || isEdit) return null;
    if (refType === "Daily Collection") return "/api/collection/daily";
    if (refType === "Part Supply Entry") return "/api/collection/part-supply";
    if (refType === "Split Order Entry") return "/api/split-orders";
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
    setFileNumber("");
    setPoNumber("");
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
      return (refData as PartSupplyOrder[]).flatMap((o) => {
        const parsed = parseSupplierWithPos(o.supplier);
        const linkedFileNo =
          parsed.pos.length > 0 ? parsed.pos.join(", ") : null;
        return o.entries.map((e) => ({
          value: e.id,
          label: `${o.itemName} — ${formatNumber(e.qty)} ${formatFullDate(
            e.date
          )} (entry ${e.srNo})`,
          itemName: o.itemName,
          supplier: parsed.supplier || "",
          qty: e.qty,
          fileNumber: linkedFileNo,
          poNumber: parsed.pos.length === 1 ? parsed.pos[0] : null,
        }));
      });
    }
    if (refType === "Split Order Entry") {
      return (refData as SplitOrder[]).flatMap((o) =>
        o.entries.map((e) => ({
          value: e.id,
          label: `${o.itemName} — PO ${e.poNumber} · ${formatNumber(
            e.qty
          )} ${e.date ? formatFullDate(e.date) : ""}`,
          itemName: o.itemName,
          supplier: o.supplier || "",
          qty: e.qty,
          fileNumber: o.fileNumber,
          poNumber: e.poNumber,
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
      setFileNumber(opt.fileNumber ?? "");
      setPoNumber(opt.poNumber ?? "");
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
    if (!qcOfficer) {
      toast({
        title: "QCI Officer required",
        description: "Select a CCED Officer from the dropdown.",
        variant: "destructive",
      });
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
          qcOfficer,
          qcOfficerDetails: qcOfficerDetails.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }
      : {
          // Send the canonical stored token (daily/partsupply/splitorder/
          // collection) — the API persists this verbatim.
          refType: qcRefTypeStoredValue(refType),
          refId,
          qciNumber: qciNumber.trim() || undefined,
          itemName: itemName.trim(),
          supplier: supplier.trim() || undefined,
          qty: Number(qty) || 0,
          qcLevel,
          qcOfficer,
          qcOfficerDetails: qcOfficerDetails.trim() || undefined,
          remarks: remarks.trim() || undefined,
          fileNumber: fileNumber.trim() || undefined,
          poNumber: poNumber.trim() || undefined,
        };
    const res = await apiRequest(url, method, body);
    if (!res.ok) {
      setSubmitting(false);
      toast({ title: res.error || "Failed to save", variant: "destructive" });
      return;
    }

    // Advance the matching project file(s) through the workflow:
    //   QCI Passed → "QCI Passed"
    //   QCI Failed → "QCI Failed"
    // Files eligible for this transition are those currently in
    // "Collected", "In QCI", "QCI Failed", or "QCI Passed" status (so a
    // re-inspection correctly re-flips the status). Matching is by item name
    // (case-insensitive) — non-fatal: the inspection itself is already saved.
    const targetStatus = isPassingQc(qcLevel) ? "QCI Passed" : "QCI Failed";
    const target = (itemName || "").toLowerCase().trim();
    const eligibleStatuses = ["Collected", "In QCI", "QCI Passed", "QCI Failed"];
    const matched = (allFiles.data ?? []).filter(
      (f) =>
        target &&
        (f.itemName || "").toLowerCase().trim() === target &&
        eligibleStatuses.includes(f.collectionStatus)
    );
    if (matched.length > 0) {
      const results = await Promise.all(
        matched.map((f) =>
          updateFileCollectionStatus(f, targetStatus, {
            changedBy: qcOfficer || "QCI Officer",
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        toast({
          title: "Inspection saved — but file status not updated",
          description: failed[0]?.error,
          variant: "destructive",
        });
      }
    }
    setSubmitting(false);
    onSaved();
  }

  const isFail = qcLevel === "Fail";

  // Preview the next auto-generated QCI number when the field is empty
  // (create mode only). Format: QCI/<year>/<seq:0001>.
  const autoQciPreview = useMemo(() => {
    if (isEdit || qciNumber.trim()) return "";
    const year = new Date().getFullYear();
    // We don't know the exact next sequence without a server round-trip;
    // show a generic hint with a placeholder sequence marker.
    return `QCI/${year}/000X`;
  }, [isEdit, qciNumber]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit QC Inspection" : "New QC Inspection"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update QC level, officer & remarks for this inspection."
              : "Evaluate and rate a collected, part-supplied, or split-order item."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* QCI Number */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              QCI Number
            </Label>
            <Input
              value={qciNumber}
              onChange={(e) => setQciNumber(e.target.value)}
              placeholder={autoQciPreview || "e.g. QCI/2025/0001"}
              className="font-mono"
              disabled={isEdit}
            />
            <p className="text-[11px] text-muted-foreground">
              {isEdit
                ? "QCI number is set when the inspection is created and cannot be changed."
                : qciNumber.trim()
                ? "Using the custom QCI number you entered."
                : `Auto-generated: ${autoQciPreview} (leave blank for auto)`}
            </p>
          </div>

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

          {/* File Number + PO Number */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                File Number
              </Label>
              <Input
                value={fileNumber}
                onChange={(e) => setFileNumber(e.target.value)}
                placeholder="Auto-filled from reference"
                className="font-mono"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                PO Number
              </Label>
              <Input
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Auto-filled (split orders)"
                className="font-mono"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                QCI Officer <span className="text-red-400">*</span>
              </Label>
              <Select value={qcOfficer} onValueChange={setQcOfficer}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      officersLoading
                        ? "Loading officers..."
                        : officers.length === 0
                        ? "No CCED officers found"
                        : "Select CCED officer"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {officers.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No CCED officers — add one in Stakeholders
                    </SelectItem>
                  ) : (
                    officers.map((o) => (
                      <SelectItem key={o.id} value={formatOfficerOption(o)}>
                        {formatOfficerOption(o)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Sourced from the Stakeholders directory (CCED Officer category).
              </p>
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

  // Fetch all project files (only when the dialog is open) so we can advance
  // the matching file's collectionStatus to "Transferred to Area Store" once
  // the area-store record is created. Matching is by item name.
  const allFiles = useAllProjectFiles(open);

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
    if (!fileNumber.trim()) {
      toast({
        title: "NAV 255 Number is required",
        description:
          "Enter the NAV 255 document number that authorises this transfer to the area store.",
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
      fileNumber: fileNumber.trim(),
      location: location.trim() || null,
      date: date || todayISO(),
      remarks: remarks.trim() || null,
    };
    const res = await apiRequest("/api/area-stores", "POST", body);
    if (!res.ok) {
      setSubmitting(false);
      toast({
        title: "Failed to send to store",
        description: res.error,
        variant: "destructive",
      });
      return;
    }

    // Advance the matching project file's collectionStatus to
    // "Transferred to Area Store" — the PUT endpoint also creates the
    // AreaStoreRecord server-side as a side-effect (so we end up with two
    // records: one from the POST above, one from the PUT below). To avoid
    // duplicates, we only PUT to update the file's collectionStatus without
    // re-sending the area-store record body. The PUT route handles this:
    // when called with collectionStatus = "Transferred to Area Store" AND
    // areaStoreName, it creates another AreaStoreRecord — so we pass an
    // empty areaStoreName to suppress that. (The backend currently creates
    // a record only when areaStoreName is truthy.)
    const target = (inspection.itemName || "").toLowerCase().trim();
    const eligibleStatuses = ["Collected", "In QCI", "QCI Passed"];
    const matched = (allFiles.data ?? []).filter(
      (f) =>
        target &&
        (f.itemName || "").toLowerCase().trim() === target &&
        eligibleStatuses.includes(f.collectionStatus)
    );
    if (matched.length > 0) {
      const results = await Promise.all(
        matched.map((f) =>
          updateFileCollectionStatus(f, "Transferred to Area Store", {
            // Omit areaStoreName so the PUT doesn't create a duplicate
            // AreaStoreRecord — the record was already created above.
            navReference,
            navNumber: fileNumber.trim(),
            changedBy: inspection.qcOfficer || "QCI Officer",
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        toast({
          title: "Sent to store — but file status not updated",
          description: failed[0]?.error,
          variant: "destructive",
        });
      }
    }
    setSubmitting(false);
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
            (NAV 255 — off-charge from shipping stores into the area store). A
            specific{" "}
            <span className="text-foreground font-medium">NAV 255 Number</span>{" "}
            is required to authorise this transfer.
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

          {/* NAV 255 Number (mandatory — saved as AreaStoreRecord.fileNumber) */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="flex items-center gap-1">
              NAV 255 Number
              <span className="text-destructive">*</span>
            </Label>
            <Input
              value={fileNumber}
              onChange={(e) => setFileNumber(e.target.value)}
              placeholder="e.g. NAV/255/2025/0142"
              className={cn(
                "font-mono",
                !fileNumber.trim() && "border-amber-500/60 focus-visible:border-amber-500"
              )}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              The specific NAV 255 document/reference number that authorises
              this transfer. Saved as the area-store record&apos;s file number.
            </p>
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
