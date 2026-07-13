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
  formatCurrency,
} from "@/lib/constants";
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
  ArrowRight,
  ListTree,
  KeyRound,
  Vote,
  Lock,
  Unlock,
  AlertCircle,
  LogIn,
  LogOut,
  Info,
  Coins,
  Calendar,
  Crown,
  UserCog,
  Activity,
  Landmark,
  Fingerprint,
  Eye,
  EyeOff,
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
  location: string | null;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ProcessStep {
  id: string;
  flowId: string;
  stepOrder: number;
  positionName: string;
  description: string | null;
  defaultResponsiblePerson: string | null;
  financialDelegationLevel: string | null;
  isTenderStage: boolean;
  isEvaluationStage: boolean;
  createdAt: string;
}

interface ProcessFlow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  steps: ProcessStep[];
}

interface Vote {
  id: string;
  voteNumber: string;
  description: string;
  voteType: string;
  allocation: number;
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
  | "process";

export function SettingsModule() {
  const [tab, setTab] = useState<SettingsTab>("users");

  const tabs: {
    value: SettingsTab;
    label: string;
    short: string;
    icon: LucideIcon;
    iconClass: string;
  }[] = [
    {
      value: "users",
      label: "User Profiles",
      short: "Users",
      icon: Users,
      iconClass: "bg-blue-500/15 text-blue-400",
    },
    {
      value: "roles",
      label: "Roles & Access",
      short: "Roles",
      icon: Shield,
      iconClass: "bg-violet-500/15 text-violet-400",
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage users, roles, authentication, votes, stores & procurement process flows"
        icon={Settings}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as SettingsTab)}
      >
        <div className="bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-transparent border border-border rounded-xl p-1.5 overflow-x-auto">
          <TabsList className="bg-transparent border-0 p-0 h-auto flex gap-1 w-max min-w-full">
            {tabs.map((t) => {
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

        <TabsContent value="users" className="mt-4">
          <UserProfilesTab />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesAccessTab />
        </TabsContent>
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
}

function UserFormDialog({ open, onOpenChange, initial, onSaved }: UserFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<string>(initial?.role ?? "Officer");
  const [department, setDepartment] = useState<string>(
    initial?.department ?? "CSLOG"
  );
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
      active,
    };
    const res = isEdit
      ? await apiRequest(`/api/settings/users/${initial!.id}`, "PUT", body)
      : await apiRequest("/api/settings/users", "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "User updated" : "User created",
        description: body.displayName,
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
            <UserCircle2 className="h-5 w-5 text-primary" />
            {isEdit ? "Edit User Profile" : "Add User Profile"}
          </DialogTitle>
          <DialogDescription>
            Configure login identity, role permissions and department
            assignment.
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

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent border border-violet-500/20 rounded-xl p-5 flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0 ring-2 ring-violet-500/20">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Roles &amp; Access Permissions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            The permission matrix below defines what each role can do across
            every module of the CE Logistic Panel. This is a reference
            configuration — admins assign roles to users in the User Profiles
            tab.
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
        <div className="bg-gradient-to-r from-secondary/60 to-transparent border-b border-border p-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ListTree className="h-4 w-4 text-primary" />
              Module Permission Matrix
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Read-only reference of role-based access control (RBAC) for the
              ERP modules.
            </p>
          </div>
          <CustomBadge className="bg-secondary text-muted-foreground border-border">
            {ROLE_PERMISSIONS.length} modules × {USER_ROLES.length} roles
          </CustomBadge>
        </div>
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="min-w-[180px]">Module</TableHead>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLE_PERMISSIONS.map((row, idx) => (
                <TableRow
                  key={row.module}
                  className={cn(
                    "border-border transition-colors hover:bg-secondary/30",
                    idx % 2 === 1 && "bg-secondary/10"
                  )}
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      {row.module}
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

  const [passwordTarget, setPasswordTarget] = useState<UserProfile | null>(
    null
  );

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

      {/* Users password status list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/10 to-transparent border-b border-border p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                User Password Status
              </h3>
              <p className="text-xs text-muted-foreground">
                Quick set or reset password for any user
              </p>
            </div>
          </div>
          <CustomBadge className="bg-secondary text-muted-foreground border-border">
            {securedCount} / {users?.length ?? 0} secured
          </CustomBadge>
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
                  <TableHead>Password</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPasswordTarget(u)}
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          Set Password
                        </Button>
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
            description="Create users in the User Profiles tab first."
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
    const totalAllocation = votes.reduce(
      (acc, v) => acc + (v.allocation ?? 0),
      0
    );
    return {
      total: votes.length,
      capital: capital.length,
      recurring: recurring.length,
      totalAllocation,
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
            <Coins className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Allocation
            </p>
            <p className="text-xl font-bold text-foreground mt-0.5 truncate">
              {formatCurrency(stats.totalAllocation)}
            </p>
            <p className="text-xs text-muted-foreground">Combined value</p>
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
                  <TableHead className="text-right">Allocation</TableHead>
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
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(v.allocation ?? 0)}
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
  const [allocation, setAllocation] = useState<string>(
    initial ? String(initial.allocation) : "0"
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
      allocation: Number(allocation) || 0,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Vote" : "Add Vote / Fund"}
          </DialogTitle>
          <DialogDescription>
            Configure a Treasury vote (fund) — used to track the financial
            allocation for projects and maintenance.
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
          <div className="grid grid-cols-2 gap-4">
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
            <Field label="Allocation (Rs.)">
              <Input
                type="number"
                min={0}
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
                placeholder="0"
                className="bg-background"
              />
            </Field>
          </div>
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
              votes fund annual maintenance.
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
                  <TableHead>Responsible Person</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, idx) => (
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
                      {s.responsiblePerson ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                          <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {s.responsiblePerson}
                        </span>
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
                ))}
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

  const [storeName, setStoreName] = useState(initial?.storeName ?? "");
  const [storeType, setStoreType] = useState<string>(
    initial?.storeType ?? "Zone"
  );
  const [responsiblePerson, setResponsiblePerson] = useState(
    initial?.responsiblePerson ?? ""
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

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
      responsiblePerson: responsiblePerson.trim() || null,
      location: location.trim() || null,
      active,
    };
    const res = isEdit
      ? await apiRequest(`/api/settings/stores-config/${initial!.id}`, "PUT", body)
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Store Configuration" : "Add Store Configuration"}
          </DialogTitle>
          <DialogDescription>
            Define the store name, type, responsible person and location.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Field label="Responsible Person">
            <Input
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              placeholder="e.g. PO Bandara / LS Silva"
              className="bg-background"
            />
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
        description: `${deleteStepTarget.step.positionName} from ${deleteStepTarget.flow.name} flow`,
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
        <div className="space-y-6">
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
                {deleteStepTarget?.step.positionName}
              </span>{" "}
              (Step {deleteStepTarget?.step.stepOrder}) from the{" "}
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
// Flow Card (header + vertical timeline of steps)
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
  const steps = [...(flow.steps ?? [])].sort(
    (a, b) => a.stepOrder - b.stepOrder
  );

  const tenderCount = steps.filter((s) => s.isTenderStage).length;
  const evalCount = steps.filter((s) => s.isEvaluationStage).length;
  const delegationCount = steps.filter(
    (s) => s.financialDelegationLevel && s.financialDelegationLevel !== "—"
  ).length;

  return (
    <div
      className={cn(
        "bg-card border rounded-xl overflow-hidden",
        accent.border
      )}
    >
      {/* Colored header */}
      <div
        className={cn(
          "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-5 border-b",
          accent.headerBg,
          accent.border
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ring-2",
              accent.headerBg,
              accent.ring
            )}
          >
            <GitBranch className={cn("h-6 w-6", accent.text)} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-foreground">{flow.name}</h3>
              <CustomBadge className={accent.badge}>{flow.name} Flow</CustomBadge>
              <CustomBadge className="bg-secondary text-muted-foreground border-border">
                {steps.length} step{steps.length === 1 ? "" : "s"}
              </CustomBadge>
              {tenderCount > 0 && (
                <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                  <Gavel className="h-3 w-3 mr-1" />
                  {tenderCount} Tender
                </CustomBadge>
              )}
              {evalCount > 0 && (
                <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30">
                  <ClipboardCheck className="h-3 w-3 mr-1" />
                  {evalCount} Evaluation
                </CustomBadge>
              )}
              {delegationCount > 0 && (
                <CustomBadge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
                  <Banknote className="h-3 w-3 mr-1" />
                  {delegationCount} Delegation{delegationCount === 1 ? "" : "s"}
                </CustomBadge>
              )}
            </div>
            {flow.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {flow.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditFlow}
            className="bg-background/60"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteFlow}
            className="bg-background/60 text-red-400 hover:text-red-500 hover:bg-red-500/10 border-red-500/30"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
          <Button size="sm" onClick={onAddStep}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Step
          </Button>
        </div>
      </div>

      {/* Body — vertical timeline */}
      <div className="p-5">
        {steps.length === 0 ? (
          <EmptyState
            icon={ListTree}
            title="No steps defined"
            description="Add steps to outline the procurement file's journey through this flow."
            action={
              <Button size="sm" onClick={onAddStep}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Step
              </Button>
            }
          />
        ) : (
          <div className="relative pl-8 sm:pl-10">
            {/* vertical line */}
            <div
              className={cn(
                "absolute left-3 sm:left-4 top-2 bottom-2 w-0.5",
                accent.dot,
                "opacity-30"
              )}
            />
            <ol className="space-y-4">
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
// Step Timeline Item
// ─────────────────────────────────────────────────────────
interface StepTimelineItemProps {
  step: ProcessStep;
  isLast: boolean;
  accent: ReturnType<typeof flowAccent>;
  onEdit: () => void;
  onDelete: () => void;
}

function StepTimelineItem({
  step,
  accent,
  onEdit,
  onDelete,
}: StepTimelineItemProps) {
  const hasDelegation =
    step.financialDelegationLevel &&
    step.financialDelegationLevel.trim() !== "" &&
    step.financialDelegationLevel !== "—";
  const isBranch = step.isTenderStage || step.isEvaluationStage;

  // Branch styling: tender = amber, evaluation = violet, both = combined
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
          "absolute -left-[1.4rem] sm:-left-[1.6rem] top-3 h-3.5 w-3.5 rounded-full ring-4 ring-card",
          step.isTenderStage
            ? "bg-amber-500"
            : step.isEvaluationStage
            ? "bg-violet-500"
            : accent.stepDot
        )}
      >
        {step.isTenderStage && step.isEvaluationStage && (
          <div className="absolute inset-0 rounded-full bg-violet-500 mix-blend-lighten" />
        )}
      </div>

      <div
        className={cn(
          "bg-secondary/30 border border-l-4 rounded-lg p-4 transition-colors hover:bg-secondary/50",
          branchBorder
        )}
      >
        {/* Top row: order + position + branch tags */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={cn(
              "inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md text-xs font-bold",
              accent.headerBg,
              accent.text,
              "border",
              accent.border
            )}
          >
            #{step.stepOrder}
          </span>
          <CustomBadge
            className={cn(
              "text-sm font-semibold",
              accent.badge
            )}
          >
            {step.positionName}
          </CustomBadge>

          {step.isTenderStage && (
            <CustomBadge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
              <Gavel className="h-3 w-3 mr-1" />
              TENDER
            </CustomBadge>
          )}
          {step.isEvaluationStage && (
            <CustomBadge className="bg-violet-500/15 text-violet-400 border-violet-500/30">
              <ClipboardCheck className="h-3 w-3 mr-1" />
              EVALUATION
            </CustomBadge>
          )}

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onEdit}
              title="Edit step"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
              onClick={onDelete}
              title="Delete step"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {step.description && (
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            {step.description}
          </p>
        )}

        {/* Body: responsible person + financial delegation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
              <UserCircle2 className="h-3 w-3" />
              Default Responsible Person
            </p>
            <p className="text-sm font-medium text-foreground">
              {step.defaultResponsiblePerson || "—"}
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg border p-3",
              hasDelegation
                ? "border-blue-500/40 bg-blue-500/5"
                : "border-border bg-background/40"
            )}
          >
            <p
              className={cn(
                "text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1",
                hasDelegation
                  ? "text-blue-400"
                  : "text-muted-foreground"
              )}
            >
              <Award className="h-3 w-3" />
              Financial Delegation Level
            </p>
            <p
              className={cn(
                "text-sm font-semibold",
                hasDelegation ? "text-blue-300" : "text-muted-foreground"
              )}
            >
              {step.financialDelegationLevel || "—"}
            </p>
          </div>
        </div>

        {/* Branch helper caption */}
        {isBranch && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
            {step.isTenderStage && step.isEvaluationStage
              ? "Combined tender & evaluation branch — quotation opening and BEC evaluation occur at this stage."
              : step.isTenderStage
              ? "Tender branch — quotation/tender is called, received and opened at this stage."
              : "Evaluation branch — Bid Evaluation Committee (BEC) reviews and recommends at this stage."}
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

  const [name, setName] = useState<string>(initial?.name ?? "RC");
  const [description, setDescription] = useState(initial?.description ?? "");

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
            Steps are added separately after creation.
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

  const nextOrder = useMemo(() => {
    const max = flow.steps?.reduce(
      (m, s) => Math.max(m, s.stepOrder),
      0
    );
    return (max ?? 0) + 1;
  }, [flow.steps]);

  const [stepOrder, setStepOrder] = useState<string>(
    String(initial?.stepOrder ?? nextOrder)
  );
  const [positionName, setPositionName] = useState(
    initial?.positionName ?? ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [defaultResponsiblePerson, setDefaultResponsiblePerson] = useState(
    initial?.defaultResponsiblePerson ?? ""
  );
  const [financialDelegationLevel, setFinancialDelegationLevel] = useState(
    initial?.financialDelegationLevel ?? ""
  );
  const [isTenderStage, setIsTenderStage] = useState(
    initial?.isTenderStage ?? false
  );
  const [isEvaluationStage, setIsEvaluationStage] = useState(
    initial?.isEvaluationStage ?? false
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const orderNum = Number(stepOrder);
    if (!positionName.trim()) {
      toast({ title: "Position name is required", variant: "destructive" });
      return;
    }
    if (isNaN(orderNum) || orderNum < 1) {
      toast({
        title: "Step order must be a positive number",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const body = {
      stepOrder: orderNum,
      positionName: positionName.trim(),
      description: description.trim() || null,
      defaultResponsiblePerson: defaultResponsiblePerson.trim() || null,
      financialDelegationLevel: financialDelegationLevel.trim() || null,
      isTenderStage,
      isEvaluationStage,
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
        description: `${body.positionName} → ${flow.name} flow`,
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
            — including tender/evaluation branch flags and financial delegation
            level.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Step Order" required>
              <Input
                type="number"
                min={1}
                value={stepOrder}
                onChange={(e) => setStepOrder(e.target.value)}
                placeholder="1"
                className="bg-background"
                required
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Position Name" required>
                <Input
                  value={positionName}
                  onChange={(e) => setPositionName(e.target.value)}
                  placeholder="e.g. PR Raised / Tender Called / BEC Evaluation"
                  className="bg-background"
                  required
                />
              </Field>
            </div>
          </div>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what happens at this step..."
              className="bg-background min-h-[70px]"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Default Responsible Person">
              <Input
                value={defaultResponsiblePerson}
                onChange={(e) => setDefaultResponsiblePerson(e.target.value)}
                placeholder="e.g. ASO(E) — Lt. Cdr. K. Silva"
                className="bg-background"
              />
            </Field>
            <Field label="Financial Delegation Level">
              <Input
                value={financialDelegationLevel}
                onChange={(e) => setFinancialDelegationLevel(e.target.value)}
                placeholder="e.g. Up to Rs. 2,000,000 — Capt"
                className="bg-background"
              />
            </Field>
          </div>

          {/* Branch flags */}
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
                  Marks this as part of the tender branch — quotation called,
                  received or opened.
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
                  Marks this as part of the BEC evaluation branch — bid
                  evaluation & recommendation.
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
              <span
                className={cn(
                  "inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md text-xs font-bold border",
                  accent.headerBg,
                  accent.text,
                  accent.border
                )}
              >
                #{stepOrder || "?"}
              </span>
              <CustomBadge className={cn("font-semibold", accent.badge)}>
                {positionName || "Position Name"}
              </CustomBadge>
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
              {financialDelegationLevel &&
                financialDelegationLevel.trim() !== "" && (
                  <CustomBadge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
                    <Award className="h-3 w-3 mr-1" />
                    {financialDelegationLevel}
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
