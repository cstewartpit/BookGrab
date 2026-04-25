"use client";

import { useState } from "react";
import { Book } from "@/types";
import { useTransmission } from "@/contexts/TransmissionContext";
import { useLibrary } from "@/contexts/LibraryContext";
import BookDetailModal from "./BookDetailModal";

// Transmission torrent.status values:
//   0 stopped, 1 check-queued, 2 checking, 3 download-queued,
//   4 downloading, 5 seed-queued, 6 seeding
function torrentBadge(t: {
  status: number;
  percentDone: number;
  rateDownload: number;
}): { label: string; bg: string; fg: string } {
  const pct = Math.round(t.percentDone * 100);
  if (t.status === 4) {
    const rate =
      t.rateDownload > 0
        ? ` · ${(t.rateDownload / (1024 * 1024)).toFixed(1)} MB/s`
        : "";
    return {
      label: `↓ Downloading ${pct}%${rate}`,
      bg: "rgba(59,130,246,0.2)",
      fg: "#93c5fd",
    };
  }
  if (t.status === 6) {
    return { label: "✓ Downloaded", bg: "rgba(16,185,129,0.2)", fg: "#6ee7b7" };
  }
  if (t.status === 0) {
    return { label: "⏸ Paused", bg: "rgba(148,163,184,0.15)", fg: "#cbd5e1" };
  }
  if (t.status === 1 || t.status === 2) {
    return {
      label: "⌛ Checking",
      bg: "rgba(234,179,8,0.18)",
      fg: "#fde68a",
    };
  }
  if (t.status === 3 || t.status === 5) {
    return {
      label: pct === 100 ? "⌛ Waiting" : `⌛ Waiting ${pct}%`,
      bg: "rgba(234,179,8,0.18)",
      fg: "#fde68a",
    };
  }
  if (t.percentDone === 1) {
    return { label: "✓ Downloaded", bg: "rgba(16,185,129,0.2)", fg: "#6ee7b7" };
  }
  return { label: `${pct}%`, bg: "rgba(148,163,184,0.15)", fg: "#cbd5e1" };
}

function availabilityBadge(seeders: number): {
  label: string;
  bg: string;
  fg: string;
} {
  if (seeders === 0) {
    return {
      label: "⚠ Not available now",
      bg: "rgba(234,179,8,0.18)",
      fg: "#fde68a",
    };
  }
  // Blue download arrow distinguishes "available to grab" from the
  // green check used for "Downloaded" / "In Library" — they were both
  // green ticks before and family-level users couldn't tell them apart.
  return {
    label: "⬇ Available",
    bg: "rgba(59,130,246,0.18)",
    fg: "#93c5fd",
  };
}

export default function BookRow({ book }: { book: Book }) {
  const { matchBook, refresh: refreshTransmission } = useTransmission();
  const { matchInLibrary } = useLibrary();
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [grabStatus, setGrabStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  const tx = matchBook(book.title, book.category);
  const downloadBadge = tx ? torrentBadge(tx) : null;
  const inLibrary = matchInLibrary(book.title, book.category);
  const libraryBadge = inLibrary
    ? {
        label:
          inLibrary.kind === "audiobook" ? "🎧 In Library" : "📖 In Library",
        bg: "rgba(16,185,129,0.2)",
        fg: "#6ee7b7",
      }
    : null;
  // Prefer the in-flight Transmission state (downloading / waiting / paused /
  // checking) while the torrent is still doing something. Once it's complete
  // (status 6 AND percentDone 1) AND the book is in the user's library, the
  // library deep-link is more actionable than "✓ Downloaded". A downloaded-
  // but-not-yet-ingested book falls through to the download badge.
  const torrentInFlight = tx ? !(tx.status === 6 && tx.percentDone >= 1) : false;
  const statusBadge =
    (torrentInFlight ? downloadBadge : null) ||
    libraryBadge ||
    downloadBadge ||
    availabilityBadge(book.seeders ?? 0);
  const statusIsLibrary = statusBadge === libraryBadge;

  const handleGrab = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const alreadyHave = !!downloadBadge || !!inLibrary;

  const grabLabel = isGrabbing
    ? "..."
    : grabStatus === "success"
      ? "✓ Added"
      : grabStatus === "error"
        ? "✕ Retry"
        : inLibrary
          ? "Download again"
          : downloadBadge
            ? "Download again"
            : "Download";

  const grabBg =
    grabStatus === "success"
      ? "#059669"
      : grabStatus === "error"
        ? "#7f1d1d"
        : alreadyHave
          ? "#374151"
          : "#3b82f6";

  const statusTooltip = downloadBadge
    ? `In Transmission: ${tx?.name}`
    : inLibrary
      ? "Already in your library"
      : (book.seeders ?? 0) === 0
        ? "No one is sharing this right now — it may not start downloading"
        : `${book.seeders} sharing`;

  return (
    <div
      className="bg-book-row"
      title={grabStatus === "error" ? errorMessage : undefined}
    >
      <span
        className="bg-row-badge"
        style={{
          padding: "2px 6px",
          borderRadius: "4px",
          fontSize: "10px",
          fontWeight: "700",
          letterSpacing: "0.3px",
          background: book.category === "audiobook" ? "#1e3a8a" : "#065f46",
          color: book.category === "audiobook" ? "#93c5fd" : "#6ee7b7",
          whiteSpace: "nowrap",
        }}
      >
        {book.category === "audiobook" ? "AUD" : "EBK"}
      </span>

      <div className="bg-row-title" style={{ minWidth: 0 }}>
        <button
          onClick={() => setDetailOpen(true)}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            textAlign: "left",
            color: "#f1f5f9",
            fontWeight: 600,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "13.5px",
            cursor: "pointer",
            maxWidth: "100%",
            width: "100%",
          }}
        >
          {book.title}
        </button>
        <div
          style={{
            color: "#94a3b8",
            fontSize: "12px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {book.author}
          {book.narrator ? ` · narr. ${book.narrator}` : ""}
          {book.length ? ` · ${book.length}` : ""}
        </div>
      </div>

      <span
        className="bg-row-format"
        style={{
          color: "#64748b",
          fontSize: "11px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          textTransform: "uppercase",
          letterSpacing: "0.3px",
          minWidth: "44px",
          textAlign: "right",
        }}
      >
        {book.format}
      </span>

      <span
        className="bg-row-size"
        style={{
          color: "#94a3b8",
          fontSize: "12px",
          minWidth: "68px",
          textAlign: "right",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {book.size || ""}
      </span>

      {statusIsLibrary && inLibrary?.url ? (
        <a
          className="bg-row-status"
          href={inLibrary.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`Open in ${inLibrary.kind === "audiobook" ? "Audiobookshelf" : "Calibre"}`}
          style={{
            minWidth: "140px",
            textAlign: "center",
            fontSize: "11px",
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: "6px",
            background: statusBadge.bg,
            color: statusBadge.fg,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textDecoration: "none",
          }}
        >
          {statusBadge.label}
        </a>
      ) : (
        <span
          className="bg-row-status"
          title={statusTooltip}
          style={{
            minWidth: "140px",
            textAlign: "center",
            fontSize: "11px",
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: "6px",
            background: statusBadge.bg,
            color: statusBadge.fg,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {statusBadge.label}
        </span>
      )}

      <button
        className="bg-row-button"
        onClick={handleGrab}
        disabled={isGrabbing || grabStatus === "success"}
        style={{
          padding: "6px 12px",
          background: grabBg,
          border: "none",
          borderRadius: "6px",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 700,
          cursor:
            isGrabbing || grabStatus === "success" ? "default" : "pointer",
          opacity: isGrabbing || grabStatus === "success" ? 0.85 : 1,
          minWidth: "110px",
          whiteSpace: "nowrap",
        }}
      >
        {grabLabel}
      </button>

      {/* Mobile-only combined meta row. Desktop hides this via CSS. */}
      <div className="bg-row-metarow">
        <span
          style={{
            color: "#64748b",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.3px",
          }}
        >
          {book.format}
        </span>
        {book.size && (
          <span
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {book.size}
          </span>
        )}
        {statusIsLibrary && inLibrary?.url ? (
          <a
            href={inLibrary.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`Open in ${inLibrary.kind === "audiobook" ? "Audiobookshelf" : "Calibre"}`}
            style={{
              marginLeft: "auto",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "6px",
              background: statusBadge.bg,
              color: statusBadge.fg,
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
          >
            {statusBadge.label}
          </a>
        ) : (
          <span
            title={statusTooltip}
            style={{
              marginLeft: "auto",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "6px",
              background: statusBadge.bg,
              color: statusBadge.fg,
              whiteSpace: "nowrap",
            }}
          >
            {statusBadge.label}
          </span>
        )}
      </div>

      {detailOpen && (
        <BookDetailModal book={book} onClose={() => setDetailOpen(false)} />
      )}
    </div>
  );
}
