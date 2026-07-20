"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode, useEffect } from "react";
import { DEFAULT_PROFILE_AS_ANY } from "./theme-profile-init";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The ThemeProfileInitializer reads localStorage and applies the profile
  // before next-themes kicks in. We still wrap with next-themes for the
  // dark class toggle, but the profile colors override the CSS variables.
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ThemeProfileInitializer />
      {children}
    </NextThemesProvider>
  );
}

function ThemeProfileInitializer() {
  // Apply saved profile on mount (runs once)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ce-theme-profile");
      if (stored) {
        const p = JSON.parse(stored);
        applyProfileInline(p);
      } else {
        applyProfileInline(DEFAULT_PROFILE_AS_ANY);
      }
    } catch {
      applyProfileInline(DEFAULT_PROFILE_AS_ANY);
    }
  }, []);
  return null;
}

function applyProfileInline(p: { mode: string; primary: string; accent: string }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (p.mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.setProperty("--primary", p.primary);
  root.style.setProperty("--sidebar-primary", p.primary);
  root.style.setProperty("--ring", p.primary);
  root.style.setProperty("--chart-1", p.primary);
  root.style.setProperty("--chart-4", p.accent);
  root.style.setProperty("--chart-3", p.accent);
}
