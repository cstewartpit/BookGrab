"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Book } from "@/types";
import BookRow from "./BookRow";

type GrabEntry = {
  at: string;
  title: string;
  category: "audiobook" | "ebook";
  torrentUrl: string;
  book?: Book;
};

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "soon";
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 14) return `${days} d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} wk ago`;
}

function groupByDay(
  grabs: GrabEntry[],
): Array<{ label: string; items: GrabEntry[] }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const buckets: Record<string, GrabEntry[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Older: [],
  };
  for (const g of grabs) {
    const d = new Date(g.at);
    if (d >= today) buckets.Today.push(g);
    else if (d >= yesterday) buckets.Yesterday.push(g);
    else if (d >= weekAgo) buckets["This week"].push(g);
    else buckets.Older.push(g);
  }
  return (["Today", "Yesterday", "This week", "Older"] as const)
    .filter((label) => buckets[label].length > 0)
    .map((label) => ({ label, items: buckets[label] }));
}

function FallbackRow({ grab }: { grab: GrabEntry }) {
  return (
    <div
      className="bg-book-row"
      style={{ gridTemplateColumns: "auto 1fr" }}
      title="Grabbed before the full-snapshot upgrade; older entry."
    >
      <span
        className="bg-row-badge"
        style={{
          padding: "2px 6px",
          borderRadius: "4px",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.3px",
          background: grab.category === "audiobook" ? "#1e3a8a" : "#065f46",
          color: grab.category === "audiobook" ? "#93c5fd" : "#6ee7b7",
          whiteSpace: "nowrap",
        }}
      >
        {grab.category === "audiobook" ? "AUD" : "EBK"}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: "#f1f5f9",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "13.5px",
          }}
        >
          {grab.title}
        </div>
        <div style={{ color: "#64748b", fontSize: "12px" }}>
          Grabbed {relativeDate(grab.at)} · legacy entry
        </div>
      </div>
    </div>
  );
}

export default function RecentActivityDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [grabs, setGrabs] = useState<GrabEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/recent-grabs?limit=200");
        if (!res.ok) return;
        const data = (await res.json()) as { grabs: GrabEntry[] };
        if (!cancelled) setGrabs(data.grabs || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groups = groupByDay(grabs);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-activity-drawer"
        style={{
          background: "#0f172a",
          borderLeft: "1px solid #334155",
          width: "100%",
          maxWidth: "520px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-20px 0 50px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid #334155",
            background: "#1e293b",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#f1f5f9",
                lineHeight: 1.2,
              }}
            >
              Recent activity
            </div>
            <div
              style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px" }}
            >
              Everything you&apos;ve grabbed, newest first
            </div>
          </div>
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
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px 24px",
          }}
        >
          {loading ? (
            <div style={{ color: "#94a3b8", fontSize: "13px" }}>Loading...</div>
          ) : grabs.length === 0 ? (
            <div
              style={{
                padding: "24px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "10px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              Nothing grabbed yet. Go find something on the{" "}
              <Link
                href="/"
                onClick={onClose}
                style={{ color: "#60a5fa", fontWeight: 600 }}
              >
                browse page
              </Link>
              .
            </div>
          ) : (
            groups.map(({ label, items }) => (
              <div key={label} style={{ marginBottom: "22px" }}>
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
                  {label} · {items.length}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {items.map((g) =>
                    g.book ? (
                      <BookRow
                        key={`${g.at}-${g.category}-${g.title}`}
                        book={g.book}
                      />
                    ) : (
                      <FallbackRow
                        key={`${g.at}-${g.category}-${g.title}`}
                        grab={g}
                      />
                    ),
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
