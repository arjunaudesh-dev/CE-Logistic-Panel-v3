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

// ─── Stakeholders ───
export const CSLOG_APPOINTMENTS = [
  "CSLOG",
  "CLOGD",
  "ASO(E)",
  "APO(E)",
  "AAPO(PT)",
  "LOGO",
  "SO(Log)",
] as const;

export const CE_APPOINTMENTS = [
  "CCED(E)",
  "CCEO(E)",
  "SCE(M)",
  "SCE(P&P)",
  "AOE",
  "SO(CE)",
] as const;

export const STAKEHOLDER_DEPARTMENTS = ["CSLOG", "CE"] as const;

export const STAKEHOLDER_ROLES = ["Officer", "Sailor"] as const;

export const AVAILABILITY_STATUSES = [
  "Available",
  "On Leave",
  "Busy",
  "Off Duty",
] as const;

export function availabilityColor(status: string): string {
  switch (status) {
    case "Available":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "On Leave":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Busy":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "Off Duty":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

export function departmentColor(dept: string): string {
  switch (dept) {
    case "CSLOG":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "CE":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// ─── Supplier ratings ───
export function ratingColor(score: number): string {
  if (score >= 4.5) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 3.5) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (score >= 2.5) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

export function ratingLabel(score: number): string {
  if (score >= 4.5) return "Excellent";
  if (score >= 3.5) return "Good";
  if (score >= 2.5) return "Satisfactory";
  if (score >= 1.5) return "Below Average";
  return "Fail";
}

// ─── Item Master ───
export function itemMasterStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "Merged":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Discontinued":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

export function duplicateTypeColor(type: string): string {
  switch (type) {
    case "multi_code_one_item":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "same_code_diff_name":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "near_duplicate":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// ─── Project Types & Financial Means ───
// NOTE: FINANCIAL_MEANS + financialMeanColor are declared further below (updated section).
export const PROJECT_TYPES = [
  "New Construction",
  "Continue",
  "Renovation",
  "Maintenance",
  "General Requirement",
  "Contractual Job",
] as const;

export function projectTypeColor(type: string): string {
  switch (type) {
    case "New Construction":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Continue":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "Renovation":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Maintenance":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "General Requirement":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "Contractual Job":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// ─── Area Stores (CSLOG) ───
export const AREA_STORES = [
  "BMS",
  "Metal",
  "General",
  "Paint",
  "Oil & Lubricant",
  "Stationary",
] as const;

export const AREA_STORE_CATEGORIES: Record<string, string[]> = {
  BMS: ["Plumbing", "BMS"],
  Metal: ["Metal", "Aluminium"],
  General: ["General", "Tools"],
  Paint: ["Paint"],
  "Oil & Lubricant": ["Lubricant Oil"],
  Stationary: ["Stationary"],
};

export const NAV_REFERENCES = ["NAV 251", "NAV 255"] as const;

export function navRefColor(ref: string): string {
  switch (ref) {
    case "NAV 251":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "NAV 255":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// ─── Stakeholder Categories ───
export const STAKEHOLDER_CATEGORIES = [
  "CCED Officer",
  "CCED Sailor",
  "CSLOG Officer",
  "CSLOG Sailor",
  "Officer-in-Area",
] as const;

export function stakeholderCategoryColor(cat: string): string {
  switch (cat) {
    case "CCED Officer":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "CCED Sailor":
      return "bg-violet-500/10 text-violet-300 border-violet-500/20";
    case "CSLOG Officer":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "CSLOG Sailor":
      return "bg-blue-500/10 text-blue-300 border-blue-500/20";
    case "Officer-in-Area":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// ─── Process Flows ───
export const PROCESS_FLOW_TYPES = ["RC", "Non-Rate", "ARO (Contractual)"] as const;

export function processFlowColor(flow: string): string {
  switch (flow) {
    case "RC":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "Non-Rate":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "ARO (Contractual)":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// ─── User Roles ───
export const USER_ROLES = ["Admin", "Manager", "Officer", "Clerk", "Viewer"] as const;

export function userRoleColor(role: string): string {
  switch (role) {
    case "Admin":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "Manager":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Officer":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Clerk":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "Viewer":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// ─── Roles & Access Permissions Matrix ───
export interface RolePermission {
  module: string;
  admin: string;
  manager: string;
  officer: string;
  clerk: string;
  viewer: string;
}

export const ROLE_PERMISSIONS: RolePermission[] = [
  { module: "Dashboard", admin: "Full", manager: "Full", officer: "View", clerk: "View", viewer: "View" },
  { module: "Projects", admin: "Full", manager: "Full", officer: "Edit", clerk: "Create/Edit Files", viewer: "View" },
  { module: "Procurement Files", admin: "Full", manager: "Full", officer: "Edit", clerk: "Create/Edit", viewer: "View" },
  { module: "Store Management", admin: "Full", manager: "Edit", officer: "View", clerk: "Create/Edit Items", viewer: "View" },
  { module: "Rate Finder", admin: "Full", manager: "Edit", officer: "View", clerk: "View", viewer: "View" },
  { module: "Collection", admin: "Full", manager: "Full", officer: "Edit", clerk: "Create/Edit", viewer: "View" },
  { module: "Stakeholders", admin: "Full", manager: "Edit", officer: "View", clerk: "View", viewer: "View" },
  { module: "Settings", admin: "Full", manager: "View", officer: "—", clerk: "—", viewer: "—" },
];

export function permissionColor(perm: string): string {
  if (perm === "Full") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (perm.includes("Edit") || perm.includes("Create")) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (perm === "View") return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return "bg-muted text-muted-foreground border-border";
}

// ─── Votes ───
export const VOTE_TYPES = ["Capital", "Recurring"] as const;

export function voteTypeColor(type: string): string {
  switch (type) {
    case "Capital":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Recurring":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// ─── Financial Means (updated) ───
export const FINANCIAL_MEANS = [
  "Vote/Funds",
  "Malima Fund",
  "Non-Public Fund",
  "Contractual",
] as const;

export function financialMeanColor(mean: string): string {
  switch (mean) {
    case "Vote/Funds":
    case "Vote":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Malima Fund":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Non-Public Fund":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "Contractual":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
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
