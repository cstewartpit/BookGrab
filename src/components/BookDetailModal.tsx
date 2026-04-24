"use client";

import { useEffect, useState } from "react";
import { Book } from "@/types";
import { useLibrary } from "@/contexts/LibraryContext";
import { useTransmission } from "@/contexts/TransmissionContext";

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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim();
}

function goodreadsUrl(title: string, author?: string): string {
  const q = [title, author].filter(Boolean).join(" ");
  return `https://www.goodreads.com/search?q=${encodeURIComponent(q)}`;
}

function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export default function BookDetailModal({
  book,
  onClose,
}: {
  book: Book;
  onClose: () => void;
}) {
  const { matchInLibrary } = useLibrary();
  const { refresh: refreshTransmission } = useTransmission();
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [grabStatus, setGrabStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const inLibrary = matchInLibrary(book.title, book.category);
  const descriptionText = book.description
    ? stripHtml(book.description)
    : "";
  const tagChips = parseTags(book.tags).slice(0, 12);

  const handleGrab = async () => {
    setIsGrabbing(true);
    setGrabStatus("idle");
    setErrorMessage("");
    try {
      const res = await fetch("/api/grab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          torrentUrl: book.torrentLink,
          category: book.category,
          title: book.title,
          book,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to download");
      setGrabStatus("success");
      setTimeout(() => void refreshTransmission(), 1500);
    } catch (err) {
      setGrabStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGrabbing(false);
    }
  };

  const grabLabel = isGrabbing
    ? "Adding..."
    : grabStatus === "success"
      ? "✓ Added to Transmission"
      : grabStatus === "error"
        ? "✕ Retry"
        : inLibrary
          ? "Download again"
          : "Download";

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
        className="bg-detail-modal"
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
          maxWidth: "720px",
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
              background: book.category === "audiobook" ? "#1e3a8a" : "#065f46",
              color: book.category === "audiobook" ? "#93c5fd" : "#6ee7b7",
            }}
          >
            {book.category === "audiobook" ? "AUDIOBOOK" : "EBOOK"}
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
          className="bg-detail-body"
          style={{
            padding: "20px",
          }}
        >
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
              {book.narrator ? ` · narrated by ${book.narrator}` : ""}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px 12px",
                fontSize: "12px",
                color: "#cbd5e1",
                marginBottom: "14px",
              }}
            >
              <span>
                <strong style={{ color: "#94a3b8" }}>Format:</strong>{" "}
                {book.format}
              </span>
              {book.size && (
                <span>
                  <strong style={{ color: "#94a3b8" }}>Size:</strong>{" "}
                  {book.size}
                </span>
              )}
              {book.length && (
                <span>
                  <strong style={{ color: "#94a3b8" }}>Length:</strong>{" "}
                  {book.length}
                </span>
              )}
            </div>

            {tagChips.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  marginBottom: "14px",
                }}
              >
                {tagChips.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: "10.5px",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: "#0f172a",
                      color: "#94a3b8",
                      border: "1px solid #334155",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {descriptionText && (
          <div
            style={{
              padding: "0 20px 20px",
              fontSize: "13px",
              lineHeight: 1.55,
              color: "#cbd5e1",
              whiteSpace: "pre-wrap",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {descriptionText}
          </div>
        )}

        <div
          className="bg-detail-actions"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            padding: "14px 20px",
            borderTop: "1px solid #334155",
            background: "#0f172a",
          }}
        >
          <button
            onClick={handleGrab}
            disabled={isGrabbing || grabStatus === "success"}
            title={grabStatus === "error" ? errorMessage : undefined}
            style={{
              padding: "8px 16px",
              background:
                grabStatus === "success"
                  ? "#059669"
                  : grabStatus === "error"
                    ? "#7f1d1d"
                    : "#3b82f6",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              cursor:
                isGrabbing || grabStatus === "success" ? "default" : "pointer",
              opacity: isGrabbing || grabStatus === "success" ? 0.85 : 1,
            }}
          >
            {grabLabel}
          </button>

          {inLibrary?.url && (
            <a
              href={inLibrary.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "8px 14px",
                background: "#059669",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {inLibrary.kind === "audiobook" ? "🎧 Listen now" : "📖 Read now"}
            </a>
          )}

          <a
            href={goodreadsUrl(book.title, book.author)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 14px",
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "6px",
              color: "#e2e8f0",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Goodreads
          </a>

          <a
            href={`https://www.myanonamouse.net/t/${book.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 14px",
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "6px",
              color: "#94a3b8",
              fontSize: "12.5px",
              fontWeight: 500,
              textDecoration: "none",
              marginLeft: "auto",
            }}
          >
            View on MAM →
          </a>
        </div>
      </div>
    </div>
  );
}
