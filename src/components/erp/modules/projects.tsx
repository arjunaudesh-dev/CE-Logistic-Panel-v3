"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { LoadingState, ErrorState, EmptyState } from "@/components/erp/states";
import { PositionBadge, CategoryBadge, CustomBadge } from "@/components/erp/badges";
import { PresentPositionDialog } from "./projects/present-position";
import { AddProjectWizard } from "./projects/add-project-wizard";
import {
  FolderKanban,
  Wallet,
  TrendingDown,
  TrendingUp,
  Plus,
  FileText,
  Layers,
  Sparkles,
  PieChart as PieChartIcon,
  Activity,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  Check,
  RefreshCw,
  Search,
  Filter,
  LayoutGrid,
  Tag,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModuleId } from "../nav";
import {
  formatCurrency,
  PROJECT_TYPES,
  PROJECT_STATUSES,
  FINANCIAL_MEANS,
  projectStatusColor,
  utilizationColor,
  projectTypeColor,
  financialMeanColor,
} from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Helper to determine vote category
function getVoteGroupKey(p: Project): { key: string; label: string; isOther: boolean } {
  const v = (p.voteNumber || "").trim();
  const f = (p.financialMean || "").trim();
  const isOther =
    !v ||
    ["NON-NAVAL", "CONTRACTUAL", "NON-VOTE", "OTHER", "N/A"].includes(v.toUpperCase()) ||
    ["Malima Fund", "Non-Public Fund", "Contractual"].includes(f);

  if (isOther) {
    return {
      key: "OTHER",
      label: "Other Funds & Non-Naval Votes",
      isOther: true,
    };
  }

  return {
    key: v,
    label: `Vote: ${v}`,
    isOther: false,
  };
}

function ProjectCard({ project: p, onClick }: { project: Project; onClick: () => void }) {
  const util = p.utilization ?? 0;
  return (
    <div
      onClick={onClick}
      className="glass-card rounded-2xl p-5 cursor-pointer hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-md transition-all group border border-border/80 flex flex-col justify-between min-h-[220px]"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-2 text-sm sm:text-base">
              {p.name}
              {p.nameAbbreviation && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold shrink-0">
                  {p.nameAbbreviation}
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate font-medium">
              <span className="font-semibold text-foreground">{p.voteNumber}</span>
              {p.benefactor ? ` · ${p.benefactor}` : p.department ? ` · ${p.department}` : ""}
              {p.reference ? ` · ${p.reference}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 justify-end shrink-0">
            {p.financialMean && p.financialMean !== "Vote" && (
              <CustomBadge className={cn("border", financialMeanColor(p.financialMean))}>
                {p.financialMean}
              </CustomBadge>
            )}
            {p.projectType && (
              <CustomBadge className={cn("border", projectTypeColor(p.projectType))}>
                {p.projectType}
              </CustomBadge>
            )}
            <CustomBadge className={cn("border-0", projectStatusColor(p.status))}>
              {p.status}
            </CustomBadge>
          </div>
        </div>

        {/* Financial breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="bg-secondary/60 rounded-xl py-2 px-1 border border-border/40">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Budget</p>
            <p className="text-xs sm:text-sm font-bold text-foreground tabular-nums">
              {formatCurrency(p.voteAllocation)}
            </p>
          </div>
          <div className="bg-secondary/60 rounded-xl py-2 px-1 border border-border/40">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Committed</p>
            <p className="text-xs sm:text-sm font-bold text-amber-500 tabular-nums">
              {formatCurrency(p.committed)}
            </p>
          </div>
          <div className="bg-secondary/60 rounded-xl py-2 px-1 border border-border/40">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Balance</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-500 tabular-nums">
              {formatCurrency(p.balance ?? p.voteAllocation - p.actualSpent)}
            </p>
          </div>
        </div>

        {/* Utilization */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">Utilization</span>
            <span className="text-xs font-bold text-foreground tabular-nums">{util.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-300", utilizationColor(util))}
              style={{ width: `${Math.min(util, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/60 font-medium">
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" />
          {p.fileCount || 0} files
        </span>
        <span className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          EDC: {p.endDate ? new Date(p.endDate).toLocaleDateString("en-GB") : "—"}
        </span>
      </div>
    </div>
  );
}

// Donut palette — distinct, accessible in both light & dark themes.
const DONUT_COLORS = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#64748b", // slate
  "#22c55e", // emerald
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#ef4444", // red
];

// Buckets for the by-type donut — uses the standard PROJECT_TYPES ordering.
const TYPE_BUCKET_DEFS: { name: string; color: string }[] = [
  { name: "New Construction", color: "#3b82f6" },
  { name: "Renovation", color: "#f59e0b" },
  { name: "Maintenance", color: "#8b5cf6" },
  { name: "General Requirement", color: "#64748b" },
  { name: "Contractual Job", color: "#22c55e" },
  { name: "Continue", color: "#06b6d4" },
];

const STATUS_BUCKET_DEFS: { name: string; color: string }[] = [
  { name: "Active", color: "#22c55e" },
  { name: "On Hold", color: "#f59e0b" },
  { name: "Completed", color: "#3b82f6" },
  { name: "Cancelled", color: "#ef4444" },
];

interface ProjectFile {
  id: string;
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
  logs?: FileLog[];
}

interface FileLog {
  id: string;
  oldPosition: string | null;
  newPosition: string;
  changedBy: string | null;
  comment: string | null;
  changedAt: string;
}

interface Allocation {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  authorizedBy: string | null;
}

interface Project {
  id: string;
  name: string;
  nameAbbreviation?: string | null;
  voteNumber: string;
  voteAllocation: number;
  committed: number;
  actualSpent: number;
  startDate: string | null;
  endDate: string | null;
  department: string | null;
  benefactor: string | null;
  reference: string | null;
  projectType?: string | null;
  financialMean?: string | null;
  projectOfficer: string | null;
  status: string;
  description: string | null;
  fileCount?: number;
  committedFiles?: number;
  balance?: number;
  utilization?: number;
}

// ─── Bulk Upload CSV row schema ───
interface BulkProjectRow {
  ProjectName: string;
  NameAbbreviation: string;
  VoteNumber: string;
  ProjectType: string;
  FinancialMean: string;
  VoteAllocation: string;
  Benefactor: string;
  ProjectOfficer: string;
  StartDate: string;
  EndDate: string;
  Status: string;
  Description: string;
}

const BULK_CSV_COLUMNS: (keyof BulkProjectRow)[] = [
  "ProjectName",
  "NameAbbreviation",
  "VoteNumber",
  "ProjectType",
  "FinancialMean",
  "VoteAllocation",
  "Benefactor",
  "ProjectOfficer",
  "StartDate",
  "EndDate",
  "Status",
  "Description",
];

export function ProjectsModule({ onNavigate }: { onNavigate: (m: ModuleId) => void }) {
  const { toast } = useToast();
  const { data: projects, loading, error, refresh } = useFetch<Project[]>("/api/projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Vote Filtering & View Mode States
  const [searchQuery, setSearchQuery] = useState("");
  const [voteFilter, setVoteFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grouped" | "grid">("grouped");

  if (loading) return <LoadingState label="Loading projects..." />;
  if (error) return <ErrorState message={error} />;

  const totalVote = projects?.reduce((s, p) => s + p.voteAllocation, 0) ?? 0;
  const totalCommitted = projects?.reduce((s, p) => s + p.committed, 0) ?? 0;
  const totalSpent = projects?.reduce((s, p) => s + p.actualSpent, 0) ?? 0;
  const activeCount = projects?.filter((p) => p.status === "Active").length ?? 0;
  const totalFiles = projects?.reduce((s, p) => s + (p.fileCount || 0), 0) ?? 0;

  // ── Donut 1: Projects by Type ──
  const typeData = TYPE_BUCKET_DEFS.map((b) => ({
    name: b.name,
    value: (projects ?? []).filter((p) => p.projectType === b.name).length,
    color: b.color,
  })).filter((d) => d.value > 0);
  const totalTyped = typeData.reduce((s, d) => s + d.value, 0);

  // ── Donut 2: Projects by Status ──
  const statusData = STATUS_BUCKET_DEFS.map((b) => ({
    name: b.name,
    value: (projects ?? []).filter((p) => p.status === b.name).length,
    color: b.color,
  })).filter((d) => d.value > 0);
  const totalStatused = statusData.reduce((s, d) => s + d.value, 0);

  // ── Vote Categories & Groups Calculation ──
  const voteOptions = (() => {
    if (!projects) return { navalVotes: [], hasOther: false };
    const navalSet = new Set<string>();
    let hasOther = false;

    projects.forEach((p) => {
      const { key, isOther } = getVoteGroupKey(p);
      if (isOther) {
        hasOther = true;
      } else {
        navalSet.add(key);
      }
    });

    return {
      navalVotes: Array.from(navalSet).sort(),
      hasOther,
    };
  })();

  const voteGroupsMap = (() => {
    if (!projects) return new Map<string, { label: string; key: string; isOther: boolean; projects: Project[] }>();
    const map = new Map<string, { label: string; key: string; isOther: boolean; projects: Project[] }>();

    projects.forEach((p) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchVote = (p.voteNumber || "").toLowerCase().includes(q);
        const matchAbbr = (p.nameAbbreviation || "").toLowerCase().includes(q);
        const matchBen = (p.benefactor || "").toLowerCase().includes(q);
        const matchDept = (p.department || "").toLowerCase().includes(q);
        if (!matchName && !matchVote && !matchAbbr && !matchBen && !matchDept) return;
      }

      const { key, label, isOther } = getVoteGroupKey(p);

      // 2. Vote Filter
      if (voteFilter !== "ALL") {
        if (voteFilter === "OTHER" && !isOther) return;
        if (voteFilter !== "OTHER" && key !== voteFilter) return;
      }

      if (!map.has(key)) {
        map.set(key, { label, key, isOther, projects: [] });
      }
      map.get(key)!.projects.push(p);
    });

    return map;
  })();

  const allFilteredProjects = (() => {
    const list: Project[] = [];
    voteGroupsMap.forEach((g) => list.push(...g.projects));
    return list;
  })();

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Vote allocations, file registers & present position tracking"
        icon={FolderKanban}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setBulkOpen(true)} size="sm" variant="outline" className="gap-1.5 rounded-xl">
              <Upload className="h-4 w-4" /> Upload Bulk
            </Button>
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 rounded-xl shadow-xs">
              <Sparkles className="h-4 w-4" /> Add Project (Estimate)
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Vote Allocation" value={formatCurrency(totalVote)} icon={Wallet} accent="blue" />
        <StatCard label="Total Committed" value={formatCurrency(totalCommitted)} icon={TrendingUp} accent="amber" />
        <StatCard label="Total Actual Spent" value={formatCurrency(totalSpent)} icon={TrendingDown} accent="red" />
        <StatCard label="Active Projects" value={activeCount} icon={FolderKanban} accent="green" sub={`${totalFiles} files`} />
      </div>

      {/* Donut charts: Projects by Type + Projects by Status */}
      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Donut — Projects by Type */}
          <div className="glass-card border border-border/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Projects by Type
              </h3>
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Distribution of projects across project-type categories
            </p>
            {totalTyped > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4">
                <div className="relative">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={typeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        label={({ value }: { value?: number }) =>
                          value != null ? `${value}` : ""
                        }
                        labelLine={false}
                      >
                        {typeData.map((entry, i) => (
                          <Cell
                            key={`type-${i}`}
                            fill={entry.color}
                            stroke="var(--background, #0f1420)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card, #1a1f2e)",
                          border: "1px solid var(--border, #2d3548)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => {
                          const pct = totalTyped > 0 ? ((value / totalTyped) * 100).toFixed(1) : "0.0";
                          return [`${value} project${value === 1 ? "" : "s"} · ${pct}%`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-foreground leading-tight">
                      {totalTyped}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                      {typeData.length} type{typeData.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                {/* Legend with values + percentages */}
                <ul className="space-y-1.5 min-w-[180px]">
                  {typeData.map((d) => {
                    const pct = totalTyped > 0 ? ((d.value / totalTyped) * 100).toFixed(1) : "0.0";
                    return (
                      <li key={d.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ background: d.color }}
                        />
                        <span className="text-foreground flex-1 truncate font-medium">{d.name}</span>
                        <span className="font-bold text-foreground tabular-nums">{d.value}</span>
                        <span className="text-muted-foreground tabular-nums w-12 text-right">{pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">
                No typed projects yet
              </p>
            )}
          </div>

          {/* Donut — Projects by Status */}
          <div className="glass-card border border-border/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Projects by Status
              </h3>
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Active / On Hold / Completed / Cancelled distribution
            </p>
            {totalStatused > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4">
                <div className="relative">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        label={({ value }: { value?: number }) =>
                          value != null ? `${value}` : ""
                        }
                        labelLine={false}
                      >
                        {statusData.map((entry, i) => (
                          <Cell
                            key={`status-${i}`}
                            fill={entry.color}
                            stroke="var(--background, #0f1420)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card, #1a1f2e)",
                          border: "1px solid var(--border, #2d3548)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => {
                          const pct = totalStatused > 0 ? ((value / totalStatused) * 100).toFixed(1) : "0.0";
                          return [`${value} project${value === 1 ? "" : "s"} · ${pct}%`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-foreground leading-tight">
                      {totalStatused}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                      {statusData.length} status{statusData.length === 1 ? "" : "es"}
                    </span>
                  </div>
                </div>
                <ul className="space-y-1.5 min-w-[180px]">
                  {statusData.map((d) => {
                    const pct = totalStatused > 0 ? ((d.value / totalStatused) * 100).toFixed(1) : "0.0";
                    return (
                      <li key={d.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ background: d.color }}
                        />
                        <span className="text-foreground flex-1 truncate font-medium">{d.name}</span>
                        <span className="font-bold text-foreground tabular-nums">{d.value}</span>
                        <span className="text-muted-foreground tabular-nums w-12 text-right">{pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">
                No statused projects yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── VOTE SEPARATION & FILTER TOOLBAR ─── */}
      <div className="glass-card rounded-2xl p-4 mb-6 border border-border/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search & Filter pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects, vote number, benefactor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/60 text-xs sm:text-sm rounded-xl border-border/80 focus-visible:ring-primary h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Vote Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1 shrink-0">
            <button
              onClick={() => setVoteFilter("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border",
                voteFilter === "ALL"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              All Votes ({projects?.length || 0})
            </button>

            {voteOptions.navalVotes.map((v) => {
              const count = projects?.filter((p) => getVoteGroupKey(p).key === v).length || 0;
              return (
                <button
                  key={v}
                  onClick={() => setVoteFilter(v)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border",
                    voteFilter === v
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  Vote {v} ({count})
                </button>
              );
            })}

            {voteOptions.hasOther && (
              <button
                onClick={() => setVoteFilter("OTHER")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border",
                  voteFilter === "OTHER"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-xs"
                    : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                Other Votes ({projects?.filter((p) => getVoteGroupKey(p).isOther).length || 0})
              </button>
            )}
          </div>
        </div>

        {/* View Mode Toggle (Grouped vs Grid) */}
        <div className="flex items-center gap-1 shrink-0 bg-secondary/80 p-1 rounded-xl border border-border/60 self-end lg:self-auto">
          <button
            onClick={() => setViewMode("grouped")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
              viewMode === "grouped"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Vote-wise Grouped View"
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            Vote Sections
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
              viewMode === "grid"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Unified Grid View"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            Grid View
          </button>
        </div>
      </div>

      {/* ─── DISPLAY PROJECT LIST / SECTIONS ─── */}
      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start managing vote allocations and procurement files."
          action={
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <Button onClick={() => setBulkOpen(true)} size="sm" variant="outline" className="gap-1.5 rounded-xl">
                <Upload className="h-4 w-4" /> Upload Bulk
              </Button>
              <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 rounded-xl shadow-xs">
                <Sparkles className="h-4 w-4" /> Add Project (Estimate)
              </Button>
            </div>
          }
        />
      ) : allFilteredProjects.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-border/80">
          <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h3 className="text-base font-bold text-foreground">No matching projects found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No projects matched your search query "{searchQuery}" or vote filter setting.
          </p>
          <Button
            onClick={() => {
              setSearchQuery("");
              setVoteFilter("ALL");
            }}
            variant="outline"
            size="sm"
            className="mt-4 rounded-xl text-xs font-bold"
          >
            Reset Filters
          </Button>
        </div>
      ) : viewMode === "grouped" ? (
        /* VOTE-WISE GROUPED VIEW */
        <div className="space-y-6">
          {Array.from(voteGroupsMap.values()).map((group) => {
            const grpTotalVote = group.projects.reduce((s, p) => s + p.voteAllocation, 0);
            const grpTotalCommitted = group.projects.reduce((s, p) => s + p.committed, 0);
            const grpTotalSpent = group.projects.reduce((s, p) => s + p.actualSpent, 0);
            const grpTotalBalance = grpTotalVote - grpTotalSpent;

            return (
              <div key={group.key} className="glass-card rounded-2xl p-5 border border-border/80 shadow-sm relative overflow-hidden">
                {/* Vote Banner Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary/20 via-primary/10 to-accent/20 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                      <Wallet className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        {group.label}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {group.projects.length} {group.projects.length === 1 ? "Project" : "Projects"}
                        </span>
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">
                        Allocation: <span className="font-semibold text-foreground">{formatCurrency(grpTotalVote)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1 rounded-xl bg-secondary/70 border border-border/50 text-right">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Committed</p>
                      <p className="text-xs font-bold text-amber-500 tabular-nums">{formatCurrency(grpTotalCommitted)}</p>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-secondary/70 border border-border/50 text-right">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Actual Spent</p>
                      <p className="text-xs font-bold text-red-500 tabular-nums">{formatCurrency(grpTotalSpent)}</p>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-secondary/70 border border-border/50 text-right">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Remaining Balance</p>
                      <p className="text-xs font-bold text-emerald-500 tabular-nums">{formatCurrency(grpTotalBalance)}</p>
                    </div>
                  </div>
                </div>

                {/* Projects Grid for this Vote */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.projects.map((p) => (
                    <ProjectCard key={p.id} project={p} onClick={() => setSelectedProject(p)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* UNIFIED GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allFilteredProjects.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => setSelectedProject(p)} />
          ))}
        </div>
      )}

      {/* Present Position Dialog */}
      {selectedProject && (
        <PresentPositionDialog
          project={selectedProject}
          open={!!selectedProject}
          onOpenChange={(o) => !o && setSelectedProject(null)}
          onChanged={refresh}
        />
      )}

      {/* Add Project Wizard (Step 1 + Step 2) */}
      <AddProjectWizard
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(project) => {
          setAddOpen(false);
          toast({ title: "Project created & estimate processed" });
          refresh();
          // open the present position window for the new project
          setSelectedProject(project as Project);
        }}
      />

      {/* Bulk Upload Dialog (pp.csv template) */}
      <BulkUploadDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onImported={() => {
          setBulkOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

// ─── Bulk Upload Dialog — pp.csv template ───
// Provides a downloadable CSV template, parses the uploaded CSV, previews rows,
// then POSTs each row to /api/projects sequentially with live progress + counts.
function BulkUploadDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkProjectRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const downloadTemplate = () => {
    // Sample row demonstrates the format — Type/Status must match the
    // controlled-vocabulary constants used by the wizard.
    const header = BULK_CSV_COLUMNS.join(",");
    const sample = [
      "No.03 Slipway Hangar",
      "NSH",
      "223-1-01-2104",
      "New Construction",
      "Vote/Funds",
      "50000000",
      "Engineering Dept",
      "Cdr. R. Perera",
      "2025-01-15",
      "2026-12-31",
      "Active",
      "Construction of a new slipway hangar for naval dockyard",
    ].map(csvEscape).join(",");
    const sample2 = [
      "Engine Fire Suppression",
      "EFS",
      "NON-NAVAL",
      "Maintenance",
      "Malima Fund",
      "8500000",
      "Malima Fund",
      "Lt. Cdr. S. Bandara",
      "2025-03-01",
      "2025-09-30",
      "Active",
      "Refit of engine fire suppression system",
    ].map(csvEscape).join(",");
    const csv = `${header}\n${sample}\n${sample2}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pp.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Template downloaded",
      description: `Columns: ${BULK_CSV_COLUMNS.join(", ")}`,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Please upload a CSV file", variant: "destructive" });
      e.target.value = "";
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast({ title: "CSV file is empty", variant: "destructive" });
        e.target.value = "";
        return;
      }
      // Find columns by header name (case-insensitive, space-insensitive)
      const header = parsed[0].map((c) => c.trim().toLowerCase().replace(/\s+/g, ""));
      const colIndex: Record<keyof BulkProjectRow, number> = {
        ProjectName: header.findIndex((h) => h === "projectname" || h.includes("projectname")),
        NameAbbreviation: header.findIndex((h) => h === "nameabbreviation" || h.includes("abbreviation") || h === "abbrev"),
        VoteNumber: header.findIndex((h) => h === "votenumber" || h.includes("votenumber")),
        ProjectType: header.findIndex((h) => h === "projecttype" || h.includes("projecttype")),
        FinancialMean: header.findIndex((h) => h === "financialmean" || h.includes("financialmean") || h.includes("financial")),
        VoteAllocation: header.findIndex((h) => h === "voteallocation" || h.includes("allocation") || h.includes("budget")),
        Benefactor: header.findIndex((h) => h === "benefactor" || h.includes("benefactor") || h.includes("department")),
        ProjectOfficer: header.findIndex((h) => h === "projectofficer" || h.includes("officer")),
        StartDate: header.findIndex((h) => h === "startdate" || h.includes("startdate") || h.includes("start")),
        EndDate: header.findIndex((h) => h === "enddate" || h.includes("enddate") || h === "edc" || h.includes("edc")),
        Status: header.findIndex((h) => h === "status" || h.includes("status")),
        Description: header.findIndex((h) => h === "description" || h.includes("description") || h.includes("desc")),
      };
      const dataRows = parsed.slice(1);
      const mapped: BulkProjectRow[] = dataRows
        .map((r) => {
          const get = (k: keyof BulkProjectRow) => {
            const idx = colIndex[k];
            return idx >= 0 ? (r[idx] || "").trim() : "";
          };
          return {
            ProjectName: get("ProjectName"),
            NameAbbreviation: get("NameAbbreviation"),
            VoteNumber: get("VoteNumber"),
            ProjectType: get("ProjectType"),
            FinancialMean: get("FinancialMean"),
            VoteAllocation: get("VoteAllocation"),
            Benefactor: get("Benefactor"),
            ProjectOfficer: get("ProjectOfficer"),
            StartDate: get("StartDate"),
            EndDate: get("EndDate"),
            Status: get("Status"),
            Description: get("Description"),
          };
        })
        .filter((r) => r.ProjectName);
      if (mapped.length === 0) {
        toast({ title: "No valid rows found in CSV", variant: "destructive" });
        e.target.value = "";
        return;
      }
      setRows(mapped);
      setSuccessCount(0);
      setErrorCount(0);
      setErrors([]);
      setProgress(0);
    } catch {
      toast({ title: "Failed to read CSV file", variant: "destructive" });
    }
    e.target.value = "";
  };

  const runImport = async () => {
    if (!rows || rows.length === 0) return;
    setImporting(true);
    setSuccessCount(0);
    setErrorCount(0);
    setErrors([]);
    setProgress(0);
    let ok = 0;
    let fail = 0;
    const errs: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      // Build the API payload — defaults to safe values when missing
      const payload: Record<string, unknown> = {
        name: r.ProjectName,
        nameAbbreviation: r.NameAbbreviation || null,
        voteNumber: r.VoteNumber || "NON-NAVAL",
        voteAllocation: Number(r.VoteAllocation) || 0,
        committed: 0,
        actualSpent: 0,
        startDate: r.StartDate || null,
        endDate: r.EndDate || null,
        benefactor: r.Benefactor || null,
        projectType: PROJECT_TYPES.includes(r.ProjectType as typeof PROJECT_TYPES[number])
          ? r.ProjectType
          : "New Construction",
        financialMean: FINANCIAL_MEANS.includes(r.FinancialMean as typeof FINANCIAL_MEANS[number])
          ? r.FinancialMean
          : "Vote/Funds",
        projectOfficer: r.ProjectOfficer || null,
        status: PROJECT_STATUSES.includes(r.Status as typeof PROJECT_STATUSES[number])
          ? r.Status
          : "Active",
        description: r.Description || null,
      };
      const res = await apiRequest("/api/projects", "POST", payload);
      if (res.ok) {
        ok++;
      } else {
        fail++;
        errs.push(`Row ${i + 1} (${r.ProjectName}): ${res.error || "Failed"}`);
      }
      setSuccessCount(ok);
      setErrorCount(fail);
      setErrors([...errs]);
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }
    setImporting(false);
    if (fail === 0) {
      toast({
        title: `Imported ${ok} project${ok === 1 ? "" : "s"}`,
        description: "All rows imported successfully",
      });
      onImported();
      setRows(null);
    } else {
      toast({
        title: `Imported ${ok} of ${rows.length} projects`,
        description: `${fail} failed — see error list`,
        variant: "destructive",
      });
    }
  };

  const close = () => {
    if (importing) return;
    onOpenChange(false);
    setRows(null);
    setSuccessCount(0);
    setErrorCount(0);
    setErrors([]);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Upload Projects
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a CSV file using the <span className="font-mono text-foreground">pp.csv</span> template. Each row creates a project via <span className="font-mono text-foreground">POST /api/projects</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={downloadTemplate} size="sm" variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" /> Download Template (pp.csv)
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="gap-1.5" disabled={importing}>
            <FileSpreadsheet className="h-4 w-4" /> Choose CSV File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          {rows && rows.length > 0 && !importing && (
            <Button onClick={runImport} size="sm" className="gap-1.5 ml-auto">
              <Check className="h-4 w-4" /> Import {rows.length} Project{rows.length === 1 ? "" : "s"}
            </Button>
          )}
        </div>

        {/* Progress bar (during import) */}
        {importing && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Importing… {progress}%</span>
              <span className="text-foreground">
                <span className="text-emerald-400 font-medium">{successCount} ok</span>
                {" · "}
                <span className="text-red-400 font-medium">{errorCount} failed</span>
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Summary chips (post-import) */}
        {!importing && (successCount > 0 || errorCount > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            <CustomBadge className="border-0 bg-emerald-500/15 text-emerald-400">
              <Check className="h-3 w-3 mr-1 inline" /> {successCount} imported
            </CustomBadge>
            {errorCount > 0 && (
              <CustomBadge className="border-0 bg-red-500/15 text-red-400">
                {errorCount} failed
              </CustomBadge>
            )}
          </div>
        )}

        {/* Preview table */}
        {rows && rows.length > 0 ? (
          <div className="border border-border rounded-lg overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground w-10">#</TableHead>
                  <TableHead className="text-muted-foreground">Project Name</TableHead>
                  <TableHead className="text-muted-foreground">Abbrev</TableHead>
                  <TableHead className="text-muted-foreground">Vote Number</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Financial</TableHead>
                  <TableHead className="text-muted-foreground text-right">Allocation</TableHead>
                  <TableHead className="text-muted-foreground">Benefactor</TableHead>
                  <TableHead className="text-muted-foreground">Officer</TableHead>
                  <TableHead className="text-muted-foreground">Start</TableHead>
                  <TableHead className="text-muted-foreground">EDC</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell className="text-foreground font-medium">{r.ProjectName || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell className="font-mono text-xs text-primary">{r.NameAbbreviation || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.VoteNumber || "—"}</TableCell>
                    <TableCell className="text-xs">{r.ProjectType || "—"}</TableCell>
                    <TableCell className="text-xs">{r.FinancialMean || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.VoteAllocation ? Number(r.VoteAllocation).toLocaleString("en-US") : "—"}</TableCell>
                    <TableCell className="text-xs">{r.Benefactor || "—"}</TableCell>
                    <TableCell className="text-xs">{r.ProjectOfficer || "—"}</TableCell>
                    <TableCell className="text-xs">{r.StartDate || "—"}</TableCell>
                    <TableCell className="text-xs">{r.EndDate || "—"}</TableCell>
                    <TableCell className="text-xs">{r.Status || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate" title={r.Description}>{r.Description || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-lg p-10 text-center">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No file selected. Download the <span className="font-mono">pp.csv</span> template, fill it in, then choose the CSV file to preview rows here.
            </p>
          </div>
        )}

        {/* Error list */}
        {errors.length > 0 && (
          <div className="border border-red-500/40 rounded-lg p-3 bg-red-500/[0.04] max-h-40 overflow-y-auto scrollbar-thin">
            <p className="text-xs font-semibold text-red-400 mb-2">Errors ({errors.length}):</p>
            <ul className="space-y-1 text-xs text-foreground/80">
              {errors.map((e, i) => (
                <li key={i} className="font-mono">{e}</li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={importing}>
            {successCount > 0 && errorCount === 0 ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// CSV escape — wraps in quotes if the field contains a comma, quote, or newline
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// RFC-4180 CSV parser — handles quoted fields with embedded commas/newlines
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        cur.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
