"use client";

import { useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import BookList from "./BookList";
import { Book } from "@/types";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [hasSearched, setHasSearched] = useState(false);
  const [sort, setSort] = useState("seeds");
  const [filter, setFilter] = useState<"all" | "audiobook" | "ebook">("all");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const runSearch = async (query: string, sortOverride?: string) => {
    const useSort = sortOverride || sort;
    setHasSearched(true);
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&sort=${useSort}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to search");
      setBooks(data.books || []);
      if (data.error) setError(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks =
    filter === "all" ? books : books.filter((b) => b.category === filter);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#0f172a",
        zIndex: 100,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          padding: "12px 16px",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              padding: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            ← Close
          </button>
          <span
            style={{ color: "#94a3b8", fontSize: "13px" }}
          >
            Press Esc to return
          </span>
        </div>
        <SearchBar onSearch={runSearch} isLoading={loading} />
        {hasSearched && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#e2e8f0",
                fontSize: "13px",
              }}
            >
              <option value="seeds">Most Seeders</option>
              <option value="date">Date Added</option>
              <option value="size">File Size</option>
              <option value="name">Name</option>
              <option value="times_completed">Most Snatched</option>
            </select>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["all", "ebook", "audiobook"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: filter === f ? "#3b82f6" : "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {f === "all" ? "All" : f + "s"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "16px", maxWidth: "800px", margin: "0 auto" }}>
        {hasSearched && (
          <BookList books={filteredBooks} isLoading={loading} error={error} />
        )}
        {!hasSearched && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              color: "#94a3b8",
            }}
          >
            Type a title, author, narrator, or series to search.
          </div>
        )}
      </div>
    </div>
  );
}
