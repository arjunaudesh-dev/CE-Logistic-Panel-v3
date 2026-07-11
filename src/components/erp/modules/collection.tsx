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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  COLLECTION_STATUSES,
  PART_SUPPLY_STATUSES,
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
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="part-supply" className="gap-1.5">
            <Layers className="h-4 w-4" /> Part Supply
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Daily Collection
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

  // Stat figures
  const pendingItems = (items ?? []).filter(
    (i) => i.status === "Pending" || i.status === "In Progress"
  );
  const pendingValue = pendingItems.reduce(
    (s, i) => s + (i.expectedQty || 0),
    0
  );
  const activePartSupply =
    stats?.collection?.partSupplyActive ??
    (partSupply ?? []).filter((o) => o.status === "Active").length;
  const collectedItems = (items ?? []).filter(
    (i) => i.status === "Collected"
  );
  const todayStr = todayISO();
  const todayDailyCount = (daily ?? []).filter(
    (d) => d.date === todayStr
  ).length;

  // Trend chart — last 7 days
  const trendData = useMemo(() => {
    const days = getLast7Days();
    const map = new Map<string, number>();
    (daily ?? []).forEach((d) => {
      map.set(d.date, (map.get(d.date) || 0) + (d.qty || 0));
    });
    return days.map((date) => ({
      name: formatDateLabel(date),
      qty: map.get(date) || 0,
    }));
  }, [daily]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    (items ?? []).forEach((i) => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    // ensure stable order using COLLECTION_STATUSES
    return COLLECTION_STATUSES.filter((s) => counts[s] > 0).map((name) => ({
      name,
      value: counts[name],
    }));
  }, [items]);

  const recentDaily = (daily ?? []).slice(0, 5);

  if (itemsLoading) return <LoadingState label="Loading dashboard..." />;
  if (itemsError) return <ErrorState message={itemsError} />;

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Items to be Received"
          value={pendingItems.length}
          icon={PackageX}
          accent="blue"
          sub={`${formatNumber(pendingValue)} qty expected`}
        />
        <StatCard
          label="Part Supply Items"
          value={activePartSupply}
          icon={Layers}
          accent="amber"
          sub="Active part-supply orders"
        />
        <StatCard
          label="Collected Items"
          value={collectedItems.length}
          icon={PackageCheck}
          accent="green"
          sub={`${todayDailyCount} collected today`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Collection Trend — Last 7 Days
          </h3>
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
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1f2e",
                    border: "1px solid #2d3548",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="qty"
                  name="Qty Collected"
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
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Items by Status
          </h3>
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
            Last 5
          </CustomBadge>
        </div>
        {recentDaily.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No recent collections"
            description="Daily collections will appear here once recorded."
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
                    {formatNumber(d.qty)} qty · {d.receivedFrom || "—"} ·{" "}
                    {formatFullDate(d.date)}
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
