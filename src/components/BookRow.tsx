"use client";

import { useState } from "react";
import { Book } from "@/types";

export default function BookRow({ book }: { book: Book }) {
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [grabStatus, setGrabStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

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
      ? "✓ Grabbed"
      : grabStatus === "error"
        ? "✕ Retry"
        : "Grab";

  const grabBg =
    grabStatus === "success"
      ? "#059669"
      : grabStatus === "error"
        ? "#7f1d1d"
        : "#3b82f6";

  return (
    <div
      title={grabStatus === "error" ? errorMessage : undefined}
      style={{
        display: "grid",
        gridTemplateColumns:
          "auto minmax(0, 1fr) auto auto auto auto",
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
