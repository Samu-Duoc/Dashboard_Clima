"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getSupervisorState,
  type SupervisorState,
} from "@/src/services/api";

type MiniAgentContextValue = {
  state: SupervisorState | null;
  apiConnected: boolean;
  loading: boolean;
  lastUpdate: string;
  tokenExpiryEpoch: number | null;
  remainingSeconds: number | null;
  tokenExpired: boolean;
};

const MiniAgentContext = createContext<MiniAgentContextValue | null>(null);
const STORAGE_KEY = "meteostream.totem_exp_epoch";

function findTokenEpoch(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTokenEpoch(item);
      if (found != null) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["totem_exp_epoch", "token_exp_epoch"]) {
    const raw = record[key];
    if (typeof raw === "number" || typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed > 10_000_000_000 ? Math.floor(parsed / 1000) : parsed;
      }
    }
  }
  for (const nested of Object.values(record)) {
    const found = findTokenEpoch(nested);
    if (found != null) return found;
  }
  return null;
}

function persistExpiry(epoch: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(epoch));
  } catch {
    // The countdown still works for this session if storage is unavailable.
  }
}

function readPersistedExpiry() {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function MiniAgentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SupervisorState | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const [tokenExpiryEpoch, setTokenExpiryEpoch] = useState<number | null>(() =>
    typeof window === "undefined" ? null : readPersistedExpiry()
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const nextState = await getSupervisorState();
      setState(nextState);
      setApiConnected(true);

      const realEpoch = findTokenEpoch(nextState);
      if (realEpoch != null) {
        persistExpiry(realEpoch);
        setTokenExpiryEpoch(realEpoch);
      } else {
        setTokenExpiryEpoch((current) => current ?? readPersistedExpiry());
      }
      setLastUpdate(formatDateTime(new Date()));
    } catch {
      setApiConnected(false);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void load();
    }, 0);
    const polling = window.setInterval(() => {
      void load();
    }, 5000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(polling);
    };
  }, [load]);

  useEffect(() => {
    const updateRemaining = () => {
      if (tokenExpiryEpoch == null) {
        setRemainingSeconds(null);
        return;
      }
      setRemainingSeconds(Math.max(0, tokenExpiryEpoch - Math.floor(Date.now() / 1000)));
    };
    updateRemaining();
    const countdown = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(countdown);
  }, [tokenExpiryEpoch]);

  const value = useMemo<MiniAgentContextValue>(() => ({
    state,
    apiConnected,
    loading,
    lastUpdate,
    tokenExpiryEpoch,
    remainingSeconds,
    tokenExpired: remainingSeconds != null && remainingSeconds === 0,
  }), [state, apiConnected, loading, lastUpdate, tokenExpiryEpoch, remainingSeconds]);

  return (
    <MiniAgentContext.Provider value={value}>
      {children}
    </MiniAgentContext.Provider>
  );
}

export function useMiniAgent() {
  const value = useContext(MiniAgentContext);
  if (!value) throw new Error("useMiniAgent debe usarse dentro de MiniAgentProvider");
  return value;
}

export function formatDateTime(value: Date | string | null) {
  if (!value) return "Sin dato";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Sin dato";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function formatCountdown(seconds: number | null) {
  if (seconds == null) return "No disponible";
  const total = Math.max(0, seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
