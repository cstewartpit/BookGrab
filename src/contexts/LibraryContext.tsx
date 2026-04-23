"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type LibraryStatusPayload = {
  calibre: string[];
  abs: string[];
  calibreCount?: number;
  absCount?: number;
  fetchedAt: string | null;
  calibreError: string | null;
  absError: string | null;
};

type LibraryMatch = { kind: "ebook" | "audiobook"; normalized: string };

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

  const calibreSet = useMemo(
    () => new Set(payload?.calibre ?? []),
    [payload],
  );
  const absSet = useMemo(() => new Set(payload?.abs ?? []), [payload]);

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
        const pool = preferredKind === "audiobook" ? absSet : calibreSet;
        if (pool.has(needle)) {
          return { kind: preferredKind, normalized: needle };
        }
        if (needle.length < 8) return null;
        for (const s of pool) {
          if (s.includes(needle) || needle.includes(s))
            return { kind: preferredKind, normalized: s };
        }
        return null;
      }

      const inCal = calibreSet.has(needle);
      const inAbs = absSet.has(needle);
      if (inCal || inAbs) {
        return {
          kind: inAbs ? "audiobook" : "ebook",
          normalized: needle,
        };
      }

      // Substring fallback for long needles (same strategy as Transmission).
      if (needle.length < 8) return null;
      for (const s of absSet) {
        if (s.includes(needle) || needle.includes(s))
          return { kind: "audiobook", normalized: s };
      }
      for (const s of calibreSet) {
        if (s.includes(needle) || needle.includes(s))
          return { kind: "ebook", normalized: s };
      }
      return null;
    },
    [payload, calibreSet, absSet],
  );

  return (
    <LibraryContext.Provider value={{ payload, refresh, matchInLibrary }}>
      {children}
    </LibraryContext.Provider>
  );
};
