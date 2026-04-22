"use client";

import { useEffect, useState } from "react";
import { Book } from "@/types";
import BrowseRow from "./BrowseRow";

type RowDef = {
  title: string;
  cat: "audiobook" | "ebook" | "all";
  sort: "seeds" | "date" | "times_completed";
};

const ROWS: RowDef[] = [
  { title: "Newest Audiobooks", cat: "audiobook", sort: "date" },
  { title: "Newest Ebooks", cat: "ebook", sort: "date" },
  { title: "Most Seeded Audiobooks", cat: "audiobook", sort: "seeds" },
  { title: "Most Seeded Ebooks", cat: "ebook", sort: "seeds" },
  { title: "Most Grabbed", cat: "all", sort: "times_completed" },
];

type RowState = {
  books: Book[];
  loading: boolean;
  error?: string;
};

export default function BrowseHome() {
  const [states, setStates] = useState<RowState[]>(
    ROWS.map(() => ({ books: [], loading: true })),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        ROWS.map(async (row) => {
          try {
            const url = `/api/browse?cat=${row.cat}&sort=${row.sort}&start=0`;
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) {
              return {
                books: [] as Book[],
                loading: false,
                error: data.error || `Failed (${res.status})`,
              } as RowState;
            }
            return {
              books: (data.books as Book[]) || [],
              loading: false,
              error: data.error,
            } as RowState;
          } catch (err) {
            return {
              books: [] as Book[],
              loading: false,
              error: err instanceof Error ? err.message : "Network error",
            } as RowState;
          }
        }),
      );
      if (!cancelled) setStates(results);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ paddingTop: "16px" }}>
      {ROWS.map((row, i) => (
        <BrowseRow
          key={`${row.cat}-${row.sort}`}
          title={row.title}
          seeAllHref={`/?view=browse&cat=${row.cat}&sort=${row.sort}`}
          books={states[i].books}
          loading={states[i].loading}
          error={states[i].error}
        />
      ))}
    </div>
  );
}
