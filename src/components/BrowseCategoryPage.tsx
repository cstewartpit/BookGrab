"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Book } from "@/types";
import ActivityStrip from "./ActivityStrip";
import BookList from "./BookList";

type Category = "audiobook" | "ebook" | "all";

interface BrowseCategoryPageProps {
  category: Category;
  initialSort: string;
  initialTag?: string;
  initialQuery?: string;
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "seedersDesc", label: "Most Available" },
  { value: "snatchedDesc", label: "Most Popular" },
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

function buildUrl(
  cat: Category,
  sort: string,
  tag?: string,
  query?: string,
): string {
  const params = new URLSearchParams();
  if (cat !== "all") params.set("cat", cat);
  if (sort !== DEFAULT_SORT) params.set("sort", sort);
  if (tag) params.set("tag", tag);
  if (query) params.set("q", query);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default function BrowseCategoryPage({
  category,
  initialSort,
  initialTag,
  initialQuery,
}: BrowseCategoryPageProps) {
  const router = useRouter();
  const [sort, setSort] = useState(initialSort);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [queryInput, setQueryInput] = useState(initialQuery || "");

  const activeTag = (initialTag || "").trim();
  const activeQuery = (initialQuery || "").trim();

  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);

  useEffect(() => {
    setQueryInput(initialQuery || "");
  }, [initialQuery]);

  useEffect(() => {
    const next = queryInput.trim();
    if (next === activeQuery) return;
    const timer = setTimeout(() => {
      router.replace(
        buildUrl(category, sort, activeTag || undefined, next || undefined),
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [queryInput, activeQuery, category, sort, activeTag, router]);

  useEffect(() => {
    setPage(1);
  }, [category, initialSort, initialTag, initialQuery]);

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
        if (activeQuery) params.set("q", activeQuery);
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
  }, [category, sort, page, activeTag, activeQuery]);

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  const changeCategory = (cat: Category) => {
    router.push(
      buildUrl(cat, sort, activeTag || undefined, activeQuery || undefined),
    );
  };

  const changeSort = (newSort: string) => {
    setSort(newSort);
    router.replace(
      buildUrl(category, newSort, activeTag || undefined, activeQuery || undefined),
    );
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
        {activeQuery && (
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#94a3b8",
              marginLeft: "10px",
            }}
          >
            matching{" "}
            <span style={{ color: "#93c5fd" }}>“{activeQuery}”</span>
          </span>
        )}
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

      <ActivityStrip />

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
          Search
        </span>
        <div style={{ position: "relative", width: "100%", maxWidth: "420px" }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#64748b"
            strokeWidth={2}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Title, author, narrator, series…"
            style={{
              width: "100%",
              padding: "8px 34px 8px 32px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0",
              fontSize: "13px",
              outline: "none",
            }}
          />
          {queryInput && (
            <button
              onClick={() => setQueryInput("")}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: "6px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "14px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
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
                    buildUrl(
                      category,
                      sort,
                      selected ? undefined : t,
                      activeQuery || undefined,
                    ),
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
