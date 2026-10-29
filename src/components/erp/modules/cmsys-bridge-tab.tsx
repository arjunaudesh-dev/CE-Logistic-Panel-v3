"use client";

import { useState } from "react";
import { useFetch, apiRequest } from "@/lib/use-fetch";
import { Button } from "@/components/ui/button";
import { CustomBadge } from "@/components/erp/badges";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  Cloud,
  Users,
  Briefcase,
  Layers,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Activity,
  Server,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";

interface IntegrationStatusResponse {
  success: boolean;
  isFullyIntegrated: boolean;
  summary: {
    mode: string;
    totalLatencyMs: number;
  };
  services: {
    sqliteLocal: {
      connected: boolean;
      records?: {
        projects: number;
        files: number;
        storeItems: number;
        rateContracts: number;
        stakeholders: number;
      };
      error?: string;
    };
    mysqlNcwPsDb: {
      connected: boolean;
      latencyMs: number;
      database: string;
      host: string;
      tableCounts?: {
        users: number;
        work_orders: number;
        inventory: number;
        locations: number;
      };
      error?: string;
    };
    firebasePrimary: {
      connected: boolean;
      latencyMs?: number;
      url: string;
      project: string;
      httpStatus?: number;
      error?: string;
    };
    firebaseOps: {
      url: string;
      project: string;
    };
  };
  timestamp: string;
}

export function CMSysBridgeTab() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState<string | null>(null);

  const {
    data: status,
    loading,
    refresh,
  } = useFetch<IntegrationStatusResponse>("/api/sync/integration-status");

  const handleSync = async (target: "all" | "sailors" | "work_orders" | "inventory") => {
    setSyncing(target);
    try {
      const res = await apiRequest("/api/sync/mysql", "POST", { target });
      if (res.ok) {
        toast({
          title: "CMSys Synchronization Success 🎉",
          description:
            (res.data as any)?.message ||
            `Successfully synchronized ${target} with CMSys V2.`,
        });
        refresh();
      } else {
        toast({
          title: "Synchronization Failed",
          description: res.error || "Unable to sync with CMSys MySQL database.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Sync Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                CMSys V2 Ecosystem Bridge
              </h3>
              <CustomBadge
                className={
                  status?.isFullyIntegrated
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }
              >
                {status?.summary.mode || "Checking..."}
              </CustomBadge>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct connection with Naval Civil Works suite: XAMPP MySQL (<code>ncw_ps_db</code>) and Unified Firebase Cluster (<code>cmsys-v2-1fb05</code>).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={loading}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleSync("all")}
              disabled={syncing !== null}
              className="gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ArrowRightLeft className={`h-3.5 w-3.5 ${syncing === "all" ? "animate-spin" : ""}`} />
              <span>Sync All with CMSys</span>
            </Button>
          </div>
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* MySQL Status */}
          <div className="border border-border/80 bg-background/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Database className="h-4 w-4 text-sky-400" />
                <span>MySQL (`ncw_ps_db`)</span>
              </div>
              {status?.services.mysqlNcwPsDb.connected ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{status.services.mysqlNcwPsDb.latencyMs}ms</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Disconnected</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Active Sailors & Officers:</span>
                <span className="font-semibold text-foreground">
                  {status?.services.mysqlNcwPsDb.tableCounts?.users ?? "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Civil Work Orders:</span>
                <span className="font-semibold text-foreground">
                  {status?.services.mysqlNcwPsDb.tableCounts?.work_orders ?? "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Stores Inventory Items:</span>
                <span className="font-semibold text-foreground">
                  {status?.services.mysqlNcwPsDb.tableCounts?.inventory ?? "--"}
                </span>
              </div>
            </div>
          </div>

          {/* Firebase Cluster Status */}
          <div className="border border-border/80 bg-background/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Cloud className="h-4 w-4 text-amber-400" />
                <span>Firebase Cluster</span>
              </div>
              {status?.services.firebasePrimary.connected ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{status.services.firebasePrimary.latencyMs}ms</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Disconnected</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Primary Operations:</span>
                <span className="font-mono text-foreground font-semibold">cmsys-v2-1fb05</span>
              </div>
              <div className="flex justify-between">
                <span>Tactical Ops:</span>
                <span className="font-mono text-foreground font-semibold">ncw-ps-operations</span>
              </div>
              <div className="flex justify-between">
                <span>Personnel Registry:</span>
                <span className="font-mono text-foreground font-semibold">ce-admin-panel2025</span>
              </div>
            </div>
          </div>

          {/* SQLite Local Cache Status */}
          <div className="border border-border/80 bg-background/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Server className="h-4 w-4 text-violet-400" />
                <span>Local Edge Store (`custom.db`)</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Ready</span>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Stakeholders in Directory:</span>
                <span className="font-semibold text-foreground">
                  {status?.services.sqliteLocal.records?.stakeholders ?? "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Logistics Projects:</span>
                <span className="font-semibold text-foreground">
                  {status?.services.sqliteLocal.records?.projects ?? "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Store Catalog Items:</span>
                <span className="font-semibold text-foreground">
                  {status?.services.sqliteLocal.records?.storeItems ?? "--"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Operations Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sailors Sync */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Users className="h-4 w-4 text-blue-400" />
              <span>Sailor Complement Sync</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pulls all 681 active naval sailors and officers from <code>ncw_ps_db.users</code> into the Stakeholder directory.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync("sailors")}
            disabled={syncing !== null}
            className="w-full text-xs gap-1.5 mt-2"
          >
            <RefreshCw className={`h-3 w-3 ${syncing === "sailors" ? "animate-spin" : ""}`} />
            <span>Sync Sailors ({status?.services.mysqlNcwPsDb.tableCounts?.users ?? 681})</span>
          </Button>
        </div>

        {/* Work Orders Sync */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Briefcase className="h-4 w-4 text-emerald-400" />
              <span>Work Orders & Projects</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Imports civil engineering work orders from CMSys V2 into the Logistics Vote & File tracking register.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync("work_orders")}
            disabled={syncing !== null}
            className="w-full text-xs gap-1.5 mt-2"
          >
            <RefreshCw className={`h-3 w-3 ${syncing === "work_orders" ? "animate-spin" : ""}`} />
            <span>Sync Work Orders</span>
          </Button>
        </div>

        {/* Inventory Sync */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Inventory & Stores Stock</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Synchronizes store on-charge and off-charge items between <code>ncw_ps_db.inventory</code> and Zone Stores.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync("inventory")}
            disabled={syncing !== null}
            className="w-full text-xs gap-1.5 mt-2"
          >
            <RefreshCw className={`h-3 w-3 ${syncing === "inventory" ? "animate-spin" : ""}`} />
            <span>Sync Inventory</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
