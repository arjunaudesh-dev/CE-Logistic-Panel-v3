"use client";
import { useState, useEffect } from "react";
import { NAV_ITEMS, ModuleId } from "./nav";
import { cn } from "@/lib/utils";
import { Anchor, Menu, Bell, ChevronDown, Sun, Moon, Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency, THEME_PROFILE_PRESETS } from "@/lib/constants";
import { useThemeProfile } from "@/lib/use-theme-profile";

interface Stats {
  net: number;
  task: number;
  avail: number;
  team: number;
}

interface AppShellProps {
  active: ModuleId;
  onNavigate: (id: ModuleId) => void;
  stats: Stats | null;
  children: React.ReactNode;
}

interface SidebarContentProps {
  active: ModuleId;
  onNavigate: (id: ModuleId) => void;
  onItemClick?: () => void;
}

function SidebarContent({ active, onNavigate, onItemClick }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border shrink-0">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Anchor className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight text-foreground">
            CE Logistic
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            Panel 2025
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onItemClick?.();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-secondary/50">
          <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
            RP
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              Cdr. R. Perera
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Admin · Engineering
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { profile, setProfile } = useThemeProfile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted || !profile) return <Button variant="ghost" size="icon" className="h-9 w-9"><Palette className="h-4.5 w-4.5" /></Button>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Theme & Color Settings" className="h-9 w-9 relative">
          <Palette className="h-4.5 w-4.5" />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card"
            style={{ backgroundColor: profile.primary }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Theme & Color Profile</p>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">Current: {profile.name}</p>
        <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto scrollbar-thin">
          {THEME_PROFILE_PRESETS.map((preset) => {
            const isActive = profile.name === preset.name;
            return (
              <button
                key={preset.name}
                onClick={() => setProfile(preset)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-medium transition-colors border",
                  isActive
                    ? "bg-primary/10 border-primary/40 text-foreground"
                    : "border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex gap-1 shrink-0">
                  <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: preset.primary }} />
                  <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: preset.accent }} />
                </div>
                <span className="flex-1 truncate">{preset.name}</span>
                <span className="text-[9px] uppercase text-muted-foreground">{preset.mode}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5">
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] text-muted-foreground">Click a profile to apply instantly. Light/Dark + color combinations.</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ active, onNavigate, stats, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now
    ? now.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";
  const timeStr = now
    ? now.toLocaleTimeString("en-GB", { hour12: false })
    : "";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border">
        <SidebarContent active={active} onNavigate={onNavigate} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 border-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            active={active}
            onNavigate={onNavigate}
            onItemClick={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-4 sm:px-6 gap-3 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>

            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground">{dateStr}</p>
              <p className="text-sm font-mono font-medium text-foreground tabular-nums">
                {timeStr}
              </p>
            </div>
          </div>

          {/* Quick stats — hidden on small screens */}
          <div className="hidden md:flex items-center gap-2">
            <QuickStat label="NET" value={stats ? formatCurrency(stats.net) : "—"} tone="blue" />
            <QuickStat label="TASK" value={stats ? String(stats.task) : "—"} tone="amber" />
            <QuickStat label="AVAIL" value={stats ? formatCurrency(stats.avail) : "—"} tone="green" />
            <QuickStat label="TEAM" value={stats ? String(stats.team) : "—"} tone="purple" />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </Button>

            {/* User */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold hover:bg-primary/30 transition-colors">
                  RP
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">Cdr. R. Perera</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Admin · Engineering
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-400">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function QuickStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "amber" | "green" | "purple";
}) {
  const tones = {
    blue: "text-blue-500 dark:text-blue-400",
    amber: "text-amber-500 dark:text-amber-400",
    green: "text-emerald-500 dark:text-emerald-400",
    purple: "text-violet-500 dark:text-violet-400",
  };
  return (
    <div className="flex flex-col items-end px-3 py-1 rounded-lg bg-secondary/60">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </span>
      <span className={`text-sm font-semibold leading-tight ${tones[tone]}`}>
        {value}
      </span>
    </div>
  );
}
