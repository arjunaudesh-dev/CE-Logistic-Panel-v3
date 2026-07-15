"use client";
import { cn } from "@/lib/utils";
import { positionColor } from "@/lib/constants";

export function PositionBadge({ position }: { position: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        positionColor(position)
      )}
    >
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
