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
} from "lucide-react";
import {
  formatCurrency,
  formatNumber,
  STORE_CATEGORIES,
  FILE_CATEGORIES,
  ZONES,
  confidenceColor,
} from "@/lib/constants";
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

type StockFilter = "all" | "in" | "low" | "out" | "over";
type SortKey = "description" | "qty" | "cost" | "category";

const PAGE_SIZE = 25;

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
export function StoresModule() {
  const [tab, setTab] = useState<"zones" | "stores">("zones");

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
        onValueChange={(v) => setTab(v as "zones" | "stores")}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="zones" className="gap-1.5">
            <Boxes className="h-4 w-4" /> Zones
          </TabsTrigger>
          <TabsTrigger value="stores" className="gap-1.5">
            <Package className="h-4 w-4" /> Stores
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

      {/* AI item code finder dialog */}
      <FindItemCodeDialog
        open={findCodeOpen}
        onOpenChange={setFindCodeOpen}
        storeItems={items}
        onApplied={() => {
          refreshItems();
          refreshZones();
        }}
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
// AI Item Code Finder dialog — bulk find/assign item codes
// ────────────────────────────────────────────────────────────
interface FindItemCodeDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  storeItems: StoreItem[] | null;
  onApplied: () => void;
}

const EMPTY_CANDIDATE: FindCodeCandidate = {
  storeItemId: null,
  description: "",
  category: "General",
  unit: "NOS",
  cost: 0,
};

function FindItemCodeDialog({
  open,
  onOpenChange,
  storeItems,
  onApplied,
}: FindItemCodeDialogProps) {
  const [rows, setRows] = useState<FindCodeCandidate[]>([
    { ...EMPTY_CANDIDATE },
  ]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<
    { candidate: FindCodeCandidate; result: FindCodeResult }[] | null
  >(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const reset = () => {
    setRows([{ ...EMPTY_CANDIDATE }]);
    setResults(null);
    setAppliedIds(new Set());
    setApplying(null);
    setRunning(false);
  };

  const loadFromStore = () => {
    if (!storeItems || storeItems.length === 0) {
      toast({
        title: "No store items available",
        description: "Add items to the store first.",
        variant: "destructive",
      });
      return;
    }
    setRows(
      storeItems.map((it) => ({
        storeItemId: it.id,
        description: it.description,
        category: it.category || "General",
        unit: it.unit || "NOS",
        cost: it.unitCost || 0,
      }))
    );
    setResults(null);
    setAppliedIds(new Set());
    toast({
      title: `Loaded ${storeItems.length} store items`,
      description: "Review the rows and run AI matching.",
    });
  };

  const addRow = () =>
    setRows((r) => [...r, { ...EMPTY_CANDIDATE }]);

  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));

  const updateRow = (i: number, patch: Partial<FindCodeCandidate>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const hasValidRow = rows.some((r) => r.description.trim() !== "");

  const runAI = async () => {
    const valid = rows.filter((r) => r.description.trim() !== "");
    if (valid.length === 0) {
      toast({
        title: "Add at least one item with a description",
        variant: "destructive",
      });
      return;
    }
    setRunning(true);
    setResults(null);
    const payload = valid.map((r) => ({
      description: r.description.trim(),
      category: r.category || "General",
      unit: r.unit || "NOS",
      cost: Number(r.cost) || 0,
    }));
    const res = await apiRequest("/api/stores/find-code", "POST", payload);
    setRunning(false);
    if (res.ok && Array.isArray(res.data)) {
      const out = (res.data as FindCodeResult[]).map((result, idx) => ({
        candidate: valid[idx],
        result,
      }));
      setResults(out);
      const dupCount = out.filter((o) => o.result.isDuplicate).length;
      toast({
        title: `AI matched ${out.length} item(s)`,
        description:
          dupCount > 0
            ? `${dupCount} duplicate(s) flagged — review recommendations.`
            : "No duplicates detected.",
      });
    } else {
      toast({
        title: "AI matching failed",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  const apply = async (i: number) => {
    const item = results?.[i];
    if (!item || !item.result.suggestedItemCode || !item.candidate.storeItemId)
      return;
    const sid = item.candidate.storeItemId;
    setApplying(sid);
    const res = await apiRequest(`/api/stores/${sid}`, "PUT", {
      itemCode: item.result.suggestedItemCode,
    });
    setApplying(null);
    if (res.ok) {
      setAppliedIds((prev) => new Set(prev).add(sid));
      toast({
        title: "Item code applied",
        description: `${item.candidate.description} → ${item.result.suggestedItemCode}`,
      });
      onApplied();
    } else {
      toast({
        title: "Failed to apply code",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  const dupCount = results?.filter((r) => r.result.isDuplicate).length ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!running) {
          onOpenChange(o);
          if (!o) setTimeout(reset, 200);
        }
      }}
    >
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ScanSearch className="h-5 w-5 text-primary" /> AI Item Code Finder
          </DialogTitle>
          <DialogDescription>
            Bulk-assign item codes using AI with duplicate detection across the
            store catalogue. Load current store items or enter rows manually,
            then run matching and apply suggested codes one-by-one.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadFromStore}
            className="gap-1.5"
            disabled={running || !storeItems}
          >
            <Boxes className="h-3.5 w-3.5" /> Load from current store items
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={running}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Row
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {rows.length} row(s)
            </span>
            <Button
              onClick={runAI}
              disabled={running || !hasValidRow}
              className="gap-1.5"
              size="sm"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              {running ? "Matching..." : "Run AI Matching"}
            </Button>
          </div>
        </div>

        {/* Candidate editing table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-[26vh] overflow-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>
                    Description <span className="text-red-400">*</span>
                  </TableHead>
                  <TableHead className="w-36">Category</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-28 text-right">Cost</TableHead>
                  <TableHead className="w-12 text-center">Del</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                      No rows. Click &quot;Add Row&quot; to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.description}
                          onChange={(e) =>
                            updateRow(i, { description: e.target.value })
                          }
                          placeholder="Item description"
                          className="bg-background border-border h-8"
                          disabled={running}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.category}
                          onChange={(e) =>
                            updateRow(i, { category: e.target.value })
                          }
                          placeholder="Category"
                          className="bg-background border-border h-8"
                          disabled={running}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.unit}
                          onChange={(e) => updateRow(i, { unit: e.target.value })}
                          placeholder="NOS"
                          className="bg-background border-border h-8"
                          disabled={running}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={row.cost}
                          onChange={(e) =>
                            updateRow(i, { cost: Number(e.target.value) || 0 })
                          }
                          className="bg-background border-border h-8 text-right tabular-nums"
                          disabled={running}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => removeRow(i)}
                          disabled={running || rows.length === 1}
                          title="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                AI Results
              </h3>
              <CustomBadge className="bg-secondary/60 text-muted-foreground border-border">
                {results.length} matched
              </CustomBadge>
              {dupCount > 0 && (
                <CustomBadge className="bg-red-500/15 text-red-400 border-red-500/30">
                  {dupCount} duplicate(s)
                </CustomBadge>
              )}
            </div>

            {results.length === 0 ? (
              <EmptyState
                icon={ScanSearch}
                title="No results"
                description="Try running AI matching again with valid descriptions."
              />
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="max-h-[40vh] overflow-auto scrollbar-thin">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Description</TableHead>
                        <TableHead>Suggested Code</TableHead>
                        <TableHead className="w-20">Duplicate</TableHead>
                        <TableHead>Duplicate Of</TableHead>
                        <TableHead>Existing Codes</TableHead>
                        <TableHead className="w-24">Confidence</TableHead>
                        <TableHead>Recommendation</TableHead>
                        <TableHead className="w-24 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r, i) => {
                        const sid = r.candidate.storeItemId;
                        const hasCode = !!r.result.suggestedItemCode;
                        const isApplied = sid ? appliedIds.has(sid) : false;
                        const isApplying = sid ? applying === sid : false;
                        return (
                          <TableRow
                            key={i}
                            className={cn(
                              "border-border",
                              r.result.isDuplicate &&
                                "border-l-4 border-l-red-500/60 bg-red-500/[0.04]"
                            )}
                          >
                            <TableCell className="font-medium text-foreground max-w-[220px]">
                              <div
                                className="truncate"
                                title={r.candidate.description}
                              >
                                {r.candidate.description}
                              </div>
                              {!sid && (
                                <span className="text-[10px] text-amber-400">
                                  Manual entry
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {hasCode ? (
                                <span className="font-mono text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/30">
                                  {r.result.suggestedItemCode}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <CustomBadge
                                className={
                                  r.result.isDuplicate
                                    ? "bg-red-500/15 text-red-400 border-red-500/30"
                                    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                }
                              >
                                {r.result.isDuplicate ? "Yes" : "No"}
                              </CustomBadge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {r.result.duplicateOf || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                              {r.result.existingCodes.length > 0
                                ? r.result.existingCodes.join(", ")
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <CustomBadge
                                className={confidenceColor(r.result.confidence)}
                              >
                                {r.result.confidence}
                              </CustomBadge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                              <div className="leading-relaxed">
                                {r.result.recommendation || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {isApplied ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                                  <Check className="h-3.5 w-3.5" /> Applied
                                </span>
                              ) : !hasCode ? (
                                <span className="text-xs text-muted-foreground">
                                  No code
                                </span>
                              ) : !sid ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled
                                        className="h-7 gap-1"
                                      >
                                        <Wand2 className="h-3 w-3" /> Apply
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Manual entry — create item first
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1"
                                  disabled={isApplying}
                                  onClick={() => apply(i)}
                                >
                                  {isApplying ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Wand2 className="h-3 w-3" />
                                  )}
                                  Apply
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
