// CE Logistic Panel — shared constants

export const PRESENT_POSITIONS = [
  "PR Raised",
  "GS Approval",
  "Budget Check",
  "Tender Called",
  " quotation Received",
  "BEC Evaluation",
  "AOE Approval",
  "PO Placed",
  "Order Placed",
  "Part Supply",
  "Items Dispatched",
  "In Transit",
  "Items Received",
  "QC Pending",
  "QC Passed",
  "QC Rejected",
  "Awaiting Payment",
  "Payment Done",
  "Closed",
] as const;

export const FILE_CATEGORIES = [
  "General",
  "BMS",
  "Plumbing",
  "Metal",
  "Aluminium",
  "Paint",
  "Electrical",
  "Tools",
  "Lubricant Oil",
  "GEN",
] as const;

export const PROJECT_STATUSES = [
  "Active",
  "On Hold",
  "Completed",
  "Cancelled",
] as const;

export const ALLOCATION_TYPES = ["Commitment", "Actual", "Release"] as const;

export const STORE_CATEGORIES = [
  "All",
  "BMS",
  "Plumbing",
  "Metal",
  "General",
  "Aluminium",
  "Paint",
  "Electrical",
  "Tools",
  "Lubricant Oil",
  "GEN",
] as const;

export const ZONES = [
  "Zone A",
  "Zone B",
  "Zone C",
  "Zone D",
  "Zone E",
  "Zone F",
  "Zone G",
  "Zone H",
  "Ready-Use Stores",
  "Balance Stores",
  "Project Stores",
] as const;

export const RATE_CATEGORIES = [
  "All",
  "BMS",
  "Plumbing",
  "Metal",
  "General",
  "Aluminium",
  "Paint",
  "Electrical",
  "Tools",
  "Lubricant Oil",
] as const;

export const COLLECTION_STATUSES = [
  "Pending",
  "In Progress",
  "Collected",
] as const;

export const PART_SUPPLY_STATUSES = ["Active", "Completed"] as const;

export const REFERENCE_TYPES = [
  "AOR",
  "Work Order",
  "Estimate",
  "Job Order",
  "Repair Order",
  "Internal",
] as const;

export const QC_LEVELS = [
  "Fail",
  "Below Average",
  "Satisfactory",
  "Good",
  "Excellent",
] as const;

export function qcLevelColor(level: string): string {
  switch (level) {
    case "Fail":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "Below Average":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "Satisfactory":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Good":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Excellent":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

export function estimateStatusColor(status: string): string {
  switch (status) {
    case "Draft":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "Processed":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Archived":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

export function confidenceColor(conf: string): string {
  switch (conf) {
    case "high":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "medium":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "low":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "none":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// Maps present positions to color classes for badges
export function positionColor(position: string): string {
  const p = position.toLowerCase();
  if (["closed", "payment done", "qc passed", "items received"].some((s) => p.includes(s)))
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (["rejected", "rejected"].some((s) => p.includes(s)))
    return "bg-red-500/15 text-red-400 border-red-500/30";
  if (["pending", "awaiting", "hold"].some((s) => p.includes(s)))
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (["placed", "dispatched", "transit", "part supply"].some((s) => p.includes(s)))
    return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return "bg-slate-500/15 text-slate-300 border-slate-500/30";
}

export function projectStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "On Hold":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Completed":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Cancelled":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// Returns a tailwind class set for a utilization percentage
export function utilizationColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

export function formatCurrency(n: number): string {
  if (n == null || isNaN(n)) n = 0;
  return "Rs. " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatNumber(n: number): string {
  if (n == null || isNaN(n)) n = 0;
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
