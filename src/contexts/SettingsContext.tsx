"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type KeepaliveStatus = {
  tokenPresent: boolean;
  lastPingAt: string | null;
  lastPingOk: boolean | null;
  lastMessage: string | null;
  lastError: string | null;
  nextPingAt: string | null;
  intervalMinutes: number;
};

interface SettingsContextType {
  status: KeepaliveStatus | null;
  refreshStatus: () => Promise<void>;
  saveToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  clearToken: () => Promise<void>;
  pingNow: () => Promise<void>;
  pingInFlight: boolean;
  pollOn: boolean;
  setPollOn: (on: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<KeepaliveStatus | null>(null);
  const [pingInFlight, setPingInFlight] = useState(false);
  const [pollOn, setPollOn] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/keepalive-status");
      const data = (await res.json()) as KeepaliveStatus;
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch keepalive status:", err);
    }
  }, []);

  const saveToken = useCallback(
    async (token: string) => {
      try {
        const res = await fetch("/api/settings/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "Failed to save" };
        }
        if (data.status) setStatus(data.status);
        else await refreshStatus();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [refreshStatus],
  );

  const clearToken = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/token", { method: "DELETE" });
      const data = await res.json();
      if (data.status) setStatus(data.status);
      else await refreshStatus();
    } catch (err) {
      console.error("Failed to clear token:", err);
    }
  }, [refreshStatus]);

  const pingNow = useCallback(async () => {
    setPingInFlight(true);
    try {
      const res = await fetch("/api/keepalive-run", { method: "POST" });
      const data = (await res.json()) as KeepaliveStatus;
      setStatus(data);
    } catch (err) {
      console.error("Ping failed:", err);
    } finally {
      setPingInFlight(false);
    }
  }, []);

  // Fetch once on mount so components know token state.
  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  // Poll every 60s while a consumer (e.g. Settings modal) has opted in.
  useEffect(() => {
    if (!pollOn) return;
    const id = setInterval(() => {
      void refreshStatus();
    }, 60_000);
    return () => clearInterval(id);
  }, [pollOn, refreshStatus]);

  return (
    <SettingsContext.Provider
      value={{
        status,
        refreshStatus,
        saveToken,
        clearToken,
        pingNow,
        pingInFlight,
        pollOn,
        setPollOn,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
