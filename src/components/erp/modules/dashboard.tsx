"use client";
import { useFetch } from "@/lib/use-fetch";
import { StatCard } from "@/components/erp/stat-card";
import { PageHeader } from "@/components/erp/page-header";
import { LoadingState, ErrorState } from "@/components/erp/states";
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
import { formatCurrency, positionColor } from "@/lib/constants";
import { ModuleId } from "../nav";
import { cn } from "@/lib/utils";

interface Stats {
  projects: { total: number; active: number; voteAllocation: number; committed: number; actualSpent: number; balance: number };
  procurement: { total: number; pendingCollection: number };
  stores: { totalItems: number; stockValue: number; lowStock: number; zones: number };
  rateFinder: { rcCount: number };
  collection: { partSupplyActive: number; dailyToday: number; dailyTotal: number };
}

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

export function Dashboard({ onNavigate }: { onNavigate: (m: ModuleId) => void }) {
  const { data: stats, loading, error } = useFetch<Stats>("/api/stats");
  const { data: projects } = useFetch<
    { name: string; voteAllocation: number; actualSpent: number; utilization: number }[]
  >("/api/projects");
  const { data: procurement } = useFetch<
    { presentPosition: string }[]
  >("/api/procurement");

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !stats) return <ErrorState message={error || "No data"} />;

  const projectChart =
    projects?.map((p) => ({
      name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
      Budget: Math.round(p.voteAllocation / 1000000),
      Spent: Math.round(p.actualSpent / 1000000),
    })) ?? [];

  // position distribution for pie
  const posCounts: Record<string, number> = {};
  procurement?.forEach((f) => {
    posCounts[f.presentPosition] = (posCounts[f.presentPosition] || 0) + 1;
  });
  const posChart = Object.entries(posCounts).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div>
      <PageHeader
        title="Operational Dashboard"
        description="Real-time overview of dockyard operations, procurement & inventory"
        icon={LayoutDashboard}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Project Budget vs Actual Spent (Rs. Millions)
          </h3>
          {projectChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={projectChart}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#2d3548" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#2d3548" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1f2e",
                    border: "1px solid #2d3548",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No project data
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Procurement Files by Position
          </h3>
          {posChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={posChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {posChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
              No procurement data
            </p>
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
