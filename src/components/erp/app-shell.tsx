"use client";
import { useState, useEffect, useMemo } from "react";
import { NAV_ITEMS, ModuleId } from "./nav";
import { cn } from "@/lib/utils";
import {
  Anchor,
  Menu,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  Palette,
  Check,
  User,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Mail,
  Building2,
  Loader2,
  Lock,
  X,
  FileText,
  ShieldAlert,
  Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomBadge } from "@/components/erp/badges";
import { useToast } from "@/hooks/use-toast";
import { useFetch, apiRequest } from "@/lib/use-fetch";
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

interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "procurement" | "qc" | "split" | "system";
  read: boolean;
}

interface UserProfileData {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
  department: string | null;
}

function SidebarContent({ active, onNavigate, onItemClick }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border/60 shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border/80 shrink-0 bg-sidebar/50 backdrop-blur-md">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary via-primary to-accent flex items-center justify-center shrink-0 shadow-md shadow-primary/20 transition-transform duration-300 hover:scale-105">
          <Anchor className="h-5 w-5 text-primary-foreground animate-pulse" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5 font-mono">
            CE LOGISTIC <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/20">v2.5</span>
          </span>
          <span className="text-[11px] font-medium text-muted-foreground truncate tracking-wide">
            NAVAL DOCKYARD TRINCOMALEE
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onItemClick?.();
              }}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative",
                isActive
                  ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors duration-200",
                    isActive
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-sidebar-accent text-muted-foreground group-hover:text-foreground group-hover:bg-sidebar-accent/80"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-colors",
                    isActive
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-sidebar-accent/80 text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-foreground"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-3 border-t border-sidebar-border/60 bg-sidebar-accent/20 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card/40 border border-border/50">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span className="text-[11px] font-mono font-semibold text-muted-foreground truncate">
            SLN DOCKYARD LOGISTIC ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { currentTheme, presets, setThemeByPreset } = useThemeProfile();
  const themePrimary = currentTheme?.primary || "#3b82f6";
  const themePresets = presets || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-lg hover:bg-secondary relative">
          <Palette className="h-4.5 w-4.5 text-foreground" />
          <span
            className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full border border-background shadow-xs"
            style={{ backgroundColor: themePrimary }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 glass-card border-border/80 shadow-xl">
        <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Color Themes
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/60" />
        <div className="space-y-0.5 py-1 max-h-64 overflow-y-auto">
          {themePresets.map((preset) => {
            const isSelected = currentTheme?.name === preset.name;
            return (
              <DropdownMenuItem
                key={preset.name}
                onClick={() => setThemeByPreset(preset.name)}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer font-medium transition-colors",
                  isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/10 shrink-0 shadow-2xs"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <span>{preset.name}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ active, onNavigate, stats, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  const { data: notifRes, refresh: refreshNotifs } = useFetch<{
    notifications: AppNotification[];
    unreadCount: number;
  }>("/api/notifications");

  const { data: userProfile, refresh: refreshProfile } = useFetch<UserProfileData>("/api/user/profile");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDateStr(
        now.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const notifications = notifRes?.notifications || [];
  const unreadCount = notifRes?.unreadCount || 0;

  const handleMarkRead = async (id: string) => {
    await apiRequest("/api/notifications", "POST", { action: "mark-read", id });
    refreshNotifs();
  };

  const handleMarkAllRead = async () => {
    const allIds = notifications.map((n) => n.id);
    await apiRequest("/api/notifications", "POST", { action: "mark-all-read", ids: allIds });
    refreshNotifs();
  };

  const handleClearNotifs = async () => {
    await apiRequest("/api/notifications", "POST", { action: "clear" });
    refreshNotifs();
  };

  const handleLogout = async () => {
    await apiRequest("/api/auth/logout", "POST");
    window.location.reload();
  };

  // Extract initials
  const initials = useMemo(() => {
    const name = userProfile?.displayName || "Radhika Perera";
    const parts = name.replace(/^(Cdr\.|Lt\.|Capt\.|Po|Sgt)\s+/i, "").trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [userProfile]);

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased font-sans selection:bg-primary/20 selection:text-primary">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen z-40">
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
        <header className="h-16 border-b border-border/80 bg-card/75 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 gap-3 shrink-0 sticky top-0 z-30 shadow-xs relative">
          {/* Top edge ambient gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-purple-500 opacity-80" />

          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden rounded-lg">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>

            <div className="hidden sm:block">
              <p className="text-[11px] font-medium text-muted-foreground">{dateStr}</p>
              <p className="text-sm font-mono font-bold text-foreground tabular-nums tracking-tight">
                {timeStr}
              </p>
            </div>
          </div>

          {/* Quick stats — hidden on small screens */}
          <div className="hidden md:flex items-center gap-2.5">
            <QuickStat label="NET" value={stats ? formatCurrency(stats.net) : "—"} tone="blue" />
            <QuickStat label="TASK" value={stats ? String(stats.task) : "—"} tone="amber" />
            <QuickStat label="AVAIL" value={stats ? formatCurrency(stats.avail) : "—"} tone="green" />
            <QuickStat label="TEAM" value={stats ? String(stats.team) : "—"} tone="purple" />
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-lg hover:bg-secondary">
                  <Bell className="h-4.5 w-4.5 text-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 sm:w-96 p-0 glass-card border-border/80 shadow-2xl">
                <div className="p-3 border-b border-border flex items-center justify-between bg-muted/40">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-xs text-foreground">Notifications</span>
                    {unreadCount > 0 && (
                      <CustomBadge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0.2">
                        {unreadCount} new
                      </CustomBadge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-6 text-[10px] px-2 text-primary">
                        Mark read
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleClearNotifs} className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-red-400">
                      Clear
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-72 p-2 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground italic space-y-1">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1 opacity-70" />
                      <p>No notifications right now</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkRead(n.id)}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs space-y-1 transition-colors cursor-pointer relative",
                          n.read
                            ? "bg-background/40 border-border/40 text-muted-foreground opacity-75"
                            : "bg-secondary/40 border-primary/30 text-foreground hover:bg-secondary/70"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[11px] truncate flex items-center gap-1.5">
                            {n.type === "qc" && <ShieldAlert className="h-3 w-3 text-amber-400 shrink-0" />}
                            {n.type === "procurement" && <FileText className="h-3 w-3 text-blue-400 shrink-0" />}
                            {n.type === "split" && <Boxes className="h-3 w-3 text-purple-400 shrink-0" />}
                            {n.type === "system" && <User className="h-3 w-3 text-emerald-400 shrink-0" />}
                            {n.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* User Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary/20 via-accent/20 to-purple-500/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold hover:scale-105 transition-transform shadow-xs cursor-pointer"
                  title="User Profile & Settings"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 glass-card border-border/80 shadow-xl">
                <DropdownMenuLabel className="p-2">
                  <div>
                    <p className="font-bold text-sm text-foreground">{userProfile?.displayName || "Cdr. R. Perera"}</p>
                    <p className="text-xs text-muted-foreground font-normal flex items-center gap-1 mt-0.5">
                      <CustomBadge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1 py-0">
                        {userProfile?.role || "Admin"}
                      </CustomBadge>
                      · {userProfile?.department || "Engineering"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem
                  onClick={() => setProfileOpen(true)}
                  className="rounded-lg cursor-pointer flex items-center gap-2"
                >
                  <User className="h-4 w-4 text-primary" /> Profile & Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="rounded-lg cursor-pointer text-red-500 dark:text-red-400 font-medium flex items-center gap-2"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>

      {/* User Profile & Password Modal */}
      {profileOpen && (
        <UserProfileModal
          open={profileOpen}
          onOpenChange={setProfileOpen}
          user={userProfile}
          onSaved={() => {
            refreshProfile();
            refreshNotifs();
          }}
        />
      )}
    </div>
  );
}

function UserProfileModal({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user?: UserProfileData | null;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(user?.displayName || "Cdr. R. Perera");
  const [email, setEmail] = useState(user?.email || "r.perera@navy.lk");
  const [department, setDepartment] = useState(user?.department || "Engineering");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "Cdr. R. Perera");
      setEmail(user.email || "r.perera@navy.lk");
      setDepartment(user.department || "Engineering");
    }
  }, [user]);

  const passwordMatch = newPassword.length >= 4 && newPassword === confirmPassword;

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast({ title: "Display Name is required", variant: "destructive" });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: "New Passwords do not match", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const res = await apiRequest("/api/user/profile", "PUT", {
      displayName: displayName.trim(),
      email: email.trim(),
      department: department.trim(),
      newPassword: newPassword.trim() || undefined,
    });
    setSubmitting(false);

    if (res.ok) {
      toast({ title: "Profile & settings updated successfully" });
      onSaved();
      onOpenChange(false);
    } else {
      toast({ title: "Failed to update profile", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> User Profile & Settings
          </DialogTitle>
          <DialogDescription>
            View and manage your personal account details, department, and security password.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-4 py-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="details" className="gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" /> Profile Details
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs">
              <KeyRound className="h-3.5 w-3.5" /> Security & Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="p-3 rounded-xl border border-border bg-secondary/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Account Username</p>
                <p className="text-sm font-mono font-bold text-foreground">{user?.username || "admin"}</p>
              </div>
              <CustomBadge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                Role: {user?.role || "Admin"}
              </CustomBadge>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Display Name / Rank & Name *
                </Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Cdr. R. Perera"
                  className="text-xs bg-background mt-1"
                />
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-400" /> Email Address
                </Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. r.perera@navy.lk"
                  className="text-xs bg-background mt-1"
                />
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-amber-400" /> Department / Unit
                </Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering / CSLOG"
                  className="text-xs bg-background mt-1"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-amber-400" /> Change Account Password
              </div>
              <p className="text-[11px] opacity-90">
                To update your password, type a new password below (min 4 characters).
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Current Password (optional)</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="text-xs bg-background mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 4 characters"
                  className="text-xs bg-background mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="text-xs bg-background mt-1 font-mono"
                />
                {newPassword && (
                  <p className={cn("text-[11px] mt-1 font-medium", passwordMatch ? "text-emerald-400" : "text-red-400")}>
                    {passwordMatch ? "✓ Passwords match" : "✕ Passwords do not match"}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSaveProfile} disabled={submitting} className="gap-1.5 bg-primary text-primary-foreground">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Profile & Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    green: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
  };
  return (
    <div className={cn("flex flex-col items-end px-3 py-1 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 shadow-2xs hover:shadow-xs", tones[tone])}>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/90 leading-none">
        {label}
      </span>
      <span className="text-xs font-bold leading-tight tabular-nums mt-0.5">
        {value}
      </span>
    </div>
  );
}
