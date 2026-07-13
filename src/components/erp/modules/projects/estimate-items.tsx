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
import { formatCurrency, estimateStatusColor } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Sparkles,
  FileSignature,
  CheckCircle2,
  PackageSearch,
  AlertCircle,
  ShieldCheck,
  FileText,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  estimateId: string;
  /** whether to show the AI "Process" button (wizard step 2) or just the table (PR from Estimate tab) */
  showProcessButton?: boolean;
  onChanged?: () => void;
}

interface EstimateWithProject {
  id: string;
  status: string;
  items: EstimateItem[];
  project?: {
    projectType?: string | null;
    financialMean?: string | null;
  } | null;
}

type SectionVariant = "rc" | "non-rate" | "contractual";
type ThemeKey = "emerald" | "amber" | "violet";

const SECTION_THEME: Record<SectionVariant, { key: ThemeKey; bar: string; title: string; summary: string; desc: string }> = {
  rc: {
    key: "emerald",
    bar: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    title: "text-emerald-300",
    summary: "text-emerald-400",
    desc: "bg-emerald-500/5 text-emerald-400/90",
  },
  "non-rate": {
    key: "amber",
    bar: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    title: "text-amber-300",
    summary: "text-amber-400",
    desc: "bg-amber-500/5 text-amber-400/90",
  },
  contractual: {
    key: "violet",
    bar: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    title: "text-violet-300",
    summary: "text-violet-400",
    desc: "bg-violet-500/5 text-violet-400/90",
  },
};

export function EstimateItemsTable({ estimateId, showProcessButton = false, onChanged }: Props) {
  const { data: estimate, loading, refresh } = useFetch<EstimateWithProject>(
    `/api/estimates/${estimateId}`
  );
  const [processing, setProcessing] = useState(false);
  const [initiateItem, setInitiateItem] = useState<EstimateItem | null>(null);
  const { toast } = useToast();

  const items = estimate?.items || [];
  const pendingItems = items.filter((i) => i.status === "Pending");
  const initiatedItems = items.filter((i) => i.status === "Initiated");

  // Determine if the project context is contractual — infer from project type OR financial mean.
  const projectType = estimate?.project?.projectType;
  const financialMean = estimate?.project?.financialMean;
  const isProjectContractual =
    projectType === "Contractual Job" || financialMean === "Contractual";

  // Split items into 3 groups according to type
  const rcItems = items.filter((i) => i.isRC);
  const contractualItems = items.filter((i) => !i.isRC && isProjectContractual);
  const nonRateItems = items.filter((i) => !i.isRC && !isProjectContractual);

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

      {/* summary tiles — kept identical to original */}
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
            value={String(rcItems.length)}
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
        <div className="space-y-4">
          {rcItems.length > 0 && (
            <ItemsSection
              title="RC (Rate Contract) Items"
              icon={<ShieldCheck className="h-4 w-4" />}
              variant="rc"
              description="Items matched to an active Rate Contract — procurement can proceed at the locked RC rate."
              items={rcItems}
              onInitiate={(it) => setInitiateItem(it)}
            />
          )}
          {nonRateItems.length > 0 && (
            <ItemsSection
              title="Non-Rate Items (Tender/Quotation Required)"
              icon={<FileText className="h-4 w-4" />}
              variant="non-rate"
              description="These items are not on an active Rate Contract — they require a tender or quotation process."
              items={nonRateItems}
              onInitiate={(it) => setInitiateItem(it)}
            />
          )}
          {contractualItems.length > 0 && (
            <ItemsSection
              title="Contractual Items (ARO Flow)"
              icon={<ScrollText className="h-4 w-4" />}
              variant="contractual"
              description="These items follow the ARO (Annual Requirement Order) contractual process flow."
              items={contractualItems}
              onInitiate={(it) => setInitiateItem(it)}
            />
          )}
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

function ItemsSection({
  title,
  icon,
  variant,
  description,
  items,
  onInitiate,
}: {
  title: string;
  icon: React.ReactNode;
  variant: SectionVariant;
  description: string;
  items: EstimateItem[];
  onInitiate: (item: EstimateItem) => void;
}) {
  const theme = SECTION_THEME[variant];
  const totalCost = items.reduce((s, i) => s + (i.approxCost || 0), 0);
  const showRcCols = variant === "rc";
  const DescIcon = variant === "rc" ? CheckCircle2 : AlertCircle;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Colored header bar — icon + title + count + total cost */}
      <div className={cn("flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border flex-wrap", theme.bar)}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">{icon}</span>
          <h4 className={cn("text-sm font-semibold", theme.title)}>{title}</h4>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-background/40 font-mono">
            {items.length}
          </span>
        </div>
        <div className="text-xs">
          <span className="opacity-80">Total Approx Cost: </span>
          <span className={cn("font-semibold", theme.summary)}>{formatCurrency(totalCost)}</span>
        </div>
      </div>

      {/* Variant description strip */}
      <div className={cn("px-4 py-1.5 border-b border-border flex items-center gap-1.5 text-[11px]", theme.desc)}>
        <DescIcon className="h-3 w-3 shrink-0" />
        {description}
      </div>

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
              {showRcCols && <TableHead className="text-muted-foreground">RC No.</TableHead>}
              {showRcCols && <TableHead className="text-muted-foreground">RC Supplier</TableHead>}
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
                  {showRcCols && (
                    <TableCell>
                      {it.isRC ? (
                        <CustomBadge className="border-0 bg-emerald-500/15 text-emerald-400">{it.rcNumber}</CustomBadge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  )}
                  {showRcCols && (
                    <TableCell className="text-xs text-muted-foreground">
                      {it.rcSupplier || "—"}
                    </TableCell>
                  )}
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
                        onClick={() => onInitiate(it)}
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
