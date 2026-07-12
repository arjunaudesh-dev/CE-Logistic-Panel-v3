"use client";
import { useState } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomBadge } from "@/components/erp/badges";
import { LoadingState, EmptyState } from "@/components/erp/states";
import { InitiateFileDialog, EstimateItem } from "./initiate-file";
import { formatCurrency, estimateStatusColor, confidenceColor } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Sparkles,
  FileSignature,
  CheckCircle2,
  PackageSearch,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  estimateId: string;
  /** whether to show the AI "Process" button (wizard step 2) or just the table (PR from Estimate tab) */
  showProcessButton?: boolean;
  onChanged?: () => void;
}

export function EstimateItemsTable({ estimateId, showProcessButton = false, onChanged }: Props) {
  const { data: estimate, loading, refresh } = useFetch<{
    id: string;
    status: string;
    items: EstimateItem[];
  }>(`/api/estimates/${estimateId}`);
  const [processing, setProcessing] = useState(false);
  const [initiateItem, setInitiateItem] = useState<EstimateItem | null>(null);
  const { toast } = useToast();

  const items = estimate?.items || [];
  const pendingItems = items.filter((i) => i.status === "Pending");
  const initiatedItems = items.filter((i) => i.status === "Initiated");

  const handleProcess = async () => {
    setProcessing(true);
    const res = await apiRequest(`/api/estimates/${estimateId}/process`, "POST");
    setProcessing(false);
    if (res.ok) {
      toast({ title: "Estimate processed with AI", description: `${items.length} items matched to RC list & inventory` });
      refresh();
      onChanged?.();
    } else {
      toast({ title: "AI processing failed", description: res.error, variant: "destructive" });
    }
  };

  if (loading) return <LoadingState label="Loading estimate..." />;

  return (
    <div className="space-y-3">
      {showProcessButton && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CustomBadge className={cn("border-0", estimateStatusColor(estimate?.status || "Draft"))}>
              {estimate?.status || "Draft"}
            </CustomBadge>
            <span className="text-xs text-muted-foreground">
              {items.length} items · {pendingItems.length} pending · {initiatedItems.length} initiated
            </span>
          </div>
          {estimate?.status !== "Processed" && (
            <Button onClick={handleProcess} disabled={processing} size="sm" className="gap-1.5">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Process with AI
            </Button>
          )}
        </div>
      )}

      {/* summary tiles */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SummaryTile
            label="Total Approx Cost"
            value={formatCurrency(items.reduce((s, i) => s + (i.approxCost || 0), 0))}
            tone="text-blue-400"
            icon={<PackageSearch className="h-4 w-4" />}
          />
          <SummaryTile
            label="RC Items"
            value={String(items.filter((i) => i.isRC).length)}
            tone="text-emerald-400"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <SummaryTile
            label="Stock Available"
            value={String(items.filter((i) => i.availableStock > 0).length)}
            tone="text-amber-400"
            icon={<AlertCircle className="h-4 w-4" />}
          />
          <SummaryTile
            label="Initiated PRs"
            value={String(initiatedItems.length)}
            tone="text-violet-400"
            icon={<FileSignature className="h-4 w-4" />}
          />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No estimate items"
          description="Add material estimate items in Step 1, then process with AI."
        />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <ScrollArea className="max-h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border bg-secondary/40">
                  <TableHead className="text-muted-foreground w-12">Sr</TableHead>
                  <TableHead className="text-muted-foreground">Item Name</TableHead>
                  <TableHead className="text-muted-foreground">Item Code</TableHead>
                  <TableHead className="text-muted-foreground text-right">Qty</TableHead>
                  <TableHead className="text-muted-foreground">Deno</TableHead>
                  <TableHead className="text-muted-foreground text-right">Approx Cost</TableHead>
                  <TableHead className="text-muted-foreground">RC No.</TableHead>
                  <TableHead className="text-muted-foreground text-right">Last Purchase</TableHead>
                  <TableHead className="text-muted-foreground">Available Stock</TableHead>
                  <TableHead className="text-muted-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => {
                  const unitPrice = it.isRC ? it.rcRate : it.approxCost / (it.qty || 1);
                  return (
                    <TableRow key={it.id} className="border-border">
                      <TableCell className="text-xs text-muted-foreground font-mono">{it.srNo}</TableCell>
                      <TableCell className="text-foreground font-medium">{it.itemName}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {it.itemCode ? (
                          <span className="text-blue-400">{it.itemCode}</span>
                        ) : (
                          <span className="text-muted-foreground italic">TBC</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{it.qty}</TableCell>
                      <TableCell className="text-xs">{it.unit}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {formatCurrency(it.approxCost)}
                        {it.isRC && (
                          <span className="block text-[10px] text-emerald-400">@{formatCurrency(it.rcRate)}</span>
                        )}
                        {!it.isRC && (
                          <span className="block text-[10px] text-amber-400">@{formatCurrency(unitPrice)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {it.isRC ? (
                          <CustomBadge className="border-0 bg-emerald-500/15 text-emerald-400">{it.rcNumber}</CustomBadge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {it.lastPurchasePrice > 0 ? formatCurrency(it.lastPurchasePrice) : "—"}
                      </TableCell>
                      <TableCell>
                        {it.availableStock > 0 ? (
                          <div className="text-xs">
                            <span className="text-emerald-400 font-medium">{it.availableStock} {it.unit}</span>
                            {it.stockLocation && (
                              <span className="block text-[10px] text-muted-foreground">@ {it.stockLocation}</span>
                            )}
                            {it.nonMovingStock > 0 && (
                              <span className="block text-[10px] text-amber-400">⚠ {it.nonMovingStock} non-moving</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {it.status === "Initiated" ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <CustomBadge className="border-0 bg-violet-500/15 text-violet-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> {it.prNumber}
                            </CustomBadge>
                            {it.fileNumber && (
                              <span className="text-[10px] text-muted-foreground">{it.fileNumber}</span>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setInitiateItem(it)}
                            className="gap-1.5 h-7"
                          >
                            <FileSignature className="h-3.5 w-3.5" /> Initiate File
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      <InitiateFileDialog
        item={initiateItem}
        open={!!initiateItem}
        onOpenChange={(o) => !o && setInitiateItem(null)}
        onInitiated={() => {
          setInitiateItem(null);
          refresh();
          onChanged?.();
        }}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3 flex items-center gap-2.5">
      <div className={cn("h-8 w-8 rounded-md flex items-center justify-center bg-background/50", tone)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-semibold truncate", tone)}>{value}</p>
      </div>
    </div>
  );
}
