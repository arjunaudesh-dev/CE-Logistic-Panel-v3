"use client";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground mt-3">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <span className="text-2xl">⚠</span>
      </div>
      <h3 className="text-base font-semibold text-foreground">Something went wrong</h3>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
  );
}
