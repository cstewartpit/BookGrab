"use client";

import { Book } from "@/types";
import BookCard from "./BookCard";
import BookRow from "./BookRow";

interface BookListProps {
  books: Book[];
  isLoading: boolean;
  error?: string;
  layout?: "grid" | "list";
}

export default function BookList({
  books,
  isLoading,
  error,
  layout = "grid",
}: BookListProps) {
  if (isLoading) {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid rgba(102, 126, 234, 0.2)",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 1s linear infinite",
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ color: "#94a3b8", fontWeight: 500 }}>
            Loading books...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "16px",
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "12px",
          color: "#ef4444",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        ✕ Error: {error}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          textAlign: "center",
          padding: "60px 24px",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📚</div>
        <div style={{ color: "#94a3b8", fontWeight: 500 }}>
          No books found.
        </div>
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {books.map((book) => (
          <BookRow key={book.id} book={book} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px",
          width: "100%",
        }}
      >
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
}
