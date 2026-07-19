"use client";

import { useMemo, useRef, useState } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { LoadingState, ErrorState, EmptyState } from "@/components/erp/states";
import { CategoryBadge, CustomBadge } from "@/components/erp/badges";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Warehouse,
  Plus,
  Search,
  Pencil,
  Eye,
  Download,
  Upload,
  AlertTriangle,
  Package,
  Boxes,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  TrendingUp,
  PackageCheck,
  ArrowUpDown,
  MapPin,
  X,
  ClipboardList,
  Layers,
  Bookmark,
  BookmarkPlus,
  List,
  ScanSearch,
  Trash2,
  Wand2,
  Check,
  RefreshCw,
  Database,
  GitMerge,
  Sparkles,
  Copy,
  Store,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
} from "lucide-react";
import {
  formatCurrency,
  formatNumber,
  STORE_CATEGORIES,
  FILE_CATEGORIES,
  ZONES,
  AREA_STORES,
  AREA_STORE_CATEGORIES,
  NAV_REFERENCES,
  navRefColor,
  confidenceColor,
  itemMasterStatusColor,
  duplicateTypeColor,
} from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface StoreZone {
  id: string;
  name: string;
  type: string;
  totalValue: number;
  itemCount: number;
  lowStockCount: number;
  recentReceipts: number;
  pendingCollection: number;
  nonMovingCount: number;
}

interface StoreItem {
  id: string;
  zoneName: string;
  description: string;
  category: string;
  unit: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  location: string | null;
  minStock: number;
  maxStock: number;
  lastMovement: string | null;
  supplier: string | null;
  itemCode: string | null;
  ilmsCode: string | null;
  createdAt: string;
}

interface EarmarkedItem {
  id: string;
  storeItemId: string | null;
  itemDescription: string;
  itemCode: string | null;
  projectId: string;
  projectName: string;
  qty: number;
  unit: string;
  authority: string | null;
  remarks: string | null;
  createdAt: string;
}

interface ProjectOption {
  id: string;
  name: string;
  voteNumber: string | null;
}

interface FindCodeCandidate {
  storeItemId: string | null;
  description: string;
  category: string;
  unit: string;
  cost: number;
}

type Confidence = "high" | "medium" | "low" | "none";

interface FindCodeResult {
  description: string;
  suggestedItemCode: string | null;
  isDuplicate: boolean;
  duplicateOf: string | null;
  existingCodes: string[];
  confidence: Confidence;
  recommendation: string;
}

// ─── Item Code Master & Deduplication types ───
interface ItemMasterRecord {
  id: string;
  canonicalCode: string;
  description: string;
  category: string;
  unit: string;
  alternateCodes: string | null;
  alternateNames: string | null;
  status: string;
  mergedInto: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DuplicateGroupItem {
  id: string;
  canonicalCode: string;
  description: string;
  category: string;
  source: "item-master" | "store-item";
  storeItemId?: string;
  zoneName?: string;
}

interface DuplicateGroup {
  type:
    | "same_name_diff_code"
    | "same_code_diff_name"
    | "multi_code_one_item"
    | "near_duplicate";
  description: string;
  canonicalCode: string | null;
  items: DuplicateGroupItem[];
  recommendation: string;
}

interface AnalyzeResponse {
  totalScanned: number;
  duplicatesFound: number;
  groups: DuplicateGroup[];
}

interface MergeResponse {
  ok: boolean;
  canonicalCode: string;
  mergedCount: number;
  alternateCodes: string | null;
  alternateNames: string | null;
}

// ─── Area Store Records (CSLOG — oncharge NAV 251 / off-charge NAV 255) ───
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
  navReference: string | null; // "NAV 251" | "NAV 255"
  qcInspectionId: string | null;
  fileNumber: string | null;
  location: string | null;
  date: string | null;
  remarks: string | null;
  createdAt: string;
}

type AreaRecordTypeFilter = "all" | "Oncharge" | "OffCharge";

type StockFilter = "all" | "in" | "low" | "out" | "over";
type SortKey = "description" | "qty" | "cost" | "category";

const PAGE_SIZE = 25;

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
export function StoresModule() {
  const [tab, setTab] = useState<"zones" | "stores" | "area">("zones");

  // Shared fetches
  const {
    data: zones,
    loading: zLoading,
    error: zError,
    refresh: refreshZones,
  } = useFetch<StoreZone[]>("/api/stores/zones");
  const {
    data: items,
    loading: iLoading,
    error: iError,
    refresh: refreshItems,
  } = useFetch<StoreItem[]>("/api/stores");

  // Stores-tab filter state
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("description");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewing, setViewing] = useState<StoreItem | null>(null);
  const [earmarkOpen, setEarmarkOpen] = useState(false);
  const [earmarkListOpen, setEarmarkListOpen] = useState(false);
  const [findCodeOpen, setFindCodeOpen] = useState(false);

  const { toast } = useToast();

  // Derived: filtered + sorted list
  const filtered = useMemo(() => {
    if (!items) return [];
    let list = items.slice();
    if (category !== "All") list = list.filter((i) => i.category === category);
    if (zoneFilter !== "all") list = list.filter((i) => i.zoneName === zoneFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((i) => i.description.toLowerCase().includes(q));
    list = list.filter((i) => {
      if (stockFilter === "out") return i.qty <= 0;
      if (stockFilter === "low")
        return i.minStock > 0 && i.qty > 0 && i.qty <= i.minStock;
      if (stockFilter === "in") return i.minStock === 0 || i.qty > i.minStock;
      if (stockFilter === "over") return i.maxStock > 0 && i.qty >= i.maxStock;
      return true;
    });
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "description") cmp = a.description.localeCompare(b.description);
      else if (sortKey === "qty") cmp = a.qty - b.qty;
      else if (sortKey === "cost") cmp = a.totalCost - b.totalCost;
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [items, category, zoneFilter, search, stockFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Stats reflect the currently filtered set
  const stats = useMemo(() => {
    const net = filtered.reduce((s, i) => s + i.totalCost, 0);
    const task = filtered.length;
    const avail = filtered.filter((i) => i.qty > 0).length;
    const team = filtered.filter((i) => i.minStock > 0 && i.qty <= i.minStock).length;
    return { net, task, avail, team };
  }, [filtered]);

  // Wrap filter setters so any change also resets pagination to page 1
  const setCategoryR = (c: string) => {
    setCategory(c);
    setPage(1);
  };
  const setSearchR = (s: string) => {
    setSearch(s);
    setPage(1);
  };
  const setZoneFilterR = (z: string) => {
    setZoneFilter(z);
    setPage(1);
  };
  const setStockFilterR = (s: StockFilter) => {
    setStockFilter(s);
    setPage(1);
  };
  const setSortKeyR = (k: SortKey) => {
    setSortKey(k);
    setPage(1);
  };
  const setSortDirR = (d: "asc" | "desc") => {
    setSortDir(d);
    setPage(1);
  };
  const toggleSortR = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
    setPage(1);
  };

  // Handlers
  const handleZoneClick = (zoneName: string) => {
    setZoneFilter(zoneName);
    setCategory("All");
    setStockFilter("all");
    setSearch("");
    setPage(1);
    setTab("stores");
    toast({
      title: `Browsing ${zoneName}`,
      description: "Switched to Stores tab with zone filter applied.",
    });
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: StoreItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    refreshItems();
    refreshZones();
    toast({
      title: editing ? "Item updated" : "Item added",
      description: editing
        ? "Store item has been updated successfully."
        : "New store item has been added to the store.",
    });
  };

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  return (
    <div>
      <PageHeader
        title="Store Management"
        description="Zones, inventory & stock-level monitoring across the dockyard"
        icon={Warehouse}
        actions={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFindCodeOpen(true)}
              className="gap-1.5"
              title="Find item codes using AI"
            >
              <ScanSearch className="h-4 w-4" /> Find Item Codes (AI)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEarmarkListOpen(true)}
              className="gap-1.5"
              title="View all earmarked items"
            >
              <List className="h-4 w-4" /> View Earmarked
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEarmarkOpen(true)}
              className="gap-1.5"
              title="Earmark an item for a project without a PR"
            >
              <BookmarkPlus className="h-4 w-4" /> Earmark Item
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
            <Button onClick={openAdd} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "zones" | "stores" | "area")}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="zones" className="gap-1.5">
            <Boxes className="h-4 w-4" /> Zones
          </TabsTrigger>
          <TabsTrigger value="stores" className="gap-1.5">
            <Package className="h-4 w-4" /> Stores
          </TabsTrigger>
          <TabsTrigger value="area" className="gap-1.5">
            <Store className="h-4 w-4" /> Area Stores
          </TabsTrigger>
        </TabsList>

        {/* ─── Zones tab ─── */}
        <TabsContent value="zones" className="mt-4">
          <ZonesTab
            zones={zones}
            loading={zLoading}
            error={zError}
            onZoneClick={handleZoneClick}
          />
        </TabsContent>

        {/* ─── Stores tab ─── */}
        <TabsContent value="stores" className="mt-4">
          <StoresTab
            items={items}
            loading={iLoading}
            error={iError}
            zones={zones}
            stats={stats}
            category={category}
            setCategory={setCategoryR}
            search={search}
            setSearch={setSearchR}
            zoneFilter={zoneFilter}
            setZoneFilter={setZoneFilterR}
            stockFilter={stockFilter}
            setStockFilter={setStockFilterR}
            sortKey={sortKey}
            sortDir={sortDir}
            setSortKey={setSortKeyR}
            setSortDir={setSortDirR}
            toggleSort={toggleSortR}
            filtered={filtered}
            pageItems={pageItems}
            safePage={safePage}
            totalPages={totalPages}
            setPage={setPage}
            onEdit={openEdit}
            onView={(it) => setViewing(it)}
            onAdd={openAdd}
          />
        </TabsContent>

        {/* ─── Area Stores tab ─── */}
        <TabsContent value="area" className="mt-4">
          <AreaStoresTab />
        </TabsContent>
      </Tabs>

      {/* Add / Edit form */}
      <ItemFormDialog
        key={editing ? `edit-${editing.id}` : "new"}
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        zones={zones}
        onSaved={handleSaved}
      />

      {/* Bulk upload */}
      <BulkUploadDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        zones={zones}
        onDone={() => {
          refreshItems();
          refreshZones();
        }}
      />

      {/* View dialog */}
      <ViewItemDialog
        item={viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        onEdit={(it) => {
          setViewing(null);
          openEdit(it);
        }}
      />

      {/* Earmark item dialog */}
      <EarmarkItemDialog
        open={earmarkOpen}
        onOpenChange={setEarmarkOpen}
        storeItems={items}
      />

      {/* Earmarked items list dialog */}
      <EarmarkedItemsDialog
        open={earmarkListOpen}
        onOpenChange={setEarmarkListOpen}
      />

      {/* Item Code Master & Deduplication full-window */}
      <ItemCodeMasterWindow
        open={findCodeOpen}
        onOpenChange={setFindCodeOpen}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Zones tab — dashboard view with scaled tiles
// ────────────────────────────────────────────────────────────
interface ZonesTabProps {
  zones: StoreZone[] | null;
  loading: boolean;
  error: string | null;
  onZoneClick: (zoneName: string) => void;
}

function ZonesTab({ zones, loading, error, onZoneClick }: ZonesTabProps) {
  if (loading) return <LoadingState label="Loading zones..." />;
  if (error) return <ErrorState message={error} />;
  if (!zones || zones.length === 0)
    return (
      <EmptyState
        icon={Boxes}
        title="No zones configured"
        description="Store zones will appear here as tiles once data is seeded."
      />
    );

  const totalValue = zones.reduce((s, z) => s + z.totalValue, 0);
  const totalItems = zones.reduce((s, z) => s + z.itemCount, 0);
  const totalLow = zones.reduce((s, z) => s + z.lowStockCount, 0);

  return (
    <div>
      {/* Mini summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
            Total Stock Value
          </p>
          <p className="text-base sm:text-xl font-semibold text-foreground mt-1">
            {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
            Total Items
          </p>
          <p className="text-base sm:text-xl font-semibold text-foreground mt-1">
            {formatNumber(totalItems)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
            Low Stock Items
          </p>
          <p
            className={cn(
              "text-base sm:text-xl font-semibold mt-1",
              totalLow > 0 ? "text-amber-400" : "text-emerald-400"
            )}
          >
            {formatNumber(totalLow)}
          </p>
        </div>
      </div>

      {/* Tiles grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {zones.map((z) => {
          const status =
            z.lowStockCount >= 3
              ? "critical"
              : z.lowStockCount > 0
                ? "attention"
                : "healthy";
          const statusClasses =
            status === "critical"
              ? "border-red-500/40 hover:border-red-500/70"
              : status === "attention"
                ? "border-amber-500/40 hover:border-amber-500/70"
                : "border-emerald-500/30 hover:border-emerald-500/60";
          const minHeight = 120 + Math.min(z.totalValue / 100000, 80);

          return (
            <button
              key={z.id}
              onClick={() => onZoneClick(z.name)}
              style={{ minHeight }}
              className={cn(
                "group bg-card border rounded-xl p-4 sm:p-5 text-left transition-all flex flex-col justify-between",
                "hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5",
                statusClasses
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate text-sm sm:text-base">
                    {z.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {z.itemCount} items tracked
                  </p>
                </div>
                <CustomBadge
                  className={cn(
                    "border-0 shrink-0",
                    status === "critical" &&
                      "bg-red-500/15 text-red-400",
                    status === "attention" &&
                      "bg-amber-500/15 text-amber-400",
                    status === "healthy" &&
                      "bg-emerald-500/15 text-emerald-400"
                  )}
                >
                  {z.type}
                </CustomBadge>
              </div>

              {/* Value */}
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Stock Value
                </p>
                <p className="text-lg sm:text-2xl font-bold text-foreground">
                  {formatCurrency(z.totalValue)}
                </p>
              </div>

              {/* Status chips */}
              <div className="flex flex-wrap gap-1.5 mt-auto">
                <ZoneChip
                  label="Running out"
                  value={z.lowStockCount}
                  tone={z.lowStockCount > 0 ? "red" : "muted"}
                />
                <ZoneChip
                  label="Received"
                  value={z.recentReceipts}
                  tone={z.recentReceipts > 0 ? "green" : "muted"}
                />
                <ZoneChip
                  label="To collect"
                  value={z.pendingCollection}
                  tone={z.pendingCollection > 0 ? "blue" : "muted"}
                />
                <ZoneChip
                  label="Non-moving"
                  value={z.nonMovingCount}
                  tone={z.nonMovingCount > 0 ? "amber" : "muted"}
                />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Click a zone tile to drill into its detailed inventory.
      </p>
    </div>
  );
}

function ZoneChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "amber" | "green" | "blue" | "muted";
}) {
  const toneClasses = {
    red: "bg-red-500/10 text-red-400 border-red-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    muted: "bg-secondary/60 text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] sm:text-xs font-medium",
        toneClasses[tone]
      )}
    >
      <span className="opacity-80">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Stores tab — detailed inventory table
// ────────────────────────────────────────────────────────────
interface StoresTabProps {
  items: StoreItem[] | null;
  loading: boolean;
  error: string | null;
  zones: StoreZone[] | null;
  stats: { net: number; task: number; avail: number; team: number };
  category: string;
  setCategory: (c: string) => void;
  search: string;
  setSearch: (s: string) => void;
  zoneFilter: string;
  setZoneFilter: (z: string) => void;
  stockFilter: StockFilter;
  setStockFilter: (s: StockFilter) => void;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  setSortKey: (k: SortKey) => void;
  setSortDir: (d: "asc" | "desc") => void;
  toggleSort: (k: SortKey) => void;
  filtered: StoreItem[];
  pageItems: StoreItem[];
  safePage: number;
  totalPages: number;
  setPage: (p: number) => void;
  onEdit: (item: StoreItem) => void;
  onView: (item: StoreItem) => void;
  onAdd: () => void;
}

function StoresTab(props: StoresTabProps) {
  const {
    items,
    loading,
    error,
    zones,
    stats,
    category,
    setCategory,
    search,
    setSearch,
    zoneFilter,
    setZoneFilter,
    stockFilter,
    setStockFilter,
    sortKey,
    sortDir,
    setSortKey,
    setSortDir,
    toggleSort,
    filtered,
    pageItems,
    safePage,
    totalPages,
    setPage,
    onEdit,
    onView,
    onAdd,
  } = props;

  if (loading) return <LoadingState label="Loading store items..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Top stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Net Stock Value"
          value={formatCurrency(stats.net)}
          icon={TrendingUp}
          accent="blue"
          sub="Current inventory value"
        />
        <StatCard
          label="Total Items"
          value={stats.task}
          icon={Package}
          accent="amber"
          sub="Line items tracked"
        />
        <StatCard
          label="Available"
          value={stats.avail}
          icon={PackageCheck}
          accent="green"
          sub="Items in stock (qty > 0)"
        />
        <StatCard
          label="Low Stock"
          value={stats.team}
          icon={AlertTriangle}
          accent="red"
          sub="Need re-ordering"
        />
      </div>

      {/* Category tabs */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {STORE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors",
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by description..."
              className="pl-9 bg-background border-border"
            />
          </div>

          {/* Zone filter */}
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-background border-border">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {(zones ?? []).map((z) => (
                <SelectItem key={z.id} value={z.name}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stock filter */}
          <Select
            value={stockFilter}
            onValueChange={(v) => setStockFilter(v as StockFilter)}
          >
            <SelectTrigger className="w-full sm:w-40 bg-background border-border">
              <SelectValue placeholder="Stock level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
              <SelectItem value="over">Overstock</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="w-full sm:w-40 bg-background border-border">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="description">Description</SelectItem>
              <SelectItem value="qty">Quantity</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort direction toggle */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            title={sortDir === "asc" ? "Ascending" : "Descending"}
          >
            <span className="text-xs font-mono">
              {sortDir === "asc" ? "↑" : "↓"}
            </span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl">
        {!items || items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No store items yet"
            description="Add your first item to start tracking inventory."
            action={
              <Button onClick={onAdd} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No items match your filters"
            description="Try adjusting your search, category or stock-level filter."
          />
        ) : (
          <>
            <div className="max-h-[60vh] overflow-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort("description")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Description
                        {sortKey === "description" && (
                          <span className="text-primary">
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort("category")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Category
                        {sortKey === "category" && (
                          <span className="text-primary">
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </span>
                    </TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none"
                      onClick={() => toggleSort("qty")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Qty
                        {sortKey === "qty" && (
                          <span className="text-primary">
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </span>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none"
                      onClick={() => toggleSort("cost")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Cost
                        {sortKey === "cost" && (
                          <span className="text-primary">
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </span>
                    </TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((item) => {
                    const isLow =
                      item.minStock > 0 && item.qty <= item.minStock;
                    const isOut = item.qty <= 0;
                    return (
                      <TableRow
                        key={item.id}
                        className="border-border cursor-default"
                      >
                        <TableCell className="max-w-[260px]">
                          <div className="flex flex-col min-w-0">
                            <span className="text-foreground font-medium truncate">
                              {item.description}
                            </span>
                            {item.itemCode && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.itemCode}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CategoryBadge category={item.category} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-col items-end">
                            <span
                              className={cn(
                                "font-medium tabular-nums",
                                isOut
                                  ? "text-red-400"
                                  : isLow
                                    ? "text-amber-400"
                                    : "text-foreground"
                              )}
                            >
                              {formatNumber(item.qty)}
                            </span>
                            {isLow && !isOut && (
                              <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Low
                              </span>
                            )}
                            {isOut && (
                              <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Out
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-foreground tabular-nums">
                            {formatCurrency(item.totalCost)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            @{formatCurrency(item.unitCost)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CustomBadge className="bg-secondary/60 text-muted-foreground border-border">
                            <MapPin className="h-3 w-3 mr-1" />
                            {item.location || item.zoneName}
                          </CustomBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onView(item)}
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onEdit(item)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-3 p-3 border-t border-border flex-wrap">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="text-foreground font-medium">
                  {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="text-foreground font-medium">
                  {filtered.length}
                </span>{" "}
                items
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <span className="text-xs text-muted-foreground px-2 tabular-nums">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Add / Edit item form dialog
// ────────────────────────────────────────────────────────────
interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: StoreItem | null;
  zones: StoreZone[] | null;
  onSaved: () => void;
}

interface ItemForm {
  description: string;
  category: string;
  unit: string;
  qty: string;
  unitCost: string;
  location: string;
  minStock: string;
  maxStock: string;
  supplier: string;
  itemCode: string;
  ilmsCode: string;
  zoneName: string;
}

const DEFAULT_FORM: ItemForm = {
  description: "",
  category: "General",
  unit: "NOS",
  qty: "0",
  unitCost: "0",
  location: "",
  minStock: "0",
  maxStock: "0",
  supplier: "",
  itemCode: "",
  ilmsCode: "",
  zoneName: "Zone A",
};

function ItemFormDialog({
  open,
  onOpenChange,
  editing,
  zones,
  onSaved,
}: ItemFormDialogProps) {
  // Initialise from `editing` — parent remounts this component via `key`
  // whenever the editing target changes, so this initialiser runs fresh.
  const [form, setForm] = useState<ItemForm>(() =>
    editing
      ? {
          description: editing.description,
          category: editing.category,
          unit: editing.unit,
          qty: String(editing.qty ?? 0),
          unitCost: String(editing.unitCost ?? 0),
          location: editing.location ?? "",
          minStock: String(editing.minStock ?? 0),
          maxStock: String(editing.maxStock ?? 0),
          supplier: editing.supplier ?? "",
          itemCode: editing.itemCode ?? "",
          ilmsCode: editing.ilmsCode ?? "",
          zoneName: editing.zoneName,
        }
      : DEFAULT_FORM
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const qtyNum = Number(form.qty) || 0;
  const unitCostNum = Number(form.unitCost) || 0;
  const fileCost = qtyNum * unitCostNum;

  const set = (k: keyof ItemForm, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.description.trim()) {
      toast({
        title: "Description is required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload = {
      description: form.description.trim(),
      category: form.category,
      unit: form.unit || "NOS",
      qty: qtyNum,
      unitCost: unitCostNum,
      location: form.location.trim() || form.zoneName,
      minStock: Number(form.minStock) || 0,
      maxStock: Number(form.maxStock) || 0,
      supplier: form.supplier.trim() || null,
      itemCode: form.itemCode.trim() || null,
      ilmsCode: form.ilmsCode.trim() || null,
      zoneName: form.zoneName,
    };
    const res = editing
      ? await apiRequest(`/api/stores/${editing.id}`, "PUT", payload)
      : await apiRequest("/api/stores", "POST", payload);
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      toast({
        title: editing ? "Failed to update item" : "Failed to add item",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  const zoneOptions =
    zones && zones.length > 0
      ? zones.map((z) => z.name)
      : ZONES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {editing ? "Edit Store Item" : "Add Store Item"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details of this inventory item."
              : "Fill in the details to add a new item to the store."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>
              Description <span className="text-red-400">*</span>
            </Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Stainless Steel Bolt M12"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set("category", v)}
            >
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Unit (Deno)</Label>
            <Input
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="NOS, KG, MTR, SET..."
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.qty}
              onChange={(e) => set("qty", e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Unit Cost (Rs.)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.unitCost}
              onChange={(e) => set("unitCost", e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Total Cost (auto-calculated)</Label>
            <div className="h-9 px-3 rounded-md border border-border bg-secondary/40 flex items-center text-sm font-semibold text-foreground tabular-nums">
              {formatCurrency(fileCost)}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Min Stock</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.minStock}
              onChange={(e) => set("minStock", e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Max Stock</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.maxStock}
              onChange={(e) => set("maxStock", e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Aisle / Rack / Bin"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Zone</Label>
            <Select
              value={form.zoneName}
              onValueChange={(v) => set("zoneName", v)}
            >
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zoneOptions.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Input
              value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)}
              placeholder="Supplier name"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Item Code</Label>
            <Input
              value={form.itemCode}
              onChange={(e) => set("itemCode", e.target.value)}
              placeholder="Internal code"
              className="bg-background border-border"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>ILMS Code</Label>
            <Input
              value={form.ilmsCode}
              onChange={(e) => set("ilmsCode", e.target.value)}
              placeholder="Logistics Management System code (optional)"
              className="bg-background border-border"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save Changes" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Bulk upload dialog with CSV template & progress
// ────────────────────────────────────────────────────────────
interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  zones: StoreZone[] | null;
  onDone: () => void;
}

const BULK_COLUMNS = [
  "Description",
  "Category",
  "Unit",
  "Qty",
  "UnitCost",
  "Location",
  "MinStock",
  "MaxStock",
  "Supplier",
  "ItemCode",
] as const;

function downloadCSVTemplate() {
  const header = BULK_COLUMNS.join(",");
  const sample = [
    "Stainless Steel Bolt M12",
    "Metal",
    "NOS",
    "250",
    "45.50",
    "A1-Rack-3",
    "50",
    "500",
    "ABC Hardware",
    "ITM-0001",
  ].join(",");
  const sample2 = [
    "PVC Pipe 50mm",
    "Plumbing",
    "MTR",
    "120",
    "320",
    "B2-Rack-1",
    "30",
    "300",
    "PipeWorld Ltd",
    "ITM-0002",
  ].join(",");
  const csv = `${header}\n${sample}\n${sample2}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "store-items-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Simple RFC-4180-aware CSV parser
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (c === "\r") {
        // skip CR
      } else {
        cell += c;
      }
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function BulkUploadDialog({
  open,
  onOpenChange,
  zones,
  onDone,
}: BulkUploadDialogProps) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    errors: string[];
    successCount: number;
  }>({ done: 0, total: 0, errors: [], successCount: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setImporting(false);
    setProgress({ done: 0, total: 0, errors: [], successCount: 0 });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      toast({ title: "CSV is empty", variant: "destructive" });
      return;
    }
    // Detect header row
    const first = rows[0].map((c) => c.trim().toLowerCase());
    const hasHeader = first.includes("description");
    const dataRows = hasHeader ? rows.slice(1) : rows;
    if (dataRows.length === 0) {
      toast({ title: "No data rows found in CSV", variant: "destructive" });
      return;
    }

    const defaultZone =
      zones && zones.length > 0 ? zones[0].name : "Zone A";

    setImporting(true);
    setProgress({
      done: 0,
      total: dataRows.length,
      errors: [],
      successCount: 0,
    });

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const description = (r[0] ?? "").trim();
      if (!description) {
        errors.push(`Row ${i + (hasHeader ? 2 : 1)}: missing description`);
        setProgress({
          done: i + 1,
          total: dataRows.length,
          errors: [...errors],
          successCount,
        });
        continue;
      }
      const payload = {
        description,
        category: (r[1] ?? "General").trim() || "General",
        unit: (r[2] ?? "NOS").trim() || "NOS",
        qty: Number(r[3]) || 0,
        unitCost: Number(r[4]) || 0,
        location: (r[5] ?? "").trim() || defaultZone,
        minStock: Number(r[6]) || 0,
        maxStock: Number(r[7]) || 0,
        supplier: (r[8] ?? "").trim() || null,
        itemCode: (r[9] ?? "").trim() || null,
        zoneName: defaultZone,
      };
      const res = await apiRequest("/api/stores", "POST", payload);
      if (res.ok) {
        successCount++;
      } else {
        errors.push(
          `Row ${i + (hasHeader ? 2 : 1)} (${description}): ${res.error || "failed"}`
        );
      }
      setProgress({
        done: i + 1,
        total: dataRows.length,
        errors: [...errors],
        successCount,
      });
    }

    setImporting(false);
    if (successCount > 0) {
      toast({
        title: `Import complete — ${successCount} item${successCount === 1 ? "" : "s"} added`,
        description:
          errors.length > 0
            ? `${errors.length} row(s) failed. See details below.`
            : "All rows imported successfully.",
      });
      onDone();
    } else {
      toast({
        title: "No items imported",
        description: "All rows failed. Please review the CSV and try again.",
        variant: "destructive",
      });
    }
  };

  const pct =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!importing) {
          onOpenChange(o);
          if (!o) setTimeout(reset, 200);
        }
      }}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Upload Store Items
          </DialogTitle>
          <DialogDescription>
            Import multiple items at once using a CSV file. Download the
            template, fill in your data, and upload it back.
          </DialogDescription>
        </DialogHeader>

        {/* Template section */}
        <div className="space-y-3">
          <div className="bg-secondary/40 border border-border rounded-lg p-3">
            <p className="text-sm font-medium text-foreground mb-1">
              CSV Format
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Columns (in this exact order, header row optional):
            </p>
            <div className="flex flex-wrap gap-1">
              {BULK_COLUMNS.map((col, i) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono"
                >
                  <span className="text-muted-foreground">{i + 1}.</span>
                  {col}
                </span>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={downloadCSVTemplate}
            className="w-full gap-1.5"
            disabled={importing}
          >
            <Download className="h-4 w-4" /> Download CSV Template
          </Button>

          {/* File input */}
          <div className="space-y-1.5">
            <Label>Upload your CSV file</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="bg-background border-border"
            />
          </div>
        </div>

        {/* Progress */}
        {(importing || progress.done > 0) && (
          <div className="space-y-2 bg-secondary/40 border border-border rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {importing ? "Importing..." : "Import complete"}
              </span>
              <span className="font-medium text-foreground tabular-nums">
                {progress.done} / {progress.total} ({pct}%)
              </span>
            </div>
            <Progress value={pct} />
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-400">
                ✓ {progress.successCount} added
              </span>
              {progress.errors.length > 0 && (
                <span className="text-red-400">
                  ✗ {progress.errors.length} failed
                </span>
              )}
            </div>
            {progress.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto scrollbar-thin bg-background/50 border border-border rounded-md p-2 mt-2">
                <ul className="space-y-0.5">
                  {progress.errors.map((err, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-red-400 font-mono leading-relaxed"
                    >
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setTimeout(reset, 200);
            }}
            disabled={importing}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// View item dialog
// ────────────────────────────────────────────────────────────
interface ViewItemDialogProps {
  item: StoreItem | null;
  onOpenChange: (o: boolean) => void;
  onEdit: (item: StoreItem) => void;
}

function ViewItemDialog({ item, onOpenChange, onEdit }: ViewItemDialogProps) {
  const open = !!item;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Item Details
          </DialogTitle>
          <DialogDescription>
            Full inventory record for this store item.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-3 py-1">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="text-base font-semibold text-foreground">
                {item.description}
              </p>
              {item.itemCode && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Item Code: {item.itemCode}
                  {item.ilmsCode && ` · ILMS: ${item.ilmsCode}`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Category" value={item.category} />
              <DetailField label="Unit" value={item.unit} />
              <DetailField
                label="Quantity"
                value={formatNumber(item.qty)}
                tone={
                  item.qty <= 0
                    ? "red"
                    : item.minStock > 0 && item.qty <= item.minStock
                      ? "amber"
                      : "default"
                }
              />
              <DetailField
                label="Unit Cost"
                value={formatCurrency(item.unitCost)}
              />
              <DetailField
                label="Total Cost"
                value={formatCurrency(item.totalCost)}
                tone="primary"
              />
              <DetailField label="Min Stock" value={formatNumber(item.minStock)} />
              <DetailField label="Max Stock" value={formatNumber(item.maxStock)} />
              <DetailField label="Zone" value={item.zoneName} />
              <DetailField
                label="Location"
                value={item.location || "—"}
              />
              <DetailField
                label="Supplier"
                value={item.supplier || "—"}
              />
              <DetailField
                label="Last Movement"
                value={item.lastMovement || "—"}
              />
              <DetailField
                label="Created"
                value={new Date(item.createdAt).toLocaleDateString("en-GB")}
              />
            </div>

            {/* Stock status banner */}
            {item.minStock > 0 && item.qty <= item.minStock && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                  item.qty <= 0
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                )}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {item.qty <= 0
                    ? "This item is OUT OF STOCK."
                    : `Low stock — below minimum of ${formatNumber(item.minStock)} ${item.unit}.`}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {item && (
            <Button
              onClick={() => onEdit(item)}
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "red" | "amber";
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary font-semibold",
    red: "text-red-400 font-semibold",
    amber: "text-amber-400 font-semibold",
  };
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("text-sm mt-0.5", toneClass[tone])}>{value}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Earmark Item dialog — reserve materials for a project without a PR
// ────────────────────────────────────────────────────────────
interface EarmarkItemDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  storeItems: StoreItem[] | null;
}

const MANUAL_ENTRY = "__manual__";

function EarmarkItemDialog({
  open,
  onOpenChange,
  storeItems,
}: EarmarkItemDialogProps) {
  const { data: projects, loading: pLoading } = useFetch<ProjectOption[]>(
    open ? "/api/projects" : null
  );
  const [storeItemId, setStoreItemId] = useState<string>("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("NOS");
  const [authority, setAuthority] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setStoreItemId("");
    setItemDescription("");
    setItemCode("");
    setProjectId("");
    setProjectName("");
    setQty("");
    setUnit("NOS");
    setAuthority("");
    setRemarks("");
  };

  const onStoreItemSelect = (id: string) => {
    setStoreItemId(id);
    if (id === MANUAL_ENTRY) {
      setItemDescription("");
      setItemCode("");
      setUnit("NOS");
      return;
    }
    const it = (storeItems ?? []).find((i) => i.id === id);
    if (it) {
      setItemDescription(it.description);
      setItemCode(it.itemCode ?? "");
      setUnit(it.unit || "NOS");
    }
  };

  const onProjectSelect = (id: string) => {
    setProjectId(id);
    const p = (projects ?? []).find((x) => x.id === id);
    setProjectName(p ? p.name : "");
  };

  const submit = async () => {
    if (!itemDescription.trim()) {
      toast({ title: "Item description is required", variant: "destructive" });
      return;
    }
    if (!projectId) {
      toast({ title: "Project is required", variant: "destructive" });
      return;
    }
    if (!qty || Number(qty) <= 0) {
      toast({
        title: "Quantity must be greater than zero",
        variant: "destructive",
      });
      return;
    }
    if (!authority.trim()) {
      toast({ title: "Authority is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      storeItemId:
        storeItemId && storeItemId !== MANUAL_ENTRY ? storeItemId : null,
      itemDescription: itemDescription.trim(),
      itemCode: itemCode.trim() || null,
      projectId,
      projectName,
      qty: Number(qty),
      unit: unit || "NOS",
      authority: authority.trim(),
      remarks: remarks.trim() || null,
    };
    const res = await apiRequest("/api/earmarked", "POST", payload);
    setSaving(false);
    if (res.ok) {
      toast({
        title: "Item earmarked",
        description: `${itemDescription} → ${projectName}`,
      });
      reset();
      onOpenChange(false);
    } else {
      toast({
        title: "Failed to earmark item",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o && !saving) setTimeout(reset, 200);
      }}
    >
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" /> Earmark Item for Project
          </DialogTitle>
          <DialogDescription>
            Reserve materials for a project without a raised PR. The approving
            authority and remarks will be recorded against this earmark.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Select Store Item (optional)</Label>
            <Select value={storeItemId} onValueChange={onStoreItemSelect}>
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue placeholder="Pick an existing item — or enter manually" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL_ENTRY}>— Manual entry —</SelectItem>
                {(storeItems ?? []).map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.description}
                    {it.itemCode ? ` (${it.itemCode})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Selecting an item auto-fills description, code and unit.
            </p>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>
              Item Description <span className="text-red-400">*</span>
            </Label>
            <Input
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="e.g. GI Wire 14 SWG"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Item Code</Label>
            <Input
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="Auto-filled if item selected"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="NOS, KG, MTR..."
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Project <span className="text-red-400">*</span>
            </Label>
            <Select value={projectId} onValueChange={onProjectSelect}>
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue
                  placeholder={pLoading ? "Loading projects..." : "Select project"}
                />
              </SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.voteNumber ? ` — ${p.voteNumber}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Qty <span className="text-red-400">*</span>
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Authority <span className="text-red-400">*</span>
            </Label>
            <Input
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
              placeholder="Approving authority"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Project Name (auto)</Label>
            <Input
              value={projectName}
              readOnly
              placeholder="— select project —"
              className="bg-secondary/40 border-border text-muted-foreground"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional notes (optional)"
              className="bg-background border-border min-h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <BookmarkPlus className="h-4 w-4" /> Earmark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Earmarked Items dialog — list & delete earmarks
// ────────────────────────────────────────────────────────────
interface EarmarkedItemsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function EarmarkedItemsDialog({
  open,
  onOpenChange,
}: EarmarkedItemsDialogProps) {
  const { data, loading, error, refresh } = useFetch<EarmarkedItem[]>(
    open ? "/api/earmarked" : null
  );
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const res = await apiRequest(`/api/earmarked/${id}`, "DELETE");
    setDeleting(null);
    if (res.ok) {
      toast({ title: "Earmarked item removed" });
      refresh();
    } else {
      toast({
        title: "Failed to delete",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" /> Earmarked Items
          </DialogTitle>
          <DialogDescription>
            Materials reserved for projects without a raised PR.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {data ? `${data.length} earmarked` : "Loading..."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />{" "}
            Refresh
          </Button>
        </div>

        {loading ? (
          <LoadingState label="Loading earmarked items..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No earmarked items"
            description="Materials reserved for projects will appear here."
          />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-[60vh] overflow-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Item Description</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Authority</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((e) => (
                    <TableRow key={e.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {e.itemDescription}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {e.itemCode || "—"}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {e.projectName}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(e.qty)} {e.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.authority || "—"}
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground text-xs max-w-[220px] truncate"
                        title={e.remarks || ""}
                      >
                        {e.remarks || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          disabled={deleting === e.id}
                          onClick={() => handleDelete(e.id)}
                          title="Delete earmark"
                        >
                          {deleting === e.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Item Code Master & Deduplication — Full-Window overlay
// Replaces the small "Find Item Codes (AI)" dialog with a
// dedicated Item Master database view: browse, search, edit,
// run AI duplicate analysis, consolidate duplicates, and bulk
// upload new item codes.
// ────────────────────────────────────────────────────────────

interface ItemCodeMasterWindowProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const DUPLICATE_TYPE_LABELS: Record<string, string> = {
  multi_code_one_item: "Multiple Codes / One Item",
  same_name_diff_code: "Multiple Codes / One Item",
  same_code_diff_name: "Same Code / Different Items",
  near_duplicate: "Near Duplicate (AI)",
};

function ItemCodeMasterWindow({ open, onOpenChange }: ItemCodeMasterWindowProps) {
  const [activeTab, setActiveTab] = useState<
    "database" | "analysis" | "upload"
  >("database");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card shrink-0">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground text-base sm:text-lg truncate flex items-center gap-2">
                <Database className="h-5 w-5 text-primary shrink-0" />
                Item Code Master &amp; Deduplication
              </h2>
              <p className="text-xs text-muted-foreground">
                Identify duplicates &amp; consolidate to single canonical item codes
              </p>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="px-4 sm:px-6 flex items-center gap-1 border-t border-border overflow-x-auto scrollbar-thin">
          <WindowTabButton
            active={activeTab === "database"}
            onClick={() => setActiveTab("database")}
            icon={<Database className="h-3.5 w-3.5" />}
            label="Item Master Database"
          />
          <WindowTabButton
            active={activeTab === "analysis"}
            onClick={() => setActiveTab("analysis")}
            icon={<ScanSearch className="h-3.5 w-3.5" />}
            label="Duplicate Analysis (AI)"
            tone="amber"
          />
          <WindowTabButton
            active={activeTab === "upload"}
            onClick={() => setActiveTab("upload")}
            icon={<Upload className="h-3.5 w-3.5" />}
            label="Bulk Upload"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 sm:p-6">
          {activeTab === "database" && <ItemMasterDatabaseSection />}
          {activeTab === "analysis" && <DuplicateAnalysisSection />}
          {activeTab === "upload" && <BulkUploadItemMasterSection />}
        </div>
      </div>
    </div>
  );
}

function WindowTabButton({
  active,
  onClick,
  icon,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone?: "amber";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
        active
          ? tone === "amber"
            ? "border-amber-500 text-amber-400"
            : "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MiniStat({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("text-lg font-semibold mt-1 tabular-nums", tone)}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Section A — Item Master Database (browse, search, CRUD)
// ────────────────────────────────────────────────────────────
function ItemMasterDatabaseSection() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [editTarget, setEditTarget] = useState<ItemMasterRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Build query URL — empty params are omitted
  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("search", search.trim());
  if (category !== "all") queryParams.set("category", category);
  if (status !== "all") queryParams.set("status", status);
  const qs = queryParams.toString();
  const url = `/api/item-master${qs ? `?${qs}` : ""}`;

  const { data: items, loading, error, refresh } = useFetch<ItemMasterRecord[]>(url);
  const { toast } = useToast();

  const handleDelete = async (item: ItemMasterRecord) => {
    if (
      !confirm(
        `Delete "${item.canonicalCode}" — ${item.description}?\n\nThis cannot be undone.`
      )
    )
      return;
    setDeleting(item.id);
    const res = await apiRequest(`/api/item-master/${item.id}`, "DELETE");
    setDeleting(null);
    if (res.ok) {
      toast({
        title: "Item deleted",
        description: `${item.canonicalCode} removed from master`,
      });
      refresh();
    } else {
      toast({
        title: "Delete failed",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  const openAdd = () => {
    setEditTarget(null);
    setFormOpen(true);
  };
  const openEdit = (item: ItemMasterRecord) => {
    setEditTarget(item);
    setFormOpen(true);
  };
  const handleSaved = () => {
    setFormOpen(false);
    setEditTarget(null);
    refresh();
    toast({
      title: editTarget ? "Item updated" : "Item added",
      description: editTarget
        ? "Item master record has been updated."
        : "New canonical item created in master.",
    });
  };

  const activeCount = items?.filter((i) => i.status === "Active").length ?? 0;
  const mergedCount = items?.filter((i) => i.status === "Merged").length ?? 0;
  const discontinuedCount =
    items?.filter((i) => i.status === "Discontinued").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          label="Total Items"
          value={String(items?.length ?? 0)}
          tone="text-blue-400"
          sub="In current view"
        />
        <MiniStat
          label="Active"
          value={String(activeCount)}
          tone="text-emerald-400"
          sub="Canonical codes"
        />
        <MiniStat
          label="Merged"
          value={String(mergedCount)}
          tone="text-amber-400"
          sub="Consolidated"
        />
        <MiniStat
          label="Discontinued"
          value={String(discontinuedCount)}
          tone="text-red-400"
          sub="No longer in use"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, description, alternate codes/names..."
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {STORE_CATEGORIES.filter((c) => c !== "All").map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px] bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Merged">Merged</SelectItem>
            <SelectItem value="Discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={openAdd}
          size="sm"
          className="gap-1.5 ml-auto"
        >
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {loading ? (
          <LoadingState label="Loading item master..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : !items || items.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No item master entries"
            description="Add a new item manually or use the Bulk Upload tab to populate the master database."
            action={
              <Button onClick={openAdd} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            }
          />
        ) : (
          <div className="max-h-[62vh] overflow-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="min-w-[130px]">Canonical Code</TableHead>
                  <TableHead className="min-w-[220px]">Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="min-w-[140px]">Alternate Codes</TableHead>
                  <TableHead className="min-w-[140px]">Alternate Names</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell>
                      <span className="font-mono text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/30">
                        {item.canonicalCode}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground font-medium">
                        {item.description}
                      </div>
                      {item.mergedInto && (
                        <div className="text-[10px] text-amber-400 mt-0.5">
                          → merged into {item.mergedInto}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={item.category} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.unit}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.alternateCodes || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                      <div className="truncate" title={item.alternateNames || ""}>
                        {item.alternateNames || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CustomBadge className={itemMasterStatusColor(item.status)}>
                        {item.status}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(item)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          disabled={deleting === item.id}
                          onClick={() => handleDelete(item)}
                          title="Delete"
                        >
                          {deleting === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {items && items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {items.length} item(s) in master · Click edit to update canonical code,
          alternates or status.
        </p>
      )}

      <ItemMasterFormDialog
        key={editTarget ? `edit-${editTarget.id}` : "new"}
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditTarget(null);
        }}
        editing={editTarget}
        onSaved={handleSaved}
      />
    </div>
  );
}

// ─── Add / Edit Item Master dialog ───
interface ItemMasterFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ItemMasterRecord | null;
  onSaved: () => void;
}

interface ItemMasterForm {
  canonicalCode: string;
  description: string;
  category: string;
  unit: string;
  alternateCodes: string;
  alternateNames: string;
  status: string;
}

const DEFAULT_ITEM_MASTER_FORM: ItemMasterForm = {
  canonicalCode: "",
  description: "",
  category: "General",
  unit: "NOS",
  alternateCodes: "",
  alternateNames: "",
  status: "Active",
};

function ItemMasterFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: ItemMasterFormDialogProps) {
  const [form, setForm] = useState<ItemMasterForm>(() =>
    editing
      ? {
          canonicalCode: editing.canonicalCode,
          description: editing.description,
          category: editing.category || "General",
          unit: editing.unit || "NOS",
          alternateCodes: editing.alternateCodes ?? "",
          alternateNames: editing.alternateNames ?? "",
          status: editing.status || "Active",
        }
      : DEFAULT_ITEM_MASTER_FORM
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k: keyof ItemMasterForm, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.canonicalCode.trim()) {
      toast({ title: "Canonical code is required", variant: "destructive" });
      return;
    }
    if (!form.description.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      canonicalCode: form.canonicalCode.trim(),
      description: form.description.trim(),
      category: form.category,
      unit: form.unit || "NOS",
      alternateCodes: form.alternateCodes.trim() || null,
      alternateNames: form.alternateNames.trim() || null,
      status: form.status,
    };
    const res = editing
      ? await apiRequest(`/api/item-master/${editing.id}`, "PUT", payload)
      : await apiRequest("/api/item-master", "POST", payload);
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      toast({
        title: editing ? "Failed to update item" : "Failed to add item",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {editing ? "Edit Item Master" : "Add Item Master"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the canonical item record, alternate codes/names, or status."
              : "Create a new canonical item in the master database."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Canonical Code <span className="text-red-400">*</span>
            </Label>
            <Input
              value={form.canonicalCode}
              onChange={(e) => set("canonicalCode", e.target.value)}
              placeholder="e.g. ITM-0001"
              className="bg-background border-border font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Merged">Merged</SelectItem>
                <SelectItem value="Discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>
              Description <span className="text-red-400">*</span>
            </Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Stainless Steel Bolt M12"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="NOS, KG, MTR, SET..."
              className="bg-background border-border"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Alternate Codes (comma separated)</Label>
            <Input
              value={form.alternateCodes}
              onChange={(e) => set("alternateCodes", e.target.value)}
              placeholder="e.g. BMS-220A, BMS-220-OLD"
              className="bg-background border-border font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Other codes that refer to this same item (useful after merging).
            </p>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Alternate Names (comma separated)</Label>
            <Textarea
              value={form.alternateNames}
              onChange={(e) => set("alternateNames", e.target.value)}
              placeholder="e.g. SS Bolt M12, Stainless Bolt 12mm"
              className="bg-background border-border min-h-16"
            />
            <p className="text-[11px] text-muted-foreground">
              Other descriptions / names used for this same item.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save Changes" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Section B — Duplicate Analysis (AI)
// ────────────────────────────────────────────────────────────
function DuplicateAnalysisSection() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergingKey, setMergingKey] = useState<string | null>(null);
  // Per-group selection state keyed by stable group identifier
  const [selections, setSelections] = useState<
    Record<string, { canonicalId: string; mergeIds: Set<string> }>
  >({});
  const { toast } = useToast();

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setSelections({});
    const res = await apiRequest("/api/item-master/analyze", "POST");
    setAnalyzing(false);
    if (res.ok && res.data) {
      const data = res.data as AnalyzeResponse;
      setResult(data);
      // Auto-initialise selections for each group: first item-master item
      // becomes canonical; remaining item-master items default to merge targets
      const initSels: Record<string, { canonicalId: string; mergeIds: Set<string> }> = {};
      data.groups.forEach((g) => {
        const masterItems = g.items.filter((i) => i.source === "item-master");
        if (masterItems.length > 0) {
          const canonical = masterItems[0];
          const mergeIds = new Set<string>(
            masterItems
              .filter((i) => i.id !== canonical.id)
              .map((i) => i.id)
          );
          initSels[groupKey(g)] = { canonicalId: canonical.id, mergeIds };
        }
      });
      setSelections(initSels);
      toast({
        title: `Analysis complete — ${data.duplicatesFound} duplicate group(s)`,
        description: `Scanned ${data.totalScanned} entries across Item Master + Store Items.`,
      });
    } else {
      setError(res.error || "Analysis failed");
      toast({
        title: "Analysis failed",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  const setCanonical = (key: string, canonicalId: string) => {
    setSelections((prev) => {
      const cur =
        prev[key] ?? { canonicalId: "", mergeIds: new Set<string>() };
      // Remove the new canonical from the merge set if present
      const next = new Set(cur.mergeIds);
      next.delete(canonicalId);
      return { ...prev, [key]: { canonicalId, mergeIds: next } };
    });
  };

  const toggleMerge = (key: string, itemId: string) => {
    setSelections((prev) => {
      const cur =
        prev[key] ?? { canonicalId: "", mergeIds: new Set<string>() };
      if (cur.canonicalId === itemId) return prev; // can't merge the canonical
      const next = new Set(cur.mergeIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { ...prev, [key]: { canonicalId: cur.canonicalId, mergeIds: next } };
    });
  };

  const handleMerge = async (group: DuplicateGroup) => {
    const key = groupKey(group);
    const sel = selections[key];
    if (!sel || !sel.canonicalId) {
      toast({
        title: "Select a canonical item first",
        description: "Pick one row (radio) to keep as the canonical code.",
        variant: "destructive",
      });
      return;
    }
    const mergeIds = Array.from(sel.mergeIds).filter(
      (id) => id !== sel.canonicalId
    );
    if (mergeIds.length === 0) {
      toast({
        title: "Select at least one item to merge",
        description: "Tick the checkbox beside the rows you want to consolidate.",
        variant: "destructive",
      });
      return;
    }
    setMergingKey(key);
    const res = await apiRequest(
      `/api/item-master/${sel.canonicalId}/merge`,
      "POST",
      { canonicalId: sel.canonicalId, mergeIds }
    );
    setMergingKey(null);
    if (res.ok && res.data) {
      const data = res.data as MergeResponse;
      toast({
        title: `Merged ${data.mergedCount} item(s) into ${data.canonicalCode}`,
        description:
          "Merged records marked as Merged. Store items repointed to canonical code.",
      });
      // Remove this group from the result + clear its selection
      setResult((prev) =>
        prev
          ? {
              ...prev,
              groups: prev.groups.filter((g) => groupKey(g) !== key),
              duplicatesFound: Math.max(0, prev.duplicatesFound - 1),
            }
          : prev
      );
      setSelections((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    } else {
      toast({
        title: "Merge failed",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  const multiCodeCount =
    result?.groups.filter(
      (g) =>
        g.type === "multi_code_one_item" || g.type === "same_name_diff_code"
    ).length ?? 0;
  const sameCodeCount =
    result?.groups.filter((g) => g.type === "same_code_diff_name").length ?? 0;
  const nearDupCount =
    result?.groups.filter((g) => g.type === "near_duplicate").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Top action card */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" /> AI Duplicate Analysis
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Scans both the Item Master and Store Items tables to detect:
              <span className="text-amber-400 font-medium"> multiple codes / one item</span>,
              <span className="text-red-400 font-medium"> same code / different items</span>, and
              <span className="text-violet-400 font-medium"> near-duplicates (AI)</span>.
              Then consolidate them into a single canonical code.
            </p>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={analyzing}
            className="gap-1.5 shrink-0"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScanSearch className="h-4 w-4" />
            )}
            {analyzing ? "Analyzing..." : "Run Duplicate Analysis (AI)"}
          </Button>
        </div>

        {analyzing && (
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground bg-secondary/40 border border-border rounded-lg p-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            <span>
              Scanning database &amp; calling AI for near-duplicate detection —
              this can take 10–25 seconds...
            </span>
          </div>
        )}

        {error && !analyzing && (
          <div className="mt-4 flex items-start gap-2 text-sm bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Analysis failed</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
        )}

        {result && !analyzing && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat
              label="Entries Scanned"
              value={String(result.totalScanned)}
              tone="text-blue-400"
              sub="Master + Store"
            />
            <MiniStat
              label="Duplicate Groups"
              value={String(result.duplicatesFound)}
              tone="text-amber-400"
              sub="To review"
            />
            <MiniStat
              label="Multi-Code / One Item"
              value={String(multiCodeCount)}
              tone="text-amber-400"
              sub="Consolidate codes"
            />
            <MiniStat
              label="Same-Code / Near-Dup"
              value={String(sameCodeCount + nearDupCount)}
              tone="text-red-400"
              sub="Resolve conflicts"
            />
          </div>
        )}
      </div>

      {/* Groups list */}
      {result && !analyzing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Scanned {result.totalScanned} entries — found{" "}
              <span className="text-amber-400">{result.duplicatesFound}</span>{" "}
              duplicate group{result.duplicatesFound === 1 ? "" : "s"}
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={runAnalysis}
              disabled={analyzing}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Re-run Analysis
            </Button>
          </div>

          {result.groups.length === 0 ? (
            <EmptyState
              icon={Check}
              title="No duplicates found"
              description="The Item Master and Store Items are clean — no consolidation needed."
            />
          ) : (
            result.groups.map((group) => {
              const key = groupKey(group);
              const sel =
                selections[key] ?? {
                  canonicalId: "",
                  mergeIds: new Set<string>(),
                };
              const selectedMergeCount = Array.from(sel.mergeIds).filter(
                (id) => id !== sel.canonicalId
              ).length;
              const isMerging = mergingKey === key;
              const typeLabel =
                DUPLICATE_TYPE_LABELS[group.type] || group.type;
              const masterItems = group.items.filter(
                (i) => i.source === "item-master"
              );
              const canMerge =
                !!sel.canonicalId && selectedMergeCount > 0 && !isMerging;
              return (
                <div
                  key={key}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CustomBadge className={duplicateTypeColor(group.type)}>
                          {typeLabel}
                        </CustomBadge>
                        {group.canonicalCode && (
                          <span className="font-mono text-xs text-muted-foreground">
                            code: {group.canonicalCode}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {group.items.length} item(s) · {masterItems.length} in master
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-medium mt-1.5">
                        {group.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-amber-400 font-medium">
                          Recommendation:
                        </span>{" "}
                        {group.recommendation}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleMerge(group)}
                      disabled={!canMerge}
                      size="sm"
                      className="gap-1.5 shrink-0"
                    >
                      {isMerging ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GitMerge className="h-3.5 w-3.5" />
                      )}
                      Merge Selected
                      {selectedMergeCount > 0 && ` (${selectedMergeCount})`}
                    </Button>
                  </div>

                  {/* Items list with radio + checkboxes */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="max-h-[40vh] overflow-auto scrollbar-thin">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-card">
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="w-12 text-center">Keep</TableHead>
                            <TableHead className="w-12 text-center">Merge</TableHead>
                            <TableHead className="min-w-[130px]">Code</TableHead>
                            <TableHead className="min-w-[200px]">Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Zone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((it) => {
                            const isCanonical = sel.canonicalId === it.id;
                            const isMerge = sel.mergeIds.has(it.id);
                            const isMaster = it.source === "item-master";
                            return (
                              <TableRow
                                key={`${it.source}-${it.id}`}
                                className={cn(
                                  "border-border",
                                  isCanonical && "bg-primary/[0.06]",
                                  !isMaster && "opacity-80"
                                )}
                              >
                                <TableCell className="text-center">
                                  <input
                                    type="radio"
                                    name={`canonical-${key}`}
                                    checked={isCanonical}
                                    onChange={() => setCanonical(key, it.id)}
                                    disabled={!isMaster}
                                    className="h-4 w-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                                    title={
                                      isMaster
                                        ? "Set as canonical (kept)"
                                        : "Store items cannot be canonical — create a master record first"
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={isMerge}
                                    onCheckedChange={() =>
                                      toggleMerge(key, it.id)
                                    }
                                    disabled={!isMaster || isCanonical}
                                    className="cursor-pointer"
                                  />
                                </TableCell>
                                <TableCell>
                                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                                    {it.canonicalCode}
                                  </span>
                                </TableCell>
                                <TableCell className="text-foreground">
                                  {it.description}
                                </TableCell>
                                <TableCell>
                                  <CategoryBadge category={it.category} />
                                </TableCell>
                                <TableCell>
                                  <CustomBadge
                                    className={
                                      it.source === "item-master"
                                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                        : "bg-violet-500/15 text-violet-400 border-violet-500/30"
                                    }
                                  >
                                    {it.source === "item-master"
                                      ? "Master"
                                      : "Store"}
                                  </CustomBadge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {it.zoneName || "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Pick one row as{" "}
                    <span className="text-primary font-medium">canonical</span>{" "}
                    (radio — only item-master rows can be canonical), then tick
                    the rows to{" "}
                    <span className="text-amber-400 font-medium">merge</span>{" "}
                    into it. Merged records get{" "}
                    <code className="font-mono">status=Merged</code> and store
                    items referencing the merged codes are auto-repointed to the
                    canonical code.
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      {!result && !analyzing && !error && (
        <EmptyState
          icon={ScanSearch}
          title="No analysis yet"
          description="Click 'Run Duplicate Analysis (AI)' above to scan the Item Master and Store Items for duplicates and consolidate them."
        />
      )}
    </div>
  );
}

// Stable identifier for a duplicate group (concatenation of all item IDs)
function groupKey(g: DuplicateGroup): string {
  return g.items
    .map((i) => `${i.source}-${i.id}`)
    .sort()
    .join("|");
}

// ────────────────────────────────────────────────────────────
// Section C — Bulk Upload (item code + description)
// ────────────────────────────────────────────────────────────
interface BulkUploadItemMasterRow {
  canonicalCode: string;
  description: string;
  category: string;
  unit: string;
}

const BULK_ITEM_MASTER_COLUMNS = [
  "ItemCode",
  "Description",
  "Category",
  "Unit",
] as const;

const EMPTY_BULK_ROW: BulkUploadItemMasterRow = {
  canonicalCode: "",
  description: "",
  category: "General",
  unit: "NOS",
};

function downloadItemMasterTemplate() {
  const header = BULK_ITEM_MASTER_COLUMNS.join(",");
  const sample1 = ["ITM-0001", "Stainless Steel Bolt M12", "Metal", "NOS"].join(
    ","
  );
  const sample2 = ["PL-050", 'PVC Pipe 50mm 1"', "Plumbing", "MTR"].join(",");
  const csv = `${header}\n${sample1}\n${sample2}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "item-master-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function BulkUploadItemMasterSection() {
  const [rows, setRows] = useState<BulkUploadItemMasterRow[]>([
    { ...EMPTY_BULK_ROW },
  ]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    successCount: number;
    errors: string[];
  }>({ done: 0, total: 0, successCount: 0, errors: [] });
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setRows([{ ...EMPTY_BULK_ROW }]);
    setImporting(false);
    setProgress({ done: 0, total: 0, successCount: 0, errors: [] });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      toast({ title: "CSV is empty", variant: "destructive" });
      return;
    }
    const first = parsed[0].map((c) => c.trim().toLowerCase());
    const hasHeader =
      first.includes("itemcode") || first.includes("description");
    const dataRows = hasHeader ? parsed.slice(1) : parsed;
    if (dataRows.length === 0) {
      toast({
        title: "No data rows found in CSV",
        variant: "destructive",
      });
      return;
    }
    setRows(
      dataRows.map((r) => ({
        canonicalCode: (r[0] ?? "").trim(),
        description: (r[1] ?? "").trim(),
        category: (r[2] ?? "General").trim() || "General",
        unit: (r[3] ?? "NOS").trim() || "NOS",
      }))
    );
    toast({
      title: `Loaded ${dataRows.length} rows from CSV`,
      description: "Review and edit before importing.",
    });
  };

  const addRow = () =>
    setRows((r) => [...r, { ...EMPTY_BULK_ROW }]);

  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));

  const updateRow = (i: number, patch: Partial<BulkUploadItemMasterRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const validRows = rows.filter(
    (r) => r.canonicalCode.trim() && r.description.trim()
  );

  const doImport = async () => {
    if (validRows.length === 0) {
      toast({
        title: "No valid rows to import",
        description: "Each row needs at least ItemCode + Description.",
        variant: "destructive",
      });
      return;
    }
    setImporting(true);
    setProgress({
      done: 0,
      total: validRows.length,
      successCount: 0,
      errors: [],
    });

    const payload = validRows.map((r) => ({
      canonicalCode: r.canonicalCode.trim(),
      description: r.description.trim(),
      category: r.category || "General",
      unit: r.unit || "NOS",
    }));
    const res = await apiRequest("/api/item-master", "POST", payload);
    setImporting(false);

    if (res.ok) {
      // createMany returns {count}; skipDuplicates → some rows may be skipped
      const created =
        typeof res.data?.count === "number"
          ? res.data.count
          : validRows.length;
      const skipped = Math.max(0, validRows.length - created);
      setProgress({
        done: validRows.length,
        total: validRows.length,
        successCount: created,
        errors:
          skipped > 0
            ? [`${skipped} duplicate code(s) skipped (already exist in master)`]
            : [],
      });
      toast({
        title: `Import complete — ${created} item(s) added`,
        description:
          skipped > 0
            ? `${skipped} duplicate code(s) were skipped (skipDuplicates=true).`
            : "All rows imported successfully.",
      });
      // Clear rows after successful import
      setRows([{ ...EMPTY_BULK_ROW }]);
      if (fileRef.current) fileRef.current.value = "";
    } else {
      setProgress({
        done: 0,
        total: validRows.length,
        successCount: 0,
        errors: [res.error || "Import failed"],
      });
      toast({
        title: "Import failed",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  const pct =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Top intro card */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Bulk Upload Item Master
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Import item codes + descriptions in bulk. Download the CSV template,
          fill it in (or add rows manually below), then click Import. Duplicate
          codes already in the master are skipped automatically.
        </p>

        {/* Template format + download + file input */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-secondary/40 border border-border rounded-lg p-3">
            <p className="text-sm font-medium text-foreground mb-1">
              CSV Format
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Columns (in this exact order, header row optional):
            </p>
            <div className="flex flex-wrap gap-1">
              {BULK_ITEM_MASTER_COLUMNS.map((col, i) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono"
                >
                  <span className="text-muted-foreground">{i + 1}.</span>
                  {col}
                </span>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={downloadItemMasterTemplate}
              className="w-full mt-3 gap-1.5"
              disabled={importing}
            >
              <Download className="h-4 w-4" /> Download CSV Template
            </Button>
          </div>

          <div className="bg-secondary/40 border border-border rounded-lg p-3 space-y-2">
            <Label>Upload CSV file</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="bg-background border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              File will be parsed and previewed below — you can edit rows before
              importing.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={importing}
              className="gap-1.5 w-full"
            >
              <Plus className="h-3.5 w-3.5" /> Add Manual Row
            </Button>
          </div>
        </div>
      </div>

      {/* Preview / edit table */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-3 border-b border-border flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium tabular-nums">
              {rows.length}
            </span>{" "}
            row(s) ·{" "}
            <span className="text-emerald-400 font-medium tabular-nums">
              {validRows.length}
            </span>{" "}
            valid
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={importing}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button
              onClick={doImport}
              disabled={importing || validRows.length === 0}
              size="sm"
              className="gap-1.5"
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Import
              {validRows.length > 0 && ` (${validRows.length})`}
            </Button>
          </div>
        </div>
        <div className="max-h-[50vh] overflow-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead className="min-w-[150px]">
                  Item Code <span className="text-red-400">*</span>
                </TableHead>
                <TableHead className="min-w-[240px]">
                  Description <span className="text-red-400">*</span>
                </TableHead>
                <TableHead className="w-40">Category</TableHead>
                <TableHead className="w-24">Unit</TableHead>
                <TableHead className="w-12 text-center">Del</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={6}
                    className="text-center text-xs text-muted-foreground py-4"
                  >
                    No rows. Click &quot;Add Manual Row&quot; or upload a CSV.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, i) => {
                  const valid =
                    !!row.canonicalCode.trim() && !!row.description.trim();
                  return (
                    <TableRow
                      key={i}
                      className={cn(
                        "border-border",
                        !valid && "bg-red-500/[0.04]"
                      )}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.canonicalCode}
                          onChange={(e) =>
                            updateRow(i, { canonicalCode: e.target.value })
                          }
                          placeholder="ITM-0001"
                          className="bg-background border-border h-8 font-mono text-xs"
                          disabled={importing}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.description}
                          onChange={(e) =>
                            updateRow(i, { description: e.target.value })
                          }
                          placeholder="Item description"
                          className="bg-background border-border h-8"
                          disabled={importing}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.category}
                          onValueChange={(v) => updateRow(i, { category: v })}
                        >
                          <SelectTrigger className="bg-background border-border h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FILE_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.unit}
                          onChange={(e) =>
                            updateRow(i, { unit: e.target.value })
                          }
                          placeholder="NOS"
                          className="bg-background border-border h-8 text-xs"
                          disabled={importing}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => removeRow(i)}
                          disabled={importing || rows.length === 1}
                          title="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Progress / result */}
      {(importing || progress.done > 0) && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {importing ? "Importing..." : "Import complete"}
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {progress.done} / {progress.total} ({pct}%)
            </span>
          </div>
          <Progress value={pct} />
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-400">
              ✓ {progress.successCount} added
            </span>
            {progress.errors.length > 0 && (
              <span className="text-red-400">
                ✗ {progress.errors.length} issue(s)
              </span>
            )}
          </div>
          {progress.errors.length > 0 && (
            <div className="max-h-32 overflow-y-auto scrollbar-thin bg-background/50 border border-border rounded-md p-2 mt-2">
              <ul className="space-y-0.5">
                {progress.errors.map((err, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-red-400 font-mono leading-relaxed"
                  >
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Area Stores tab — CSLOG area store oncharge/off-charge records
// ────────────────────────────────────────────────────────────
function recordTypeColor(type: string): string {
  switch (type) {
    case "Oncharge":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "OffCharge":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

function AreaStoresTab() {
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [recordTypeFilter, setRecordTypeFilter] =
    useState<AreaRecordTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AreaStoreRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Build URL with server-side filter params (storeName, recordType, search)
  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (storeFilter !== "all") params.set("storeName", storeFilter);
    if (recordTypeFilter !== "all") params.set("recordType", recordTypeFilter);
    const s = search.trim();
    if (s) params.set("search", s);
    const q = params.toString();
    return q ? `/api/area-stores?${q}` : "/api/area-stores";
  }, [storeFilter, recordTypeFilter, search]);

  const {
    data,
    loading,
    error,
    refresh,
  } = useFetch<AreaStoreRecord[]>(url);

  // Fetch ALL records (unfiltered) to compute per-area-store summary tiles
  const { data: allRecords } = useFetch<AreaStoreRecord[]>("/api/area-stores");

  // Per-area-store aggregates (always across ALL records)
  const storeSummaries = useMemo(() => {
    const map: Record<
      string,
      { onchargeValue: number; offChargeValue: number; itemCount: number }
    > = {};
    for (const store of AREA_STORES) {
      map[store] = { onchargeValue: 0, offChargeValue: 0, itemCount: 0 };
    }
    for (const r of allRecords ?? []) {
      if (!map[r.storeName]) {
        map[r.storeName] = { onchargeValue: 0, offChargeValue: 0, itemCount: 0 };
      }
      if (r.recordType === "Oncharge") map[r.storeName].onchargeValue += r.totalCost;
      else if (r.recordType === "OffCharge")
        map[r.storeName].offChargeValue += r.totalCost;
      map[r.storeName].itemCount += 1;
    }
    return map;
  }, [allRecords]);

  const filtered = useMemo(() => data ?? [], [data]);

  const totals = useMemo(() => {
    const onchargeValue = filtered
      .filter((r) => r.recordType === "Oncharge")
      .reduce((s, r) => s + r.totalCost, 0);
    const offChargeValue = filtered
      .filter((r) => r.recordType === "OffCharge")
      .reduce((s, r) => s + r.totalCost, 0);
    return {
      onchargeValue,
      offChargeValue,
      netValue: onchargeValue - offChargeValue,
      count: filtered.length,
    };
  }, [filtered]);

  function exportCSV() {
    const rows: string[][] = [
      [
        "Item Code",
        "Description",
        "Category",
        "Qty",
        "Unit",
        "Unit Cost",
        "Total Cost",
        "Record Type",
        "NAV Reference",
        "File Number",
        "Location",
        "Date",
      ],
    ];
    for (const r of filtered) {
      rows.push([
        r.itemCode ?? "",
        r.itemName,
        r.category,
        String(r.qty),
        r.unit,
        String(r.unitCost),
        String(r.totalCost),
        r.recordType,
        r.navReference ?? "",
        r.fileNumber ?? "",
        r.location ?? "",
        r.date ?? "",
      ]);
    }
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const needsQuote = /[",\n]/.test(cell);
            const escaped = cell.replace(/"/g, '""');
            return needsQuote ? `"${escaped}"` : escaped;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    const fileName =
      storeFilter !== "all"
        ? `area-store-${storeFilter.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${today}.csv`
        : `area-stores-${today}.csv`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Export complete",
      description: `${filtered.length} record(s) exported to ${fileName}`,
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiRequest(`/api/area-stores/${deleteTarget.id}`, "DELETE");
    setDeleting(false);
    if (res.ok) {
      toast({ title: "Record deleted", description: deleteTarget.itemName });
      setDeleteTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  if (loading) return <LoadingState label="Loading area store records..." />;
  if (error) return <ErrorState message={error} />;

  const filtersActive =
    storeFilter !== "all" || recordTypeFilter !== "all" || search !== "";

  return (
    <div className="space-y-4">
      {/* Header strip with explanation */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Area Stores{" "}
              <span className="text-muted-foreground font-normal">
                — CSLOG stores with oncharge/off-charge tracking
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Area stores belong to CSLOG but records are kept here for easy
              management. Items are received into area stores via QCI (Oncharge —
              NAV 251) and transferred to Stores locations (Off-charge — NAV 255).
            </p>
          </div>
        </div>
      </div>

      {/* Summary tiles per area store (clickable filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {AREA_STORES.map((store) => {
          const s = storeSummaries[store] ?? {
            onchargeValue: 0,
            offChargeValue: 0,
            itemCount: 0,
          };
          const isActive = storeFilter === store;
          return (
            <button
              key={store}
              onClick={() => setStoreFilter(isActive ? "all" : store)}
              className={cn(
                "bg-card border rounded-xl p-3 text-left transition-all hover:shadow-md hover:shadow-black/20 hover:-translate-y-0.5",
                isActive ? "border-primary ring-1 ring-primary/30" : "border-border"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-foreground truncate">
                  {store}
                </p>
                <CustomBadge className="bg-secondary/60 text-muted-foreground border-border text-[10px] px-1.5 py-0">
                  {s.itemCount}
                </CustomBadge>
              </div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Oncharge
              </p>
              <p className="text-xs font-semibold text-emerald-400 tabular-nums mb-1">
                {formatCurrency(s.onchargeValue)}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Off-charge
              </p>
              <p className="text-xs font-semibold text-blue-400 tabular-nums">
                {formatCurrency(s.offChargeValue)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Aggregate stats for current filter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Oncharge Value"
          value={formatCurrency(totals.onchargeValue)}
          icon={ArrowDownToLine}
          accent="green"
          sub="NAV 251 — received via QCI"
        />
        <StatCard
          label="Off-charge Value"
          value={formatCurrency(totals.offChargeValue)}
          icon={ArrowUpFromLine}
          accent="blue"
          sub="NAV 255 — transferred to Stores"
        />
        <StatCard
          label="Net Stock Value"
          value={formatCurrency(totals.netValue)}
          icon={TrendingUp}
          accent="amber"
          sub="Oncharge − Off-charge"
        />
        <StatCard
          label="Records"
          value={totals.count}
          icon={FileText}
          accent="purple"
          sub="Filtered records"
        />
      </div>

      {/* Filter toolbar */}
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item name..."
              className="pl-9 bg-background border-border"
            />
          </div>
          <Select
            value={recordTypeFilter}
            onValueChange={(v) =>
              setRecordTypeFilter(v as AreaRecordTypeFilter)
            }
          >
            <SelectTrigger className="w-full sm:w-44 bg-background border-border">
              <SelectValue placeholder="Record type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="Oncharge">Oncharge (NAV 251)</SelectItem>
              <SelectItem value="OffCharge">Off-charge (NAV 255)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-background border-border">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="All stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Area Stores</SelectItem>
              {AREA_STORES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStoreFilter("all");
                setRecordTypeFilter("all");
                setSearch("");
              }}
              className="h-9"
            >
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="h-9 gap-1.5"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            size="sm"
            className="h-9 gap-1.5 sm:ml-auto"
          >
            <Plus className="h-4 w-4" /> Add Record
          </Button>
        </div>
      </div>

      {/* Records table */}
      <div className="bg-card border border-border rounded-xl">
        {!filtered.length ? (
          <EmptyState
            icon={Store}
            title="No area store records"
            description="No records match your filters. Add a record or clear the filters."
            action={
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Record
              </Button>
            }
          />
        ) : (
          <div className="max-h-[60vh] overflow-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="min-w-[180px]">Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead>Record Type</TableHead>
                  <TableHead>NAV Ref</TableHead>
                  <TableHead>File Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="min-w-[160px]">Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="text-foreground font-medium truncate">
                          {r.itemName}
                        </span>
                        {r.itemCode && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {r.itemCode}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={r.category} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {formatNumber(r.qty)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCurrency(r.unitCost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-foreground">
                      {formatCurrency(r.totalCost)}
                    </TableCell>
                    <TableCell>
                      <CustomBadge className={recordTypeColor(r.recordType)}>
                        {r.recordType === "OffCharge"
                          ? "Off-charge"
                          : r.recordType}
                      </CustomBadge>
                    </TableCell>
                    <TableCell>
                      {r.navReference ? (
                        <CustomBadge className={navRefColor(r.navReference)}>
                          {r.navReference}
                        </CustomBadge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {r.fileNumber || "—"}
                    </TableCell>
                    <TableCell>
                      <CustomBadge className="bg-secondary/60 text-muted-foreground border-border">
                        <MapPin className="h-3 w-3 mr-1" />
                        {r.location || "—"}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {r.date || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px]">
                      <span className="line-clamp-2">
                        {r.remarks || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => setDeleteTarget(r)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add record dialog */}
      {addOpen && (
        <AreaStoreRecordFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete area store record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the record for{" "}
              <span className="text-foreground font-medium">
                {deleteTarget?.itemName}
              </span>{" "}
              ({deleteTarget?.recordType}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Area Store Record Form (Add)
// ────────────────────────────────────────────────────────────
interface AreaStoreRecordFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

interface AreaStoreRecordForm {
  storeName: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  qty: string;
  unitCost: string;
  recordType: "Oncharge" | "OffCharge";
  navReference: "NAV 251" | "NAV 255";
  fileNumber: string;
  location: string;
  date: string;
  remarks: string;
}

const DEFAULT_AREA_FORM: AreaStoreRecordForm = {
  storeName: "BMS",
  itemCode: "",
  itemName: "",
  category: "BMS",
  unit: "NOS",
  qty: "0",
  unitCost: "0",
  recordType: "Oncharge",
  navReference: "NAV 251",
  fileNumber: "",
  location: "",
  date: new Date().toISOString().slice(0, 10),
  remarks: "",
};

function AreaStoreRecordFormDialog({
  open,
  onOpenChange,
  onSaved,
}: AreaStoreRecordFormProps) {
  const [form, setForm] = useState<AreaStoreRecordForm>(DEFAULT_AREA_FORM);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const qtyNum = Number(form.qty) || 0;
  const unitCostNum = Number(form.unitCost) || 0;
  const totalCost = qtyNum * unitCostNum;

  const set = <K extends keyof AreaStoreRecordForm>(
    k: K,
    v: AreaStoreRecordForm[K]
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  function onStoreChange(store: string) {
    const cats = AREA_STORE_CATEGORIES[store] ?? ["General"];
    setForm((prev) => ({
      ...prev,
      storeName: store,
      category: cats[0] ?? "General",
    }));
  }

  function onRecordTypeChange(rt: "Oncharge" | "OffCharge") {
    // NAV ref follows record type: Oncharge → NAV 251, Off-charge → NAV 255
    setForm((prev) => ({
      ...prev,
      recordType: rt,
      navReference: rt === "Oncharge" ? "NAV 251" : "NAV 255",
    }));
  }

  async function submit() {
    if (!form.itemName.trim()) {
      toast({ title: "Item name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      storeName: form.storeName,
      itemCode: form.itemCode.trim() || null,
      itemName: form.itemName.trim(),
      category: form.category,
      unit: form.unit || "NOS",
      qty: qtyNum,
      unitCost: unitCostNum,
      recordType: form.recordType,
      navReference: form.navReference,
      fileNumber: form.fileNumber.trim() || null,
      location: form.location.trim() || null,
      date: form.date || new Date().toISOString().slice(0, 10),
      remarks: form.remarks.trim() || null,
    };
    const res = await apiRequest("/api/area-stores", "POST", payload);
    setSaving(false);
    if (res.ok) {
      toast({
        title: "Record added",
        description: `${payload.itemName} (${payload.recordType})`,
      });
      onSaved();
    } else {
      toast({
        title: "Failed to add record",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  const categoryOptions =
    AREA_STORE_CATEGORIES[form.storeName] ?? FILE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Add Area Store Record
          </DialogTitle>
          <DialogDescription>
            Record items received into an area store (Oncharge — NAV 251) or
            transferred to Stores locations (Off-charge — NAV 255).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Area Store <span className="text-red-400">*</span>
            </Label>
            <Select value={form.storeName} onValueChange={onStoreChange}>
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AREA_STORES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Record Type <span className="text-red-400">*</span>
            </Label>
            <Select
              value={form.recordType}
              onValueChange={(v) =>
                onRecordTypeChange(v as "Oncharge" | "OffCharge")
              }
            >
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oncharge">
                  Oncharge (received via QCI)
                </SelectItem>
                <SelectItem value="OffCharge">
                  Off-charge (transferred to Stores)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              NAV Reference <span className="text-red-400">*</span>
            </Label>
            <Select
              value={form.navReference}
              onValueChange={(v) =>
                set("navReference", v as "NAV 251" | "NAV 255")
              }
            >
              <SelectTrigger className="bg-background border-border w-full">
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

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set("category", v)}
            >
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>
              Item Name <span className="text-red-400">*</span>
            </Label>
            <Input
              value={form.itemName}
              onChange={(e) => set("itemName", e.target.value)}
              placeholder="e.g. Centrifugal Pump 15kW"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Item Code</Label>
            <Input
              value={form.itemCode}
              onChange={(e) => set("itemCode", e.target.value)}
              placeholder="e.g. BMS-220"
              className="bg-background border-border font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="NOS, KG, MTR..."
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.qty}
              onChange={(e) => set("qty", e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Unit Cost (Rs.)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={form.unitCost}
              onChange={(e) => set("unitCost", e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Total Cost (auto-calculated)</Label>
            <div className="h-9 px-3 rounded-md border border-border bg-secondary/40 flex items-center text-sm font-semibold text-foreground tabular-nums">
              {formatCurrency(totalCost)}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>File Number</Label>
            <Input
              value={form.fileNumber}
              onChange={(e) => set("fileNumber", e.target.value)}
              placeholder="e.g. FILE/2025-001"
              className="bg-background border-border font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. BMS Store, Zone D..."
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              placeholder="Optional notes"
              className="bg-background border-border min-h-[38px]"
              rows={1}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
