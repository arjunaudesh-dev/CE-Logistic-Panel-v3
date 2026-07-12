"use client";
import { useState } from "react";
import { useFetch } from "@/lib/use-fetch";
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
  fileValue: number;
  status: string;
}

interface Stats {
  projects: { total: number; active: number; voteAllocation: number; committed: number; actualSpent: number; balance: number };
  procurement: { total: number; pendingCollection: number };
  stores: { totalItems: number; stockValue: number; lowStock: number; zones: number };
  rateFinder: { rcCount: number };
  collection: { partSupplyActive: number; dailyToday: number; dailyTotal: number };
  topProjects: TopProject[];
}

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

export function Dashboard({ onNavigate }: { onNavigate: (m: ModuleId) => void }) {
  const { data: stats, loading, error } = useFetch<Stats>("/api/stats");
  const { data: procurement } = useFetch<{ presentPosition: string }[]>("/api/procurement");
  // toggle for infographics: "value" shows currency, "percent" shows utilization %
  const [viewMode, setViewMode] = useState<"value" | "percent">("value");

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !stats) return <ErrorState message={error || "No data"} />;

  const topProjects = stats.topProjects || [];

  // For the chart: in value mode show Rs. millions, in percent mode show utilization %
  const projectChart = topProjects.map((p) => ({
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

  return (
    <div>
      <PageHeader
        title="Operational Dashboard"
        description="Real-time overview of dockyard operations, procurement & inventory"
        icon={LayoutDashboard}
        actions={
          <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-1">
            <button
              onClick={() => setViewMode("value")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === "value" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Coins className="h-3.5 w-3.5" /> By Value
            </button>
            <button
              onClick={() => setViewMode("percent")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === "percent" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Percent className="h-3.5 w-3.5" /> By Percentage
            </button>
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
          sub={`${stats.projects.total} projects`}
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
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Most Active / Valued Projects
            <span className="text-xs text-muted-foreground font-normal">
              ({viewMode === "value" ? "Rs. Millions" : "Utilization %"})
            </span>
          </h3>
          <button
            onClick={() => onNavigate("projects")}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all projects <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {topProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No projects yet.</p>
        ) : (
          <>
            {/* Chart */}
            <div className="mb-5">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={projectChart} barGap={2}>
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
                      borderRadius: 8,
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

            {/* Project detail cards (numerical) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {topProjects.map((p, idx) => {
                const util = p.utilization;
                return (
                  <div
                    key={p.id}
                    onClick={() => onNavigate("projects")}
                    className="bg-secondary/40 rounded-lg p-3 cursor-pointer hover:bg-secondary/70 transition-colors border border-transparent hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                          <h4 className="font-medium text-sm text-foreground truncate">{p.name}</h4>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{p.voteNumber} · {p.fileCount} files</p>
                      </div>
                      <CustomBadge className={cn("border-0 shrink-0", projectStatusColor(p.status))}>
                        {p.status}
                      </CustomBadge>
                    </div>
                    {/* numerical breakdown */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div>
                        <p className="text-[9px] uppercase text-muted-foreground">Allocation</p>
                        <p className="text-xs font-semibold text-blue-400">
                          {viewMode === "value" ? formatCurrency(p.voteAllocation) : "100%"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-muted-foreground">Committed</p>
                        <p className="text-xs font-semibold text-amber-400">
                          {viewMode === "value"
                            ? formatCurrency(p.committed)
                            : p.voteAllocation > 0
                            ? `${Math.round((p.committed / p.voteAllocation) * 100)}%`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-muted-foreground">Spent</p>
                        <p className="text-xs font-semibold text-red-400">
                          {viewMode === "value" ? formatCurrency(p.actualSpent) : `${Math.round(util)}%`}
                        </p>
                      </div>
                    </div>
                    {/* utilization bar */}
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", utilizationColor(util))}
                          style={{ width: `${Math.min(util, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
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
    </div>
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
