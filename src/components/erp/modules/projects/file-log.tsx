"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PositionBadge, CustomBadge } from "@/components/erp/badges";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/use-fetch";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/constants";
import {
  History,
  User,
  MessageSquare,
  Plus,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileLog {
  id: string;
  oldPosition: string | null;
  newPosition: string;
  changedBy: string | null;
  comment: string | null;
  changedAt: string;
}

export interface FileApprovalEntry {
  id: string;
  category: string;
  roleStatus: string;
  personnel: string;
  dateTime: string;
  createdAt: string;
}

export interface ProjectFile {
  id: string;
  projectId?: string;
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
  fileNumber?: string | null;
  fileGroupKey?: string | null;
  createdBy: string | null;
  authorizedBy: string | null;
  responsiblePerson?: string | null;
  isArchived?: boolean;
  archivedReason?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  logs?: FileLog[];
  approvals?: FileApprovalEntry[];
}

interface Props {
  file: ProjectFile | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApprovalsChanged?: () => void;
}

// Controlled vocabularies for the approval-history entries. These match the
// sample data shown in the spec and cover the most common approval categories
// in the dockyard ERP workflow.
const APPROVAL_CATEGORIES = [
  "General Order Request",
  "General Order Dispatch",
  "Procurement Request Assign",
  "Procurement Request Approve",
  "Tender Call",
  "Tender Opening",
  "Quotation Received",
  "BEC Evaluation",
  "PO Placed",
  "Material Inspection",
  "Payment Approval",
] as const;

const APPROVAL_ROLE_STATUSES = [
  "Approved By",
  "Authorized By",
  "Assigned By",
  "Recommended By",
  "Inspected By",
  "Verified By",
] as const;

export function FileLogDialog({ file, open, onOpenChange, onApprovalsChanged }: Props) {
  if (!file) return null;
  const logs = file.logs || [];
  const approvals = file.approvals || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            File Log — {file.prNumber}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 pr-2">
            {/* File details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-secondary/40 rounded-lg">
              <Detail label="Item Code" value={file.itemCode} />
              <Detail label="Item Name" value={file.itemName} />
              <Detail label="Unit" value={file.unit} />
              <Detail label="Qty" value={String(file.qty)} />
              <Detail label="Unit Price" value={formatCurrency(file.unitPrice)} />
              <Detail label="File Cost" value={formatCurrency(file.fileCost)} highlight />
              <Detail label="File Number" value={file.fileNumber || "—"} />
              <Detail label="File Group Key" value={file.fileGroupKey || "—"} mono />
              <Detail label="Supplier" value={file.supplier || "—"} />
              <Detail label="Category" value={file.fileCategory} />
              <Detail label="Created By" value={file.createdBy || "—"} />
              <Detail label="Authorized By" value={file.authorizedBy || "—"} />
              <Detail label="Responsible Person" value={file.responsiblePerson || "—"} />
              <Detail label="Created At" value={new Date(file.createdAt).toLocaleDateString("en-GB")} />
              <Detail label="Current Position" value={file.presentPosition} />
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Activity Timeline
              </h4>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="relative pl-6">
                  {/* vertical line */}
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-4.5 top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                        <div className="bg-secondary/40 rounded-lg p-3">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {log.oldPosition && <PositionBadge position={log.oldPosition} />}
                            <span className="text-muted-foreground text-xs">→</span>
                            <PositionBadge position={log.newPosition} />
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(log.changedAt).toLocaleString("en-GB")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {log.changedBy || "Unknown"}
                          </div>
                          {log.comment && (
                            <div className="flex items-start gap-1.5 text-xs text-foreground/80 mt-1.5">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{log.comment}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Approval History (extended view only) */}
            <ApprovalHistorySection
              file={file}
              approvals={approvals}
              onApprovalsChanged={onApprovalsChanged}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Approval History Section (extended view only) ───
function ApprovalHistorySection({
  file,
  approvals,
  onApprovalsChanged,
}: {
  file: ProjectFile;
  approvals: FileApprovalEntry[];
  onApprovalsChanged?: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Approval History
          {approvals.length > 0 && (
            <CustomBadge className="border-0 bg-primary/15 text-primary">
              {approvals.length} entr{approvals.length === 1 ? "y" : "ies"}
            </CustomBadge>
          )}
        </h4>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          onClick={() => setAddOpen(true)}
          disabled={!file.projectId}
          title={file.projectId ? "Add an approval entry to this file" : "Save the file first to add approval entries"}
        >
          <Plus className="h-3.5 w-3.5" /> Add Approval Entry
        </Button>
      </div>

      {approvals.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center">
          <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            No approval history recorded yet. Click <span className="font-medium text-foreground">Add Approval Entry</span> to log the first approval.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground w-10">#</TableHead>
                <TableHead className="text-muted-foreground">Category</TableHead>
                <TableHead className="text-muted-foreground">Role / Status</TableHead>
                <TableHead className="text-muted-foreground">Personnel</TableHead>
                <TableHead className="text-muted-foreground">Date &amp; Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((a, i) => (
                <TableRow key={a.id} className="border-border">
                  <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                  <TableCell>
                    <CustomBadge className="border-0 bg-blue-500/15 text-blue-400">
                      {a.category}
                    </CustomBadge>
                  </TableCell>
                  <TableCell>
                    <CustomBadge className={cn("border-0", approvalRoleColor(a.roleStatus))}>
                      {a.roleStatus}
                    </CustomBadge>
                  </TableCell>
                  <TableCell className="text-foreground text-sm">{a.personnel || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{a.dateTime || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {file.projectId && (
        <AddApprovalDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          fileId={file.id}
          projectId={file.projectId}
          onSaved={() => {
            setAddOpen(false);
            onApprovalsChanged?.();
          }}
        />
      )}
    </div>
  );
}

// Color helper for the approval role/status badge — distinct colors per role
function approvalRoleColor(role: string): string {
  switch (role) {
    case "Approved By":
      return "bg-emerald-500/15 text-emerald-400";
    case "Authorized By":
      return "bg-blue-500/15 text-blue-400";
    case "Assigned By":
      return "bg-violet-500/15 text-violet-400";
    case "Recommended By":
      return "bg-amber-500/15 text-amber-400";
    case "Inspected By":
      return "bg-cyan-500/15 text-cyan-400";
    case "Verified By":
      return "bg-pink-500/15 text-pink-400";
    default:
      return "bg-slate-500/15 text-slate-300";
  }
}

// ─── Add Approval Entry Dialog ───
function AddApprovalDialog({
  open,
  onOpenChange,
  fileId,
  projectId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fileId: string;
  projectId: string;
  onSaved: () => void;
}) {
  // Default datetime-local value = now (in local time, formatted YYYY-MM-DDTHH:mm)
  const nowLocal = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [category, setCategory] = useState<string>(APPROVAL_CATEGORIES[0] as string);
  const [roleStatus, setRoleStatus] = useState<string>(APPROVAL_ROLE_STATUSES[0] as string);
  const [personnel, setPersonnel] = useState("");
  const [dateTime, setDateTime] = useState<string>(nowLocal());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!personnel.trim()) {
      toast({ title: "Personnel is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    // Convert datetime-local (YYYY-MM-DDTHH:mm) → "DD/MM/YYYY HH:mm:ss" format
    // matching the spec's sample data. Falls back to the raw input on parse error.
    let formatted = dateTime;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(dateTime);
    if (m) {
      const [, y, mo, d, h, mi, s] = m;
      formatted = `${d}/${mo}/${y} ${h}:${mi}:${s || "00"}`;
    }
    const res = await apiRequest(
      `/api/projects/${projectId}/files/${fileId}/approvals`,
      "POST",
      {
        category,
        roleStatus,
        personnel: personnel.trim(),
        dateTime: formatted,
      }
    );
    setSaving(false);
    if (res.ok) {
      toast({ title: "Approval entry added" });
      setPersonnel("");
      setDateTime(nowLocal());
      onSaved();
    } else {
      toast({ title: "Failed to add approval entry", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Approval Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROVAL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c as string}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Role / Status</Label>
            <Select value={roleStatus} onValueChange={setRoleStatus}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROVAL_ROLE_STATUSES.map((r) => (
                  <SelectItem key={r} value={r as string}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Personnel *</Label>
            <Input
              value={personnel}
              onChange={(e) => setPersonnel(e.target.value)}
              placeholder="e.g. LT JATK JAYAKODY (NRC3542)"
              className="bg-background border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              Include rank, name, and service/ID number in parentheses for full traceability.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Date &amp; Time</Label>
            <Input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="bg-background border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              Stored as <span className="font-mono text-foreground">DD/MM/YYYY HH:mm:ss</span>.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-medium",
          highlight ? "text-primary" : "text-foreground",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </p>
    </div>
  );
}
