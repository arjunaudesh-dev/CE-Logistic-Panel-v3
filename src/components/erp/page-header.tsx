"use client";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 pb-2 border-b border-border/40">
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-primary/20 via-primary/10 to-accent/20 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <Icon className="h-5.5 w-5.5 stroke-[2.2]" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
