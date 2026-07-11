"use client";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Warehouse,
  Search,
  PackageCheck,
  LucideIcon,
} from "lucide-react";

export type ModuleId =
  | "dashboard"
  | "projects"
  | "procurement"
  | "stores"
  | "rate-finder"
  | "collection";

export interface NavItem {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Operational overview & key metrics",
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderKanban,
    description: "Vote allocations & file registers",
  },
  {
    id: "procurement",
    label: "Procurement Files",
    icon: FileText,
    description: "All ongoing procurement across projects",
  },
  {
    id: "stores",
    label: "Store Management",
    icon: Warehouse,
    description: "Zones, inventory & stock levels",
  },
  {
    id: "rate-finder",
    label: "Rate Finder",
    icon: Search,
    description: "Rate contracts & discontinued items",
  },
  {
    id: "collection",
    label: "Collection",
    icon: PackageCheck,
    description: "Part supply & daily collection",
  },
];
