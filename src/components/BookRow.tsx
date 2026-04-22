"use client";

import { useState } from "react";
import { Book } from "@/types";
import { useTransmission } from "@/contexts/TransmissionContext";

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
      label: `↓ ${pct}%${rate}`,
      bg: "rgba(59,130,246,0.2)",
      fg: "#93c5fd",
    };
  }
  if (t.status === 6) {
    return { label: "✓ Seeding", bg: "rgba(16,185,129,0.2)", fg: "#6ee7b7" };
  }
  if (t.status === 0) {
    return { label: "⏸ Paused", bg: "rgba(148,163,184,0.15)", fg: "#cbd5e1" };
  }
  if (t.status === 1 || t.status === 2) {
    return {
      label: "⌛ Verifying",
      bg: "rgba(234,179,8,0.18)",
      fg: "#fde68a",
    };
  }
  if (t.status === 3 || t.status === 5) {
    return {
      label: pct === 100 ? "⌛ Queued" : `⌛ Queued ${pct}%`,
      bg: "rgba(234,179,8,0.18)",
      fg: "#fde68a",
    };
  }
  if (t.percentDone === 1) {
    return { label: "✓ Grabbed", bg: "rgba(16,185,129,0.2)", fg: "#6ee7b7" };
  }
  return { label: `${pct}%`, bg: "rgba(148,163,184,0.15)", fg: "#cbd5e1" };
}

export default function BookRow({ book }: { book: Book }) {
  const { matchByTitle, refresh: refreshTransmission } = useTransmission();
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [grabStatus, setGrabStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const tx = matchByTitle(book.title);
  const badge = tx ? torrentBadge(tx) : null;

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grab");
      setGrabStatus("success");
      // Pick up the new torrent on the next poll cycle quickly.
      setTimeout(() => void refreshTransmission(), 1500);
    } catch (err) {
      setGrabStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGrabbing(false);
    }
  };

  const grabLabel = isGrabbing
    ? "..."
    : grabStatus === "success"
      ? "✓ Added"
      : grabStatus === "error"
        ? "✕ Retry"
        : badge
          ? "Re-grab"
          : "Grab";

  const grabBg =
    grabStatus === "success"
      ? "#059669"
      : grabStatus === "error"
        ? "#7f1d1d"
        : badge
          ? "#374151"
          : "#3b82f6";

  return (
    <div
      title={grabStatus === "error" ? errorMessage : undefined}
      style={{
        display: "grid",
        gridTemplateColumns:
          "auto minmax(0, 1fr) auto auto auto auto auto",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "8px",
        fontSize: "13px",
        color: "#e2e8f0",
      }}
    >
      <span
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

      <div style={{ minWidth: 0 }}>
        <a
          href={`https://www.myanonamouse.net/t/${book.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#f1f5f9",
            textDecoration: "none",
            fontWeight: 600,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "13.5px",
          }}
        >
          {book.title}
        </a>
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
        style={{
          color: "#64748b",
          fontSize: "11px",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
          textTransform: "uppercase",
          letterSpacing: "0.3px",
          minWidth: "44px",
          textAlign: "right",
        }}
      >
        {book.format}
      </span>

      <span
        style={{
          color: "#94a3b8",
          fontSize: "12px",
          minWidth: "68px",
          textAlign: "right",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {book.size || ""}
      </span>

      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          fontSize: "11px",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
          color: "#94a3b8",
          minWidth: "90px",
          justifyContent: "flex-end",
        }}
      >
        <span title="Seeders" style={{ color: "#22c55e", fontWeight: 600 }}>
          ▲{book.seeders ?? 0}
        </span>
        <span title="Leechers" style={{ color: "#f87171" }}>
          ▼{book.leechers ?? 0}
        </span>
        <span title="Times grabbed">⤓{book.completed ?? 0}</span>
      </div>

      <span
        title={tx ? `In Transmission: ${tx.name}` : ""}
        style={{
          minWidth: "110px",
          textAlign: "right",
          fontSize: "11px",
          fontWeight: 600,
          padding: badge ? "3px 8px" : undefined,
          borderRadius: "6px",
          background: badge?.bg,
          color: badge?.fg ?? "transparent",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {badge?.label ?? ""}
      </span>

      <button
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
          minWidth: "74px",
          whiteSpace: "nowrap",
        }}
      >
        {grabLabel}
      </button>
    </div>
  );
}
