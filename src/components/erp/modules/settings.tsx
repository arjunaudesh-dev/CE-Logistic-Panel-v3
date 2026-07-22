"use client";
import { useEffect, useMemo, useState } from "react";
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  USER_ROLES,
  userRoleColor,
  ROLE_PERMISSIONS,
  permissionColor,
  VOTE_TYPES,
  voteTypeColor,
  PROCESS_FLOW_TYPES,
  processFlowColor,
  NUMBER_PREFIX_TYPES,
  PREFIX_PROCESS_TYPES,
  THEME_PROFILE_PRESETS,
  type ThemeProfilePreset,
  formatCurrency,
  VOTE_DEPARTMENTS,
  FINANCIAL_AUTHORITIES,
  PROCESS_STEP_STAGES,
  STAGE_AUTO_DETAILS,
  SETTINGS_DEPARTMENTS,
} from "@/lib/constants";
import {
  useThemeProfile,
} from "@/lib/use-theme-profile";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Settings,
  Users,
  Warehouse,
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Award,
  TrendingUp,
  Loader2,
  Search,
  X,
  UserCircle2,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  Layers,
  Gavel,
  ClipboardCheck,
  Banknote,
  ListTree,
  KeyRound,
  Vote,
  Lock,
  Unlock,
  AlertCircle,
  LogIn,
  LogOut,
  Info,
  Calendar,
  Crown,
  UserCog,
  Activity,
  Landmark,
  Fingerprint,
  Eye,
  EyeOff,
  Hash,
  Palette,
  Check,
  Type,
  Sparkles,
  Star,
  RefreshCw,
  Clock,
  Percent,
  PlusCircle,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
  stakeholderId: string | null;
  department: string | null;
  active: boolean;
  passwordHash?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface StoreConfig {
  id: string;
  storeName: string;
  storeType: string;
  responsiblePerson: string | null;
  department?: string | null;
  responsiblePersons?: string | string[] | null; // JSON-encoded array (from API) or already-parsed array
  responsibleOfficers?: string | string[] | null;
  location: string | null;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ProcessStep {
  id: string;
  flowId: string;
  stepOrder?: number | null;
  positionName?: string | null;
  predefinedStage?: string | null;
  description?: string | null;
  beforeStepId?: string | null;
  afterStepId?: string | null;
  department?: string | null;
  responsibleOfficers?: string | string[] | null;
  responsibleSailors?: string | string[] | null;
  financialDelegationId?: string | null;
  defaultResponsiblePerson?: string | null;
  financialDelegationLevel?: string | null;
  isTenderStage: boolean;
  isEvaluationStage: boolean;
  prefixedNumber?: string | null;
  expectedDays?: number;
  expectedPercentage?: number;
  createdAt: string;
}

interface ProcessFlow {
  id: string;
  name: string;
  description: string | null;
  financialDelegationId?: string | null;
  conditionMethod?: string | null;
  conditionMinValue?: number | null;
  conditionMaxValue?: number | null;
  createdAt: string;
  steps: ProcessStep[];
}

interface Vote {
  id: string;
  voteNumber: string;
  description: string;
  voteType: string;
  allocation: number;
  department?: string | null;
  financialYear: string | null;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  department: string | null;
}

interface SessionResponse {
  user: SessionUser | null;
  authenticated: boolean;
}

interface NumberPrefix {
  id: string;
  docType: string;
  subCategory?: string | null;
  processType?: string | null;
  prefix: string;
  suffix: string | null;
  nextNumber: number;
  description: string | null;
  stepId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface FinancialDelegation {
  id: string;
  value: number;
  authority: string;
  label: string | null;
  active: boolean;
  createdAt?: string;
}

interface Stakeholder {
  id: string;
  name: string;
  rankOrRate?: string | null;
  svcNumber?: string | null;
  appointment?: string | null;
  department: string;
  category: string;
  seniority?: number | null;
  areaStoreLocation?: string | null;
}

interface ThemeProfileRecord {
  id: string;
  name: string;
  mode: string;
  primary: string;
  accent: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Parse a JSON-encoded array field safely (Prisma stores them as JSON strings)
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// Constants — local to settings module
// ─────────────────────────────────────────────────────────
const STORE_TYPES = ["Zone", "AreaStore", "Ready-Use", "Balance", "Project"] as const;

const DEPARTMENTS = ["CSLOG", "CE", "Finance", "Administration", "Operations"] as const;

function storeTypeColor(type: string): string {
  switch (type) {
    case "Zone":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "AreaStore":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "Ready-Use":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "Balance":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Project":
      return "bg-pink-500/15 text-pink-400 border-pink-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

function storeTypeLabel(type: string): string {
  switch (type) {
    case "AreaStore":
      return "Area Store";
    case "Ready-Use":
      return "Ready-Use";
    default:
      return type;
  }
}

function activeBadgeClass(active: boolean): string {
  return active
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : "bg-red-500/15 text-red-400 border-red-500/30";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Returns the accent stripe / pill color classes for a flow name. */
function flowAccent(name: string): {
  badge: string;
  dot: string;
  ring: string;
  headerBg: string;
  border: string;
  text: string;
  stepDot: string;
} {
  switch (name) {
    case "RC":
      return {
        badge: processFlowColor("RC"),
        dot: "bg-emerald-500",
        ring: "ring-emerald-500/30",
        headerBg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        stepDot: "bg-emerald-500",
      };
    case "Non-Rate":
      return {
        badge: processFlowColor("Non-Rate"),
        dot: "bg-amber-500",
        ring: "ring-amber-500/30",
        headerBg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-400",
        stepDot: "bg-amber-500",
      };
    case "ARO (Contractual)":
      return {
        badge: processFlowColor("ARO (Contractual)"),
        dot: "bg-violet-500",
        ring: "ring-violet-500/30",
        headerBg: "bg-violet-500/10",
        border: "border-violet-500/30",
        text: "text-violet-400",
        stepDot: "bg-violet-500",
      };
    default:
      return {
        badge: processFlowColor(name),
        dot: "bg-slate-500",
        ring: "ring-slate-500/30",
        headerBg: "bg-slate-500/10",
        border: "border-slate-500/30",
        text: "text-slate-300",
        stepDot: "bg-slate-500",
      };
  }
}

// ─────────────────────────────────────────────────────────
// Main Module
// ─────────────────────────────────────────────────────────
type SettingsTab =
  | "users"
  | "roles"
  | "auth"
  | "votes"
  | "stores"
  | "process"
  | "prefixes"
  | "theme"
  | "value-step";

export function SettingsModule() {
  const { data: currentUser } = useFetch<{
    role: string;
    username: string;
  }>("/api/user/profile");

  const userRole = currentUser?.role || "Master Admin";
  const isMasterAdmin = userRole === "Master Admin" || currentUser?.username === "admin";
  const canAccessSettings = isMasterAdmin || userRole === "Admin" || userRole === "Manager";

  const [tab, setTab] = useState<SettingsTab>("users");

  useEffect(() => {
    if (isMasterAdmin) {
      setTab("users");
    } else {
      setTab("votes");
    }
  }, [isMasterAdmin]);

  const allTabs: {
    value: SettingsTab;
    label: string;
    short: string;
    icon: LucideIcon;
    iconClass: string;
    masterOnly?: boolean;
  }[] = [
    {
      value: "users",
      label: "User Profiles",
      short: "Users",
      icon: Users,
      iconClass: "bg-blue-500/15 text-blue-400",
      masterOnly: true,
    },
    {
      value: "roles",
      label: "Roles & Access",
      short: "Roles",
      icon: Shield,
      iconClass: "bg-violet-500/15 text-violet-400",
      masterOnly: true,
    },
    {
      value: "auth",
      label: "Authentication",
      short: "Auth",
      icon: KeyRound,
      iconClass: "bg-emerald-500/15 text-emerald-400",
    },
    {
      value: "votes",
      label: "Vote Management",
      short: "Votes",
      icon: Vote,
      iconClass: "bg-amber-500/15 text-amber-400",
    },
    {
      value: "stores",
      label: "Store Management",
      short: "Stores",
      icon: Warehouse,
      iconClass: "bg-pink-500/15 text-pink-400",
    },
    {
      value: "process",
      label: "Process",
      short: "Process",
      icon: GitBranch,
      iconClass: "bg-sky-500/15 text-sky-400",
    },
    {
      value: "prefixes",
      label: "Number Prefixes",
      short: "Prefixes",
      icon: Hash,
      iconClass: "bg-cyan-500/15 text-cyan-400",
    },
    {
      value: "theme",
      label: "Theme & Colors",
      short: "Theme",
      icon: Palette,
      iconClass: "bg-fuchsia-500/15 text-fuchsia-400",
    },
    {
      value: "value-step",
      label: "Value & Step",
      short: "Value",
      icon: DollarSign,
      iconClass: "bg-emerald-500/15 text-emerald-400",
    },
  ];

  const visibleTabs = useMemo(() => {
    if (isMasterAdmin) return allTabs;
    return allTabs.filter((t) => !t.masterOnly);
  }, [isMasterAdmin, allTabs]);

  if (!canAccessSettings) {
    return (
      <div className="p-8 text-center space-y-4 bg-card border border-border rounded-xl max-w-lg mx-auto mt-8 shadow-md">
        <div className="h-12 w-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Settings Page Access Restricted</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The Settings page is only accessible to Admins and Managers. Please contact your system administrator if you require access.
        </p>
        <div className="pt-2">
          <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
            Current Role: {userRole}
          </CustomBadge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage votes, stores, procurement process flows, financial delegations & steps"
        icon={Settings}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as SettingsTab)}
      >
        <div className="bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-transparent border border-border rounded-xl p-1.5 overflow-x-auto">
          <TabsList className="bg-transparent border-0 p-0 h-auto flex gap-1 w-max min-w-full">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="flex-none h-auto py-1.5 px-3 gap-2 data-[state=active]:bg-card data-[state=active]:border-border data-[state=active]:shadow-sm border border-transparent text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all"
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded flex items-center justify-center",
                      t.iconClass
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {isMasterAdmin && (
          <>
            <TabsContent value="users" className="mt-4">
              <UserProfilesTab />
            </TabsContent>
            <TabsContent value="roles" className="mt-4">
              <RolesAccessTab />
            </TabsContent>
          </>
        )}
        <TabsContent value="auth" className="mt-4">
          <AuthenticationTab />
        </TabsContent>
        <TabsContent value="votes" className="mt-4">
          <VoteManagementTab />
        </TabsContent>
        <TabsContent value="stores" className="mt-4">
          <StoreManagementTab />
        </TabsContent>
        <TabsContent value="process" className="mt-4">
          <ProcessFlowsTab />
        </TabsContent>
        <TabsContent value="prefixes" className="mt-4">
          <NumberPrefixesTab />
        </TabsContent>
        <TabsContent value="theme" className="mt-4">
          <ThemeColorsTab />
        </TabsContent>
        <TabsContent value="value-step" className="mt-4">
          <ValueAndStepTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 1 — User Profiles
// ═════════════════════════════════════════════════════════
function UserProfilesTab() {
  const { data: list, loading, error, refresh } = useFetch<UserProfile[]>(
    "/api/settings/users"
  );
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<UserProfile | null>(
    null
  );

  const filtered = useMemo(() => {
    if (!list) return [];
    const s = search.trim().toLowerCase();
    return list.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (deptFilter !== "all" && (u.department ?? "—") !== deptFilter) return false;
      if (activeFilter === "active" && !u.active) return false;
      if (activeFilter === "inactive" && u.active) return false;
      if (s) {
        const hay =
          `${u.username} ${u.displayName} ${u.email ?? ""} ${u.department ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [list, search, roleFilter, deptFilter, activeFilter]);

  const filtersActive =
    search !== "" ||
    roleFilter !== "all" ||
    deptFilter !== "all" ||
    activeFilter !== "all";

  function clearFilters() {
    setSearch("");
    setRoleFilter("all");
    setDeptFilter("all");
    setActiveFilter("all");
  }

  const activeCount = useMemo(
    () => list?.filter((u) => u.active).length ?? 0,
    [list]
  );
  const adminCount = useMemo(
    () => list?.filter((u) => u.role === "Admin").length ?? 0,
    [list]
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiRequest(
      `/api/settings/users/${deleteTarget.id}`,
      "DELETE"
    );
    setDeleting(false);
    if (res.ok) {
      toast({
        title: "User deleted",
        description: deleteTarget.displayName,
      });
      setDeleteTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  if (loading) return <LoadingState label="Loading users..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            User Profiles
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage login identities, roles, departments and passwords
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={list?.length ?? 0}
          icon={Users}
          accent="blue"
          sub="All profiles"
        />
        <StatCard
          label="Active"
          value={activeCount}
          icon={CheckCircle2}
          accent="green"
          sub="Can sign in"
        />
        <StatCard
          label="Administrators"
          value={adminCount}
          icon={Shield}
          accent="red"
          sub="Full access"
        />
        <StatCard
          label="With Password"
          value={list?.filter((u) => u.passwordHash).length ?? 0}
          icon={KeyRound}
          accent="purple"
          sub="Can authenticate"
        />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Search (Username / Name / Email)
            </Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-background w-full">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="bg-background w-full">
                <SelectValue placeholder="Dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="bg-background w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {filtersActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              filtersActive ? "No matching users" : "No users configured"
            }
            description={
              filtersActive
                ? "Try adjusting your search or filters."
                : "Add your first user profile to get started."
            }
            action={
              filtersActive ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add User
                </Button>
              )
            }
          />
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[40px]">Sr</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u, idx) => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground font-mono text-sm">
                          {u.username}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {u.displayName}
                    </TableCell>
                    <TableCell>
                      {u.email ? (
                        <a
                          href={`mailto:${u.email}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <Mail className="h-3 w-3" />
                          {u.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomBadge className={userRoleColor(u.role)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {u.role}
                      </CustomBadge>
                    </TableCell>
                    <TableCell>
                      {u.department ? (
                        <span className="text-sm text-foreground">
                          {u.department}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomBadge
                        className={
                          u.passwordHash
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        }
                      >
                        {u.passwordHash ? (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Password Set
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3 mr-1" />
                            No Password
                          </>
                        )}
                      </CustomBadge>
                    </TableCell>
                    <TableCell>
                      <CustomBadge className={activeBadgeClass(u.active)}>
                        {u.active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                          onClick={() => setPasswordTarget(u)}
                          title="Set or reset password"
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">Password</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditTarget(u)}
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => setDeleteTarget(u)}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* Add dialog */}
      {addOpen && (
        <UserFormDialog
          key="add-user"
          open={addOpen}
          onOpenChange={setAddOpen}
          initial={null}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}

      {/* Edit dialog (keyed remount ensures fresh form state) */}
      {editTarget && (
        <UserFormDialog
          key={`edit-${editTarget.id}`}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          initial={editTarget}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.displayName}
              </span>{" "}
              ({deleteTarget?.username}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {passwordTarget && (
        <SetPasswordDialog
          key={`pwd-${passwordTarget.id}`}
          user={passwordTarget}
          open={!!passwordTarget}
          onOpenChange={(o) => !o && setPasswordTarget(null)}
          onSaved={() => {
            setPasswordTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// User Form Dialog (Add/Edit)
// ─────────────────────────────────────────────────────────
interface UserFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: UserProfile | null;
  onSaved: () => void;
  stakeholders?: Stakeholder[];
}

function UserFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
  stakeholders,
}: UserFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Fetch stakeholders if not passed in (so the dialog can be used standalone
  // from either the User Profiles tab or the Authentication tab)
  const { data: fetchedStakeholders } = useFetch<Stakeholder[]>(
    "/api/stakeholders"
  );
  const stakeholderList = stakeholders ?? fetchedStakeholders ?? [];

  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<string>(initial?.role ?? "Officer");
  const [department, setDepartment] = useState<string>(
    initial?.department ?? "CSLOG"
  );
  const [stakeholderId, setStakeholderId] = useState<string>(
    initial?.stakeholderId ?? ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) {
      toast({
        title: "Username and Display Name are required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const body = {
      username: username.trim(),
      displayName: displayName.trim(),
      email: email.trim() || null,
      role,
      department,
      stakeholderId: stakeholderId || null,
      password: password.trim() || undefined,
      active,
    };
    const res = isEdit
      ? await apiRequest(`/api/settings/users/${initial!.id}`, "PUT", body)
      : await apiRequest("/api/settings/users", "POST", body);
    if (!res.ok) {
      setSaving(false);
      toast({
        title: "Failed to save",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    // Set password if provided (initial set on create, optional override on edit)
    const pw = password.trim();
    if (pw) {
      if (pw.length < 4) {
        setSaving(false);
        toast({
          title: "Password too short",
          description: "Use at least 4 characters.",
          variant: "destructive",
        });
        return;
      }
      const userId = isEdit
        ? initial!.id
        : (res.data as UserProfile)?.id;
      if (userId) {
        const pwRes = await apiRequest("/api/auth/set-password", "POST", {
          userId,
          password: pw,
        });
        if (!pwRes.ok) {
          setSaving(false);
          toast({
            title: "User saved but password set failed",
            description: pwRes.error,
            variant: "destructive",
          });
          return;
        }
      }
    }
    setSaving(false);
    toast({
      title: isEdit ? "User updated" : "User created",
      description:
        pw && isEdit
          ? `${body.displayName} (password updated)`
          : pw
          ? `${body.displayName} (password set)`
          : body.displayName,
    });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-primary" />
            {isEdit ? "Edit User Profile" : "Add User Profile"}
          </DialogTitle>
          <DialogDescription>
            Configure login identity, role permissions, department, optional
            stakeholder link and an initial password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Username" required>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. rperera"
              className="bg-background font-mono"
              required
            />
          </Field>
          <Field label="Display Name" required>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Cdr. R. Perera"
              className="bg-background"
              required
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@navy.lk"
              className="bg-background"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department">
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Stakeholder Link (optional)">
            <Select
              value={stakeholderId || "__none__"}
              onValueChange={(v) =>
                setStakeholderId(v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Link to a stakeholder (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {stakeholderList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className="text-foreground">{s.name}</span>
                      {s.rankOrRate && (
                        <span className="text-xs text-muted-foreground">
                          ({s.rankOrRate})
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        · {s.department} / {s.category}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Optionally link this user to a stakeholder record (officer or
              sailor) from the directory.
            </p>
          </Field>
          <Field
            label={
              isEdit
                ? "Reset Password (leave blank to keep existing)"
                : "Initial Password"
            }
            required={!isEdit}
          >
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isEdit
                    ? "Leave blank to keep existing password"
                    : "Minimum 4 characters"
                }
                className="bg-background pr-10"
                required={!isEdit}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isEdit
                ? "Only enter a value if you want to reset this user's password."
                : "The user will sign in with this password. Can be changed later."}
            </p>
          </Field>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
            <Checkbox
              id="user-active"
              checked={active}
              onCheckedChange={(v) => setActive(v === true)}
            />
            <div className="flex-1">
              <Label htmlFor="user-active" className="text-sm font-medium cursor-pointer">
                Active user
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive users cannot sign in or perform actions.
              </p>
            </div>
            <CustomBadge className={activeBadgeClass(active)}>
              {active ? "Active" : "Inactive"}
            </CustomBadge>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isEdit ? "Save Changes" : "Create User"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Set Password Dialog (per user)
// ─────────────────────────────────────────────────────────
interface SetPasswordDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

function SetPasswordDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: SetPasswordDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (password.length < 4) {
      toast({
        title: "Password too short",
        description: "Use at least 4 characters.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const res = await apiRequest("/api/auth/set-password", "POST", {
      userId: user.id,
      password,
    });
    setSaving(false);
    if (res.ok) {
      toast({
        title: "Password set",
        description: `${user.displayName} can now sign in.`,
      });
      onSaved();
    } else {
      toast({
        title: "Failed to set password",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Set Password
          </DialogTitle>
          <DialogDescription>
            Set or reset the password for{" "}
            <span className="font-semibold text-foreground">
              {user?.displayName}
            </span>{" "}
            (<span className="font-mono">@{user?.username}</span>).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="New Password" required>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                className="bg-background pr-10"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>
          <Field label="Confirm Password" required>
            <Input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="bg-background"
              required
            />
          </Field>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              This will overwrite any existing password for this user. The user
              must use this new password to sign in.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-1" />
                  Set Password
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 2 — Roles & Access
// ═════════════════════════════════════════════════════════
function RolesAccessTab() {
  const { toast } = useToast();
  const roleDescriptions: {
    role: string;
    description: string;
    icon: LucideIcon;
  }[] = [
    {
      role: "Admin",
      description:
        "Full system control — manages users, settings and every module.",
      icon: Crown,
    },
    {
      role: "Manager",
      description: "Approves and oversees operations across most modules.",
      icon: UserCog,
    },
    {
      role: "Officer",
      description: "Edits operational records in assigned departments.",
      icon: Shield,
    },
    {
      role: "Clerk",
      description:
        "Creates and edits files, items and collection records.",
      icon: ClipboardCheck,
    },
    {
      role: "Viewer",
      description: "Read-only access to dashboards and records.",
      icon: Eye,
    },
  ];

  // Permission value options for the Select dropdowns
  const PERM_OPTIONS = [
    "—",
    "View",
    "Edit",
    "Create/Edit",
    "Create/Edit Files",
    "Create/Edit Items",
    "Full",
  ] as const;

  // Local state for editable modules — initialized from ROLE_PERMISSIONS, with
  // any user overrides from localStorage applied on top.
  type ModuleRow = {
    module: string;
    admin: string;
    manager: string;
    officer: string;
    clerk: string;
    viewer: string;
    custom: boolean; // true if user-added (not from ROLE_PERMISSIONS presets)
  };

  const STORAGE_KEY = "erp-settings-role-permissions-v1";

  // Merge preset + custom modules (custom modules are appended at the end)
  function loadModules(): ModuleRow[] {
    const presets: ModuleRow[] = ROLE_PERMISSIONS.map((r) => ({
      module: r.module,
      admin: r.admin,
      manager: r.manager,
      officer: r.officer,
      clerk: r.clerk,
      viewer: r.viewer,
      custom: false,
    }));
    if (typeof window === "undefined") return presets;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return presets;
      const stored = JSON.parse(raw) as ModuleRow[];
      if (!Array.isArray(stored)) return presets;
      // Apply stored overrides: presets are replaced by stored entries that
      // share the same module name; custom entries (custom: true) are appended.
      const presetNames = new Set(presets.map((p) => p.module));
      const customRows: ModuleRow[] = [];
      const overridesByName = new Map<string, ModuleRow>();
      stored.forEach((s) => {
        if (presetNames.has(s.module)) {
          overridesByName.set(s.module, { ...s, custom: false });
        } else {
          customRows.push({ ...s, custom: true });
        }
      });
      return [
        ...presets.map((p) => overridesByName.get(p.module) ?? p),
        ...customRows,
      ];
    } catch {
      return presets;
    }
  }

  const [rows, setRows] = useState<ModuleRow[]>(() => loadModules());
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ModuleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRow | null>(null);

  // Persist any change to localStorage
  function persist(next: ModuleRow[]) {
    setRows(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      /* ignore quota errors */
    }
  }

  function handleAdd(row: Omit<ModuleRow, "custom">) {
    const exists = rows.some(
      (r) => r.module.toLowerCase() === row.module.toLowerCase()
    );
    if (exists) {
      toast({
        title: "Module already exists",
        description: `A module named "${row.module}" is already in the matrix.`,
        variant: "destructive",
      });
      return;
    }
    persist([...rows, { ...row, custom: true }]);
    toast({
      title: "Module added",
      description: `${row.module} has been added to the matrix.`,
    });
    setAddOpen(false);
  }

  function handleEdit(originalName: string, updated: ModuleRow) {
    const next = rows.map((r) =>
      r.module === originalName ? { ...updated, custom: r.custom } : r
    );
    persist(next);
    toast({
      title: "Module updated",
      description: `${updated.module} permissions saved.`,
    });
    setEditTarget(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const next = rows.filter((r) => r.module !== deleteTarget.module);
    persist(next);
    toast({
      title: deleteTarget.custom ? "Custom module deleted" : "Module removed",
      description: `${deleteTarget.module} has been removed from the matrix.`,
    });
    setDeleteTarget(null);
  }

  function handleReset() {
    const presets: ModuleRow[] = ROLE_PERMISSIONS.map((r) => ({
      module: r.module,
      admin: r.admin,
      manager: r.manager,
      officer: r.officer,
      clerk: r.clerk,
      viewer: r.viewer,
      custom: false,
    }));
    persist(presets);
    toast({
      title: "Matrix reset",
      description: "All custom modules removed; presets restored to defaults.",
    });
  }

  const customCount = rows.filter((r) => r.custom).length;

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent border border-violet-500/20 rounded-xl p-5 flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0 ring-2 ring-violet-500/20">
          <Shield className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground">
            Roles &amp; Access Permissions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            The permission matrix defines what each role can do across every
            module of the CE Logistic Panel. Admins can add new modules, edit
            permissions, or remove custom modules. Changes are stored locally
            (in this browser) and can be reset to defaults anytime.
          </p>
        </div>
      </div>

      {/* Role description cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {roleDescriptions.map(({ role, description, icon: Icon }) => (
          <div
            key={role}
            className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center",
                  userRoleColor(role)
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <CustomBadge className={userRoleColor(role)}>{role}</CustomBadge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        ))}
      </div>

      {/* Permission matrix */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-secondary/60 to-transparent border-b border-border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ListTree className="h-4 w-4 text-primary" />
              Module Permission Matrix
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Editable RBAC matrix — preset modules can be edited, custom
              modules can be added or deleted.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CustomBadge className="bg-secondary text-muted-foreground border-border">
              {rows.length} modules × {USER_ROLES.length} roles
            </CustomBadge>
            {customCount > 0 && (
              <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30">
                <Plus className="h-3 w-3 mr-1" />
                {customCount} custom
              </CustomBadge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              title="Restore default matrix"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Module
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="min-w-[220px]">Module</TableHead>
                {USER_ROLES.map((role) => {
                  const Icon = roleDescriptions.find((r) => r.role === role)
                    ?.icon;
                  return (
                    <TableHead
                      key={role}
                      className="text-center min-w-[140px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            "h-7 w-7 rounded-md flex items-center justify-center",
                            userRoleColor(role)
                          )}
                        >
                          {Icon && <Icon className="h-3.5 w-3.5" />}
                        </div>
                        <span className="text-xs font-semibold">{role}</span>
                      </div>
                    </TableHead>
                  );
                })}
                <TableHead className="text-right min-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row.module}
                  className={cn(
                    "border-border transition-colors hover:bg-secondary/30",
                    idx % 2 === 1 && "bg-secondary/10",
                    row.custom && "bg-violet-500/5"
                  )}
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="truncate">{row.module}</span>
                      {row.custom && (
                        <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">
                          custom
                        </CustomBadge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionBadge value={row.admin} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionBadge value={row.manager} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionBadge value={row.officer} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionBadge value={row.clerk} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionBadge value={row.viewer} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditTarget(row)}
                        title="Edit module"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => setDeleteTarget(row)}
                        title="Delete module"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Legend */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Legend
        </p>
        <div className="flex flex-wrap gap-3">
          <CustomBadge className={permissionColor("Full")}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Full Access
          </CustomBadge>
          <CustomBadge className={permissionColor("Edit")}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit / Create
          </CustomBadge>
          <CustomBadge className={permissionColor("View")}>
            <Eye className="h-3 w-3 mr-1" />
            View Only
          </CustomBadge>
          <CustomBadge className={permissionColor("—")}>
            <XCircle className="h-3 w-3 mr-1" />
            No Access
          </CustomBadge>
        </div>
      </div>

      {/* Add Module dialog */}
      {addOpen && (
        <ModuleFormDialog
          key="add-module"
          open={addOpen}
          onOpenChange={setAddOpen}
          initial={null}
          permOptions={[...PERM_OPTIONS]}
          onSubmit={handleAdd}
        />
      )}

      {/* Edit Module dialog */}
      {editTarget && (
        <ModuleFormDialog
          key={`edit-module-${editTarget.module}`}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          initial={editTarget}
          permOptions={[...PERM_OPTIONS]}
          onSubmit={(row) => handleEdit(editTarget.module, row)}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.custom
                ? "Delete custom module?"
                : "Remove module from matrix?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.custom ? (
                <>
                  This will permanently remove the custom module{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget?.module}
                  </span>{" "}
                  from the permission matrix. This action cannot be undone.
                </>
              ) : (
                <>
                  This will remove the preset module{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget?.module}
                  </span>{" "}
                  from the local matrix. Use the &quot;Reset&quot; button
                  above to restore all preset modules at any time.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PermissionBadge({ value }: { value: string }) {
  return (
    <CustomBadge className={cn("text-xs", permissionColor(value))}>
      {value === "—" ? (
        <XCircle className="h-3 w-3 mr-1" />
      ) : value === "Full" ? (
        <CheckCircle2 className="h-3 w-3 mr-1" />
      ) : value === "View" ? (
        <Eye className="h-3 w-3 mr-1" />
      ) : (
        <Pencil className="h-3 w-3 mr-1" />
      )}
      {value}
    </CustomBadge>
  );
}

// ─────────────────────────────────────────────────────────
// Module Form Dialog (Add/Edit a permission matrix row)
// ─────────────────────────────────────────────────────────
interface ModuleFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: {
    module: string;
    admin: string;
    manager: string;
    officer: string;
    clerk: string;
    viewer: string;
    custom?: boolean;
  } | null;
  permOptions: string[];
  onSubmit: (row: {
    module: string;
    admin: string;
    manager: string;
    officer: string;
    clerk: string;
    viewer: string;
    custom: boolean;
  }) => void;
}

function ModuleFormDialog({
  open,
  onOpenChange,
  initial,
  permOptions,
  onSubmit,
}: ModuleFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [module, setModule] = useState(initial?.module ?? "");
  const [admin, setAdmin] = useState(initial?.admin ?? "—");
  const [manager, setManager] = useState(initial?.manager ?? "—");
  const [officer, setOfficer] = useState(initial?.officer ?? "—");
  const [clerk, setClerk] = useState(initial?.clerk ?? "—");
  const [viewer, setViewer] = useState(initial?.viewer ?? "—");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!module.trim()) {
      toast({ title: "Module name is required", variant: "destructive" });
      return;
    }
    onSubmit({
      module: module.trim(),
      admin,
      manager,
      officer,
      clerk,
      viewer,
      custom: initial?.custom ?? true,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Module Permissions" : "Add Module to Matrix"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Rename the module or adjust permissions for each role."
              : "Define a new module and set the access level for each role. The module will be marked as custom in the matrix."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Module Name" required>
            <Input
              value={module}
              onChange={(e) => setModule(e.target.value)}
              placeholder="e.g. Reports / Audit Logs / Inventory"
              className="bg-background"
              required
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: "admin", label: "Admin", val: admin, set: setAdmin },
              { key: "manager", label: "Manager", val: manager, set: setManager },
              { key: "officer", label: "Officer", val: officer, set: setOfficer },
              { key: "clerk", label: "Clerk", val: clerk, set: setClerk },
              { key: "viewer", label: "Viewer", val: viewer, set: setViewer },
            ] as const).map((f) => (
              <Field key={f.key} label={f.label}>
                <Select value={f.val} onValueChange={f.set}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {permOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              opt === "Full"
                                ? "bg-emerald-500"
                                : opt === "View"
                                ? "bg-slate-400"
                                : opt === "—"
                                ? "bg-red-400"
                                : "bg-blue-500"
                            )}
                          />
                          {opt}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ))}
          </div>
          {/* Live preview */}
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Preview
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CustomBadge className="bg-primary/15 text-primary border-primary/30">
                {module || "Module Name"}
              </CustomBadge>
              <PermissionBadge value={admin} />
              <PermissionBadge value={manager} />
              <PermissionBadge value={officer} />
              <PermissionBadge value={clerk} />
              <PermissionBadge value={viewer} />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {isEdit ? "Save Changes" : "Add Module"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 3 — Authentication
// ═════════════════════════════════════════════════════════
function AuthenticationTab() {
  const { toast } = useToast();
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginResult, setLoginResult] = useState<
    | { ok: boolean; user?: SessionUser; error?: string }
    | null
  >(null);

  const {
    data: session,
    loading: sessionLoading,
    refresh: refreshSession,
  } = useFetch<SessionResponse>("/api/auth/session");
  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    refresh: refreshUsers,
  } = useFetch<UserProfile[]>("/api/settings/users");
  // Stakeholders for the optional user ↔ stakeholder link in Add/Edit User dialogs
  const { data: stakeholders } = useFetch<Stakeholder[]>("/api/stakeholders");

  const [passwordTarget, setPasswordTarget] = useState<UserProfile | null>(
    null
  );
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState<UserProfile | null>(
    null
  );
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserProfile | null>(
    null
  );
  const [deletingUser, setDeletingUser] = useState(false);

  const defaultCredentials = [
    { u: "rperera", p: "admin123", role: "Admin" },
    { u: "tjaya", p: "manager123", role: "Manager" },
    { u: "mfernando", p: "officer123", role: "Officer" },
    { u: "pbandara", p: "clerk123", role: "Clerk" },
  ];

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      toast({
        title: "Username and password are required",
        variant: "destructive",
      });
      return;
    }
    setLoginLoading(true);
    setLoginResult(null);
    const res = await apiRequest("/api/auth/login", "POST", {
      username: loginUsername.trim(),
      password: loginPassword,
    });
    setLoginLoading(false);
    if (res.ok) {
      const data = res.data as { ok: boolean; user: SessionUser };
      setLoginResult({ ok: true, user: data.user });
      toast({
        title: "Login successful",
        description: `${data.user.displayName} (${data.user.role})`,
      });
      refreshSession();
    } else {
      setLoginResult({ ok: false, error: res.error });
      toast({
        title: "Login failed",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  async function handleLogout() {
    const res = await apiRequest("/api/auth/logout", "POST");
    if (res.ok) {
      toast({ title: "Logged out" });
      refreshSession();
    } else {
      toast({
        title: "Logout failed",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserTarget) return;
    setDeletingUser(true);
    const res = await apiRequest(
      `/api/settings/users/${deleteUserTarget.id}`,
      "DELETE"
    );
    setDeletingUser(false);
    if (res.ok) {
      toast({
        title: "User deleted",
        description: deleteUserTarget.displayName,
      });
      setDeleteUserTarget(null);
      refreshUsers();
    } else {
      toast({
        title: "Failed to delete user",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  const securedCount = users?.filter((u) => u.passwordHash).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Default credentials info card */}
      <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 ring-2 ring-blue-500/20">
            <Info className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground">
              Authentication Overview
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Users must have a password set to authenticate. Use the Set
              Password action to assign credentials. Below are the default
              seeded credentials:
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {defaultCredentials.map((c) => (
                <div
                  key={c.u}
                  className="bg-card/60 border border-border rounded-lg p-2.5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm text-foreground">
                      {c.u}
                    </span>
                    <CustomBadge className={userRoleColor(c.role)}>
                      {c.role}
                    </CustomBadge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    pwd: {c.p}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Login test panel */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-border p-4 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Login Test Panel
              </h3>
              <p className="text-xs text-muted-foreground">
                Verify credentials and create a session
              </p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="p-5 space-y-4">
            <Field label="Username" required>
              <Input
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. rperera"
                className="bg-background font-mono"
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-background"
                required
              />
            </Field>
            <Button type="submit" disabled={loginLoading} className="w-full">
              {loginLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-1" />
                  Test Login
                </>
              )}
            </Button>
            {loginResult && (
              <div
                className={cn(
                  "rounded-lg border p-3 flex items-start gap-2",
                  loginResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5"
                )}
              >
                {loginResult.ok ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-emerald-400">
                        Login successful
                      </p>
                      <p className="text-muted-foreground">
                        {loginResult.user?.displayName} (
                        {loginResult.user?.username}) — {loginResult.user?.role}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-red-400">
                        Login failed
                      </p>
                      <p className="text-muted-foreground">
                        {loginResult.error}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Current session */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500/10 to-transparent border-b border-border p-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Current Session
                </h3>
                <p className="text-xs text-muted-foreground">
                  Active session on this client
                </p>
              </div>
            </div>
            {session?.authenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-400 hover:text-red-500 hover:bg-red-500/10 border-red-500/30"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Logout
              </Button>
            )}
          </div>
          <div className="p-5">
            {sessionLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : session?.authenticated && session.user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-base font-bold">
                    {session.user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">
                      {session.user.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      @{session.user.username}
                    </p>
                  </div>
                  <CustomBadge
                    className={cn(
                      "ml-auto shrink-0",
                      userRoleColor(session.user.role)
                    )}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {session.user.role}
                  </CustomBadge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="bg-secondary/40 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      User ID
                    </p>
                    <p className="text-xs font-mono text-foreground truncate">
                      {session.user.id}
                    </p>
                  </div>
                  <div className="bg-secondary/40 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Department
                    </p>
                    <p className="text-sm text-foreground">
                      {session.user.department || "—"}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Session is active. Cookie-based session valid for 24 hours.
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                  <Lock className="h-6 w-6 text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Not authenticated
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the Login Test Panel to start a session.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User CRUD section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/10 to-transparent border-b border-border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                User Management
              </h3>
              <p className="text-xs text-muted-foreground">
                Add, edit, delete users and set passwords
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CustomBadge className="bg-secondary text-muted-foreground border-border">
              {securedCount} / {users?.length ?? 0} secured
            </CustomBadge>
            <Button size="sm" onClick={() => setAddUserOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add User
            </Button>
          </div>
        </div>
        {usersLoading ? (
          <LoadingState label="Loading users..." />
        ) : usersError ? (
          <ErrorState message={usersError} />
        ) : users && users.length > 0 ? (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[40px]">Sr</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, idx) => {
                  const hasPassword = !!u.passwordHash;
                  return (
                    <TableRow
                      key={u.id}
                      className="border-border hover:bg-secondary/30 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {u.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              @{u.username}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CustomBadge className={userRoleColor(u.role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {u.role}
                        </CustomBadge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {u.department || "—"}
                      </TableCell>
                      <TableCell>
                        <CustomBadge
                          className={
                            hasPassword
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          }
                        >
                          {hasPassword ? (
                            <>
                              <Lock className="h-3 w-3 mr-1" />
                              Password Set
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3 mr-1" />
                              No Password
                            </>
                          )}
                        </CustomBadge>
                      </TableCell>
                      <TableCell>
                        <CustomBadge className={activeBadgeClass(u.active)}>
                          {u.active ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </CustomBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                            onClick={() => setPasswordTarget(u)}
                            title="Set or reset password"
                          >
                            <KeyRound className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Password</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setEditUserTarget(u)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => setDeleteUserTarget(u)}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Add a new user to grant them login access."
            action={
              <Button size="sm" onClick={() => setAddUserOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add User
              </Button>
            }
          />
        )}
      </div>

      {passwordTarget && (
        <SetPasswordDialog
          key={`pwd-${passwordTarget.id}`}
          user={passwordTarget}
          open={!!passwordTarget}
          onOpenChange={(o) => !o && setPasswordTarget(null)}
          onSaved={() => {
            setPasswordTarget(null);
            refreshUsers();
          }}
        />
      )}

      {addUserOpen && (
        <UserFormDialog
          key="auth-add-user"
          open={addUserOpen}
          onOpenChange={setAddUserOpen}
          initial={null}
          stakeholders={stakeholders ?? []}
          onSaved={() => {
            setAddUserOpen(false);
            refreshUsers();
          }}
        />
      )}

      {editUserTarget && (
        <UserFormDialog
          key={`auth-edit-${editUserTarget.id}`}
          open={!!editUserTarget}
          onOpenChange={(o) => !o && setEditUserTarget(null)}
          initial={editUserTarget}
          stakeholders={stakeholders ?? []}
          onSaved={() => {
            setEditUserTarget(null);
            refreshUsers();
          }}
        />
      )}

      <AlertDialog
        open={!!deleteUserTarget}
        onOpenChange={(o) => !o && setDeleteUserTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteUserTarget?.displayName}
              </span>{" "}
              ({deleteUserTarget?.username}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deletingUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingUser ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 4 — Vote Management
// ═════════════════════════════════════════════════════════
function VoteManagementTab() {
  const { data: list, loading, error, refresh } = useFetch<Vote[]>(
    "/api/votes"
  );
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const stats = useMemo(() => {
    const votes = list ?? [];
    const capital = votes.filter((v) => v.voteType === "Capital");
    const recurring = votes.filter((v) => v.voteType === "Recurring");
    const active = votes.filter((v) => v.active);
    return {
      total: votes.length,
      capital: capital.length,
      recurring: recurring.length,
      active: active.length,
    };
  }, [list]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiRequest(`/api/votes/${deleteTarget.id}`, "DELETE");
    setDeleting(false);
    if (res.ok) {
      toast({
        title: "Vote deleted",
        description: deleteTarget.voteNumber,
      });
      setDeleteTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  if (loading) return <LoadingState label="Loading votes..." />;
  if (error) return <ErrorState message={error} />;

  const votes = list ?? [];

  return (
    <div className="space-y-5">
      {/* Stat cards (custom gradient cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 hover:from-blue-500/15 hover:to-blue-500/10 transition-all">
          <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <Vote className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Votes
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {stats.total}
            </p>
            <p className="text-xs text-muted-foreground">All configured</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 hover:from-blue-500/15 hover:to-cyan-500/10 transition-all">
          <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Capital Votes
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {stats.capital}
            </p>
            <p className="text-xs text-muted-foreground">One-time funds</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 hover:from-amber-500/15 hover:to-orange-500/10 transition-all">
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Recurring Votes
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {stats.recurring}
            </p>
            <p className="text-xs text-muted-foreground">
              Annual maintenance
            </p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3 hover:from-emerald-500/15 hover:to-teal-500/10 transition-all">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Active Votes
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {stats.active}
            </p>
            <p className="text-xs text-muted-foreground">Operational</p>
          </div>
        </div>
      </div>

      {/* Hint card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
          <Info className="h-5 w-5" />
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground">About Votes</p>
          <p className="text-muted-foreground mt-0.5">
            <span className="text-blue-400 font-medium">Capital votes</span>{" "}
            fund one-time construction/renovation.{" "}
            <span className="text-amber-400 font-medium">Recurring votes</span>{" "}
            fund annual maintenance. Votes are the financial method for how
            funds are granted by Government Treasury under a particular vote.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-secondary/60 to-transparent border-b border-border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Vote className="h-4 w-4 text-primary" />
              Vote Register
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              All votes/funds granted by the Treasury
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Add Vote
          </Button>
        </div>
        {votes.length === 0 ? (
          <EmptyState
            icon={Vote}
            title="No votes configured"
            description="Add your first vote/fund to track financial allocations from the Treasury."
            action={
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Vote
              </Button>
            }
          />
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[40px]">Sr</TableHead>
                  <TableHead>Vote Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Financial Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {votes.map((v, idx) => (
                  <TableRow
                    key={v.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-semibold text-foreground bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                        {v.voteNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {v.description || "—"}
                    </TableCell>
                    <TableCell>
                      <CustomBadge className={voteTypeColor(v.voteType)}>
                        {v.voteType === "Capital" ? (
                          <Landmark className="h-3 w-3 mr-1" />
                        ) : (
                          <Activity className="h-3 w-3 mr-1" />
                        )}
                        {v.voteType}
                      </CustomBadge>
                    </TableCell>
                    <TableCell>
                      {v.department ? (
                        <CustomBadge
                          className={cn(
                            "border",
                            (VOTE_DEPARTMENTS as readonly string[]).includes(
                              v.department
                            )
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              : "bg-violet-500/15 text-violet-400 border-violet-500/30"
                          )}
                        >
                          <Building2 className="h-3 w-3 mr-1" />
                          {v.department}
                        </CustomBadge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.financialYear ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {v.financialYear}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomBadge className={activeBadgeClass(v.active)}>
                        {v.active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditTarget(v)}
                          title="Edit vote"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => setDeleteTarget(v)}
                          title="Delete vote"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {addOpen && (
        <VoteFormDialog
          key="add-vote"
          open={addOpen}
          onOpenChange={setAddOpen}
          initial={null}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}

      {editTarget && (
        <VoteFormDialog
          key={`edit-vote-${editTarget.id}`}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          initial={editTarget}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vote?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete vote{" "}
              <span className="font-semibold text-foreground font-mono">
                {deleteTarget?.voteNumber}
              </span>{" "}
              ({deleteTarget?.description}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Vote"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Vote Form Dialog (Add/Edit)
// ─────────────────────────────────────────────────────────
interface VoteFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Vote | null;
  onSaved: () => void;
}

function VoteFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: VoteFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [voteNumber, setVoteNumber] = useState(initial?.voteNumber ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [voteType, setVoteType] = useState<string>(
    initial?.voteType ?? "Capital"
  );
  const [department, setDepartment] = useState<string>(
    initial?.department ?? "SLN"
  );
  const [financialYear, setFinancialYear] = useState(
    initial?.financialYear ?? ""
  );
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!voteNumber.trim()) {
      toast({ title: "Vote number is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      voteNumber: voteNumber.trim(),
      description: description.trim(),
      voteType,
      department: department.trim() || null,
      financialYear: financialYear.trim() || null,
      active,
    };
    const res = isEdit
      ? await apiRequest(`/api/votes/${initial!.id}`, "PUT", body)
      : await apiRequest("/api/votes", "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "Vote updated" : "Vote added",
        description: body.voteNumber,
      });
      onSaved();
    } else {
      toast({
        title: "Failed to save",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  // Determine if the current department value matches a preset (for badge styling)
  const isPresetDept = (VOTE_DEPARTMENTS as readonly string[]).includes(
    department
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Vote" : "Add Vote / Fund"}
          </DialogTitle>
          <DialogDescription>
            Configure a Treasury vote (fund) — used to identify the source of
            funding for projects and maintenance. Only active votes appear in
            the Projects wizard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Vote Number" required>
            <Input
              value={voteNumber}
              onChange={(e) => setVoteNumber(e.target.value)}
              placeholder="e.g. 223-1-01-2104"
              className="bg-background font-mono"
              required
            />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. New Construction / Renovation"
              className="bg-background"
            />
          </Field>
          <Field label="Vote Type">
            <Select value={voteType} onValueChange={setVoteType}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {VOTE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          t === "Capital" ? "bg-blue-500" : "bg-amber-500"
                        )}
                      />
                      {t}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Department">
            <div className="relative">
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. SLN / MOD / custom"
                className="bg-background"
                list="vote-dept-options"
              />
              <datalist id="vote-dept-options">
                {VOTE_DEPARTMENTS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground">
                Quick pick:
              </span>
              {VOTE_DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepartment(d)}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-md border transition-colors",
                    department === d
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:bg-secondary/60"
                  )}
                >
                  {d}
                </button>
              ))}
              {!isPresetDept && department && (
                <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">
                  custom
                </CustomBadge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pick SLN or MOD, or type a custom department code. Used to filter
              votes in the Projects wizard.
            </p>
          </Field>
          <Field label="Financial Year">
            <Input
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              placeholder="e.g. 2024/2025"
              className="bg-background"
            />
          </Field>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
            <Checkbox
              id="vote-active"
              checked={active}
              onCheckedChange={(v) => setActive(v === true)}
            />
            <div className="flex-1">
              <Label
                htmlFor="vote-active"
                className="text-sm font-medium cursor-pointer"
              >
                Active vote
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive votes are hidden from project allocation dropdowns.
              </p>
            </div>
            <CustomBadge className={activeBadgeClass(active)}>
              {active ? "Active" : "Inactive"}
            </CustomBadge>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-300 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              <span className="text-blue-400 font-medium">Capital</span> votes
              fund one-time construction/renovation.{" "}
              <span className="text-amber-400 font-medium">Recurring</span>{" "}
              votes fund annual maintenance. Allocations are tracked per-project
              in the Projects module, not on the vote itself.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isEdit ? "Save Changes" : "Add Vote"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 5 — Store Management
// ═════════════════════════════════════════════════════════
function StoreManagementTab() {
  const { data: list, loading, error, refresh } = useFetch<StoreConfig[]>(
    "/api/settings/stores-config"
  );
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StoreConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (!list) return [];
    const s = search.trim().toLowerCase();
    return list.filter((st) => {
      if (typeFilter !== "all" && st.storeType !== typeFilter) return false;
      if (activeFilter === "active" && !st.active) return false;
      if (activeFilter === "inactive" && st.active) return false;
      if (s) {
        const hay =
          `${st.storeName} ${st.storeType} ${st.responsiblePerson ?? ""} ${st.location ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [list, search, typeFilter, activeFilter]);

  const filtersActive =
    search !== "" || typeFilter !== "all" || activeFilter !== "all";

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setActiveFilter("all");
  }

  const activeCount = useMemo(
    () => list?.filter((s) => s.active).length ?? 0,
    [list]
  );

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    list?.forEach((s) => {
      map.set(s.storeType, (map.get(s.storeType) ?? 0) + 1);
    });
    return map;
  }, [list]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiRequest(
      `/api/settings/stores-config/${deleteTarget.id}`,
      "DELETE"
    );
    setDeleting(false);
    if (res.ok) {
      toast({
        title: "Store deleted",
        description: deleteTarget.storeName,
      });
      setDeleteTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  if (loading) return <LoadingState label="Loading store configuration..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent border border-pink-500/20 rounded-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-pink-500/15 text-pink-400 flex items-center justify-center shrink-0">
          <Warehouse className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Store Configuration
          </h3>
          <p className="text-xs text-muted-foreground">
            Define zones, area stores, ready-use, balance and project stores
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Stores"
          value={list?.length ?? 0}
          icon={Warehouse}
          accent="blue"
          sub="All configurations"
        />
        <StatCard
          label="Active"
          value={activeCount}
          icon={CheckCircle2}
          accent="green"
          sub="Operational"
        />
        <StatCard
          label="Zones"
          value={typeBreakdown.get("Zone") ?? 0}
          icon={Layers}
          accent="purple"
          sub="Storage zones"
        />
        <StatCard
          label="Area Stores"
          value={typeBreakdown.get("AreaStore") ?? 0}
          icon={Building2}
          accent="amber"
          sub="Category stores"
        />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Search (Name / Person / Location)
            </Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search stores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-background w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {STORE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {storeTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="bg-background w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {filtersActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Store
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title={
              filtersActive ? "No matching stores" : "No stores configured"
            }
            description={
              filtersActive
                ? "Try adjusting your search or filters."
                : "Add your first store configuration (Zone, Area Store, Ready-Use, Balance, Project)."
            }
            action={
              filtersActive ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Store
                </Button>
              )
            }
          />
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[40px]">Sr</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Responsible Officers</TableHead>
                  <TableHead>Responsible Persons</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, idx) => {
                  const officers = parseJsonArray(s.responsibleOfficers);
                  const persons = parseJsonArray(s.responsiblePersons);
                  return (
                    <TableRow key={s.id} className="border-border">
                      <TableCell className="text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-primary/15 text-primary flex items-center justify-center">
                            <Warehouse className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-foreground">
                            {s.storeName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CustomBadge className={storeTypeColor(s.storeType)}>
                          {storeTypeLabel(s.storeType)}
                        </CustomBadge>
                      </TableCell>
                      <TableCell>
                        {s.department ? (
                          <CustomBadge
                            className={cn(
                              "border",
                              s.department === "CSLOG"
                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                : "bg-violet-500/15 text-violet-400 border-violet-500/30"
                            )}
                          >
                            {s.department}
                          </CustomBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {officers.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {officers.map((name) => (
                              <CustomBadge
                                key={name}
                                className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]"
                              >
                                {name}
                              </CustomBadge>
                            ))}
                          </div>
                        ) : s.responsiblePerson ? (
                          <span className="text-xs text-muted-foreground italic">
                            {s.responsiblePerson}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {persons.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {persons.map((name) => (
                              <CustomBadge
                                key={name}
                                className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
                              >
                                {name}
                              </CustomBadge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.location ? (
                          <span className="text-sm text-foreground">
                            {s.location}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <CustomBadge className={activeBadgeClass(s.active)}>
                          {s.active ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </CustomBadge>
                      </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditTarget(s)}
                          title="Edit store"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => setDeleteTarget(s)}
                          title="Delete store"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {addOpen && (
        <StoreFormDialog
          key="add-store"
          open={addOpen}
          onOpenChange={setAddOpen}
          initial={null}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}

      {editTarget && (
        <StoreFormDialog
          key={`edit-${editTarget.id}`}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          initial={editTarget}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete store configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.storeName}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Store"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Store Form Dialog (Add/Edit)
// ─────────────────────────────────────────────────────────
interface StoreFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: StoreConfig | null;
  onSaved: () => void;
}

function StoreFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: StoreFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Fetch stakeholders for multi-select responsible persons/officers
  const { data: stakeholders, loading: stakeholdersLoading } =
    useFetch<Stakeholder[]>("/api/stakeholders");

  const [storeName, setStoreName] = useState(initial?.storeName ?? "");
  const [storeType, setStoreType] = useState<string>(
    initial?.storeType ?? "Zone"
  );
  const [department, setDepartment] = useState<string>(
    initial?.department ?? "CSLOG"
  );
  // Parse JSON-encoded arrays from the API response
  const [responsiblePersons, setResponsiblePersons] = useState<string[]>(
    () => parseJsonArray(initial?.responsiblePersons)
  );
  const [responsibleOfficers, setResponsibleOfficers] = useState<string[]>(
    () => parseJsonArray(initial?.responsibleOfficers)
  );
  // Backward-compat single responsible person field (kept for display)
  const [responsiblePerson, setResponsiblePerson] = useState(
    initial?.responsiblePerson ?? ""
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  // Filter stakeholders by department + category for the multi-selects.
  // Department mapping: store dept "CSLOG" → stakeholder dept "CSLOG";
  // store dept "CCED" → stakeholder dept "CE".
  const deptForStakeholder = department === "CCED" ? "CE" : "CSLOG";
  const officerList = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      if (s.department !== deptForStakeholder) return false;
      return s.category.toLowerCase().includes("officer");
    });
  }, [stakeholders, deptForStakeholder]);
  const sailorList = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      if (s.department !== deptForStakeholder) return false;
      return s.category.toLowerCase().includes("sailor");
    });
  }, [stakeholders, deptForStakeholder]);

  function toggleInList(
    list: string[],
    setList: (v: string[]) => void,
    name: string
  ) {
    if (list.includes(name)) {
      setList(list.filter((v) => v !== name));
    } else {
      setList([...list, name]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) {
      toast({ title: "Store name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      storeName: storeName.trim(),
      storeType,
      department,
      responsiblePersons,
      responsibleOfficers,
      responsiblePerson: responsiblePerson.trim() || null,
      location: location.trim() || null,
      active,
    };
    const res = isEdit
      ? await apiRequest(
          `/api/settings/stores-config/${initial!.id}`,
          "PUT",
          body
        )
      : await apiRequest("/api/settings/stores-config", "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "Store updated" : "Store added",
        description: body.storeName,
      });
      onSaved();
    } else {
      toast({
        title: "Failed to save",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Store Configuration" : "Add Store Configuration"}
          </DialogTitle>
          <DialogDescription>
            Define the store name, type, department and multiple responsible
            officers / persons (from the stakeholder directory).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Store Name" required>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Zone A / BMS Area Store / Ready-Use Stores"
                className="bg-background"
                required
              />
            </Field>
            <Field label="Store Type">
              <Select value={storeType} onValueChange={setStoreType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select store type" />
                </SelectTrigger>
                <SelectContent>
                  {STORE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {storeTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Department">
            <Select
              value={department}
              onValueChange={(v) => {
                setDepartment(v);
                // Reset selections when department changes (stakeholders are dept-filtered)
                setResponsiblePersons([]);
                setResponsibleOfficers([]);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CSLOG">CSLOG</SelectItem>
                <SelectItem value="CCED">CCED</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Filters the stakeholder directory: CSLOG → CSLOG officers/sailors,
              CCED → CE officers/sailors.
            </p>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MultiStakeholderPicker
              label="Responsible Officers"
              value={responsibleOfficers}
              onChange={setResponsibleOfficers}
              options={officerList}
              loading={stakeholdersLoading}
              emptyHint={`No officers found in ${department} department`}
            />
            <MultiStakeholderPicker
              label="Responsible Persons (Sailors)"
              value={responsiblePersons}
              onChange={setResponsiblePersons}
              options={sailorList}
              loading={stakeholdersLoading}
              emptyHint={`No sailors found in ${department} department`}
            />
          </div>
          <Field label="Responsible Person (legacy free-text)">
            <Input
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              placeholder="e.g. PO Bandara / LS Silva"
              className="bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              Optional free-text fallback for backward compatibility. Prefer the
              multi-selects above.
            </p>
          </Field>
          <Field label="Location">
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. CSLOG BMS Bay / Dockyard Block A"
              className="bg-background"
            />
          </Field>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
            <Checkbox
              id="store-active"
              checked={active}
              onCheckedChange={(v) => setActive(v === true)}
            />
            <div className="flex-1">
              <Label
                htmlFor="store-active"
                className="text-sm font-medium cursor-pointer"
              >
                Active store
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive stores are hidden from operational dropdowns.
              </p>
            </div>
            <CustomBadge className={activeBadgeClass(active)}>
              {active ? "Active" : "Inactive"}
            </CustomBadge>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isEdit ? "Save Changes" : "Add Store"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Multi-Stakeholder Picker (reusable multi-select from stakeholder directory)
// ─────────────────────────────────────────────────────────
interface MultiStakeholderPickerProps {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: Stakeholder[];
  loading?: boolean;
  emptyHint?: string;
}

function MultiStakeholderPicker({
  label,
  value,
  onChange,
  options,
  loading,
  emptyHint,
}: MultiStakeholderPickerProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) =>
      `${o.name} ${o.rankOrRate ?? ""} ${o.appointment ?? ""} ${o.svcNumber ?? ""}`.toLowerCase().includes(s)
    );
  }, [options, search]);

  function toggle(name: string) {
    if (value.includes(name)) {
      onChange(value.filter((v) => v !== name));
    } else {
      onChange([...value, name]);
    }
  }

  return (
    <Field label={label}>
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <div className="border-b border-border p-2 bg-secondary/30">
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stakeholders..."
              className="h-7 pl-7 text-xs bg-background border-0 focus-visible:ring-1 focus-visible:ring-primary/40"
            />
          </div>
        </div>
        <div className="max-h-44 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">
              {emptyHint ?? "No stakeholders available"}
            </p>
          ) : (
            filtered.map((s) => {
              const checked = value.includes(s.name);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-secondary/40 border-b border-border last:border-b-0",
                    checked && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(s.name)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {[s.rankOrRate, s.appointment, s.areaStoreLocation]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {value.map((name) => (
            <CustomBadge
              key={name}
              className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"
            >
              {name}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== name))}
                className="hover:text-red-400"
                aria-label={`Remove ${name}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </CustomBadge>
          ))}
        </div>
      )}
    </Field>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 6 — Process Flows (centerpiece)
// ═════════════════════════════════════════════════════════
function ProcessFlowsTab() {
  const { data: flows, loading, error, refresh } = useFetch<ProcessFlow[]>(
    "/api/process-flows"
  );
  const { toast } = useToast();

  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [editFlowTarget, setEditFlowTarget] = useState<ProcessFlow | null>(null);
  const [deleteFlowTarget, setDeleteFlowTarget] = useState<ProcessFlow | null>(
    null
  );
  const [deletingFlow, setDeletingFlow] = useState(false);

  // Step dialog state
  const [addStepForFlow, setAddStepForFlow] = useState<ProcessFlow | null>(null);
  const [editStepTarget, setEditStepTarget] = useState<{
    flow: ProcessFlow;
    step: ProcessStep;
  } | null>(null);
  const [deleteStepTarget, setDeleteStepTarget] = useState<{
    flow: ProcessFlow;
    step: ProcessStep;
  } | null>(null);
  const [deletingStep, setDeletingStep] = useState(false);

  const totalSteps = useMemo(
    () => flows?.reduce((acc, f) => acc + (f.steps?.length ?? 0), 0) ?? 0,
    [flows]
  );

  function summaryLabel(name: string, steps: number): string {
    return `${name} (${steps} step${steps === 1 ? "" : "s"})`;
  }

  async function handleDeleteFlow() {
    if (!deleteFlowTarget) return;
    setDeletingFlow(true);
    const res = await apiRequest(
      `/api/process-flows/${deleteFlowTarget.id}`,
      "DELETE"
    );
    setDeletingFlow(false);
    if (res.ok) {
      toast({
        title: "Process flow deleted",
        description: deleteFlowTarget.name,
      });
      setDeleteFlowTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  async function handleDeleteStep() {
    if (!deleteStepTarget) return;
    setDeletingStep(true);
    const res = await apiRequest(
      `/api/process-flows/${deleteStepTarget.flow.id}/steps/${deleteStepTarget.step.id}`,
      "DELETE"
    );
    setDeletingStep(false);
    if (res.ok) {
      toast({
        title: "Step removed",
        description: `${deleteStepTarget.step.positionName ?? deleteStepTarget.step.predefinedStage ?? "Step"} from ${deleteStepTarget.flow.name} flow`,
      });
      setDeleteStepTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete step",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  if (loading) return <LoadingState label="Loading process flows..." />;
  if (error) return <ErrorState message={error} />;

  const flowsArr = flows ?? [];

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="bg-gradient-to-r from-card via-card to-secondary/40 border border-border rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ListTree className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Procurement Process Flows Overview
              </p>
              <h2 className="text-xl font-bold text-foreground mt-0.5">
                {flowsArr.length} process flow
                {flowsArr.length === 1 ? "" : "s"} configured —{" "}
                <span className="text-primary">{totalSteps}</span> total steps
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {flowsArr.length > 0
                  ? flowsArr
                      .map((f) => summaryLabel(f.name, f.steps?.length ?? 0))
                      .join(" · ")
                  : "No flows yet. Create one to define your procurement process."}
              </p>
            </div>
          </div>
          <Button onClick={() => setAddFlowOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Add Flow
          </Button>
        </div>
      </div>

      {/* Flow cards */}
      {flowsArr.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No process flows configured"
          description="Create RC, Non-Rate, or ARO (Contractual) flows to define how files move through your procurement pipeline — including tender stages, evaluation branches and financial delegation levels."
          action={
            <Button onClick={() => setAddFlowOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Flow
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {flowsArr.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onAddStep={() => setAddStepForFlow(flow)}
              onEditStep={(step) =>
                setEditStepTarget({ flow, step })
              }
              onDeleteStep={(step) =>
                setDeleteStepTarget({ flow, step })
              }
              onEditFlow={() => setEditFlowTarget(flow)}
              onDeleteFlow={() => setDeleteFlowTarget(flow)}
            />
          ))}
        </div>
      )}

      {/* Add Flow dialog */}
      {addFlowOpen && (
        <FlowFormDialog
          key="add-flow"
          open={addFlowOpen}
          onOpenChange={setAddFlowOpen}
          initial={null}
          onSaved={() => {
            setAddFlowOpen(false);
            refresh();
          }}
        />
      )}

      {/* Edit Flow dialog */}
      {editFlowTarget && (
        <FlowFormDialog
          key={`edit-flow-${editFlowTarget.id}`}
          open={!!editFlowTarget}
          onOpenChange={(o) => !o && setEditFlowTarget(null)}
          initial={editFlowTarget}
          onSaved={() => {
            setEditFlowTarget(null);
            refresh();
          }}
        />
      )}

      {/* Delete Flow confirm */}
      <AlertDialog
        open={!!deleteFlowTarget}
        onOpenChange={(o) => !o && setDeleteFlowTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete process flow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the{" "}
              <span className="font-semibold text-foreground">
                {deleteFlowTarget?.name}
              </span>{" "}
              flow and all{" "}
              <span className="font-semibold text-foreground">
                {deleteFlowTarget?.steps?.length ?? 0}
              </span>{" "}
              of its steps. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingFlow}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFlow}
              disabled={deletingFlow}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingFlow ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Flow"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Step dialog */}
      {addStepForFlow && (
        <StepFormDialog
          key={`add-step-${addStepForFlow.id}`}
          open={!!addStepForFlow}
          onOpenChange={(o) => !o && setAddStepForFlow(null)}
          flow={addStepForFlow}
          initial={null}
          onSaved={() => {
            setAddStepForFlow(null);
            refresh();
          }}
        />
      )}

      {/* Edit Step dialog */}
      {editStepTarget && (
        <StepFormDialog
          key={`edit-step-${editStepTarget.step.id}`}
          open={!!editStepTarget}
          onOpenChange={(o) => !o && setEditStepTarget(null)}
          flow={editStepTarget.flow}
          initial={editStepTarget.step}
          onSaved={() => {
            setEditStepTarget(null);
            refresh();
          }}
        />
      )}

      {/* Delete Step confirm */}
      <AlertDialog
        open={!!deleteStepTarget}
        onOpenChange={(o) => !o && setDeleteStepTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete process step?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{" "}
              <span className="font-semibold text-foreground">
                {deleteStepTarget?.step.positionName ??
                  deleteStepTarget?.step.predefinedStage ??
                  "this step"}
              </span>{" "}
              from the{" "}
              <span className="font-semibold text-foreground">
                {deleteStepTarget?.flow.name}
              </span>{" "}
              flow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingStep}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStep}
              disabled={deletingStep}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingStep ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Step"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Timeline helpers — build ordered list from before/after links
// ─────────────────────────────────────────────────────────

/** Display name for a step: predefined stage label OR custom position name. */
function stepDisplayName(step: ProcessStep): string {
  return step.predefinedStage || step.positionName || "Unnamed Step";
}

/**
 * Build an ordered timeline from before/after links.
 * Strategy: find root steps (beforeStepId == null/empty/unknown), follow the
 * afterStepId chain. Fall back to children lookup (steps whose beforeStepId
 * === step.id) for legacy data without an explicit after chain. Any orphans
 * are appended at the end. Cycles are guarded against via a visited set.
 */
function buildTimeline(steps: ProcessStep[]): ProcessStep[] {
  if (!steps || steps.length === 0) return [];
  const map = new Map(steps.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const ordered: ProcessStep[] = [];

  const byStableOrder = (a: ProcessStep, b: ProcessStep) => {
    const ao = a.stepOrder ?? 0;
    const bo = b.stepOrder ?? 0;
    if (ao !== bo) return ao - bo;
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  };

  // Roots: beforeStepId is null/empty/unknown
  const roots = steps
    .filter((s) => !s.beforeStepId || !map.has(s.beforeStepId))
    .sort(byStableOrder);

  function visit(step: ProcessStep) {
    if (visited.has(step.id)) return;
    visited.add(step.id);
    ordered.push(step);
    // Follow the explicit after-chain first
    if (step.afterStepId && map.has(step.afterStepId)) {
      visit(map.get(step.afterStepId)!);
    }
    // Then visit any children that point to this step as their before (in
    // case afterStepId wasn't auto-set, e.g. legacy data).
    const children = steps
      .filter((s) => s.beforeStepId === step.id)
      .sort(byStableOrder);
    for (const c of children) visit(c);
  }

  for (const r of roots) visit(r);

  // Append any orphan steps not visited (defensive)
  const orphans = steps.filter((s) => !visited.has(s.id)).sort(byStableOrder);
  for (const o of orphans) ordered.push(o);

  return ordered;
}

// ─────────────────────────────────────────────────────────
// Flow Card (compact header + vertical timeline of steps)
// ─────────────────────────────────────────────────────────
interface FlowCardProps {
  flow: ProcessFlow;
  onAddStep: () => void;
  onEditStep: (step: ProcessStep) => void;
  onDeleteStep: (step: ProcessStep) => void;
  onEditFlow: () => void;
  onDeleteFlow: () => void;
}

function FlowCard({
  flow,
  onAddStep,
  onEditStep,
  onDeleteStep,
  onEditFlow,
  onDeleteFlow,
}: FlowCardProps) {
  const accent = flowAccent(flow.name);
  const steps = buildTimeline(flow.steps ?? []);
  const tenderCount = steps.filter((s) => s.isTenderStage).length;
  const evalCount = steps.filter((s) => s.isEvaluationStage).length;

  return (
    <div
      className={cn(
        "bg-card border rounded-xl overflow-hidden flex flex-col h-full",
        accent.border
      )}
    >
      {/* Colored header — compact */}
      <div
        className={cn(
          "flex flex-col gap-2.5 p-4 border-b",
          accent.headerBg,
          accent.border
        )}
      >
        <div className="flex items-start gap-2 min-w-0">
          <div
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ring-2",
              accent.headerBg,
              accent.ring
            )}
          >
            <GitBranch className={cn("h-5 w-5", accent.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground truncate">
                {flow.name}
              </h3>
              <CustomBadge className={cn("text-[10px]", accent.badge)}>
                {steps.length} step{steps.length === 1 ? "" : "s"}
              </CustomBadge>
            </div>
            {flow.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {flow.description}
              </p>
            )}
            {(tenderCount > 0 || evalCount > 0) && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tenderCount > 0 && (
                  <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                    <Gavel className="h-2.5 w-2.5 mr-0.5" />
                    {tenderCount} Tender
                  </CustomBadge>
                )}
                {evalCount > 0 && (
                  <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">
                    <ClipboardCheck className="h-2.5 w-2.5 mr-0.5" />
                    {evalCount} Eval
                  </CustomBadge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditFlow}
            className="bg-background/60 h-7 text-xs flex-1"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteFlow}
            className="bg-background/60 text-red-400 hover:text-red-500 hover:bg-red-500/10 border-red-500/30 h-7 text-xs px-2"
            title="Delete flow"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button size="sm" onClick={onAddStep} className="h-7 text-xs flex-1">
            <Plus className="h-3 w-3 mr-1" />
            Add Step
          </Button>
        </div>
      </div>

      {/* Body — compact vertical timeline */}
      <div className="p-4 flex-1">
        {steps.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            <ListTree className="h-6 w-6 mx-auto mb-1 opacity-40" />
            No steps yet.
            <div className="mt-2">
              <Button size="sm" onClick={onAddStep} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add First Step
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative pl-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {/* vertical line */}
            <div
              className={cn(
                "absolute left-1.5 top-2 bottom-2 w-0.5",
                accent.dot,
                "opacity-30"
              )}
            />
            <ol className="space-y-2.5">
              {steps.map((step, idx) => (
                <StepTimelineItem
                  key={step.id}
                  step={step}
                  isLast={idx === steps.length - 1}
                  accent={accent}
                  onEdit={() => onEditStep(step)}
                  onDelete={() => onDeleteStep(step)}
                />
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Step Timeline Item (compact, side-by-side friendly)
// ─────────────────────────────────────────────────────────
interface StepTimelineItemProps {
  step: ProcessStep;
  isLast: boolean;
  accent: ReturnType<typeof flowAccent>;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStepDays?: (stepId: string, days: number) => void;
  onUpdateStepPercentage?: (stepId: string, pct: number) => void;
}

function StepTimelineItem({
  step,
  accent,
  onEdit,
  onDelete,
  onUpdateStepDays,
  onUpdateStepPercentage,
}: StepTimelineItemProps) {
  const name = stepDisplayName(step);
  const officers = parseJsonArray(step.responsibleOfficers);
  const sailors = parseJsonArray(step.responsibleSailors);
  const hasDelegation =
    !!step.financialDelegationLevel &&
    step.financialDelegationLevel.trim() !== "" &&
    step.financialDelegationLevel !== "—";
  const branchBorder = step.isTenderStage
    ? "border-l-amber-500"
    : step.isEvaluationStage
    ? "border-l-violet-500"
    : "border-l-border";

  return (
    <li className="relative">
      {/* Dot — colored by branch or by flow accent */}
      <div
        className={cn(
          "absolute -left-[0.875rem] top-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
          step.isTenderStage
            ? "bg-amber-500"
            : step.isEvaluationStage
            ? "bg-violet-500"
            : accent.stepDot
        )}
      />

      <div
        className={cn(
          "bg-secondary/30 border border-l-2 rounded-md p-2.5 transition-colors hover:bg-secondary/50",
          branchBorder
        )}
      >
        {/* Top row: name + prefixed number + actions */}
        <div className="flex items-start gap-1.5">
          <CustomBadge
            className={cn(
              "text-xs font-semibold flex-1 min-w-0",
              accent.badge
            )}
          >
            <span className="truncate block">{name}</span>
          </CustomBadge>
          {step.prefixedNumber && (
            <CustomBadge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-mono text-[10px] shrink-0">
              <Hash className="h-2.5 w-2.5 mr-0.5" />
              {step.prefixedNumber}
            </CustomBadge>
          )}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onEdit}
              title="Edit step"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
              onClick={onDelete}
              title="Delete step"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Expected Time (Days) & Expected Cover (%) editable boxes */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] bg-background/70 border border-border rounded px-1.5 py-0.5" title="Expected Time Taken (Days)">
            <Clock className="h-3 w-3 text-sky-400 shrink-0" />
            <span className="text-muted-foreground text-[10px]">Time:</span>
            <input
              type="number"
              min="0"
              value={step.expectedDays ?? 2}
              onChange={(e) => onUpdateStepDays?.(step.id, Number(e.target.value))}
              className="w-8 bg-transparent text-foreground text-[11px] font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary rounded"
            />
            <span className="text-[10px] text-muted-foreground">d</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] bg-background/70 border border-border rounded px-1.5 py-0.5" title="Expected Percentage Cover (%)">
            <Percent className="h-3 w-3 text-emerald-400 shrink-0" />
            <span className="text-muted-foreground text-[10px]">Cover:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={step.expectedPercentage ?? 0}
              onChange={(e) => onUpdateStepPercentage?.(step.id, Number(e.target.value))}
              className="w-10 bg-transparent text-foreground text-[11px] font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary rounded"
            />
            <span className="text-[10px] text-muted-foreground">%</span>
          </div>
          {step.isTenderStage && (
            <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px]">
              <Gavel className="h-2 w-2 mr-0.5" />
              TENDER
            </CustomBadge>
          )}
          {step.isEvaluationStage && (
            <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[9px]">
              <ClipboardCheck className="h-2 w-2 mr-0.5" />
              EVAL
            </CustomBadge>
          )}
        </div>

        {/* Description */}
        {step.description && (
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug line-clamp-3">
            {step.description}
          </p>
        )}

        {/* Meta info — department + responsible persons */}
        <div className="mt-1.5 space-y-0.5">
          {step.department && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Building2 className="h-2.5 w-2.5 shrink-0" />
              <span className="text-foreground font-medium truncate">
                {step.department}
              </span>
            </div>
          )}
          {officers.length > 0 && (
            <div className="text-[10px] text-muted-foreground truncate">
              <span className="text-blue-400 font-medium">Officers:</span>{" "}
              <span className="text-foreground">{officers.join(", ")}</span>
            </div>
          )}
          {sailors.length > 0 && (
            <div className="text-[10px] text-muted-foreground truncate">
              <span className="text-emerald-400 font-medium">Sailors:</span>{" "}
              <span className="text-foreground">{sailors.join(", ")}</span>
            </div>
          )}
          {step.defaultResponsiblePerson && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <UserCircle2 className="h-2.5 w-2.5 shrink-0" />
              <span className="text-foreground truncate">
                {step.defaultResponsiblePerson}
              </span>
            </div>
          )}
        </div>

        {/* Financial delegation — read-only backward-compat hint */}
        {hasDelegation && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/5 border border-blue-500/20 rounded px-1.5 py-0.5">
            <Award className="h-2.5 w-2.5 shrink-0" />
            <span className="font-medium shrink-0">Delegation:</span>
            <span className="truncate">{step.financialDelegationLevel}</span>
          </div>
        )}
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────
// Flow Form Dialog (Add/Edit)
// ─────────────────────────────────────────────────────────
interface FlowFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: ProcessFlow | null;
  onSaved: () => void;
}

function FlowFormDialog({ open, onOpenChange, initial, onSaved }: FlowFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Fetch financial delegations for the optional flow-level link
  const { data: delegations } = useFetch<FinancialDelegation[]>(
    "/api/financial-delegations"
  );

  const [name, setName] = useState<string>(initial?.name ?? "RC");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [financialDelegationId, setFinancialDelegationId] = useState<string>(
    initial?.financialDelegationId ?? ""
  );
  const [conditionMethod, setConditionMethod] = useState<string>(initial?.conditionMethod ?? "");
  const [conditionMinValue, setConditionMinValue] = useState<string>(
    initial?.conditionMinValue !== undefined && initial?.conditionMinValue !== null ? String(initial.conditionMinValue) : ""
  );
  const [conditionMaxValue, setConditionMaxValue] = useState<string>(
    initial?.conditionMaxValue !== undefined && initial?.conditionMaxValue !== null ? String(initial.conditionMaxValue) : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Flow name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      financialDelegationId: financialDelegationId || null,
      conditionMethod: conditionMethod || null,
      conditionMinValue: conditionMinValue ? Number(conditionMinValue) : null,
      conditionMaxValue: conditionMaxValue ? Number(conditionMaxValue) : null,
    };
    const res = isEdit
      ? await apiRequest(`/api/process-flows/${initial!.id}`, "PUT", body)
      : await apiRequest("/api/process-flows", "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "Flow updated" : "Flow created",
        description: body.name,
      });
      onSaved();
    } else {
      toast({
        title: "Failed to save",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  const selectedDelegation = delegations?.find(
    (d) => d.id === financialDelegationId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Process Flow" : "Add Process Flow"}
          </DialogTitle>
          <DialogDescription>
            Define a procurement process flow (RC, Non-Rate, ARO Contractual).
            Steps are added separately after creation. Optionally link a
            default financial delegation for the flow.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Flow Name" required>
            <Select value={name} onValueChange={setName}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select flow type" />
              </SelectTrigger>
              <SelectContent>
                {PROCESS_FLOW_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          t === "RC"
                            ? "bg-emerald-500"
                            : t === "Non-Rate"
                            ? "bg-amber-500"
                            : "bg-violet-500"
                        )}
                      />
                      {t}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Rate Contract procurement flow — items under active RC list"
              className="bg-background min-h-[80px]"
            />
          </Field>
          <Field label="Default Financial Delegation (optional)">
            <Select
              value={financialDelegationId || "__none__"}
              onValueChange={(v) =>
                setFinancialDelegationId(v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Link a default delegation level for this flow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {(delegations ?? [])
                  .filter((d) => d.active)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label ||
                        `Up to Rs. ${d.value.toLocaleString("en-US")} — ${d.authority}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedDelegation && (
              <div className="mt-1.5">
                <CustomBadge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
                  <Award className="h-3 w-3 mr-1" />
                  {selectedDelegation.label}
                </CustomBadge>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Optional default delegation for the entire flow. Individual
              financial authority steps can override this with their own
              delegation link.
            </p>
          </Field>
          
          <div className="rounded-lg border border-border p-3 space-y-3 bg-secondary/10">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-primary" /> Auto-Selection Conditions
            </h4>
            <p className="text-xs text-muted-foreground">
              Define the conditions under which this process is automatically assigned to a file.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Procurement Method">
                <Select value={conditionMethod || "__none__"} onValueChange={(v) => setConditionMethod(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any</SelectItem>
                    <SelectItem value="RC">RC</SelectItem>
                    <SelectItem value="Non-Rate">Non-Rate</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Min Value (Rs.)">
                <Input type="number" min="0" value={conditionMinValue} onChange={(e) => setConditionMinValue(e.target.value)} placeholder="0" className="bg-background" />
              </Field>
              <Field label="Max Value (Rs.)">
                <Input type="number" min="0" value={conditionMaxValue} onChange={(e) => setConditionMaxValue(e.target.value)} placeholder="e.g. 500000" className="bg-background" />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Flow Type Guide
            </p>
            <p>
              <span className="text-emerald-400 font-medium">RC</span> — Linear
              flow for items under an active Rate Contract (no tender).
            </p>
            <p>
              <span className="text-amber-400 font-medium">Non-Rate</span> —
              Tender called + BEC evaluation branch for items not under RC.
            </p>
            <p>
              <span className="text-violet-400 font-medium">
                ARO (Contractual)
              </span>{" "}
              — Tender opening, negotiation, evaluation branches with full
              financial delegation.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isEdit ? "Save Changes" : "Create Flow"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Step Form Dialog (Add/Edit)
// ─────────────────────────────────────────────────────────
interface StepFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  flow: ProcessFlow;
  initial: ProcessStep | null;
  onSaved: () => void;
}

function StepFormDialog({
  open,
  onOpenChange,
  flow,
  initial,
  onSaved,
}: StepFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const accent = flowAccent(flow.name);

  // Fetch stakeholders + number prefixes for the form
  const { data: stakeholders, loading: stakeholdersLoading } =
    useFetch<Stakeholder[]>("/api/stakeholders");
  const { data: numberPrefixes } = useFetch<NumberPrefix[]>(
    "/api/number-prefixes"
  );

  // Existing steps in the flow (excluding the one being edited) — used for
  // the Before/After dropdowns.
  const existingSteps = useMemo(() => {
    return (flow.steps ?? []).filter((s) => !initial || s.id !== initial.id);
  }, [flow.steps, initial]);

  // Form state
  const [predefinedStage, setPredefinedStage] = useState<string>(
    initial?.predefinedStage ?? ""
  );
  const [customName, setCustomName] = useState<string>(
    !initial?.predefinedStage ? (initial?.positionName ?? "") : ""
  );
  const [beforeStepId, setBeforeStepId] = useState<string>(
    initial?.beforeStepId ?? "__start__"
  );
  const [afterStepId, setAfterStepId] = useState<string>(
    initial?.afterStepId ?? "__none__"
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [department, setDepartment] = useState<string>(
    initial?.department ?? "CSLOG"
  );
  const [responsibleOfficers, setResponsibleOfficers] = useState<string[]>(
    () => parseJsonArray(initial?.responsibleOfficers)
  );
  const [responsibleSailors, setResponsibleSailors] = useState<string[]>(
    () => parseJsonArray(initial?.responsibleSailors)
  );
  const [defaultResponsiblePerson, setDefaultResponsiblePerson] = useState(
    initial?.defaultResponsiblePerson ?? ""
  );
  const [isTenderStage, setIsTenderStage] = useState(
    initial?.isTenderStage ?? false
  );
  const [isEvaluationStage, setIsEvaluationStage] = useState(
    initial?.isEvaluationStage ?? false
  );
  const [prefixedNumber, setPrefixedNumber] = useState(
    initial?.prefixedNumber ?? ""
  );
  const [expectedDays, setExpectedDays] = useState<number>(
    initial?.expectedDays ?? 2
  );
  const [expectedPercentage, setExpectedPercentage] = useState<number>(
    initial?.expectedPercentage ?? Math.round(100 / ((flow.steps?.length ?? 0) + (isEdit ? 0 : 1)))
  );

  // Auto-fill from STAGE_AUTO_DETAILS when a predefined stage is selected
  const stageInfo = predefinedStage ? STAGE_AUTO_DETAILS[predefinedStage] : null;

  function applyPredefinedStage(stage: string) {
    setPredefinedStage(stage);
    if (!stage) return;
    const info = STAGE_AUTO_DETAILS[stage];
    if (!info) return;
    setIsTenderStage(info.isTenderStage);
    setIsEvaluationStage(info.isEvaluationStage);
    if (info.prefixedNumber) {
      // Try to resolve the full prefix string from /api/number-prefixes
      const np = (numberPrefixes ?? []).find(
        (p) => p.docType === info.prefixedNumber
      );
      setPrefixedNumber(np?.prefix || info.prefixedNumber);
    } else {
      setPrefixedNumber("");
    }
    // Auto-fill description only if the user hasn't typed a custom one
    setDescription((prev) =>
      prev && prev.trim() !== "" ? prev : info.description
    );
  }

  function clearPredefinedStage() {
    setPredefinedStage("");
    // Leave isTenderStage / isEvaluationStage / prefixedNumber / description
    // as they are — the user can manually adjust if needed.
  }

  // Filter stakeholders by department + category
  const deptForStakeholder = department === "CCED" ? "CE" : "CSLOG";
  const officerList = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      if (s.department !== deptForStakeholder) return false;
      return s.category.toLowerCase().includes("officer");
    });
  }, [stakeholders, deptForStakeholder]);
  const sailorList = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      if (s.department !== deptForStakeholder) return false;
      return s.category.toLowerCase().includes("sailor");
    });
  }, [stakeholders, deptForStakeholder]);

  // The resolved step name (predefined stage OR custom name)
  const resolvedName = predefinedStage || customName.trim();

  function stepLabel(s: ProcessStep): string {
    return s.predefinedStage || s.positionName || "Unnamed step";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedName) {
      toast({
        title: "Step name required",
        description: "Pick a predefined stage OR enter a custom step name.",
        variant: "destructive",
      });
      return;
    }
    if (!beforeStepId) {
      toast({
        title: "Before step is required",
        description: "Select which step precedes this one (or 'Start').",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const body = {
      predefinedStage: predefinedStage || null,
      positionName: resolvedName,
      beforeStepId: beforeStepId === "__start__" ? null : beforeStepId,
      afterStepId: afterStepId === "__none__" ? null : afterStepId,
      description: description.trim() || null,
      department,
      responsibleOfficers,
      responsibleSailors,
      defaultResponsiblePerson: defaultResponsiblePerson.trim() || null,
      // Preserve any existing backward-compat delegation level (read-only at
      // the step level — managed via the Value & Step tab now).
      financialDelegationLevel: initial?.financialDelegationLevel ?? null,
      isTenderStage,
      isEvaluationStage,
      prefixedNumber: prefixedNumber.trim() || null,
      expectedDays,
      expectedPercentage,
    };
    const res = isEdit
      ? await apiRequest(
          `/api/process-flows/${flow.id}/steps/${initial!.id}`,
          "PUT",
          body
        )
      : await apiRequest(`/api/process-flows/${flow.id}/steps`, "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "Step updated" : "Step added",
        description: `${resolvedName} → ${flow.name} flow`,
      });
      onSaved();
    } else {
      toast({
        title: "Failed to save step",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTree className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Process Step" : "Add Process Step"}
          </DialogTitle>
          <DialogDescription>
            Configure a step in the{" "}
            <CustomBadge className={accent.badge}>{flow.name}</CustomBadge> flow
            — pick a predefined stage (or type a custom name), then link it
            before/after existing steps.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Predefined Stage OR Custom Step Name — only ONE required */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Predefined Stage">
              <Select
                value={predefinedStage || "__none__"}
                onValueChange={(v) => {
                  if (v === "__none__") clearPredefinedStage();
                  else applyPredefinedStage(v);
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="— None — pick a stage —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {PROCESS_STEP_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Auto-fills description, prefixed number &amp; tender/evaluation
                flags.
              </p>
            </Field>
            <Field label="Custom Step Name (if not using a predefined stage)">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Local Inspection"
                className="bg-background"
                disabled={!!predefinedStage}
              />
              <p className="text-[11px] text-muted-foreground">
                {predefinedStage
                  ? "Disabled — predefined stage selected above."
                  : "Required if no predefined stage is picked."}
              </p>
            </Field>
          </div>

          {/* Before / After link selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Before (which step precedes this)" required>
              <Select value={beforeStepId} onValueChange={setBeforeStepId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Pick the preceding step" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__start__">
                    — Start (no preceding step) —
                  </SelectItem>
                  {existingSteps.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {stepLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Mandatory. Select &quot;Start&quot; if this is the first step in
                the flow.
              </p>
            </Field>
            <Field label="After (which step follows this)">
              <Select value={afterStepId} onValueChange={setAfterStepId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="— None (terminal step) —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    — None (terminal step) —
                  </SelectItem>
                  {existingSteps.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {stepLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Optional. Leave as &quot;None&quot; if this is the end step of
                the flow.
              </p>
            </Field>
          </div>

          {/* Auto-set read-only hints block — visible when a predefined stage
              is selected OR when prefixedNumber has a value (legacy). */}
          {(stageInfo || prefixedNumber) && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {predefinedStage
                  ? `Auto-set from "${predefinedStage}" stage`
                  : "Prefixed Number (auto)"}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {stageInfo && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Tender:</span>
                      <CustomBadge
                        className={
                          stageInfo.isTenderStage
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]"
                            : "bg-muted text-muted-foreground border-border text-[10px]"
                        }
                      >
                        {stageInfo.isTenderStage ? "Yes" : "No"}
                      </CustomBadge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Evaluation:</span>
                      <CustomBadge
                        className={
                          stageInfo.isEvaluationStage
                            ? "bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]"
                            : "bg-muted text-muted-foreground border-border text-[10px]"
                        }
                      >
                        {stageInfo.isEvaluationStage ? "Yes" : "No"}
                      </CustomBadge>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Prefix:</span>
                  {prefixedNumber ? (
                    <CustomBadge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-mono text-[10px]">
                      <Hash className="h-2.5 w-2.5 mr-0.5" />
                      {prefixedNumber}
                    </CustomBadge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Prefixed Number — read-only field, auto from stage */}
          <Field label="Prefixed Number (auto)">
            <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="text-sm font-mono text-cyan-400">
                {prefixedNumber || "—"}
              </span>
              {prefixedNumber && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  (auto)
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {predefinedStage
                ? "Auto-set from the predefined stage. Not editable."
                : "Will be auto-set when you pick a predefined stage above."}
            </p>
          </Field>

          {/* Description (auto-filled but editable) */}
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what happens at this step..."
              className="bg-background min-h-[70px]"
            />
            {stageInfo && (
              <p className="text-[11px] text-muted-foreground">
                Auto-filled from stage definition — edit freely if needed.
              </p>
            )}
          </Field>

          {/* Department */}
          <Field label="Department">
            <Select
              value={department}
              onValueChange={(v) => {
                setDepartment(v);
                // Reset stakeholder selections when department changes
                setResponsibleOfficers([]);
                setResponsibleSailors([]);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {SETTINGS_DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Filters the stakeholder directory for the multi-selects below.
              CCED → CE officers/sailors, CSLOG → CSLOG officers/sailors.
            </p>
          </Field>

          {/* Responsible officers + sailors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MultiStakeholderPicker
              label="Responsible Officers"
              value={responsibleOfficers}
              onChange={setResponsibleOfficers}
              options={officerList}
              loading={stakeholdersLoading}
              emptyHint={`No officers found in ${department} department`}
            />
            <MultiStakeholderPicker
              label="Responsible Sailors"
              value={responsibleSailors}
              onChange={setResponsibleSailors}
              options={sailorList}
              loading={stakeholdersLoading}
              emptyHint={`No sailors found in ${department} department`}
            />
          </div>

          {/* Branch flags (auto-set by stage but still togglable for override) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              htmlFor="tender-stage"
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                isTenderStage
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-border bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <Checkbox
                id="tender-stage"
                checked={isTenderStage}
                onCheckedChange={(v) => setIsTenderStage(v === true)}
                className="mt-0.5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Gavel className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-sm font-medium text-foreground">
                    Tender Stage
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Auto-set by stage. Toggle manually if needed.
                </p>
              </div>
            </label>

            <label
              htmlFor="eval-stage"
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                isEvaluationStage
                  ? "border-violet-500/50 bg-violet-500/5"
                  : "border-border bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <Checkbox
                id="eval-stage"
                checked={isEvaluationStage}
                onCheckedChange={(v) => setIsEvaluationStage(v === true)}
                className="mt-0.5 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-sm font-medium text-foreground">
                    Evaluation Stage
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Auto-set by stage. Toggle manually if needed.
                </p>
              </div>
            </label>
          </div>

          {/* Default Responsible Person (legacy free-text) */}
          <Field label="Default Responsible Person (legacy free-text)">
            <Input
              value={defaultResponsiblePerson}
              onChange={(e) => setDefaultResponsiblePerson(e.target.value)}
              placeholder="e.g. ASO(E) — Lt. Cdr. K. Silva"
              className="bg-background"
            />
          </Field>

          {/* Expectations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Expected Time Taken (Days)" required>
              <Input
                type="number"
                min="0"
                value={expectedDays}
                onChange={(e) => setExpectedDays(Number(e.target.value))}
                className="bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Target duration to complete this step. Used for pending/delay alerts.
              </p>
            </Field>
            <Field label="Expected Percentage Cover (%)" required>
              <Input
                type="number"
                min="0"
                max="100"
                value={expectedPercentage}
                onChange={(e) => setExpectedPercentage(Number(e.target.value))}
                className="bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                How much progress this step contributes to the overall process.
              </p>
            </Field>
          </div>

          {/* Backward-compat: existing financial delegation read-only hint.
              Not editable at the step level — managed via the Value & Step tab. */}
          {initial?.financialDelegationLevel &&
            initial.financialDelegationLevel.trim() !== "" &&
            initial.financialDelegationLevel !== "—" && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 flex items-start gap-2">
                <Award className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-400">
                    Existing Financial Delegation (read-only)
                  </p>
                  <p className="text-sm text-foreground">
                    {initial.financialDelegationLevel}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Financial delegation is now managed in the &quot;Value &amp;
                    Step&quot; tab — not editable at the step level.
                  </p>
                </div>
              </div>
            )}

          {/* Live preview */}
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Live Preview
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CustomBadge className={cn("font-semibold", accent.badge)}>
                {resolvedName || "Step Name"}
              </CustomBadge>
              {department && (
                <CustomBadge
                  className={cn(
                    "border",
                    department === "CSLOG"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : department === "CCED"
                      ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                      : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                  )}
                >
                  {department}
                </CustomBadge>
              )}
              {isTenderStage && (
                <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                  <Gavel className="h-3 w-3 mr-1" />
                  TENDER
                </CustomBadge>
              )}
              {isEvaluationStage && (
                <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30">
                  <ClipboardCheck className="h-3 w-3 mr-1" />
                  EVALUATION
                </CustomBadge>
              )}
              {prefixedNumber && (
                <CustomBadge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-mono">
                  <Hash className="h-3 w-3 mr-1" />
                  {prefixedNumber}
                </CustomBadge>
              )}
              {responsibleOfficers.length > 0 && (
                <CustomBadge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-[10px]">
                  {responsibleOfficers.length} officer
                  {responsibleOfficers.length === 1 ? "" : "s"}
                </CustomBadge>
              )}
              {responsibleSailors.length > 0 && (
                <CustomBadge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px]">
                  {responsibleSailors.length} sailor
                  {responsibleSailors.length === 1 ? "" : "s"}
                </CustomBadge>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isEdit ? "Save Changes" : "Add Step"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Field helper
// ─────────────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 7 — Number Prefixes (document number prefix management)
// ═════════════════════════════════════════════════════════
function docTypeColor(docType: string): string {
  switch (docType) {
    case "PR":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "NAV255":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "NAV254":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "PO":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "FILE":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

function docTypeDotColor(docType: string): string {
  switch (docType) {
    case "PR":
      return "bg-emerald-500";
    case "NAV255":
      return "bg-blue-500";
    case "NAV254":
      return "bg-cyan-500";
    case "PO":
      return "bg-amber-500";
    case "FILE":
      return "bg-violet-500";
    default:
      return "bg-slate-500";
  }
}

function prefixProcessTypeColor(processType: string | null | undefined): string {
  switch (processType) {
    case "RC":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "Non-Rate":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Contractual":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "NHQ":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

function prefixProcessTypeDotColor(
  processType: string | null | undefined
): string {
  switch (processType) {
    case "RC":
      return "bg-emerald-500";
    case "Non-Rate":
      return "bg-amber-500";
    case "Contractual":
      return "bg-violet-500";
    case "NHQ":
      return "bg-blue-500";
    default:
      return "bg-slate-500";
  }
}

// Static example end-number used in live previews (NOT padded).
const PREFIX_PREVIEW_EXAMPLE = "0142";

function NumberPrefixesTab() {
  const {
    data: list,
    loading,
    error,
    refresh,
  } = useFetch<NumberPrefix[]>("/api/number-prefixes");
  // Fetch process flows to map stepId → step name in the table
  const { data: flows } = useFetch<ProcessFlow[]>("/api/process-flows");
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NumberPrefix | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NumberPrefix | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Flatten all steps across all flows for stepId → {name, flow} lookup
  const stepLookup = useMemo(() => {
    const map = new Map<string, { positionName: string; flowName: string }>();
    (flows ?? []).forEach((f) => {
      (f.steps ?? []).forEach((s) => {
        map.set(s.id, {
          positionName: s.positionName ?? s.predefinedStage ?? "Unnamed step",
          flowName: f.name,
        });
      });
    });
    return map;
  }, [flows]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiRequest(
      `/api/number-prefixes/${deleteTarget.id}`,
      "DELETE"
    );
    setDeleting(false);
    if (res.ok) {
      toast({
        title: "Prefix deleted",
        description: `${deleteTarget.docType} prefix removed`,
      });
      setDeleteTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  if (loading) return <LoadingState label="Loading number prefixes..." />;
  if (error) return <ErrorState message={error} />;

  // Group by docType for the live preview cards (first config per type wins)
  const byType: Record<string, NumberPrefix> = {};
  (list ?? []).forEach((p) => {
    if (!byType[p.docType]) byType[p.docType] = p;
  });

  return (
    <div className="space-y-5">
      {/* Info Card */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          <Info className="h-5 w-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Document Number Prefixes
          </p>
          <p className="text-xs text-muted-foreground">
            These prefixes are used when creating PRs, NAV 255/254 numbers,
            Purchasing Orders, and File numbers. Only the end number is entered
            during initiation — the prefix is auto-prepended.
          </p>
        </div>
      </div>

      {/* Live preview cards (one per docType) */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-cyan-400" /> Live Preview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NUMBER_PREFIX_TYPES.map((t) => {
            const configured = byType[t.docType];
            const prefixPart = configured?.prefix || t.placeholder;
            // Static example end-number — NOT padded with zeros.
            const endNum = PREFIX_PREVIEW_EXAMPLE;
            const suffixPart = configured?.suffix ?? "";
            const example = `${prefixPart}${endNum}${suffixPart}`;
            return (
              <div
                key={t.docType}
                className={cn(
                  "rounded-lg border p-3 bg-card",
                  configured
                    ? "border-cyan-500/30"
                    : "border-dashed border-border"
                )}
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <CustomBadge className={cn("border", docTypeColor(t.docType))}>
                    {t.docType}
                  </CustomBadge>
                  <span className="text-xs text-muted-foreground truncate">
                    {t.label}
                  </span>
                </div>
                {(configured?.subCategory || configured?.processType) && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {configured.subCategory && (
                      <CustomBadge className="bg-slate-500/15 text-slate-300 border-slate-500/30 text-[10px]">
                        {configured.subCategory}
                      </CustomBadge>
                    )}
                    {configured.processType && (
                      <CustomBadge
                        className={cn(
                          "border text-[10px]",
                          prefixProcessTypeColor(configured.processType)
                        )}
                      >
                        {configured.processType}
                      </CustomBadge>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">Example:</p>
                <p className="font-mono text-sm text-foreground break-all flex items-center flex-wrap gap-1">
                  <span className="text-foreground">{prefixPart}</span>
                  <span className="text-cyan-500 dark:text-cyan-400">+</span>
                  <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                    {endNum}
                  </span>
                  {suffixPart && (
                    <>
                      <span className="text-cyan-500 dark:text-cyan-400">+</span>
                      <span className="text-foreground">{suffixPart}</span>
                    </>
                  )}
                  <span className="text-muted-foreground mx-1">=</span>
                  <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-mono break-all">
                    {example}
                  </CustomBadge>
                </p>
                {!configured && (
                  <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1.5">
                    Not configured — uses placeholder above
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Hash className="h-4 w-4 text-cyan-400" /> Configured Prefixes
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage the predetermined prefix parts for document numbers.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Prefix
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs">Document Type</TableHead>
                <TableHead className="text-xs">Sub-Category</TableHead>
                <TableHead className="text-xs">Process (Main)</TableHead>
                <TableHead className="text-xs">Prefix</TableHead>
                <TableHead className="text-xs">Suffix</TableHead>
                <TableHead className="text-xs">Linked Step</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!list || list.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No number prefixes configured. Click &quot;Add Prefix&quot;
                    to create one.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((p) => {
                  const linkedStep = p.stepId
                    ? stepLookup.get(p.stepId)
                    : null;
                  return (
                    <TableRow key={p.id} className="border-border">
                      <TableCell>
                        <CustomBadge className={cn("border", docTypeColor(p.docType))}>
                          {p.docType}
                        </CustomBadge>
                      </TableCell>
                      <TableCell>
                        {p.subCategory ? (
                          <CustomBadge className="bg-slate-500/15 text-slate-300 border-slate-500/30 text-[10px]">
                            {p.subCategory}
                          </CustomBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.processType ? (
                          <CustomBadge
                            className={cn(
                              "border text-[10px]",
                              prefixProcessTypeColor(p.processType)
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full mr-1",
                                prefixProcessTypeDotColor(p.processType)
                              )}
                            />
                            {p.processType}
                          </CustomBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-foreground bg-secondary/60 px-2 py-0.5 rounded-md text-sm">
                          {p.prefix || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {p.suffix || "—"}
                      </TableCell>
                      <TableCell>
                        {linkedStep ? (
                          <CustomBadge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[10px]">
                            <ListTree className="h-3 w-3 mr-1" />
                            {linkedStep.positionName}
                            <span className="text-[10px] text-muted-foreground ml-1">
                              ({linkedStep.flowName})
                            </span>
                          </CustomBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditTarget(p)}
                            className="h-8 w-8 p-0"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(p)}
                            className="h-8 w-8 p-0 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {addOpen && (
        <PrefixFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          initial={null}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}
      {editTarget && (
        <PrefixFormDialog
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          initial={editTarget}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this prefix?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the{" "}
              <span className="text-foreground font-medium">
                {deleteTarget?.docType}
              </span>{" "}
              prefix configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface PrefixFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: NumberPrefix | null;
  onSaved: () => void;
}

function PrefixFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: PrefixFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Fetch process flows (with steps) to populate the optional Step dropdown
  const { data: flows } = useFetch<ProcessFlow[]>("/api/process-flows");

  const [docType, setDocType] = useState<string>(initial?.docType ?? "PR");
  const [subCategory, setSubCategory] = useState<string>(
    initial?.subCategory ?? ""
  );
  const [processType, setProcessType] = useState<string>(
    initial?.processType ?? ""
  );
  const [prefix, setPrefix] = useState(initial?.prefix ?? "");
  const [suffix, setSuffix] = useState(initial?.suffix ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [stepId, setStepId] = useState<string>(initial?.stepId ?? "");

  const selectedMeta =
    NUMBER_PREFIX_TYPES.find((t) => t.docType === docType) ??
    NUMBER_PREFIX_TYPES[0];
  // Static example end-number — NOT padded with zeros.
  const previewEnd = PREFIX_PREVIEW_EXAMPLE;
  const previewFull = `${prefix || selectedMeta.placeholder}${previewEnd}${
    suffix || ""
  }`;

  // Flatten all steps across all flows for the Step dropdown
  const allSteps = useMemo(() => {
    if (!flows) return [];
    return flows.flatMap((f) =>
      (f.steps ?? []).map((s) => ({
        id: s.id,
        positionName: s.positionName ?? s.predefinedStage ?? "Unnamed step",
        flowName: f.name,
      }))
    );
  }, [flows]);

  const selectedStep = allSteps.find((s) => s.id === stepId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!docType) {
      toast({ title: "Document type is required", variant: "destructive" });
      return;
    }
    if (!prefix.trim()) {
      toast({ title: "Prefix is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      docType,
      subCategory: subCategory.trim() || null,
      processType: processType || null,
      prefix: prefix.trim(),
      suffix: suffix.trim() || null,
      description: description.trim() || null,
      stepId: stepId || null,
    };
    const res = isEdit
      ? await apiRequest(`/api/number-prefixes/${initial!.id}`, "PUT", body)
      : await apiRequest("/api/number-prefixes", "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "Prefix updated" : "Prefix created",
        description: `${docType}${
          processType ? ` · ${processType}` : ""
        } · ${prefix}${previewEnd}${suffix || ""}`,
      });
      onSaved();
    } else {
      toast({
        title: "Failed to save",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-cyan-400" />
            {isEdit ? "Edit Number Prefix" : "Add Number Prefix"}
          </DialogTitle>
          <DialogDescription>
            Configure the predetermined prefix used when initiating a document
            of this type. Optionally link it to a process step so it
            auto-shows when that step is reached.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Document Type" required>
            <Select
              value={docType}
              onValueChange={setDocType}
              disabled={isEdit}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {NUMBER_PREFIX_TYPES.map((t) => (
                  <SelectItem key={t.docType} value={t.docType}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          docTypeDotColor(t.docType)
                        )}
                      />
                      <span className="font-medium">{t.docType}</span>
                      <span className="text-muted-foreground">
                        — {t.label}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sub-Category (Optional)">
            <Input
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="e.g. RC, Non-Rate, Contractual"
              className="bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              Optional sub-category for this document type (free text). Lets you
              distinguish multiple prefixes of the same type.
            </p>
          </Field>
          <Field label="Process (Main)">
            <Select
              value={processType || "__none__"}
              onValueChange={(v) => setProcessType(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select the process this prefix belongs to" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {PREFIX_PROCESS_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          prefixProcessTypeDotColor(p)
                        )}
                      />
                      <span className="font-medium">{p}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Sets which process (RC, Non-Rate, Contractual, NHQ) this prefix
              belongs to.
            </p>
          </Field>
          <Field label="Prefix" required>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder={selectedMeta?.placeholder ?? "e.g. PR/2025/"}
              className="bg-background font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              The predetermined prefix part. Use forward slashes to segment
              (e.g. <span className="font-mono">PR/2025/</span>).
            </p>
          </Field>
          <Field label="Suffix (optional)">
            <Input
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="e.g. /V1"
              className="bg-background font-mono"
            />
          </Field>
          <Field label="Description (optional)">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. PR numbers for 2025 — Engineering Dept"
              className="bg-background"
            />
          </Field>
          <Field label="Link to Process Step (optional)">
            <Select
              value={stepId || "__none__"}
              onValueChange={(v) => setStepId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Auto-show this prefix when a step is reached" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {allSteps.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          s.flowName === "RC"
                            ? "bg-emerald-500"
                            : s.flowName === "Non-Rate"
                            ? "bg-amber-500"
                            : "bg-violet-500"
                        )}
                      />
                      <span className="text-foreground">{s.positionName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({s.flowName})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStep && (
              <div className="mt-1.5">
                <CustomBadge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[10px]">
                  <ListTree className="h-3 w-3 mr-1" />
                  {selectedStep.positionName} · {selectedStep.flowName}
                </CustomBadge>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              When linked, this prefix will auto-suggest when the linked step is
              reached during file processing.
            </p>
          </Field>
          {/* Live preview */}
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Live Preview
            </p>
            <p className="font-mono text-sm text-foreground break-all flex items-center flex-wrap gap-1.5">
              <span className="text-foreground">
                {prefix || selectedMeta?.placeholder || "?"}
              </span>
              <span className="text-cyan-500 dark:text-cyan-400">+</span>
              <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                {previewEnd}
              </span>
              {suffix && (
                <>
                  <span className="text-cyan-500 dark:text-cyan-400">+</span>
                  <span className="text-foreground">{suffix}</span>
                </>
              )}
              <span className="text-muted-foreground mx-1">=</span>
              <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-mono break-all">
                {previewFull}
              </CustomBadge>
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isEdit ? "Save Changes" : "Create Prefix"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 8 — Theme & Colors (theme profile management)
// ═════════════════════════════════════════════════════════
function ThemeColorsTab() {
  const {
    data: savedProfiles,
    loading,
    error,
    refresh,
  } = useFetch<ThemeProfileRecord[]>("/api/theme-profiles");
  const { profile: activeProfile, setProfile } = useThemeProfile();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ThemeProfileRecord | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiRequest(
      `/api/theme-profiles/${deleteTarget.id}`,
      "DELETE"
    );
    setDeleting(false);
    if (res.ok) {
      toast({
        title: "Theme profile deleted",
        description: deleteTarget.name,
      });
      setDeleteTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  async function handleSetDefault(p: {
    name: string;
    mode: string;
    primary: string;
    accent: string;
  }) {
    const body = {
      name: p.name,
      mode: p.mode,
      primary: p.primary,
      accent: p.accent,
      isDefault: true,
    };
    const existing = (savedProfiles ?? []).find(
      (sp) => sp.name.toLowerCase() === p.name.toLowerCase()
    );
    const res = existing
      ? await apiRequest(`/api/theme-profiles/${existing.id}`, "PUT", body)
      : await apiRequest("/api/theme-profiles", "POST", body);
    if (res.ok) {
      setProfile({
        name: p.name,
        mode: p.mode as "dark" | "light",
        primary: p.primary,
        accent: p.accent,
      });
      toast({
        title: "Default theme set",
        description: `${p.name} is now the default profile.`,
      });
      refresh();
    } else {
      toast({
        title: "Failed to set default",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  function handleApplyPreset(preset: ThemeProfilePreset) {
    setProfile({
      name: preset.name,
      mode: preset.mode,
      primary: preset.primary,
      accent: preset.accent,
    });
    toast({
      title: "Theme applied",
      description: `${preset.name} — switch back anytime from the palette icon in the topbar.`,
    });
  }

  function isPresetActive(p: ThemeProfilePreset): boolean {
    return (
      !!activeProfile &&
      activeProfile.name === p.name &&
      activeProfile.mode === p.mode &&
      activeProfile.primary.toLowerCase() === p.primary.toLowerCase() &&
      activeProfile.accent.toLowerCase() === p.accent.toLowerCase()
    );
  }

  if (loading) return <LoadingState label="Loading theme profiles..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      {/* Info Card */}
      <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30">
          <Palette className="h-5 w-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Theme Profiles</p>
          <p className="text-xs text-muted-foreground">
            Theme profiles let users choose color combinations. Users can also
            switch instantly from the palette icon in the topbar.
          </p>
        </div>
      </div>

      {/* Active profile indicator */}
      {activeProfile && (
        <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="h-8 w-8 rounded-md border border-border"
              style={{ backgroundColor: activeProfile.primary }}
              title="Primary"
            />
            <span
              className="h-8 w-8 rounded-md border border-border"
              style={{ backgroundColor: activeProfile.accent }}
              title="Accent"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {activeProfile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Currently active · {activeProfile.mode} mode
            </p>
          </div>
          <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
            <Check className="h-3 w-3 mr-1" /> Active
          </CustomBadge>
        </div>
      )}

      {/* Preset grid */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-400" /> Preset Profiles
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click a card to apply the theme instantly. Set as Default to
              persist it as the system default for all users.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {THEME_PROFILE_PRESETS.map((preset) => {
            const active = isPresetActive(preset);
            const isDefault = (savedProfiles ?? []).some(
              (sp) =>
                sp.isDefault &&
                sp.name.toLowerCase() === preset.name.toLowerCase()
            );
            return (
              <div
                key={preset.name}
                role="button"
                tabIndex={0}
                onClick={() => handleApplyPreset(preset)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyPreset(preset)}
                className={cn(
                  "group relative rounded-xl border p-3 text-left transition-all hover:shadow-md cursor-pointer select-none",
                  active
                    ? "border-fuchsia-500/50 bg-fuchsia-500/5 ring-1 ring-fuchsia-500/30"
                    : "border-border bg-card hover:border-fuchsia-500/30"
                )}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {preset.name}
                  </span>
                  <CustomBadge
                    className={
                      preset.mode === "dark"
                        ? "bg-slate-700/60 text-slate-200 border-slate-500/30"
                        : "bg-amber-100 text-amber-900 border-amber-300/40 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                    }
                  >
                    {preset.mode}
                  </CustomBadge>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="h-8 w-8 rounded-md border border-border shadow-sm"
                    style={{ backgroundColor: preset.primary }}
                    title={`Primary: ${preset.primary}`}
                  />
                  <span
                    className="h-8 w-8 rounded-md border border-border shadow-sm"
                    style={{ backgroundColor: preset.accent }}
                    title={`Accent: ${preset.accent}`}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground ml-1 truncate">
                    {preset.primary} · {preset.accent}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {active ? (
                    <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                      <Check className="h-3 w-3 mr-1" /> Active
                    </CustomBadge>
                  ) : isDefault ? (
                    <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                      <Star className="h-3 w-3 mr-1 fill-current" /> Default
                    </CustomBadge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      Click to apply
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant={isDefault ? "secondary" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDefault({
                        name: preset.name,
                        mode: preset.mode,
                        primary: preset.primary,
                        accent: preset.accent,
                      });
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    {isDefault ? (
                      <>
                        <Star className="h-3 w-3 fill-current" /> Default
                      </>
                    ) : (
                      <>
                        <Star className="h-3 w-3" /> Set as Default
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saved custom profiles */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Type className="h-4 w-4 text-fuchsia-400" /> Saved &amp; Custom
              Profiles
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Database-persisted profiles. Marked defaults apply system-wide.
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            variant="outline"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create Custom Profile
          </Button>
        </div>
        {!savedProfiles || savedProfiles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            No saved profiles yet. Use the preset cards above or click
            &quot;Create Custom Profile&quot;.
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/20 hover:bg-muted/20">
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Mode</TableHead>
                    <TableHead className="text-xs">Colors</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedProfiles.map((p) => {
                    const isActive =
                      activeProfile?.name === p.name &&
                      activeProfile?.mode === p.mode &&
                      activeProfile?.primary.toLowerCase() ===
                        p.primary.toLowerCase();
                    return (
                      <TableRow key={p.id} className="border-border">
                        <TableCell className="text-foreground text-sm font-medium">
                          {p.name}
                        </TableCell>
                        <TableCell>
                          <CustomBadge
                            className={
                              p.mode === "dark"
                                ? "bg-slate-700/60 text-slate-200 border-slate-500/30"
                                : "bg-amber-100 text-amber-900 border-amber-300/40 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                            }
                          >
                            {p.mode}
                          </CustomBadge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-5 w-5 rounded-md border border-border"
                              style={{ backgroundColor: p.primary }}
                              title={`Primary: ${p.primary}`}
                            />
                            <span
                              className="h-5 w-5 rounded-md border border-border"
                              style={{ backgroundColor: p.accent }}
                              title={`Accent: ${p.accent}`}
                            />
                            <span className="font-mono text-[10px] text-muted-foreground ml-1">
                              {p.primary} · {p.accent}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {p.isDefault && (
                              <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                                <Star className="h-3 w-3 mr-1 fill-current" /> Default
                              </CustomBadge>
                            )}
                            {isActive && (
                              <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                                <Check className="h-3 w-3 mr-1" /> Active
                              </CustomBadge>
                            )}
                            {!p.isDefault && !isActive && (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs gap-1"
                              onClick={() =>
                                setProfile({
                                  name: p.name,
                                  mode: p.mode as "dark" | "light",
                                  primary: p.primary,
                                  accent: p.accent,
                                })
                              }
                            >
                              <Palette className="h-3.5 w-3.5" /> Apply
                            </Button>
                            {!p.isDefault && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs gap-1"
                                onClick={() =>
                                  handleSetDefault({
                                    name: p.name,
                                    mode: p.mode,
                                    primary: p.primary,
                                    accent: p.accent,
                                  })
                                }
                              >
                                <Star className="h-3.5 w-3.5" /> Set Default
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(p)}
                              className="h-8 w-8 p-0 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {addOpen && (
        <CustomThemeFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this theme profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the{" "}
              <span className="text-foreground font-medium">
                {deleteTarget?.name}
              </span>{" "}
              theme profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CustomThemeFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

function CustomThemeFormDialog({
  open,
  onOpenChange,
  onSaved,
}: CustomThemeFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [primary, setPrimary] = useState("#3b82f6");
  const [accent, setAccent] = useState("#8b5cf6");
  const [isDefault, setIsDefault] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      mode,
      primary,
      accent,
      isDefault,
    };
    const res = await apiRequest("/api/theme-profiles", "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({ title: "Theme profile created", description: name.trim() });
      onSaved();
    } else {
      toast({
        title: "Failed to create",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-fuchsia-400" />
            Create Custom Theme Profile
          </DialogTitle>
          <DialogDescription>
            Define a custom color combination. Users can apply this profile
            from the palette icon in the topbar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Profile Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brand Indigo Dark"
              className="bg-background"
              required
            />
          </Field>
          <Field label="Mode" required>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as "dark" | "light")}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Primary Color" required>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="h-9 w-12 rounded-md border border-border bg-background cursor-pointer p-0.5"
                  aria-label="Primary color picker"
                />
                <Input
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="bg-background font-mono"
                />
              </div>
            </Field>
            <Field label="Accent Color" required>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-9 w-12 rounded-md border border-border bg-background cursor-pointer p-0.5"
                  aria-label="Accent color picker"
                />
                <Input
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="bg-background font-mono"
                />
              </div>
            </Field>
          </div>
          <label
            htmlFor="default-profile"
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
              isDefault
                ? "border-amber-500/50 bg-amber-500/5"
                : "border-border bg-secondary/30 hover:bg-secondary/50"
            )}
          >
            <Checkbox
              id="default-profile"
              checked={isDefault}
              onCheckedChange={(v) => setIsDefault(v === true)}
              className="mt-0.5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-sm font-medium text-foreground">
                  Set as Default
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Marks this profile as the system default for all new sessions.
              </p>
            </div>
          </label>
          {/* Live preview */}
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Live Preview
            </p>
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-10 rounded-md border border-border shadow-sm"
                style={{ backgroundColor: primary }}
                title="Primary"
              />
              <span
                className="h-10 w-10 rounded-md border border-border shadow-sm"
                style={{ backgroundColor: accent }}
                title="Accent"
              />
              <span
                className="ml-auto inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: primary }}
              >
                Primary Button
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Create Profile
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 9 — Value & Step (Financial Delegations + Step Management)
// ═════════════════════════════════════════════════════════
function ValueAndStepTab() {
  return (
    <div className="space-y-6">
      <FinancialDelegationSection />
      <StepManagementSection />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Financial Delegation Section
// ─────────────────────────────────────────────────────────
function financialAuthorityColor(authority: string): string {
  switch (authority) {
    case "Cdr":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Capt":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "FC":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "AOE":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "CNC":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

function FinancialDelegationSection() {
  const {
    data: list,
    loading,
    error,
    refresh,
  } = useFetch<FinancialDelegation[]>("/api/financial-delegations");
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FinancialDelegation | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<FinancialDelegation | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiRequest(
      `/api/financial-delegations/${deleteTarget.id}`,
      "DELETE"
    );
    setDeleting(false);
    if (res.ok) {
      toast({
        title: "Delegation deleted",
        description: deleteTarget.label || deleteTarget.authority,
      });
      setDeleteTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  const activeCount = list?.filter((d) => d.active).length ?? 0;
  const totalValue = list?.reduce((acc, d) => acc + (d.value ?? 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-xl p-5 flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 ring-2 ring-emerald-500/20">
          <DollarSign className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground">
            Financial Delegations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define financial delegation levels (e.g. Cdr, Capt, FC, AOE, CNC).
            These can be linked to process steps that require financial
            authority.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Delegations"
          value={list?.length ?? 0}
          icon={Award}
          accent="green"
          sub="All configured"
        />
        <StatCard
          label="Active"
          value={activeCount}
          icon={CheckCircle2}
          accent="blue"
          sub="Currently usable"
        />
        <StatCard
          label="Highest Authority"
          value={list?.find((d) => d.authority === "CNC") ? "CNC" : "—"}
          icon={Crown}
          accent="red"
          sub="Top delegation"
        />
        <StatCard
          label="Combined Ceiling"
          value={formatCurrency(totalValue)}
          icon={Banknote}
          accent="purple"
          sub="Sum of all values"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-secondary/60 to-transparent border-b border-border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Delegation Register
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage financial delegation levels (value + authority)
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Add Delegation
          </Button>
        </div>
        {loading ? (
          <LoadingState label="Loading financial delegations..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : !list || list.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No delegations configured"
            description="Add your first financial delegation level (e.g. Up to Rs. 500,000 — Cdr)."
            action={
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Delegation
              </Button>
            }
          />
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[40px]">Sr</TableHead>
                  <TableHead className="text-right">Value (Rs.)</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((d, idx) => (
                  <TableRow
                    key={d.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {formatCurrency(d.value ?? 0)}
                    </TableCell>
                    <TableCell>
                      <CustomBadge
                        className={financialAuthorityColor(d.authority)}
                      >
                        <Award className="h-3 w-3 mr-1" />
                        {d.authority}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {d.label || `Up to Rs. ${d.value.toLocaleString("en-US")} — ${d.authority}`}
                    </TableCell>
                    <TableCell>
                      <CustomBadge className={activeBadgeClass(d.active)}>
                        {d.active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditTarget(d)}
                          title="Edit delegation"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => setDeleteTarget(d)}
                          title="Delete delegation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {addOpen && (
        <FinancialDelegationFormDialog
          key="add-delegation"
          open={addOpen}
          onOpenChange={setAddOpen}
          initial={null}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}
      {editTarget && (
        <FinancialDelegationFormDialog
          key={`edit-delegation-${editTarget.id}`}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          initial={editTarget}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete financial delegation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the delegation{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.label || deleteTarget?.authority}
              </span>
              . Steps linked to it will lose their delegation reference. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Delegation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Financial Delegation Form Dialog
// ─────────────────────────────────────────────────────────
interface FinancialDelegationFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: FinancialDelegation | null;
  onSaved: () => void;
}

function FinancialDelegationFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: FinancialDelegationFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<string>(
    initial ? String(initial.value) : ""
  );
  const [authority, setAuthority] = useState<string>(
    initial?.authority ?? "Cdr"
  );
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  const valueNum = Number(value) || 0;
  const computedLabel = `Up to Rs. ${valueNum.toLocaleString("en-US")} — ${authority}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || isNaN(valueNum) || valueNum <= 0) {
      toast({
        title: "A positive value is required",
        variant: "destructive",
      });
      return;
    }
    if (!authority.trim()) {
      toast({
        title: "Authority is required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const body = { value: valueNum, authority, active };
    const res = isEdit
      ? await apiRequest(
          `/api/financial-delegations/${initial!.id}`,
          "PUT",
          body
        )
      : await apiRequest("/api/financial-delegations", "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "Delegation updated" : "Delegation added",
        description: computedLabel,
      });
      onSaved();
    } else {
      toast({
        title: "Failed to save",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Financial Delegation" : "Add Financial Delegation"}
          </DialogTitle>
          <DialogDescription>
            Define a delegation level by value (Rs.) and authority. The label
            auto-computes as &quot;Up to Rs. {`{value}`} — {`{authority}`}&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Value (Rs.)" required>
              <Input
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 500000"
                className="bg-background font-mono"
                required
              />
            </Field>
            <Field label="Authority" required>
              <Select value={authority} onValueChange={setAuthority}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select authority" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_AUTHORITIES.map((a) => (
                    <SelectItem key={a} value={a}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            a === "Cdr"
                              ? "bg-blue-500"
                              : a === "Capt"
                              ? "bg-emerald-500"
                              : a === "FC"
                              ? "bg-amber-500"
                              : a === "AOE"
                              ? "bg-violet-500"
                              : "bg-red-500"
                          )}
                        />
                        {a}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {/* Auto-computed label preview */}
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Auto-computed Label
            </p>
            <CustomBadge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
              <Award className="h-3 w-3 mr-1" />
              {computedLabel}
            </CustomBadge>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
            <Checkbox
              id="delegation-active"
              checked={active}
              onCheckedChange={(v) => setActive(v === true)}
            />
            <div className="flex-1">
              <Label
                htmlFor="delegation-active"
                className="text-sm font-medium cursor-pointer"
              >
                Active delegation
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive delegations are hidden from step-link dropdowns.
              </p>
            </div>
            <CustomBadge className={activeBadgeClass(active)}>
              {active ? "Active" : "Inactive"}
            </CustomBadge>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isEdit ? "Save Changes" : "Add Delegation"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Step Management Section (independent reusable steps)
// ─────────────────────────────────────────────────────────
// Steps added here are stored as ProcessStep records under a "General Steps"
// flow (auto-created if it doesn't exist).
const GENERAL_STEPS_FLOW_NAME = "General Steps";

function StepManagementSection() {
  const {
    data: flows,
    loading,
    error,
    refresh,
  } = useFetch<ProcessFlow[]>("/api/process-flows");
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProcessStep | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProcessStep | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generalFlowId, setGeneralFlowId] = useState<string | null>(null);

  // Find (or auto-create) the "General Steps" flow
  useEffect(() => {
    let cancelled = false;
    async function ensureGeneralFlow() {
      if (!flows) return;
      const existing = flows.find(
        (f) => f.name === GENERAL_STEPS_FLOW_NAME
      );
      if (existing) {
        if (!cancelled) setGeneralFlowId(existing.id);
        return;
      }
      // Auto-create the General Steps flow (only once)
      const res = await apiRequest("/api/process-flows", "POST", {
        name: GENERAL_STEPS_FLOW_NAME,
        description:
          "Reference pool of reusable process steps — managed from the Value & Step tab.",
      });
      if (res.ok) {
        const created = res.data as ProcessFlow;
        if (!cancelled) {
          setGeneralFlowId(created.id);
          refresh();
        }
      }
    }
    ensureGeneralFlow();
    return () => {
      cancelled = true;
    };
  }, [flows, refresh]);

  const generalFlow = flows?.find((f) => f.name === GENERAL_STEPS_FLOW_NAME);
  const steps = useMemo(() => {
    if (!generalFlow) return [];
    // No step order — sort by predefined stage / position name for stable display
    return [...(generalFlow.steps ?? [])].sort((a, b) => {
      const an = (a.predefinedStage || a.positionName || "").toLowerCase();
      const bn = (b.predefinedStage || b.positionName || "").toLowerCase();
      return an.localeCompare(bn);
    });
  }, [generalFlow]);

  async function handleDelete() {
    if (!deleteTarget || !generalFlowId) return;
    setDeleting(true);
    const res = await apiRequest(
      `/api/process-flows/${generalFlowId}/steps/${deleteTarget.id}`,
      "DELETE"
    );
    setDeleting(false);
    if (res.ok) {
      toast({
        title: "Step deleted",
        description: deleteTarget.positionName ?? deleteTarget.predefinedStage ?? "Step",
      });
      setDeleteTarget(null);
      refresh();
    } else {
      toast({
        title: "Failed to delete step",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-sky-500/10 via-cyan-500/5 to-transparent border border-sky-500/20 rounded-xl p-5 flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 ring-2 ring-sky-500/20">
          <ListTree className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground">
            Step Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define reusable process steps (independent of any specific flow).
            Steps added here live under a hidden &quot;General Steps&quot; flow
            and can be referenced from any procurement flow.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-secondary/60 to-transparent border-b border-border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ListTree className="h-4 w-4 text-primary" />
              General Steps Pool
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {steps.length} reusable step
              {steps.length === 1 ? "" : "s"} defined
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="shrink-0"
            disabled={!generalFlowId}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Step
          </Button>
        </div>
        {loading ? (
          <LoadingState label="Loading steps..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : steps.length === 0 ? (
          <EmptyState
            icon={ListTree}
            title="No general steps yet"
            description="Add reusable steps here (e.g. PR Raised, Tender Called, BEC Evaluation) that can be referenced from any flow."
            action={
              <Button
                onClick={() => setAddOpen(true)}
                disabled={!generalFlowId}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Step
              </Button>
            }
          />
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[40px]">Sr</TableHead>
                  <TableHead>Step Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Responsible Officers</TableHead>
                  <TableHead>Responsible Sailors</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {steps.map((s, idx) => {
                  const officers = parseJsonArray(s.responsibleOfficers);
                  const sailors = parseJsonArray(s.responsibleSailors);
                  return (
                    <TableRow
                      key={s.id}
                      className="border-border hover:bg-secondary/30 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {s.prefixedNumber ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 h-6 min-w-6 px-1.5 rounded-md text-xs font-bold border",
                                "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-mono"
                              )}
                            >
                              <Hash className="h-2.5 w-2.5" />
                              {s.prefixedNumber}
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md text-xs font-bold border",
                                "bg-sky-500/10 text-sky-400 border-sky-500/30"
                              )}
                            >
                              {idx + 1}
                            </span>
                          )}
                          <span className="font-medium text-foreground">
                            {s.predefinedStage || s.positionName || "Unnamed step"}
                          </span>
                          {s.isTenderStage && (
                            <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                              <Gavel className="h-3 w-3 mr-1" />
                              TENDER
                            </CustomBadge>
                          )}
                          {s.isEvaluationStage && (
                            <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">
                              <ClipboardCheck className="h-3 w-3 mr-1" />
                              EVAL
                            </CustomBadge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.department ? (
                          <CustomBadge
                            className={cn(
                              "border",
                              s.department === "CSLOG"
                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                : s.department === "CCED"
                                ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                                : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                            )}
                          >
                            {s.department}
                          </CustomBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {officers.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {officers.map((name) => (
                              <CustomBadge
                                key={name}
                                className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]"
                              >
                                {name}
                              </CustomBadge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sailors.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {sailors.map((name) => (
                              <CustomBadge
                                key={name}
                                className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
                              >
                                {name}
                              </CustomBadge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setEditTarget(s)}
                            title="Edit step"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => setDeleteTarget(s)}
                            title="Delete step"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {generalFlowId && addOpen && (
        <GeneralStepFormDialog
          key="add-general-step"
          open={addOpen}
          onOpenChange={setAddOpen}
          flowId={generalFlowId}
          existingSteps={steps}
          initial={null}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}
      {generalFlowId && editTarget && (
        <GeneralStepFormDialog
          key={`edit-general-step-${editTarget.id}`}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          flowId={generalFlowId}
          existingSteps={steps.filter((s) => s.id !== editTarget.id)}
          initial={editTarget}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete general step?</AlertDialogTitle>
          <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.positionName}
              </span>{" "}
              from the General Steps pool. Number prefixes linked to this step
              will lose their reference. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Step"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// General Step Form Dialog (for the Value & Step tab Step pool)
// ─────────────────────────────────────────────────────────
interface GeneralStepFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  flowId: string;
  existingSteps: ProcessStep[];
  initial: ProcessStep | null;
  onSaved: () => void;
}

function GeneralStepFormDialog({
  open,
  onOpenChange,
  flowId,
  existingSteps,
  initial,
  onSaved,
}: GeneralStepFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const { data: stakeholders, loading: stakeholdersLoading } =
    useFetch<Stakeholder[]>("/api/stakeholders");
  const { data: numberPrefixes } = useFetch<NumberPrefix[]>(
    "/api/number-prefixes"
  );

  // Existing steps (excluding the one being edited) — kept for parity with
  // the flow-scoped StepFormDialog so the GeneralStepFormDialog interface
  // stays backward-compatible. General steps aren't linked via before/after
  // (they live in a flat pool), but the prop is still required by callers.
  void existingSteps;

  // Form state — NO step order. Steps are linked via before/after at the
  // flow level (handled in the Process tab's StepFormDialog). General steps
  // in this pool are unordered; consumers reference them by name/stage.
  const [predefinedStage, setPredefinedStage] = useState<string>(
    initial?.predefinedStage ?? ""
  );
  const [customName, setCustomName] = useState<string>(
    !initial?.predefinedStage ? (initial?.positionName ?? "") : ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [department, setDepartment] = useState<string>(
    initial?.department ?? "CSLOG"
  );
  const [responsibleOfficers, setResponsibleOfficers] = useState<string[]>(
    () => parseJsonArray(initial?.responsibleOfficers)
  );
  const [responsibleSailors, setResponsibleSailors] = useState<string[]>(
    () => parseJsonArray(initial?.responsibleSailors)
  );
  const [isTenderStage, setIsTenderStage] = useState(
    initial?.isTenderStage ?? false
  );
  const [isEvaluationStage, setIsEvaluationStage] = useState(
    initial?.isEvaluationStage ?? false
  );
  const [prefixedNumber, setPrefixedNumber] = useState(
    initial?.prefixedNumber ?? ""
  );

  // Auto-fill from STAGE_AUTO_DETAILS when a predefined stage is selected
  const stageInfo = predefinedStage ? STAGE_AUTO_DETAILS[predefinedStage] : null;

  function applyPredefinedStage(stage: string) {
    setPredefinedStage(stage);
    if (!stage) return;
    const info = STAGE_AUTO_DETAILS[stage];
    if (!info) return;
    setIsTenderStage(info.isTenderStage);
    setIsEvaluationStage(info.isEvaluationStage);
    if (info.prefixedNumber) {
      const np = (numberPrefixes ?? []).find(
        (p) => p.docType === info.prefixedNumber
      );
      setPrefixedNumber(np?.prefix || info.prefixedNumber);
    } else {
      setPrefixedNumber("");
    }
    setDescription((prev) =>
      prev && prev.trim() !== "" ? prev : info.description
    );
  }

  function clearPredefinedStage() {
    setPredefinedStage("");
    // Leave isTenderStage / isEvaluationStage / prefixedNumber / description
    // as they are — the user can manually adjust if needed.
  }

  const deptForStakeholder = department === "CCED" ? "CE" : "CSLOG";
  const officerList = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      if (s.department !== deptForStakeholder) return false;
      return s.category.toLowerCase().includes("officer");
    });
  }, [stakeholders, deptForStakeholder]);
  const sailorList = useMemo(() => {
    return (stakeholders ?? []).filter((s) => {
      if (s.department !== deptForStakeholder) return false;
      return s.category.toLowerCase().includes("sailor");
    });
  }, [stakeholders, deptForStakeholder]);

  // The resolved step name (predefined stage OR custom name)
  const resolvedName = predefinedStage || customName.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedName) {
      toast({
        title: "Step name required",
        description: "Pick a predefined stage OR enter a custom step name.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const body = {
      predefinedStage: predefinedStage || null,
      positionName: resolvedName,
      description: description.trim() || null,
      department,
      responsibleOfficers,
      responsibleSailors,
      isTenderStage,
      isEvaluationStage,
      prefixedNumber: prefixedNumber.trim() || null,
    };
    const res = isEdit
      ? await apiRequest(
          `/api/process-flows/${flowId}/steps/${initial!.id}`,
          "PUT",
          body
        )
      : await apiRequest(`/api/process-flows/${flowId}/steps`, "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "Step updated" : "Step added",
        description: `${resolvedName} → General Steps pool`,
      });
      onSaved();
    } else {
      toast({
        title: "Failed to save step",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTree className="h-5 w-5 text-primary" />
            {isEdit ? "Edit General Step" : "Add General Step"}
          </DialogTitle>
          <DialogDescription>
            Define a reusable process step — no step order required. Pick a
            predefined stage or type a custom one; set the department to filter
            the stakeholder directory for the responsible officer / sailor
            dropdowns.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Predefined Stage OR Custom Step Name — only ONE required */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Predefined Stage">
              <Select
                value={predefinedStage || "__none__"}
                onValueChange={(v) => {
                  if (v === "__none__") clearPredefinedStage();
                  else applyPredefinedStage(v);
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="— None — pick a stage —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {PROCESS_STEP_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Auto-fills description, prefixed number &amp; tender/evaluation
                flags. Includes Spec making, Pre Tender, Post Tender, Split
                Order, Part Supply, NHQ, DPC, etc.
              </p>
            </Field>
            <Field label="Custom Step Name (if not using a predefined stage)">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Local Inspection"
                className="bg-background"
                disabled={!!predefinedStage}
              />
              <p className="text-[11px] text-muted-foreground">
                {predefinedStage
                  ? "Disabled — predefined stage selected above."
                  : "Required if no predefined stage is picked."}
              </p>
            </Field>
          </div>

          {/* Auto-set read-only hints block */}
          {(stageInfo || prefixedNumber) && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {predefinedStage
                  ? `Auto-set from "${predefinedStage}" stage`
                  : "Prefixed Number (auto)"}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {stageInfo && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Tender:</span>
                      <CustomBadge
                        className={
                          stageInfo.isTenderStage
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]"
                            : "bg-muted text-muted-foreground border-border text-[10px]"
                        }
                      >
                        {stageInfo.isTenderStage ? "Yes" : "No"}
                      </CustomBadge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Evaluation:</span>
                      <CustomBadge
                        className={
                          stageInfo.isEvaluationStage
                            ? "bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]"
                            : "bg-muted text-muted-foreground border-border text-[10px]"
                        }
                      >
                        {stageInfo.isEvaluationStage ? "Yes" : "No"}
                      </CustomBadge>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Prefix:</span>
                  {prefixedNumber ? (
                    <CustomBadge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-mono text-[10px]">
                      <Hash className="h-2.5 w-2.5 mr-0.5" />
                      {prefixedNumber}
                    </CustomBadge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Prefixed Number — read-only, auto from stage */}
          <Field label="Prefixed Number (auto)">
            <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="text-sm font-mono text-cyan-400">
                {prefixedNumber || "—"}
              </span>
              {prefixedNumber && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  (auto)
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {predefinedStage
                ? "Auto-set from the predefined stage. Not editable."
                : "Will be auto-set when you pick a predefined stage above."}
            </p>
          </Field>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this step..."
              className="bg-background min-h-[70px]"
            />
            {stageInfo && (
              <p className="text-[11px] text-muted-foreground">
                Auto-filled from stage definition — edit freely if needed.
              </p>
            )}
          </Field>
          <Field label="Department">
            <Select
              value={department}
              onValueChange={(v) => {
                setDepartment(v);
                setResponsibleOfficers([]);
                setResponsibleSailors([]);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {SETTINGS_DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Filters the stakeholder directory for the multi-selects below.
              CCED → CE officers/sailors, CSLOG → CSLOG officers/sailors.
            </p>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MultiStakeholderPicker
              label="Responsible Officers"
              value={responsibleOfficers}
              onChange={setResponsibleOfficers}
              options={officerList}
              loading={stakeholdersLoading}
              emptyHint={`No officers found in ${department} department`}
            />
            <MultiStakeholderPicker
              label="Responsible Sailors"
              value={responsibleSailors}
              onChange={setResponsibleSailors}
              options={sailorList}
              loading={stakeholdersLoading}
              emptyHint={`No sailors found in ${department} department`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              htmlFor="gs-tender-stage"
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                isTenderStage
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-border bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <Checkbox
                id="gs-tender-stage"
                checked={isTenderStage}
                onCheckedChange={(v) => setIsTenderStage(v === true)}
                className="mt-0.5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Gavel className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-sm font-medium text-foreground">
                    Tender Stage
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Auto-checked for tender-related stages.
                </p>
              </div>
            </label>
            <label
              htmlFor="gs-eval-stage"
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                isEvaluationStage
                  ? "border-violet-500/50 bg-violet-500/5"
                  : "border-border bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <Checkbox
                id="gs-eval-stage"
                checked={isEvaluationStage}
                onCheckedChange={(v) => setIsEvaluationStage(v === true)}
                className="mt-0.5 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-sm font-medium text-foreground">
                    Evaluation Stage
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Auto-checked for BEC Evaluation.
                </p>
              </div>
            </label>
          </div>

          {/* Live preview */}
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Live Preview
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CustomBadge className="bg-sky-500/15 text-sky-400 border-sky-500/30 font-semibold">
                {resolvedName || "Step Name"}
              </CustomBadge>
              {department && (
                <CustomBadge
                  className={cn(
                    "border",
                    department === "CSLOG"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : department === "CCED"
                      ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                      : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                  )}
                >
                  {department}
                </CustomBadge>
              )}
              {isTenderStage && (
                <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                  <Gavel className="h-3 w-3 mr-1" />
                  TENDER
                </CustomBadge>
              )}
              {isEvaluationStage && (
                <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30">
                  <ClipboardCheck className="h-3 w-3 mr-1" />
                  EVALUATION
                </CustomBadge>
              )}
              {prefixedNumber && (
                <CustomBadge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-mono">
                  <Hash className="h-3 w-3 mr-1" />
                  {prefixedNumber}
                </CustomBadge>
              )}
              {responsibleOfficers.length > 0 && (
                <CustomBadge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-[10px]">
                  {responsibleOfficers.length} officer
                  {responsibleOfficers.length === 1 ? "" : "s"}
                </CustomBadge>
              )}
              {responsibleSailors.length > 0 && (
                <CustomBadge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px]">
                  {responsibleSailors.length} sailor
                  {responsibleSailors.length === 1 ? "" : "s"}
                </CustomBadge>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isEdit ? "Save Changes" : "Add Step"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
