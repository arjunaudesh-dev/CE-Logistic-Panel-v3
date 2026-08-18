"use client";

import { useState } from "react";
import { AppShell } from "@/components/erp/app-shell";
import { ModuleId } from "@/components/erp/nav";
import { useFetch } from "@/lib/use-fetch";
import { Dashboard } from "@/components/erp/modules/dashboard";
import { ProjectsModule } from "@/components/erp/modules/projects";
import { ProcurementModule } from "@/components/erp/modules/procurement";
import { StoresModule } from "@/components/erp/modules/stores";
import { RateFinderModule } from "@/components/erp/modules/rate-finder";
import { CollectionModule } from "@/components/erp/modules/collection";
import { StakeholdersModule } from "@/components/erp/modules/stakeholders";
import { SettingsModule } from "@/components/erp/modules/settings";
import { LoginWall } from "@/components/auth/login-wall";
import { Loader2, Anchor } from "lucide-react";

interface SessionResponse {
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    role: string;
    department: string | null;
  } | null;
}

export default function Home() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [localAuth, setLocalAuth] = useState<boolean>(false);

  const {
    data: sessionData,
    loading: sessionLoading,
    refresh: refreshSession,
  } = useFetch<SessionResponse>("/api/auth/session");

  const { data: stats, refresh: refreshStats } = useFetch<{
    net: number;
    task: number;
    avail: number;
    team: number;
  }>("/api/stats");

  const handleNavigate = (id: ModuleId) => {
    setActive(id);
    refreshStats();
  };

  const handleLoginSuccess = (_user?: unknown) => {
    setLocalAuth(true);
    refreshSession();
    refreshStats();
  };

  const isAuthenticated = localAuth || !!sessionData?.authenticated;

  // Loading state while checking session
  if (sessionLoading && !localAuth) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
          <Anchor className="h-7 w-7 text-primary-foreground animate-spin" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Verifying Naval Logistics Session...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, show full-screen Login Wall
  if (!isAuthenticated) {
    return <LoginWall onLoginSuccess={handleLoginSuccess} />;
  }

  // Authenticated state
  return (
    <AppShell active={active} onNavigate={handleNavigate} stats={stats}>
      {active === "dashboard" && <Dashboard onNavigate={handleNavigate} />}
      {active === "projects" && <ProjectsModule onNavigate={handleNavigate} />}
      {active === "procurement" && <ProcurementModule />}
      {active === "stores" && <StoresModule />}
      {active === "rate-finder" && <RateFinderModule />}
      {active === "collection" && <CollectionModule />}
      {active === "stakeholders" && <StakeholdersModule />}
      {active === "settings" && <SettingsModule />}
    </AppShell>
  );
}
