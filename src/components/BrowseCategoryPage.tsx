"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Book } from "@/types";
import BookList from "./BookList";

type Category = "audiobook" | "ebook" | "all";

interface BrowseCategoryPageProps {
  category: Category;
  initialSort: string;
  initialTag?: string;
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "seedersDesc", label: "Most Seeders" },
  { value: "snatchedDesc", label: "Most Grabbed" },
  { value: "dateDesc", label: "Newest" },
  { value: "dateAsc", label: "Oldest" },
  { value: "sizeDesc", label: "Largest" },
  { value: "sizeAsc", label: "Smallest" },
  { value: "titleAsc", label: "Name A-Z" },
  { value: "titleDesc", label: "Name Z-A" },
];

const DEFAULT_SORT = "seedersDesc";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "audiobook", label: "Audiobooks" },
  { value: "ebook", label: "Ebooks" },
];

const TAG_SUGGESTIONS = [
  "fantasy",
  "science fiction",
  "mystery",
  "thriller",
  "romance",
  "history",
  "biography",
  "non-fiction",
  "horror",
  "young adult",
];

const PAGE_SIZE = 20;

const CATEGORY_TITLES: Record<Category, string> = {
  audiobook: "Audiobooks",
  ebook: "Ebooks",
  all: "All Books",
};

function buildUrl(cat: Category, sort: string, tag?: string): string {
  const params = new URLSearchParams();
  if (cat !== "all") params.set("cat", cat);
  if (sort !== DEFAULT_SORT) params.set("sort", sort);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default function BrowseCategoryPage({
  category,
  initialSort,
  initialTag,
}: BrowseCategoryPageProps) {
  const router = useRouter();
  const [sort, setSort] = useState(initialSort);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const activeTag = (initialTag || "").trim();

  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);

  useEffect(() => {
    setPage(1);
  }, [category, initialSort, initialTag]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    const start = (page - 1) * PAGE_SIZE;
    (async () => {
      try {
        const params = new URLSearchParams({
          cat: category,
          sort,
          start: String(start),
        });
        if (activeTag) params.set("tag", activeTag);
        const res = await fetch(`/api/browse?${params.toString()}`);
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
  }, [category, sort, page, activeTag]);

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  const changeCategory = (cat: Category) => {
    router.push(buildUrl(cat, sort, activeTag || undefined));
  };

  const changeSort = (newSort: string) => {
    setSort(newSort);
    router.replace(buildUrl(category, newSort, activeTag || undefined));
  };

  return (
    <div
      style={{
        padding: "16px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#f1f5f9",
          margin: "0 0 16px",
        }}
      >
        {CATEGORY_TITLES[category]}
        {activeTag && (
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#94a3b8",
              marginLeft: "10px",
            }}
          >
            tagged{" "}
            <span style={{ color: "#93c5fd", textTransform: "capitalize" }}>
              {activeTag}
            </span>
          </span>
        )}
      </h1>

      {/* Filter bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr",
          alignItems: "center",
          gap: "10px 12px",
          marginBottom: "16px",
          padding: "14px",
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "10px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Type
        </span>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => changeCategory(opt.value)}
              style={{
                padding: "6px 14px",
                background: category === opt.value ? "#3b82f6" : "#0f172a",
                border: "1px solid #334155",
                borderRadius: "999px",
                color: "#e2e8f0",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Sort
        </span>
        <select
          value={sort}
          onChange={(e) => changeSort(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#e2e8f0",
            fontSize: "13px",
            fontWeight: 500,
            width: "100%",
            maxWidth: "260px",
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Genre
        </span>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {TAG_SUGGESTIONS.map((t) => {
            const selected = activeTag.toLowerCase() === t;
            return (
              <button
                key={t}
                onClick={() => {
                  router.replace(
                    buildUrl(category, sort, selected ? undefined : t),
                  );
                }}
                style={{
                  padding: "5px 12px",
                  background: selected ? "#1e3a8a" : "#0f172a",
                  border: `1px solid ${selected ? "#3b82f6" : "#334155"}`,
                  borderRadius: "999px",
                  color: selected ? "#93c5fd" : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {!loading && !error && totalResults > 0 && (
        <div
          style={{
            marginBottom: "10px",
            padding: "8px 14px",
            background: "#1e293b",
            borderRadius: "8px",
            border: "1px solid #334155",
            fontSize: "12.5px",
            color: "#94a3b8",
          }}
        >
          Page {page} of {totalPages} · {totalResults.toLocaleString()} result
          {totalResults === 1 ? "" : "s"}
          {activeTag && (
            <>
              {" "}
              · tag <strong style={{ color: "#93c5fd" }}>{activeTag}</strong>
            </>
          )}
        </div>
      )}

      <BookList
        books={books}
        isLoading={loading}
        error={error}
        layout="list"
      />

      {totalPages > 1 && !loading && !error && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "20px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "9px 16px",
              background: page === 1 ? "#1e293b" : "#3b82f6",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: page === 1 ? "#64748b" : "#fff",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "13px",
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
              padding: "9px 16px",
              background: !hasMore ? "#1e293b" : "#3b82f6",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: !hasMore ? "#64748b" : "#fff",
              cursor: !hasMore ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "13px",
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
