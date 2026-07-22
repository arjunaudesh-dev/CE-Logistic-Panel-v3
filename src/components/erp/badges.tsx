"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { positionColor } from "@/lib/constants";

export function PositionBadge({ position, progress }: { position: string; progress?: number }) {
  let indicator: React.ReactNode = null;
  if (progress !== undefined) {
    let colorClass = "bg-orange-500 shadow-xs";
    if (progress >= 100) colorClass = "bg-emerald-500 shadow-xs";
    else if (progress > 0) colorClass = "bg-amber-500 shadow-xs";
    
    indicator = (
      <span className="relative flex h-2 w-2 mr-1.5 shrink-0">
        {progress < 100 && progress > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${colorClass}`}></span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs transition-transform duration-150 hover:scale-105",
        positionColor(position)
      )}
    >
      {indicator}
      {position}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-border/80 bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground shadow-2xs">
      {category}
    </span>
  );
}

export function CustomBadge({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  /**
   * Optional native tooltip text — rendered as the `title` attribute on
   * the underlying `<span>`. Useful for providing hover context on
   * compact badges (e.g. explaining what a code/number refers to).
   */
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs transition-transform duration-150 hover:scale-105",
        className
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBadge({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(100, Math.round(progress * 10) / 10));
  let colorClass = "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30"; // 0%
  if (p >= 100) {
    colorClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"; // 100%
  } else if (p > 0) {
    colorClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"; // >0% & <100%
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-mono whitespace-nowrap shrink-0 shadow-2xs",
        colorClass
      )}
      title={`Progress: ${p}%`}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          p >= 100 ? "bg-emerald-500 dark:bg-emerald-400" : p > 0 ? "bg-amber-500 dark:bg-amber-400" : "bg-orange-500 dark:bg-orange-400"
        )}
      />
      {p}%
    </span>
  );
}
