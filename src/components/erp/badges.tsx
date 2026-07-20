"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { positionColor } from "@/lib/constants";

export function PositionBadge({ position, progress }: { position: string; progress?: number }) {
  let indicator = null;
  if (progress !== undefined) {
    let colorClass = "bg-orange-500";
    if (progress >= 100) colorClass = "bg-emerald-500";
    else if (progress > 0) colorClass = "bg-amber-500";
    
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
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
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
    <span className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}
