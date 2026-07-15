"use client";
import { useState } from "react";
import { apiRequest } from "@/lib/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUSES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}

export function AddProjectDialog({ open, onOpenChange, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    voteNumber: "",
    voteAllocation: "",
    committed: "0",
    actualSpent: "0",
    startDate: "",
    endDate: "",
    department: "",
    projectOfficer: "",
    status: "Active",
    description: "",
  });
  const { toast } = useToast();

  const submit = async () => {
    if (!form.name || !form.voteNumber) {
      toast({ title: "Name and Vote Number are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await apiRequest("/api/projects", "POST", form);
    setSaving(false);
    if (res.ok) {
      setForm({
        name: "",
        voteNumber: "",
        voteAllocation: "",
        committed: "0",
        actualSpent: "0",
        startDate: "",
        endDate: "",
        department: "",
        projectOfficer: "",
        status: "Active",
        description: "",
      });
      onCreated();
    } else {
      toast({ title: "Failed to create project", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Project</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Project Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Dockyard Refit 2025"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vote Number *</Label>
            <Input
              value={form.voteNumber}
              onChange={(e) => setForm({ ...form, voteNumber: e.target.value })}
              placeholder="e.g. V-2025-001"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vote Allocation (Rs.)</Label>
            <Input
              type="number"
              value={form.voteAllocation}
              onChange={(e) => setForm({ ...form, voteAllocation: e.target.value })}
              placeholder="0"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Committed (Rs.)</Label>
            <Input
              type="number"
              value={form.committed}
              onChange={(e) => setForm({ ...form, committed: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Actual Spent (Rs.)</Label>
            <Input
              type="number"
              value={form.actualSpent}
              onChange={(e) => setForm({ ...form, actualSpent: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="e.g. Engineering"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Project Officer</Label>
            <Input
              value={form.projectOfficer}
              onChange={(e) => setForm({ ...form, projectOfficer: e.target.value })}
              placeholder="e.g. Cdr. R. Perera"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Brief description of the project..."
              className="bg-background border-border"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
