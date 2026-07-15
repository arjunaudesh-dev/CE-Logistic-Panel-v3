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
  "Provost Sailor",
  "ADF & Staff",
  "Other Sailors",
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
    case "Provost Sailor":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "ADF & Staff":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "Other Sailors":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
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

// ─── Number Prefix Document Types ───
export const NUMBER_PREFIX_TYPES = [
  { docType: "PR", label: "PR Number", placeholder: "e.g. PR/2025/" },
  { docType: "NAV255", label: "NAV 255 Number", placeholder: "e.g. NAV/255/2025/" },
  { docType: "NAV254", label: "NAV 254 Number", placeholder: "e.g. NAV/254/2025/" },
  { docType: "PO", label: "Purchasing Order Number", placeholder: "e.g. PO/2025/" },
  { docType: "FILE", label: "File Number", placeholder: "e.g. FILE/2025/" },
] as const;

// ─── Number Prefix Process Types ───
export const PREFIX_PROCESS_TYPES = ["RC", "Non-Rate", "Contractual", "NHQ"] as const;

// ─── Vote Departments ───
export const VOTE_DEPARTMENTS = ["SLN", "MOD"] as const;

// ─── File Collection Status Workflow (PO → Collection → QCI → Area Store → Zone) ───
export const FILE_COLLECTION_STATUSES = [
  "Pending",
  "In Collection",
  "Collected",
  "In QCI",
  "QCI Passed",
  "QCI Failed",
  "Transferred to Area Store",
  "Transferred to Zone",
] as const;

export function fileCollectionStatusColor(status: string): string {
  switch (status) {
    case "Pending":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "In Collection":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Collected":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "In QCI":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "QCI Passed":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "QCI Failed":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "Transferred to Area Store":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "Transferred to Zone":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

// ─── Financial Delegation Authorities ───
export const FINANCIAL_AUTHORITIES = [
  "Cdr",
  "Capt",
  "FC",
  "AOE",
  "CNC",
] as const;

// ─── New Process Step Stages ───
export const PROCESS_STEP_STAGES = [
  "PR Raised",
  "GS Approval",
  "RC Verification",
  "Spec making",
  "Finalizing Specification",
  "Pre Tender",
  "NHQ",
  "DPC",
  "Tender Called",
  "Tender Opening",
  "Quotation Received",
  "BEC Evaluation",
  "Financial Authority",
  "AOE Approval",
  "Contract Award",
  "PO Placed",
  "Split Order",
  "Order Placed",
  "Part Supply",
  "Items Dispatched",
  "In Transit",
  "Items Received",
  "To be Collect",
  "Collection and QCI",
  "QCI",
  "QC Pending",
  "QC Passed",
  "To be Oncharge",
  "Awaiting Payment",
  "Payment Done",
  "Post Tender",
  "Complete",
] as const;

// Map of predefined stages → auto-set details
export const STAGE_AUTO_DETAILS: Record<string, {
  isTenderStage: boolean;
  isEvaluationStage: boolean;
  prefixedNumber?: string;
  description: string;
}> = {
  "PR Raised": { isTenderStage: false, isEvaluationStage: false, prefixedNumber: "PR", description: "Purchase Request raised" },
  "GS Approval": { isTenderStage: false, isEvaluationStage: false, description: "General Stores approval" },
  "RC Verification": { isTenderStage: false, isEvaluationStage: false, description: "Rate Contract verification" },
  "Spec making": { isTenderStage: false, isEvaluationStage: false, description: "Making technical specifications" },
  "Finalizing Specification": { isTenderStage: false, isEvaluationStage: false, description: "Finalizing technical specifications" },
  "Pre Tender": { isTenderStage: true, isEvaluationStage: false, description: "Pre-tender preparation stage" },
  "NHQ": { isTenderStage: false, isEvaluationStage: false, prefixedNumber: "NHQ", description: "Naval Headquarters approval" },
  "DPC": { isTenderStage: false, isEvaluationStage: true, prefixedNumber: "DPC", description: "Departmental Procurement Committee" },
  "Tender Called": { isTenderStage: true, isEvaluationStage: false, prefixedNumber: "TDR", description: "Tender called/published" },
  "Tender Opening": { isTenderStage: true, isEvaluationStage: false, description: "Tender opening" },
  "Quotation Received": { isTenderStage: true, isEvaluationStage: false, description: "Quotations received" },
  "BEC Evaluation": { isTenderStage: false, isEvaluationStage: true, description: "Bid Evaluation Committee evaluation" },
  "Financial Authority": { isTenderStage: false, isEvaluationStage: true, description: "Financial authority approval — delegation varies by value" },
  "AOE Approval": { isTenderStage: false, isEvaluationStage: true, description: "Authority of Expenditure approval" },
  "Contract Award": { isTenderStage: false, isEvaluationStage: false, prefixedNumber: "CA", description: "Contract awarded" },
  "PO Placed": { isTenderStage: false, isEvaluationStage: false, prefixedNumber: "PO", description: "Purchase Order placed" },
  "Split Order": { isTenderStage: false, isEvaluationStage: false, prefixedNumber: "SPO", description: "Order split into multiple POs — collect separately, same file number" },
  "Order Placed": { isTenderStage: false, isEvaluationStage: false, description: "Order placed with supplier" },
  "Part Supply": { isTenderStage: false, isEvaluationStage: false, description: "Partial supply in progress" },
  "Items Dispatched": { isTenderStage: false, isEvaluationStage: false, description: "Items dispatched by supplier" },
  "In Transit": { isTenderStage: false, isEvaluationStage: false, description: "Items in transit" },
  "Items Received": { isTenderStage: false, isEvaluationStage: false, prefixedNumber: "NAV254", description: "Items received at stores" },
  "To be Collect": { isTenderStage: false, isEvaluationStage: false, description: "Items to be collected" },
  "Collection and QCI": { isTenderStage: false, isEvaluationStage: false, description: "Collection and Quality Control Inspection" },
  "QCI": { isTenderStage: false, isEvaluationStage: false, prefixedNumber: "NAV255", description: "Quality Control Inspection" },
  "QC Pending": { isTenderStage: false, isEvaluationStage: false, description: "QC pending" },
  "QC Passed": { isTenderStage: false, isEvaluationStage: false, description: "QC passed" },
  "To be Oncharge": { isTenderStage: false, isEvaluationStage: false, description: "To be oncharged to stores" },
  "Awaiting Payment": { isTenderStage: false, isEvaluationStage: false, description: "Awaiting payment" },
  "Payment Done": { isTenderStage: false, isEvaluationStage: false, description: "Payment completed" },
  "Post Tender": { isTenderStage: false, isEvaluationStage: false, description: "Post-tender activities" },
  "Complete": { isTenderStage: false, isEvaluationStage: false, description: "Process complete" },
};

// ─── Settings Departments ───
export const SETTINGS_DEPARTMENTS = ["CCED", "CSLOG", "Others"] as const;

// ─── Dimension Units ───
export const DIMENSION_UNITS = ["meter", "inch"] as const;

// ─── Theme Profiles (preset color combinations) ───
export interface ThemeProfilePreset {
  name: string;
  mode: "dark" | "light";
  primary: string;
  accent: string;
  // secondary chart colors derived from primary/accent
}

export const THEME_PROFILE_PRESETS: ThemeProfilePreset[] = [
  // Dark profiles
  { name: "Ocean Blue (Dark)", mode: "dark", primary: "#3b82f6", accent: "#8b5cf6" },
  { name: "Emerald (Dark)", mode: "dark", primary: "#10b981", accent: "#06b6d4" },
  { name: "Sunset (Dark)", mode: "dark", primary: "#f59e0b", accent: "#ef4444" },
  { name: "Royal Purple (Dark)", mode: "dark", primary: "#8b5cf6", accent: "#ec4899" },
  { name: "Crimson (Dark)", mode: "dark", primary: "#dc2626", accent: "#f59e0b" },
  { name: "Teal (Dark)", mode: "dark", primary: "#14b8a6", accent: "#3b82f6" },
  // Light profiles
  { name: "Ocean Blue (Light)", mode: "light", primary: "#2563eb", accent: "#7c3aed" },
  { name: "Emerald (Light)", mode: "light", primary: "#059669", accent: "#0891b2" },
  { name: "Sunset (Light)", mode: "light", primary: "#d97706", accent: "#dc2626" },
  { name: "Royal Purple (Light)", mode: "light", primary: "#7c3aed", accent: "#db2777" },
  { name: "Crimson (Light)", mode: "light", primary: "#b91c1c", accent: "#c2410c" },
  { name: "Teal (Light)", mode: "light", primary: "#0d9488", accent: "#2563eb" },
];

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
export const VOTE_TYPES = ["Capital", "Recurrence"] as const;

export function voteTypeColor(type: string): string {
  switch (type) {
    case "Capital":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Recurrence":
    case "Recurring": // backward compat
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
