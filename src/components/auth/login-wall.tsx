"use client";

import { useState } from "react";
import {
  Anchor,
  LogIn,
  Lock,
  User,
  KeyRound,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomBadge } from "@/components/erp/badges";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/use-fetch";

interface LoginWallProps {
  onLoginSuccess: () => void;
}

const PRESET_CREDENTIALS = [
  { username: "kmau.kahandawa", password: "arjuna@1991", role: "Admin", name: "KMAU Kahandawa", dept: "CSLOG" },
  { username: "KMAU Kahandawa", password: "arjuna@1991", role: "Admin", name: "KMAU Kahandawa", dept: "CSLOG" },
];

export function LoginWall({ onLoginSuccess }: LoginWallProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password) {
      toast({
        title: "Credentials Required",
        description: "Please enter your username and password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiRequest("/api/auth/login", "POST", {
        username: username.trim(),
        password,
      });

      setLoading(false);

      if (res.ok) {
        toast({
          title: "Authentication Successful 🎉",
          description: `Welcome back, ${(res.data as any)?.user?.displayName || username}!`,
        });
        onLoginSuccess();
      } else {
        setErrorMsg(res.error || "Invalid username or password");
        toast({
          title: "Authentication Failed",
          description: res.error || "Please check your credentials and try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || "Network error occurred");
      toast({
        title: "Connection Error",
        description: err.message || "Failed to reach authentication server.",
        variant: "destructive",
      });
    }
  };

  const handlePresetSelect = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden p-4 sm:p-6 selection:bg-primary/20 selection:text-primary">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md glass-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6 backdrop-blur-xl">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary via-primary to-accent flex items-center justify-center shadow-xl shadow-primary/25 border border-white/20">
            <Anchor className="h-8 w-8 text-primary-foreground animate-bounce" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-foreground font-mono">
                CE LOGISTIC
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/20">
                v2.5
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mt-1">
              SLN NAVAL DOCKYARD TRINCOMALEE
            </p>
          </div>
        </div>

        {/* Security Banner */}
        <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-2.5 text-xs text-primary font-medium">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <span>Restricted Naval System. Authorized Personnel Only.</span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground font-semibold">
              <User className="h-3.5 w-3.5 text-primary" /> Username
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (e.g. rperera)"
              className="bg-background/80 font-mono text-sm h-11"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground font-semibold">
              <Lock className="h-3.5 w-3.5 text-accent" /> Password
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="bg-background/80 text-sm h-11"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-400 flex items-center gap-2 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-primary-foreground font-bold shadow-lg shadow-primary/25 transition-all text-sm rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" /> Sign In to System
              </>
            )}
          </Button>
        </form>

        {/* Quick Presets */}
        <div className="pt-2 border-t border-border/60 space-y-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
            Quick Test Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_CREDENTIALS.map((cred) => (
              <button
                key={cred.username}
                type="button"
                onClick={() => handlePresetSelect(cred.username, cred.password)}
                className="p-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-secondary/60 text-left transition-colors flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary">
                    {cred.username}
                  </span>
                  <CustomBadge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                    {cred.role}
                  </CustomBadge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-1">
                  {cred.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Footer */}
      <footer className="mt-8 text-center text-xs text-muted-foreground flex items-center gap-2">
        <Building2 className="h-3.5 w-3.5 text-primary" />
        <span>Dockyard ERP Logistics & Operations Panel • Security Level 4</span>
      </footer>
    </div>
  );
}
