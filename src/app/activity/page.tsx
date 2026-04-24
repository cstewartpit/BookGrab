"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Book } from "@/types";
import BookRow from "@/components/BookRow";
import SettingsModal from "@/components/SettingsModal";

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

function Header({ onSettingsClick }: { onSettingsClick: () => void }) {
  return (
    <header
      style={{
        background: "#1e293b",
        borderBottom: "1px solid #334155",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          maxWidth: "100%",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "#3b82f6",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              stroke="white"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#f1f5f9",
                lineHeight: "1",
              }}
            >
              BookGrab
            </div>
            <div
              className="bg-header-tagline"
              style={{
                fontSize: "11px",
                color: "#64748b",
                lineHeight: "1.4",
                marginTop: "2px",
              }}
            >
              Recent activity
            </div>
          </div>
        </Link>
        <button
          onClick={onSettingsClick}
          aria-label="Settings"
          style={{
            background: "transparent",
            border: "none",
            color: "#cbd5e1",
            padding: "8px",
            cursor: "pointer",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}

function groupByDay(grabs: GrabEntry[]): Array<{ label: string; items: GrabEntry[] }> {
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
      style={{ gridTemplateColumns: "auto 1fr auto" }}
      title="Grabbed before the full-snapshot upgrade; open the MAM link to re-discover."
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
      <div className="bg-row-title" style={{ minWidth: 0 }}>
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
        <div
          style={{
            color: "#64748b",
            fontSize: "12px",
          }}
        >
          Grabbed {relativeDate(grab.at)} · legacy entry
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const [grabs, setGrabs] = useState<GrabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
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
  }, []);

  const groups = groupByDay(grabs);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      <Header onSettingsClick={() => setSettingsOpen(true)} />

      <main className="bg-page">
        <div style={{ marginBottom: "16px" }}>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#f1f5f9",
              marginBottom: "4px",
            }}
          >
            Recent activity
          </h1>
          <p style={{ fontSize: "12.5px", color: "#94a3b8" }}>
            Everything you&apos;ve grabbed, most recent first. Click a title to
            see details or open it in your library.
          </p>
        </div>

        {loading ? (
          <div style={{ color: "#94a3b8", fontSize: "13px" }}>Loading...</div>
        ) : grabs.length === 0 ? (
          <div
            style={{
              padding: "28px",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            Nothing grabbed yet. Go find something on the{" "}
            <Link href="/" style={{ color: "#60a5fa", fontWeight: 600 }}>
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
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
