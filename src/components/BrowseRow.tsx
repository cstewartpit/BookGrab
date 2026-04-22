"use client";

import Link from "next/link";
import { Book } from "@/types";
import BookCard from "./BookCard";

interface BrowseRowProps {
  title: string;
  seeAllHref: string;
  books: Book[];
  loading: boolean;
  error?: string;
}

export default function BrowseRow({
  title,
  seeAllHref,
  books,
  loading,
  error,
}: BrowseRowProps) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "0 16px",
          marginBottom: "12px",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "700",
            color: "#f1f5f9",
            margin: 0,
          }}
        >
          {title}
        </h2>
        <Link
          href={seeAllHref}
          style={{
            color: "#60a5fa",
            fontSize: "13px",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          See all →
        </Link>
      </div>

      {error && (
        <div
          style={{
            margin: "0 16px",
            padding: "12px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            color: "#fca5a5",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          padding: "4px 16px 16px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {loading && books.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                style={{
                  flex: "0 0 280px",
                  minHeight: "200px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  opacity: 0.5,
                }}
              />
            ))
          : books.map((book) => (
              <div
                key={book.id}
                style={{
                  flex: "0 0 280px",
                  scrollSnapAlign: "start",
                }}
              >
                <BookCard book={book} />
              </div>
            ))}
        {!loading && !error && books.length === 0 && (
          <div
            style={{
              padding: "20px",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            No books in this row yet.
          </div>
        )}
      </div>
    </section>
  );
}
