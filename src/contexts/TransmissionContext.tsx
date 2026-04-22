"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TorrentSnapshot = {
  name: string;
  percentDone: number;
  status: number;
  rateDownload: number;
  eta: number;
  downloadDir: string;
};

type TransmissionContextValue = {
  torrents: TorrentSnapshot[];
  fetchedAt: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  /**
   * Match a MAM book against the current torrent list by title similarity.
   * Returns the most-complete matching torrent, or null.
   */
  matchByTitle: (title: string) => TorrentSnapshot | null;
};

const TransmissionContext = createContext<TransmissionContextValue | undefined>(
  undefined,
);

export const useTransmission = () => {
  const ctx = useContext(TransmissionContext);
  if (!ctx)
    throw new Error(
      "useTransmission must be used within a TransmissionProvider",
    );
  return ctx;
};

const POLL_INTERVAL_MS = 15_000;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildIndex(torrents: TorrentSnapshot[]): Map<string, TorrentSnapshot> {
  const map = new Map<string, TorrentSnapshot>();
  for (const t of torrents) {
    map.set(normalize(t.name), t);
  }
  return map;
}

export const TransmissionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [torrents, setTorrents] = useState<TorrentSnapshot[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/transmission-status");
      const data = (await res.json()) as {
        torrents?: TorrentSnapshot[];
        fetchedAt?: string;
        error?: string;
      };
      if (!res.ok || data.error) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setTorrents(data.torrents || []);
      setFetchedAt(data.fetchedAt || new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Pre-build a normalized index so per-row lookups are O(1).
  const index = useMemo(() => buildIndex(torrents), [torrents]);

  const matchByTitle = useCallback(
    (title: string): TorrentSnapshot | null => {
      if (!title || torrents.length === 0) return null;
      const needle = normalize(title);
      if (!needle) return null;
      // Direct normalized-key hit first.
      const exact = index.get(needle);
      if (exact) return exact;
      // Fallback: substring. MAM titles tend to be shorter than the
      // full torrent name (which includes author / subseries / format),
      // so check "needle in torrent name". Require the needle to be at
      // least 6 chars to avoid matching tiny tokens like "II".
      if (needle.length < 6) return null;
      let best: TorrentSnapshot | null = null;
      for (const t of torrents) {
        if (normalize(t.name).includes(needle)) {
          if (!best || t.percentDone > best.percentDone) best = t;
        }
      }
      return best;
    },
    [index, torrents],
  );

  return (
    <TransmissionContext.Provider
      value={{ torrents, fetchedAt, error, refresh, matchByTitle }}
    >
      {children}
    </TransmissionContext.Provider>
  );
};
