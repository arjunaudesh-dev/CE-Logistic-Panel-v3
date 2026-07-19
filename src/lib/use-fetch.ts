"use client";
import { useCallback, useEffect, useState } from "react";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Lightweight fetch hook with loading/error states and manual refresh. */
export function useFetch<T>(url: string | null): State<T> {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: !!url, error: null });
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();

    const load = async () => {
      // mark loading (deferred so it is not a synchronous setState in effect body)
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as T;
        if (controller.signal.aborted) return;
        setState({ data: json, loading: false, error: null });
      } catch (e) {
        if (controller.signal.aborted) return;
        if ((e as Error).name === "AbortError") return;
        setState({ data: null, loading: false, error: (e as Error).message || "Failed to load" });
      }
    };
    load();

    return () => {
      controller.abort();
    };
  }, [url, nonce]);

  return { data: state.data, loading: state.loading, error: state.error, refresh };
}

/** POST/PUT/DELETE helper returning {ok, error}. */
export async function apiRequest(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
