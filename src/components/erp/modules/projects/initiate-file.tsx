"use client";
import { useState, useMemo } from "react";
import { apiRequest, useFetch } from "@/lib/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/constants";
import { Loader2, FileSignature, CheckCircle2, UserCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EstimateItem {
  id: string;
  estimateId: string;
  srNo: number;
  itemName: string;
  itemCode: string | null;
  qty: number;
  unit: string;
  estimateCost: number;
  approxCost: number;
  isRC: boolean;
  rcNumber: string | null;
  rcRate: number;
  rcSupplier: string | null;
  lastPurchasePrice: number;
  availableStock: number;
  stockLocation: string | null;
  nonMovingStock: number;
  status: string;
  prNumber: string | null;
  fileNumber: string | null;
  fileId: string | null;
}

interface Stakeholder {
  id: string;
  name: string;
  rankOrRate?: string | null;
  svcNumber?: string | null;
  appointment?: string | null;
  department?: string | null;
  category?: string | null;
}

interface Props {
  item: EstimateItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInitiated: () => void;
}

export function InitiateFileDialog({ item, open, onOpenChange, onInitiated }: Props) {
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    prNumber: "",
    fileNumber: `FILE/${today}`,
    createdBy: "",
    authorizedBy: "",
  });
  const { toast } = useToast();

  // Fetch stakeholders once (only when dialog opens) and split into officers and sailors
  const { data: stakeholders } = useFetch<Stakeholder[]>("/api/stakeholders");
  const officers = useMemo(
    () =>
      (stakeholders || [])
        .filter((s) => (s.category || "").toLowerCase().includes("officer"))
        .sort((a, b) => {
          const sa = a.seniority ?? 99;
          const sb = b.seniority ?? 99;
          if (sa !== sb) return sa - sb;
          return (a.name || "").localeCompare(b.name || "");
        }),
    [stakeholders]
  );
  const sailors = useMemo(
    () =>
      (stakeholders || [])
        .filter((s) => (s.category || "").toLowerCase().includes("sailor"))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [stakeholders]
  );

  if (!item) return null;

  const selectedOfficer = officers.find((o) => o.id === form.authorizedBy);
  const selectedSailor = sailors.find((s) => s.id === form.createdBy);

  const submit = async () => {
    if (!form.prNumber) {
      toast({ title: "PR/GORF Number is required", variant: "destructive" });
      return;
    }
    if (!form.authorizedBy) {
      toast({ title: "Authorized By (Officer) is required", variant: "destructive" });
      return;
    }
    if (!form.createdBy) {
      toast({ title: "Created By (Sailor) is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await apiRequest(
      `/api/estimates/${item.estimateId}/items/${item.id}`,
      "POST",
      {
        prNumber: form.prNumber,
        fileNumber: form.fileNumber,
        createdBy: selectedSailor ? `${selectedSailor.name}${selectedSailor.appointment ? ` (${selectedSailor.appointment})` : ""}` : form.createdBy,
        authorizedBy: selectedOfficer ? `${selectedOfficer.name}${selectedOfficer.appointment ? ` (${selectedOfficer.appointment})` : ""}` : form.authorizedBy,
        responsiblePerson: selectedOfficer ? `${selectedOfficer.name}${selectedOfficer.appointment ? ` (${selectedOfficer.appointment})` : ""}` : null,
      }
    );
    setSaving(false);
    if (res.ok) {
      toast({ title: `File initiated — ${form.prNumber}`, description: "PR raised and forwarded to project window" });
      setForm({ prNumber: "", fileNumber: `FILE/${today}`, createdBy: "", authorizedBy: "" });
      onInitiated();
    } else {
      toast({ title: "Failed to initiate file", description: res.error, variant: "destructive" });
    }
  };

  const unitPrice = item.isRC ? item.rcRate : item.approxCost / (item.qty || 1);
  const fileCost = item.qty * unitPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Initiate File — {item.itemName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Raise a PR/GORF from this estimate item. The file will be forwarded to the project&apos;s PR Raised Files window.
          </DialogDescription>
        </DialogHeader>

        {/* Item + RC/Estimate details */}
        <div className="bg-secondary/40 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Detail label="Sr No" value={String(item.srNo)} />
            <Detail label="Item Code" value={item.itemCode || "TBC"} />
            <Detail label="Qty" value={`${item.qty} ${item.unit}`} />
            <Detail
              label="File Type"
              value={item.isRC ? "RC (Rate Contract)" : "Non-RC (Estimate)"}
              tone={item.isRC ? "text-emerald-400" : "text-amber-400"}
            />
          </div>

          {item.isRC ? (
            <div className="border-t border-border pt-3">
              <p className="text-[10px] uppercase text-muted-foreground mb-2">RC List Details</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Detail label="RC Rate" value={formatCurrency(item.rcRate)} tone="text-blue-400" />
                <Detail label="RC Number" value={item.rcNumber || "—"} />
                <Detail label="Supplier" value={item.rcSupplier || "—"} />
              </div>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Computed File Cost: </span>
                <span className="font-semibold text-foreground">{formatCurrency(fileCost)}</span>
                <span className="text-muted-foreground text-xs"> ({item.qty} × {formatCurrency(item.rcRate)})</span>
              </div>
            </div>
          ) : (
            <div className="border-t border-border pt-3">
              <p className="text-[10px] uppercase text-muted-foreground mb-2">Non-RC — Estimate Cost</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Detail label="Est. Unit Cost" value={formatCurrency(unitPrice)} tone="text-amber-400" />
                <Detail label="Last Purchase" value={item.lastPurchasePrice ? formatCurrency(item.lastPurchasePrice) : "—"} />
                <Detail label="Available Stock" value={`${item.availableStock} ${item.unit}`} tone={item.availableStock > 0 ? "text-emerald-400" : "text-muted-foreground"} />
              </div>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Computed File Cost: </span>
                <span className="font-semibold text-foreground">{formatCurrency(fileCost)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">PR / GORF Number *</Label>
              <Input
                value={form.prNumber}
                onChange={(e) => setForm({ ...form, prNumber: e.target.value })}
                placeholder="e.g. PR-2025-040"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File Number (with date)</Label>
              <Input
                value={form.fileNumber}
                onChange={(e) => setForm({ ...form, fileNumber: e.target.value })}
                className="bg-background border-border"
              />
            </div>
          </div>

          {/* Authorized By (Officer) — Select from stakeholders */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-primary" />
              Authorized By (Officer) *
            </Label>
            <Select
              value={form.authorizedBy}
              onValueChange={(v) => setForm({ ...form, authorizedBy: v })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select authorizing officer" />
              </SelectTrigger>
              <SelectContent>
                {officers.length === 0 ? (
                  <SelectItem value="_none" disabled>No officers found</SelectItem>
                ) : (
                  officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                      {o.rankOrRate ? ` — ${o.rankOrRate}` : ""}
                      {o.appointment ? ` (${o.appointment})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedOfficer && (
              <p className="text-[11px] text-muted-foreground">
                {selectedOfficer.name}
                {selectedOfficer.appointment ? ` (${selectedOfficer.appointment})` : ""}
                {selectedOfficer.department ? ` · ${selectedOfficer.department}` : ""}
              </p>
            )}
          </div>

          {/* Created By (Sailor) — Select from stakeholders */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <User className="h-3 w-3 text-primary" />
              Created By (Sailor) *
            </Label>
            <Select
              value={form.createdBy}
              onValueChange={(v) => setForm({ ...form, createdBy: v })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select creating sailor" />
              </SelectTrigger>
              <SelectContent>
                {sailors.length === 0 ? (
                  <SelectItem value="_none" disabled>No sailors found</SelectItem>
                ) : (
                  sailors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.rankOrRate ? ` — ${s.rankOrRate}` : ""}
                      {s.appointment ? ` (${s.appointment})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedSailor && (
              <p className="text-[11px] text-muted-foreground">
                {selectedSailor.name}
                {selectedSailor.appointment ? ` (${selectedSailor.appointment})` : ""}
                {selectedSailor.department ? ` · ${selectedSailor.department}` : ""}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Initiate PR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-medium", tone || "text-foreground")}>{value}</p>
    </div>
  );
}
