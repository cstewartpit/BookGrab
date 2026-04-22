"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Book } from "@/types";
import BookList from "./BookList";

interface BrowseCategoryPageProps {
  category: "audiobook" | "ebook" | "all";
  initialSort: string;
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "seeds", label: "Most Seeders" },
  { value: "date", label: "Newest" },
  { value: "times_completed", label: "Most Grabbed" },
  { value: "size", label: "Largest" },
  { value: "name", label: "Name A-Z" },
];

const PAGE_SIZE = 20;

const CATEGORY_TITLES: Record<BrowseCategoryPageProps["category"], string> = {
  audiobook: "Audiobooks",
  ebook: "Ebooks",
  all: "All Books",
};

export default function BrowseCategoryPage({
  category,
  initialSort,
}: BrowseCategoryPageProps) {
  const [sort, setSort] = useState(initialSort);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    const start = (page - 1) * PAGE_SIZE;
    (async () => {
      try {
        const res = await fetch(
          `/api/browse?cat=${category}&sort=${sort}&start=${start}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || `Failed (${res.status})`);
          setBooks([]);
          return;
        }
        setBooks(data.books || []);
        setTotalResults(data.totalResults || 0);
        setHasMore(!!data.hasMore);
        if (data.error) setError(data.error);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, sort, page]);

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  return (
    <div style={{ padding: "16px", maxWidth: "800px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#60a5fa",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          ← Home
        </Link>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "700",
            color: "#f1f5f9",
            margin: 0,
          }}
        >
          {CATEGORY_TITLES[category]}
        </h1>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#e2e8f0",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {!loading && !error && totalResults > 0 && (
        <div
          style={{
            marginBottom: "12px",
            padding: "10px 14px",
            background: "#1e293b",
            borderRadius: "8px",
            border: "1px solid #334155",
            fontSize: "13px",
            color: "#94a3b8",
          }}
        >
          Page {page} of {totalPages} · {totalResults.toLocaleString()} total
        </div>
      )}

      <BookList books={books} isLoading={loading} error={error} />

      {totalPages > 1 && !loading && !error && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "24px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "10px 18px",
              background: page === 1 ? "#1e293b" : "#3b82f6",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: page === 1 ? "#64748b" : "#fff",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "14px",
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            ← Previous
          </button>
          <span style={{ color: "#94a3b8", fontSize: "13px" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            style={{
              padding: "10px 18px",
              background: !hasMore ? "#1e293b" : "#3b82f6",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: !hasMore ? "#64748b" : "#fff",
              cursor: !hasMore ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "14px",
              opacity: !hasMore ? 0.5 : 1,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
