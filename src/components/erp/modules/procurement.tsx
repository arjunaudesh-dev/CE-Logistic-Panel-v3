"use client";
import { useState, useMemo } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { LoadingState, ErrorState, EmptyState } from "@/components/erp/states";
import { PositionBadge, CategoryBadge } from "@/components/erp/badges";
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
import {
  FileText,
  Plus,
  Search,
  History,
  Pencil,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Filter,
  X,
  PackageCheck,
  ClipboardList,
  Wallet,
  User,
  MessageSquare,
  Truck,
} from "lucide-react";
import {
  formatCurrency,
  PRESENT_POSITIONS,
  FILE_CATEGORIES,
} from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ───
interface ProcurementLog {
  id: string;
  oldPosition: string | null;
  newPosition: string;
  changedBy: string | null;
  comment: string | null;
  changedAt: string;
}

interface ProcurementFile {
  id: string;
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
  logs?: ProcurementLog[];
}

interface Project {
  id: string;
  name: string;
  voteNumber: string;
}

// Positions considered "Pending Collection"
const PENDING_COLLECTION_POSITIONS = [
  "Order Placed",
  "Items Dispatched",
  "In Transit",
  "Part Supply",
];

const ITEMS_RECEIVED_POSITION = "Items Received";
const PAGE_SIZE = 15;

// ─── Main Module ───
export function ProcurementModule() {
  const { data: files, loading, error, refresh } = useFetch<ProcurementFile[]>(
    "/api/procurement"
  );
  const { data: projects } = useFetch<Project[]>("/api/projects");
  const { toast } = useToast();

  // Filter state
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Table state
  const [sortKey, setSortKey] = useState<"fileCost" | "prNumber">("prNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [logFile, setLogFile] = useState<ProcurementFile | null>(null);
  const [positionFile, setPositionFile] = useState<ProcurementFile | null>(null);

  // Derive unique suppliers & projects from data
  const suppliers = useMemo(() => {
    const set = new Set<string>();
    files?.forEach((f) => f.supplier && set.add(f.supplier));
    return Array.from(set).sort();
  }, [files]);

  const projectNames = useMemo(() => {
    const set = new Set<string>();
    files?.forEach((f) => f.projectName && set.add(f.projectName));
    return Array.from(set).sort();
  }, [files]);

  // Summary stats
  const stats = useMemo(() => {
    const list = files || [];
    const total = list.length;
    const pendingCollection = list.filter((f) =>
      PENDING_COLLECTION_POSITIONS.includes(f.presentPosition)
    ).length;
    const itemsReceived = list.filter(
      (f) => f.presentPosition === ITEMS_RECEIVED_POSITION
    ).length;
    const totalCost = list.reduce((s, f) => s + (f.fileCost || 0), 0);
    return { total, pendingCollection, itemsReceived, totalCost };
  }, [files]);

  // Apply filters
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
    if (supplierFilter !== "all")
      list = list.filter((f) => f.supplier === supplierFilter);
    if (projectFilter !== "all")
      list = list.filter((f) => f.projectName === projectFilter);
    if (positionFilter !== "all")
      list = list.filter((f) => f.presentPosition === positionFilter);
    if (categoryFilter !== "all")
      list = list.filter((f) => f.fileCategory === categoryFilter);

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter((f) => new Date(f.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((f) => new Date(f.createdAt) <= to);
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "fileCost") cmp = a.fileCost - b.fileCost;
      else cmp = a.prNumber.localeCompare(b.prNumber);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [
    files,
    search,
    supplierFilter,
    projectFilter,
    positionFilter,
    categoryFilter,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
  ]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedFiles = filteredFiles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSupplierFilter("all");
    setProjectFilter("all");
    setPositionFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Quick date presets
  const today = new Date();
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);
  const startOfWeek = (d: Date) => {
    const x = new Date(d);
    const day = x.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = (day + 6) % 7; // Make Monday the start
    x.setDate(x.getDate() - diff);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  const applyToday = () => {
    setDateFrom(isoDate(today));
    setDateTo(isoDate(today));
    setPage(1);
  };
  const applyThisWeek = () => {
    setDateFrom(isoDate(startOfWeek(today)));
    setDateTo(isoDate(today));
    setPage(1);
  };
  const applyThisMonth = () => {
    setDateFrom(isoDate(startOfMonth(today)));
    setDateTo(isoDate(today));
    setPage(1);
  };

  const hasActiveFilters =
    !!search ||
    supplierFilter !== "all" ||
    projectFilter !== "all" ||
    positionFilter !== "all" ||
    categoryFilter !== "all" ||
    !!dateFrom ||
    !!dateTo;

  if (loading) return <LoadingState label="Loading procurement files..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Procurement Files"
        description="All ongoing procurement files across projects"
        icon={FileText}
        actions={
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add File
          </Button>
        }
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Files"
          value={stats.total}
          icon={ClipboardList}
          accent="blue"
          sub="All procurement files"
        />
        <StatCard
          label="Pending Collection"
          value={stats.pendingCollection}
          icon={Truck}
          accent="amber"
          sub="Order Placed → Part Supply"
        />
        <StatCard
          label="Items Received"
          value={stats.itemsReceived}
          icon={PackageCheck}
          accent="green"
          sub="Awaiting QC / Payment"
        />
        <StatCard
          label="Total File Cost"
          value={formatCurrency(stats.totalCost)}
          icon={Wallet}
          accent="purple"
          sub="Sum of all file costs"
        />
      </div>

      {/* Filters bar */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-medium text-foreground">Filters</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 ml-auto gap-1 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search PR / Item / Supplier"
              className="pl-9 bg-background border-border"
            />
          </div>

          {/* Supplier filter */}
          <Select
            value={supplierFilter}
            onValueChange={(v) => {
              setSupplierFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Project filter */}
          <Select
            value={projectFilter}
            onValueChange={(v) => {
              setProjectFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projectNames.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Position filter */}
          <Select
            value={positionFilter}
            onValueChange={(v) => {
              setPositionFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {PRESENT_POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {FILE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 grid grid-cols-2 gap-3 max-w-md">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="bg-background border-border"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={applyToday}
              className="h-8 text-xs"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={applyThisWeek}
              className="h-8 text-xs"
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={applyThisMonth}
              className="h-8 text-xs"
            >
              This Month
            </Button>
          </div>
        </div>
      </div>

      {/* Files table */}
      {!files || files.length === 0 ? (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            icon={FileText}
            title="No procurement files yet"
            description="Create your first procurement file to start tracking positions and logs."
            action={
              <Button
                onClick={() => setAddOpen(true)}
                size="sm"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add File
              </Button>
            }
          />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            icon={Filter}
            title="No files match your filters"
            description="Try adjusting or clearing the filters to see more files."
            action={
              <Button
                variant="outline"
                onClick={clearFilters}
                size="sm"
                className="gap-1.5"
              >
                <X className="h-4 w-4" /> Clear Filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <SortableTh
                    label="PR Number"
                    onClick={() => toggleSort("prNumber")}
                    active={sortKey === "prNumber"}
                    dir={sortDir}
                  />
                  <TableHead className="text-muted-foreground whitespace-nowrap">
                    Project
                  </TableHead>
                  <TableHead className="text-muted-foreground whitespace-nowrap">
                    Item Code
                  </TableHead>
                  <TableHead className="text-muted-foreground">Item Name</TableHead>
                  <TableHead className="text-muted-foreground">Unit</TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Qty
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right whitespace-nowrap">
                    Unit Price
                  </TableHead>
                  <SortableTh
                    label="File Cost"
                    onClick={() => toggleSort("fileCost")}
                    active={sortKey === "fileCost"}
                    dir={sortDir}
                    align="right"
                  />
                  <TableHead className="text-muted-foreground">Supplier</TableHead>
                  <TableHead className="text-muted-foreground">Position</TableHead>
                  <TableHead className="text-muted-foreground">Category</TableHead>
                  <TableHead className="text-muted-foreground text-right whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedFiles.map((f) => (
                  <TableRow
                    key={f.id}
                    className="border-border cursor-pointer hover:bg-secondary/40"
                    onClick={() => setLogFile(f)}
                  >
                    <TableCell className="font-mono text-xs text-foreground whitespace-nowrap">
                      {f.prNumber}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-foreground truncate max-w-[160px]">
                          {f.projectName || "—"}
                        </span>
                        {f.voteNumber && (
                          <span className="text-[10px] text-muted-foreground">
                            {f.voteNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {f.itemCode}
                    </TableCell>
                    <TableCell className="text-foreground">{f.itemName}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {f.unit}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {f.qty}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(f.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground whitespace-nowrap">
                      {formatCurrency(f.fileCost)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {f.supplier || "—"}
                    </TableCell>
                    <TableCell>
                      <PositionBadge position={f.presentPosition} />
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={f.fileCategory} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Update Position"
                          onClick={() => setPositionFile(f)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="View Log"
                          onClick={() => setLogFile(f)}
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Export CSV"
                          onClick={() => exportRowCsv(f)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="text-foreground font-medium">
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredFiles.length)}
              </span>{" "}
              of{" "}
              <span className="text-foreground font-medium">
                {filteredFiles.length}
              </span>{" "}
              files · Click any row to view the file log
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Page{" "}
                <span className="text-foreground font-medium">{currentPage}</span>{" "}
                of <span className="text-foreground font-medium">{totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add File Dialog */}
      <AddFileDialog
        projects={projects || []}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          toast({ title: "Procurement file created successfully" });
          refresh();
        }}
      />

      {/* File Log Dialog */}
      <FileLogDialog
        file={logFile}
        open={!!logFile}
        onOpenChange={(o) => !o && setLogFile(null)}
      />

      {/* Update Position Dialog */}
      {positionFile && (
        <UpdatePositionDialog
          file={positionFile}
          open={!!positionFile}
          onOpenChange={(o) => !o && setPositionFile(null)}
          onSaved={() => {
            setPositionFile(null);
            toast({ title: "Position updated" });
            refresh();
          }}
        />
      )}
    </div>
  );

  function exportRowCsv(f: ProcurementFile) {
    const headers = [
      "PR Number",
      "Project",
      "Vote Number",
      "Item Code",
      "Item Name",
      "Unit",
      "Qty",
      "Unit Price",
      "File Cost",
      "Supplier",
      "Present Position",
      "Category",
      "Created At",
    ];
    const row = [
      f.prNumber,
      f.projectName || "",
      f.voteNumber || "",
      f.itemCode,
      f.itemName,
      f.unit,
      f.qty,
      f.unitPrice,
      f.fileCost,
      f.supplier || "",
      f.presentPosition,
      f.fileCategory,
      new Date(f.createdAt).toLocaleString("en-GB"),
    ];
    const csv = [
      headers.join(","),
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${f.prNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", description: `${f.prNumber}.csv` });
  }
}

// ─── Sortable Table Header ───
function SortableTh({
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
    <TableHead
      className={cn(
        "text-muted-foreground",
        align === "right" && "text-right"
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground whitespace-nowrap",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        {active &&
          (dir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </button>
    </TableHead>
  );
}

// ─── Add File Dialog ───
function AddFileDialog({
  projects,
  open,
  onOpenChange,
  onCreated,
}: {
  projects: Project[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
    voteNumber: "",
    prNumber: "",
    itemCode: "",
    itemName: "",
    unit: "NOS",
    qty: "",
    unitPrice: "",
    fileCost: "",
    supplier: "",
    presentPosition: "PR Raised",
    fileCategory: "General",
    createdBy: "",
  });
  const { toast } = useToast();

  const onProjectChange = (name: string) => {
    const p = projects.find((x) => x.name === name);
    setForm((f) => ({
      ...f,
      projectName: name,
      voteNumber: p?.voteNumber || "",
    }));
  };

  const reset = () => {
    setForm({
      projectName: "",
      voteNumber: "",
      prNumber: "",
      itemCode: "",
      itemName: "",
      unit: "NOS",
      qty: "",
      unitPrice: "",
      fileCost: "",
      supplier: "",
      presentPosition: "PR Raised",
      fileCategory: "General",
      createdBy: "",
    });
  };

  const submit = async () => {
    if (!form.prNumber || !form.itemCode || !form.itemName) {
      toast({
        title: "PR Number, Item Code and Item Name are required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      projectName: form.projectName || undefined,
      voteNumber: form.voteNumber || undefined,
      supplier: form.supplier || undefined,
      qty: form.qty ? Number(form.qty) : 0,
      unitPrice: form.unitPrice ? Number(form.unitPrice) : 0,
      fileCost: form.fileCost ? Number(form.fileCost) : undefined,
    };
    const res = await apiRequest("/api/procurement", "POST", payload);
    setSaving(false);
    if (res.ok) {
      reset();
      onCreated();
    } else {
      toast({
        title: "Failed to create file",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Add Procurement File
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Project</Label>
            <Select value={form.projectName} onValueChange={onProjectChange}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No projects available
                  </SelectItem>
                ) : (
                  projects.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vote Number</Label>
            <Input
              value={form.voteNumber}
              readOnly
              placeholder="Auto-filled from project"
              className="bg-secondary/40 border-border text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">PR Number *</Label>
            <Input
              value={form.prNumber}
              onChange={(e) => setForm({ ...form, prNumber: e.target.value })}
              placeholder="e.g. PR-2025-001"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Item Code *</Label>
            <Input
              value={form.itemCode}
              onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
              placeholder="e.g. ITM-001"
              className="bg-background border-border"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Item Name *</Label>
            <Input
              value={form.itemName}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              placeholder="e.g. Mild Steel Plate 6mm"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Unit</Label>
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="NOS / KG / MTR"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Qty</Label>
            <Input
              type="number"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
              placeholder="0"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Unit Price (Rs.)</Label>
            <Input
              type="number"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              placeholder="0"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">File Cost (Rs.) — auto if empty</Label>
            <Input
              type="number"
              value={form.fileCost}
              onChange={(e) => setForm({ ...form, fileCost: e.target.value })}
              placeholder="auto (qty × unit price)"
              className="bg-background border-border"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Supplier</Label>
            <Input
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              placeholder="e.g. ABC Traders"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Present Position</Label>
            <Select
              value={form.presentPosition}
              onValueChange={(v) => setForm({ ...form, presentPosition: v })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESENT_POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">File Category</Label>
            <Select
              value={form.fileCategory}
              onValueChange={(v) => setForm({ ...form, fileCategory: v })}
            >
              <SelectTrigger className="bg-background border-border">
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
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Created By</Label>
            <Input
              value={form.createdBy}
              onChange={(e) => setForm({ ...form, createdBy: e.target.value })}
              placeholder="Your name (optional)"
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
            Create File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Update Position Dialog ───
function UpdatePositionDialog({
  file,
  open,
  onOpenChange,
  onSaved,
}: {
  file: ProcurementFile;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [newPosition, setNewPosition] = useState(file.presentPosition);
  const [comment, setComment] = useState("");
  const [changedBy, setChangedBy] = useState("");
  const { toast } = useToast();

  const submit = async () => {
    if (!newPosition) {
      toast({ title: "Select a new position", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await apiRequest(`/api/procurement/${file.id}`, "PUT", {
      presentPosition: newPosition,
      comment: comment || undefined,
      changedBy: changedBy || undefined,
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      toast({
        title: "Failed to update position",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Update Position — {file.prNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-secondary/40 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Item:</span>
              <span className="text-foreground font-medium">{file.itemName}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Current:</span>
              <PositionBadge position={file.presentPosition} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">New Position</Label>
            <Select value={newPosition} onValueChange={setNewPosition}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESENT_POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Changed By</Label>
            <Input
              value={changedBy}
              onChange={(e) => setChangedBy(e.target.value)}
              placeholder="Your name"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Comment (for log)</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional note about this change"
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
            Update Position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── File Log Dialog ───
function FileLogDialog({
  file,
  open,
  onOpenChange,
}: {
  file: ProcurementFile | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!file) return null;
  const logs = file.logs || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            File Log — {file.prNumber}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 pr-2">
            {/* File details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-secondary/40 rounded-lg">
              <Detail label="Project" value={file.projectName || "—"} />
              <Detail label="Vote Number" value={file.voteNumber || "—"} />
              <Detail label="Item Code" value={file.itemCode} />
              <Detail label="Item Name" value={file.itemName} />
              <Detail label="Unit" value={file.unit} />
              <Detail label="Qty" value={String(file.qty)} />
              <Detail label="Unit Price" value={formatCurrency(file.unitPrice)} />
              <Detail
                label="File Cost"
                value={formatCurrency(file.fileCost)}
                highlight
              />
              <Detail label="Supplier" value={file.supplier || "—"} />
              <Detail label="Category" value={file.fileCategory} />
              <Detail label="Created By" value={file.createdBy || "—"} />
              <Detail
                label="Authorized By"
                value={file.authorizedBy || "—"}
              />
              <Detail
                label="Created At"
                value={new Date(file.createdAt).toLocaleDateString("en-GB")}
              />
              <Detail
                label="Updated At"
                value={new Date(file.updatedAt).toLocaleDateString("en-GB")}
              />
              <div className="col-span-2 sm:col-span-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Current Position
                </p>
                <div className="mt-1">
                  <PositionBadge position={file.presentPosition} />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Activity Timeline
              </h4>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="relative pl-6">
                  {/* vertical line */}
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                        <div className="bg-secondary/40 rounded-lg p-3">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {log.oldPosition && (
                              <PositionBadge position={log.oldPosition} />
                            )}
                            <span className="text-muted-foreground text-xs">→</span>
                            <PositionBadge position={log.newPosition} />
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(log.changedAt).toLocaleString("en-GB")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {log.changedBy || "Unknown"}
                          </div>
                          {log.comment && (
                            <div className="flex items-start gap-1.5 text-xs text-foreground/80 mt-1.5">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{log.comment}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-medium",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
