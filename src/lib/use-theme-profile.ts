"use client";
import { useEffect, useState, useCallback } from "react";
import { THEME_PROFILE_PRESETS } from "./constants";

export interface ActiveThemeProfile {
  name: string;
  mode: "dark" | "light";
  primary: string;
  accent: string;
}

const STORAGE_KEY = "ce-theme-profile";

export const DEFAULT_PROFILE: ActiveThemeProfile = {
  name: "Ocean Blue (Dark)",
  mode: "dark",
  primary: "#3b82f6",
  accent: "#8b5cf6",
};

// Helper to convert hex to rgb
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

// Derive a set of chart colors from primary + accent
export function deriveChartColors(primary: string, accent: string): string[] {
  const [r, g, b] = hexToRgb(primary);
  const [r2, g2, b2] = hexToRgb(accent);
  return [
    primary,
    accent,
    `rgb(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)})`,
    `rgb(${Math.min(r2 + 40, 255)}, ${Math.min(g2 + 40, 255)}, ${Math.min(b2 + 40, 255)})`,
    `rgb(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 30, 0)})`,
  ];
}

export function applyProfile(p: ActiveThemeProfile) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (p.mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.setProperty("--primary", p.primary);
  root.style.setProperty("--accent", p.accent);
  root.style.setProperty("--sidebar-primary", p.primary);
  root.style.setProperty("--ring", p.primary);
  root.style.setProperty("--chart-1", p.primary);
  root.style.setProperty("--chart-4", p.accent);
  root.style.setProperty("--chart-3", p.accent);

  const [r, g, b] = hexToRgb(p.primary);
  const [r2, g2, b2] = hexToRgb(p.accent);

  root.style.setProperty("--glow-primary", `rgba(${r}, ${g}, ${b}, 0.2)`);
  root.style.setProperty("--glow-accent", `rgba(${r2}, ${g2}, ${b2}, 0.18)`);

  root.style.setProperty("--chart-2", `rgb(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)})`);
  root.style.setProperty("--chart-5", `rgb(${Math.max(r2 - 30, 0)}, ${Math.max(g2 - 30, 0)}, ${Math.max(b2 - 30, 0)})`);
}

export function useThemeProfile() {
  // Initialize lazily from localStorage (client-side only)
  const [profile, setProfileState] = useState<ActiveThemeProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as ActiveThemeProfile;
    } catch {
      // ignore
    }
    return DEFAULT_PROFILE;
  });

  // Apply the profile to <html> whenever it changes
  useEffect(() => {
    if (profile) applyProfile(profile);
  }, [profile]);

  const setProfile = useCallback((p: ActiveThemeProfile) => {
    setProfileState(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // ignore
    }
  }, []);

  const setThemeByPreset = useCallback(
    (presetName: string) => {
      const found = THEME_PROFILE_PRESETS.find((p) => p.name === presetName);
      if (found) {
        setProfile(found);
      }
    },
    [setProfile]
  );

  return {
    profile,
    setProfile,
    currentTheme: profile,
    presets: THEME_PROFILE_PRESETS,
    setThemeByPreset,
  };
}
