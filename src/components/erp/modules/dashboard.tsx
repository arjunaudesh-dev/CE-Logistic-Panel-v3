"use client";
import { useMemo, useState, useEffect } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { StatCard } from "@/components/erp/stat-card";
import { PageHeader } from "@/components/erp/page-header";
import { LoadingState, ErrorState } from "@/components/erp/states";
import { CustomBadge } from "@/components/erp/badges";
import {
  LayoutDashboard,
  Wallet,
  TrendingDown,
  TrendingUp,
  FolderKanban,
  FileText,
  Warehouse,
  PackageCheck,
  ArrowRight,
  Percent,
  Coins,
  Trophy,
  FileBarChart,
  PieChart as PieChartIcon,
  Gauge,
  Settings,
  Eye,
  EyeOff,
  Search,
  CheckCheck,
  Square,
  Loader2,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  formatCurrency,
  formatNumber,
  utilizationColor,
  projectStatusColor,
} from "@/lib/constants";
import { ModuleId } from "../nav";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface TopProject {
  id: string;
  name: string;
  voteNumber: string;
  voteAllocation: number;
  committed: number;
  actualSpent: number;
  balance: number;
  utilization: number;
  fileCount: number;
  inProcessFiles?: number;
  completedFiles?: number;
  fileValue: number;
  status: string;
}

interface Project {
  id: string;
  name: string;
  nameAbbreviation?: string | null;
  voteNumber: string;
  voteAllocation: number;
  committed: number;
  actualSpent: number;
  utilization?: number;
  status: string;
  projectType?: string | null;
  showOnDashboard?: boolean;
}

interface Stats {
  projects: { total: number; active: number; voteAllocation: number; committed: number; actualSpent: number; balance: number };
  procurement: { total: number; pendingCollection: number };
  stores: { totalItems: number; stockValue: number; lowStock: number; zones: number };
  rateFinder: { rcCount: number };
  collection: { partSupplyActive: number; dailyToday: number; dailyTotal: number };
  topProjects: TopProject[];
}

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#64748b"];

// Donut palette — adapts to light/dark theme via the chart-* CSS variables.
const DONUT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#64748b",
];

const UTILIZATION_COLORS: Record<string, string> = {
  "Under 50%": "#22c55e",
  "50-70%": "#3b82f6",
  "70-90%": "#f59e0b",
  "Over 90%": "#ef4444",
};

const UTIL_BUCKETS = [
  { name: "Under 50%", min: 0, max: 50 },
  { name: "50-70%", min: 50, max: 70 },
  { name: "70-90%", min: 70, max: 90 },
  { name: "Over 90%", min: 90, max: Infinity },
];

export function Dashboard({ onNavigate }: { onNavigate: (m: ModuleId) => void }) {
  const { data: stats, loading, error, refresh: refreshStats } = useFetch<Stats>("/api/stats");
  const { data: procurement } = useFetch<{ presentPosition: string }[]>("/api/procurement");
  const { data: allProjects, refresh: refreshProjects } = useFetch<Project[]>("/api/projects");
  const { toast } = useToast();

  // 5-minute auto-refresh interval for dashboard projects & stats
  useEffect(() => {
    const interval = setInterval(() => {
      refreshProjects();
      refreshStats();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshProjects, refreshStats]);

  // toggle for infographics: "value" shows currency, "percent" shows utilization %
  const [viewMode, setViewMode] = useState<"value" | "percent">("value");
  // responsive limit for displaying active projects
  const [activeProjectsLimit, setActiveProjectsLimit] = useState<number | "ALL">(6);
  // manage dashboard projects dialog
  const [manageOpen, setManageOpen] = useState(false);
  // hovered slice index for donut highlight
  const [activeAllocIdx, setActiveAllocIdx] = useState<number | null>(null);
  const [activeUtilIdx, setActiveUtilIdx] = useState<number | null>(null);

  // ── Visible projects: showOnDashboard === true OR undefined (legacy) ──
  const visibleProjects = useMemo<Project[]>(() => {
    return (allProjects ?? []).filter((p) => p.showOnDashboard !== false);
  }, [allProjects]);

  // ── Donut 1: Project Allocation Distribution ──
  // Top 5 by allocation; group the rest as "Others".
  const allocationData = useMemo(() => {
    const source = (allProjects ?? []) as Project[];
    const items = source
      .filter((p) => p.showOnDashboard !== false && (p.voteAllocation ?? 0) > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        value: p.voteAllocation ?? 0,
      }))
      .sort((a, b) => b.value - a.value);

    const top = items.slice(0, 5);
    const rest = items.slice(5);

    const slices = top.map((d, i) => ({
      name: d.name,
      value: d.value,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      isOthers: false,
    }));
    if (rest.length > 0) {
      slices.push({
        name: `Others (${rest.length} project${rest.length === 1 ? "" : "s"})`,
        value: rest.reduce((s, d) => s + d.value, 0),
        color: DONUT_COLORS[5],
        isOthers: true,
      });
    }
    const total = slices.reduce((s, d) => s + d.value, 0);
    return { slices, total, projectCount: items.length };
  }, [allProjects]);

  // ── Donut 2: Project Utilization buckets ──
  const utilBucketData = useMemo(() => {
    const source = (allProjects ?? []) as Project[];
    return UTIL_BUCKETS.map((b) => ({
      name: b.name,
      value: source.filter((p) => {
        if (p.showOnDashboard === false) return false;
        const u = p.utilization ?? 0;
        return u >= b.min && u < b.max;
      }).length,
    }));
  }, [allProjects]);
  const totalProjectsCounted = utilBucketData.reduce((s, d) => s + d.value, 0);

  // ── Top projects for "Most Active / Valued" section ──
  const visibleTopProjects = useMemo<TopProject[]>(() => {
    const tps = stats?.topProjects ?? [];
    if (!allProjects) return tps;
    const visibleIds = new Set(
      allProjects.filter((p) => p.showOnDashboard !== false).map((p) => p.id)
    );
    return tps.filter((p) => visibleIds.has(p.id));
  }, [stats, allProjects]);

  // Displayed projects list based on limit / window size
  const displayedActiveProjects = useMemo(() => {
    if (activeProjectsLimit === "ALL") return visibleTopProjects;
    return visibleTopProjects.slice(0, activeProjectsLimit);
  }, [visibleTopProjects, activeProjectsLimit]);

  // ── Toggle showOnDashboard handler ──
  const handleToggleVisibility = async (project: Project, next: boolean) => {
    const res = await apiRequest(`/api/projects/${project.id}`, "PUT", {
      showOnDashboard: next,
    });
    if (res.ok) {
      toast({
        title: next ? "Project shown on dashboard" : "Project hidden from dashboard",
        description: project.name,
      });
      refreshProjects();
      refreshStats();
    } else {
      toast({
        title: "Update failed",
        description: res.error || "Could not update project visibility",
        variant: "destructive",
      });
    }
  };

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !stats) return <ErrorState message={error || "No data"} />;

  const topProjects = visibleTopProjects;
  const totalProjectsAll = allProjects?.length ?? 0;

  // For the chart: show Allocation, Committed, Spent
  const projectChart = displayedActiveProjects.map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name,
    Allocation: viewMode === "value" ? Math.round(p.voteAllocation / 1000000) : Math.round(p.utilization),
    Committed: viewMode === "value" ? Math.round(p.committed / 1000000) : p.voteAllocation > 0 ? Math.round((p.committed / p.voteAllocation) * 100) : 0,
    Spent: viewMode === "value" ? Math.round(p.actualSpent / 1000000) : Math.round(p.utilization),
  }));

  // position distribution for pie
  const posCounts: Record<string, number> = {};
  procurement?.forEach((f) => {
    posCounts[f.presentPosition] = (posCounts[f.presentPosition] || 0) + 1;
  });
  const posChart = Object.entries(posCounts).map(([name, value]) => ({ name, value }));

  // Rich tooltip for the allocation donut
  const renderAllocTooltip = (props: any) => {
    if (!props?.active || !props?.payload || props.payload.length === 0) return null;
    const item = props.payload[0];
    const slice = item?.payload as
      | { name?: string; value?: number; color?: string; isOthers?: boolean }
      | undefined;
    if (!slice) return null;
    const value = slice.value ?? 0;
    const pct = allocationData.total > 0 ? (value / allocationData.total) * 100 : 0;
    return (
      <div className="bg-popover text-popover-foreground border border-border/80 rounded-xl p-3 shadow-xl max-w-[280px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm shrink-0 shadow-2xs"
            style={{ background: slice.color ?? item?.color ?? "#3b82f6" }}
          />
          <span className="text-xs font-bold text-foreground truncate">{slice.name}</span>
        </div>
        <div className="text-base font-bold text-foreground leading-tight tabular-nums">
          {formatCurrency(value)}
        </div>
        <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
          {pct.toFixed(1)}% of total allocation
        </div>
      </div>
    );
  };

  // Rich tooltip for the utilization donut
  const renderUtilTooltip = (props: any) => {
    if (!props?.active || !props?.payload || props.payload.length === 0) return null;
    const item = props.payload[0];
    const slice = item?.payload as
      | { name?: string; value?: number; color?: string }
      | undefined;
    if (!slice) return null;
    const value = slice.value ?? 0;
    const pct = totalProjectsCounted > 0 ? (value / totalProjectsCounted) * 100 : 0;
    return (
      <div className="bg-popover text-popover-foreground border border-border/80 rounded-xl p-3 shadow-xl max-w-[280px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm shrink-0 shadow-2xs"
            style={{ background: slice.color ?? item?.color ?? "#22c55e" }}
          />
          <span className="text-xs font-bold text-foreground">{slice.name}</span>
        </div>
        <div className="text-base font-bold text-foreground leading-tight tabular-nums">
          {value} project{value === 1 ? "" : "s"}
        </div>
        <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
          {pct.toFixed(1)}% of tracked projects
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Operational Dashboard"
        description="Real-time overview of dockyard operations, procurement & inventory"
        icon={LayoutDashboard}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("settings")}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer"
              title="Connected to XAMPP MySQL ncw_ps_db and Firebase cmsys-v2-1fb05"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CMSys Live</span>
            </button>
            <div className="flex items-center gap-1 bg-secondary/80 rounded-xl p-1 border border-border/60">
              <button
                onClick={() => setViewMode("value")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
                viewMode === "value" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Coins className="h-3.5 w-3.5 text-primary" /> By Value
            </button>
            <button
              onClick={() => setViewMode("percent")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
                viewMode === "percent" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Percent className="h-3.5 w-3.5 text-primary" /> By Percentage
            </button>
          </div>
        </div>
      }
    />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Vote Allocation"
          value={formatCurrency(stats.projects.voteAllocation)}
          icon={Wallet}
          accent="blue"
          sub={`${stats.projects.total} total projects`}
        />
        <StatCard
          label="Total Committed"
          value={formatCurrency(stats.projects.committed)}
          icon={TrendingUp}
          accent="amber"
          sub="Across active votes"
        />
        <StatCard
          label="Total Actual Spent"
          value={formatCurrency(stats.projects.actualSpent)}
          icon={TrendingDown}
          accent="red"
          sub={`Balance ${formatCurrency(stats.projects.balance)}`}
        />
        <StatCard
          label="Active Projects"
          value={stats.projects.active}
          icon={FolderKanban}
          accent="green"
          sub={`${stats.procurement.total} procurement files`}
        />
      </div>

      {/* Most Active / Most Valued Projects */}
      <div className="glass-card border border-border/80 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4.5 w-4.5 text-amber-400" />
            <h3 className="text-base font-bold text-foreground">
              Active Projects & Financial Utilization
            </h3>
            <span className="text-xs font-medium text-muted-foreground">
              ({viewMode === "value" ? "Rs. Values & Allocated Amounts" : "Utilization %"})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Display count selector for window size adaptability */}
            <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border/60 text-xs font-semibold">
              <span className="text-[10px] text-muted-foreground px-1.5 uppercase font-bold">Show:</span>
              <button
                onClick={() => setActiveProjectsLimit(6)}
                className={cn("px-2 py-0.5 rounded-lg transition-colors", activeProjectsLimit === 6 ? "bg-card text-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground")}
              >
                6
              </button>
              <button
                onClick={() => setActiveProjectsLimit(12)}
                className={cn("px-2 py-0.5 rounded-lg transition-colors", activeProjectsLimit === 12 ? "bg-card text-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground")}
              >
                12
              </button>
              <button
                onClick={() => setActiveProjectsLimit("ALL")}
                className={cn("px-2 py-0.5 rounded-lg transition-colors", activeProjectsLimit === "ALL" ? "bg-card text-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground")}
              >
                All ({topProjects.length})
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManageOpen(true)}
              className="h-8 rounded-xl text-xs font-bold"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Manage Dashboard
            </Button>
            <button
              onClick={() => onNavigate("projects")}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 ml-1"
            >
              View all projects <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Visibility count line */}
        <p className="text-xs font-medium text-muted-foreground mb-4">
          Showing{" "}
          <span className="font-bold text-foreground">{displayedActiveProjects.length}</span> of{" "}
          <span className="font-bold text-foreground">{topProjects.length}</span> active
          projects on dashboard ·{" "}
          <span className="font-bold text-foreground">{visibleProjects.length}</span> of{" "}
          <span className="font-bold text-foreground">{totalProjectsAll}</span> total projects visible
        </p>

        {topProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No projects to display. Use{" "}
            <button
              onClick={() => setManageOpen(true)}
              className="text-primary hover:underline font-medium"
            >
              Manage Dashboard Projects
            </button>{" "}
            to control what appears here.
          </p>
        ) : (
          <>
            {/* Chart */}
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={projectChart} barGap={3}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#2d3548" }}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#2d3548" }}
                    tickFormatter={(v) => (viewMode === "value" ? `${v}M` : `${v}%`)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1f2e",
                      border: "1px solid #2d3548",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value: number) =>
                      viewMode === "value" ? [`Rs. ${value}M`, ""] : [`${value}%`, ""]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Allocation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Committed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Responsive Active Projects Grid (adapts cleanly to screen width: 1 cols up to 6 cols on 2xl) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3.5">
              {displayedActiveProjects.map((p, idx) => {
                const util = p.utilization;
                const inProc = p.inProcessFiles ?? 0;
                const comp = p.completedFiles ?? Math.max(0, (p.fileCount || 0) - inProc);
                const allocatedVal = p.voteAllocation || 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => onNavigate("projects")}
                    className="glass-card rounded-2xl p-3.5 cursor-pointer hover:bg-secondary/70 transition-all border border-border/80 hover:border-primary/40 shadow-2xs hover:shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-muted-foreground">#{idx + 1}</span>
                            <h4 className="font-bold text-xs text-foreground truncate" title={p.name}>{p.name}</h4>
                          </div>
                          <p className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate">{p.voteNumber}</p>
                        </div>
                        <CustomBadge className={cn("border-0 shrink-0 text-[10px]", projectStatusColor(p.status))}>
                          {p.status}
                        </CustomBadge>
                      </div>

                      {/* Explicit Financial Breakdown including Allocated Values */}
                      <div className="grid grid-cols-2 gap-1.5 mb-2 text-center bg-secondary/60 rounded-xl p-2 border border-border/40">
                        <div>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Allocated</p>
                          <p className="text-xs font-bold text-primary tabular-nums">
                            {formatCurrency(allocatedVal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Balance</p>
                          <p className="text-xs font-bold text-emerald-500 tabular-nums">
                            {formatCurrency(p.balance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Committed</p>
                          <p className="text-xs font-bold text-amber-500 tabular-nums">
                            {formatCurrency(p.committed)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Actual Spent</p>
                          <p className="text-xs font-bold text-red-500 tabular-nums">
                            {formatCurrency(p.actualSpent)}
                          </p>
                        </div>
                      </div>

                      {/* Files In-Process + Actual Utilization Metrics */}
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                          <span className="flex items-center gap-1 truncate font-semibold text-foreground">
                            <FileText className="h-3 w-3 text-primary shrink-0" />
                            {inProc} In-Process + {comp} Actual
                          </span>
                          <span className="font-bold text-foreground tabular-nums ml-1">{util.toFixed(0)}%</span>
                        </div>

                        {/* Utilization progress bar against allocated */}
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex shadow-2xs">
                          <div
                            className="bg-amber-500 h-full transition-all"
                            style={{ width: `${Math.min(100, allocatedVal > 0 ? (p.committed / allocatedVal) * 100 : 0)}%` }}
                            title={`Committed: ${formatCurrency(p.committed)}`}
                          />
                          <div
                            className={cn("h-full transition-all", utilizationColor(util))}
                            style={{ width: `${Math.min(100, allocatedVal > 0 ? (p.actualSpent / allocatedVal) * 100 : 0)}%` }}
                            title={`Actual Spent: ${formatCurrency(p.actualSpent)}`}
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground text-right font-medium">
                          {p.fileCount || 0} Total Files
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Project Allocation Distribution + Utilization donuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Donut 1 — Project Allocation Distribution */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Project Allocation Distribution
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Top 5 projects by vote allocation · grouped &ldquo;Others&rdquo; tail (Rs.)
          </p>
          {allocationData.slices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Donut */}
              <div className="relative">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <defs>
                      {DONUT_COLORS.map((c, i) => (
                        <radialGradient key={i} id={`alloc-grad-${i}`} cx="50%" cy="50%" r="65%">
                          <stop offset="0%" stopColor={c} stopOpacity={0.85} />
                          <stop offset="100%" stopColor={c} stopOpacity={1} />
                        </radialGradient>
                      ))}
                    </defs>
                    <Pie
                      data={allocationData.slices}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      onMouseEnter={(_, idx) => setActiveAllocIdx(idx)}
                      onMouseLeave={() => setActiveAllocIdx(null)}
                      isAnimationActive
                      animationDuration={600}
                    >
                      {allocationData.slices.map((s, i) => (
                        <Cell
                          key={i}
                          fill={`url(#alloc-grad-${i % DONUT_COLORS.length})`}
                          stroke="var(--background, #0f1420)"
                          strokeWidth={1.5}
                          style={{
                            opacity:
                              activeAllocIdx === null || activeAllocIdx === i ? 1 : 0.4,
                            filter:
                              activeAllocIdx === i
                                ? "drop-shadow(0 0 10px rgba(59,130,246,0.55))"
                                : "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
                            transition: "opacity 220ms ease, filter 220ms ease",
                            cursor: "pointer",
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={renderAllocTooltip}
                      cursor={false}
                      wrapperStyle={{ outline: "none", zIndex: 50 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label — total allocation */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Total Allocation
                  </span>
                  <span className="text-lg font-bold text-foreground leading-tight">
                    {formatCurrency(allocationData.total)}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    across {allocationData.projectCount} project{allocationData.projectCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Legend with values */}
              <div
                className="space-y-1 max-h-[260px] overflow-y-auto pr-1"
                style={{ scrollbarWidth: "thin" }}
              >
                {allocationData.slices.map((s, i) => {
                  const pct =
                    allocationData.total > 0 ? (s.value / allocationData.total) * 100 : 0;
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setActiveAllocIdx(i)}
                      onMouseLeave={() => setActiveAllocIdx(null)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-default",
                        activeAllocIdx === i ? "bg-secondary/70" : "hover:bg-secondary/40"
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-sm shrink-0"
                        style={{ background: s.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {formatCurrency(s.value)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No project allocation data
            </p>
          )}
        </div>

        {/* Donut 2 — Project Utilization */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Project Utilization
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Distribution of visible projects by utilization bucket
          </p>
          {totalProjectsCounted > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Donut */}
              <div className="relative">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <defs>
                      {utilBucketData.map((b, i) => (
                        <radialGradient key={i} id={`util-grad-${i}`} cx="50%" cy="50%" r="65%">
                          <stop
                            offset="0%"
                            stopColor={UTILIZATION_COLORS[b.name] ?? "#64748b"}
                            stopOpacity={0.85}
                          />
                          <stop
                            offset="100%"
                            stopColor={UTILIZATION_COLORS[b.name] ?? "#64748b"}
                            stopOpacity={1}
                          />
                        </radialGradient>
                      ))}
                    </defs>
                    <Pie
                      data={utilBucketData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      onMouseEnter={(_, idx) => setActiveUtilIdx(idx)}
                      onMouseLeave={() => setActiveUtilIdx(null)}
                      isAnimationActive
                      animationDuration={600}
                    >
                      {utilBucketData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={`url(#util-grad-${i})`}
                          stroke="var(--background, #0f1420)"
                          strokeWidth={1.5}
                          style={{
                            opacity:
                              activeUtilIdx === null || activeUtilIdx === i ? 1 : 0.4,
                            filter:
                              activeUtilIdx === i
                                ? `drop-shadow(0 0 10px ${UTILIZATION_COLORS[entry.name] ?? "#64748b"}99)`
                                : "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
                            transition: "opacity 220ms ease, filter 220ms ease",
                            cursor: "pointer",
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={renderUtilTooltip}
                      cursor={false}
                      wrapperStyle={{ outline: "none", zIndex: 50 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label — total projects counted */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Total Tracked
                  </span>
                  <span className="text-3xl font-bold text-foreground leading-tight">
                    {totalProjectsCounted}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    project{totalProjectsCounted === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Legend with counts + percentages */}
              <div className="space-y-1">
                {utilBucketData.map((b, i) => {
                  const pct =
                    totalProjectsCounted > 0 ? (b.value / totalProjectsCounted) * 100 : 0;
                  return (
                    <div
                      key={b.name}
                      onMouseEnter={() => setActiveUtilIdx(i)}
                      onMouseLeave={() => setActiveUtilIdx(null)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-default",
                        activeUtilIdx === i ? "bg-secondary/70" : "hover:bg-secondary/40"
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-sm shrink-0"
                        style={{ background: UTILIZATION_COLORS[b.name] ?? "#64748b" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">{b.name}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {b.value} project{b.value === 1 ? "" : "s"} · {pct.toFixed(1)}%
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
                        {b.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No utilization data
            </p>
          )}
        </div>
      </div>

      {/* Secondary charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-primary" />
            Project Financials {viewMode === "value" ? "(Rs. Millions)" : "(Utilization %)"}
          </h3>
          {projectChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={projectChart}>
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#2d3548" }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#2d3548" }} tickFormatter={(v) => (viewMode === "value" ? `${v}M` : `${v}%`)} />
                <Tooltip contentStyle={{ background: "#1a1f2e", border: "1px solid #2d3548", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Allocation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Committed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">No project data</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Procurement Files by Position</h3>
          {posChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={posChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                  {posChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1f2e", border: "1px solid #2d3548", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">No procurement data</p>
          )}
        </div>
      </div>

      {/* Module quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ModuleLink
          title="Procurement Files"
          desc={`${stats.procurement.total} files · ${stats.procurement.pendingCollection} pending collection`}
          icon={FileText}
          accent="text-blue-400 bg-blue-500/10"
          onClick={() => onNavigate("procurement")}
        />
        <ModuleLink
          title="Store Management"
          desc={`${stats.stores.totalItems} items · ${stats.stores.lowStock} low stock · ${formatCurrency(stats.stores.stockValue)} value`}
          icon={Warehouse}
          accent="text-amber-400 bg-amber-500/10"
          onClick={() => onNavigate("stores")}
        />
        <ModuleLink
          title="Collection"
          desc={`${stats.collection.partSupplyActive} active part-supply · ${stats.collection.dailyToday} collected today`}
          icon={PackageCheck}
          accent="text-emerald-400 bg-emerald-500/10"
          onClick={() => onNavigate("collection")}
        />
      </div>

      {/* Manage Dashboard Projects dialog */}
      <ManageDashboardProjectsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        projects={allProjects ?? []}
        onToggle={handleToggleVisibility}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Manage Dashboard Projects dialog                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

function ManageDashboardProjectsDialog({
  open,
  onOpenChange,
  projects,
  onToggle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onToggle: (project: Project, next: boolean) => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.voteNumber ?? "").toLowerCase().includes(q) ||
        (p.nameAbbreviation ?? "").toLowerCase().includes(q)
    );
  }, [projects, search]);

  const visibleCount = projects.filter((p) => p.showOnDashboard !== false).length;
  const filteredHidden = filtered.filter((p) => p.showOnDashboard === false);
  const filteredVisible = filtered.filter((p) => p.showOnDashboard !== false);

  const runToggle = async (p: Project, next: boolean) => {
    setTogglingIds((prev) => {
      const n = new Set(prev);
      n.add(p.id);
      return n;
    });
    try {
      await onToggle(p, next);
    } finally {
      setTogglingIds((prev) => {
        const n = new Set(prev);
        n.delete(p.id);
        return n;
      });
    }
  };

  const handleSelectAll = async () => {
    await Promise.all(filteredHidden.map((p) => runToggle(p, true)));
  };

  const handleDeselectAll = async () => {
    await Promise.all(filteredVisible.map((p) => runToggle(p, false)));
  };

  const totalToggling = togglingIds.size;
  const allFilteredVisible =
    filtered.length > 0 && filteredHidden.length === 0;
  const allFilteredHidden = filteredVisible.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col gap-3 p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-primary" />
            Manage Dashboard Projects
          </DialogTitle>
          <DialogDescription>
            Toggle which projects appear on the dashboard. This controls visibility only &mdash; it
            does not delete projects.{" "}
            <span className="font-medium text-foreground">
              {visibleCount} of {projects.length}
            </span>{" "}
            projects currently visible.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar: search + bulk actions */}
        <div className="px-5 py-3 flex items-center gap-2 flex-wrap border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, vote number, or abbreviation…"
              className="pl-8 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={allFilteredVisible || filtered.length === 0 || totalToggling > 0}
            className="h-9"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={allFilteredHidden || filtered.length === 0 || totalToggling > 0}
            className="h-9"
          >
            <Square className="h-3.5 w-3.5 mr-1.5" />
            Deselect All
          </Button>
        </div>

        {/* Project list */}
        <div
          className="flex-1 overflow-y-auto px-2 min-h-[220px]"
          style={{ scrollbarWidth: "thin" }}
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {projects.length === 0
                ? "No projects available."
                : "No projects match your search."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((p) => {
                const visible = p.showOnDashboard !== false;
                const toggling = togglingIds.has(p.id);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/40 transition-colors"
                  >
                    <Checkbox
                      id={`dash-${p.id}`}
                      checked={visible}
                      onCheckedChange={(checked) => runToggle(p, checked === true)}
                      disabled={toggling}
                      aria-label={`Toggle dashboard visibility for ${p.name}`}
                    />
                    <label
                      htmlFor={`dash-${p.id}`}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">
                          {p.name}
                        </span>
                        {p.nameAbbreviation && (
                          <CustomBadge className="border-0 bg-primary/15 text-primary shrink-0 text-[10px]">
                            {p.nameAbbreviation}
                          </CustomBadge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p.voteNumber || "—"} · {formatCurrency(p.voteAllocation ?? 0)}
                        {p.utilization != null && (
                          <> · {Math.round(p.utilization)}% util</>
                        )}
                      </p>
                    </label>
                    <CustomBadge
                      className={cn("border-0 shrink-0", projectStatusColor(p.status))}
                    >
                      {p.status}
                    </CustomBadge>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs shrink-0 w-[88px] justify-end",
                        visible ? "text-emerald-500" : "text-muted-foreground"
                      )}
                    >
                      {toggling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : visible ? (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span className="text-[11px]">Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          <span className="text-[11px]">Hidden</span>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t border-border sm:justify-between gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length} of {projects.length} projects · {visibleCount} visible on
            dashboard
            {totalToggling > 0 && (
              <span className="ml-2 text-primary inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating…
              </span>
            )}
          </span>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModuleLink({
  title,
  desc,
  icon: Icon,
  accent,
  onClick,
}: {
  title: string;
  desc: string;
  icon: typeof FileText;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group bg-card border border-border rounded-xl p-5 text-left hover:border-primary/40 transition-colors flex items-start gap-4"
    >
      <div className={cn("h-11 w-11 rounded-lg flex items-center justify-center shrink-0", accent)}>
        <Icon className="h-5.5 w-5.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
    </button>
  );
}
