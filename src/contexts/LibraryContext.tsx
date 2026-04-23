"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type LibraryLookup = { normalized: string; url: string | null };

type LibraryStatusPayload = {
  calibre: LibraryLookup[];
  abs: LibraryLookup[];
  calibreCount?: number;
  absCount?: number;
  fetchedAt: string | null;
  calibreError: string | null;
  absError: string | null;
};

type LibraryMatch = {
  kind: "ebook" | "audiobook";
  normalized: string;
  url: string | null;
};

type LibraryContextValue = {
  payload: LibraryStatusPayload | null;
  refresh: () => Promise<void>;
  matchInLibrary: (
    title: string,
    preferredKind?: "ebook" | "audiobook",
  ) => LibraryMatch | null;
};

const LibraryContext = createContext<LibraryContextValue | undefined>(
  undefined,
);

export const useLibrary = () => {
  const ctx = useContext(LibraryContext);
  if (!ctx)
    throw new Error("useLibrary must be used within a LibraryProvider");
  return ctx;
};

const POLL_INTERVAL_MS = 120_000;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [payload, setPayload] = useState<LibraryStatusPayload | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/library-status");
      const data = (await res.json()) as LibraryStatusPayload;
      setPayload(data);
    } catch (err) {
      console.error("Library status fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const calibreMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const e of payload?.calibre ?? []) m.set(e.normalized, e.url);
    return m;
  }, [payload]);
  const absMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const e of payload?.abs ?? []) m.set(e.normalized, e.url);
    return m;
  }, [payload]);

  const matchInLibrary = useCallback(
    (
      title: string,
      preferredKind?: "ebook" | "audiobook",
    ): LibraryMatch | null => {
      if (!title || !payload) return null;
      const needle = normalize(title);
      if (!needle || needle.length < 4) return null;

      // When a kind is specified, limit matching to that library strictly —
      // an ebook-only library hit must not claim the audiobook row.
      if (preferredKind) {
        const pool = preferredKind === "audiobook" ? absMap : calibreMap;
        if (pool.has(needle)) {
          return {
            kind: preferredKind,
            normalized: needle,
            url: pool.get(needle) ?? null,
          };
        }
        if (needle.length < 8) return null;
        for (const [s, url] of pool) {
          if (s.includes(needle) || needle.includes(s))
            return { kind: preferredKind, normalized: s, url: url ?? null };
        }
        return null;
      }

      const inCalUrl = calibreMap.get(needle);
      const inAbsUrl = absMap.get(needle);
      const hasCal = calibreMap.has(needle);
      const hasAbs = absMap.has(needle);
      if (hasCal || hasAbs) {
        return {
          kind: hasAbs ? "audiobook" : "ebook",
          normalized: needle,
          url: (hasAbs ? inAbsUrl : inCalUrl) ?? null,
        };
      }

      // Substring fallback for long needles (same strategy as Transmission).
      if (needle.length < 8) return null;
      for (const [s, url] of absMap) {
        if (s.includes(needle) || needle.includes(s))
          return { kind: "audiobook", normalized: s, url: url ?? null };
      }
      for (const [s, url] of calibreMap) {
        if (s.includes(needle) || needle.includes(s))
          return { kind: "ebook", normalized: s, url: url ?? null };
      }
      return null;
    },
    [payload, calibreMap, absMap],
  );

  return (
    <LibraryContext.Provider value={{ payload, refresh, matchInLibrary }}>
      {children}
    </LibraryContext.Provider>
  );
};
