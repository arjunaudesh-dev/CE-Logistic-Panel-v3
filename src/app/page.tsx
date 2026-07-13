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

export default function Home() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const { data: stats, refresh } = useFetch<{
    net: number;
    task: number;
    avail: number;
    team: number;
  }>("/api/stats");

  const handleNavigate = (id: ModuleId) => {
    setActive(id);
    refresh();
  };

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
