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
  blue: {
    iconBg: "bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    dot: "bg-blue-500/40",
  },
  green: {
    iconBg: "bg-gradient-to-br from-emerald-500/20 to-teal-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500/40",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500/40",
  },
  red: {
    iconBg: "bg-gradient-to-br from-red-500/20 to-rose-600/10 text-red-600 dark:text-red-400 border-red-500/30",
    dot: "bg-red-500/40",
  },
  purple: {
    iconBg: "bg-gradient-to-br from-violet-500/20 to-purple-600/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
    dot: "bg-violet-500/40",
  },
  pink: {
    iconBg: "bg-gradient-to-br from-pink-500/20 to-rose-600/10 text-pink-600 dark:text-pink-400 border-pink-500/30",
    dot: "bg-pink-500/40",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  sub,
}: StatCardProps) {
  const styleConfig = accentMap[accent] || accentMap.blue;

  return (
    <div className="relative overflow-hidden glass-card rounded-2xl p-4.5 flex items-start gap-3.5 hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
      {/* Subtle top-right ambient glow dot */}
      <span className={cn("absolute -top-6 -right-6 w-14 h-14 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none", styleConfig.dot)} />

      <div
        className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs group-hover:scale-110 transition-transform duration-300",
          styleConfig.iconBg
        )}
      >
        <Icon className="h-5 w-5 stroke-[2.2]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-muted-foreground truncate uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xl font-bold text-foreground mt-0.5 truncate tracking-tight tabular-nums">
          {value}
        </p>
        {sub && <p className="text-xs font-medium text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
