"use client";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "blue" | "green" | "amber" | "red" | "purple" | "pink";
  sub?: string;
}

const accentMap = {
  blue: "text-blue-400 bg-blue-500/10",
  green: "text-emerald-400 bg-emerald-500/10",
  amber: "text-amber-400 bg-amber-500/10",
  red: "text-red-400 bg-red-500/10",
  purple: "text-violet-400 bg-violet-500/10",
  pink: "text-pink-400 bg-pink-500/10",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  sub,
}: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-primary/40 transition-colors">
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          accentMap[accent]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xl font-semibold text-foreground mt-0.5 truncate">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
