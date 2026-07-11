"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PositionBadge } from "@/components/erp/badges";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/constants";
import { History, User, MessageSquare } from "lucide-react";

export interface FileLog {
  id: string;
  oldPosition: string | null;
  newPosition: string;
  changedBy: string | null;
  comment: string | null;
  changedAt: string;
}

export interface ProjectFile {
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

interface Props {
  file: ProjectFile | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function FileLogDialog({ file, open, onOpenChange }: Props) {
  if (!file) return null;
  const logs = file.logs || [];

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
              <Detail label="Supplier" value={file.supplier || "—"} />
              <Detail label="Category" value={file.fileCategory} />
              <Detail label="Created By" value={file.createdBy || "—"} />
              <Detail label="Authorized By" value={file.authorizedBy || "—"} />
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-sm font-medium ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
