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
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
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
import { useToast } from "@/hooks/use-toast";
import {
  CSLOG_APPOINTMENTS,
  CE_APPOINTMENTS,
  STAKEHOLDER_DEPARTMENTS,
  STAKEHOLDER_ROLES,
  AVAILABILITY_STATUSES,
  availabilityColor,
  departmentColor,
  ratingColor,
  ratingLabel,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Users,
  User,
  Phone,
  MessageCircle,
  Mail,
  Building2,
  Star,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ShieldCheck,
  Award,
  Loader2,
  Search,
  Filter,
  X,
  Anchor,
  Wrench,
  Briefcase,
  ClipboardList,
  Contact,
  TrendingUp,
  AlertTriangle,
  StickyNote,
  PhoneCall,
  IdCard,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface Stakeholder {
  id: string;
  name: string;
  rankOrRate: string | null;
  svcNumber: string | null;
  appointment: string | null;
  department: string;
  officeNumber: string | null;
  telephone: string | null;
  whatsapp: string | null;
  email: string | null;
  availability: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierContact {
  id: string;
  supplierId: string;
  name: string;
  designation: string | null;
  telephone: string | null;
  whatsapp: string | null;
  email: string | null;
  isPrimary: boolean;
  createdAt: string;
}

interface SupplierNomination {
  id: string;
  supplierId: string;
  itemCode: string | null;
  itemName: string;
  category: string;
  createdAt: string;
}

interface SupplierRating {
  id: string;
  supplierId: string;
  qciScore: number;
  loyalty: number;
  professionalism: number;
  activeEngagement: number;
  values: number;
  overallScore: number;
  remarks: string | null;
  ratedBy: string | null;
  ratedAt: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  telephone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  contractDetails: string | null;
  registrationNo: string | null;
  vatNo: string | null;
  bankDetails: string | null;
  createdAt: string;
  updatedAt: string;
  contacts: SupplierContact[];
  nominations: SupplierNomination[];
  ratings: SupplierRating[];
  avgRating: number;
  ratingCount: number;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const ALL_APPOINTMENTS = [
  "all",
  ...CSLOG_APPOINTMENTS,
  ...CE_APPOINTMENTS,
] as const;

/** Strip everything except digits from a phone string. */
function digits(num: string | null | undefined): string {
  if (!num) return "";
  return num.replace(/[^\d]/g, "");
}

/** Build a tel: link (digits only, keep simple). */
function telLink(num: string | null | undefined): string | null {
  const d = digits(num);
  return d ? `tel:${d}` : null;
}

/**
 * Build a wa.me link.
 * Sri Lankan numbers starting with 0 are converted to +94.
 * Otherwise, return the digits as-is.
 */
function waMeLink(num: string | null | undefined): string | null {
  const d = digits(num);
  if (!d) return null;
  if (d.startsWith("0")) {
    return `https://wa.me/94${d.slice(1)}`;
  }
  return `https://wa.me/${d}`;
}

/** Bar color for a rating score. */
function ratingBarColor(score: number): string {
  if (score >= 4.5) return "#10b981"; // emerald
  if (score >= 3.5) return "#3b82f6"; // blue
  if (score >= 2.5) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

/** Color for an individual rating category progress bar (matches ratingColor thresholds). */
function ratingProgressClass(score: number): string {
  if (score >= 4.5) return "bg-emerald-500";
  if (score >= 3.5) return "bg-blue-500";
  if (score >= 2.5) return "bg-amber-500";
  return "bg-red-500";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────
// Main Module
// ─────────────────────────────────────────────────────────
export function StakeholdersModule() {
  const [tab, setTab] = useState<"officers" | "suppliers">("officers");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stakeholders Directory"
        description="Officers, sailors & supplier contract information — contact cards, ratings & evaluations"
        icon={Users}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "officers" | "suppliers")}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="officers">
            <User className="h-4 w-4" />
            Officers & Sailors
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Building2 className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
        </TabsList>
        <TabsContent value="officers">
          <OfficersSailorsTab />
        </TabsContent>
        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 1 — Officers & Sailors Directory
// ═════════════════════════════════════════════════════════
function OfficersSailorsTab() {
  const { data: list, loading, error, refresh } = useFetch<Stakeholder[]>(
    "/api/stakeholders"
  );
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [apptFilter, setApptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [availFilter, setAvailFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Stakeholder | null>(null);
  const [viewTarget, setViewTarget] = useState<Stakeholder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Stakeholder | null>(null);

  const filtered = useMemo(() => {
    if (!list) return [];
    const s = search.trim().toLowerCase();
    return list.filter((p) => {
      if (deptFilter !== "all" && p.department !== deptFilter) return false;
      if (apptFilter !== "all" && p.appointment !== apptFilter) return false;
      if (roleFilter !== "all" && p.role !== roleFilter) return false;
      if (availFilter !== "all" && p.availability !== availFilter) return false;
      if (s) {
        const hay = `${p.name} ${p.svcNumber ?? ""} ${p.appointment ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [list, search, deptFilter, apptFilter, roleFilter, availFilter]);

  const cslogCount = useMemo(
    () => list?.filter((p) => p.department === "CSLOG").length ?? 0,
    [list]
  );
  const ceCount = useMemo(
    () => list?.filter((p) => p.department === "CE").length ?? 0,
    [list]
  );
  const availableCount = useMemo(
    () => list?.filter((p) => p.availability === "Available").length ?? 0,
    [list]
  );

  const filtersActive =
    search !== "" ||
    deptFilter !== "all" ||
    apptFilter !== "all" ||
    roleFilter !== "all" ||
    availFilter !== "all";

  function clearFilters() {
    setSearch("");
    setDeptFilter("all");
    setApptFilter("all");
    setRoleFilter("all");
    setAvailFilter("all");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await apiRequest(`/api/stakeholders/${deleteTarget.id}`, "DELETE");
    if (res.ok) {
      toast({ title: "Person deleted", description: deleteTarget.name });
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

  if (loading) return <LoadingState label="Loading personnel..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Personnel"
          value={list?.length ?? 0}
          icon={Users}
          accent="blue"
          sub="All departments"
        />
        <StatCard
          label="CSLOG Dept"
          value={cslogCount}
          icon={Anchor}
          accent="purple"
          sub="Logistics officers & sailors"
        />
        <StatCard
          label="CE Dept"
          value={ceCount}
          icon={Wrench}
          accent="amber"
          sub="Civil engineering"
        />
        <StatCard
          label="Available Now"
          value={availableCount}
          icon={ShieldCheck}
          accent="green"
          sub="On duty & reachable"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Search (Name / SVC / Appointment)
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search personnel..."
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Department</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {STAKEHOLDER_DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Appointment</Label>
            <Select value={apptFilter} onValueChange={setApptFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Appointments</SelectItem>
                <SelectItem value="__cslog" disabled className="text-muted-foreground">
                  — CSLOG —
                </SelectItem>
                {CSLOG_APPOINTMENTS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
                <SelectItem value="__ce" disabled className="text-muted-foreground">
                  — CE —
                </SelectItem>
                {CE_APPOINTMENTS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {STAKEHOLDER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Availability</Label>
            <Select value={availFilter} onValueChange={setAvailFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {AVAILABILITY_STATUSES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)} className="h-9 lg:ml-auto">
            <Plus className="h-4 w-4" /> Add Person
          </Button>
        </div>
      </div>

      {/* Directory table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {!filtered.length ? (
          <EmptyState
            icon={filtersActive ? Filter : Users}
            title={filtersActive ? "No matches" : "No personnel yet"}
            description={
              filtersActive
                ? "Try clearing filters to see everyone."
                : "Add officers and sailors to start building your directory."
            }
            action={
              filtersActive ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Person
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                  <TableHead className="min-w-[180px]">Name</TableHead>
                  <TableHead>Rank / Rate</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>SVC Number</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow
                    key={p.id}
                    className="border-border cursor-pointer"
                    onClick={() => setViewTarget(p)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.rankOrRate || "—"}
                    </TableCell>
                    <TableCell>
                      {p.appointment ? (
                        <CustomBadge className={departmentColor(p.department)}>
                          {p.appointment}
                        </CustomBadge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomBadge className={departmentColor(p.department)}>
                        {p.department}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {p.svcNumber || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.officeNumber || "—"}
                    </TableCell>
                    <TableCell>
                      {telLink(p.telephone) ? (
                        <a
                          href={telLink(p.telephone)!}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {p.telephone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {waMeLink(p.whatsapp) ? (
                        <a
                          href={waMeLink(p.whatsapp)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {p.whatsapp}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomBadge className={availabilityColor(p.availability)}>
                        {p.availability}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewTarget(p)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditTarget(p)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          onClick={() => setDeleteTarget(p)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      {addOpen && (
        <StakeholderFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}
      {editTarget && (
        <StakeholderFormDialog
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          initial={editTarget}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}

      {/* View dialog */}
      {viewTarget && (
        <StakeholderViewDialog
          stakeholder={viewTarget}
          open={!!viewTarget}
          onOpenChange={(o) => !o && setViewTarget(null)}
          onEdit={() => {
            const p = viewTarget;
            setViewTarget(null);
            setEditTarget(p);
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
            <AlertDialogTitle>Delete personnel record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="text-foreground font-medium">{deleteTarget?.name}</span>{" "}
              from the directory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Stakeholder Form (Add / Edit)
// ─────────────────────────────────────────────────────────
interface StakeholderFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Stakeholder | null;
  onSaved: () => void;
}

function StakeholderFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: StakeholderFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Form state (initialised once from `initial` — keyed remount via `key` prop on caller)
  const [name, setName] = useState(initial?.name ?? "");
  const [rankOrRate, setRankOrRate] = useState(initial?.rankOrRate ?? "");
  const [svcNumber, setSvcNumber] = useState(initial?.svcNumber ?? "");
  const [appointment, setAppointment] = useState(initial?.appointment ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "CSLOG");
  const [officeNumber, setOfficeNumber] = useState(initial?.officeNumber ?? "");
  const [telephone, setTelephone] = useState(initial?.telephone ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [availability, setAvailability] = useState(
    initial?.availability ?? "Available"
  );
  const [role, setRole] = useState(initial?.role ?? "Officer");

  // Derive appointment options from department
  const apptOptions =
    department === "CE" ? CE_APPOINTMENTS : CSLOG_APPOINTMENTS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      rankOrRate: rankOrRate.trim() || null,
      svcNumber: svcNumber.trim() || null,
      appointment: appointment || null,
      department,
      officeNumber: officeNumber.trim() || null,
      telephone: telephone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      availability,
      role,
    };
    const res = isEdit
      ? await apiRequest(`/api/stakeholders/${initial!.id}`, "PUT", body)
      : await apiRequest("/api/stakeholders", "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "Person updated" : "Person added",
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Personnel" : "Add Personnel"}</DialogTitle>
          <DialogDescription>
            Capture contact & appointment details for officers and sailors.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cdr. R. Perera"
                required
              />
            </Field>
            <Field label="Rank / Rate">
              <Input
                value={rankOrRate}
                onChange={(e) => setRankOrRate(e.target.value)}
                placeholder="e.g. Commander / Leading Seaman"
              />
            </Field>
            <Field label="SVC Number">
              <Input
                value={svcNumber}
                onChange={(e) => setSvcNumber(e.target.value)}
                placeholder="e.g. SVC/1234"
              />
            </Field>
            <Field label="Department">
              <Select
                value={department}
                onValueChange={(v) => {
                  setDepartment(v);
                  // Reset appointment when department changes (avoid mismatch)
                  setAppointment("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAKEHOLDER_DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Appointment">
              <Select value={appointment} onValueChange={setAppointment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select appointment" />
                </SelectTrigger>
                <SelectContent>
                  {apptOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Role">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAKEHOLDER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Office Number">
              <Input
                value={officeNumber}
                onChange={(e) => setOfficeNumber(e.target.value)}
                placeholder="e.g. Ext 2101"
              />
            </Field>
            <Field label="Availability">
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_STATUSES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Telephone">
              <Input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="e.g. 011-2345678"
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. 077-1234567"
              />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rperera@navy.lk"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Add"} Personnel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────
// Stakeholder View Dialog (Contact Card)
// ─────────────────────────────────────────────────────────
function StakeholderViewDialog({
  stakeholder,
  open,
  onOpenChange,
  onEdit,
}: {
  stakeholder: Stakeholder;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: () => void;
}) {
  const s = stakeholder;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div>{s.name}</div>
              <div className="text-xs text-muted-foreground font-normal flex items-center gap-1.5 mt-0.5">
                {s.rankOrRate && <span>{s.rankOrRate}</span>}
                {s.appointment && (
                  <>
                    <span>·</span>
                    <CustomBadge className={departmentColor(s.department)}>
                      {s.appointment}
                    </CustomBadge>
                  </>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Department / Role / Availability chips */}
          <div className="flex flex-wrap gap-2">
            <CustomBadge className={departmentColor(s.department)}>
              <Building2 className="h-3 w-3 mr-1" /> {s.department} Dept
            </CustomBadge>
            <CustomBadge className="bg-secondary text-secondary-foreground border-border">
              <Briefcase className="h-3 w-3 mr-1" /> {s.role}
            </CustomBadge>
            <CustomBadge className={availabilityColor(s.availability)}>
              <ShieldCheck className="h-3 w-3 mr-1" /> {s.availability}
            </CustomBadge>
          </div>

          {/* Contact rows */}
          <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border">
            <ContactRow
              icon={IdCard}
              label="SVC Number"
              value={s.svcNumber}
              mono
            />
            <ContactRow icon={Building2} label="Office Number" value={s.officeNumber} />
            <ContactRow
              icon={Phone}
              label="Telephone"
              value={s.telephone}
              href={telLink(s.telephone)}
              hrefLabel="Call"
              accent="blue"
            />
            <ContactRow
              icon={MessageCircle}
              label="WhatsApp"
              value={s.whatsapp}
              href={waMeLink(s.whatsapp)}
              hrefLabel="Open chat"
              external
              accent="green"
            />
            <ContactRow
              icon={Mail}
              label="Email"
              value={s.email}
              href={s.email ? `mailto:${s.email}` : null}
              hrefLabel="Send"
              accent="blue"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  hrefLabel,
  external,
  accent = "default",
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  href?: string | null;
  hrefLabel?: string;
  external?: boolean;
  accent?: "default" | "blue" | "green";
  mono?: boolean;
}) {
  const accentClass =
    accent === "blue"
      ? "text-blue-400"
      : accent === "green"
        ? "text-emerald-400"
        : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={cn("h-4 w-4 shrink-0", accentClass)} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-sm text-foreground truncate",
              mono && "font-mono"
            )}
          >
            {value || "—"}
          </p>
        </div>
      </div>
      {href && value && (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border hover:bg-accent transition-colors",
            accent === "blue" && "border-blue-500/30 text-blue-400 hover:bg-blue-500/10",
            accent === "green" &&
              "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
            accent === "default" &&
              "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {hrefLabel || "Open"}
          <ChevronRight className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TAB 2 — Suppliers Directory & Ratings Dashboard
// ═════════════════════════════════════════════════════════
function SuppliersTab() {
  const { data: list, loading, error, refresh } = useFetch<Supplier[]>(
    "/api/suppliers"
  );
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState("0");

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [viewTarget, setViewTarget] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    if (!list) return [];
    const s = search.trim().toLowerCase();
    const min = parseFloat(minRating);
    return list.filter((sup) => {
      if (!isNaN(min) && (sup.avgRating || 0) < min) return false;
      if (s) {
        const hay = `${sup.name} ${sup.contactPerson ?? ""} ${
          sup.telephone ?? ""
        }`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [list, search, minRating]);

  const dashboard = useMemo(() => {
    if (!list || !list.length)
      return { total: 0, avg: 0, topName: "—", underReview: 0 };
    const total = list.length;
    const rated = list.filter((s) => s.ratingCount > 0);
    const avg =
      rated.length > 0
        ? rated.reduce((sum, s) => sum + (s.avgRating || 0), 0) / rated.length
        : 0;
    const top = rated.length
      ? rated.reduce((a, b) => ((b.avgRating || 0) > (a.avgRating || 0) ? b : a))
      : null;
    const underReview = list.filter(
      (s) => s.ratingCount > 0 && (s.avgRating || 0) < 2.5
    ).length;
    return {
      total,
      avg,
      topName: top?.name ?? "—",
      underReview,
    };
  }, [list]);

  const chartData = useMemo(() => {
    if (!list) return [];
    return list
      .map((s) => ({
        name: s.name.length > 18 ? s.name.slice(0, 16) + "…" : s.name,
        rating: Math.round((s.avgRating || 0) * 100) / 100,
        color: ratingBarColor(s.avgRating || 0),
      }))
      .sort((a, b) => b.rating - a.rating);
  }, [list]);

  const filtersActive = search !== "" || minRating !== "0";

  function clearFilters() {
    setSearch("");
    setMinRating("0");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await apiRequest(`/api/suppliers/${deleteTarget.id}`, "DELETE");
    if (res.ok) {
      toast({ title: "Supplier deleted", description: deleteTarget.name });
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

  if (loading) return <LoadingState label="Loading suppliers..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Dashboard summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Suppliers"
          value={dashboard.total}
          icon={Building2}
          accent="blue"
          sub="Registered vendors"
        />
        <StatCard
          label="Avg Rating"
          value={dashboard.avg ? `${dashboard.avg.toFixed(2)} / 5` : "—"}
          icon={Star}
          accent="purple"
          sub="Across all rated suppliers"
        />
        <StatCard
          label="Top Rated"
          value={dashboard.topName}
          icon={Award}
          accent="green"
          sub="Highest overall score"
        />
        <StatCard
          label="Under Review"
          value={dashboard.underReview}
          icon={AlertTriangle}
          accent="red"
          sub="Avg rating below 2.5"
        />
      </div>

      {/* Ratings overview chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Supplier Ratings Overview
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Avg score per supplier (color-coded by rating band)
          </span>
        </div>
        {chartData.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No supplier ratings yet"
            description="Add ratings to suppliers to see the overview chart."
          />
        ) : (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#2d3548" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#2d3548" }}
                />
                <Tooltip
                  cursor={{ fill: "#2d354833" }}
                  contentStyle={{
                    background: "#1a1f2e",
                    border: "1px solid #2d3548",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="rating" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters toolbar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Search (Name / Contact / Phone)
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers..."
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Minimum Rating
            </Label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Ratings</SelectItem>
                <SelectItem value="4.5">4.5+ (Excellent)</SelectItem>
                <SelectItem value="3.5">3.5+ (Good)</SelectItem>
                <SelectItem value="2.5">2.5+ (Satisfactory)</SelectItem>
                <SelectItem value="1.5">1.5+ (Below Average)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)} className="h-9 lg:ml-auto">
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        </div>
      </div>

      {/* Suppliers table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {!filtered.length ? (
          <EmptyState
            icon={filtersActive ? Filter : Building2}
            title={filtersActive ? "No matches" : "No suppliers yet"}
            description={
              filtersActive
                ? "Try clearing filters to see all suppliers."
                : "Add suppliers to start tracking contracts and ratings."
            }
            action={
              filtersActive ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Supplier
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                  <TableHead className="min-w-[200px]">Supplier</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-center">Nominated Items</TableHead>
                  <TableHead className="text-center">Avg Rating</TableHead>
                  <TableHead className="text-center">Ratings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sup) => (
                  <TableRow key={sup.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{sup.name}</p>
                          {sup.contractDetails && (
                            <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                              {sup.contractDetails}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sup.contactPerson || "—"}
                    </TableCell>
                    <TableCell>
                      {telLink(sup.telephone) ? (
                        <a
                          href={telLink(sup.telephone)!}
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {sup.telephone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {waMeLink(sup.whatsapp) ? (
                        <a
                          href={waMeLink(sup.whatsapp)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {sup.whatsapp}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <CustomBadge className="bg-secondary text-secondary-foreground border-border">
                        {sup.nominations?.length ?? 0}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-center">
                      {sup.ratingCount > 0 ? (
                        <CustomBadge className={ratingColor(sup.avgRating)}>
                          <Star className="h-3 w-3 mr-1" />
                          {sup.avgRating.toFixed(2)} · {ratingLabel(sup.avgRating)}
                        </CustomBadge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not rated</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {sup.ratingCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewTarget(sup)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditTarget(sup)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          onClick={() => setDeleteTarget(sup)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add / Edit supplier dialog */}
      {addOpen && (
        <SupplierFormDialog
          key="add"
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}
      {editTarget && (
        <SupplierFormDialog
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

      {/* Details dialog (centerpiece) */}
      {viewTarget && (
        <SupplierDetailsDialog
          key={`view-${viewTarget.id}`}
          supplierId={viewTarget.id}
          open={!!viewTarget}
          onOpenChange={(o) => !o && setViewTarget(null)}
          onEdit={() => {
            const sup = viewTarget;
            setViewTarget(null);
            setEditTarget(sup);
          }}
          onChanged={refresh}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="text-foreground font-medium">{deleteTarget?.name}</span>{" "}
              and all related contacts, nominations, and ratings. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Supplier Form (Add / Edit)
// ─────────────────────────────────────────────────────────
interface SupplierFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Supplier | null;
  onSaved: () => void;
}

function SupplierFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: SupplierFormProps) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? "");
  const [telephone, setTelephone] = useState(initial?.telephone ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [contractDetails, setContractDetails] = useState(
    initial?.contractDetails ?? ""
  );
  const [registrationNo, setRegistrationNo] = useState(
    initial?.registrationNo ?? ""
  );
  const [vatNo, setVatNo] = useState(initial?.vatNo ?? "");
  const [bankDetails, setBankDetails] = useState(initial?.bankDetails ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Supplier name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || null,
      telephone: telephone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      contractDetails: contractDetails.trim() || null,
      registrationNo: registrationNo.trim() || null,
      vatNo: vatNo.trim() || null,
      bankDetails: bankDetails.trim() || null,
    };
    const res = isEdit
      ? await apiRequest(`/api/suppliers/${initial!.id}`, "PUT", body)
      : await apiRequest("/api/suppliers", "POST", body);
    setSaving(false);
    if (res.ok) {
      toast({
        title: isEdit ? "Supplier updated" : "Supplier added",
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          <DialogDescription>
            Capture contract, contact, and registration details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Supplier Name" required className="sm:col-span-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marine Pumps Ltd"
                required
              />
            </Field>
            <Field label="Contact Person">
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Mr. Sunil Perera"
              />
            </Field>
            <Field label="Telephone">
              <Input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="e.g. 011-2587411"
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. 077-9988776"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sales@marinepumps.lk"
              />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                rows={2}
              />
            </Field>
            <Field label="Contract Details" className="sm:col-span-2">
              <Textarea
                value={contractDetails}
                onChange={(e) => setContractDetails(e.target.value)}
                placeholder="RC validity, contract type, etc."
                rows={2}
              />
            </Field>
            <Field label="Registration No.">
              <Input
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value)}
                placeholder="PV-XXXX-XXXX"
              />
            </Field>
            <Field label="VAT No.">
              <Input
                value={vatNo}
                onChange={(e) => setVatNo(e.target.value)}
                placeholder="VAT-XXXXXXXX"
              />
            </Field>
            <Field label="Bank Details" className="sm:col-span-2">
              <Input
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder="Bank - Account Number"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Add"} Supplier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════
// Supplier Details Dialog (centerpiece)
// ═════════════════════════════════════════════════════════
function SupplierDetailsDialog({
  supplierId,
  open,
  onOpenChange,
  onEdit,
  onChanged,
}: {
  supplierId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  // Fetch single supplier (always live — refreshable from inside)
  const { data: sup, loading, error, refresh } = useFetch<Supplier>(
    `/api/suppliers/${supplierId}`
  );
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-4xl max-h-[92vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">{sup?.name ?? "Supplier"}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap mt-1">
                {sup?.contactPerson && <span>{sup.contactPerson}</span>}
                {sup && sup.ratingCount > 0 && (
                  <CustomBadge className={ratingColor(sup.avgRating)}>
                    <Star className="h-3 w-3 mr-1" />
                    {sup.avgRating.toFixed(2)} · {ratingLabel(sup.avgRating)}
                  </CustomBadge>
                )}
                {sup && sup.ratingCount === 0 && (
                  <CustomBadge className="bg-secondary text-muted-foreground border-border">
                    Not rated yet
                  </CustomBadge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <LoadingState label="Loading supplier details..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : !sup ? (
          <EmptyState icon={Building2} title="Supplier not found" />
        ) : (
          <div className="space-y-5">
            {/* Contract Details */}
            <Section
              icon={ClipboardList}
              title="Contract Details"
              accent="blue"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem label="Contract Details" value={sup.contractDetails} full />
                <DetailItem label="Registration No." value={sup.registrationNo} />
                <DetailItem label="VAT No." value={sup.vatNo} />
                <DetailItem label="Bank Details" value={sup.bankDetails} full />
                <DetailItem label="Address" value={sup.address} full />
                <DetailItem
                  label="Telephone"
                  value={sup.telephone}
                  href={telLink(sup.telephone)}
                  hrefLabel="Call"
                  accent="blue"
                />
                <DetailItem
                  label="WhatsApp"
                  value={sup.whatsapp}
                  href={waMeLink(sup.whatsapp)}
                  hrefLabel="Chat"
                  external
                  accent="green"
                />
                <DetailItem
                  label="Email"
                  value={sup.email}
                  href={sup.email ? `mailto:${sup.email}` : null}
                  hrefLabel="Mail"
                  accent="blue"
                  full
                />
              </div>
            </Section>

            {/* Contact Persons */}
            <Section icon={Contact} title="Contact Persons" accent="purple">
              <ContactsSection
                supplierId={sup.id}
                contacts={sup.contacts}
                onChanged={() => {
                  refresh();
                  onChanged();
                }}
              />
            </Section>

            {/* Nominated Items */}
            <Section icon={StickyNote} title="Nominated Items" accent="amber">
              <NominationsSection
                supplierId={sup.id}
                nominations={sup.nominations}
                onChanged={() => {
                  refresh();
                  onChanged();
                }}
              />
            </Section>

            {/* Ratings & Evaluation */}
            <Section icon={Award} title="Ratings & Evaluation" accent="green">
              <RatingsSection
                supplierId={sup.id}
                ratings={sup.ratings}
                avgRating={sup.avgRating}
                ratingCount={sup.ratingCount}
                onChanged={() => {
                  refresh();
                  onChanged();
                }}
              />
            </Section>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={onEdit}>
                <Pencil className="h-4 w-4" /> Edit Supplier
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-sections inside supplier details ───
function Section({
  icon: Icon,
  title,
  accent = "blue",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent?: "blue" | "purple" | "amber" | "green";
  children: React.ReactNode;
}) {
  const accentClass = {
    blue: "text-blue-400 bg-blue-500/10",
    purple: "text-violet-400 bg-violet-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
  }[accent];
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", accentClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DetailItem({
  label,
  value,
  href,
  hrefLabel,
  external,
  accent = "default",
  full,
}: {
  label: string;
  value: string | null;
  href?: string | null;
  hrefLabel?: string;
  external?: boolean;
  accent?: "default" | "blue" | "green";
  full?: boolean;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-card p-2.5", full && "sm:col-span-2")}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-sm text-foreground break-words min-w-0",
            !value && "text-muted-foreground"
          )}
        >
          {value || "—"}
        </p>
        {href && value && (
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border hover:bg-accent transition-colors shrink-0",
              accent === "blue" && "border-blue-500/30 text-blue-400 hover:bg-blue-500/10",
              accent === "green" &&
                "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
              accent === "default" &&
                "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {hrefLabel || "Open"}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Contacts sub-section ───
function ContactsSection({
  supplierId,
  contacts,
  onChanged,
}: {
  supplierId: string;
  contacts: SupplierContact[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(cid: string) {
    setDeletingId(cid);
    const res = await apiRequest(
      `/api/suppliers/${supplierId}/contacts/${cid}`,
      "DELETE"
    );
    setDeletingId(null);
    if (res.ok) {
      toast({ title: "Contact removed" });
      onChanged();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {contacts.length} contact{contacts.length === 1 ? "" : "s"} on file
        </p>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Contact
        </Button>
      </div>
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4 text-center">
          No contact persons recorded yet.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.designation || "—"}
                    </TableCell>
                    <TableCell>
                      {telLink(c.telephone) ? (
                        <a
                          href={telLink(c.telephone)!}
                          className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {c.telephone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {waMeLink(c.whatsapp) ? (
                        <a
                          href={waMeLink(c.whatsapp)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {c.whatsapp}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-blue-400 hover:underline truncate block max-w-[160px]"
                        >
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.isPrimary ? (
                        <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          Primary
                        </CustomBadge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        title="Remove"
                      >
                        {deletingId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {addOpen && (
        <AddContactDialog
          supplierId={supplierId}
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={() => {
            setAddOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function AddContactDialog({
  supplierId,
  open,
  onOpenChange,
  onSaved,
}: {
  supplierId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [telephone, setTelephone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await apiRequest(`/api/suppliers/${supplierId}/contacts`, "POST", {
      name: name.trim(),
      designation: designation.trim() || null,
      telephone: telephone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      isPrimary,
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Contact added" });
      onSaved();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Contact Person</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Designation">
            <Input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Sales Manager"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telephone">
              <Input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="011-XXXXXXX"
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="077-XXXXXXX"
              />
            </Field>
          </div>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">Mark as primary contact</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Nominations sub-section ───
function NominationsSection({
  supplierId,
  nominations,
  onChanged,
}: {
  supplierId: string;
  nominations: SupplierNomination[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(nid: string) {
    setDeletingId(nid);
    const res = await apiRequest(
      `/api/suppliers/${supplierId}/nominations/${nid}`,
      "DELETE"
    );
    setDeletingId(null);
    if (res.ok) {
      toast({ title: "Nomination removed" });
      onChanged();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {nominations.length} nominated item{nominations.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Nomination
        </Button>
      </div>
      {nominations.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4 text-center">
          No nominated items recorded for this supplier yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {nominations.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-border bg-card p-3 group relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {n.itemName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {n.itemCode || "—"}
                  </p>
                </div>
                <CustomBadge className="bg-secondary text-muted-foreground border-border">
                  {n.category}
                </CustomBadge>
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(n.id)}
                  disabled={deletingId === n.id}
                  title="Remove"
                >
                  {deletingId === n.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {addOpen && (
        <AddNominationDialog
          supplierId={supplierId}
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={() => {
            setAddOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function AddNominationDialog({
  supplierId,
  open,
  onOpenChange,
  onSaved,
}: {
  supplierId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("General");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) {
      toast({ title: "Item name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await apiRequest(
      `/api/suppliers/${supplierId}/nominations`,
      "POST",
      {
        itemCode: itemCode.trim() || null,
        itemName: itemName.trim(),
        category,
      }
    );
    setSaving(false);
    if (res.ok) {
      toast({ title: "Nomination added" });
      onSaved();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nominate Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Item Name" required>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Centrifugal Pump 15kW"
              required
            />
          </Field>
          <Field label="Item Code">
            <Input
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="e.g. BMS-220"
            />
          </Field>
          <Field label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "General",
                  "BMS",
                  "Plumbing",
                  "Metal",
                  "Aluminium",
                  "Paint",
                  "Electrical",
                  "Tools",
                  "Lubricant Oil",
                ].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Nominate Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ratings & Evaluation sub-section ───
function RatingsSection({
  supplierId,
  ratings,
  avgRating,
  ratingCount,
  onChanged,
}: {
  supplierId: string;
  ratings: SupplierRating[];
  avgRating: number;
  ratingCount: number;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Compute the latest breakdown (most recent rating — ratings come pre-sorted desc)
  const latest = ratings[0] ?? null;

  async function handleDelete(rid: string) {
    setDeletingId(rid);
    const res = await apiRequest(
      `/api/suppliers/${supplierId}/ratings/${rid}`,
      "DELETE"
    );
    setDeletingId(null);
    if (res.ok) {
      toast({ title: "Rating removed" });
      onChanged();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      {/* Big overall score */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-border bg-card p-4">
        <div
          className={cn(
            "h-20 w-20 rounded-xl flex flex-col items-center justify-center shrink-0 border-2",
            ratingColor(avgRating)
          )}
        >
          <span className="text-2xl font-bold">
            {ratingCount > 0 ? avgRating.toFixed(2) : "—"}
          </span>
          <span className="text-[10px] uppercase tracking-wide opacity-80">/ 5.00</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Overall Score
          </p>
          <div className="flex items-center gap-2 mt-1">
            {ratingCount > 0 ? (
              <>
                <CustomBadge className={ratingColor(avgRating)}>
                  <Star className="h-3 w-3 mr-1" />
                  {ratingLabel(avgRating)}
                </CustomBadge>
                <span className="text-xs text-muted-foreground">
                  Based on {ratingCount} rating{ratingCount === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                No ratings submitted yet.
              </span>
            )}
          </div>
          {latest && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              Latest remark: <span className="text-foreground">{latest.remarks || "—"}</span>
            </p>
          )}
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" /> Add Rating
        </Button>
      </div>

      {/* Breakdown bars — from latest rating */}
      {latest ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">
            Latest Evaluation Breakdown
          </p>
          <div className="space-y-3">
            <RatingBar label="QCI Score" value={latest.qciScore} />
            <RatingBar label="Loyalty" value={latest.loyalty} />
            <RatingBar label="Professionalism" value={latest.professionalism} />
            <RatingBar label="Active Engagement" value={latest.activeEngagement} />
            <RatingBar label="Values" value={latest.values} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Submit the first rating to see the breakdown here.
          </p>
        </div>
      )}

      {/* History table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                <TableHead>Rated At</TableHead>
                <TableHead>Rated By</TableHead>
                <TableHead className="text-center">QCI</TableHead>
                <TableHead className="text-center">Loyal</TableHead>
                <TableHead className="text-center">Prof</TableHead>
                <TableHead className="text-center">Eng</TableHead>
                <TableHead className="text-center">Values</TableHead>
                <TableHead className="text-center">Overall</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratings.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    No ratings yet.
                  </TableCell>
                </TableRow>
              ) : (
                ratings.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(r.ratedAt)}
                    </TableCell>
                    <TableCell className="text-foreground">{r.ratedBy || "—"}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {r.qciScore.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {r.loyalty.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {r.professionalism.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {r.activeEngagement.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {r.values.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center">
                      <CustomBadge className={ratingColor(r.overallScore)}>
                        {r.overallScore.toFixed(2)}
                      </CustomBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[260px]">
                      <span className="line-clamp-2">{r.remarks || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        title="Remove"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {addOpen && (
        <AddRatingDialog
          supplierId={supplierId}
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={() => {
            setAddOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-foreground tabular-nums">
          {value.toFixed(1)} / 5.0
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", ratingProgressClass(value))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AddRatingDialog({
  supplierId,
  open,
  onOpenChange,
  onSaved,
}: {
  supplierId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [qci, setQci] = useState(3);
  const [loyalty, setLoyalty] = useState(3);
  const [professionalism, setProfessionalism] = useState(3);
  const [activeEngagement, setActiveEngagement] = useState(3);
  const [values, setValues] = useState(3);
  const [remarks, setRemarks] = useState("");
  const [ratedBy, setRatedBy] = useState("");

  // Live preview of overall score (matches server formula: average of all 5)
  const preview = useMemo(() => {
    const arr = [qci, loyalty, professionalism, activeEngagement, values];
    const valid = arr.filter((v) => v > 0);
    if (valid.length === 0) return 0;
    return valid.reduce((s, v) => s + v, 0) / valid.length;
  }, [qci, loyalty, professionalism, activeEngagement, values]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await apiRequest(`/api/suppliers/${supplierId}/ratings`, "POST", {
      qciScore: qci,
      loyalty,
      professionalism,
      activeEngagement,
      values,
      remarks: remarks.trim() || null,
      ratedBy: ratedBy.trim() || null,
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Rating submitted" });
      onSaved();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Rating & Evaluation</DialogTitle>
          <DialogDescription>
            Rate the supplier across five dimensions. The overall score is computed
            automatically as the average.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <RatingSlider label="QCI Score" value={qci} onChange={setQci} />
          <RatingSlider label="Loyalty" value={loyalty} onChange={setLoyalty} />
          <RatingSlider
            label="Professionalism"
            value={professionalism}
            onChange={setProfessionalism}
          />
          <RatingSlider
            label="Active Engagement"
            value={activeEngagement}
            onChange={setActiveEngagement}
          />
          <RatingSlider label="Values" value={values} onChange={setValues} />

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Preview Overall Score</p>
              <p className="text-xs text-muted-foreground">
                {ratingLabel(preview)}
              </p>
            </div>
            <CustomBadge className={ratingColor(preview)}>
              <Star className="h-3 w-3 mr-1" />
              {preview.toFixed(2)} / 5.00
            </CustomBadge>
          </div>

          <Field label="Rated By">
            <Input
              value={ratedBy}
              onChange={(e) => setRatedBy(e.target.value)}
              placeholder="e.g. Cdr. R. Perera"
            />
          </Field>
          <Field label="Remarks">
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Notes about QC, delivery, communication, etc."
              rows={3}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit Rating
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RatingSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            value >= 4.5
              ? "text-emerald-400"
              : value >= 3.5
                ? "text-blue-400"
                : value >= 2.5
                  ? "text-amber-400"
                  : "text-red-400"
          )}
        >
          {value.toFixed(1)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={1}
        max={5}
        step={0.1}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Generic Field wrapper
// ─────────────────────────────────────────────────────────
function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
