"use client";
import { useState } from "react";
import { useFetch } from "@/lib/use-fetch";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { LoadingState, ErrorState, EmptyState } from "@/components/erp/states";
import { CustomBadge } from "@/components/erp/badges";
import { PresentPositionDialog } from "./projects/present-position";
import { AddProjectWizard } from "./projects/add-project-wizard";
import {
  FolderKanban,
  Wallet,
  TrendingDown,
  TrendingUp,
  FileText,
  Layers,
  Sparkles,
  PieChart as PieChartIcon,
  Activity,
  FolderTree,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ModuleId } from "../nav";
import {
  formatCurrency,
  projectStatusColor,
  utilizationColor,
  projectTypeColor,
  financialMeanColor,
} from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Buckets for the by-type donut — mirrors the standard PROJECT_TYPES ordering.
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
  /** For Maintenance projects: groups sub-requirements (e.g. "ENA Maintenance", "Water Purification"). */
  requirementGroup?: string | null;
  projectOfficer: string | null;
  status: string;
  description: string | null;
  /** Active (non-archived) file count — populated by /api/projects. */
  fileCount?: number;
  activeFileCount?: number;
  totalFileCount?: number;
  committedFiles?: number;
  balance?: number;
  utilization?: number;
}

export function ProjectsModule({ onNavigate }: { onNavigate: (m: ModuleId) => void }) {
  const { data: projects, loading, error, refresh } = useFetch<Project[]>("/api/projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const { toast } = useToast();

  if (loading) return <LoadingState label="Loading projects..." />;
  if (error) return <ErrorState message={error} />;

  const totalVote = projects?.reduce((s, p) => s + p.voteAllocation, 0) ?? 0;
  const totalCommitted = projects?.reduce((s, p) => s + p.committed, 0) ?? 0;
  const totalSpent = projects?.reduce((s, p) => s + p.actualSpent, 0) ?? 0;
  const activeCount = projects?.filter((p) => p.status === "Active").length ?? 0;
  const totalFiles = projects?.reduce((s, p) => s + (p.fileCount || 0), 0) ?? 0;

  // ── Donut 1: Projects by Type (with active files count) ──
  // Each slice shows the project count + the total active (non-archived) files
  // across all projects of that type. The active files count comes from
  // Project.fileCount (the projects API returns the active-only count).
  const typeData = TYPE_BUCKET_DEFS.map((b) => {
    const typedProjects = (projects ?? []).filter((p) => p.projectType === b.name);
    const filesActive = typedProjects.reduce((s, p) => s + (p.fileCount || 0), 0);
    return {
      name: b.name,
      value: typedProjects.length,
      filesActive,
      color: b.color,
    };
  }).filter((d) => d.value > 0);
  const totalTyped = typeData.reduce((s, d) => s + d.value, 0);
  const totalTypeFiles = typeData.reduce((s, d) => s + d.filesActive, 0);

  // ── Donut 2: Projects by Status ──
  const statusData = STATUS_BUCKET_DEFS.map((b) => ({
    name: b.name,
    value: (projects ?? []).filter((p) => p.status === b.name).length,
    color: b.color,
  })).filter((d) => d.value > 0);
  const totalStatused = statusData.reduce((s, d) => s + d.value, 0);

  // ── Maintenance sub-grouping ──
  // Maintenance projects don't have a single dedicated project — they have a
  // variety of recurring requirements grouped by `requirementGroup` (e.g.
  // "ENA Maintenance", "Water Purification"). Maintenance projects WITHOUT a
  // requirementGroup fall into the "General Maintenance" bucket.
  const maintenanceGroups: [string, Project[]][] = (() => {
    const maintenance = (projects ?? []).filter((p) => p.projectType === "Maintenance");
    const groups = new Map<string, Project[]>();
    for (const p of maintenance) {
      const key = (p.requirementGroup && p.requirementGroup.trim()) || "General Maintenance";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    // Sort groups alphabetically; keep "General Maintenance" at the end if present.
    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === "General Maintenance") return 1;
      if (b[0] === "General Maintenance") return -1;
      return a[0].localeCompare(b[0]);
    });
  })();

  // Non-maintenance projects (rendered in the main grid).
  const nonMaintenanceProjects = (projects ?? []).filter((p) => p.projectType !== "Maintenance");

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Vote allocations, file registers & present position tracking"
        icon={FolderKanban}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
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
          {/* Donut — Projects by Type (slice + legend show active files count) */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Projects by Type
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Project count per type with active (non-archived) files in brackets
            </p>
            {totalTyped > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4">
                <div className="relative">
                  <ResponsiveContainer width="100%" height={260}>
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
                        label={({ value, filesActive }: { value?: number; filesActive?: number }) =>
                          value != null ? `${value} (${filesActive ?? 0})` : ""
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
                        formatter={(value: number, name: string, entry: { payload?: { filesActive?: number } }) => {
                          const pct = totalTyped > 0 ? ((value / totalTyped) * 100).toFixed(1) : "0.0";
                          const fa = entry?.payload?.filesActive ?? 0;
                          return [`${value} project${value === 1 ? "" : "s"} · ${fa} active file${fa === 1 ? "" : "s"} · ${pct}%`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-foreground leading-tight">
                      {totalTyped}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {totalTypeFiles} active file{totalTypeFiles === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                {/* Legend with values + active files + percentages */}
                <ul className="space-y-1.5 min-w-[200px]">
                  {typeData.map((d) => {
                    const pct = totalTyped > 0 ? ((d.value / totalTyped) * 100).toFixed(1) : "0.0";
                    return (
                      <li key={d.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: d.color }}
                        />
                        <span className="text-foreground flex-1 truncate">{d.name}</span>
                        <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
                        <span className="text-muted-foreground tabular-nums text-[10px]">
                          ({d.filesActive}f)
                        </span>
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
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Projects by Status
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Active / On Hold / Completed / Cancelled distribution
            </p>
            {totalStatused > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4">
                <div className="relative">
                  <ResponsiveContainer width="100%" height={260}>
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
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-foreground leading-tight">
                      {totalStatused}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
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
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: d.color }}
                        />
                        <span className="text-foreground flex-1 truncate">{d.name}</span>
                        <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
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

      {/* Project cards */}
      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start managing vote allocations and procurement files. Use the Add Project (Estimate) wizard — it creates the project, exports a material estimate, and processes it with AI."
          action={
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Add Project (Estimate)
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Non-maintenance projects — main grid */}
          {nonMaintenanceProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {nonMaintenanceProjects.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => setSelectedProject(p)} />
              ))}
            </div>
          )}

          {/* Maintenance projects — grouped by requirementGroup (sub-tiles) */}
          {maintenanceGroups.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm">
                <FolderTree className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Maintenance (Recurrence Vote) Projects</h3>
                <span className="text-xs text-muted-foreground">
                  · grouped by requirement
                </span>
              </div>
              {maintenanceGroups.map(([groupName, groupProjects]) => {
                const groupFiles = groupProjects.reduce((s, p) => s + (p.fileCount || 0), 0);
                const groupBudget = groupProjects.reduce((s, p) => s + (p.voteAllocation || 0), 0);
                return (
                  <section
                    key={groupName}
                    className="bg-card border border-border rounded-xl overflow-hidden"
                  >
                    {/* Sub-tile header */}
                    <header className="px-5 py-3 border-b border-border bg-violet-500/[0.06] flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shrink-0" />
                        <h4 className="font-semibold text-foreground text-sm truncate">{groupName}</h4>
                        <CustomBadge className="border-0 bg-violet-500/15 text-violet-400">
                          {groupProjects.length} project{groupProjects.length === 1 ? "" : "s"}
                        </CustomBadge>
                        <CustomBadge className="border-0 bg-primary/10 text-primary">
                          <FileText className="h-3 w-3 mr-1 inline" />
                          {groupFiles} file{groupFiles === 1 ? "" : "s"}
                        </CustomBadge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Group budget: <span className="text-foreground font-semibold">{formatCurrency(groupBudget)}</span>
                      </span>
                    </header>
                    {/* Sub-tile body — grid of maintenance project cards */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {groupProjects.map((p) => (
                        <ProjectCard key={p.id} project={p} onClick={() => setSelectedProject(p)} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
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
    </div>
  );
}

// ─── Project Card ───
// Shared between the main grid (non-maintenance projects) and the maintenance
// sub-tile sections. Renders a clickable summary card with financial breakdown,
// utilization bar, and footer (file count + EDC).
function ProjectCard({ project: p, onClick }: { project: Project; onClick: () => void }) {
  const util = p.utilization ?? 0;
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-2">
            {p.name}
            {p.nameAbbreviation && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {p.nameAbbreviation}
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {p.voteNumber}
            {p.benefactor ? ` · ${p.benefactor}` : p.department ? ` · ${p.department}` : ""}
            {p.reference ? ` · ${p.reference}` : ""}
            {p.projectType ? ` · ${p.projectType}` : ""}
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
        <div className="bg-secondary/50 rounded-lg py-2">
          <p className="text-[10px] text-muted-foreground uppercase">Budget</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(p.voteAllocation)}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg py-2">
          <p className="text-[10px] text-muted-foreground uppercase">Committed</p>
          <p className="text-sm font-semibold text-amber-400">
            {formatCurrency(p.committed)}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg py-2">
          <p className="text-[10px] text-muted-foreground uppercase">Balance</p>
          <p className="text-sm font-semibold text-emerald-400">
            {formatCurrency(p.balance ?? p.voteAllocation - p.actualSpent)}
          </p>
        </div>
      </div>

      {/* Utilization */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Utilization</span>
          <span className="text-xs font-medium text-foreground">{util.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", utilizationColor(util))}
            style={{ width: `${Math.min(util, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {p.fileCount || 0} files
        </span>
        <span className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" />
          EDC: {p.endDate ? new Date(p.endDate).toLocaleDateString("en-GB") : "—"}
        </span>
      </div>
    </div>
  );
}

