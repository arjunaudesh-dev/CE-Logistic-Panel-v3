"use client";
import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Vote allocations, file registers & present position tracking"
        icon={FolderKanban}
        actions={
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Add Project (Estimate)
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Vote Allocation" value={formatCurrency(totalVote)} icon={Wallet} accent="blue" />
        <StatCard label="Total Committed" value={formatCurrency(totalCommitted)} icon={TrendingUp} accent="amber" />
        <StatCard label="Total Actual Spent" value={formatCurrency(totalSpent)} icon={TrendingDown} accent="red" />
        <StatCard label="Active Projects" value={activeCount} icon={FolderKanban} accent="green" sub={`${totalFiles} files`} />
      </div>

      {/* Project cards */}
      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start managing vote allocations and procurement files."
          action={
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Add Project (Estimate)
            </Button>
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
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {p.name}
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
    </div>
  );
}
