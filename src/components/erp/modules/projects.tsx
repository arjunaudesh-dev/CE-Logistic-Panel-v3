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
} from "lucide-react";
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
// The columns below match the pp.csv template header exactly. Optional columns
// are coerced / defaulted during import.
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
  if (loading) return <LoadingState label="Loading projects..." />;
  if (error) return <ErrorState message={error} />;

  const totalVote = projects?.reduce((s, p) => s + p.voteAllocation, 0) ?? 0;
  const totalCommitted = projects?.reduce((s, p) => s + p.committed, 0) ?? 0;
  const totalSpent = projects?.reduce((s, p) => s + p.actualSpent, 0) ?? 0;
  const activeCount = projects?.filter((p) => p.status === "Active").length ?? 0;
  const totalFiles = projects?.reduce((s, p) => s + (p.fileCount || 0), 0) ?? 0;

  // ── Donut 1: Projects by Type ──
  // Each defined bucket gets a slice (count of projects of that type).
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

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Vote allocations, file registers & present position tracking"
        icon={FolderKanban}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setBulkOpen(true)} size="sm" variant="outline" className="gap-1.5">
              <Upload className="h-4 w-4" /> Upload Bulk
            </Button>
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
          {/* Donut — Projects by Type */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Projects by Type
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Distribution of projects across the project-type categories
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
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-foreground leading-tight">
                      {totalTyped}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
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
          description="Create your first project to start managing vote allocations and procurement files."
          action={
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <Button onClick={() => setBulkOpen(true)} size="sm" variant="outline" className="gap-1.5">
                <Upload className="h-4 w-4" /> Upload Bulk
              </Button>
              <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Add Project (Estimate)
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const util = p.utilization ?? 0;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p)}
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
          })}
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
