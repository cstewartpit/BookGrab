"use client";

import { useEffect, useState } from "react";
import { Book } from "@/types";
import BookRow from "./BookRow";
import { DiscoverBook } from "@/lib/discover";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export default function DiscoverBookModal({
  book,
  onClose,
}: {
  book: DiscoverBook;
  onClose: () => void;
}) {
  const [description, setDescription] = useState<string | null>(
    book.description ? stripHtml(book.description) : null,
  );
  const [descLoading, setDescLoading] = useState(false);

  const [findStatus, setFindStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [matches, setMatches] = useState<Book[]>([]);
  const [findError, setFindError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Lazy-load description for OpenLibrary entries (NYT lists carry a
  // short description in the bestseller payload, OL works don't).
  useEffect(() => {
    if (description !== null) return;
    if (book.source !== "openlibrary") return;
    if (!book.externalId.startsWith("/works/")) return;
    let cancelled = false;
    setDescLoading(true);
    fetch(`/api/discover?description=${encodeURIComponent(book.externalId)}`)
      .then((r) => r.json())
      .then((d: { description?: string | null }) => {
        if (cancelled) return;
        setDescription(d.description ? stripHtml(d.description) : null);
      })
      .catch(() => {
        /* non-fatal */
      })
      .finally(() => {
        if (!cancelled) setDescLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [book.source, book.externalId, description]);

  const findOnMam = async () => {
    setFindStatus("loading");
    setFindError("");
    setMatches([]);
    try {
      const res = await fetch("/api/find-on-mam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setMatches((data.books || []) as Book[]);
      setFindStatus("done");
    } catch (err) {
      setFindStatus("error");
      setFindError(err instanceof Error ? err.message : "Search failed");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "24px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
          maxWidth: "760px",
          width: "100%",
          color: "#e2e8f0",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid #334155",
          }}
        >
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              background: book.source === "nyt" ? "#7c2d12" : "#1e3a8a",
              color: book.source === "nyt" ? "#fed7aa" : "#93c5fd",
            }}
          >
            {book.source === "nyt" ? "NYT BESTSELLER" : "OPENLIBRARY"}
            {typeof book.rank === "number" ? ` · #${book.rank}` : ""}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "22px",
              padding: "4px 10px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          className="bg-discover-modal-body"
          style={{
            display: "grid",
            gridTemplateColumns: book.coverUrl ? "150px 1fr" : "1fr",
            gap: "20px",
            padding: "20px",
          }}
        >
          {book.coverUrl && (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={book.coverUrl}
                alt={`Cover of ${book.title}`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
                style={{
                  width: "100%",
                  borderRadius: "6px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  aspectRatio: "2/3",
                  objectFit: "cover",
                }}
              />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#f1f5f9",
                marginBottom: "6px",
                lineHeight: 1.25,
              }}
            >
              {book.title}
            </h2>
            <div
              style={{
                fontSize: "13.5px",
                color: "#94a3b8",
                marginBottom: "12px",
              }}
            >
              {book.author}
              {book.year ? ` · ${book.year}` : ""}
              {book.isbn ? ` · ISBN ${book.isbn}` : ""}
            </div>

            {descLoading && (
              <div style={{ color: "#64748b", fontSize: "13px" }}>
                Loading description...
              </div>
            )}
            {description && (
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: "#cbd5e1",
                  whiteSpace: "pre-wrap",
                  maxHeight: "260px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {description}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #334155",
            background: "#0f172a",
          }}
        >
          {findStatus === "idle" && (
            <button
              onClick={findOnMam}
              style={{
                padding: "10px 18px",
                background: "#3b82f6",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Find on bookgrab
            </button>
          )}
          {findStatus === "loading" && (
            <div style={{ color: "#94a3b8", fontSize: "13px" }}>
              Searching MAM...
            </div>
          )}
          {findStatus === "error" && (
            <div>
              <div style={{ color: "#fda4af", fontSize: "13px", marginBottom: "8px" }}>
                {findError}
              </div>
              <button
                onClick={findOnMam}
                style={{
                  padding: "8px 14px",
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          )}
          {findStatus === "done" && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  marginBottom: "8px",
                }}
              >
                {matches.length === 0
                  ? "No matches on MAM"
                  : `Available on MAM · ${matches.length}`}
              </div>
              {matches.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                  Nothing turned up. The torrent may not exist on MAM, or the
                  title is mismatched. Try the regular search with a shorter
                  query.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {matches.map((b) => (
                    <BookRow key={b.id} book={b} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
