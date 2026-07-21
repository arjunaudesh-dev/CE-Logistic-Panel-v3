"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { LoadingState, ErrorState, EmptyState } from "@/components/erp/states";
import { CategoryBadge, CustomBadge } from "@/components/erp/badges";
import { formatCurrency, RATE_CATEGORIES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Search,
  Upload,
  Plus,
  Trash2,
  Download,
  GitCompare,
  FileText,
  Ban,
  Loader2,
  X,
  ArrowRightLeft,
} from "lucide-react";

// ─────────────────────────────── Types ───────────────────────────────

interface RCItem {
  id: string;
  rateCode: string | null;
  itemCode: string;
  description: string;
  unit: string;
  rcPrice: number;
  vat: number;
  warranty: string | null;
  brand: string | null;
  makeModel: string | null;
  category: string;
  subCategory: string | null;
  supplier: string | null;
  rcYear: string;
  validFrom: string | null;
  validUntil: string | null;
}

interface DiscontinuedItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  lastRCPrice: number;
  lastRCYear: string | null;
  discontinuedDate: string | null;
  reason: string | null;
  alternatives: string | null;
}

// ───────────────────────────── Helpers ─────────────────────────────

/** Minimal CSV parser that handles quoted fields (with "" escape) and CRLF. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        current.push(field);
        field = "";
      } else if (c === "\n") {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
      } else if (c === "\r") {
        // skip — handled with \n
      } else {
        field += c;
      }
    }
  }
  // flush trailing field/row
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  // drop fully empty rows
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Defensive date formatter — accepts ISO strings, date-only strings, or arbitrary strings. */
function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const trimmed = s.trim();
  if (!trimmed) return "—";
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Trigger a browser download for a CSV string. */
function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Split an alternatives string into individual items (comma or semicolon separated). */
function splitAlternatives(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// New CSV format — exact column headers expected by the importer & API.
// Rate code, item, rate(Rs), VAT, warranty, validity up to, Brand, make model, Category, sub category, RC supplier
const RC_TEMPLATE =
  "Rate code,item,rate(Rs),VAT,warranty,validity up to,Brand,make model,Category,sub category,RC supplier\n" +
  "RC-2025-001,Brass Valve 50mm,1500,15,12 months,2025-12-31,ABC Brands,Model BV-50,Plumbing,Valves,ABC Suppliers\n" +
  "RC-2025-002,Copper Pipe 1m,3200,15,24 months,2026-03-31,XYZ Metals,CP-1000,Electrical,Cables,XYZ Traders\n";

const DISCONTINUED_TEMPLATE =
  "ItemCode,Description,Unit,LastRCPrice,LastRCYear,DiscontinuedDate,Reason,Alternatives\n" +
  "RC-2020-045,Old Brass Valve,NOS,800,2020,2024-03-15,Obsolete,RC-2025-012;RC-2025-015\n" +
  "RC-2019-012,Legacy Pipe Fitting,NOS,450,2019,2024-01-10,Supplier Discontinued,RC-2025-022\n";

// Single-column CSV template for "Discontinue by Rate Code" bulk upload.
// Each row is one Rate Code — the matching RateContract entries will be moved
// to the Discontinued list automatically.
const DISCONTINUE_BY_RC_TEMPLATE =
  "Rate code\n" +
  "RC-2025-001\n" +
  "RC-2025-002\n" +
  "RC-2024-018\n";

// ───────────────────────────── Main Module ─────────────────────────────

export function RateFinderModule() {
  const {
    data: rcItems,
    loading: rcLoading,
    error: rcError,
    refresh: rcRefresh,
  } = useFetch<RCItem[]>("/api/rate-finder/rc");
  const {
    data: discontinued,
    loading: dLoading,
    error: dError,
    refresh: dRefresh,
  } = useFetch<DiscontinuedItem[]>("/api/rate-finder/discontinued");
  const [tab, setTab] = useState<string>("rc");

  const totalRC = rcItems?.length ?? 0;
  const totalDiscontinued = discontinued?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Rate Finder"
        description="Rate contracts across years & discontinued item registry"
        icon={Search}
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Total RC Items"
          value={totalRC}
          icon={FileText}
          accent="blue"
          sub="Across all years & categories"
        />
        <StatCard
          label="Total Discontinued"
          value={totalDiscontinued}
          icon={Ban}
          accent="red"
          sub="Items no longer in supply"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rc">RC</TabsTrigger>
          <TabsTrigger value="discontinued">Discontinued</TabsTrigger>
        </TabsList>

        <TabsContent value="rc">
          <RCTab
            items={rcItems ?? null}
            loading={rcLoading}
            error={rcError}
            refresh={rcRefresh}
          />
        </TabsContent>

        <TabsContent value="discontinued">
          <DiscontinuedTab
            items={discontinued ?? null}
            loading={dLoading}
            error={dError}
            refresh={dRefresh}
            rcItems={rcItems ?? null}
            rcRefresh={rcRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ───────────────────────────── RC Tab ─────────────────────────────

interface RCTabProps {
  items: RCItem[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function RCTab({ items, loading, error, refresh }: RCTabProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [year, setYear] = useState<string>("All");
  const [supplier, setSupplier] = useState<string>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [compareItem, setCompareItem] = useState<RCItem[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounced search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Derived filter option lists
  const years = useMemo(() => {
    const s = new Set<string>();
    items?.forEach((i) => i.rcYear && s.add(i.rcYear));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const suppliers = useMemo(() => {
    const s = new Set<string>();
    items?.forEach((i) => i.supplier && s.add(i.supplier));
    return Array.from(s).sort();
  }, [items]);

  // Filtered rows
  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((i) => {
      if (category !== "All" && i.category !== category) return false;
      if (year !== "All" && i.rcYear !== year) return false;
      if (supplier !== "All" && i.supplier !== supplier) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (
          !(i.rateCode ?? "").toLowerCase().includes(q) &&
          !i.itemCode.toLowerCase().includes(q) &&
          !i.description.toLowerCase().includes(q) &&
          !(i.brand ?? "").toLowerCase().includes(q) &&
          !(i.makeModel ?? "").toLowerCase().includes(q) &&
          !(i.supplier ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, category, year, supplier, debouncedSearch]);

  // Group by rateCode (preferred) or itemCode for compare feature
  const groupedByCode = useMemo(() => {
    const m = new Map<string, RCItem[]>();
    items?.forEach((i) => {
      const key = i.rateCode || i.itemCode;
      const arr = m.get(key) ?? [];
      arr.push(i);
      m.set(key, arr);
    });
    return m;
  }, [items]);

  const filtersActive =
    category !== "All" || year !== "All" || supplier !== "All" || debouncedSearch !== "";

  const clearFilters = () => {
    setCategory("All");
    setYear("All");
    setSupplier("All");
    setSearch("");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await apiRequest(`/api/rate-finder/rc/${id}`, "DELETE");
    setDeletingId(null);
    if (res.ok) {
      toast({ title: "RC item deleted" });
      refresh();
    } else {
      toast({
        title: "Failed to delete RC item",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  if (loading) return <LoadingState label="Loading rate contracts..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item name or code..."
              className="pl-9 bg-card border-border"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[150px] bg-card border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {RATE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[130px] bg-card border-border">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supplier} onValueChange={setSupplier}>
            <SelectTrigger className="w-[170px] bg-card border-border">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Suppliers</SelectItem>
              {suppliers.map((s) => (
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
              onClick={clearFilters}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-4 w-4" /> Upload RC List
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add RC
          </Button>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing <span className="text-foreground font-medium">{filtered.length}</span> of{" "}
          <span className="text-foreground font-medium">{items?.length ?? 0}</span> rate contracts
        </span>
      </div>

      {/* Table */}
      {!filtered || filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={items && items.length > 0 ? "No matching rate contracts" : "No rate contracts yet"}
          description={
            items && items.length > 0
              ? "Try adjusting your search or filter criteria."
              : "Add a single RC entry or upload a CSV list to get started."
          }
          action={
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add RC
            </Button>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Rate Code</TableHead>
                  <TableHead className="text-muted-foreground">Item</TableHead>
                  <TableHead className="text-muted-foreground text-right">Rate (Rs)</TableHead>
                  <TableHead className="text-muted-foreground">VAT</TableHead>
                  <TableHead className="text-muted-foreground">Warranty</TableHead>
                  <TableHead className="text-muted-foreground">Valid Until</TableHead>
                  <TableHead className="text-muted-foreground">Brand</TableHead>
                  <TableHead className="text-muted-foreground">Make/Model</TableHead>
                  <TableHead className="text-muted-foreground">Category</TableHead>
                  <TableHead className="text-muted-foreground">Sub Category</TableHead>
                  <TableHead className="text-muted-foreground">RC Supplier</TableHead>
                  <TableHead className="text-muted-foreground">RC Year</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const group = groupedByCode.get(item.itemCode) ?? [item];
                  const multiYear = group.length > 1;
                  return (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="font-mono text-foreground whitespace-nowrap">
                        {item.rateCode || item.itemCode || "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[280px] truncate text-foreground"
                        title={item.description}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{item.description}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground text-right whitespace-nowrap">
                        {formatCurrency(item.rcPrice)}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {item.vat ? `${item.vat}%` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {item.warranty || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(item.validUntil)}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {item.brand || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {item.makeModel || "—"}
                      </TableCell>
                      <TableCell>
                        <CategoryBadge category={item.category} />
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {item.subCategory || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {item.supplier || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground font-medium">{item.rcYear}</span>
                          {multiYear && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 gap-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              onClick={() => setCompareItem(group)}
                              title={`Compare ${group.length} years`}
                            >
                              <GitCompare className="h-3 w-3" /> Compare
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          title="Delete RC item"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add RC dialog */}
      <AddRCDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          setAddOpen(false);
          refresh();
        }}
      />

      {/* Upload RC dialog */}
      <UploadRCDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onDone={() => {
          setUploadOpen(false);
          refresh();
        }}
      />

      {/* Compare dialog */}
      <CompareDialog items={compareItem} onClose={() => setCompareItem(null)} />
    </div>
  );
}

// ───────────────────────────── Add RC Dialog ─────────────────────────────

interface AddRCDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}

function AddRCDialog({ open, onOpenChange, onDone }: AddRCDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const blankForm = {
    rateCode: "",
    itemCode: "",
    description: "",
    unit: "NOS",
    rcPrice: "",
    vat: "",
    warranty: "",
    validFrom: "",
    validUntil: "",
    brand: "",
    makeModel: "",
    category: "General",
    subCategory: "",
    supplier: "",
    rcYear: String(new Date().getFullYear()),
  };
  const [form, setForm] = useState(blankForm);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.description) {
      toast({
        title: "Item description is required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const res = await apiRequest("/api/rate-finder/rc", "POST", {
      rateCode: form.rateCode || null,
      itemCode: form.itemCode || form.rateCode || "",
      description: form.description,
      unit: form.unit || "NOS",
      rcPrice: Number(form.rcPrice) || 0,
      vat: Number(form.vat) || 0,
      warranty: form.warranty || null,
      brand: form.brand || null,
      makeModel: form.makeModel || null,
      category: form.category || "General",
      subCategory: form.subCategory || null,
      supplier: form.supplier || null,
      rcYear: form.rcYear || String(new Date().getFullYear()),
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "RC item added successfully" });
      setForm(blankForm);
      onDone();
    } else {
      toast({
        title: "Failed to add RC item",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Rate Contract</DialogTitle>
          <DialogDescription>
            Add a new rate contract entry to the registry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Rate Code *</Label>
            <Input
              value={form.rateCode}
              onChange={(e) => set("rateCode", e.target.value)}
              placeholder="e.g. RC-2025-001"
              className="bg-background border-border font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Item Code</Label>
            <Input
              value={form.itemCode}
              onChange={(e) => set("itemCode", e.target.value)}
              placeholder="Defaults to Rate Code"
              className="bg-background border-border font-mono"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Item (Description) *</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Item description"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rate (Rs.)</Label>
            <Input
              type="number"
              value={form.rcPrice}
              onChange={(e) => set("rcPrice", e.target.value)}
              placeholder="0"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>VAT (%)</Label>
            <Input
              type="number"
              value={form.vat}
              onChange={(e) => set("vat", e.target.value)}
              placeholder="0"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Warranty</Label>
            <Input
              value={form.warranty}
              onChange={(e) => set("warranty", e.target.value)}
              placeholder="e.g. 12 months"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="NOS"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Input
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="Brand name"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Make / Model</Label>
            <Input
              value={form.makeModel}
              onChange={(e) => set("makeModel", e.target.value)}
              placeholder="Make and model"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATE_CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sub Category</Label>
            <Input
              value={form.subCategory}
              onChange={(e) => set("subCategory", e.target.value)}
              placeholder="e.g. Valves"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>RC Supplier</Label>
            <Input
              value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)}
              placeholder="RC supplier name"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>RC Year</Label>
            <Input
              value={form.rcYear}
              onChange={(e) => set("rcYear", e.target.value)}
              placeholder="2025"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Valid From</Label>
            <Input
              type="date"
              value={form.validFrom}
              onChange={(e) => set("validFrom", e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Valid Until</Label>
            <Input
              type="date"
              value={form.validUntil}
              onChange={(e) => set("validUntil", e.target.value)}
              className="bg-background border-border"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add RC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Upload RC Dialog ─────────────────────────────

interface UploadRCDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}

function UploadRCDialog({ open, onOpenChange, onDone }: UploadRCDialogProps) {
  const { toast } = useToast();
  const [parsed, setParsed] = useState<Omit<RCItem, "id">[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsed(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast({ title: "Failed to read file", variant: "destructive" });
      return;
    }
    const rows = parseCSV(text);
    if (rows.length === 0) {
      toast({ title: "CSV file is empty", variant: "destructive" });
      setParsed(null);
      return;
    }
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    // New CSV format headers (lowercased). The API also accepts these aliases
    // directly (e.g. "rate(Rs)" → rcPrice, "validity up to" → validUntil).
    const columnAliases: Record<string, string[]> = {
      rateCode: ["rate code", "ratecode"],
      description: ["item", "description"],
      rcPrice: ["rate(rs)", "rate", "rcprice"],
      vat: ["vat"],
      warranty: ["warranty"],
      validUntil: ["validity up to", "validuntil"],
      brand: ["brand"],
      makeModel: ["make model", "makemodel"],
      category: ["category"],
      subCategory: ["sub category", "subcategory"],
      supplier: ["rc supplier", "supplier"],
      itemCode: ["itemcode", "item code"],
      rcYear: ["rcyear", "rc year"],
      validFrom: ["validfrom", "valid from"],
      unit: ["unit"],
    };
    const idx: Record<string, number> = {};
    Object.entries(columnAliases).forEach(([field, aliases]) => {
      for (const a of aliases) {
        const i = headers.indexOf(a);
        if (i >= 0) {
          idx[field] = i;
          break;
        }
      }
    });
    if (!("description" in idx)) {
      toast({
        title: "Missing required column",
        description:
          'CSV must include an "item" (or "description") column. Use the template button to get the correct format.',
        variant: "destructive",
      });
      setParsed(null);
      return;
    }
    const dataRows = rows.slice(1);
    const items: Omit<RCItem, "id">[] = dataRows
      .map((r) => {
        const rateCode = (r[idx["rateCode"]] ?? "").trim();
        const itemCode = (r[idx["itemCode"]] ?? "").trim();
        const description = (r[idx["description"]] ?? "").trim();
        const rcYearRaw = (r[idx["rcYear"]] ?? "").trim();
        return {
          rateCode: rateCode || null,
          itemCode: itemCode || rateCode || "",
          description,
          unit: (r[idx["unit"]] ?? "NOS").trim() || "NOS",
          rcPrice: Number((r[idx["rcPrice"]] ?? "0").trim()) || 0,
          vat: Number((r[idx["vat"]] ?? "0").trim()) || 0,
          warranty: (r[idx["warranty"]] ?? "").trim() || null,
          brand: (r[idx["brand"]] ?? "").trim() || null,
          makeModel: (r[idx["makeModel"]] ?? "").trim() || null,
          category: (r[idx["category"]] ?? "General").trim() || "General",
          subCategory: (r[idx["subCategory"]] ?? "").trim() || null,
          supplier: (r[idx["supplier"]] ?? "").trim() || null,
          rcYear: rcYearRaw || String(new Date().getFullYear()),
          validFrom: (r[idx["validFrom"]] ?? "").trim() || null,
          validUntil: (r[idx["validUntil"]] ?? "").trim() || null,
        };
      })
      .filter((i) => i.itemCode || i.description);

    if (items.length === 0) {
      toast({ title: "No data rows found in CSV", variant: "destructive" });
      setParsed(null);
      return;
    }
    setParsed(items);
  };

  const submit = async () => {
    if (!parsed || parsed.length === 0) {
      toast({ title: "No data to upload", variant: "destructive" });
      return;
    }
    setUploading(true);
    const res = await apiRequest("/api/rate-finder/rc", "POST", parsed);
    setUploading(false);
    if (res.ok) {
      toast({ title: `Uploaded ${parsed.length} RC items` });
      reset();
      onDone();
    } else {
      toast({
        title: "Upload failed",
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Upload RC List (CSV)</DialogTitle>
          <DialogDescription>
            Columns: Rate code, item, rate(Rs), VAT, warranty, validity up to, Brand,
            make model, Category, sub category, RC supplier
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Choose CSV File
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => downloadCSV("rc-list-template.csv", RC_TEMPLATE)}
            >
              <Download className="h-4 w-4" /> Download Template
            </Button>
          </div>
          {fileName && (
            <p className="text-sm text-muted-foreground">
              Selected: <span className="text-foreground font-medium">{fileName}</span>
            </p>
          )}
          {parsed && (
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Preview ({parsed.length} rows)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={reset}
                >
                  Reset
                </Button>
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Rate Code</TableHead>
                      <TableHead className="text-muted-foreground">Item</TableHead>
                      <TableHead className="text-muted-foreground text-right">Rate (Rs)</TableHead>
                      <TableHead className="text-muted-foreground">VAT</TableHead>
                      <TableHead className="text-muted-foreground">Warranty</TableHead>
                      <TableHead className="text-muted-foreground">Valid Until</TableHead>
                      <TableHead className="text-muted-foreground">Brand</TableHead>
                      <TableHead className="text-muted-foreground">Make/Model</TableHead>
                      <TableHead className="text-muted-foreground">Category</TableHead>
                      <TableHead className="text-muted-foreground">Sub Cat</TableHead>
                      <TableHead className="text-muted-foreground">Supplier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 50).map((p, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="font-mono text-foreground whitespace-nowrap">
                          {p.rateCode || "—"}
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground truncate max-w-[200px]"
                          title={p.description}
                        >
                          {p.description}
                        </TableCell>
                        <TableCell className="text-foreground text-right whitespace-nowrap">
                          {formatCurrency(p.rcPrice)}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {p.vat ? `${p.vat}%` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {p.warranty || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(p.validUntil)}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {p.brand || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {p.makeModel || "—"}
                        </TableCell>
                        <TableCell>
                          <CategoryBadge category={p.category} />
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {p.subCategory || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {p.supplier || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsed.length > 50 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    ... and {parsed.length - 50} more rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!parsed || uploading} className="gap-1.5">
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload {parsed ? `${parsed.length} ` : ""}Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Compare Dialog ─────────────────────────────

interface CompareDialogProps {
  items: RCItem[] | null;
  onClose: () => void;
}

function CompareDialog({ items, onClose }: CompareDialogProps) {
  if (!items || items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.rcYear.localeCompare(b.rcYear));
  const data = sorted.map((i) => ({
    year: i.rcYear,
    price: i.rcPrice,
    supplier: i.supplier || "—",
    validUntil: i.validUntil,
  }));

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const diff = max - min;
  const pct = min > 0 ? ((max - min) / min) * 100 : 0;
  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const trend =
    last > first ? "increased" : last < first ? "decreased" : "stable";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            Price Comparison — {sorted[0].itemCode}
          </DialogTitle>
          <DialogDescription>{sorted[0].description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Summary tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/40 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Years</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{data.length}</p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Price Range
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatCurrency(min)} – {formatCurrency(max)}
              </p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Change</p>
              <p
                className={cn(
                  "text-sm font-semibold mt-0.5",
                  trend === "increased"
                    ? "text-red-400"
                    : trend === "decreased"
                      ? "text-emerald-400"
                      : "text-muted-foreground"
                )}
              >
                {diff > 0 ? `${formatCurrency(diff)} (${pct.toFixed(1)}%)` : "—"}
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-background border border-border rounded-lg p-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Price by Year
            </h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#2d3548" }}
                  tickLine={{ stroke: "#2d3548" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#2d3548" }}
                  tickLine={{ stroke: "#2d3548" }}
                  tickFormatter={(v: number) => "Rs. " + v.toLocaleString("en-US")}
                  width={95}
                />
                <Tooltip
                  cursor={{ fill: "#2d354840" }}
                  contentStyle={{
                    background: "#1a1f2e",
                    border: "1px solid #2d3548",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [formatCurrency(v), "Price"]}
                  labelFormatter={(l) => `Year ${l}`}
                />
                <Bar dataKey="price" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Year</TableHead>
                  <TableHead className="text-muted-foreground">Price</TableHead>
                  <TableHead className="text-muted-foreground">Supplier</TableHead>
                  <TableHead className="text-muted-foreground">Valid Until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((i) => (
                  <TableRow key={i.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{i.rcYear}</TableCell>
                    <TableCell className="text-foreground font-medium">
                      {formatCurrency(i.rcPrice)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.supplier || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(i.validUntil)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Discontinued Tab ─────────────────────────────

interface DiscontinuedTabProps {
  items: DiscontinuedItem[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  rcItems: RCItem[] | null;
  rcRefresh: () => void;
}

function DiscontinuedTab({
  items,
  loading,
  error,
  refresh,
  rcItems,
  rcRefresh,
}: DiscontinuedTabProps) {
  const { toast } = useToast();
  const [year, setYear] = useState<string>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadByRcOpen, setUploadByRcOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const years = useMemo(() => {
    const s = new Set<string>();
    items?.forEach((i) => i.lastRCYear && s.add(i.lastRCYear));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (year === "All") return items;
    return items.filter((i) => i.lastRCYear === year);
  }, [items, year]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await apiRequest(`/api/rate-finder/discontinued/${id}`, "DELETE");
    setDeletingId(null);
    if (res.ok) {
      toast({ title: "Discontinued item deleted" });
      refresh();
    } else {
      toast({
        title: "Failed to delete item",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  if (loading) return <LoadingState label="Loading discontinued items..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {year !== "All" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setYear("All")}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setUploadByRcOpen(true)}
            title="Upload a single-column CSV of Rate Codes — matching RC items will be moved here automatically"
          >
            <ArrowRightLeft className="h-4 w-4" /> Upload Discontinue List
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-4 w-4" /> Upload Discontinued List
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Discontinued
          </Button>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing <span className="text-foreground font-medium">{filtered.length}</span> of{" "}
          <span className="text-foreground font-medium">{items?.length ?? 0}</span> discontinued
          items
        </span>
      </div>

      {/* Table */}
      {!filtered || filtered.length === 0 ? (
        <EmptyState
          icon={Ban}
          title={
            items && items.length > 0
              ? "No discontinued items for this year"
              : "No discontinued items yet"
          }
          description={
            items && items.length > 0
              ? "Try selecting a different year or All Years."
              : "Add a discontinued item or upload a CSV list to get started."
          }
          action={
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Discontinued
            </Button>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Item Code</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Unit</TableHead>
                  <TableHead className="text-muted-foreground">Last RC Price</TableHead>
                  <TableHead className="text-muted-foreground">Last RC Year</TableHead>
                  <TableHead className="text-muted-foreground">Discontinued Date</TableHead>
                  <TableHead className="text-muted-foreground">Reason</TableHead>
                  <TableHead className="text-muted-foreground">Alternatives</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const alts = splitAlternatives(item.alternatives);
                  return (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {item.itemCode}
                      </TableCell>
                      <TableCell
                        className="max-w-[260px] truncate text-muted-foreground"
                        title={item.description}
                      >
                        {item.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatCurrency(item.lastRCPrice)}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {item.lastRCYear || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.discontinuedDate)}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate text-muted-foreground"
                        title={item.reason || ""}
                      >
                        {item.reason || "—"}
                      </TableCell>
                      <TableCell>
                        {alts.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {alts.map((a, i) => (
                              <CustomBadge
                                key={i}
                                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default hover:bg-emerald-500/20 transition-colors"
                              >
                                {a}
                              </CustomBadge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          title="Delete discontinued item"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add Discontinued dialog */}
      <AddDiscontinuedDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          setAddOpen(false);
          refresh();
        }}
      />

      {/* Upload Discontinued dialog */}
      <UploadDiscontinuedDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onDone={() => {
          setUploadOpen(false);
          refresh();
        }}
      />

      {/* Upload Discontinue by Rate Code dialog */}
      <UploadDiscontinueByRateCodeDialog
        open={uploadByRcOpen}
        onOpenChange={setUploadByRcOpen}
        rcItems={rcItems}
        onDone={() => {
          setUploadByRcOpen(false);
          refresh();
          rcRefresh();
        }}
      />
    </div>
  );
}

// ───────────────────────────── Add Discontinued Dialog ─────────────────────────────

interface AddDiscontinuedDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}

function AddDiscontinuedDialog({ open, onOpenChange, onDone }: AddDiscontinuedDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const blankForm = {
    itemCode: "",
    description: "",
    unit: "NOS",
    lastRCPrice: "",
    lastRCYear: String(new Date().getFullYear()),
    discontinuedDate: "",
    reason: "",
    alternatives: "",
  };
  const [form, setForm] = useState(blankForm);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.itemCode || !form.description) {
      toast({
        title: "Item Code and Description are required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const res = await apiRequest("/api/rate-finder/discontinued", "POST", {
      itemCode: form.itemCode,
      description: form.description,
      unit: form.unit || "NOS",
      lastRCPrice: Number(form.lastRCPrice) || 0,
      lastRCYear: form.lastRCYear || null,
      discontinuedDate: form.discontinuedDate || null,
      reason: form.reason || null,
      alternatives: form.alternatives || null,
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Discontinued item added" });
      setForm(blankForm);
      onDone();
    } else {
      toast({
        title: "Failed to add discontinued item",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Discontinued Item</DialogTitle>
          <DialogDescription>
            Record an item that has been discontinued, along with any alternative items.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Item Code *</Label>
            <Input
              value={form.itemCode}
              onChange={(e) => set("itemCode", e.target.value)}
              placeholder="e.g. RC-2020-045"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="NOS"
              className="bg-background border-border"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Description *</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Item description"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Last RC Price (Rs.)</Label>
            <Input
              type="number"
              value={form.lastRCPrice}
              onChange={(e) => set("lastRCPrice", e.target.value)}
              placeholder="0"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Last RC Year</Label>
            <Input
              value={form.lastRCYear}
              onChange={(e) => set("lastRCYear", e.target.value)}
              placeholder="2024"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Discontinued Date</Label>
            <Input
              type="date"
              value={form.discontinuedDate}
              onChange={(e) => set("discontinuedDate", e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="e.g. Obsolete / Supplier discontinued"
              className="bg-background border-border"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Alternatives (comma-separated)</Label>
            <Textarea
              value={form.alternatives}
              onChange={(e) => set("alternatives", e.target.value)}
              placeholder="e.g. RC-2025-012, RC-2025-015"
              rows={2}
              className="bg-background border-border"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Upload Discontinued Dialog ─────────────────────────────

interface UploadDiscontinuedDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}

function UploadDiscontinuedDialog({
  open,
  onOpenChange,
  onDone,
}: UploadDiscontinuedDialogProps) {
  const { toast } = useToast();
  const [parsed, setParsed] = useState<Omit<DiscontinuedItem, "id">[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsed(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast({ title: "Failed to read file", variant: "destructive" });
      return;
    }
    const rows = parseCSV(text);
    if (rows.length === 0) {
      toast({ title: "CSV file is empty", variant: "destructive" });
      setParsed(null);
      return;
    }
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const expected = [
      "itemcode",
      "description",
      "unit",
      "lastrcprice",
      "lastrcyear",
      "discontinueddate",
      "reason",
      "alternatives",
    ];
    const idx: Record<string, number> = {};
    expected.forEach((h) => {
      const i = headers.indexOf(h);
      if (i >= 0) idx[h] = i;
    });
    if (!("itemcode" in idx) || !("description" in idx)) {
      toast({
        title: "Missing required columns",
        description: "ItemCode and Description columns are required.",
        variant: "destructive",
      });
      setParsed(null);
      return;
    }
    const dataRows = rows.slice(1);
    const items: Omit<DiscontinuedItem, "id">[] = dataRows
      .map((r) => ({
        itemCode: (r[idx["itemcode"]] ?? "").trim(),
        description: (r[idx["description"]] ?? "").trim(),
        unit: (r[idx["unit"]] ?? "NOS").trim() || "NOS",
        lastRCPrice: Number((r[idx["lastrcprice"]] ?? "0").trim()) || 0,
        lastRCYear: (r[idx["lastrcyear"]] ?? "").trim(),
        discontinuedDate: (r[idx["discontinueddate"]] ?? "").trim(),
        reason: (r[idx["reason"]] ?? "").trim(),
        alternatives: (r[idx["alternatives"]] ?? "").trim(),
      }))
      .filter((i) => i.itemCode || i.description);

    if (items.length === 0) {
      toast({ title: "No data rows found in CSV", variant: "destructive" });
      setParsed(null);
      return;
    }
    setParsed(items);
  };

  const submit = async () => {
    if (!parsed || parsed.length === 0) {
      toast({ title: "No data to upload", variant: "destructive" });
      return;
    }
    setUploading(true);
    const res = await apiRequest("/api/rate-finder/discontinued", "POST", parsed);
    setUploading(false);
    if (res.ok) {
      toast({ title: `Uploaded ${parsed.length} discontinued items` });
      reset();
      onDone();
    } else {
      toast({
        title: "Upload failed",
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
          <DialogTitle className="text-foreground">Upload Discontinued List (CSV)</DialogTitle>
          <DialogDescription>
            Columns: ItemCode, Description, Unit, LastRCPrice, LastRCYear, DiscontinuedDate, Reason,
            Alternatives
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Choose CSV File
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                downloadCSV("discontinued-template.csv", DISCONTINUED_TEMPLATE)
              }
            >
              <Download className="h-4 w-4" /> Download Template
            </Button>
          </div>
          {fileName && (
            <p className="text-sm text-muted-foreground">
              Selected: <span className="text-foreground font-medium">{fileName}</span>
            </p>
          )}
          {parsed && (
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Preview ({parsed.length} rows)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={reset}
                >
                  Reset
                </Button>
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Item Code</TableHead>
                      <TableHead className="text-muted-foreground">Description</TableHead>
                      <TableHead className="text-muted-foreground">Last Price</TableHead>
                      <TableHead className="text-muted-foreground">Year</TableHead>
                      <TableHead className="text-muted-foreground">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 50).map((p, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="font-medium text-foreground">
                          {p.itemCode}
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground truncate max-w-[200px]"
                          title={p.description}
                        >
                          {p.description}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatCurrency(p.lastRCPrice)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.lastRCYear || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.discontinuedDate || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsed.length > 50 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    ... and {parsed.length - 50} more rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!parsed || uploading} className="gap-1.5">
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload {parsed ? `${parsed.length} ` : ""}Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Upload Discontinue by Rate Code Dialog ─────────────────────────────
//
// Single-column CSV upload: just a list of Rate Codes.
// For each Rate Code, the matching RateContract items are looked up,
// turned into DiscontinuedItem records (POST bulk array), and the
// corresponding RC entries are DELETEd so they disappear from the RC list.
//
// Net effect: items "move" from the RC list to the Discontinued list.

interface UploadDiscontinueByRateCodeDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rcItems: RCItem[] | null;
  onDone: () => void;
}

interface PreviewRow {
  rateCode: string;
  matches: RCItem[];
}

function UploadDiscontinueByRateCodeDialog({
  open,
  onOpenChange,
  rcItems,
  onDone,
}: UploadDiscontinueByRateCodeDialogProps) {
  const { toast } = useToast();
  const [parsedCodes, setParsedCodes] = useState<string[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsedCodes(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast({ title: "Failed to read file", variant: "destructive" });
      return;
    }
    const rows = parseCSV(text);
    if (rows.length === 0) {
      toast({ title: "CSV file is empty", variant: "destructive" });
      setParsedCodes(null);
      return;
    }
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    // Look for a "rate code" column. If not found, assume the file is a
    // single-column list of rate codes (with or without a header row).
    let rcCol = headers.findIndex(
      (h) => h === "rate code" || h === "ratecode" || h === "rate_code"
    );
    let dataRows: string[][];
    if (rcCol >= 0) {
      dataRows = rows.slice(1);
    } else {
      rcCol = 0;
      const firstVal = (rows[0][0] || "").trim().toLowerCase();
      // If the first row literally says "rate code" treat it as a header.
      if (
        firstVal === "rate code" ||
        firstVal === "ratecode" ||
        firstVal === "rate_code"
      ) {
        dataRows = rows.slice(1);
      } else {
        dataRows = rows;
      }
    }
    const codes = dataRows
      .map((r) => (r[rcCol] || "").trim())
      .filter(Boolean)
      // Preserve order but de-duplicate (case-insensitive).
      .filter(
        (c, i, arr) =>
          arr.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i
      );

    if (codes.length === 0) {
      toast({ title: "No rate codes found in CSV", variant: "destructive" });
      setParsedCodes(null);
      return;
    }
    setParsedCodes(codes);
  };

  // Build a preview: each code → matched rcItems (case-insensitive).
  const preview: PreviewRow[] = useMemo(() => {
    if (!parsedCodes) return [];
    return parsedCodes.map((code) => {
      const matches = (rcItems ?? []).filter(
        (r) => (r.rateCode || "").toLowerCase() === code.toLowerCase()
      );
      return { rateCode: code, matches };
    });
  }, [parsedCodes, rcItems]);

  const totalMatches = preview.reduce((s, p) => s + p.matches.length, 0);
  const matchedCodes = preview.filter((p) => p.matches.length > 0).length;
  const unmatchedCodes = preview.length - matchedCodes;

  const submit = async () => {
    if (!parsedCodes || parsedCodes.length === 0) {
      toast({ title: "No data to upload", variant: "destructive" });
      return;
    }
    const allMatches = preview.flatMap((p) => p.matches);
    if (allMatches.length === 0) {
      toast({
        title: "No matching RC items found",
        description:
          "None of the supplied Rate Codes matched any RateContract item. Check the codes and try again.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    const today = new Date().toISOString().slice(0, 10);
    const discontinuePayload = allMatches.map((rc) => ({
      itemCode: rc.itemCode,
      description: rc.description,
      unit: rc.unit || "NOS",
      lastRCPrice: rc.rcPrice || 0,
      lastRCYear: rc.rcYear || null,
      discontinuedDate: today,
      reason: "Discontinued via bulk upload",
      alternatives: null,
    }));

    // 1) Bulk-create discontinued items.
    const postRes = await apiRequest(
      "/api/rate-finder/discontinued",
      "POST",
      discontinuePayload
    );
    if (!postRes.ok) {
      setUploading(false);
      toast({
        title: "Failed to create discontinued items",
        description: postRes.error,
        variant: "destructive",
      });
      return;
    }

    // 2) Delete the matched RC items one-by-one so they leave the RC list.
    let deletedCount = 0;
    let failedDeletes = 0;
    for (const rc of allMatches) {
      const delRes = await apiRequest(`/api/rate-finder/rc/${rc.id}`, "DELETE");
      if (delRes.ok) deletedCount++;
      else failedDeletes++;
    }

    setUploading(false);
    toast({
      title: `${allMatches.length} items moved from RC list to Discontinued list`,
      description: `${deletedCount} RC item${
        deletedCount !== 1 ? "s" : ""
      } deleted from RC list${
        failedDeletes > 0 ? ` · ${failedDeletes} delete(s) failed` : ""
      } · ${unmatchedCodes} rate code${
        unmatchedCodes !== 1 ? "s" : ""
      } had no match`,
    });
    reset();
    onDone();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Upload Discontinue List (by Rate Code)
          </DialogTitle>
          <DialogDescription>
            Upload a single-column CSV containing only a list of{" "}
            <span className="text-foreground font-medium">Rate Codes</span>.
            Each matching RateContract item will be moved into the Discontinued
            list (with last RC price/year preserved) and removed from the RC
            list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Choose CSV File
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                downloadCSV(
                  "discontinue-by-rate-code-template.csv",
                  DISCONTINUE_BY_RC_TEMPLATE
                )
              }
            >
              <Download className="h-4 w-4" /> Download Template
            </Button>
          </div>

          {fileName && (
            <p className="text-sm text-muted-foreground">
              Selected:{" "}
              <span className="text-foreground font-medium">{fileName}</span>
            </p>
          )}

          {parsedCodes && (
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  Preview · {parsedCodes.length} rate code
                  {parsedCodes.length !== 1 ? "s" : ""}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <CustomBadge className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30">
                    {matchedCodes} matched
                  </CustomBadge>
                  <CustomBadge className="bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/30">
                    {totalMatches} RC item{totalMatches !== 1 ? "s" : ""} to move
                  </CustomBadge>
                  {unmatchedCodes > 0 && (
                    <CustomBadge className="bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30">
                      {unmatchedCodes} no match
                    </CustomBadge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={reset}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">
                        Rate Code
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Matched Item(s)
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right">
                        Last RC Price
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        RC Year
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 100).map((p, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="font-mono text-foreground whitespace-nowrap">
                          {p.rateCode}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.matches.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {p.matches.slice(0, 3).map((m) => (
                                <span
                                  key={m.id}
                                  className="truncate max-w-[280px]"
                                  title={m.description}
                                >
                                  {m.description}
                                  {m.supplier ? ` · ${m.supplier}` : ""}
                                </span>
                              ))}
                              {p.matches.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{p.matches.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-500 dark:text-amber-400 italic">
                              No match
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-foreground text-right whitespace-nowrap">
                          {p.matches.length > 0
                            ? formatCurrency(p.matches[0].rcPrice)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {p.matches.length > 0 ? p.matches[0].rcYear : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.matches.length > 0 ? (
                            <CustomBadge className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30">
                              Will move
                            </CustomBadge>
                          ) : (
                            <CustomBadge className="bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30">
                              Skipped
                            </CustomBadge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.length > 100 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    ... and {preview.length - 100} more rate codes
                  </p>
                )}
              </div>
            </div>
          )}

          {!parsedCodes && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Choose a CSV file with a single{" "}
              <span className="font-mono text-foreground">Rate code</span>{" "}
              column to preview the matched RC items here.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!parsedCodes || uploading || totalMatches === 0}
            className="gap-1.5"
          >
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading
              ? "Moving items..."
              : `Move ${totalMatches || 0} Item${
                  totalMatches !== 1 ? "s" : ""
                } to Discontinued`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
