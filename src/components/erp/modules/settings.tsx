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
  PROCESS_FLOW_TYPES,
  processFlowColor,
} from "@/lib/constants";
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
export function SettingsModule() {
  const [tab, setTab] = useState<"users" | "stores" | "process">("process");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage user profiles, store configuration & procurement process flows"
        icon={Settings}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "users" | "stores" | "process")}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="users">
            <Users className="h-4 w-4" />
            User Profiles
          </TabsTrigger>
          <TabsTrigger value="stores">
            <Warehouse className="h-4 w-4" />
            Store Management
          </TabsTrigger>
          <TabsTrigger value="process">
            <GitBranch className="h-4 w-4" />
            Process
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserProfilesTab />
        </TabsContent>
        <TabsContent value="stores">
          <StoreManagementTab />
        </TabsContent>
        <TabsContent value="process">
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
          label="Departments"
          value={
            new Set(
              list?.map((u) => u.department).filter(Boolean) as string[]
            ).size
          }
          icon={Building2}
          accent="purple"
          sub="Distinct units"
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

// ═════════════════════════════════════════════════════════
// TAB 2 — Store Management
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
// TAB 3 — Process Flows (centerpiece)
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
